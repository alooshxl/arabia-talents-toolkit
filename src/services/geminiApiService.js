class GeminiApiService {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
  }

  // Method to make requests to the Gemini API
  async generateContent(apiKey, promptText) {
    if (!apiKey) {
      throw new Error('Gemini API key is required.');
    }
    if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
      throw new Error('Prompt text cannot be empty.');
    }

    const url = `${this.baseUrl}?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: promptText,
            },
          ],
        },
      ],
      // Optional: Add generationConfig if needed for specific controls
      // generationConfig: {
      //   temperature: 0.7,
      //   topK: 1,
      //   topP: 1,
      //   maxOutputTokens: 2048,
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
        return data.candidates[0].content.parts[0].text;
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
