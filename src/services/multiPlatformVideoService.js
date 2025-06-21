class MultiPlatformVideoService {
  constructor() {
    this.apifyToken = 'apify_api_8hXuKXEo9WU8vIm333UzdeISV0migP0LyNPQ';
    this.apifyBase = 'https://api.apify.com/v2/acts';
  }

  detectPlatform(url) {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('tiktok.com')) return 'tiktok';
    if (lower.includes('instagram.com')) return 'instagram';
    if (lower.includes('facebook.com')) return 'facebook';
    return null;
  }

  async fetchYouTubeData(url, youtubeApiService) {
    try {
      const videoId = youtubeApiService.extractVideoIdFromUrl
        ? youtubeApiService.extractVideoIdFromUrl(url)
        : null;
      if (!videoId) throw new Error('Invalid YouTube URL');
      const video = await youtubeApiService.getVideoDetails(videoId);
      return {
        username: video.snippet.channelTitle,
        videoUrl: url,
        views: parseInt(video.statistics.viewCount || 0),
        likes: parseInt(video.statistics.likeCount || 0),
        comments: parseInt(video.statistics.commentCount || 0),
        duration: video.contentDetails.duration,
        publishDate: video.snippet.publishedAt
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  async fetchTikTokData(url) {
    try {
      const input = { url };
      const response = await fetch(`${this.apifyBase}/tiktok-video-scraper/run-sync-get-dataset-items?token=${this.apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) throw new Error('TikTok API error');
      const [data] = await response.json();
      if (!data) throw new Error('No TikTok data returned');
      return {
        username: data.author || data.username || data.authorName,
        videoUrl: url,
        views: parseInt(data.playCount || data.plays || 0),
        likes: parseInt(data.likes || data.diggCount || 0),
        comments: parseInt(data.comments || data.commentCount || 0),
        duration: data.duration || '',
        publishDate: data.createTime || data.date || data.publishedDate
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  async fetchInstagramData(url) {
    try {
      const input = { url };
      const response = await fetch(`${this.apifyBase}/instagram-reel-downloader/run-sync-get-dataset-items?token=${this.apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) throw new Error('Instagram API error');
      const [data] = await response.json();
      if (!data) throw new Error('No Instagram data returned');
      return {
        username: data.author || data.username || data.ownerUsername,
        videoUrl: url,
        views: parseInt(data.playCount || data.plays || 0),
        likes: parseInt(data.likes || data.likeCount || 0),
        comments: parseInt(data.comments || data.commentCount || 0),
        duration: data.duration || '',
        publishDate: data.date || data.taken_at_date || data.publishedDate
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  async fetchFacebookData(url) {
    try {
      const input = { url };
      const response = await fetch(`${this.apifyBase}/facebook-video-downloader/run-sync-get-dataset-items?token=${this.apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) throw new Error('Facebook API error');
      const [data] = await response.json();
      if (!data) throw new Error('No Facebook data returned');
      return {
        username: data.page || data.username || data.owner,
        videoUrl: url,
        views: parseInt(data.views || data.playCount || 0),
        likes: parseInt(data.likes || data.likeCount || 0),
        comments: parseInt(data.comments || data.commentCount || 0),
        duration: data.duration || '',
        publishDate: data.date || data.publishedDate
      };
    } catch (e) {
      return { error: e.message };
    }
  }
}

const multiPlatformVideoService = new MultiPlatformVideoService();
export default multiPlatformVideoService;
