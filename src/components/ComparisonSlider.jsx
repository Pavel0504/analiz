import React from 'react';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';

const ComparisonSlider = ({
  comparisons,
  currentIndex,
  onPrevious,
  onNext,
  onRemove,
  onAdd,
  children
}) => {
  if (comparisons.length <= 1) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow duration-300">
        {children}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Navigation Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPrevious();
              }}
              disabled={currentIndex === 0}
              className={`p-2 rounded-lg transition-all ${
                currentIndex === 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-110'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {currentIndex === 0 ? 'Основной анализ' : `Сравнение ${currentIndex}`}
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                ({currentIndex + 1} из {comparisons.length})
              </span>
            </span>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNext();
              }}
              disabled={currentIndex === comparisons.length - 1}
              className={`p-2 rounded-lg transition-all ${
                currentIndex === comparisons.length - 1
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-110'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm"
            >
              <Plus className="w-4 h-4" />
              Добавить сравнение
            </button>
            
            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(currentIndex);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm"
              >
                <X className="w-4 h-4" />
                Удалить
              </button>
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="sm:hidden space-y-4">
          {/* Slider Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPrevious();
              }}
              disabled={currentIndex === 0}
              className={`p-3 rounded-lg transition-all ${
                currentIndex === 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-110'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {currentIndex === 0 ? 'Основной анализ' : `Сравнение ${currentIndex}`}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                ({currentIndex + 1} из {comparisons.length})
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNext();
              }}
              disabled={currentIndex === comparisons.length - 1}
              className={`p-3 rounded-lg transition-all ${
                currentIndex === comparisons.length - 1
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-110'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons - Below slider controls on mobile */}
          <div className="flex flex-col gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm w-full"
            >
              <Plus className="w-4 h-4" />
              Добавить сравнение
            </button>
            
            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(currentIndex);
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm w-full"
              >
                <X className="w-4 h-4" />
                Удалить сравнение
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 transition-all duration-300">
        {children}
      </div>
    </div>
  );
};

export default ComparisonSlider;