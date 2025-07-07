import React, { useState, useEffect } from 'react';
import { 
  Archive, Download, Upload, Trash2, Calendar, 
  FileText, ArrowLeft, RefreshCw, Clock, User,
  Database, History, ChevronDown, ChevronUp, TrendingUp,
  Plus, Settings, LogOut
} from 'lucide-react';

const BackupPage = ({ onBack }) => {
  const [backupHistory, setBackupHistory] = useState([]);
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    expenses: true,
    uploads: true,
    backups: false
  });

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    try {
      // Load expense history from localStorage
      const expenseHistoryData = JSON.parse(localStorage.getItem('expenses') || '[]');
      setExpenseHistory(expenseHistoryData);

      // Load upload history from localStorage
      const uploadHistoryData = JSON.parse(localStorage.getItem('uploadHistory') || '[]');
      setUploadHistory(uploadHistoryData);

      // Load backup history from localStorage
      const backupHistoryData = JSON.parse(localStorage.getItem('backupHistory') || '[]');
      setBackupHistory(backupHistoryData);
    } catch (error) {
      console.error('Error loading backup data:', error);
    }
  };

  const createBackup = () => {
    try {
      const currentData = {
        dashboardData: JSON.parse(localStorage.getItem('dashboardData') || '[]'),
        expenses: JSON.parse(localStorage.getItem('expenses') || '[]'),
        parseData: JSON.parse(localStorage.getItem('parseData') || '[]'),
        timestamp: new Date().toISOString(),
        id: Date.now()
      };

      const newBackup = {
        id: currentData.id,
        timestamp: currentData.timestamp,
        action: 'manual_backup',
        summary: {
          dashboardRecords: currentData.dashboardData.length,
          expenseRecords: currentData.expenses.length,
          parseRecords: currentData.parseData.length,
          totalSize: JSON.stringify(currentData).length
        }
      };

      // Save backup data
      localStorage.setItem(`backup_${currentData.id}`, JSON.stringify({
        dashboardData: currentData.dashboardData,
        expenses: currentData.expenses,
        parseData: currentData.parseData
      }));
      
      // Update backup history
      const updatedHistory = [newBackup, ...backupHistory].slice(0, 50); // Keep last 50 backups
      setBackupHistory(updatedHistory);
      localStorage.setItem('backupHistory', JSON.stringify(updatedHistory));

      alert('Бэкап успешно создан!');
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Ошибка при создании бэкапа');
    }
  };

  const downloadBackup = (backupId) => {
    try {
      const backupData = localStorage.getItem(`backup_${backupId}`);
      if (!backupData) {
        alert('Бэкап не найден');
        return;
      }

      const parsedData = JSON.parse(backupData);
      
      // Create a comprehensive backup file
      const backupFile = {
        metadata: {
          backupId: backupId,
          timestamp: new Date(parseInt(backupId)).toISOString(),
          version: '1.0',
          description: 'Полный бэкап системы'
        },
        data: parsedData
      };

      const blob = new Blob([JSON.stringify(backupFile, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date(parseInt(backupId)).toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading backup:', error);
      alert('Ошибка при скачивании бэкапа');
    }
  };

  const restoreBackup = (backupId) => {
    if (!confirm('Вы уверены, что хотите восстановить данные из этого бэкапа? Текущие данные будут перезаписаны.')) {
      return;
    }

    try {
      const backupData = JSON.parse(localStorage.getItem(`backup_${backupId}`));
      if (!backupData) {
        alert('Бэкап не найден');
        return;
      }

      // Restore all data
      if (backupData.dashboardData) {
        localStorage.setItem('dashboardData', JSON.stringify(backupData.dashboardData));
      }
      if (backupData.expenses) {
        localStorage.setItem('expenses', JSON.stringify(backupData.expenses));
      }
      if (backupData.parseData) {
        localStorage.setItem('parseData', JSON.stringify(backupData.parseData));
      }

      alert('Данные успешно восстановлены из бэкапа!');
      window.location.reload(); // Reload to apply changes
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Ошибка при восстановлении бэкапа');
    }
  };

  const deleteBackup = (backupId) => {
    if (!confirm('Вы уверены, что хотите удалить этот бэкап?')) {
      return;
    }

    try {
      localStorage.removeItem(`backup_${backupId}`);
      const updatedHistory = backupHistory.filter(backup => backup.id !== backupId);
      setBackupHistory(updatedHistory);
      localStorage.setItem('backupHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('Ошибка при удалении бэкапа');
    }
  };

  const downloadExpenseHistory = () => {
    try {
      const data = JSON.stringify(expenseHistory, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading expense history:', error);
      alert('Ошибка при скачивании истории расходов');
    }
  };

  const downloadUploadHistory = () => {
    try {
      const data = JSON.stringify(uploadHistory, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upload_history_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading upload history:', error);
      alert('Ошибка при скачивании истории загрузок');
    }
  };

  const downloadDashboardData = () => {
    try {
      const dashboardData = JSON.parse(localStorage.getItem('dashboardData') || '[]');
      const data = JSON.stringify(dashboardData, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading dashboard data:', error);
      alert('Ошибка при скачивании данных дашборда');
    }
  };

  const downloadParseData = () => {
    try {
      const parseData = JSON.parse(localStorage.getItem('parseData') || '[]');
      const data = JSON.stringify(parseData, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parse_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading parse data:', error);
      alert('Ошибка при скачивании данных парсинга');
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getActionName = (action) => {
    const actionNames = {
      'manual_backup': 'Ручной бэкап',
      'data_update': 'Обновление данных',
      'expense_added': 'Добавлен расход',
      'expense_updated': 'Изменен расход',
      'expense_deleted': 'Удален расход',
      'file_upload': 'Загрузка файла'
    };
    return actionNames[action] || action;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 pb-20 sm:pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                  <div className="bg-orange-500 p-2 rounded-lg">
                    <Archive className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
                  </div>
                  Управление бэкапами
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  История изменений, бэкапы и восстановление данных
                </p>
              </div>
            </div>
            
            {/* Desktop controls */}
            <div className="hidden sm:flex gap-3">
              <button
                onClick={createBackup}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md"
              >
                <Database className="w-4 h-4" />
                <span className="hidden sm:inline">Создать бэкап</span>
                <span className="sm:hidden">Бэкап</span>
              </button>
              <button
                onClick={loadBackupData}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Обновить</span>
              </button>
            </div>
          </div>
          
          {/* Mobile controls - positioned under title */}
          <div className="sm:hidden flex gap-2">
            <button
              onClick={createBackup}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md flex-1"
            >
              <Database className="w-4 h-4" />
              Создать бэкап
            </button>
            <button
              onClick={loadBackupData}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md flex-1"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
          </div>
        </div>

        {/* Current Data Files Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Текущие файлы данных
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Скачать отдельные файлы данных
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">Расходы</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">expenses.json</p>
                  </div>
                  <button
                    onClick={downloadExpenseHistory}
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {expenseHistory.length} записей
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">Данные дашборда</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">dashboardData.json</p>
                  </div>
                  <button
                    onClick={downloadDashboardData}
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {JSON.parse(localStorage.getItem('dashboardData') || '[]').length} записей
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">Данные парсинга</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">parseData.json</p>
                  </div>
                  <button
                    onClick={downloadParseData}
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {JSON.parse(localStorage.getItem('parseData') || '[]').length} записей
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload History Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
          <div 
            className="p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
            onClick={() => toggleSection('uploads')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    История загрузок
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {uploadHistory.length} файлов
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadUploadHistory();
                  }}
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                {expandedSections.uploads ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          </div>
          
          {expandedSections.uploads && (
            <div className="p-4">
              {uploadHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">История загрузок пуста</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {uploadHistory.slice(0, 10).map((upload, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {upload.filename || 'Неизвестный файл'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {upload.timestamp ? new Date(upload.timestamp).toLocaleString('ru-RU') : 'Неизвестная дата'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800 dark:text-gray-200">
                          {upload.recordCount || 0} записей
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(upload.fileSize || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Backup History Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div 
            className="p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
            onClick={() => toggleSection('backups')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-2 rounded-lg">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Бэкапы системы
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {backupHistory.length} бэкапов
                  </p>
                </div>
              </div>
              {expandedSections.backups ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>
          
          {expandedSections.backups && (
            <div className="p-4">
              {backupHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Database className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">Нет созданных бэкапов</p>
                  <button
                    onClick={createBackup}
                    className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Создать первый бэкап
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {backupHistory.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {getActionName(backup.action)} - {new Date(backup.timestamp).toLocaleString('ru-RU')}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {backup.summary?.dashboardRecords || 0} данных • {backup.summary?.expenseRecords || 0} расходов • {backup.summary?.parseRecords || 0} парсинга • {formatFileSize(backup.summary?.totalSize || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadBackup(backup.id)}
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          title="Скачать бэкап"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => restoreBackup(backup.id)}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          title="Восстановить из бэкапа"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteBackup(backup.id)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Удалить бэкап"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:hidden z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          <button 
            onClick={onBack}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs">Главная</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400">
            <Upload className="w-5 h-5" />
            <span className="text-xs">Данные</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400">
            <Plus className="w-5 h-5" />
            <span className="text-xs">Расход</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-blue-500">
            <Archive className="w-5 h-5" />
            <span className="text-xs">Бэкап</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400">
            <Settings className="w-5 h-5" />
            <span className="text-xs">Настройки</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupPage;