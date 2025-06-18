import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';

import ChannelInputForm from '@/components/sponsored-checker/ChannelInputForm';
import AnalysisControls from '@/components/sponsored-checker/AnalysisControls';
import SummaryDisplay from '@/components/sponsored-checker/SummaryDisplay';
import ResultsTable from '@/components/sponsored-checker/ResultsTable';

import useYouTubeChannelVideos from '@/hooks/sponsored-checker/useYouTubeChannelVideos';
import useVideoAnalysis from '@/hooks/sponsored-checker/useVideoAnalysis';

const getTodayDate = () => new Date().toISOString().split('T')[0];
const getOneYearAgoDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split('T')[0];
};

const SponsoredCheckerPage = () => {
  // Input States
  const [channelUrl, setChannelUrl] = useState('');
  const [startDate, setStartDate] = useState(getOneYearAgoDate());
  const [endDate, setEndDate] = useState(getTodayDate());

  // API Key States
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [youtubeKeyExists, setYoutubeKeyExists] = useState(false);
  const [geminiKeyExists, setGeminiKeyExists] = useState(false);

  // Analysis & UI States
  const [useGemini, setUseGemini] = useState(true);
  const [showOnlySponsored, setShowOnlySponsored] = useState(false);
  const [pageLoadingMessage, setPageLoadingMessage] = useState('');

  // YouTube Videos Hook
  const {
    videos: fetchedVideos,
    isLoading: isFetchingVideos,
    error: youtubeHookError,
    fetchSourceVideos,
    updateUserApiKey: updateHookYoutubeApiKey,
    setError: setYoutubeHookError
  } = useYouTubeChannelVideos(youtubeApiKey);

  // Video Analysis Hook
  const {
    analyzedVideosList,
    isCurrentlyAnalyzing,
    analysisError: videoAnalysisHookError,
    performVideoAnalysis,
    updateGeminiApiKey: updateHookGeminiApiKey,
    setAnalysisError: setVideoAnalysisHookError
  } = useVideoAnalysis(geminiApiKey);

  // Load API keys from localStorage on mount
  useEffect(() => {
    const storedYoutubeKey = localStorage.getItem('youtube_api_key');
    if (storedYoutubeKey) {
      setYoutubeApiKey(storedYoutubeKey);
      updateHookYoutubeApiKey(storedYoutubeKey);
      setYoutubeKeyExists(true);
    }
    const storedGeminiKey = localStorage.getItem('gemini_api_key');
    if (storedGeminiKey) {
      setGeminiApiKey(storedGeminiKey);
      updateHookGeminiApiKey(storedGeminiKey);
      setGeminiKeyExists(true);
    } else {
      // If no Gemini key, default useGemini to false
      setUseGemini(false);
    }
  }, [updateHookYoutubeApiKey, updateHookGeminiApiKey]);

  const handleSaveYoutubeApiKey = () => {
    if (youtubeApiKey) {
      localStorage.setItem('youtube_api_key', youtubeApiKey);
      updateHookYoutubeApiKey(youtubeApiKey);
      setYoutubeKeyExists(true);
      alert('YouTube API Key saved!');
    } else {
      alert('Please enter a YouTube API Key.');
    }
  };

  const handleSaveGeminiApiKey = () => {
    if (geminiApiKey) {
      localStorage.setItem('gemini_api_key', geminiApiKey);
      updateHookGeminiApiKey(geminiApiKey);
      setGeminiKeyExists(true);
      alert('Gemini API Key saved!');
    } else {
      alert('Please enter a Gemini API Key.');
    }
  };

  const handleFetchRequest = useCallback(async () => {
    if (!youtubeKeyExists) {
        alert("Please save a valid YouTube API Key first.");
        return;
    }
    if (!channelUrl) {
        alert("Please enter a YouTube Channel URL.");
        return;
    }
    if (youtubeHookError) setYoutubeHookError(null);
    if (videoAnalysisHookError) setVideoAnalysisHookError(null);

    setPageLoadingMessage('Fetching videos...');
    await fetchSourceVideos(channelUrl, startDate, endDate);
    // Analysis will be triggered by useEffect below once fetchedVideos are available
  }, [fetchSourceVideos, channelUrl, startDate, endDate, youtubeKeyExists, youtubeHookError, videoAnalysisHookError, setYoutubeHookError, setVideoAnalysisHookError]);

  // Effect to chain video fetching with video analysis
  useEffect(() => {
    if (fetchedVideos && fetchedVideos.length > 0 && !isFetchingVideos && !youtubeHookError) {
      setPageLoadingMessage(`Analyzing ${fetchedVideos.length} videos...`);
      performVideoAnalysis(fetchedVideos, useGemini && geminiKeyExists); // Pass geminiKeyExists as well
    } else if (!isFetchingVideos && fetchedVideos && fetchedVideos.length === 0) {
      // If fetching is done and no videos were found (e.g. due to duration filter or channel has no videos in range)
      setPageLoadingMessage('No videos found to analyze.');
    }
    // If fetching is done and there was a youtubeError, no analysis will start.
    // Clear loading message when fetching is done or if there's an error.
    if(!isFetchingVideos || youtubeHookError) {
        // Keep specific analysis message if analysis is ongoing
        if(!isCurrentlyAnalyzing) setPageLoadingMessage('');
    }
  }, [fetchedVideos, isFetchingVideos, youtubeHookError, performVideoAnalysis, useGemini, geminiKeyExists, isCurrentlyAnalyzing]);


  // Update loading message when analysis starts/ends
  useEffect(() => {
    if (isCurrentlyAnalyzing) {
      // More granular message can be set inside the hook and passed up if needed
      setPageLoadingMessage('Analysis in progress...');
    } else {
      // If analysis just finished, and not fetching, clear message.
      if (!isFetchingVideos) setPageLoadingMessage('');
    }
  }, [isCurrentlyAnalyzing, isFetchingVideos]);

  const combinedIsLoading = isFetchingVideos || isCurrentlyAnalyzing;
  const combinedError = youtubeHookError || videoAnalysisHookError;

  // Determine which list of videos to show (raw fetched or analyzed)
  const displayVideos = analyzedVideosList.length > 0 ? analyzedVideosList : fetchedVideos || [];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-6">Sponsored Content Checker (Rebuilt)</h1>

      {combinedError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{combinedError}</AlertDescription>
        </Alert>
      )}

      <ChannelInputForm
        channelUrl={channelUrl} setChannelUrl={setChannelUrl}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        youtubeApiKey={youtubeApiKey} setYoutubeApiKey={setYoutubeApiKey}
        onSaveYoutubeApiKey={handleSaveYoutubeApiKey}
        geminiApiKey={geminiApiKey} setGeminiApiKey={setGeminiApiKey}
        onSaveGeminiApiKey={handleSaveGeminiApiKey}
        useGemini={useGemini} // Pass the state
        setUseGemini={setUseGemini} // Pass the setter
        isLoading={combinedIsLoading}
        geminiKeyExists={geminiKeyExists}
      />

      <AnalysisControls
        onAnalyzeClick={handleFetchRequest} // Button now triggers fetching first
        isLoading={combinedIsLoading}
        loadingMessage={pageLoadingMessage}
        showOnlySponsored={showOnlySponsored} setShowOnlySponsored={setShowOnlySponsored}
        hasChannelUrl={!!channelUrl}
        hasResults={displayVideos.length > 0}
        isFetching={isFetchingVideos}
        isAnalyzing={isCurrentlyAnalyzing}
      />

      <SummaryDisplay videos={displayVideos} />

      <ResultsTable
        videos={displayVideos}
        // isLoading is for initial table load before any data (fetched or analyzed)
        isLoading={isFetchingVideos && displayVideos.length === 0}
        isAnalyzing={isCurrentlyAnalyzing} // To show per-row spinners or global spinner
        hookError={null} // Global errors are handled by the Alert above
        pageLoadingMessage={pageLoadingMessage}
      />
    </div>
  );
};

export default SponsoredCheckerPage;
