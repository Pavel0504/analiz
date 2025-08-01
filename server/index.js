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

// Function to format date from Russian format to DD.MM.YYYY
const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "Не указано") return "Не указано";

  try {
    const raw = String(dateStr).trim();

    // 1) Формат DD/MM/YY или D/M/YY (или с 4-значным годом)
    const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (slashMatch) {
      let [, d, m, y] = slashMatch;
      const day = d.padStart(2, "0");
      const month = m.padStart(2, "0");
      // если год из 2 цифр — делаем 20YY
      const year = y.length === 2 ? `20${y}` : y;
      return `${day}.${month}.${year}`;
    }

    // 2) Текстовый русский формат "4 Декабря 2024 г. 12:45"
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
      const day = textMatch[1].padStart(2, "0");
      const monthName = textMatch[2].toLowerCase();
      const year = textMatch[3];
      const month = months[monthName] || "01";
      return `${day}.${month}.${year}`;
    }

    // 3) Excel-число (>40000)
    if (!isNaN(raw) && Number(raw) > 40000) {
      const excelDate = XLSX.SSF.parse_date_code(Number(raw));
      if (excelDate) {
        const day = String(excelDate.d).padStart(2, "0");
        const month = String(excelDate.m).padStart(2, "0");
        const year = excelDate.y;
        return `${day}.${month}.${year}`;
      }
    }

    // 4) Fallback — обычный JS-парсинг
    const dt = new Date(raw);
    if (!isNaN(dt)) {
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = dt.getFullYear();
      return `${day}.${month}.${year}`;
    }

    // Если ничего не подошло — вернём исходник
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

// Function to parse Excel/CSV data with correct column mapping and encoding
const parseUploadedData = (filePath) => {
  try {
    // Read file with proper encoding options
    const workbook = XLSX.readFile(filePath, {
      type: "buffer",
      codepage: 65001, // UTF-8
      cellText: false,
      cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const data = [];

    console.log("Processing Excel file with range:", range);

    // Iterate all rows in the range (including header if you wish)
    for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
      const row = {};

      // Column A - Источник (source) - index 0
      const sourceValue = getCellValue(worksheet, rowNum, 0);
      row.source = sourceValue || "Не указано";

      // Column B - Статус (status) - index 1
      const statusValue = getCellValue(worksheet, rowNum, 1);
      row.status = statusValue || "Не указано";

      // Column C - Дата заявки (applicationDate) - index 2
      const appDateValue = getCellValue(worksheet, rowNum, 2);
      row.applicationDate = appDateValue
        ? formatDate(appDateValue)
        : "Не указано";

      // Column D - Кто замерял / Воронка продаж (whoMeasured) - index 3
      const whoMeasuredValue = getCellValue(worksheet, rowNum, 3);
      row.whoMeasured = whoMeasuredValue || "Не указано";

      // Column E - Оператор (operator) - index 4
      const operatorValue = getCellValue(worksheet, rowNum, 4);
      row.operator = operatorValue || "Не указано";

      // Add ID relative to the start of the range
      row.id = rowNum - range.s.r;

      // Log the raw first and last rows
      if (rowNum === range.s.r) {
        console.log("--- FIRST ROW RAW DATA ---");
        console.log(`rowNum = ${rowNum}`, row);
      }
      if (rowNum === range.e.r) {
        console.log("--- LAST ROW RAW DATA ---");
        console.log(`rowNum = ${rowNum}`, row);
      }

      // Only add row if it has any of the key fields
      if (row.source || row.status || row.operator) {
        data.push(row);
      }
    }

    console.log(`Parsed ${data.length} valid rows successfully`);

    // If you want to log the first and last filtered entries:
    if (data.length > 0) {
      console.log("=== FIRST FILTERED ENTRY ===", data[0]);
      console.log("=== LAST FILTERED ENTRY ===", data[data.length - 1]);
    }

    return data;
  } catch (error) {
    console.error("Parse error:", error);
    throw new Error(`Ошибка парсинга файла: ${error.message}`);
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
    const parsedData = parseUploadedData(req.file.path);

    // Replace all data in JSON file with proper UTF-8 encoding
    fs.writeFileSync(dataFilePath, JSON.stringify(parsedData, null, 2), "utf8");

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    console.log(`Successfully processed ${parsedData.length} records`);

    res.json({
      message: "Данные успешно загружены",
      count: parsedData.length,
      data: parsedData,
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
