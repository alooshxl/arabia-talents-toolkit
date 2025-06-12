import React from 'react';
import { useAppContext } from '../../contexts/AppContext';

const themes = [
  { name: 'Light', value: 'light' },
  { name: 'Dark', value: 'dark' },
  { name: 'Blue', value: 'blue' },
  { name: 'Green', value: 'green' },
];

export const ThemeSwitcher = () => {
  const { currentTheme, changeTheme } = useAppContext();

  const handleThemeChange = (event) => {
    changeTheme(event.target.value);
  };

  return (
    <div className="p-2">
      <label htmlFor="theme-select" className="sr-only">
        Select Theme
      </label>
      <select
        id="theme-select"
        value={currentTheme}
        onChange={handleThemeChange}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
      >
        {themes.map((theme) => (
          <option key={theme.value} value={theme.value}>
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );
};
