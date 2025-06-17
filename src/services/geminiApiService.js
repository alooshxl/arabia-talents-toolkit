class GeminiApiService {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
  }

  // Method to make requests to the Gemini API
  async generateContent(apiKey, promptText, userBrief = null) {
    if (!apiKey) {
      throw new Error('Gemini API key is required.');
    }
    if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
      throw new Error('Prompt text cannot be empty.');
    }

    let finalPromptText = promptText;

    if (userBrief && userBrief.trim() !== '') {
      // Assuming promptText already contains Video Title and Description
      // as passed from VideoSummarizer.jsx
      finalPromptText = `Analyze the following YouTube video content based on its title and description. Also, consider the user's brief provided below.

${promptText}

User's Brief:
${userBrief}

Please provide the following:
1. Enhanced Summary: A detailed and comprehensive summary of the video.
2. Main Topics: List the main topics discussed.
3. Subtopics: List any relevant subtopics for each main topic.
4. Mentions: List any specific names, brands, or events mentioned.
5. Timeline: If discernible, provide a brief timeline of key moments (e.g., "0:00-1:30 - Introduction to X, 1:30-5:00 - Deep dive on Y").
6. Brief Comparison: Analyze how well the video content covers the points in the User's Brief. Explicitly state if it 'Successfully Covers', 'Partially Covers', or 'Misses' the key points, and briefly explain why.

Format your response clearly with distinct sections using the following markers:
Enhanced Summary:
[Detailed summary here]

Main Topics:
- [Topic 1]
- [Topic 2]

Subtopics:
- [Topic 1]: [Subtopic A, Subtopic B]
- [Topic 2]: [Subtopic C]

Mentions:
- [Name/Brand/Event 1]
- [Name/Brand/Event 2]

Timeline:
- [Timestamp range] - [Description]

Brief Comparison:
[Covers/Partially Covers/Misses]: [Explanation]`;
    }

    const url = `${this.baseUrl}?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: finalPromptText, // Use the potentially modified prompt
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
