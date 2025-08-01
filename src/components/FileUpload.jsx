import React, { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const FileUpload = ({ onDataLoaded, isOpen, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;

      const allowedTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
      ];

      if (
        !allowedTypes.includes(file.type) &&
        !file.name.match(/\.(xlsx?|csv)$/i)
      ) {
        setError("Пожалуйста, выберите файл Excel (.xlsx, .xls) или CSV");
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const formData = new FormData();
        formData.append("file", file);

        // Add headers for ngrok compatibility
        const headers = {
          "ngrok-skip-browser-warning": "true",
        };

        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: "POST",
          body: formData,
          headers: headers,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Ошибка загрузки файла");
        }

        setSuccess(`Успешно загружено ${result.count} записей`);
        onDataLoaded(result.data);

        if (result.data.length > 0) {
          const first = JSON.stringify(result.data[0], null, 2);
          const last = JSON.stringify(
            result.data[result.data.length - 1],
            null,
            2
          );
          alert(
            `Парсинг завершён!\n\nПервая запись:\n${first}\n\nПоследняя запись:\n${last}`
          );
        }

        // Save upload history for backup page
        const uploadHistory = JSON.parse(
          localStorage.getItem("uploadHistory") || "[]"
        );
        const newUpload = {
          filename: file.name,
          timestamp: new Date().toISOString(),
          recordCount: result.count,
          fileSize: file.size,
        };
        uploadHistory.unshift(newUpload);
        localStorage.setItem(
          "uploadHistory",
          JSON.stringify(uploadHistory.slice(0, 50))
        );

        // Close modal after successful upload
        setTimeout(() => {
          onClose();
          setSuccess("");
          setError("");
        }, 2000);
      } catch (err) {
        console.error("Upload error:", err);
        setError(err.message || "Ошибка загрузки файла");
      } finally {
        setLoading(false);
      }
    },
    [onDataLoaded, onClose]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback(
    (e) => {
      const files = e.target.files;
      if (files && files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClose = () => {
    setError("");
    setSuccess("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Загрузка данных
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
              dragActive
                ? "border-blue-500 bg-blue-50 scale-105"
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {loading ? (
              <div className="flex flex-col items-center animate-pulse">
                <Loader className="w-8 h-8 text-blue-600 mb-2 animate-spin" />
                <p className="text-gray-600">Обработка файла...</p>
              </div>
            ) : (
              <>
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4 transition-transform hover:scale-110" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Перетащите файл Excel или CSV сюда или
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <span className="bg-blue-500 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-blue-600 transition-all duration-200 hover:scale-105 inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Выберите файл
                  </span>
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  Поддерживаются форматы: Excel (.xlsx, .xls), CSV
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 animate-slideIn">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 animate-slideIn">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium mb-2">Ожидаемые колонки в файле:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div>
                  • <strong>Колонка A:</strong> Источник
                </div>
                <div>
                  • <strong>Колонка B:</strong> Статус
                </div>
                <div>
                  • <strong>Колонка C:</strong> Дата заявки
                </div>
                <div>
                  • <strong>Колонка D:</strong> Кто замерял
                </div>
                <div>
                  • <strong>Колонка E:</strong> Оператор
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <strong>Формат дат:</strong> "4 Декабря 2024 г. 12:45" → будет
              преобразован в "04.12.2024"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
