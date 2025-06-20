class GeminiApiService {
  constructor() {
    // Model can be parameterized if needed in the future
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
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

  // Unified method to generate content based on a provided prompt
  async generateContent(apiKey, prompt, cacheKey = null) {
    if (!apiKey) {
      throw new Error('Gemini API key is required.');
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error('Prompt cannot be empty.');
    }

    const effectiveCacheKey = cacheKey || `gemini_prompt_hash:${this._hashString(prompt)}`; // Basic hash for prompt if no key
    const cachedData = this._getFromCache(effectiveCacheKey);
    if (cachedData) {
      console.log(`Returning cached Gemini response for key: ${effectiveCacheKey}`);
      return cachedData;
    }

    const url = `${this.baseUrl}?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      // Optional: Add generationConfig if needed for specific controls
      // generationConfig: {
      //   temperature: 0.7, // Example: Adjust creativity
      //   maxOutputTokens: 2048, // Example: Limit response length
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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `Gemini API request failed: ${response.status} ${response.statusText}`;
        console.error('Gemini API Error Data:', errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
        const responseData = data.candidates[0].content.parts[0].text;
        this._setCache(effectiveCacheKey, responseData);
        return responseData;
      } else if (data.promptFeedback && data.promptFeedback.blockReason) {
        // Handle cases where the prompt was blocked
        const blockReason = data.promptFeedback.blockReason;
        const safetyRatings = data.promptFeedback.safetyRatings || [];
        console.error(`Gemini prompt was blocked. Reason: ${blockReason}. Safety Ratings: ${JSON.stringify(safetyRatings)}`);
        throw new Error(`Prompt was blocked by Gemini due to: ${blockReason}. Please revise the prompt.`);
      } else {
        console.error('Unexpected Gemini API response structure:', data);
        throw new Error('Failed to extract content from Gemini API response or prompt was blocked without detailed feedback.');
      }

    } catch (error) {
      console.error('Error in generateContent:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`An unexpected error occurred while calling Gemini API: ${error.message || String(error)}`);
    }
  }

  // Simple hash function for creating cache keys from prompts
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `prompt_${hash}`;
  }
}

const geminiApiService = new GeminiApiService();
export default geminiApiService;
