

import React, { useState, forwardRef } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  chatFontSize: 'sm' | 'base' | 'lg';
  onFontSizeChange: (size: 'sm' | 'base' | 'lg') => void;
}

const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  ({ onSendMessage, isLoading, chatFontSize, onFontSizeChange }, ref) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (message.trim() && !isLoading) {
        onSendMessage(message.trim());
        setMessage('');
      }
    };

    return (
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex items-center space-x-4">
          <textarea
            ref={ref}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type your response..."
            disabled={isLoading}
            rows={1}
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none disabled:bg-gray-100 transition"
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
          <div className="flex items-center border border-gray-300 rounded-lg" role="group" aria-label="Font size controls">
            <button
              type="button"
              onClick={() => onFontSizeChange('sm')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 ${chatFontSize === 'sm' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              title="Small text"
              aria-pressed={chatFontSize === 'sm'}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => onFontSizeChange('base')}
              className={`px-3 py-2 text-base font-medium transition-colors border-l border-r border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 ${chatFontSize === 'base' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              title="Medium text"
              aria-pressed={chatFontSize === 'base'}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => onFontSizeChange('lg')}
              className={`px-3 py-2 text-lg font-medium rounded-r-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 ${chatFontSize === 'lg' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              title="Large text"
              aria-pressed={chatFontSize === 'lg'}
            >
              A
            </button>
          </div>
        </form>
      </div>
    );
  }
);

export default MessageInput;
