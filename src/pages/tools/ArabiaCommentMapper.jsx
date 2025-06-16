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

const ArabiaCommentMapper = () => {
  const [videoUrls, setVideoUrls] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [commentsData, setCommentsData] = useState([]); // Stores {videoId, title, comments: [...]}
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

            let geminiCountry = null;
            // Condition changed: removed !youtubeCountry
            if (geminiApiKey.trim() && comment.text && comment.text.trim() !== '') {
              const prompt = `Analyze the following Arabic comment and determine the most likely country of origin of the commenter from this list: [${targetArabCountriesList.join(', ')}]. Focus on dialect, slang, and specific expressions. Return only the country name from the list, or 'Unknown' if uncertain. Comment: '${comment.text}'`;
              try {
                const geminiResult = await geminiApiService.generateContent(geminiApiKey, prompt);
                if (geminiResult && targetArabCountriesList.includes(geminiResult)) {
                  geminiCountry = geminiResult;
                } else if (geminiResult && geminiResult.length < 30) {
                  geminiCountry = 'Unknown (Non-standard)';
                  console.warn(`Gemini returned non-standard country: ${geminiResult} for comment: ${comment.text.substring(0,50)}...`);
                } else {
                  geminiCountry = 'Unknown'; // Default if Gemini result is empty or too long
                }
              } catch (geminiError) {
                console.error(`Gemini API error for comment "${comment.text.substring(0,50)}...":`, geminiError.message);
                geminiCountry = 'Error (Gemini)';
                if (!currentError.includes("Error with Gemini API occurred for some comments.")) {
                    currentError += `Error with Gemini API occurred for some comments. Check console. `;
                }
              }
            } else if (!geminiApiKey.trim() && comment.text && comment.text.trim() !== '') {
              // If API key is missing, but we would have called Gemini, explicitly set geminiCountry to null or a specific marker
              geminiCountry = null; // Or 'API Key Missing'
            }
            processedCommentsContent.push({
              text: comment.text,
              authorChannelId: comment.authorChannelId,
              youtubeCountry: youtubeCountry,
              geminiCountry: geminiCountry,
            });
          }
          allVideosData.push({ videoId, comments: processedCommentsContent, title });
        } catch (videoError) {
          console.error(`Error processing comments for video ${videoId} (${title}):`, videoError.message);
          currentError += `Error processing comments for video ${videoId} (${title}): ${videoError.message}. `;
        }
      }
      setCommentsData(allVideosData);
    } catch (e) {
      console.error("Error during analysis:", e);
      currentError += `An unexpected error occurred: ${e.message}.`;
    } finally {
      setError(currentError.trim());
      setIsLoading(false);
    }
  }, [videoUrls, geminiApiKey]);

  const processAndAggregateData = useCallback((currentData, filterId) => {
    const emptyAnalysisResult = {
      chartData: [],
      rankedList: [],
      exampleCommentsByCountry: {},
      totalAnalyzedComments: 0,
      totalIdentifiedArabCountries: 0,
      unknownOrNonArabPercentage: 0,
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

    if (commentsToProcess.length === 0) {
      return {
        commonTitle: currentTitle,
        youtubeApiAnalysis: { ...emptyAnalysisResult, title: currentTitle },
        geminiApiAnalysis: { ...emptyAnalysisResult, title: currentTitle },
      };
    }

    const performSingleAggregation = (comments, countryFieldName) => {
      const countryCounts = {};
      targetArabCountriesList.forEach(country => countryCounts[country] = 0);
      let unknownOrNonArabCount = 0;
      let identifiedArabCount = 0;
      let processedCommentCountForSource = 0; // Comments that had a value for this source

      comments.forEach(comment => {
        let sourceCountry = comment[countryFieldName];
        if (sourceCountry === undefined || sourceCountry === null || sourceCountry === 'Error (Gemini)') {
          // If error from Gemini, or no data from source, it's not counted in this source's "analyzed" total for identified Arab countries
          // but might be counted in overall "unknown" if no other source provides data.
          // For this specific aggregation, we only care about comments this source *could* identify.
          if (sourceCountry === 'Error (Gemini)') unknownOrNonArabCount++; // Count errors specifically if needed
          return; // Skip if no data from this source or it's an error state we exclude from positive ID
        }
        processedCommentCountForSource++;


        if (sourceCountry && sourceCountry.length === 2) { // Normalize country code
          const countryEntry = Object.entries(countryDetails).find(([name, details]) => details.code === sourceCountry.toUpperCase());
          if (countryEntry) sourceCountry = countryEntry[0];
        }

        if (sourceCountry && targetArabCountriesList.includes(sourceCountry)) {
          countryCounts[sourceCountry]++;
          identifiedArabCount++;
        } else {
          // Includes 'Unknown', 'Unknown (Non-standard)', or non-target countries
          unknownOrNonArabCount++;
        }
      });

      // Base percentages on comments that had a value for this source, or all comments if that's preferred.
      // Using processedCommentCountForSource makes percentages relative to comments processed by *this* source.
      const totalCommentsForPercentageCalc = processedCommentCountForSource;

      const sortedArabCountries = Object.entries(countryCounts)
        .filter(([name, count]) => count > 0)
        .sort(([, aCount], [, bCount]) => bCount - aCount);

      const rankedList = sortedArabCountries.map(([name, count]) => ({
        name,
        count,
        percentage: totalCommentsForPercentageCalc > 0 ? parseFloat(((count / totalCommentsForPercentageCalc) * 100).toFixed(1)) : 0,
        flag: getCountryFlag(name)
      }));

      const topFourForChart = rankedList.slice(0, 4);
      const otherArabCount = sortedArabCountries.slice(4).reduce((sum, [, count]) => sum + count, 0);

      let chartDataPayload = topFourForChart.map(c => ({
          name: c.name,
          value: c.percentage
      }));

      if (otherArabCount > 0) {
        chartDataPayload.push({
          name: 'Other Arab Countries',
          value: totalCommentsForPercentageCalc > 0 ? parseFloat(((otherArabCount / totalCommentsForPercentageCalc) * 100).toFixed(1)) : 0
        });
      }

      const unknownOrNonArabPercentageVal = totalCommentsForPercentageCalc > 0 ? parseFloat(((unknownOrNonArabCount / totalCommentsForPercentageCalc) * 100).toFixed(1)) : 0;
      if (unknownOrNonArabPercentageVal > 0 || (chartDataPayload.length === 0 && totalCommentsForPercentageCalc > 0) ) {
          chartDataPayload.push({ name: 'Unknown/Error', value: unknownOrNonArabPercentageVal });
      }

      chartDataPayload = chartDataPayload
        .map(item => ({
          ...item,
          displayName: `${getCountryFlag(item.name)} ${item.name}`,
        }))
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
          .slice(0, 2)
          .map(comment => comment.text);
      });

      return {
        title: currentTitle, // Title here is more for consistency if used directly
        chartData: chartDataPayload,
        rankedList,
        exampleCommentsByCountry,
        totalAnalyzedComments: processedCommentCountForSource, // Total comments processed by this source
        totalIdentifiedArabCountries: identifiedArabCount,
        unknownOrNonArabPercentage: unknownOrNonArabPercentageVal
      };
    };

    const youtubeApiAnalysis = performSingleAggregation(commentsToProcess, 'youtubeCountry');
    const geminiApiAnalysis = performSingleAggregation(commentsToProcess, 'geminiCountry');

    return {
      commonTitle: currentTitle,
      youtubeApiAnalysis,
      geminiApiAnalysis
    };
  }, []);

  useEffect(() => {
    if (commentsData && commentsData.length > 0) {
      const results = processAndAggregateData(commentsData, selectedVideoFilter);
      // This will need to be updated in the next step to return the dual structure
      // For now, to avoid breaking the UI, we'll assume it returns the old structure
      // or we temporarily adapt. Let's assume processAndAggregateData is not yet changed.
      // To prevent immediate errors, we'll have to temporarily assign to one part or adapt UI.
      // For this step, the main goal is state structure change.
      // The UI will temporarily break until processAndAggregateData and UI rendering are updated.
      setProcessedResults(results); // This line will be the source of an error until next step.
    } else {
      setProcessedResults({ youtubeApiAnalysis: null, geminiApiAnalysis: null, commonTitle: 'All Videos' });
    }
  }, [commentsData, selectedVideoFilter, processAndAggregateData]); // processAndAggregateData will also change

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
