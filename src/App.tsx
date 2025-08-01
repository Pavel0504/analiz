import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import LoginPage from './components/LoginPage';
import ThemeToggle from './components/ThemeToggle';
import { API_BASE_URL } from './config/api';

function App() {
  const [data, setData] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load data from API when authenticated
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/data`, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (response.ok) {
          const apiData = await response.json();
          setData(apiData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // Check theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
   
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  const handleThemeToggle = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
   
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleDataLoad = (newData) => {
    setData(newData);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <div className="mx-auto p-4 sm:p-6">
        {/* Theme Toggle in top right */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle isDark={isDarkMode} onToggle={handleThemeToggle} />
        </div>
       
        <Dashboard
          data={data}
          onShowUpload={() => setShowUploadModal(true)}
          onLogout={handleLogout}
        />
        <FileUpload
          onDataLoaded={handleDataLoad}
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
        />
      </div>
    </div>
  );
}

export default App;