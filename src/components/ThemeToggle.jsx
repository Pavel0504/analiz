import React from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ isDark, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-all duration-200 hover:scale-105 shadow-md"
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4" />
          Светлая
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          Темная
        </>
      )}
    </button>
  );
};

export default ThemeToggle;