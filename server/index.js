import express from 'express';
import cors from 'cors';
import multer from 'multer';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Enhanced CORS configuration for ngrok compatibility
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://localhost:5173',
    /^https:\/\/.*\.netlify\.app$/,
    /^https:\/\/.*\.ngrok-free\.app$/,
    /^https:\/\/.*\.ngrok\.io$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

// Add ngrok warning skip header middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Path to data files
const dataFilePath = path.join(__dirname, '../src/data/parsedata.json');
const expensesFilePath = path.join(__dirname, '../src/data/expenses.json');

// Ensure data directory exists
const dataDir = path.dirname(dataFilePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize with empty data if files don't exist
if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(dataFilePath, JSON.stringify([]));
}

if (!fs.existsSync(expensesFilePath)) {
  fs.writeFileSync(expensesFilePath, JSON.stringify([
    { id: 1, date: '2024-12-01', category: 'Реклама', amount: 7000, description: 'Яндекс Директ' },
    { id: 2, date: '2024-12-01', category: 'Настройка', amount: 3000, description: 'Настройка рекламы' }
  ]));
}

// Function to format date from Russian format to DD.MM.YYYY
const formatDate = (dateStr) => {
  if (!dateStr || dateStr === 'Не указано') return 'Не указано';
  
  try {
    // Convert to string if it's not already
    const dateString = String(dateStr);
    
    // Handle format like "4 Декабря 2024 г. 12:45"
    const months = {
      'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
      'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
      'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
    };
    
    // Remove extra spaces and normalize
    const normalized = dateString.replace(/\s+/g, ' ').trim();
    
    // Match pattern: "4 Декабря 2024 г. 12:45"
    const match = normalized.match(/(\d+)\s+(\w+)\s+(\d{4})/);
    
    if (match) {
      const day = match[1].padStart(2, '0');
      const monthName = match[2].toLowerCase();
      const year = match[3];
      const month = months[monthName] || '01';
      
      return `${day}.${month}.${year}`;
    }
    
    // Try to handle Excel date numbers
    if (!isNaN(dateString) && dateString > 40000) {
      const excelDate = XLSX.SSF.parse_date_code(dateString);
      if (excelDate) {
        const day = excelDate.d.toString().padStart(2, '0');
        const month = excelDate.m.toString().padStart(2, '0');
        const year = excelDate.y;
        return `${day}.${month}.${year}`;
      }
    }
    
    // Fallback: try to parse as regular date
    const date = new Date(dateString);
    if (!isNaN(date)) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    }
    
    return dateString;
  } catch (error) {
    console.error('Date formatting error:', error);
    return String(dateStr);
  }
};

// Function to safely get cell value with proper encoding
const getCellValue = (worksheet, row, col) => {
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = worksheet[cellAddress];
  
  if (!cell) return '';
  
  // Handle different cell types
  if (cell.t === 's') {
    // String type - ensure proper encoding
    return String(cell.v || '');
  } else if (cell.t === 'n') {
    // Number type
    return cell.v;
  } else if (cell.t === 'd') {
    // Date type
    return cell.v;
  } else {
    // Other types
    return String(cell.v || '');
  }
};

// Function to parse Excel/CSV data with correct column mapping and encoding
const parseUploadedData = (filePath) => {
  try {
    // Read file with proper encoding options
    const workbook = XLSX.readFile(filePath, {
      type: 'buffer',
      codepage: 65001, // UTF-8
      cellText: false,
      cellDates: true
    });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const data = [];
    
    console.log('Processing Excel file with range:', range);
    
    // Skip row 1 (headers) and start from row 2
    for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {
      const row = {};
      
      // Column B - Источник (source) - index 1
      const sourceValue = getCellValue(worksheet, rowNum, 1);
      row.source = sourceValue || 'Не указано';
      
      // Column C - Статус (status) - index 2
      const statusValue = getCellValue(worksheet, rowNum, 2);
      row.status = statusValue || 'Не указано';
      
      // Column D - Дата заявки (applicationDate) - index 3
      const appDateValue = getCellValue(worksheet, rowNum, 3);
      row.applicationDate = appDateValue ? formatDate(appDateValue) : 'Не указано';
      
      // Column E - Комментарий (comment) - index 4
      row.comment = getCellValue(worksheet, rowNum, 4) || '';
      
      // Column F - Дата Следующего шага (nextStepDate) - index 5
      const nextStepValue = getCellValue(worksheet, rowNum, 5);
      row.nextStepDate = nextStepValue ? formatDate(nextStepValue) : 'Не указано';
      
      // Column I - Воронка продаж (voronka) - index 8
      const voronkaValue = getCellValue(worksheet, rowNum, 8);
      row.voronka = voronkaValue || '';
      
      // Column S - Время обработки в минутах (processingTime) - index 18
      const processingTimeValue = getCellValue(worksheet, rowNum, 18);
      row.processingTime = processingTimeValue ? parseFloat(processingTimeValue) || 0.0 : 0.0;
      
      // Column T - Отметка об обработке (processed) - index 19
      row.processed = getCellValue(worksheet, rowNum, 19) || '';
      
      // Column Z - Оператор (operator) - index 25
      const operatorValue = getCellValue(worksheet, rowNum, 25);
      row.operator = operatorValue || 'Не указано';
      
      // Determine sales funnel stage based on status and voronka
      row.salesFunnel = determineSalesFunnel(row.status, row.voronka);
      
      // Add ID
      row.id = rowNum - 1; // Start from 0 since we skip header row
      
      // Only add row if it has some data
      if (row.source || row.status || row.operator) {
        console.log(`Row ${rowNum}:`, {
          source: row.source,
          status: row.status,
          operator: row.operator,
          voronka: row.voronka
        });
        data.push(row);
      }
    }
    
    console.log(`Parsed ${data.length} rows successfully`);
    return data;
  } catch (error) {
    console.error('Parse error:', error);
    throw new Error(`Ошибка парсинга файла: ${error.message}`);
  }
};

// Function to determine sales funnel stage based on status and voronka
const determineSalesFunnel = (status, voronka) => {
  const stages = ['Всего заявок'];
  
  // Use voronka field if available, otherwise fall back to status
  const funnelSource = voronka || status || '';
  
  if (funnelSource && (
    funnelSource.includes('замер') || 
    funnelSource.includes('Замер') ||
    funnelSource.includes('Договор') ||
    status === 'Договор'
  )) {
    stages.push('Назначен замер');
  }
  
  if (funnelSource.includes('Договор') || status === 'Договор') {
    stages.push('Заключен договор');
  }
  
  return stages.join(', ');
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

// Routes
app.get('/api/data', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Ошибка чтения данных' });
  }
});

app.get('/api/expenses', (req, res) => {
  try {
    const expenses = JSON.parse(fs.readFileSync(expensesFilePath, 'utf8'));
    res.json(expenses);
  } catch (error) {
    console.error('Error reading expenses:', error);
    res.status(500).json({ error: 'Ошибка чтения расходов' });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    console.log('Processing uploaded file:', req.file.originalname);
    const parsedData = parseUploadedData(req.file.path);
    
    // Replace all data in JSON file with proper UTF-8 encoding
    fs.writeFileSync(dataFilePath, JSON.stringify(parsedData, null, 2), 'utf8');
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    console.log(`Successfully processed ${parsedData.length} records`);
    
    res.json({ 
      message: 'Данные успешно загружены',
      count: parsedData.length,
      data: parsedData
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/data', (req, res) => {
  try {
    const newData = req.body;
    fs.writeFileSync(dataFilePath, JSON.stringify(newData, null, 2), 'utf8');
    res.json({ message: 'Данные сохранены' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const newExpenses = req.body;
    fs.writeFileSync(expensesFilePath, JSON.stringify(newExpenses, null, 2), 'utf8');
    res.json({ message: 'Расходы сохранены' });
  } catch (error) {
    console.error('Error saving expenses:', error);
    res.status(500).json({ error: 'Ошибка сохранения расходов' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('CORS enabled for Netlify and ngrok domains');
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/data');
  console.log('  GET  /api/expenses');
  console.log('  POST /api/upload');
  console.log('  POST /api/data');
  console.log('  POST /api/expenses');
});