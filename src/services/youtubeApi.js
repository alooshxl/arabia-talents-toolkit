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

    try { // New try block
      const response = await fetch(url);

      if (!response.ok) {
        // This handles API errors (e.g., 400, 403, 404)
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from API' }));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      // Try to parse JSON, this can also fail if response is not valid JSON
      return await response.json();
    } catch (error) { // New catch block
      // Log the error for server-side/dev visibility
      console.error('Error in makeRequest (network, JSON parsing, or API error):', error);
      // Re-throw the error to be handled by the calling component
      // If it's an error we've already processed (like from !response.ok), it will be rethrown.
      // If it's a new network error or JSON parsing error, it will be thrown.
      throw error;
    }
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

  // Method resolveChannelId removed.

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
        // Search API is better for @handles.
        // part: 'snippet' is needed to get snippet.channelId
        const searchData = await this.makeRequest('search', { part: 'snippet', q: handle, type: 'channel', maxResults: 1 });

        if (searchData.items && searchData.items.length > 0) {
          const item = searchData.items[0];
          // Safely access channelId
          if (item && item.snippet && typeof item.snippet.channelId === 'string') {
            return item.snippet.channelId;
          }
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
  // Method findRelatedChannels removed.

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
