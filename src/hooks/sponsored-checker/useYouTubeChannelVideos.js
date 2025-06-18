import { useState, useCallback } from 'react';
import youtubeApiService from '@/services/youtubeApi'; // Assuming this is the correct path

// Helper function to parse ISO 8601 duration
function parseISO8601Duration(isoDuration) {
  if (!isoDuration || typeof isoDuration !== 'string') return 0;
  // Updated regex to be more robust for various ISO 8601 duration formats
  const regex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d{1,3})?)S)?$/;
  const matches = isoDuration.match(regex);

  if (!matches) return 0;

  const hours = parseFloat(matches[1] || 0);
  const minutes = parseFloat(matches[2] || 0);
  const seconds = parseFloat(matches[3] || 0);

  return (hours * 3600) + (minutes * 60) + seconds;
}

const useYouTubeChannelVideos = (initialUserApiKey) => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // The hook itself doesn't directly set the key on the service,
  // but relies on the service's own key management (e.g., localStorage via getApiKey).
  // This state is more for knowing if a key has been provided to the app context/hook.
  const [userApiKey, setUserApiKey] = useState(initialUserApiKey);

  const updateUserApiKey = useCallback((newApiKey) => {
    setUserApiKey(newApiKey);
    // If youtubeApiService needs explicit key setting:
    // youtubeApiService.setApiKey(newApiKey);
    // However, current youtubeApiService uses localStorage. So this function mainly updates hook's view of key.
  }, []);

  const fetchSourceVideos = useCallback(async (channelUrl, startDate, endDate) => {
    // The actual API key for requests is retrieved by youtubeApiService.getApiKey()
    const currentApiKey = youtubeApiService.getApiKey();
    if (!currentApiKey) {
      setError('YouTube API key is not set in application storage.');
      setIsLoading(false);
      setVideos([]);
      return;
    }
    if (!channelUrl) {
      setError('Channel URL is required.');
      setIsLoading(false);
      setVideos([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideos([]);

    try {
      let channelId = await youtubeApiService.extractChannelId(channelUrl);
      if (!channelId) {
        // Attempt to get from custom URL only if direct extraction fails
        channelId = await youtubeApiService.getChannelIdFromCustomUrl(channelUrl);
      }
      if (!channelId) {
        throw new Error('Could not resolve YouTube Channel ID from the provided URL.');
      }

      const videoIds = [];
      let nextPageToken = null;
      const publishedAfterISO = startDate ? new Date(startDate).toISOString() : undefined;
      // Adjust endDate to be inclusive by setting time to end of day or adding 1 day if only date is provided
      const publishedBeforeISO = endDate ? new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString() : undefined;


      for (let i = 0; i < 4 && videoIds.length < 200; i++) { // Max 4 pages for 200 videos
        const searchParams = {
          part: 'id', // Only fetch video IDs
          channelId: channelId,
          type: 'video',
          order: 'date',
          maxResults: Math.min(50, 200 - videoIds.length),
          publishedAfter: publishedAfterISO,
          publishedBefore: publishedBeforeISO,
          pageToken: nextPageToken,
        };
        // makeRequest is assumed to handle API key internally via youtubeApiService.getApiKey()
        const searchResponse = await youtubeApiService.makeRequest('search', searchParams);

        if (!searchResponse || !searchResponse.items || searchResponse.items.length === 0) {
            if (i === 0 && videoIds.length === 0) { // No videos found at all on first page
                //setError('No videos found for the given criteria on the channel.');
            }
            break; // Exit loop if no items or response
        }

        searchResponse.items.forEach(item => videoIds.push(item.id.videoId));
        nextPageToken = searchResponse.nextPageToken;
        if (!nextPageToken) break; // Exit if no more pages
      }

      if (videoIds.length === 0) {
        setVideos([]);
        //setError('No videos found for the given criteria after search.');
        // No error message here, just empty results, is fine.
        setIsLoading(false);
        return;
      }

      const fetchedVideoDetailsList = await youtubeApiService.getMultipleVideoDetails(videoIds);
      if (!fetchedVideoDetailsList) {
        throw new Error('Failed to fetch video details for found video IDs.');
      }

      const processedVideos = fetchedVideoDetailsList
        .map(video => {
          const durationInSeconds = parseISO8601Duration(video.contentDetails?.duration);
          return {
            id: video.id,
            title: video.snippet?.title || 'No title',
            description: video.snippet?.description || 'No description',
            publishedAt: video.snippet?.publishedAt?.split('T')[0] || 'Unknown date',
            durationInSeconds: durationInSeconds,
            videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
            thumbnails: video.snippet?.thumbnails,
          };
        })
        .filter(video => video.durationInSeconds >= 60);

      if (processedVideos.length === 0 && fetchedVideoDetailsList.length > 0) {
        //setError('No videos found meeting the duration criteria (>= 60s).');
        // No error message here, just empty results, is fine.
      }
      setVideos(processedVideos);

    } catch (err) {
      console.error('Error in fetchSourceVideos hook:', err);
      setError(err.message || 'An unexpected error occurred while fetching videos.');
      setVideos([]); // Clear videos on error
    } finally {
      setIsLoading(false);
    }
  }, [userApiKey]); // userApiKey dependency ensures re-fetch if key context changes via updateUserApiKey

  return { videos, isLoading, error, fetchSourceVideos, updateUserApiKey, setError };
};

export default useYouTubeChannelVideos;
