import { createContext, useContext, useState, useEffect } from 'react';

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
  const [currentTheme, setCurrentTheme] = useState('light');

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

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', themeName);
    }

    if (typeof document !== 'undefined') {
      // Update document class for the new theme
      const htmlElement = document.documentElement;
      // List all theme classes that might need to be removed
      const allThemeClasses = [
        'dark',
        'blue',
        'green',
        'theme-purple',
        'theme-orange',
        'theme-teal',
        'theme-crimson',
        'theme-forest',
        'theme-mono-gray',
      ];
      htmlElement.classList.remove(...allThemeClasses);

      if (themeName !== 'light') {
        // 'light' theme doesn't add a class, it relies on default styles
        htmlElement.classList.add(themeName);
      }
    }
  };

  // Initialize theme on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'light';
      changeTheme(savedTheme);
    }
  }, []);

  const value = {
    youtubeApiKey: apiKey,
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

