import React from 'react';
import { BUSINESS_CASE_TEXT } from '../data/business_case';

interface BusinessCaseProps {
  fontSize: 'sm' | 'base' | 'lg';
  onFontSizeChange: (size: 'sm' | 'base' | 'lg') => void;
}

const BusinessCase: React.FC<BusinessCaseProps> = ({ fontSize, onFontSizeChange }) => {
  const paragraphs = BUSINESS_CASE_TEXT.trim().split('\n').filter(p => p.trim() !== '');

  const paragraphFontSizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  }[fontSize];

  const formattedText = paragraphs.map((p, i) => {
    // A simple heuristic for a heading: it's a short line with no period at the end.
    if (p.length < 50 && !p.endsWith('.') && !p.endsWith('?')) {
        return <h3 key={i} className="text-xl font-bold text-gray-800 mt-6 mb-2">{p}</h3>;
    }
    return <p key={i} className={`text-gray-700 mb-4 ${paragraphFontSizeClass}`}>{p}</p>;
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg h-full overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Malawi's Pizza Catering Case</h2>
        <div className="flex items-center border border-gray-300 rounded-lg" role="group" aria-label="Font size controls">
            <button
              type="button"
              onClick={() => onFontSizeChange('sm')}
              className={`px-3 py-1 text-sm font-medium rounded-l-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 ${fontSize === 'sm' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              title="Small text"
              aria-pressed={fontSize === 'sm'}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => onFontSizeChange('base')}
              className={`px-3 py-1 text-base font-medium transition-colors border-l border-r border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 ${fontSize === 'base' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              title="Medium text"
              aria-pressed={fontSize === 'base'}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => onFontSizeChange('lg')}
              className={`px-3 py-1 text-lg font-medium rounded-r-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 ${fontSize === 'lg' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              title="Large text"
              aria-pressed={fontSize === 'lg'}
            >
              A
            </button>
        </div>
      </div>
      <div className="max-w-none">
        {formattedText}
      </div>
    </div>
  );
};

export default BusinessCase;