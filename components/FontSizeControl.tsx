import React from 'react';

interface FontSizeControlProps {
  currentSize: string;
  onSizeChange: (size: string) => void;
  sizes: string[];
  defaultSize: string;
}

const FontSizeControl: React.FC<FontSizeControlProps> = ({ currentSize, onSizeChange, sizes, defaultSize }) => {
  const currentIndex = sizes.indexOf(currentSize);
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < sizes.length - 1;

  const handleDecrease = () => {
    if (canDecrease) {
      onSizeChange(sizes[currentIndex - 1]);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onSizeChange(sizes[currentIndex + 1]);
    }
  };

  const handleReset = () => {
    onSizeChange(defaultSize);
  };

  return (
    <div className="flex items-center border border-gray-300 rounded-lg" role="group" aria-label="Font size controls">
      <button
        type="button"
        onClick={handleDecrease}
        disabled={!canDecrease}
        className="px-3 py-1 text-lg font-bold rounded-l-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Decrease font size"
        aria-label="Decrease font size"
      >
        -
      </button>
      <div
        onClick={handleReset}
        className="px-3 py-1 text-sm font-medium transition-colors border-l border-r border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 bg-white text-gray-700 hover:bg-gray-100 cursor-pointer"
        title="Reset font size"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleReset(); }}
      >
        font
      </div>
      <button
        type="button"
        onClick={handleIncrease}
        disabled={!canIncrease}
        className="px-3 py-1 text-lg font-bold rounded-r-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Increase font size"
        aria-label="Increase font size"
      >
        +
      </button>
    </div>
  );
};

export default FontSizeControl;
