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

  const [processedResults, setProcessedResults] = useState(null);
  const [selectedVideoFilter, setSelectedVideoFilter] = useState('all');

  const handleAnalyzeClick = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setCommentsData([]);
    setProcessedResults(null);

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
            if (!youtubeCountry && geminiApiKey.trim() && comment.text && comment.text.trim() !== '') {
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
    if (!currentData || currentData.length === 0) return null;

    let commentsToProcess = [];
    let currentTitle = "All Videos"; // Default title
    if (filterId === 'all') {
      currentData.forEach(video => commentsToProcess.push(...video.comments));
    } else {
      const selectedVideo = currentData.find(video => video.videoId === filterId);
      if (selectedVideo) {
        commentsToProcess = selectedVideo.comments;
        currentTitle = selectedVideo.title; // Use the actual video title
      }
    }

    if (commentsToProcess.length === 0) return {
        title: currentTitle, chartData: [], rankedList: [], exampleCommentsByCountry: {},
        totalAnalyzedComments: 0, totalIdentifiedArabCountries: 0,
        unknownOrNonArabPercentage: 0
    };

    const countryCounts = {};
    targetArabCountriesList.forEach(country => countryCounts[country] = 0);
    let unknownOrNonArabCount = 0; // Includes Gemini errors, non-standard, truly unknown, non-Arab countries
    let identifiedArabCount = 0;

    commentsToProcess.forEach(comment => {
      let finalCountry = comment.youtubeCountry || comment.geminiCountry;
      // Basic normalization: if country code (e.g., 'SA'), map to full name.
      // This is a simple example; a more robust solution might be needed for all country codes.
      if (finalCountry && finalCountry.length === 2) {
          const countryEntry = Object.entries(countryDetails).find(([name, details]) => details.code === finalCountry.toUpperCase());
          if (countryEntry) finalCountry = countryEntry[0];
      }

      if (finalCountry && targetArabCountriesList.includes(finalCountry)) {
        countryCounts[finalCountry]++;
        identifiedArabCount++;
      } else {
        unknownOrNonArabCount++;
      }
    });

    const totalAnalyzedComments = commentsToProcess.length;

    const sortedArabCountries = Object.entries(countryCounts)
      .filter(([name, count]) => count > 0) // Only countries with counts
      .sort(([, aCount], [, bCount]) => bCount - aCount);

    const rankedList = sortedArabCountries.map(([name, count]) => ({
      name,
      count,
      percentage: totalAnalyzedComments > 0 ? parseFloat(((count / totalAnalyzedComments) * 100).toFixed(1)) : 0,
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
        value: totalAnalyzedComments > 0 ? parseFloat(((otherArabCount / totalAnalyzedComments) * 100).toFixed(1)) : 0
      });
    }

    const unknownOrNonArabPercentageVal = totalAnalyzedComments > 0 ? parseFloat(((unknownOrNonArabCount / totalAnalyzedComments) * 100).toFixed(1)) : 0;
    // Ensure "Unknown/Error" is added only if it has a value or if there's no other data to show
    if (unknownOrNonArabPercentageVal > 0 || chartDataPayload.length === 0 && totalAnalyzedComments > 0) {
        chartDataPayload.push({ name: 'Unknown/Error', value: unknownOrNonArabPercentageVal });
    }

    // Add flags for chart labels, sort by value for consistent chart display
    chartDataPayload = chartDataPayload
      .map(item => ({
        ...item,
        displayName: `${getCountryFlag(item.name)} ${item.name}`,
      }))
      .sort((a,b) => b.value - a.value); // Sort by percentage descending for chart


    const exampleCommentsByCountry = {};
    // Use topFourForChart which contains the top Arab countries identified
    topFourForChart.forEach(country => {
      exampleCommentsByCountry[country.name] = commentsToProcess
        .filter(comment => {
            let finalC = comment.youtubeCountry || comment.geminiCountry;
            if (finalC && finalC.length === 2) { // Normalize from code if necessary
                const cEntry = Object.entries(countryDetails).find(([n, d]) => d.code === finalC.toUpperCase());
                if (cEntry) finalC = cEntry[0];
            }
            return finalC === country.name;
        })
        .slice(0, 2) // Max 2 examples
        .map(comment => comment.text);
    });

    return {
      title: currentTitle, // Pass the title for the results section
      chartData: chartDataPayload,
      rankedList,
      exampleCommentsByCountry,
      totalAnalyzedComments,
      totalIdentifiedArabCountries: identifiedArabCount,
      unknownOrNonArabPercentage: unknownOrNonArabPercentageVal
    };
  }, []);

  useEffect(() => {
    if (commentsData && commentsData.length > 0) {
      const results = processAndAggregateData(commentsData, selectedVideoFilter);
      setProcessedResults(results);
    } else {
      setProcessedResults(null);
    }
  }, [commentsData, selectedVideoFilter, processAndAggregateData]);

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

          {/* Alternative file input - can be implemented later
          <div>
            <label htmlFor="fileUpload" className="block text-sm font-medium text-gray-700 mb-1">
              Or Upload a .csv/.txt file
            </label>
            <Input id="fileUpload" type="file" disabled={isLoading} />
          </div>
          */}

          <Button className="w-full" onClick={handleAnalyzeClick} disabled={isLoading}>
            {isLoading ? 'Analyzing...' : 'Analyze Comments'}
          </Button>

          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-100 border border-red-400 rounded-md">
              <p>Error: {error}</p>
            </div>
          )}

          <div className="pt-4">
            <h3 className="text-lg font-semibold mb-2 text-center">Results Filter</h3>
            <Select disabled={isLoading || commentsData.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by video (All Videos)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Videos</SelectItem>
                {/* Placeholder for specific video options - will be populated dynamically */}
                {commentsData.map(videoData => (
                  <SelectItem key={videoData.videoId} value={videoData.videoId}>
                    {videoData.videoId} {/* Replace with actual video title if fetched */}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-semibold mb-2 text-center">Comment Distribution Chart</h3>
            <div className="border rounded-md min-h-[200px] flex items-center justify-center text-gray-400">
              [Chart Placeholder]
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-semibold mb-2 text-center">Ranked List of Countries</h3>
            <div className="border rounded-md min-h-[150px] flex items-center justify-center text-gray-400">
              [Ranked List Placeholder]
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-semibold mb-2 text-center">Example Comments</h3>
            <div className="border rounded-md min-h-[150px] flex items-center justify-center text-gray-400">
              [Example Comments Placeholder]
            </div>
          </div>

          {commentsData.length > 0 && (
            <div className="pt-4">
              <h3 className="text-lg font-semibold mb-2 text-center">Raw Data Verification</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto max-h-[300px]">
                {JSON.stringify(commentsData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ArabiaCommentMapper;
