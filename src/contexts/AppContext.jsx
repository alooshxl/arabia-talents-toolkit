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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );

  const updateApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('youtube-api-key', key);
  };

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem('theme', themeName);

    // Update document class for the new theme
    const htmlElement = document.documentElement;
    // List all theme classes that might need to be removed
    const allThemeClasses = ['dark', 'blue', 'green', 'theme-purple', 'theme-orange', 'theme-teal', 'theme-crimson', 'theme-forest', 'theme-mono-gray'];
    htmlElement.classList.remove(...allThemeClasses);

    if (themeName !== 'light') { // 'light' theme doesn't add a class, it relies on default styles
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
    changeTheme
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

