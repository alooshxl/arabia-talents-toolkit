class YouTubeApiService {
  constructor() {
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
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
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Handle /channel/ID format
      if (pathname.includes('/channel/')) {
        return pathname.split('/channel/')[1].split('/')[0];
      }
      
      // Handle /c/name format
      if (pathname.includes('/c/')) {
        return null; // Need to resolve via API
      }
      
      // Handle /@handle format
      if (pathname.includes('/@')) {
        return null; // Need to resolve via API
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async getChannelIdFromCustomUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      let forUsername = null;
      let customUrl = null;
      
      if (pathname.includes('/c/')) {
        customUrl = pathname.split('/c/')[1].split('/')[0];
      } else if (pathname.includes('/@')) {
        customUrl = pathname.split('/@')[1].split('/')[0];
      } else if (pathname.includes('/user/')) {
        forUsername = pathname.split('/user/')[1].split('/')[0];
      }
      
      const params = {};
      if (forUsername) {
        params.forUsername = forUsername;
      } else if (customUrl) {
        params.forHandle = customUrl;
      }
      
      params.part = 'id';
      
      const data = await this.makeRequest('channels', params);
      
      if (data.items && data.items.length > 0) {
        return data.items[0].id;
      }
      
      throw new Error('Channel not found');
    } catch (error) {
      throw new Error(`Could not resolve channel ID: ${error.message}`);
    }
  }

  async getChannelInfo(channelId) {
    const data = await this.makeRequest('channels', {
      part: 'snippet,statistics,brandingSettings',
      id: channelId
    });

    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found');
    }

    return data.items[0];
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
    const data = await this.makeRequest('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoId
    });

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    return data.items[0];
  }

  async getMultipleVideoDetails(videoIds) {
    if (!videoIds || videoIds.length === 0) return [];
    
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

    return results;
  }

  async getTrendingVideos(regionCode, categoryId = '20', maxResults = 50) {
    const data = await this.makeRequest('videos', {
      part: 'id,snippet,statistics',
      chart: 'mostPopular',
      regionCode: regionCode,
      videoCategoryId: categoryId,
      maxResults: Math.min(maxResults, 50)
    });

    return data.items || [];
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
// Ensure new methods are implicitly part of the class instance
export default youtubeApiService;


