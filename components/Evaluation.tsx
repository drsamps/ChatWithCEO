import React from 'react';
import { EvaluationResult } from '../types';

interface EvaluationProps {
  result: EvaluationResult | null;
  studentName: string;
  onRestart: () => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
        <p className="text-xl font-semibold text-gray-700">The Coach is reviewing your conversation...</p>
        <p className="text-gray-500">This may take a moment.</p>
    </div>
);

const Evaluation: React.FC<EvaluationProps> = ({ result, studentName, onRestart }) => {
  if (!result) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-200">
            <LoadingSpinner />
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200 p-4">
      <div className="w-full max-w-3xl p-8 space-y-6 bg-white rounded-2xl shadow-xl transform transition-all animate-fade-in">
        <div className="text-center border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Performance Review</h1>
          <p className="mt-2 text-lg text-gray-600">Evaluation for {studentName}</p>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Coach's Summary</h2>
            <p className="text-gray-700">{result.summary}</p>
        </div>

        <div className="space-y-6">
            {result.criteria.map((criterion, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                        <p className="text-md font-semibold text-gray-800 flex-1 pr-4">{criterion.question}</p>
                        <div className="text-lg font-bold text-white bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                            {criterion.score}/2
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 pl-1"><strong className="font-medium">Feedback:</strong> {criterion.feedback}</p>
                </div>
            ))}
        </div>
        
        <div className="text-center pt-4 border-t">
             <div className="text-2xl font-bold text-gray-800 mb-4">
                Total Score: {result.totalScore} / 6
             </div>
            <button
              onClick={onRestart}
              className="w-full max-w-xs px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
            >
              Start Over
            </button>
        </div>
      </div>
       <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
        }
       `}</style>
    </div>
  );
};

export default Evaluation;
