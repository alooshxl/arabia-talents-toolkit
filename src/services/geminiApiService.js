class GeminiApiService {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    this.cache = {};
    this.cacheDuration = 60 * 60 * 1000; // 1 hour
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

  // Method to make requests to the Gemini API
  async generateContent(apiKey, videoDetailsText) { // userBrief parameter removed
    if (!apiKey) {
      throw new Error('Gemini API key is required.');
    }
    if (!videoDetailsText || typeof videoDetailsText !== 'string' || videoDetailsText.trim() === '') {
      // videoDetailsText is expected to contain "Title: ..." and "Description: ..."
      throw new Error('Video details text cannot be empty.');
    }

    const cacheKey = `geminiSummary_${videoDetailsText}`;
    const cachedData = this._getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // New prompt structure
    const finalPromptText = `You are an assistant that analyzes YouTube videos. Based on the following video title and description, generate a comprehensive and highly detailed summary of the video's content. Do not suggest alternative titles. Your task is only to summarize.

Provide the summary in two languages:
1. English summary
2. Arabic summary

${videoDetailsText}

Summarize with as much detail as possible from the provided text, ensuring all key points and supporting information are included. The summary should be thorough and exhaustive. Do not include suggestions, headlines, or anything unrelated to the summary itself.`;

    const url = `${this.baseUrl}?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: finalPromptText,
            },
          ],
        },
      ],
      // Optional: Add generationConfig if needed for specific controls
      // generationConfig: {
      //   temperature: 0.7,
      //   topK: 1,
      //   topP: 1,
      //   maxOutputTokens: 2048, // Consider if this needs adjustment for dual language summaries
      // },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to parse error, default to empty object
        const errorMessage = errorData?.error?.message || `Gemini API request failed: ${response.status} ${response.statusText}`;
        console.error('Gemini API Error Data:', errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Basic validation of expected response structure
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
        const responseData = data.candidates[0].content.parts[0].text;
        this._setCache(cacheKey, responseData);
        return responseData;
      } else {
        console.error('Unexpected Gemini API response structure:', data);
        throw new Error('Failed to extract content from Gemini API response.');
      }

    } catch (error) {
      console.error('Error in generateContent:', error);
      // Re-throw the error so it can be caught by the caller
      // If it's already an Error object, no need to create a new one unless adding more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`An unexpected error occurred while calling Gemini API: ${error.message || error}`);
    }
  }
}

const geminiApiService = new GeminiApiService();
export default geminiApiService;
