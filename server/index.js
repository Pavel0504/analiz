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

// Улучшенная конфигурация multer
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимум
    files: 1 // только один файл
  },
  fileFilter: (req, file, cb) => {
    // Проверяем MIME тип
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/vnd.oasis.opendocument.spreadsheet' // .ods
    ];
    
    // Проверяем расширение файла
    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.ods'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Неподдерживаемый тип файла: ${file.originalname}. Разрешены: Excel (.xlsx, .xls), CSV (.csv), ODS (.ods)`));
    }
  }
});

// Функция для создания резервной копии
const createBackup = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const backupPath = filePath.replace('.json', `_backup_${Date.now()}.json`);
      fs.copyFileSync(filePath, backupPath);
      console.log(`Backup created: ${backupPath}`);
      return backupPath;
    }
  } catch (error) {
    console.error('Backup creation failed:', error);
  }
  return null;
};

// Функция безопасной записи файла
const safeWriteFile = (filePath, data) => {
  const tempPath = filePath + '.tmp';
  
  try {
    // Записываем во временный файл
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    
    // Проверяем что файл записался корректно
    const written = JSON.parse(fs.readFileSync(tempPath, 'utf8'));
    if (!Array.isArray(written) || written.length !== data.length) {
      throw new Error('Data validation failed after write');
    }
    
    // Атомарно перемещаем временный файл
    fs.renameSync(tempPath, filePath);
    
    return true;
  } catch (error) {
    // Удаляем временный файл если что-то пошло не так
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
};

// Улучшенная функция парсинга с лучшей обработкой ошибок
const parseUploadedData = (filePath) => {
  const originalFileName = path.basename(filePath);
  
  try {
    console.log(`Starting to parse file: ${originalFileName}`);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      throw new Error('Uploaded file not found');
    }

    // Проверяем размер файла
    const stats = fs.statSync(filePath);
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    if (stats.size === 0) {
      throw new Error('Файл пустой');
    }

    // Пытаемся определить кодировку для CSV файлов
    const fileExtension = path.extname(originalFileName).toLowerCase();
    let workbook;
    
    if (fileExtension === '.csv') {
      // Для CSV файлов пробуем разные кодировки
      const encodings = ['utf8', 'utf16le', 'latin1', 'cp1251'];
      let csvData = null;
      
      for (const encoding of encodings) {
        try {
          csvData = fs.readFileSync(filePath, encoding);
          workbook = XLSX.read(csvData, { type: 'string', codepage: 65001 });
          break;
        } catch (e) {
          console.log(`Failed to read with encoding ${encoding}:`, e.message);
          continue;
        }
      }
      
      if (!workbook) {
        throw new Error('Не удалось прочитать CSV файл ни в одной из поддерживаемых кодировок');
      }
    } else {
      // Для Excel файлов
      workbook = XLSX.readFile(filePath, {
        type: "buffer",
        codepage: 65001,
        cellText: false,
        cellDates: true,
        raw: false
      });
    }

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Файл не содержит листов или поврежден');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet || !worksheet['!ref']) {
      throw new Error('Лист пустой или поврежден');
    }

    const fullRange = XLSX.utils.decode_range(worksheet["!ref"]);
    console.log(`Sheet "${sheetName}" range:`, fullRange);

    // Проверяем что в файле есть данные
    if (fullRange.e.r < 0 || fullRange.e.c < 0) {
      throw new Error('Файл не содержит данных');
    }

    // Ваша существующая логика определения заголовков и парсинга...
    const firstRowHasHeaders = (() => {
      const firstRowValues = [];
      for (let col = 0; col <= Math.min(4, fullRange.e.c); col++) {
        const value = getCellValue(worksheet, 0, col);
        firstRowValues.push(String(value).toLowerCase().trim());
      }
      
      console.log("First row values:", firstRowValues);
      
      const headerKeywords = ['источник', 'статус', 'дата', 'кто', 'оператор', 'source', 'status', 'date', 'who', 'operator'];
      let headerMatches = 0;
      
      firstRowValues.forEach(val => {
        if (headerKeywords.some(keyword => val === keyword || val.includes(keyword))) {
          headerMatches++;
        }
      });
      
      const hasHeaders = headerMatches >= 2;
      console.log("Header matches found:", headerMatches, "Has headers:", hasHeaders);
      
      return hasHeaders;
    })();

    const startRow = firstRowHasHeaders ? 1 : 0;
    const endRow = fullRange.e.r;
    const data = [];

    console.log("Reading rows from", startRow, "to", endRow);

    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
      const row = {
        source: getCellValue(worksheet, rowNum, 0) || "Не указано",
        status: getCellValue(worksheet, rowNum, 1) || "Не указано",
        applicationDate: (() => {
          const v = getCellValue(worksheet, rowNum, 2);
          return v ? formatDate(v) : "Не указано";
        })(),
        whoMeasured: getCellValue(worksheet, rowNum, 3) || "Не указано",
        operator: getCellValue(worksheet, rowNum, 4) || "Не указано",
        id: data.length, // Используем текущую длину массива как ID
      };

      // Пропускаем полностью пустые строки
      const isEmpty = Object.values(row).every(val => 
        val === "Не указано" || val === "" || val == null
      );
      
      if (!isEmpty) {
        data.push(row);
      }
    }

    if (data.length === 0) {
      throw new Error('В файле не найдено данных для импорта');
    }

    console.log(`Successfully parsed ${data.length} rows from ${originalFileName}`);
    return data;

  } catch (err) {
    console.error(`Parse error for ${originalFileName}:`, err);
    throw new Error(`Ошибка парсинга файла "${originalFileName}": ${err.message}`);
  }
};

// Улучшенный endpoint загрузки
app.post("/api/upload", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    let tempFilePath = null;
    let backupPath = null;
    
    try {
      // Обработка ошибок multer
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            error: "Файл слишком большой. Максимальный размер: 10MB" 
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ 
            error: "Можно загрузить только один файл" 
          });
        }
        return res.status(400).json({ 
          error: `Ошибка загрузки: ${err.message}` 
        });
      }
      
      if (err) {
        return res.status(400).json({ 
          error: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          error: "Файл не загружен" 
        });
      }

      tempFilePath = req.file.path;
      console.log(`Processing uploaded file: ${req.file.originalname} (${req.file.size} bytes)`);

      // Создаем резервную копию существующих данных
      backupPath = createBackup(dataFilePath);

      // Парсим загруженный файл
      const parsedData = parseUploadedData(tempFilePath);

      // Безопасно сохраняем данные
      safeWriteFile(dataFilePath, parsedData);

      console.log(`Successfully processed ${parsedData.length} records from ${req.file.originalname}`);

      res.json({
        success: true,
        message: "Данные успешно загружены",
        count: parsedData.length,
        fileName: req.file.originalname,
        data: parsedData.slice(0, 5), // Возвращаем только первые 5 записей для предварительного просмотра
        totalRecords: parsedData.length
      });

    } catch (error) {
      console.error("Upload processing error:", error);
      
      // Если была создана резервная копия и произошла ошибка, восстанавливаем данные
      if (backupPath && fs.existsSync(backupPath)) {
        try {
          fs.copyFileSync(backupPath, dataFilePath);
          console.log("Data restored from backup");
        } catch (restoreError) {
          console.error("Failed to restore backup:", restoreError);
        }
      }

      res.status(500).json({ 
        success: false,
        error: error.message,
        fileName: req.file?.originalname
      });
      
    } finally {
      // Очищаем временные файлы
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error("Failed to cleanup temp file:", cleanupError);
        }
      }
      
      // Удаляем резервную копию если все прошло успешно
      if (backupPath && fs.existsSync(backupPath) && res.statusCode === 200) {
        try {
          // Держим только последние 5 резервных копий
          const backupDir = path.dirname(backupPath);
          const backupFiles = fs.readdirSync(backupDir)
            .filter(f => f.includes('_backup_'))
            .sort()
            .reverse();
            
          if (backupFiles.length > 5) {
            backupFiles.slice(5).forEach(oldBackup => {
              fs.unlinkSync(path.join(backupDir, oldBackup));
            });
          }
        } catch (cleanupError) {
          console.error("Failed to cleanup old backups:", cleanupError);
        }
      }
    }
  });
});