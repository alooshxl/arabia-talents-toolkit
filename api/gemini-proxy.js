// File: api/gemini-proxy.js
import fetch from 'node-fetch'; // Using import for modern JS syntax

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { messages } = req.body; // Expecting an array of {role: 'user'/'model', parts: [{text: '...'}]}
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Gemini API key is not configured on the server.');
    return res.status(500).json({ error: 'API key not configured. Please contact support.' });
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty messages array provided.' });
  }

  // System instruction to guide the chatbot
  const systemInstruction = "You are a helpful assistant for this website. Your primary goal is to help users understand the website's tools and interpret results. You must respond in the language the user uses (English or Arabic). Be concise and friendly.";

  // Construct the 'contents' for the Gemini API
  // The Gemini API expects alternating user and model roles.
  // Prepend system instruction to the first user message content, or as a separate model message if it's the very first turn.
  const processedMessages = messages.map((msg, index) => {
    if (index === 0 && msg.role === 'user') {
      return {
        ...msg,
        parts: [{ text: `${systemInstruction}

User: ${msg.parts[0].text}` }]
      };
    }
    return msg;
  });

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents: processedMessages }), // Send the processed messages
    });

    if (!geminiResponse.ok) {
      let errorData;
      try {
        errorData = await geminiResponse.json();
      } catch (e) {
        // If parsing error response fails, use status text
        errorData = { error: { message: `Gemini API request failed with status: ${geminiResponse.status} ${geminiResponse.statusText}` } };
      }
      console.error('Gemini API Error:', errorData);
      const errorMessage = errorData?.error?.message || `Gemini API request failed: ${geminiResponse.status}`;
      return res.status(geminiResponse.status || 500).json({ error: errorMessage });
    }

    const responseData = await geminiResponse.json();

    if (responseData.candidates && responseData.candidates[0] && responseData.candidates[0].content && responseData.candidates[0].content.parts && responseData.candidates[0].content.parts[0] && responseData.candidates[0].content.parts[0].text) {
      res.status(200).json({ reply: responseData.candidates[0].content.parts[0].text });
    } else {
      console.error('Unexpected Gemini API response structure:', responseData);
      res.status(500).json({ error: 'Failed to parse valid response from AI.' });
    }

  } catch (error) {
    console.error('Error calling Gemini API in proxy:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}
