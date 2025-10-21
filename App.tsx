import React, { useState, useEffect, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { Message, MessageRole, ConversationPhase, EvaluationResult } from './types';
import { CEO_QUESTION } from './constants';
import { createChatSession, getEvaluation } from './services/geminiService';
import BusinessCase from './components/BusinessCase';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import Evaluation from './components/Evaluation';

const App: React.FC = () => {
  const [studentName, setStudentName] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>(ConversationPhase.PRE_CHAT);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [shouldFocusInput, setShouldFocusInput] = useState<boolean>(false);

  const startConversation = useCallback(async (name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = createChatSession(name);
      setChatSession(session);
      
      const firstMessage = `Hello ${name}. Let's get straight to it. ${CEO_QUESTION}`;
      
      setMessages([{ role: MessageRole.MODEL, content: firstMessage }]);
      setConversationPhase(ConversationPhase.CHATTING);
      setShouldFocusInput(true);
      
    } catch (e) {
      console.error("Failed to start conversation:", e);
      setError("Failed to initialize the chat session. Please check your API key and refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleSendMessage = async (userMessage: string) => {
    const lowerCaseMessage = userMessage.toLowerCase();
    if (lowerCaseMessage.includes("time is up") || lowerCaseMessage.includes("time's up")) {
      await handleEndConversation();
      return;
    }

    if (!chatSession) return;

    const newUserMessage: Message = { role: MessageRole.USER, content: userMessage };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatSession.sendMessage({ message: userMessage });
      const modelMessage: Message = { role: MessageRole.MODEL, content: response.text };
      setMessages((prev) => [...prev, modelMessage]);
      setShouldFocusInput(true);
    } catch (e) {
      console.error("Failed to send message:", e);
      const errorMessage: Message = {
        role: MessageRole.MODEL,
        content: "I seem to be having trouble connecting. Please try again in a moment.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError("An error occurred while communicating with the API.");
      setShouldFocusInput(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndConversation = async () => {
    if (!studentName) return;
    setConversationPhase(ConversationPhase.EVALUATION_LOADING);
    setError(null);
    try {
      const result = await getEvaluation(messages, studentName);
      setEvaluationResult(result);
      setConversationPhase(ConversationPhase.EVALUATING);
    } catch (e) {
      console.error("Failed to get evaluation:", e);
      setError("Sorry, there was an error generating your performance review. Please try again.");
      setConversationPhase(ConversationPhase.CHATTING); // Revert to chat on error
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      const trimmedName = tempName.trim();
      setStudentName(trimmedName);
      startConversation(trimmedName);
    }
  };

  const handleRestart = () => {
    setStudentName(null);
    setTempName('');
    setMessages([]);
    setIsLoading(false);
    setChatSession(null);
    setError(null);
    setConversationPhase(ConversationPhase.PRE_CHAT);
    setEvaluationResult(null);
    setShouldFocusInput(false);
  };

  const handleFocusComplete = () => {
    setShouldFocusInput(false);
  };

  if (conversationPhase === ConversationPhase.PRE_CHAT) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-200">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">CEO Case Study</h1>
            <p className="mt-2 text-gray-600">Enter your name to begin the simulation.</p>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full px-4 py-2 mt-2 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Alex Chen"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
            >
              {isLoading ? 'Initializing...' : 'Start Chat'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (conversationPhase === ConversationPhase.EVALUATION_LOADING || conversationPhase === ConversationPhase.EVALUATING) {
    return (
        <Evaluation 
            result={evaluationResult} 
            studentName={studentName || 'Student'} 
            onRestart={handleRestart} 
        />
    );
  }

  return (
    <div className="h-screen w-screen p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 font-sans">
      <main className="lg:w-1/3 xl:w-1/4 h-1/2 lg:h-full">
        <BusinessCase />
      </main>
      <aside className="lg:w-2/3 xl:w-3/4 h-1/2 lg:h-full flex flex-col bg-gray-200 rounded-xl shadow-lg">
        {error && <div className="p-4 bg-red-500 text-white text-center font-semibold rounded-t-xl">{error}</div>}
        <ChatWindow messages={messages} isLoading={isLoading} />
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} shouldFocus={shouldFocusInput} onFocusComplete={handleFocusComplete} />
      </aside>
    </div>
  );
};

export default App;
