/**
 * Format a number with commas (e.g., 1000 -> 1,000)
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
export const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format a date to a readable string
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube video URL
 * @returns {string|null} - Video ID or null if not found
 */
export const extractVideoId = (url) => {
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);
    
    // Handle different URL formats
    if (urlObj.hostname.includes('youtube.com')) {
      return searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.substring(1);
    }
    return null;
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
};

/**
 * Parse bulk input (multiple URLs, one per line)
 * @param {string} input - Bulk input text
 * @returns {Array<string>} - Array of URLs
 */
export const parseBulkInput = (input) => {
  if (!input) return [];
  return input
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
};

/**
 * Calculate average views from an array of videos
 * @param {Array<Object>} videos - Array of video objects
 * @returns {number} - Average views
 */
export const calculateAverageViews = (videos) => {
  if (!videos || videos.length === 0) return 0;
  const totalViews = videos.reduce((sum, video) => {
    const views = parseInt(video.statistics?.viewCount || 0);
    return sum + views;
  }, 0);
  return Math.round(totalViews / videos.length);
};

/**
 * Calculate days since a date
 * @param {string} dateString - ISO date string
 * @returns {number} - Number of days
 */
export const daysSince = (dateString) => {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if a date is within a specific number of days
 * @param {string} dateString - ISO date string
 * @param {number} days - Number of days
 * @returns {boolean} - True if within the specified days
 */
export const isWithinLastDays = (dateString, days) => {
  return daysSince(dateString) <= days;
};

/**
 * Check if a date is within a specific number of months
 * @param {string} dateString - ISO date string
 * @param {number} months - Number of months
 * @returns {boolean} - True if within the specified months
 */
export const isWithinLastMonths = (dateString, months) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const monthsAgo = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return date >= monthsAgo;
};

/**
 * Check if a date is within the last 30 days
 * @param {string} dateString - ISO date string
 * @returns {boolean} - True if within last 30 days
 */
export const isWithinLast30Days = (dateString) => {
  return isWithinLastDays(dateString, 30);
};

/**
 * Check if a date is within the current year
 * @param {string} dateString - ISO date string
 * @returns {boolean} - True if within current year
 */
export const isWithinCurrentYear = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  return date.getFullYear() === now.getFullYear();
};

/**
 * Filter videos by date range
 * @param {Array<Object>} videos - Array of video objects
 * @param {string} range - Date range ('30days', '3months', '12months', or '2025')
 * @returns {Array<Object>} - Filtered videos
 */
export const filterVideosByDateRange = (videos, range) => {
  if (!videos) return [];
  
  return videos.filter(video => {
    const publishDate = video.snippet?.publishedAt;
    if (range === '30days') {
      return isWithinLast30Days(publishDate);
    } else if (range === '3months') {
      return isWithinLastMonths(publishDate, 3);
    } else if (range === '12months') {
      return isWithinLastMonths(publishDate, 12);
    } else if (range === '2025') {
      return isWithinCurrentYear(publishDate);
    }
    return true;
  });
};

/**
 * Calculate engagement rate (likes + comments / views)
 * @param {Object} video - Video object
 * @returns {number} - Engagement rate as percentage
 */
export const calculateEngagementRate = (video) => {
  if (!video || !video.statistics) return 0;
  
  const views = parseInt(video.statistics.viewCount || 0);
  const likes = parseInt(video.statistics.likeCount || 0);
  const comments = parseInt(video.statistics.commentCount || 0);
  
  if (views === 0) return 0;
  
  return ((likes + comments) / views * 100).toFixed(2);
};

/**
 * Get YouTube thumbnail URL
 * @param {string} videoId - YouTube video ID
 * @param {string} quality - Thumbnail quality ('default', 'medium', 'high', 'standard', 'maxres')
 * @returns {string} - Thumbnail URL
 */
export const getYouTubeThumbnailUrl = (videoId, quality = 'medium') => {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
};

