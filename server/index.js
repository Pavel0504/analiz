import express from "express";
import cors from "cors";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Enhanced CORS configuration for ngrok compatibility
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://localhost:5173",
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.ngrok-free\.app$/,
      /^https:\/\/.*\.ngrok\.io$/,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
    ],
  })
);

// Add ngrok warning skip header middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, ngrok-skip-browser-warning"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Path to data files
const dataFilePath = path.join(__dirname, "data/parsedata.json");
const expensesFilePath = path.join(__dirname, "data/expenses.json");

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
  fs.writeFileSync(
    expensesFilePath,
    JSON.stringify([
      {
        id: 1,
        startDate: "2024-12-01",
        endDate: "2024-12-01",
        source: "Яндекс Директ",
        amount: 7000,
        description: "Яндекс Директ",
      },
      {
        id: 2,
        startDate: "2024-12-01",
        endDate: "2024-12-01",
        source: "Настройка",
        amount: 3000,
        description: "Настройка рекламы",
      },
    ])
  );
}

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "Не указано") return "Не указано";

  try {
    if (dateStr instanceof Date) {
      // Добавляем один день
      const adjustedDate = new Date(dateStr);
      adjustedDate.setDate(adjustedDate.getDate() + 1);
      
      const day = String(adjustedDate.getDate()).padStart(2, "0");
      const month = String(adjustedDate.getMonth() + 1).padStart(2, "0");
      const year = adjustedDate.getFullYear();
      return `${day}.${month}.${year}`;
    }

    const raw = String(dateStr).trim();

    const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (slashMatch) {
      let [, d, m, y] = slashMatch;
      // Добавляем один день
      let day = parseInt(d) + 1;
      const month = m.padStart(2, "0");
      const year = y.length === 2 ? `20${y}` : y;
      
      // Проверяем переход на следующий месяц (упрощенная проверка)
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      if (day > daysInMonth) {
        day = 1;
        // Здесь можно добавить логику для перехода на следующий месяц, но для простоты оставим как есть
      }
      
      return `${String(day).padStart(2, "0")}.${month}.${year}`;
    }

    const months = {
      января: "01",
      февраля: "02",
      марта: "03",
      апреля: "04",
      мая: "05",
      июня: "06",
      июля: "07",
      августа: "08",
      сентября: "09",
      октября: "10",
      ноября: "11",
      декабря: "12",
    };
    const normalized = raw.replace(/\s+/g, " ").replace(/г\./i, "").trim();
    const textMatch = normalized.match(/^(\d{1,2})\s+([А-Яа-я]+)\s+(\d{4})/);
    if (textMatch) {
      let day = parseInt(textMatch[1]) + 1; // Добавляем один день
      const monthName = textMatch[2].toLowerCase();
      const year = textMatch[3];
      const month = months[monthName] || "01";
      
      // Проверяем переход на следующий месяц
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      if (day > daysInMonth) {
        day = 1;
      }
      
      return `${String(day).padStart(2, "0")}.${month}.${year}`;
    }

    if (!isNaN(raw) && Number(raw) > 40000) {
      const excelDate = XLSX.SSF.parse_date_code(Number(raw));
      if (excelDate) {
        // Добавляем один день
        let day = excelDate.d + 1;
        const month = String(excelDate.m).padStart(2, "0");
        const year = excelDate.y;
        
        // Проверяем переход на следующий месяц
        const daysInMonth = new Date(year, excelDate.m, 0).getDate();
        if (day > daysInMonth) {
          day = 1;
        }
        
        return `${String(day).padStart(2, "0")}.${month}.${year}`;
      }
    }

    const dt = new Date(raw);
    if (!isNaN(dt)) {
      // Добавляем один день
      dt.setDate(dt.getDate() + 1);
      
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = dt.getFullYear();
      return `${day}.${month}.${year}`;
    }

    return raw;
  } catch (err) {
    console.error("Date formatting error:", err);
    return String(dateStr);
  }
};

// Function to safely get cell value with proper encoding
const getCellValue = (worksheet, row, col) => {
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = worksheet[cellAddress];

  if (!cell) return "";

  // Handle different cell types
  if (cell.t === "s") {
    // String type - ensure proper encoding
    return String(cell.v || "");
  } else if (cell.t === "n") {
    // Number type
    return cell.v;
  } else if (cell.t === "d") {
    // Date type
    return cell.v;
  } else {
    // Other types
    return String(cell.v || "");
  }
};

const parseUploadedData = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath, {
      type: "buffer",
      codepage: 65001,
      cellText: false,
      cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const fullRange = XLSX.utils.decode_range(worksheet["!ref"]);
    const startRow = 0; // Начинаем с первой строки, так как заголовков нет
    const endRow = fullRange.e.r;
    const data = [];
    const rawData = []; // Для отладки

    console.log("Full sheet range:", fullRange, "→ reading rows 0…", endRow);

    // Сначала собираем сырые данные для отладки
    for (let rowNum = startRow; rowNum <= Math.min(endRow, 9); rowNum++) { // Первые 10 строк для отладки
      const rawRow = {
        row: rowNum,
        col0: getCellValue(worksheet, rowNum, 0),
        col1: getCellValue(worksheet, rowNum, 1),
        col2: getCellValue(worksheet, rowNum, 2),
        col3: getCellValue(worksheet, rowNum, 3),
        col4: getCellValue(worksheet, rowNum, 4),
      };
      rawData.push(rawRow);
    }

    console.log("RAW DATA FROM EXCEL (first 10 rows):");
    rawData.forEach(row => {
      console.log(`Row ${row.row}: [${row.col0}] [${row.col1}] [${row.col2}] [${row.col3}] [${row.col4}]`);
    });

    // Теперь парсим все данные
    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
      const row = {
        source: getCellValue(worksheet, rowNum, 0) || "Не указано",
        status: getCellValue(worksheet, rowNum, 1) || "Не указано",
        applicationDate: (() => {
          const v = getCellValue(worksheet, rowNum, 2);
          console.log(`Row ${rowNum}, Col 2 raw value:`, v, typeof v);
          return v ? formatDate(v) : "Не указано";
        })(),
        whoMeasured: getCellValue(worksheet, rowNum, 3) || "Не указано",
        operator: getCellValue(worksheet, rowNum, 4) || "Не указано",
        id: rowNum,
      };

      if (rowNum === startRow) console.log("FIRST DATA ROW →", row);
      if (rowNum === endRow) console.log(`LAST DATA ROW →`, row);

      data.push(row);
    }

    console.log(`Parsed ${data.length} rows.`);

    // Добавляем сырые данные в ответ для отладки
    return { data, rawData };
  } catch (err) {
    console.error("Parse error:", err);
    throw new Error(`Ошибка парсинга: ${err.message}`);
  }
};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Server is running",
  });
});

// Routes
app.get("/api/data", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
    res.json(data);
  } catch (error) {
    console.error("Error reading data:", error);
    res.status(500).json({ error: "Ошибка чтения данных" });
  }
});

app.get("/api/expenses", (req, res) => {
  try {
    const expenses = JSON.parse(fs.readFileSync(expensesFilePath, "utf8"));
    res.json(expenses);
  } catch (error) {
    console.error("Error reading expenses:", error);
    res.status(500).json({ error: "Ошибка чтения расходов" });
  }
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }

    console.log("Processing uploaded file:", req.file.originalname);
    const result = parseUploadedData(req.file.path);
    const parsedData = result.data;
    const rawData = result.rawData;

    // Replace all data in JSON file with proper UTF-8 encoding
    fs.writeFileSync(dataFilePath, JSON.stringify(parsedData, null, 2), "utf8");

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    console.log(`Successfully processed ${parsedData.length} records`);

    res.json({
      message: "Данные успешно загружены",
      count: parsedData.length,
      data: parsedData,
      rawData: rawData, // Добавляем сырые данные для отладки
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/data", (req, res) => {
  try {
    const newData = req.body;
    fs.writeFileSync(dataFilePath, JSON.stringify(newData, null, 2), "utf8");
    res.json({ message: "Данные сохранены" });
  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).json({ error: "Ошибка сохранения данных" });
  }
});

// Add expense
app.post("/api/expenses", (req, res) => {
  try {
    const currentExpenses = JSON.parse(
      fs.readFileSync(expensesFilePath, "utf8")
    );
    const newExpense = req.body;
    newExpense.id = Date.now(); // Generate unique ID

    const updatedExpenses = [...currentExpenses, newExpense];
    fs.writeFileSync(
      expensesFilePath,
      JSON.stringify(updatedExpenses, null, 2),
      "utf8"
    );

    res.json({ message: "Расход добавлен", expense: newExpense });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({ error: "Ошибка добавления расхода" });
  }
});

// Update expense
app.put("/api/expenses/:id", (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const updatedExpense = req.body;
    const currentExpenses = JSON.parse(
      fs.readFileSync(expensesFilePath, "utf8")
    );

    const expenseIndex = currentExpenses.findIndex(
      (expense) => expense.id === expenseId
    );
    if (expenseIndex === -1) {
      return res.status(404).json({ error: "Расход не найден" });
    }

    currentExpenses[expenseIndex] = { ...updatedExpense, id: expenseId };
    fs.writeFileSync(
      expensesFilePath,
      JSON.stringify(currentExpenses, null, 2),
      "utf8"
    );

    res.json({
      message: "Расход обновлен",
      expense: currentExpenses[expenseIndex],
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ error: "Ошибка обновления расхода" });
  }
});

// Delete expense
app.delete("/api/expenses/:id", (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const currentExpenses = JSON.parse(
      fs.readFileSync(expensesFilePath, "utf8")
    );

    const updatedExpenses = currentExpenses.filter(
      (expense) => expense.id !== expenseId
    );
    fs.writeFileSync(
      expensesFilePath,
      JSON.stringify(updatedExpenses, null, 2),
      "utf8"
    );

    res.json({ message: "Расход удален" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ error: "Ошибка удаления расхода" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("CORS enabled for Netlify and ngrok domains");
  console.log("Available endpoints:");
  console.log("  GET  /api/health");
  console.log("  GET  /api/data");
  console.log("  GET  /api/expenses");
  console.log("  POST /api/upload");
  console.log("  POST /api/data");
  console.log("  POST /api/expenses");
  console.log("  PUT  /api/expenses/:id");
  console.log("  DELETE /api/expenses/:id");
});