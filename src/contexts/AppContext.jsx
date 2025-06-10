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
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('dark-mode') === 'true' || false
  );

  const updateApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('youtube-api-key', key);
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('dark-mode', newMode.toString());
    
    // Update document class for dark mode
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Initialize dark mode on load
  useState(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const value = {
    apiKey,
    updateApiKey,
    loading,
    setLoading,
    error,
    setError,
    darkMode,
    toggleDarkMode
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

