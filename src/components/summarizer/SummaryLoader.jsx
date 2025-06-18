import React from 'react';

const SummaryLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-lg font-semibold text-gray-700">
        Summarizing your video...
      </p>
      <p className="text-sm text-gray-500">
        This might take a few moments, especially for longer videos.
      </p>
    </div>
  );
};

export default SummaryLoader;
