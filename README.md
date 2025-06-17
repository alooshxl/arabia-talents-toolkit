# Project Title (You might want to update this)

This project includes various tools and features, including a helpful AI chatbot.

## Features

### AI Chatbot (Gemini Powered)

A multilingual chatbot is integrated to assist users with website tools and results.

**Configuration:**

To enable the chatbot, you need a Gemini API key. This key must be configured as an environment variable named `GEMINI_API_KEY` for the backend proxy service.

The backend proxy is located at `api/gemini-proxy.js` and handles secure communication with the Gemini API. Ensure this service has access to the `GEMINI_API_KEY` in its execution environment (e.g., serverless function configuration, .env file for local development if your framework supports it for functions).

**Functionality:**
- Understands and responds in English and Arabic.
- Can be toggled via a button on the screen.
- Helps users by answering questions about the website's content and tools.

## Development

(You can add details about running the project locally here)
