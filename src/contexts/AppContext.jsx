import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('youtube-api-key') || '');
  const [geminiApiKey, setGeminiApiKeyState] = useState(localStorage.getItem('gemini-api-key') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );

  const updateApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('youtube-api-key', key);
  };

  const setGeminiApiKey = (key) => {
    setGeminiApiKeyState(key);
    localStorage.setItem('gemini-api-key', key);
  };

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem('theme', themeName);

    // Update document class for the new theme
    const htmlElement = document.documentElement;
    htmlElement.classList.remove('dark', 'blue', 'green'); // Remove all possible theme classes
    if (themeName !== 'light') {
      htmlElement.classList.add(themeName);
    }
  };

  // Initialize theme on load
  useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    if (savedTheme !== 'light') {
      document.documentElement.classList.add(savedTheme);
    }
  }, []);

  const value = {
    apiKey,
    updateApiKey,
    loading,
    setLoading,
    error,
    setError,
    currentTheme,
    changeTheme,
    geminiApiKey,
    setGeminiApiKey
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

