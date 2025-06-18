import React, { useState } from 'react';

const SummaryTabs = ({ summary }) => {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'chapters', 'highlights'

  // Assuming summary is an object with different aspects like:
  // summary.full: String
  // summary.chapters: Array of { title: String, startTime: Number, content: String }
  // summary.highlights: Array of { text: String, timestamp: Number }

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return <div className="p-4 bg-white rounded-lg shadow">{summary.full || 'No summary available.'}</div>;
      case 'chapters':
        return (
          <div className="space-y-4">
            {summary.chapters && summary.chapters.length > 0 ? (
              summary.chapters.map((chapter, index) => (
                <div key={index} className="p-4 bg-white rounded-lg shadow">
                  <h3 className="font-semibold text-lg mb-1">{chapter.title} ({(new Date(chapter.startTime * 1000).toISOString().substr(11, 8))})</h3>
                  <p>{chapter.content}</p>
                </div>
              ))
            ) : (
              <p className="p-4 bg-white rounded-lg shadow">No chapters available.</p>
            )}
          </div>
        );
      case 'highlights':
        return (
          <ul className="space-y-2">
            {summary.highlights && summary.highlights.length > 0 ? (
              summary.highlights.map((highlight, index) => (
                <li key={index} className="p-3 bg-white rounded-lg shadow flex items-start">
                  <span className="text-blue-500 font-semibold mr-2">▶</span>
                  <span>{highlight.text} ({(new Date(highlight.timestamp * 1000).toISOString().substr(11, 8))})</span>
                </li>
              ))
            ) : (
              <p className="p-4 bg-white rounded-lg shadow">No highlights available.</p>
            )}
          </ul>
        );
      default:
        return <div className="p-4">Select a tab.</div>;
    }
  };

  return (
    <div>
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Full Summary
          </button>
          <button
            onClick={() => setActiveTab('chapters')}
            className={`${
              activeTab === 'chapters'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Chapters
          </button>
          <button
            onClick={() => setActiveTab('highlights')}
            className={`${
              activeTab === 'highlights'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Key Highlights
          </button>
        </nav>
      </div>
      <div>{renderContent()}</div>
    </div>
  );
};

export default SummaryTabs;
