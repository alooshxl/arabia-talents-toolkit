import React, { useState } from 'react';
import { भविष्यवाणी } from '../../utils/api'; // Assuming API function
import SummaryTabs from '../../components/summarizer/SummaryTabs';
import SummaryLoader from '../../components/summarizer/SummaryLoader'; // Optional: If you have a loader

const AIVideoSummarizer = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUrlChange = (event) => {
    setVideoUrl(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const response = await भविष्यवाणी.post('/summarize-video', { videoUrl });
      setSummary(response.data.summary);
    } catch (err) {
      setError(err.message || 'An error occurred while summarizing the video.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">AI Video Summarizer</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            placeholder="Enter YouTube Video URL"
            value={videoUrl}
            onChange={handleUrlChange}
            className="flex-grow p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50"
            disabled={isLoading || !videoUrl}
          >
            {isLoading ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>
      </form>

      {isLoading && <SummaryLoader />} {/* Optional Loader */}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {summary && !isLoading && (
        <SummaryTabs summary={summary} />
      )}
    </div>
  );
};

export default AIVideoSummarizer;
