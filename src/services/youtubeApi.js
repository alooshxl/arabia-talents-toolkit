class YouTubeApiService {
  constructor() {
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    this.cache = {};
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  _getFromCache(key) {
    const cachedItem = this.cache[key];
    if (cachedItem && (Date.now() - cachedItem.timestamp < this.cacheDuration)) {
      return cachedItem.data;
    }
    return null;
  }

  _setCache(key, data) {
    this.cache[key] = {
      data: data,
      timestamp: Date.now()
    };
  }

  getApiKey() {
    return localStorage.getItem('youtube-api-key') || '';
  }

  extractVideoIdFromUrl(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const searchParams = urlObj.searchParams;
      const pathname = urlObj.pathname;

      if (hostname === 'www.youtube.com' || hostname === 'youtube.com') {
        if (pathname === '/watch') {
          return searchParams.get('v');
        }
        if (pathname.startsWith('/embed/')) {
          return pathname.substring('/embed/'.length).split('/')[0];
        }
        if (pathname.startsWith('/v/')) {
          return pathname.substring('/v/'.length).split('/')[0];
        }
      } else if (hostname === 'youtu.be') {
        return pathname.substring(1).split('/')[0];
      }
      return null;
    } catch (error) {
      console.error("Error extracting video ID:", error);
      return null;
    }
  }

  async makeRequest(endpoint, params = {}) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('YouTube API key is required. Please set it in the header.');
    }

    const url = new URL(`${this.baseUrl}/${endpoint}`);
    url.searchParams.append('key', apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  extractChannelId(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Handle /channel/ID format
      const channelParts = pathname.split('/channel/');
      if (channelParts.length > 1) {
        return channelParts[1].split('/')[0];
      }
      return null;
    } catch (error) {
      // Not a valid URL or other parsing error
      return null;
    }
  }

  /**
   * Resolves a YouTube channel ID from a URL or a direct ID string.
   * Handles direct IDs, /channel/ID URLs, /c/customName, /@handle, and /user/username URLs.
   * @param {string} urlOrId - The URL or ID of the YouTube channel.
   * @returns {Promise<string>} The resolved channel ID.
   * @throws {Error} If the channel ID cannot be resolved.
   */
  async resolveChannelId(urlOrId) {
    if (typeof urlOrId !== 'string' || !urlOrId.trim()) {
      throw new Error('Input must be a non-empty string (URL or Channel ID). Please provide a valid YouTube channel URL or ID.');
    }
    urlOrId = urlOrId.trim(); // Use the trimmed version for subsequent logic

    // 1. Check if it's a standard channel ID format
    if (/^UC[A-Za-z0-9_-]{22}$/.test(urlOrId) || /^HC[A-Za-z0-9_-]{22}$/.test(urlOrId)) {
      return urlOrId;
    }

    // 2. Try to extract from /channel/ID URL structure
    let channelId = this.extractChannelId(urlOrId);
    if (channelId) {
      return channelId;
    }

    // 3. Attempt to parse as a URL and resolve custom names/handles
    let identifier = null;
    let isHandle = false; // Flag for @handle style identifiers

    try {
      const urlObj = new URL(urlOrId); // This will throw if urlOrId is not a valid URL string
      const pathname = urlObj.pathname;

      if (pathname.startsWith('/c/')) {
        identifier = pathname.split('/c/')[1].split('/')[0];
      } else if (pathname.startsWith('/@')) {
        identifier = pathname.split('/@')[1].split('/')[0];
        isHandle = true;
      } else if (pathname.startsWith('/user/')) {
        identifier = pathname.split('/user/')[1].split('/')[0];
      } else {
        // Check if the path itself is a vanity name (e.g., youtube.com/VanityName)
        const pathParts = pathname.substring(1).split('/');
        if (pathParts.length === 1 && pathParts[0] && !['channel', 'watch', 'feed', 'playlist', 'results', 'embed'].includes(pathParts[0])) {
          identifier = pathParts[0];
        }
      }
    } catch (e) {
      // Not a full URL, treat urlOrId as a potential username, custom name, or handle directly
      if (!urlOrId.includes('/') && urlOrId.length > 0) {
        identifier = urlOrId;
        if (urlOrId.startsWith('@')) {
          identifier = urlOrId.substring(1);
          isHandle = true;
        }
      }
    }

    if (!identifier) {
      throw new Error('Could not extract a recognizable channel identifier from the input.');
    }

    // 4. Make API call
    // For handles (@name), the YouTube API doesn't have a direct `forHandle` in `channels.list`.
    // Handles usually resolve to the channel's canonical ID.
    // Sometimes, the handle *is* the channel ID (if it starts with UC...).
    // A common way to resolve handles if they are not channel IDs is via the search API.
    // However, `forUsername` can sometimes work for older custom URLs that look like handles.

    try {
      // Prioritize forUsername for non-handle-like identifiers or legacy custom URLs
      if (!isHandle) {
        const data = await this.makeRequest('channels', { part: 'id', forUsername: identifier });
        if (data.items && data.items.length > 0) {
          return data.items[0].id;
        }
      }
      
      // If it's a handle or forUsername failed, try search API
      // This is a more robust way for @handles if they don't directly map to forUsername
      const searchData = await this.makeRequest('search', {
        part: 'snippet', // << CHANGED HERE
        q: isHandle ? `@${identifier}` : identifier, // Search with @ prefix if it was a handle
        type: 'channel',
        maxResults: 1
      });

      if (searchData.items && searchData.items.length > 0 && searchData.items[0].snippet) { // << ADDED snippet CHECK
        // Verify if the found channel's snippet title or custom URL matches the identifier closely, if needed.
        // For now, assume the top result is correct.
        return searchData.items[0].snippet.channelId;
      }
      
      // As a last resort for handles, some handles (especially newer ones) might be the channel ID itself.
      // This is usually if the handle was chosen to be the same as an existing UC... ID, or if the system uses them interchangeably.
      // However, relying on this is risky. The initial check for UC... should cover this.
      // If the identifier starts with 'UC', it should have been caught by the first check.

    } catch (apiError) {
      console.error(`API error while resolving identifier "${identifier}":`, apiError);
      throw new Error(`Failed to resolve channel ID for "${identifier}" due to API error: ${apiError.message}`);
    }

    throw new Error(`Channel ID could not be resolved for identifier: "${identifier}". The channel may not exist or the identifier is incorrect.`);
  }

  // Keep existing getChannelIdFromCustomUrl for potential internal use or phase out.
  // For now, resolveChannelId is the primary public-facing method.
  async getChannelIdFromCustomUrl(url) {
    // This method can be deprecated or refactored if resolveChannelId covers all cases.
    // For now, keeping it to avoid breaking changes if it's used elsewhere, but its logic
    // should be considered secondary to resolveChannelId.
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      let username = null;

      if (pathname.includes('/c/')) {
        username = pathname.split('/c/')[1].split('/')[0];
      } else if (pathname.includes('/@')) {
        username = pathname.split('/@')[1].split('/')[0]; // Treat @handle as username for this specific legacy function
      } else if (pathname.includes('/user/')) {
        username = pathname.split('/user/')[1].split('/')[0];
      } else {
        // Try to extract if it's just youtube.com/name
        const parts = pathname.substring(1).split('/');
        if (parts.length === 1 && parts[0]) {
            username = parts[0];
        }
      }

      if (!username) {
        throw new Error('Could not extract username/custom name from URL for legacy lookup.');
      }
      
      // The 'forHandle' parameter is not standard. Use 'forUsername'.
      // If 'username' is actually an @handle, forUsername might not work.
      // Search API (as used in resolveChannelId) is better for @handles.
      const params = { part: 'id', forUsername: username };
      
      const data = await this.makeRequest('channels', params);
      
      if (data.items && data.items.length > 0) {
        return data.items[0].id;
      }
      
      // Fallback: if forUsername fails, and it looked like a handle, try searching
      if (url.includes('/@') || username.startsWith('@')) {
        const handle = username.startsWith('@') ? username : `@${username}`;
        const searchData = await this.makeRequest('search', { part: 'id', q: handle, type: 'channel', maxResults: 1 });
        if (searchData.items && searchData.items.length > 0) {
          return searchData.items[0].snippet.channelId;
        }
      }

      throw new Error('Channel not found using legacy custom URL lookup.');
    } catch (error) {
      // console.error("Error in getChannelIdFromCustomUrl:", error);
      throw new Error(`Could not resolve channel ID via getChannelIdFromCustomUrl: ${error.message}`);
    }
  }


  /**
   * Fetches detailed information for a given YouTube channel ID.
   * @param {string} channelId - The ID of the YouTube channel.
   * @returns {Promise<Object>} An object containing channel snippet, statistics, and branding settings.
   * @throws {Error} If the channel is not found or an API error occurs.
   */
  async getChannelInfo(channelId) {
    const cacheKey = `channelInfo_${channelId}`;
    const cachedData = this._getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const data = await this.makeRequest('channels', {
      part: 'snippet,statistics,brandingSettings',
      id: channelId
    });

    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found');
    }

    const channelData = data.items[0];
    this._setCache(cacheKey, channelData);
    return channelData;
  }

  /**
   * Finds channels related to a given channel ID.
   * It first tries to find a popular or recent video from the source channel,
   * then uses that video to find related channels.
   * Fallbacks to searching by channel title if a seed video cannot be obtained.
   * @param {string} channelId - The ID of the source YouTube channel.
   * @param {number} [count=10] - The desired number of related channels (5-50).
   * @returns {Promise<Array<Object>>} A list of related channel objects.
   * Each object contains id, title, description, thumbnails.
   * @throws {Error} If the source channel ID is invalid or other API errors occur.
   */
  async findRelatedChannels(sourceChannelId, count = 10) {
    if (!sourceChannelId) {
      throw new Error('Source channel ID is required to find related channels.');
    }
    count = Math.min(Math.max(count, 5), 50); // Clamp requested count

    const sourceVideoCount = 5; // Number of latest videos from source channel to analyze
    const relatedVideoCountPerSource = 10; // Number of related videos to fetch for each source video

    // 1. Fetch latest videos from the source channel
    let sourceVideos = [];
    try {
      const videoSearchData = await this.makeRequest('search', {
        part: 'snippet', // We need snippet for video.id.videoId
        channelId: sourceChannelId,
        type: 'video',
        order: 'date',
        maxResults: sourceVideoCount
      });
      if (videoSearchData.items && videoSearchData.items.length > 0) {
        sourceVideos = videoSearchData.items;
      } else {
        // If no videos by date, try by viewcount as a softer fallback before giving up on seed videos
        const videoSearchByViewData = await this.makeRequest('search', {
            part: 'snippet',
            channelId: sourceChannelId,
            type: 'video',
            order: 'viewCount',
            maxResults: sourceVideoCount
        });
        if (videoSearchByViewData.items && videoSearchByViewData.items.length > 0) {
            sourceVideos = videoSearchByViewData.items;
        } else {
            throw new Error('No recent public videos found for this channel to analyze for relatedness.');
        }
      }
    } catch (error) {
      console.error(`Error fetching source videos for channel ${sourceChannelId}:`, error);
      // Re-throw or throw a more specific error if this step is critical
      if (error.message.includes('No recent public videos found')) throw error;
      throw new Error(`Failed to fetch source videos: ${error.message}`);
    }

    if (sourceVideos.length === 0) { // Should be caught by the error above, but as a safeguard
      throw new Error('No public videos found for this channel to analyze for relatedness.');
    }

    // 2. Collect related channels from these videos
    const channelFrequencies = new Map();

    // Process requests for related videos in parallel for efficiency
    const relatedVideoPromises = sourceVideos.map(video => {
      if (!video.id?.videoId) { // Ensure videoId exists
          console.warn("Source video item missing videoId:", video);
          return Promise.resolve({ items: [] }); // Resolve with empty items if no ID
      }
      return this.makeRequest('search', {
        part: 'snippet', // Need snippet for relatedVideo.snippet.channelId
        relatedToVideoId: video.id.videoId,
        type: 'video', // Fetch related *videos* first, then extract their channel IDs
        maxResults: relatedVideoCountPerSource
      }).catch(err => {
        // Log error for individual related video search but don't let it stop others
        console.warn(`Error fetching related videos for videoId ${video.id.videoId}:`, err.message);
        return { items: [] }; // Return empty items on error for this specific video
      });
    });

    const allRelatedVideoResults = await Promise.all(relatedVideoPromises);

    for (const result of allRelatedVideoResults) {
      if (result && result.items) {
        for (const relatedVideo of result.items) {
          if (relatedVideo.snippet && relatedVideo.snippet.channelId) {
            const relatedChannelId = relatedVideo.snippet.channelId;
            if (relatedChannelId !== sourceChannelId) { // Don't count the source channel itself
              channelFrequencies.set(relatedChannelId, (channelFrequencies.get(relatedChannelId) || 0) + 1);
            }
          }
        }
      }
    }

    if (channelFrequencies.size === 0) {
      // No related channels found from any of the videos
      return [];
    }

    // 3. Format and sort results
    const sortedChannels = Array.from(channelFrequencies, ([id, frequency]) => ({ id, frequency }))
      .sort((a, b) => b.frequency - a.frequency);

    // 4. Return top N channels (or fewer if not enough unique channels were found)
    // The objects returned now are { id, frequency }. The previous version returned { id, title, description, thumbnails }.
    // The current LookalikeFinderPage.jsx expects the latter structure after enrichment.
    // This method should just return the IDs and frequencies, enrichment happens in the page component.
    return sortedChannels.slice(0, count);
  }

  async getVideoComments(videoId, maxResults = 100) {
    if (!videoId) {
      throw new Error('Video ID is required to fetch comments.');
    }

    let comments = [];
    let nextPageToken = null;
    const internalMaxResultsPerPage = 100; // YouTube API max per page

    do {
      const remainingResults = maxResults - comments.length;
      const resultsToFetch = Math.min(internalMaxResultsPerPage, remainingResults);

      if (resultsToFetch <= 0) break;

      const params = {
        part: 'snippet',
        videoId: videoId,
        maxResults: resultsToFetch,
        order: 'relevance', // as per "top 200 comments"
        pageToken: nextPageToken,
      };

      const data = await this.makeRequest('commentThreads', params);

      if (data.items) {
        data.items.forEach(item => {
          if (item.snippet && item.snippet.topLevelComment && item.snippet.topLevelComment.snippet) {
            comments.push({
              text: item.snippet.topLevelComment.snippet.textDisplay,
              authorChannelId: item.snippet.topLevelComment.snippet.authorChannelId?.value,
              // Potentially more fields like authorDisplayName, publishedAt, likeCount etc.
              // authorDisplayName: item.snippet.topLevelComment.snippet.authorDisplayName,
              // publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
              // likeCount: item.snippet.topLevelComment.snippet.likeCount,
            });
          }
        });
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken && comments.length < maxResults);

    return comments.slice(0, maxResults); // Ensure we don't return more than requested
  }

  async getChannelVideos(channelId, maxResults = 50) {
    const data = await this.makeRequest('search', {
      part: 'id',
      channelId: channelId,
      type: 'video',
      order: 'date',
      maxResults: Math.min(maxResults, 50)
    });

    return data.items || [];
  }

  async getVideoDetails(videoId) {
    const cacheKey = `videoDetails_${videoId}`;
    const cachedData = this._getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const data = await this.makeRequest('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoId
    });

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const videoData = data.items[0];
    this._setCache(cacheKey, videoData);
    return videoData;
  }

  async getMultipleVideoDetails(videoIds) {
    if (!videoIds || videoIds.length === 0) return [];

    const cacheKey = `multipleVideoDetails_${videoIds.join(',')}`;
    const cachedData = this._getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    // YouTube API allows up to 50 video IDs per request
    const chunks = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      chunks.push(videoIds.slice(i, i + 50));
    }

    const results = [];
    for (const chunk of chunks) {
      const data = await this.makeRequest('videos', {
        part: 'snippet,statistics,contentDetails',
        id: chunk.join(',')
      });
      
      if (data.items) {
        results.push(...data.items);
      }
    }

    this._setCache(cacheKey, results);
    return results;
  }

  async getTrendingVideos(regionCode, categoryId = '20', maxResults = 50) {
    const cacheKey = `trendingVideos_${regionCode}_${categoryId}_${maxResults}`;
    const cachedData = this._getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const data = await this.makeRequest('videos', {
      part: 'id,snippet,statistics',
      chart: 'mostPopular',
      regionCode: regionCode,
      videoCategoryId: categoryId,
      maxResults: Math.min(maxResults, 50)
    });

    const trendingData = data.items || [];
    this._setCache(cacheKey, trendingData);
    return trendingData;
  }

  async searchVideos(query, options = {}) {
    const params = {
      part: 'id,snippet',
      q: query,
      type: 'video',
      maxResults: options.maxResults || 25,
      order: options.order || 'relevance'
    };

    if (options.publishedAfter) {
      params.publishedAfter = options.publishedAfter;
    }

    if (options.regionCode) {
      params.regionCode = options.regionCode;
    }

    if (options.videoDuration) {
      params.videoDuration = options.videoDuration;
    }

    const data = await this.makeRequest('search', params);
    return data.items || [];
  }
}

const youtubeApiService = new YouTubeApiService();
// All public methods of YouTubeApiService are available on the youtubeApiService instance.
export default youtubeApiService;
