import React, { useState, useCallback, useEffect } from 'react';
import youtubeApiService from '../../services/youtubeApi';
import geminiApiService from '../../services/geminiApiService';
import { useAppContext } from '@/contexts/AppContext';
import ErrorBoundary from '@/components/utils/ErrorBoundary';
import { Input } from '@/components/ui/input'; // Keep for potential future use like file upload
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Assuming recharts is used

// const targetArabCountriesList = [ ... ]; // Removed

// countryDetails remains, used by getCountryFlag.
// getCountryFlag might need to be more generic or handle unknown 2-letter codes if we want flags for all countries.
// For now, it will show flags for Arab countries and a default for others.
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

// Simple hash for caching Gemini responses per comment
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString();
};

// Function to parse the Gemini batch response - REMOVED
// const parseGeminiBatchResponse = (responseText) => { ... };


const ArabiaCommentMapper = () => {
  const [videoUrls, setVideoUrls] = useState('');
  // const [geminiApiKey, setGeminiApiKey] = useState(''); // Removed
  const [commentsData, setCommentsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // const [rawGeminiBatchResult, setRawGeminiBatchResult] = useState(null); // Removed
  // const [geminiAnalysisCommentCount, setGeminiAnalysisCommentCount] = useState(0); // Removed

  const [processedResults, setProcessedResults] = useState(null); // Simplified
  const [selectedVideoFilter, setSelectedVideoFilter] = useState('all');
  const [geminiResults, setGeminiResults] = useState(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  const { geminiApiKey } = useAppContext();

  const handleAnalyzeClick = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setCommentsData([]);
    // setRawGeminiBatchResult(null); // Removed
    // setGeminiAnalysisCommentCount(0); // Removed
    setProcessedResults(null); // Simplified reset

    let currentError = '';
    // Removed Gemini API Key check error

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
          const fetchedComments = await youtubeApiService.getVideoComments(videoId, 500); // Updated maxResults to 500
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

      // === Batch Gemini Request section removed ===

    } catch (e) {
      console.error("Error during analysis:", e);
      currentError += `An unexpected error occurred: ${e.message}.`;
    } finally {
      setError(currentError.trim());
      setIsLoading(false);
    }
  }, [videoUrls, commentsData, selectedVideoFilter]); // Removed geminiApiKey,

  const processAndAggregateData = useCallback((currentData, filterId, countryField = 'youtubeCountry') => {
    const emptyResult = {
      title: filterId === 'all' ? 'All Videos' : (currentData.find(v => v.videoId === filterId)?.title || 'Selected Video'),
      chartData: [],
      rankedList: [],
      totalProcessedCommentsWithCountry: 0,
      distinctCountriesFound: 0,
      commentsWithoutCountry: 0,
      percentageWithoutCountry: 0,
      error: null,
    };

    if (!currentData || currentData.length === 0) {
        return emptyResult;
    }

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
        return { ...emptyResult, title: currentTitle };
    }

    // Call performSingleAggregation for the desired country field
    return performSingleAggregation(commentsToProcess, countryField, currentTitle, commentsToProcess.length);

  }, []);

  const processGeminiData = useCallback((currentData, filterId) => {
    return processAndAggregateData(currentData, filterId, 'geminiCountry');
  }, [processAndAggregateData]);
  const handleGeminiDetectionClick = useCallback(async () => {
    if (!commentsData || commentsData.length === 0) return;
    if (!geminiApiKey) {
      setError('Gemini API key is not set.');
      return;
    }
    setIsGeminiLoading(true);
    let updated = JSON.parse(JSON.stringify(commentsData));
    for (const video of updated) {
      for (const comment of video.comments) {
        if (comment.geminiCountry) continue;
        try {
          const prompt = `Based on slang, language, emojis, and context, which Arab country is this comment most likely from? Just return the country name.\nComment: "${comment.text}"`;
          const cacheKey = `origin_${hashString(comment.text)}`;
          const country = await geminiApiService.generateContent(geminiApiKey, prompt, cacheKey);
          comment.geminiCountry = country.trim() || 'Unknown';
        } catch (err) {
          console.error('Gemini detection error:', err);
          comment.geminiCountry = 'Error (Gemini)';
        }
      }
    }
    setCommentsData(updated);
    const results = processGeminiData(updated, selectedVideoFilter);
    setGeminiResults(results);
    setIsGeminiLoading(false);
  }, [commentsData, geminiApiKey, selectedVideoFilter, processGeminiData]);



  // Refactored performSingleAggregation for global country analysis
  const performSingleAggregation = (comments, countryFieldName, title, totalCommentsInput) => {
    const emptyResult = {
      title, chartData: [], rankedList: [],
      totalProcessedCommentsWithCountry: 0, distinctCountriesFound: 0,
      commentsWithoutCountry: totalCommentsInput,
      percentageWithoutCountry: totalCommentsInput > 0 ? 100 : 0,
      error: null
    };

    if (!comments || comments.length === 0) return emptyResult;

    const countryCounts = {};
    let processedCommentCountForSource = 0; // Comments with a non-null country_field value

    comments.forEach(comment => {
      let sourceCountry = comment[countryFieldName]; // Should be 'youtubeCountry'
      if (sourceCountry && typeof sourceCountry === 'string') { // Ensure it's a non-empty string
         processedCommentCountForSource++;
         // Normalize 2-letter codes to full names if in countryDetails, otherwise use as is
         const knownCountry = Object.keys(countryDetails).find(key => countryDetails[key].code === sourceCountry.toUpperCase());
         const countryName = knownCountry || sourceCountry;

         countryCounts[countryName] = (countryCounts[countryName] || 0) + 1;
      }
    });

    const commentsWithoutCountryData = totalCommentsInput - processedCommentCountForSource;
    const percentageWithoutCountryData = totalCommentsInput > 0 ? parseFloat(((commentsWithoutCountryData / totalCommentsInput) * 100).toFixed(1)) : 0;

    if (processedCommentCountForSource === 0) { // No comments had country data
        return { ...emptyResult,
                 commentsWithoutCountry: commentsWithoutCountryData,
                 percentageWithoutCountry: percentageWithoutCountryData,
                 totalProcessedCommentsWithCountry: 0,
                 distinctCountriesFound: 0
               };
    }

    const sortedCountries = Object.entries(countryCounts)
      .sort(([, aCount], [, bCount]) => bCount - aCount);

    const rankedList = sortedCountries.map(([name, count]) => ({
      name, count,
      percentage: parseFloat(((count / processedCommentCountForSource) * 100).toFixed(1)),
      flag: getCountryFlag(name)
    }));

    const topNForChart = 7; // Show top 7 countries in chart
    const chartTopCountries = rankedList.slice(0, topNForChart);
    const chartOtherCount = rankedList.slice(topNForChart).reduce((sum, item) => sum + item.count, 0);

    let chartDataPayload = chartTopCountries.map(c => ({
      name: c.name,
      value: c.percentage
    }));

    if (chartOtherCount > 0) {
      chartDataPayload.push({
        name: 'Other Countries',
        value: parseFloat(((chartOtherCount / processedCommentCountForSource) * 100).toFixed(1))
      });
    }

    chartDataPayload = chartDataPayload
      .map(item => ({ ...item, displayName: `${getCountryFlag(item.name)} ${item.name}` }))
      .sort((a,b) => b.value - a.value); // Sort by percentage for chart

    return {
      title,
      chartData: chartDataPayload,
      rankedList, // Full ranked list
      totalProcessedCommentsWithCountry: processedCommentCountForSource,
      distinctCountriesFound: sortedCountries.length,
      commentsWithoutCountry: commentsWithoutCountryData,
      percentageWithoutCountry: percentageWithoutCountryData,
      error: null
    };
  };


  useEffect(() => {
    const results = processAndAggregateData(commentsData, selectedVideoFilter);
    setProcessedResults(results);

    const hasGemini = commentsData.some(v => v.comments.some(c => c.geminiCountry));
    if (hasGemini) {
      const gResults = processGeminiData(commentsData, selectedVideoFilter);
      setGeminiResults(gResults);
    }
  }, [commentsData, selectedVideoFilter, processAndAggregateData, processGeminiData]);


// Internal component to display a single set of analysis results
// The 'analysisName' prop is simplified as there's only one analysis type now.
const AnalysisResultBlock = ({ analysisData }) => {
  // Updated condition to check totalProcessedCommentsWithCountry or if there's an error to display
  if (!analysisData || (analysisData.totalProcessedCommentsWithCountry === 0 && !analysisData.error)) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-xl">Commenter Country Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">No country data found in comments for the selected scope, or no comments to analyze.</p>
        </CardContent>
      </Card>
    );
  }

  // If there's an error message in analysisData, display it
  if (analysisData.error) {
     return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-xl">Commenter Country Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-red-500 py-4">{analysisData.error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 shadow-lg">
      <CardHeader>
        {/* analysisName prop removed from here, title is part of main results card */}
        <CardDescription className="text-sm pt-2">
          Found country data for {analysisData.totalProcessedCommentsWithCountry} comments.
          {analysisData.distinctCountriesFound} distinct countries identified.
          {analysisData.percentageWithoutCountry?.toFixed(1)}% of comments had no country data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {analysisData.chartData && analysisData.chartData.length > 0 && analysisData.chartData.some(d => d.value > 0) ? (
          <Card>
            <CardHeader><CardTitle className="text-lg text-center">Commenter Country Distribution (%)</CardTitle></CardHeader>
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
          <p className="text-center text-muted-foreground py-4">No chart data to display. (All values might be 0% or no data processed).</p>
        )}

        {analysisData.rankedList && analysisData.rankedList.length > 0 ? (
          <Card>
            <CardHeader><CardTitle className="text-lg text-center">Ranked List of Commenter Countries</CardTitle></CardHeader>
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
           <p className="text-center text-muted-foreground py-4">No countries identified or ranked.</p>
        )}

        {/* Example Comments section is already removed */}
      </CardContent>
    </Card>
  );
};

  return (
    <ErrorBoundary>
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
          {/* Gemini API Key Input Removed */}
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

        {/* Main Results Card - simplified */}
        {processedResults && !isLoading && ( // Simplified condition
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-2xl text-center mb-4">
                Analysis Results for: <span className="text-primary">{processedResults.title}</span> {/* Was commonTitle */}
              </CardTitle>
              <div className="flex items-center space-x-4 pt-3 justify-center">
                <label htmlFor="videoFilter" className="text-sm font-medium">Filter by Video:</label> {/* This filter remains */}
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
              <AnalysisResultBlock
                analysisData={processedResults}
              />
            </CardContent>
          </Card>
        )}

        {geminiResults && !isGeminiLoading && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-2xl text-center mb-4">
                Gemini Detection Results for: <span className="text-primary">{geminiResults.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <AnalysisResultBlock analysisData={geminiResults} />
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
            <CardFooter>
              <Button className="w-full" onClick={handleGeminiDetectionClick} disabled={isGeminiLoading}>
                {isGeminiLoading ? 'Detecting...' : 'Detect Comment Origin by Gemini'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </CardContent>
    </Card>
    </ErrorBoundary>
  );
};

export default ArabiaCommentMapper;
