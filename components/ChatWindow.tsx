
import React, { useRef, useEffect } from 'react';
import { Message, MessageRole } from '../types';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex items-end gap-3 ${
            msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'
          }`}
        >
          {msg.role === MessageRole.MODEL && (
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              CEO
            </div>
          )}
          <div
            className={`max-w-md lg:max-w-lg p-4 rounded-2xl shadow-md ${
              msg.role === MessageRole.USER
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-white text-gray-800 rounded-bl-none'
            }`}
          >
            <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex items-end gap-3 justify-start">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            CEO
          </div>
          <div className="max-w-xs p-4 rounded-2xl shadow-md bg-white text-gray-800 rounded-bl-none">
            <div className="flex items-center justify-center space-x-1">
              <span className="text-sm text-gray-500">Typing</span>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;
