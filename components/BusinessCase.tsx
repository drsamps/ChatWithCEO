import React from 'react';
import { BUSINESS_CASE_TEXT } from '../data/business_case';

const BusinessCase: React.FC = () => {
  const paragraphs = BUSINESS_CASE_TEXT.trim().split('\n').filter(p => p.trim() !== '');

  const formattedText = paragraphs.map((p, i) => {
    // A simple heuristic for a heading: it's a short line with no period at the end.
    if (p.length < 50 && !p.endsWith('.') && !p.endsWith('?')) {
        return <h3 key={i} className="text-xl font-bold text-gray-800 mt-6 mb-2">{p}</h3>;
    }
    return <p key={i} className="text-gray-700 mb-4">{p}</p>;
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 border-b pb-3 mb-4">Malawi's Pizza Catering Case</h2>
      <div className="prose prose-sm max-w-none">
        {formattedText}
      </div>
    </div>
  );
};

export default BusinessCase;