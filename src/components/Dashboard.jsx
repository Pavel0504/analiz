import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, FunnelChart, Funnel, Cell, PieChart, Pie,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Filter, Download, RefreshCw, TrendingUp, Users, Target,
  Calendar, Plus, Edit3, Trash2, BarChart3, Activity, Upload,
  Settings, ChevronUp, ChevronDown, X, Check, LogOut, Copy,
  Clock, ChevronLeft, ChevronRight, Archive
} from 'lucide-react';

const Dashboard = ({ data: propData, onShowUpload, onLogout, onShowBackup }) => {
  const [data, setData] = useState(propData || []);

  // Comparison state
  const [comparisons, setComparisons] = useState([{
    id: 0,
    name: 'Основной анализ',
    filters: {
      sources: [],
      operators: [],
      statuses: [],
      whoMeasured: []
    },
    dateRange: {
      startDate: '2024-01-01',
      endDate: '2025-12-31'
    }
  }]);
  const [currentComparisonIndex, setCurrentComparisonIndex] = useState(0);

  const [expenses, setExpenses] = useState([]);

  const [expenseForm, setExpenseForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    source: '',
    amount: '',
    description: ''
  });

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Layout management states
  const [isLayoutMode, setIsLayoutMode] = useState(false);

  // Default layout order
  const defaultLayout = [
    'header',
    'comparison',
    'filters',
    'metrics',
    'salesFunnel',
    'sourceDistribution',
    'operatorPerformance',
    'expensesTrend',
    'expenseDetails'
  ];

  const [layoutOrder, setLayoutOrder] = useState(() => {
    const saved = localStorage.getItem('dashboardLayout');
    return saved ? JSON.parse(saved) : defaultLayout;
  });

  const [tempLayoutOrder, setTempLayoutOrder] = useState(layoutOrder);

  // Filter and metrics ordering states
  const defaultFilterOrder = ['sources', 'operators', 'statuses', 'whoMeasured'];
  const defaultMetricsOrder = ['total', 'measurements', 'contracts', 'inProgress', 'refusals', 'conversionRate', 'costPerLead', 'roi'];

  const [filterOrder, setFilterOrder] = useState(() => {
    const saved = localStorage.getItem('dashboardFilterOrder');
    return saved ? JSON.parse(saved) : defaultFilterOrder;
  });

  const [metricsOrder, setMetricsOrder] = useState(() => {
    const saved = localStorage.getItem('dashboardMetricsOrder');
    return saved ? JSON.parse(saved) : defaultMetricsOrder;
  });

  const [tempFilterOrder, setTempFilterOrder] = useState(filterOrder);
  const [tempMetricsOrder, setTempMetricsOrder] = useState(metricsOrder);

  // Expanded metrics state
  const [expandedMetrics, setExpandedMetrics] = useState({});

  // Chart interaction states
  const [selectedFunnelStage, setSelectedFunnelStage] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);

  // Storage utility functions
  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  };

  const cleanupOldBackups = () => {
    try {
      const backupHistory = JSON.parse(localStorage.getItem('backupHistory') || '[]');

      // Remove old backup data files
      const keysToRemove = [];
      for (let key in localStorage) {
        if (key.startsWith('backup_')) {
          const backupId = key.replace('backup_', '');
          const exists = backupHistory.some(backup => backup.id.toString() === backupId);
          if (!exists) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Keep only last 10 backups instead of 50
      if (backupHistory.length > 10) {
        const toRemove = backupHistory.slice(10);
        toRemove.forEach(backup => {
          localStorage.removeItem(`backup_${backup.id}`);
        });
        
        const updatedHistory = backupHistory.slice(0, 10);
        localStorage.setItem('backupHistory', JSON.stringify(updatedHistory));
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  };

  const safeSetItem = (key, value) => {
    try {
      // Check storage size before saving
      const currentSize = getStorageSize();
      const newDataSize = JSON.stringify(value).length;

      // If storage is getting full (>4MB), cleanup old data
      if (currentSize + newDataSize > 4 * 1024 * 1024) {
        cleanupOldBackups();
      }
      
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, attempting cleanup...');
        
        // Emergency cleanup
        cleanupOldBackups();
        
        // Try to remove some old data
        const keysToCheck = ['parseData', 'backupHistory'];
        for (const keyToCheck of keysToCheck) {
          try {
            localStorage.removeItem(keyToCheck);
            localStorage.setItem(key, JSON.stringify(value));
            return true;
          } catch (retryError) {
            continue;
          }
        }
        
        console.error('Unable to save data due to storage limitations');
        alert('Хранилище переполнено. Некоторые данные могут не сохраниться. Рекомендуется создать резервную копию и очистить старые данные.');
        return false;
      }
      console.error('Error saving to localStorage:', error);
      return false;
    }
  };

  // Get current comparison
  const currentComparison = comparisons[currentComparisonIndex];
  const filters = currentComparison?.filters || {
    sources: [],
    operators: [],
    statuses: [],
    whoMeasured: []
  };
  const dateRange = currentComparison?.dateRange || {
    startDate: '2024-01-01',
    endDate: '2025-12-31'
  };

  // Update data when propData changes
  useEffect(() => {
    if (propData && propData.length > 0) {
      setData(propData);
      // Save data with error handling
      safeSetItem('dashboardData', propData);
      // Save backup when data changes
      saveDataBackup(propData, 'data_update');
    }
  }, [propData]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem('dashboardData');
        if (savedData && (!propData || propData.length === 0)) {
          const parsedData = JSON.parse(savedData);
          setData(parsedData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    const loadExpenses = () => {
      try {
        const savedExpenses = localStorage.getItem('expenses');
        if (savedExpenses) {
          const parsedExpenses = JSON.parse(savedExpenses);
          setExpenses(parsedExpenses);
        }
      } catch (error) {
        console.error('Error loading expenses:', error);
      }
    };

    loadData();
    loadExpenses();
  }, [propData]);

  // Backup system functions
  const saveDataBackup = useCallback((newData, action = 'manual') => {
    try {
      const currentExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      const currentParseData = JSON.parse(localStorage.getItem('parseData') || '[]');

      const backupEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: action,
        data: {
          dashboardData: newData || data,
          expenses: currentExpenses,
          parseData: currentParseData
        },
        summary: {
          dashboardRecords: (newData || data).length,
          expenseRecords: currentExpenses.length,
          parseRecords: currentParseData.length,
          totalSize: JSON.stringify({
            dashboardData: newData || data,
            expenses: currentExpenses,
            parseData: currentParseData
          }).length
        }
      };

      // Save backup data with error handling
      const backupSaved = safeSetItem(`backup_${backupEntry.id}`, backupEntry.data);
      
      if (backupSaved) {
        // Update backup history
        const backupHistory = JSON.parse(localStorage.getItem('backupHistory') || '[]');
        const updatedHistory = [backupEntry, ...backupHistory].slice(0, 10); // Keep only 10 backups
        safeSetItem('backupHistory', updatedHistory);
        console.log('Backup saved:', backupEntry.id);
      }
    } catch (error) {
      console.error('Error saving backup:', error);
    }
  }, [data]);

  const saveExpenseBackup = useCallback((newExpenses, action = 'expense_update') => {
    try {
      const currentData = JSON.parse(localStorage.getItem('dashboardData') || '[]');
      const currentParseData = JSON.parse(localStorage.getItem('parseData') || '[]');

      const backupEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: action,
        data: {
          dashboardData: currentData,
          expenses: newExpenses,
          parseData: currentParseData
        },
        summary: {
          dashboardRecords: currentData.length,
          expenseRecords: newExpenses.length,
          parseRecords: currentParseData.length,
          totalSize: JSON.stringify({
            dashboardData: currentData,
            expenses: newExpenses,
            parseData: currentParseData
          }).length
        }
      };

      // Save backup data with error handling
      const backupSaved = safeSetItem(`backup_${backupEntry.id}`, backupEntry.data);
      
      if (backupSaved) {
        // Update backup history
        const backupHistory = JSON.parse(localStorage.getItem('backupHistory') || '[]');
        const updatedHistory = [backupEntry, ...backupHistory].slice(0, 10);
        safeSetItem('backupHistory', updatedHistory);
        console.log('Expense backup saved:', backupEntry.id);
      }
    } catch (error) {
      console.error('Error saving expense backup:', error);
    }
  }, []);

  // Comparison management functions
  const addComparison = () => {
    const newComparison = {
      id: Date.now(),
      name: `Сравнение ${comparisons.length}`,
      filters: {
        sources: [],
        operators: [],
        statuses: [],
        whoMeasured: []
      },
      dateRange: {
        startDate: '2024-01-01',
        endDate: '2025-12-31'
      }
    };
    setComparisons(prev => [...prev, newComparison]);
    setCurrentComparisonIndex(comparisons.length);
  };

  const removeComparison = (index) => {
    if (index === 0 || comparisons.length <= 1) return;

    const newComparisons = comparisons.filter((_, i) => i !== index);
    setComparisons(newComparisons);

    // Adjust current index if necessary
    if (currentComparisonIndex >= newComparisons.length) {
      setCurrentComparisonIndex(newComparisons.length - 1);
    } else if (currentComparisonIndex > index) {
      setCurrentComparisonIndex(currentComparisonIndex - 1);
    }
  };

  const updateComparison = (index, updates) => {
    setComparisons(prev => prev.map((comp, i) =>
      i === index
        ? { ...comp, ...updates }
        : comp
    ));
  };

  // Layout management functions
  const handleLayoutModeToggle = () => {
    if (isLayoutMode) {
      setTempLayoutOrder(layoutOrder);
      setTempFilterOrder(filterOrder);
      setTempMetricsOrder(metricsOrder);
    } else {
      setTempLayoutOrder(layoutOrder);
      setTempFilterOrder(filterOrder);
      setTempMetricsOrder(metricsOrder);
    }
    setIsLayoutMode(!isLayoutMode);
  };

  const saveLayout = () => {
    setLayoutOrder(tempLayoutOrder);
    setFilterOrder(tempFilterOrder);
    setMetricsOrder(tempMetricsOrder);
    safeSetItem('dashboardLayout', tempLayoutOrder);
    safeSetItem('dashboardFilterOrder', tempFilterOrder);
    safeSetItem('dashboardMetricsOrder', tempMetricsOrder);
    setIsLayoutMode(false);
  };

  const cancelLayout = () => {
    setTempLayoutOrder(layoutOrder);
    setTempFilterOrder(filterOrder);
    setTempMetricsOrder(metricsOrder);
    setIsLayoutMode(false);
  };

  const moveBlockUp = (blockId) => {
    const currentIndex = tempLayoutOrder.indexOf(blockId);
    if (currentIndex > 0) {
      const newOrder = [...tempLayoutOrder];
      [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
      setTempLayoutOrder(newOrder);
    }
  };

  const moveBlockDown = (blockId) => {
    const currentIndex = tempLayoutOrder.indexOf(blockId);
    if (currentIndex < tempLayoutOrder.length - 1) {
      const newOrder = [...tempLayoutOrder];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      setTempLayoutOrder(newOrder);
    }
  };

  // Filter ordering functions
  const moveFilterUp = (filterId) => {
    const currentIndex = tempFilterOrder.indexOf(filterId);
    if (currentIndex > 0) {
      const newOrder = [...tempFilterOrder];
      [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
      setTempFilterOrder(newOrder);
    }
  };

  const moveFilterDown = (filterId) => {
    const currentIndex = tempFilterOrder.indexOf(filterId);
    if (currentIndex < tempFilterOrder.length - 1) {
      const newOrder = [...tempFilterOrder];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      setTempFilterOrder(newOrder);
    }
  };

  // Metrics ordering functions
  const moveMetricUp = (metricId) => {
    const currentIndex = tempMetricsOrder.indexOf(metricId);
    if (currentIndex > 0) {
      const newOrder = [...tempMetricsOrder];
      [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
      setTempMetricsOrder(newOrder);
    }
  };

  const moveMetricDown = (metricId) => {
    const currentIndex = tempMetricsOrder.indexOf(metricId);
    if (currentIndex < tempMetricsOrder.length - 1) {
      const newOrder = [...tempMetricsOrder];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      setTempMetricsOrder(newOrder);
    }
  };

  // Expense management functions
  const addExpense = useCallback(async () => {
    if (!expenseForm.amount || !expenseForm.description || !expenseForm.source) return;

    const newExpense = {
      id: Date.now(),
      startDate: expenseForm.startDate,
      endDate: expenseForm.endDate,
      source: expenseForm.source,
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description
    };

    const updatedExpenses = [...expenses, newExpense];

    try {
      // Save to localStorage with error handling
      const saved = safeSetItem('expenses', updatedExpenses);
      if (saved) {
        setExpenses(updatedExpenses);
        
        // Save backup
        saveExpenseBackup(updatedExpenses, 'expense_added');
        
        setExpenseForm({
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          source: '',
          amount: '',
          description: ''
        });
        setShowExpenseForm(false);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  }, [expenseForm, expenses, saveExpenseBackup]);

  const updateExpense = useCallback(async () => {
    if (!expenseForm.amount || !expenseForm.description || !expenseForm.source) return;

    const updatedExpenses = expenses.map(expense =>
      expense.id === editingExpense.id
        ? { ...expense, ...expenseForm, amount: parseFloat(expenseForm.amount) }
        : expense
    );

    try {
      // Save to localStorage with error handling
      const saved = safeSetItem('expenses', updatedExpenses);
      if (saved) {
        setExpenses(updatedExpenses);
        
        // Save backup
        saveExpenseBackup(updatedExpenses, 'expense_updated');
        
        setEditingExpense(null);
        setShowExpenseForm(false);
      }
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  }, [expenseForm, editingExpense, expenses, saveExpenseBackup]);

  const deleteExpense = useCallback(async (id) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== id);

    try {
      // Save to localStorage with error handling
      const saved = safeSetItem('expenses', updatedExpenses);
      if (saved) {
        setExpenses(updatedExpenses);
        
        // Save backup
        saveExpenseBackup(updatedExpenses, 'expense_deleted');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  }, [expenses, saveExpenseBackup]);

  const startEditExpense = useCallback((expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      startDate: expense.startDate,
      endDate: expense.endDate,
      source: expense.source,
      amount: expense.amount.toString(),
      description: expense.description
    });
    setShowExpenseForm(true);
  }, []);

  // Get date range from data
  const getDateRangeFromData = useCallback(() => {
    if (data.length === 0) {
      return {
        startDate: '2024-01-01',
        // тут возвращаем сегодня
        endDate: new Date().toISOString().split('T')[0]
      };
    }

    // Вычисляем самую раннюю дату, как раньше
    const validDates = data
      .map(item => parseDate(item.applicationDate))
      .filter(d => d)
      .sort((a, b) => a - b);

    if (!validDates.length) {
      return {
        startDate: '2024-01-01',
        endDate: new Date().toISOString().split('T')[0]
      };
    }

    const earliestDate = validDates[0];
    // Форматируем сегодняшнюю дату:
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      startDate: earliestDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }, [data]);

  // Initialize date range when data changes
  useEffect(() => {
    if (data.length > 0) {
      const autoDateRange = getDateRangeFromData();
      updateComparison(currentComparisonIndex, {
        dateRange: autoDateRange
      });
    }
  }, [data, getDateRangeFromData, currentComparisonIndex]);

  // Apply date filter function
  const applyDateFilter = useCallback(() => {
    // Force re-calculation of filtered data
    console.log('Применение фильтра по датам:', dateRange);

    // This will trigger re-calculation of filteredData through useMemo dependency
    updateComparison(currentComparisonIndex, { 
      dateRange: { ...dateRange }
    });
  }, [dateRange, currentComparisonIndex]);

  // Улучшенная функция парсинга даты
  const parseDate = (dateStr) => {
    if (!dateStr || dateStr === 'Не указано' || dateStr.trim() === '') {
      return null;
    }

    try {
      // Маппинг русских месяцев в индексы для Date
      const months = {
        'января': 0,   'февраля': 1, 'марта': 2,   'апреля': 3,
        'мая': 4,      'июня': 5,     'июля': 6,     'августа': 7,
        'сентября': 8, 'октября': 9,  'ноября': 10,  'декабря': 11
      };

      // 1) Русский формат "5 Июня 2025 г. ..." — берём только день, месяц, год
      const rus = dateStr.match(/(\d{1,2})\s+([А-Яа-яёЁ]+)\s+(\d{4})/);
      if (rus) {
        const [, dayStr, monthName, yearStr] = rus;
        const day   = Number(dayStr);
        const month = months[monthName.toLowerCase()];
        const year  = Number(yearStr);
        if (month != null) {
          const d = new Date(year, month, day);
          // Обнуляем время — оставляем полночь
          d.setHours(0, 0, 0, 0);
          return d;
        }
      }

      // 2) Формат "DD.MM.YYYY"
      const dot = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (dot) {
        const [, dStr, mStr, yStr] = dot;
        const d = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
        d.setHours(0, 0, 0, 0);
        return d;
      }

      // 3) ISO-формат "YYYY-MM-DD" или "YYYY/MM/DD"
      const iso = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (iso) {
        const [, yStr, mStr, dStr] = iso;
        const d = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
        d.setHours(0, 0, 0, 0);
        return d;
      }

      // Если ни один формат не подошёл — возвращаем null
      return null;
    } catch (e) {
      console.error('Date parsing error:', dateStr, e);
      return null;
    }
  };

  const uniqueValues = useMemo(() => {
    return {
      sources: [...new Set(data.map(item => item.source))],
      operators: [...new Set(data.map(item => item.operator))],
      statuses: [...new Set(data.map(item => item.status))],
      whoMeasured: [...new Set(data.map(item => item.whoMeasured || 'Не указано').filter(Boolean))]
    };
  }, [data]);

  const getFilteredData = useCallback((comparisonFilters, comparisonDateRange) => {
    console.log('Filtering data with date range:', comparisonDateRange);
    console.log('Total data items:', data.length);

    return data.filter(item => {
      const itemDate = parseDate(item.applicationDate);
      if (!itemDate) {
        console.log('Filtered out - invalid date:', item.applicationDate);
        return false;
      }

      const startDate = new Date(comparisonDateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      // Создаём конец дня для endDate (23:59:59.999)
      const endDate = new Date(comparisonDateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      // Включаем все от startDate (00:00) до endDate (23:59:59.999)
      if (itemDate < startDate || itemDate > endDate) {
        console.log(
          'Filtered out by date:',
          item.applicationDate, itemDate,
          'not in range',
          startDate, 'to', endDate
        );
        return false;
      }

      // остальные фильтры
      const sourceMatch = !comparisonFilters.sources.length || comparisonFilters.sources.includes(item.source);
      const operatorMatch = !comparisonFilters.operators.length || comparisonFilters.operators.includes(item.operator);
      const statusMatch = !comparisonFilters.statuses.length || comparisonFilters.statuses.includes(item.status);
      const whoMeasuredMatch = !comparisonFilters.whoMeasured.length || comparisonFilters.whoMeasured.includes(item.whoMeasured);

      return sourceMatch && operatorMatch && statusMatch && whoMeasuredMatch;
    });
  }, [data]);

  const filteredData = useMemo(() => {
    return getFilteredData(filters, dateRange);
  }, [getFilteredData, filters, dateRange]);

  // Обновленная фильтрация расходов с учетом источников
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Проверяем попадание в диапазон дат
      const expenseStartDate = new Date(expense.startDate);
      const expenseEndDate = new Date(expense.endDate);
      const filterStartDate = new Date(dateRange.startDate);
      const filterEndDate = new Date(dateRange.endDate);

      // Проверяем пересечение периодов
      const dateMatch = expenseStartDate <= filterEndDate && expenseEndDate >= filterStartDate;
      
      if (!dateMatch) return false;

      // Проверяем фильтр по источникам
      // Если источники не выбраны (показываем все) или выбран источник расхода
      const sourceMatch = !filters.sources.length || filters.sources.includes(expense.source);
      
      return sourceMatch;
    });
  }, [expenses, dateRange, filters.sources]);

  const totalBudget = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  const handleFilterChange = useCallback((filterType, value, checked) => {
    const newFilters = {
      ...filters,
      [filterType]: checked
        ? [...filters[filterType], value]
        : filters[filterType].filter(item => item !== value)
    };
    updateComparison(currentComparisonIndex, { filters: newFilters });
  }, [filters, currentComparisonIndex]);

  const clearFilters = useCallback(() => {
    updateComparison(currentComparisonIndex, {
      filters: {
        sources: [],
        operators: [],
        statuses: [],
        whoMeasured: []
      }
    });
  }, [currentComparisonIndex]);

  // Calculate funnel data based on image logic
  const getFunnelData = useCallback((comparisonData, comparisonBudget) => {
    const total = comparisonData.length;
    
    // Назначен замер: все статусы содержащие "Замер", "Договор", "Дожать (был замер)"
    const measurements = comparisonData.filter(item => {
      if (!item.status) return false;
      const status = item.status.toLowerCase();
      return status.includes('замер') || 
             status.includes('договор') || 
             status.includes('дожать (был замер)');
    }).length;
    
    const contracts = comparisonData.filter(item => item.status === 'Договор').length;

    // Calculate cost per lead for each stage
    const costPerTotal = total > 0 ? Math.round(comparisonBudget / total) : 0;
    const costPerMeasurement = measurements > 0 ? Math.round(comparisonBudget / measurements) : 0;
    const costPerContract = contracts > 0 ? Math.round(comparisonBudget / contracts) : 0;

    return [
      { 
        name: 'Заявок', 
        value: total, 
        fill: '#EF4444',
        cost: costPerTotal,
        percentage: 100
      },
      { 
        name: 'Замеров', 
        value: measurements, 
        fill: '#3B82F6',
        cost: costPerMeasurement,
        percentage: total > 0 ? Math.round((measurements / total) * 100) : 0
      },
      { 
        name: 'Договоров', 
        value: contracts, 
        fill: '#10B981',
        cost: costPerContract,
        percentage: measurements > 0 ? Math.round((contracts / measurements) * 100) : 0
      }
    ].filter(item => item.value > 0);
  }, []);

  const funnelData = useMemo(() => {
    return getFunnelData(filteredData, totalBudget);
  }, [getFunnelData, filteredData, totalBudget]);

  const operatorData = useMemo(() => {
    const operatorStats = {};
    filteredData.forEach(item => {
      if (!operatorStats[item.operator]) {
        operatorStats[item.operator] = {
          name: item.operator,
          total: 0,
          contracts: 0,
          refusals: 0
        };
      }
      operatorStats[item.operator].total++;
      if (item.status === 'Договор') operatorStats[item.operator].contracts++;
      if (item.status === 'Отказ') operatorStats[item.operator].refusals++;
    });

    return Object.values(operatorStats);
  }, [filteredData]);

  const expensesTrendData = useMemo(() => {
    const monthlyExpenses = {};
    filteredExpenses.forEach(expense => {
      const month = expense.startDate.substring(0, 7);
      if (!monthlyExpenses[month]) {
        monthlyExpenses[month] = {
          month,
          total: 0,
          [expense.source]: 0
        };
      }
      monthlyExpenses[month].total += expense.amount;
      monthlyExpenses[month][expense.source] = (monthlyExpenses[month][expense.source] || 0) + expense.amount;
    });

    return Object.values(monthlyExpenses).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredExpenses]);

  const getSourceData = useCallback((comparisonData) => {
    const sourceStats = {};
    comparisonData.forEach(item => {
      if (!sourceStats[item.source]) {
        sourceStats[item.source] = { name: item.source, count: 0 };
      }
      sourceStats[item.source].count++;
    });

    return Object.values(sourceStats);
  }, []);

  const sourceData = useMemo(() => {
    return getSourceData(filteredData);
  }, [getSourceData, filteredData]);

  const getMetrics = useCallback((comparisonData, comparisonBudget) => {
    const total = comparisonData.length;
    
    // Назначен замер: все статусы содержащие "Замер", "Договор", "Дожать (был замер)"
    const measurements = comparisonData.filter(item => {
      if (!item.status) return false;
      const status = item.status.toLowerCase();
      return status.includes('замер') || 
             status.includes('договор') || 
             status.includes('дожать (был замер)');
    }).length;
    
    const contracts = comparisonData.filter(item => item.status === 'Договор').length;

    // В работе: 👍Созвон до замера ВАЖНО, ❓Созвон до замера, недозвон, Замер, Дожать (был замер)
    const inProgressItems = comparisonData.filter(item => {
      if (!item.status) return false;
      const status = item.status.toLowerCase();
      return status.includes('👍созвон до замера важно') ||
             status.includes('❓созвон до замера') ||
             status.includes('недозвон') ||
             status.includes('замер') ||
             status.includes('дожать (был замер)');
    });

    const inProgress = inProgressItems.length;
    
    // Детализация "В работе" для расширенной информации
    const callBeforeMeasurement = comparisonData.filter(item => 
      item.status && item.status.includes('❓Созвон до замера')
    ).length;
    const callBeforeMeasurementImportant = comparisonData.filter(item => 
      item.status && item.status.includes('👍Созвон до замера ВАЖНО')
    ).length;
    const pushAfterMeasurement = comparisonData.filter(item => 
      item.status && item.status.includes('Дожать (был замер)')
    ).length;
    const nedozvon = comparisonData.filter(item => 
      item.status && item.status.toLowerCase().includes('недозвон')
    ).length;
    const measurementInProgress = comparisonData.filter(item => {
      if (!item.status) return false;
      const status = item.status.toLowerCase();
      // Замер, но не "Дожать (был замер)" - это отдельная категория
      return status.includes('замер') && !status.includes('дожать (был замер)');
    }).length;

    const refusals = comparisonData.filter(item => item.status === 'Отказ').length;
    const conversionRate = total > 0 ? (contracts / total * 100).toFixed(1) : 0;
    const costPerLead = total > 0 ? (comparisonBudget / total).toFixed(0) : 0;

    let roi = 0;
    if (comparisonBudget > 0 && contracts > 0) {
      const revenue = contracts * 50000;
      roi = ((revenue - comparisonBudget) / comparisonBudget * 100).toFixed(1);
    } else if (comparisonBudget === 0 && contracts > 0) {
      roi = 'none';
    } else {
      roi = 0;
    }

    return {
      total,
      measurements,
      contracts,
      inProgress,
      refusals,
      conversionRate,
      costPerLead,
      roi,
      // Детализация "В работе"
      callBeforeMeasurement,
      callBeforeMeasurementImportant,
      pushAfterMeasurement,
      nedozvon,
      measurementInProgress
    };
  }, []);

  const metrics = useMemo(() => {
    return getMetrics(filteredData, totalBudget);
  }, [getMetrics, filteredData, totalBudget]);

  // Custom Tooltip component for Pie Chart
  const CustomPieTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = sourceData.reduce((sum, item) => sum + item.count, 0);
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;

      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800 dark:text-gray-200">{`Источник: ${data.payload.name}`}</p>
          <p className="text-blue-600 dark:text-blue-400">{`Заявок: ${data.value}`}</p>
          <p className="text-gray-600 dark:text-gray-400">{`Доля: ${percentage}%`}</p>
        </div>
      );
    }
    return null;
  };

  // Custom Funnel Tooltip
  const CustomFunnelTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800 dark:text-gray-200">{data.name}: {data.value}</p>
          <p className="text-blue-600 dark:text-blue-400">Цена: {data.cost}₽</p>
          <p className="text-gray-600 dark:text-gray-400">Конверсия: {data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  // Toggle metric expansion
  const toggleMetricExpansion = (metricId) => {
    setExpandedMetrics(prev => ({
      ...prev,
      [metricId]: !prev[metricId]
    }));
  };

  // Block wrapper component with arrow controls
  const LayoutBlock = ({ id, children, className = "" }) => {
    const currentIndex = tempLayoutOrder.indexOf(id);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === tempLayoutOrder.length - 1;

    return (
      <div className={`${className} ${isLayoutMode ? 'relative' : ''} transition-all duration-200`}>
        {isLayoutMode && (
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                moveBlockUp(id);
              }}
              disabled={isFirst}
              className={`p-2 rounded-lg shadow-lg transition-all ${
                isFirst 
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-110'
              }`}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                moveBlockDown(id);
              }}
              disabled={isLast}
              className={`p-2 rounded-lg shadow-lg transition-all ${
                isLast 
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-110'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    );
  };

  // Filter item component with internal controls
  const FilterItem = ({ filterType, values, index, comparisonIndex = currentComparisonIndex }) => {
    const isFirst = index === 0;
    const isLast = index === tempFilterOrder.length - 1;
    const comparison = comparisons[comparisonIndex];
    const comparisonFilters = comparison?.filters || {
      sources: [],
      operators: [],
      statuses: [],
      whoMeasured: []
    };

    const filterNames = {
      sources: 'Источники',
      operators: 'Операторы', 
      statuses: 'Статусы',
      whoMeasured: 'Кто замерял'
    };

    const handleComparisonFilterChange = (filterType, value, checked) => {
      const newFilters = {
        ...comparisonFilters,
        [filterType]: checked
          ? [...comparisonFilters[filterType], value]
          : comparisonFilters[filterType].filter(item => item !== value)
      };
      updateComparison(comparisonIndex, { filters: newFilters });
    };

    return (
      <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 ${isLayoutMode ? 'relative' : ''}`}>
        {isLayoutMode && (
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                moveFilterUp(filterType);
              }}
              disabled={isFirst}
              className={`p-1 rounded shadow-md transition-all ${
                isFirst 
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600 text-white hover:scale-110'
              }`}
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                moveFilterDown(filterType);
              }}
              disabled={isLast}
              className={`p-1 rounded shadow-md transition-all ${
                isLast 
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600 text-white hover:scale-110'
              }`}
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        )}
        <h2 className="font-semibold mb-3 text-gray-700 dark:text-gray-300 capitalize flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {filterNames[filterType]}
        </h2>
        <div className="max-h-32 overflow-y-auto space-y-2">
          {values.map(value => (
            <label key={value} className="flex items-center gap-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={comparisonFilters[filterType].includes(value)}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleComparisonFilterChange(filterType, value, e.target.checked);
                }}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
              />
              <span className="truncate flex-1 text-gray-700 dark:text-gray-300">{value}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  // Metric item component with internal controls and expansion
  const MetricItem = ({ metricId, index, comparisonIndex = currentComparisonIndex, isComparison = false }) => {
    const isFirst = index === 0;
    const isLast = index === tempMetricsOrder.length - 1;
    const isExpanded = expandedMetrics[`${metricId}_${comparisonIndex}`];

    const comparison = comparisons[comparisonIndex];
    const comparisonData = getFilteredData(comparison?.filters || {
      sources: [],
      operators: [],
      statuses: [],
      whoMeasured: []
    }, comparison?.dateRange || {
      startDate: '2024-01-01',
      endDate: '2025-12-31'
    });
    const comparisonBudget = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const comparisonMetrics = getMetrics(comparisonData, comparisonBudget);

    const metricConfigs = {
      total: {
        label: 'Всего заявок',
        value: comparisonMetrics.total,
        gradient: 'from-blue-500 to-blue-600',
        textColor: 'text-blue-100',
        expandedInfo: {
          costPerLead: `${comparisonMetrics.costPerLead}₽`,
          totalBudget: `${comparisonBudget.toLocaleString()}₽`,
          conversion: comparisonMetrics.total > 0 ? `${((comparisonMetrics.contracts / comparisonMetrics.total) * 100).toFixed(1)}%` : '0%'
        }
      },
      measurements: {
        label: 'Назначен замер',
        value: comparisonMetrics.measurements,
        gradient: 'from-purple-500 to-purple-600',
        textColor: 'text-purple-100',
        expandedInfo: {
          costPerLead: comparisonMetrics.measurements > 0 ? `${Math.round(comparisonBudget / comparisonMetrics.measurements)}₽` : '0₽',
          totalBudget: `${comparisonBudget.toLocaleString()}₽`,
          conversion: comparisonMetrics.total > 0 ? `${((comparisonMetrics.measurements / comparisonMetrics.total) * 100).toFixed(1)}%` : '0%'
        }
      },
      contracts: {
        label: 'Договоры',
        value: comparisonMetrics.contracts,
        gradient: 'from-green-500 to-green-600',
        textColor: 'text-green-100',
        expandedInfo: {
          costPerLead: comparisonMetrics.contracts > 0 ? `${Math.round(comparisonBudget / comparisonMetrics.contracts)}₽` : '0₽',
          totalBudget: `${comparisonBudget.toLocaleString()}₽`,
          conversion: comparisonMetrics.measurements > 0 ? `${((comparisonMetrics.contracts / comparisonMetrics.measurements) * 100).toFixed(1)}%` : '0%'
        }
      },
      inProgress: {
        label: 'В работе',
        value: comparisonMetrics.inProgress,
        gradient: 'from-yellow-500 to-yellow-600',
        textColor: 'text-yellow-100',
        expandedInfo: {
          'Созвон до замера': comparisonMetrics.callBeforeMeasurement,
          'Созвон до замера важно': comparisonMetrics.callBeforeMeasurementImportant,
          'Дожать был замер': comparisonMetrics.pushAfterMeasurement,
          'Недозвон': comparisonMetrics.nedozvon,
          'Замер в процессе': comparisonMetrics.measurementInProgress
        }
      },
      refusals: {
        label: 'Отказы',
        value: comparisonMetrics.refusals,
        gradient: 'from-red-500 to-red-600',
        textColor: 'text-red-100'
      },
      conversionRate: {
        label: 'Конверсия',
        value: `${comparisonMetrics.conversionRate}%`,
        gradient: 'from-purple-500 to-purple-600',
        textColor: 'text-purple-100'
      },
      costPerLead: {
        label: 'Цена лида',
        value: `${comparisonMetrics.costPerLead}₽`,
        gradient: 'from-orange-500 to-orange-600',
        textColor: 'text-orange-100'
      },
      roi: {
        label: 'ROI',
        value: typeof comparisonMetrics.roi === 'string' ? comparisonMetrics.roi : `${comparisonMetrics.roi}%`,
        gradient: 'from-indigo-500 to-indigo-600',
        textColor: 'text-indigo-100'
      }
    };

    const config = metricConfigs[metricId];
    const canExpand = ['total', 'measurements', 'contracts', 'inProgress'].includes(metricId);

    return (
      <div className="relative">
        <div 
          className={`bg-gradient-to-br ${config.gradient} p-4 rounded-lg text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${isLayoutMode ? 'relative' : ''} ${canExpand ? 'cursor-pointer' : ''}`}
          onClick={canExpand ? (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMetricExpansion(`${metricId}_${comparisonIndex}`);
          } : undefined}
        >
          {isLayoutMode && !isComparison && (
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveMetricUp(metricId);
                }}
                disabled={isFirst}
                className={`p-1 rounded shadow-md transition-all ${
                  isFirst 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white hover:scale-110'
                }`}
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveMetricDown(metricId);
                }}
                disabled={isLast}
                className={`p-1 rounded shadow-md transition-all ${
                  isLast 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white hover:scale-110'
                }`}
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={`${config.textColor} text-sm`}>{config.label}</p>
              <p className="text-2xl font-bold">{config.value}</p>
            </div>
            <div className="flex items-center gap-2">
              {canExpand && (
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              )}
            </div>
          </div>
        </div>

        {/* Expanded info overlay - positioned absolutely outside the card */}
        {isExpanded && config.expandedInfo && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-4 z-[9999]">
            <div className="space-y-2">
              {Object.entries(config.expandedInfo).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                    {key === 'costPerLead' ? 'Цена за лид:' : 
                     key === 'totalBudget' ? 'Общий расход:' : 
                     key === 'conversion' ? 'Конверсия:' : 
                     key}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 pb-20 sm:pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">Нет данных для анализа</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Загрузите данные для начала работы с аналитикой</p>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShowUpload();
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 shadow-md inline-flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Загрузить данные
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:hidden z-50">
          <div className="grid grid-cols-6 gap-1 p-2">
            <button className="flex flex-col items-center gap-1 p-2 text-blue-500">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs">Главная</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShowUpload();
              }}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
            >
              <Upload className="w-5 h-5" />
              <span className="text-xs">Данные</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowExpenseForm(true);
              }}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">Расход</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShowBackup();
              }}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
            >
              <Archive className="w-5 h-5" />
              <span className="text-xs">Бэкап</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLayoutModeToggle();
              }}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">Настройки</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLogout();
              }}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs">Выход</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render blocks based on layout order
  const renderBlock = (blockId) => {
    switch (blockId) {
      case 'header':
        return (
          <LayoutBlock key="header" id="header" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="hidden sm:flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onShowUpload();
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Загрузить данные</span>
                  <span className="sm:hidden">Данные</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowExpenseForm(true);
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Добавить расход</span>
                  <span className="sm:hidden">Расход</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onShowBackup();
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm"
                >
                  <Archive className="w-4 h-4" />
                  <span className="hidden sm:inline">Бэкап</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLayoutModeToggle();
                  }}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm ${
                    isLayoutMode
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">{isLayoutMode ? 'Режим настройки' : 'Параметры'}</span>
                  <span className="sm:hidden">Настр.</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearFilters();
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Очистить фильтры</span>
                  <span className="sm:hidden">Очистить</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLogout();
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Выход</span>
                </button>
              </div>
            </div>

            {/* Layout mode controls */}
            {isLayoutMode && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <div>
                      <span className="font-medium text-orange-800 dark:text-orange-300">Режим настройки макета</span>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Используйте кнопки ↑↓ для изменения порядка блоков и элементов</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        saveLayout();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <Check className="w-4 h-4" />
                      Сохранить
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelLayout();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      Отменить
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Date Range Selector */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Период анализа
              </h3>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">С:</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateComparison(currentComparisonIndex, { 
                        dateRange: { ...dateRange, startDate: e.target.value }
                      });
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">По:</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateComparison(currentComparisonIndex, { 
                        dateRange: { ...dateRange, endDate: e.target.value }
                      });
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    applyDateFilter();
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-all duration-200 hover:scale-105"
                >
                  Применить
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateComparison(currentComparisonIndex, {
                      dateRange: {
                        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                        endDate: new Date().toISOString().split('T')[0]
                      }
                    });
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all duration-200 hover:scale-105"
                >
                  Текущий месяц
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const autoDateRange = getDateRangeFromData();
                    updateComparison(currentComparisonIndex, { 
                      dateRange: autoDateRange
                    });
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-all duration-200 hover:scale-105"
                >
                  Весь период
                </button>
              </div>
            </div>

            {/* Budget Overview */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                Управление расходами
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Общие расходы</div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-700 dark:text-orange-400">{totalBudget.toLocaleString()}₽</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Количество записей</div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-700 dark:text-orange-400">{filteredExpenses.length}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Средний расход</div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {filteredExpenses.length > 0 ? (totalBudget / filteredExpenses.length).toFixed(0) : 0}₽
                  </div>
                </div>
              </div>
            </div>
          </LayoutBlock>
        );

      case 'comparison':
        return (
          <LayoutBlock key="comparison" id="comparison">
            {comparisons.length > 1 ? (
              <div className="space-y-4">
                {/* Comparison Controls */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                      Сравнение анализов ({comparisons.length})
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addComparison();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Добавить
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comparison Grid - Mobile responsive */}
                <div className="overflow-x-auto">
                  <div className="flex flex-col lg:flex-row gap-4 min-w-max lg:min-w-0">
                    {comparisons.map((comparison, index) => (
                      <div 
                        key={comparison.id} 
                        className="w-full lg:w-[38vw] flex-shrink-0 space-y-4"
                      >
                        {/* Comparison Header */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-700 dark:text-gray-300">
                              {comparison.name}
                            </h4>
                            {index > 0 && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeComparison(index);
                                }}
                                className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Filters for this comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(isLayoutMode ? tempFilterOrder : filterOrder).map((filterType, filterIndex) => (
                            <FilterItem 
                              key={`${filterType}_${index}`}
                              filterType={filterType} 
                              values={uniqueValues[filterType]} 
                              index={filterIndex}
                              comparisonIndex={index}
                            />
                          ))}
                        </div>

                        {/* Metrics for this comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(isLayoutMode ? tempMetricsOrder : metricsOrder).map((metricId, metricIndex) => (
                            <MetricItem 
                              key={`${metricId}_${index}`}
                              metricId={metricId} 
                              index={metricIndex}
                              comparisonIndex={index}
                              isComparison={true}
                            />
                          ))}
                        </div>

                        {/* Sales Funnel for this comparison */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
                          <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <div className="w-2 h-6 bg-blue-500 rounded"></div>
                            Воронка продаж
                          </h2>
                          <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1">
                              <ResponsiveContainer width="100%" height={300}>
                                <FunnelChart>
                                  <Funnel
                                    dataKey="value"
                                    data={getFunnelData(getFilteredData(comparison.filters, comparison.dateRange), totalBudget)}
                                    isAnimationActive
                                    animationDuration={1000}
                                  >
                                    {getFunnelData(getFilteredData(comparison.filters, comparison.dateRange), totalBudget).map((entry, entryIndex) => (
                                      <Cell key={`cell-${entryIndex}`} fill={entry.fill} />
                                    ))}
                                  </Funnel>
                                  <Tooltip content={<CustomFunnelTooltip />} />
                                </FunnelChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="lg:w-1/3">
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {getFunnelData(getFilteredData(comparison.filters, comparison.dateRange), totalBudget).map((stage, stageIndex) => (
                                  <div
                                    key={stageIndex}
                                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                                      selectedFunnelStage === stageIndex
                                        ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedFunnelStage(selectedFunnelStage === stageIndex ? null : stageIndex);
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-4 h-4 rounded-full" 
                                        style={{ backgroundColor: stage.fill }}
                                      ></div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-800 dark:text-gray-200">
                                          {stage.name}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                          {stage.value} • {stage.cost}₽ • {stage.percentage}%
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                    Основной анализ
                  </h3>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addComparison();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Сравнить
                  </button>
                </div>
              </div>
            )}
          </LayoutBlock>
        );

      case 'filters':
        if (comparisons.length > 1) return null;
        return (
          <LayoutBlock key="filters" id="filters" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(isLayoutMode ? tempFilterOrder : filterOrder).map((filterType, index) => (
              <FilterItem 
                key={filterType} 
                filterType={filterType} 
                values={uniqueValues[filterType]} 
                index={index}
              />
            ))}
          </LayoutBlock>
        );

      case 'metrics':
        if (comparisons.length > 1) return null;
        return (
          <LayoutBlock key="metrics" id="metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(isLayoutMode ? tempMetricsOrder : metricsOrder).map((metricId, index) => (
              <MetricItem key={metricId} metricId={metricId} index={index} />
            ))}
          </LayoutBlock>
        );

      case 'salesFunnel':
        if (comparisons.length > 1) return null;
        return (
          <LayoutBlock key="salesFunnel" id="salesFunnel" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <div className="w-2 h-6 bg-blue-500 rounded"></div>
              Воронка продаж
            </h2>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={400}>
                  <FunnelChart>
                    <Funnel
                      dataKey="value"
                      data={funnelData}
                      isAnimationActive
                      animationDuration={1000}
                    >
                      {funnelData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={selectedFunnelStage === index ? '#FFD700' : entry.fill}
                          stroke={selectedFunnelStage === index ? '#FF6B35' : 'none'}
                          strokeWidth={selectedFunnelStage === index ? 3 : 0}
                        />
                      ))}
                    </Funnel>
                    <Tooltip content={<CustomFunnelTooltip />} />
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
              <div className="lg:w-1/3">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {funnelData.map((stage, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedFunnelStage === index
                          ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedFunnelStage(selectedFunnelStage === index ? null : index);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: stage.fill }}
                        ></div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {stage.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {stage.value} • {stage.cost}₽ • {stage.percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </LayoutBlock>
        );

      case 'sourceDistribution':
        return (
          <LayoutBlock key="sourceDistribution" id="sourceDistribution" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <div className="w-2 h-6 bg-green-500 rounded"></div>
              Распределение по источникам
            </h2>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="count"
                      isAnimationActive
                      animationDuration={1000}
                      label={false}
                    >
                      {sourceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={selectedSource === index ? '#FFD700' : `hsl(${index * 60 + 200}, 70%, 60%)`}
                          stroke={selectedSource === index ? '#FF6B35' : 'none'}
                          strokeWidth={selectedSource === index ? 3 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="lg:w-1/3">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sourceData.map((source, index) => {
                    const total = sourceData.reduce((sum, item) => sum + item.count, 0);
                    const percentage = total > 0 ? ((source.count / total) * 100).toFixed(1) : 0;
                    
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedSource === index
                            ? 'bg-green-100 dark:bg-green-900 border-2 border-green-500'
                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedSource(selectedSource === index ? null : index);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: `hsl(${index * 60 + 200}, 70%, 60%)` }}
                          ></div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {source.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {source.count} заявок • {percentage}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </LayoutBlock>
        );

      case 'operatorPerformance':
        return (
          <LayoutBlock key="operatorPerformance" id="operatorPerformance" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <div className="w-2 h-6 bg-purple-500 rounded"></div>
              Эффективность операторов
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={operatorData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                  stroke="#666"
                />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="total" 
                  fill="#3B82F6" 
                  name="Всего заявок" 
                  radius={[2, 2, 0, 0]}
                  isAnimationActive
                  animationDuration={1000}
                />
                <Bar 
                  dataKey="contracts" 
                  fill="#10B981" 
                  name="Договоры" 
                  radius={[2, 2, 0, 0]}
                  isAnimationActive
                  animationDuration={1200}
                />
                <Bar 
                  dataKey="refusals" 
                  fill="#EF4444" 
                  name="Отказы" 
                  radius={[2, 2, 0, 0]}
                  isAnimationActive
                  animationDuration={1400}
                />
              </BarChart>
            </ResponsiveContainer>
          </LayoutBlock>
        );

      case 'expensesTrend':
        return (
          <LayoutBlock key="expensesTrend" id="expensesTrend" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <div className="w-2 h-6 bg-orange-500 rounded"></div>
              Динамика расходов
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={expensesTrendData}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  formatter={(value) => [`${value.toLocaleString()}₽`, 'Сумма']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3B82F6" 
                  fillOpacity={1}
                  fill="url(#totalGradient)"
                  name="Общие расходы"
                  strokeWidth={2}
                  isAnimationActive
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </LayoutBlock>
        );

      case 'expenseDetails':
        return (
          <LayoutBlock key="expenseDetails" id="expenseDetails" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <div className="w-2 h-6 bg-indigo-500 rounded"></div>
              Детализация расходов
            </h2>
            <div className="max-h-96 overflow-y-auto">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">Нет расходов за выбранный период</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredExpenses.map(expense => (
                    <div key={expense.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 gap-3">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800 dark:text-gray-200">{expense.description}</span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            {expense.source}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(expense.startDate).toLocaleDateString('ru-RU')} - {new Date(expense.endDate).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                          {expense.amount.toLocaleString()}₽
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startEditExpense(expense);
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteExpense(expense.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </LayoutBlock>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 pb-20 sm:pb-6 transition-colors duration-300">
      <div className="space-y-6">
        {(isLayoutMode ? tempLayoutOrder : layoutOrder).map(blockId => renderBlock(blockId))}

        {/* Expense Form Modal */}
        {showExpenseForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
                {editingExpense ? 'Редактировать расход' : 'Добавить расход'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Дата начала</label>
                  <input
                    type="date"
                    value={expenseForm.startDate}
                    onChange={(e) => setExpenseForm(prev => ({...prev, startDate: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Дата окончания</label>
                  <input
                    type="date"
                    value={expenseForm.endDate}
                    onChange={(e) => setExpenseForm(prev => ({...prev, endDate: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Источник</label>
                  <select
                    value={expenseForm.source}
                    onChange={(e) => setExpenseForm(prev => ({...prev, source: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Выберите источник</option>
                    {uniqueValues.sources.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Сумма (₽)</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({...prev, amount: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Описание</label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm(prev => ({...prev, description: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Описание расхода"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editingExpense ? updateExpense() : addExpense();
                  }}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {editingExpense ? 'Обновить' : 'Добавить'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowExpenseForm(false);
                    setEditingExpense(null);
                    setExpenseForm({
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: new Date().toISOString().split('T')[0],
                      source: '',
                      amount: '',
                      description: ''
                    });
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:hidden z-50">
          <div className="grid grid-cols-6 gap-1 p-2">
            <button className="flex flex-col items-center gap-1 p-2 text-blue-500">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs">Главная</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShowUpload();
              }}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
            >
              <Upload className="w-5 h-5" />
              <span className="text-xs">Данные</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowExpenseForm(true);
              }}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">Расход</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShowBackup();
              }}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
            >
              <Archive className="w-5 h-5" />
              <span className="text-xs">Бэкап</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLayoutModeToggle();
              }}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">Настройки</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLogout();
              }}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 dark:text-gray-400"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs">Выход</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;