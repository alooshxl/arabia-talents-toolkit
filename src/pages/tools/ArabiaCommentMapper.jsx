import React, { useState, useCallback, useEffect } from 'react';
import youtubeApiService from '../../services/youtubeApi';
import geminiApiService from '../../services/geminiApiService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Assuming recharts is used

const targetArabCountriesList = [
  'Saudi Arabia', 'Iraq', 'Egypt', 'Syria', 'UAE', 'Jordan', 'Kuwait',
  'Lebanon', 'Algeria', 'Tunisia', 'Morocco', 'Palestine', 'Yemen',
  'Bahrain', 'Oman', 'Sudan', 'Libya', 'Qatar'
];

const countryDetails = {
  'Saudi Arabia': { flag: '🇸🇦', code: 'SA' },
  'Iraq': { flag: '🇮🇶', code: 'IQ' },
  'Egypt': { flag: '🇪🇬', code: 'EG' },
  'Syria': { flag: '🇸🇾', code: 'SY' },
  'UAE': { flag: '🇦🇪', code: 'AE' },
  'Jordan': { flag: '🇯🇴', code: 'JO' },
  'Kuwait': { flag: '🇰🇼', code: 'KW' },
  'Lebanon': { flag: '🇱🇧', code: 'LB' },
  'Algeria': { flag: '🇩🇿', code: 'DZ' },
  'Tunisia': { flag: '🇹🇳', code: 'TN' },
  'Morocco': { flag: '🇲🇦', code: 'MA' },
  'Palestine': { flag: '🇵🇸', code: 'PS' },
  'Yemen': { flag: '🇾🇪', code: 'YE' },
  'Bahrain': { flag: '🇧🇭', code: 'BH' },
  'Oman': { flag: '🇴🇲', code: 'OM' },
  'Sudan': { flag: '🇸🇩', code: 'SD' },
  'Libya': { flag: '🇱🇾', code: 'LY' },
  'Qatar': { flag: '🇶🇦', code: 'QA' },
  'Unknown': { flag: '❓', code: 'UNK' },
  'Error (Gemini)': { flag: '⚠️', code: 'ERR' },
  'Unknown (Non-standard)': { flag: '❔', code: 'NST' },
  'Other Arab Countries': { flag: '🌍', code: 'OTH' }, // Added
  'Unknown/Error': { flag: '❔', code: 'UNK_ERR' } // Added
};

const getCountryFlag = (countryName) => countryDetails[countryName]?.flag || '🏳️';

// Function to parse the Gemini batch response
const parseGeminiBatchResponse = (responseText) => {
  if (!responseText || typeof responseText !== 'string' || responseText.trim() === '') {
    return [];
  }

  const lines = responseText.split('\n');
  const results = [];
  // Regex to capture percentage and country name. Handles variations like "10%", "10.5 %", "10 % Country Name"
  const lineRegex = /(\d+\.?\d*)\s*%\s*([\s\S]+)/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === '') {
      continue;
    }

    const match = trimmedLine.match(lineRegex);
    if (match) {
      const percentageStr = match[1];
      const countryNameStr = match[2].trim();

      const percentage = parseFloat(percentageStr);
      if (isNaN(percentage)) {
        console.warn(`Could not parse percentage from line: "${trimmedLine}"`);
        continue;
      }

      let normalizedCountryName = countryNameStr;
      // Normalize if it's a known country from our list, otherwise use as is (or map to 'Other')
      const isKnownTargetCountry = targetArabCountriesList.includes(countryNameStr);

      if (isKnownTargetCountry) {
        normalizedCountryName = countryNameStr; // Already good
      } else if (countryNameStr.toLowerCase().includes('other') || countryNameStr.toLowerCase().includes('uncertain')) {
        normalizedCountryName = 'Unknown/Error'; // Or a more specific "Other/Uncertain" category if desired
      } else if (countryNameStr) {
        // If it's not in the target list and not "Other/Uncertain", classify as "Unknown/Error" or keep original for review
        // For now, let's keep original if not explicitly "Other/Uncertain" to see what Gemini returns.
        // Could also be mapped to 'Other Arab Countries' if it seems like one but not in list.
        // Decision: If not in targetArabCountriesList, it's 'Unknown/Error' for chart purposes,
        // but we store the original name from Gemini if it's not explicitly 'Other' or 'Uncertain'.
        // This behavior is more aligned with how performSingleAggregation handles non-target countries.
        // Let's simplify: if it's not a target country, it will be grouped into Unknown/Error by the aggregation logic.
        // So, we can just store the name as Gemini provided it, or normalize common variations.
        // For this parser, we'll prioritize direct matches or specific "Other" terms.
        // The aggregation logic downstream (performSingleAggregation) will handle grouping into 'Unknown/Error' if not a target country.
        normalizedCountryName = countryNameStr;
      }


      if (normalizedCountryName && percentage > 0) { // Only add if percentage is positive
        results.push({
          country: normalizedCountryName,
          percentage: percentage,
          // count: 0, // Count will be derived later if needed, or based on total comments analyzed by Gemini
          source: 'gemini-batch'
        });
      }
    } else {
      console.warn(`Could not parse line from Gemini response: "${trimmedLine}"`);
    }
  }
  return results;
};


const ArabiaCommentMapper = () => {
  const [videoUrls, setVideoUrls] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [commentsData, setCommentsData] = useState([]); // Stores {videoId, title, comments: [...]}
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawGeminiBatchResult, setRawGeminiBatchResult] = useState(null);
  const [geminiAnalysisCommentCount, setGeminiAnalysisCommentCount] = useState(0); // New state for Gemini comment count

  const [processedResults, setProcessedResults] = useState({
    youtubeApiAnalysis: null,
    geminiApiAnalysis: null,
    commonTitle: 'All Videos'
  });
  const [selectedVideoFilter, setSelectedVideoFilter] = useState('all');

  const handleAnalyzeClick = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setCommentsData([]);
    setRawGeminiBatchResult(null);
    setGeminiAnalysisCommentCount(0); // Reset Gemini comment count
    // Reset to initial dual structure
    setProcessedResults({
      youtubeApiAnalysis: null,
      geminiApiAnalysis: null,
      commonTitle: selectedVideoFilter === 'all' ? 'All Videos' : (commentsData.find(v => v.videoId === selectedVideoFilter)?.title || 'Selected Video')
    });

    let currentError = '';
    if (!geminiApiKey.trim()) {
      currentError += 'Gemini API Key is missing; dialect analysis will be skipped for comments without YouTube country. ';
    }

    const urls = videoUrls.split('\n').filter(url => url.trim() !== '');
    if (urls.length === 0) {
      currentError += 'Please enter at least one YouTube video URL.';
      setError(currentError.trim());
      setIsLoading(false);
      return;
    }

    const allVideosData = [];
    // Fetch video titles first
    const videoInfoPromises = urls.map(async (url) => {
      const videoId = youtubeApiService.extractVideoIdFromUrl(url);
      if (!videoId) {
        console.warn(`Invalid YouTube URL: ${url}`);
        // Accumulate error for display after all promises
        return { url, error: `Invalid YouTube URL: ${url}` };
      }
      try {
        const videoDetails = await youtubeApiService.getVideoDetails(videoId);
        return { videoId, url, title: videoDetails?.snippet?.title || `Video ID: ${videoId}` };
      } catch (err) {
        console.error(`Failed to fetch details for video ${videoId}:`, err.message);
        // Accumulate error
        return { videoId, url, error: `Failed to fetch details for ${videoId}: ${err.message}` };
      }
    });

    const videoInfosResults = await Promise.all(videoInfoPromises);

    videoInfosResults.forEach(result => {
      if (result.error) {
        currentError += `${result.error} `;
      }
    });

    const videoInfos = videoInfosResults.filter(result => result && result.videoId && !result.error);

    if (videoInfos.length === 0 && urls.length > 0) {
        setError(currentError.trim() || "Failed to process any video URLs.");
        setIsLoading(false);
        return;
    }


    try {
      for (const vidInfo of videoInfos) {
        const { videoId, title } = vidInfo;
        // Ensure videoId is valid before proceeding (already filtered but as a safeguard)
        if (!videoId) continue;
        try {
          const fetchedComments = await youtubeApiService.getVideoComments(videoId, 200);
          const processedCommentsContent = [];
          for (const comment of fetchedComments) {
            let youtubeCountry = null;
            if (comment.authorChannelId) {
              try {
                const channelInfo = await youtubeApiService.getChannelInfo(comment.authorChannelId);
                youtubeCountry = channelInfo?.snippet?.country || null;
              } catch (channelError) {
                console.warn(`Could not fetch channel info for ${comment.authorChannelId}:`, channelError.message);
              }
            }

            // Per-comment Gemini logic removed.
            // geminiCountry is no longer stored per comment.
            processedCommentsContent.push({
              text: comment.text,
              authorChannelId: comment.authorChannelId,
              youtubeCountry: youtubeCountry,
            });
          }
          allVideosData.push({ videoId, comments: processedCommentsContent, title });
        } catch (videoError) {
          console.error(`Error processing comments for video ${videoId} (${title}):`, videoError.message);
          currentError += `Error processing comments for video ${videoId} (${title}): ${videoError.message}. `;
        }
      }
      setCommentsData(allVideosData); // Set data with only youtubeCountry

      // === Batch Gemini Request ===
      let collectedCommentTexts = [];
      allVideosData.forEach(video => {
        video.comments.forEach(comment => {
          if (comment.text && comment.text.trim() !== '') {
            collectedCommentTexts.push(comment.text);
          }
        });
      });

      // Use a Set to get unique comment texts, then convert back to an array
      const uniqueCommentTexts = Array.from(new Set(collectedCommentTexts.map(t => t.trim()).filter(t => t)));
      const geminiCommentCount = uniqueCommentTexts.length; // Store count for Gemini analysis
      setGeminiAnalysisCommentCount(geminiCommentCount); // Set state

      if (geminiApiKey.trim() && geminiCommentCount > 0) { // Use geminiCommentCount here
        const batchPrompt = `You will receive a list of YouTube comments written in Arabic. Analyze these comments and estimate the percentage distribution of the commenters’ countries of origin, focusing on Arabic-speaking countries.

Determine the country based on:
Dialects and slang (e.g., Gulf Arabic, Egyptian Arabic, Iraqi terms, Levantine Arabic, etc.)
Names, emojis, or cultural references
Writing style or known expressions

Your output should be a clear list of countries and the estimated percentage of commenters from each.

Here is the list of comments:
${uniqueCommentTexts.map(text => `- "${text.substring(0, 300)}${text.length > 300 ? '...' : ''}"`).join('\n')}
`; // Truncate long comments in prompt

        try {
          console.log("Sending batch request to Gemini API with prompt:", batchPrompt);
          const batchGeminiResponse = await geminiApiService.generateContent(geminiApiKey, batchPrompt);
          setRawGeminiBatchResult(batchGeminiResponse);
          console.log("Batch Gemini API Response:", batchGeminiResponse);
        } catch (geminiBatchError) {
          console.error("Gemini API batch request error:", geminiBatchError.message);
          currentError += `Gemini API batch request error: ${geminiBatchError.message}. `;
          setRawGeminiBatchResult(`Error: ${geminiBatchError.message}`); // Store error in batch result
        }
      } else {
        setRawGeminiBatchResult(null); // No API key or no unique comments
        if (geminiApiKey.trim() && uniqueCommentTexts.length === 0) {
            currentError += 'No unique comment texts found to send to Gemini. ';
        }
      }

    } catch (e) {
      console.error("Error during analysis:", e);
      currentError += `An unexpected error occurred: ${e.message}.`;
    } finally {
      setError(currentError.trim());
      setIsLoading(false);
    }
  }, [videoUrls, geminiApiKey, commentsData, selectedVideoFilter]); // commentsData and selectedVideoFilter for resetting processedResults title

  const processAndAggregateData = useCallback((currentData, filterId, geminiBatchResultText, geminiCommentCountInput) => {
    const emptyResultBase = {
      chartData: [], rankedList: [], exampleCommentsByCountry: {},
      totalAnalyzedComments: 0, totalIdentifiedArabCountries: 0, unknownOrNonArabPercentage: 0, error: null,
    };

    if (!currentData) return { // Should not happen if handleAnalyzeClick sets commentsData first
      commonTitle: "All Videos",
      youtubeApiAnalysis: { ...emptyResultBase, title: "All Videos" },
      geminiApiAnalysis: { ...emptyResultBase, title: "All Videos" },
    };

    let commentsToProcess = [];
    let currentTitle = "All Videos";
    if (filterId === 'all') {
      currentData.forEach(video => commentsToProcess.push(...video.comments));
    } else {
      const selectedVideo = currentData.find(video => video.videoId === filterId);
      if (selectedVideo) {
        commentsToProcess = selectedVideo.comments;
        currentTitle = selectedVideo.title;
      }
    }

    const youtubeApiAnalysisResult = performSingleAggregation(commentsToProcess, 'youtubeCountry', currentTitle);

    let geminiApiAnalysisResult = { ...emptyResultBase, title: currentTitle, totalAnalyzedComments: geminiCommentCountInput, exampleCommentsByCountry: {} };

    if (geminiBatchResultText && typeof geminiBatchResultText === 'string' && !geminiBatchResultText.startsWith('Error:')) {
      const parsedGeminiData = parseGeminiBatchResponse(geminiBatchResultText);
      if (parsedGeminiData.length > 0) {
        let totalIdentifiedFromGemini = 0;
        let unknownOrNonArabGeminiPercentageSum = 0;

        const geminiRankedList = parsedGeminiData
          .map(item => {
            const isTarget = targetArabCountriesList.includes(item.country);
            if (isTarget) {
              totalIdentifiedFromGemini += Math.round((item.percentage / 100) * geminiCommentCountInput);
            } else {
              // Accumulate percentages for non-target countries from Gemini's list
              unknownOrNonArabGeminiPercentageSum += item.percentage;
            }
            return {
              name: item.country,
              percentage: item.percentage,
              flag: getCountryFlag(item.country),
              count: Math.round((item.percentage / 100) * geminiCommentCountInput),
              isTarget: isTarget,
            };
          })
          .sort((a, b) => b.percentage - a.percentage); // Sort by percentage from Gemini

        geminiApiAnalysisResult.rankedList = geminiRankedList;
        geminiApiAnalysisResult.totalIdentifiedArabCountries = geminiRankedList.filter(c => c.isTarget).reduce((acc, c) => acc + c.count, 0);

        // Chart Data for Gemini
        const topFourGemini = geminiRankedList.filter(c => c.isTarget).slice(0, 4);
        const otherArabGeminiSum = geminiRankedList.filter(c => c.isTarget).slice(4).reduce((sum, item) => sum + item.percentage, 0);

        let geminiChartData = topFourGemini.map(c => ({ name: c.name, value: c.percentage }));

        if (otherArabGeminiSum > 0) {
          geminiChartData.push({ name: 'Other Arab Countries', value: parseFloat(otherArabGeminiSum.toFixed(1)) });
        }

        // Add the sum of non-target percentages as "Unknown/Error" from Gemini's perspective
        if (unknownOrNonArabGeminiPercentageSum > 0) {
             geminiChartData.push({ name: 'Unknown/Error', value: parseFloat(unknownOrNonArabGeminiPercentageSum.toFixed(1)) });
        } else if (geminiChartData.length === 0 && geminiCommentCountInput > 0) {
            // If no countries identified by Gemini at all, show 100% Unknown
            geminiChartData.push({ name: 'Unknown/Error', value: 100 });
        }


        geminiApiAnalysisResult.chartData = geminiChartData
          .map(item => ({ ...item, displayName: `${getCountryFlag(item.name)} ${item.name}` }))
          .sort((a,b) => b.value - a.value);

        geminiApiAnalysisResult.unknownOrNonArabPercentage = parseFloat(unknownOrNonArabGeminiPercentageSum.toFixed(1));

      } else {
         geminiApiAnalysisResult.error = "Gemini response parsed but yielded no data.";
      }
    } else if (geminiBatchResultText && typeof geminiBatchResultText === 'string' && geminiBatchResultText.startsWith('Error:')) {
        geminiApiAnalysisResult.error = geminiBatchResultText;
        geminiApiAnalysisResult.chartData = [{name: 'Unknown/Error', value: 100, displayName: `${getCountryFlag('Unknown/Error')} Unknown/Error` }];
        geminiApiAnalysisResult.unknownOrNonArabPercentage = 100;
    } else if (!geminiApiKey.trim() && geminiCommentCountInput > 0) {
        geminiApiAnalysisResult.error = "Gemini API key not provided. Analysis skipped.";
    }


    return {
      commonTitle: currentTitle,
      youtubeApiAnalysis: youtubeApiAnalysisResult,
      geminiApiAnalysis: geminiApiAnalysisResult,
    };
  }, []);


  // Inner helper for performSingleAggregation (moved from inside processAndAggregateData for clarity)
  // This is primarily for YouTube API per-comment data now.
  const performSingleAggregation = (comments, countryFieldName, title) => {
    const emptyResult = {
      chartData: [], rankedList: [], exampleCommentsByCountry: {},
      totalAnalyzedComments: 0, totalIdentifiedArabCountries: 0, unknownOrNonArabPercentage: 0, title: title
    };
    // This function is now primarily for YouTube per-comment data.
    // Gemini data comes from batch and is processed differently.
    if (!comments || comments.length === 0 || countryFieldName !== 'youtubeCountry') {
        return emptyResult;
    }

    const countryCounts = {};
    targetArabCountriesList.forEach(country => countryCounts[country] = 0);
    let unknownOrNonArabCount = 0;
    let identifiedArabCount = 0;
    let processedCommentCountForSource = 0;

    comments.forEach(comment => {
      let sourceCountry = comment[countryFieldName]; // Should be 'youtubeCountry'
      if (sourceCountry !== undefined && sourceCountry !== null) {
         processedCommentCountForSource++;
         if (sourceCountry.length === 2) {
            const countryEntry = Object.entries(countryDetails).find(([name, details]) => details.code === sourceCountry.toUpperCase());
            if (countryEntry) sourceCountry = countryEntry[0];
         }
         if (targetArabCountriesList.includes(sourceCountry)) {
            countryCounts[sourceCountry]++;
            identifiedArabCount++;
         } else {
            unknownOrNonArabCount++;
         }
      }
    });

    const totalCommentsForPercentageCalc = processedCommentCountForSource;

    const sortedArabCountries = Object.entries(countryCounts)
      .filter(([, count]) => count > 0)
      .sort(([, aCount], [, bCount]) => bCount - aCount);

    const rankedList = sortedArabCountries.map(([name, count]) => ({
      name, count,
      percentage: totalCommentsForPercentageCalc > 0 ? parseFloat(((count / totalCommentsForPercentageCalc) * 100).toFixed(1)) : 0,
      flag: getCountryFlag(name)
    }));

    const topFourForChart = rankedList.slice(0, 4);
    const otherArabCount = sortedArabCountries.slice(4).reduce((sum, [, count]) => sum + count, 0);

    let chartDataPayload = topFourForChart.map(c => ({ name: c.name, value: c.percentage }));
    if (otherArabCount > 0) {
      chartDataPayload.push({
        name: 'Other Arab Countries',
        value: totalCommentsForPercentageCalc > 0 ? parseFloat(((otherArabCount / totalCommentsForPercentageCalc) * 100).toFixed(1)) : 0
      });
    }
    const unknownOrNonArabPercentageVal = totalCommentsForPercentageCalc > 0 ? parseFloat(((unknownOrNonArabCount / totalCommentsForPercentageCalc) * 100).toFixed(1)) : 0;
    if (unknownOrNonArabPercentageVal > 0 || (chartDataPayload.length === 0 && totalCommentsForPercentageCalc > 0)) {
        chartDataPayload.push({ name: 'Unknown/Error', value: unknownOrNonArabPercentageVal });
    }

    chartDataPayload = chartDataPayload
      .map(item => ({ ...item, displayName: `${getCountryFlag(item.name)} ${item.name}` }))
      .sort((a,b) => b.value - a.value);

    const exampleCommentsByCountry = {};
    topFourForChart.forEach(country => {
      exampleCommentsByCountry[country.name] = comments
        .filter(comment => {
            let finalC = comment[countryFieldName];
            if (finalC && finalC.length === 2) {
                const cEntry = Object.entries(countryDetails).find(([n, d]) => d.code === finalC.toUpperCase());
                if (cEntry) finalC = cEntry[0];
            }
            return finalC === country.name;
        })
        .slice(0, 2).map(comment => comment.text);
    });

    return {
      title, chartData: chartDataPayload, rankedList, exampleCommentsByCountry,
      totalAnalyzedComments: processedCommentCountForSource,
      totalIdentifiedArabCountries: identifiedArabCount,
      unknownOrNonArabPercentage: unknownOrNonArabPercentageVal
    };
  };


  useEffect(() => {
    const results = processAndAggregateData(commentsData, selectedVideoFilter, rawGeminiBatchResult, geminiAnalysisCommentCount);
    setProcessedResults(results);
  }, [commentsData, rawGeminiBatchResult, selectedVideoFilter, processAndAggregateData, geminiAnalysisCommentCount]);


// Internal component to display a single set of analysis results
const AnalysisResultBlock = ({ analysisName, analysisData }) => {
  if (!analysisData || analysisData.totalAnalyzedComments === 0 && analysisData.totalIdentifiedArabCountries === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-xl">{analysisName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">No data available or processed for this analysis source.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl mb-2">{analysisName}</CardTitle>
        <CardDescription className="text-sm">
          Analyzed {analysisData.totalAnalyzedComments} comments for this source.
          Identified {analysisData.totalIdentifiedArabCountries} comments from target Arab countries.
          Unknown/Other from this source: {analysisData.unknownOrNonArabPercentage?.toFixed(1)}%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {analysisData.chartData && analysisData.chartData.length > 0 && analysisData.chartData.some(d => d.value > 0) ? (
          <Card>
            <CardHeader><CardTitle className="text-lg text-center">Comment Origin Distribution (%)</CardTitle></CardHeader>
            <CardContent className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysisData.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 110 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="displayName"
                    angle={-60}
                    textAnchor="end"
                    interval={0}
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 100]} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, "Percentage"]} />
                  <Bar dataKey="value" name="Percentage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-muted-foreground py-4">No chart data to display for {analysisName}. (All values might be 0% or no data processed).</p>
        )}

        {analysisData.rankedList && analysisData.rankedList.length > 0 ? (
          <Card>
            <CardHeader><CardTitle className="text-lg text-center">Ranked List of Identified Arab Countries</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {analysisData.rankedList.map(country => (
                  <li key={country.name} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md shadow-sm">
                    <span className="flex items-center"><span className="text-xl mr-2">{country.flag}</span> {country.name}</span>
                    <span className="font-semibold text-sm">{country.percentage}% <span className="text-xs text-muted-foreground">({country.count})</span></span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
           <p className="text-center text-muted-foreground py-4">No countries identified or ranked for {analysisName}.</p>
        )}

        {analysisData.exampleCommentsByCountry && Object.values(analysisData.exampleCommentsByCountry).some(arr => arr.length > 0) ? (
          <Card>
            <CardHeader><CardTitle className="text-lg text-center">Example Comments by Top Countries</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(analysisData.exampleCommentsByCountry).map(([country, comments]) => (
                  comments.length > 0 && (
                    <Card key={country} className="bg-white dark:bg-slate-800 shadow-lg">
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-md flex items-center"><span className="text-xl mr-2">{getCountryFlag(country)}</span>{country}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {comments.map((comment, index) => (
                          <blockquote key={index} className="text-sm text-slate-600 dark:text-slate-300 border-l-4 border-primary pl-3 py-1 italic bg-slate-50 dark:bg-slate-700/50 rounded-r-md">
                            "{comment.length > 150 ? comment.substring(0, 150) + '...' : comment}"
                          </blockquote>
                        ))}
                      </CardContent>
                    </Card>
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-muted-foreground py-4">No example comments to display for {analysisName}.</p>
        )}
      </CardContent>
    </Card>
  );
};

  return (
    <Card className="w-full max-w-4xl mx-auto my-8">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">Arabia Comment Mapper</CardTitle>
        <CardDescription>Analyze YouTube comment origins and dialects.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <Card className="bg-slate-50">
          <CardHeader>
            <CardTitle className="text-xl">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <div>
            <label htmlFor="geminiApiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Gemini API Key (for dialect analysis)
            </label>
            <div className="flex items-center space-x-2">
              <Input
                id="geminiApiKey"
                type="password"
                placeholder="Enter your Gemini API Key"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                disabled={isLoading}
                className="flex-grow"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Optional. Used if YouTube doesn't provide country. Get key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>.
            </p>
          </div>
          <div>
            <label htmlFor="videoUrls" className="block text-sm font-medium text-gray-700 mb-1">
              YouTube Video URLs (one per line)
            </label>
            <Textarea
              id="videoUrls"
              placeholder="Enter YouTube video URLs here, one URL per line..."
              className="min-h-[100px]"
              value={videoUrls}
              onChange={(e) => setVideoUrls(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {/* End of inputs within Configuration CardContent */}
          </CardContent> {/* Closes CardContent (L293) of Configuration Card */}
          <CardFooter> {/* Add CardFooter for the Button */}
            <Button className="w-full" onClick={handleAnalyzeClick} disabled={isLoading}>
              {isLoading ? 'Analyzing...' : 'Analyze Comments'}
            </Button>
          </CardFooter>
        </Card> {/* Closes Configuration Card (L291) */}

        {/* Error display, Results Filter, Placeholders, and Raw Data sections are siblings
            to the Configuration Card, within the main page's CardContent (L289) */}

        {error && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-900/30 dark:border-red-700">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-400 text-lg">Error Log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 dark:text-red-300 whitespace-pre-wrap">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Results Card - updated to hold two analysis blocks */}
        {processedResults && (processedResults.youtubeApiAnalysis || processedResults.geminiApiAnalysis) && !isLoading && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-2xl text-center mb-4">
                Analysis Results for: <span className="text-primary">{processedResults.commonTitle}</span>
              </CardTitle>
              <div className="flex items-center space-x-4 pt-3 justify-center">
                <label htmlFor="videoFilter" className="text-sm font-medium">Filter by Video:</label>
                <Select
                  value={selectedVideoFilter}
                  onValueChange={setSelectedVideoFilter}
                  disabled={!commentsData || commentsData.length === 0}
                >
                  <SelectTrigger className="w-auto min-w-[200px] max-w-[300px]">
                    <SelectValue placeholder="Select video" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Videos</SelectItem>
                    {commentsData.map(videoData => (
                      <SelectItem key={videoData.videoId} value={videoData.videoId}>
                        {videoData.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* YouTube API Analysis Block */}
              {processedResults.youtubeApiAnalysis && (
                <AnalysisResultBlock
                  analysisName="Based on YouTube Channel Data (youtubeCountry)"
                  analysisData={processedResults.youtubeApiAnalysis}
                />
              )}

              {/* Gemini API Analysis Block */}
              {geminiApiKey.trim() && processedResults.geminiApiAnalysis && (
                 <AnalysisResultBlock
                  analysisName="Based on Gemini Comment Analysis (geminiCountry)"
                  analysisData={processedResults.geminiApiAnalysis}
                />
              )}
              {!geminiApiKey.trim() && (
                <Card className="mt-4"><CardHeader><CardTitle className="text-xl">Gemini Comment Analysis</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-4">Gemini API key not provided. This analysis was skipped.</p></CardContent></Card>
              )}

            </CardContent>
          </Card>
        )}

        {commentsData.length > 0 && !isLoading && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-xl">Raw Data Verification</CardTitle>
              <CardDescription>Inspect the fetched and processed data for debugging.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                value={JSON.stringify(commentsData, null, 2)}
                className="min-h-[200px] text-xs bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                placeholder="Raw JSON data of comments..."
              />
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default ArabiaCommentMapper;
