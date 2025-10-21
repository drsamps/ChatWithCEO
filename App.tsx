
import React, { useState, useEffect, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { Message, MessageRole, ConversationPhase, EvaluationResult, CEOPersona, Section } from './types';
import { CEO_QUESTION } from './constants';
import { createChatSession, getEvaluation } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import BusinessCase from './components/BusinessCase';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import Evaluation from './components/Evaluation';

const App: React.FC = () => {
  const [studentFirstName, setStudentFirstName] = useState<string | null>(null);
  const [studentDBId, setStudentDBId] = useState<string | null>(null);
  const [tempFirstName, setTempFirstName] = useState<string>('');
  const [tempLastName, setTempLastName] = useState<string>('');
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [otherSectionText, setOtherSectionText] = useState<string>('');
  const [ceoPersona, setCeoPersona] = useState<CEOPersona>(CEOPersona.MODERATE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>(ConversationPhase.PRE_CHAT);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    const fetchSections = async () => {
        const { data, error } = await supabase
            .from('sections')
            .select('section_id, section_title, year_term')
            .eq('enabled', true)
            .order('year_term', { ascending: false })
            .order('section_title', { ascending: true });

        if (error) {
            console.error('Error fetching sections:', error);
            setError('Could not load course sections from the database.');
        } else {
            setSections(data);
            if (data.length === 0) {
                setSelectedSection('other');
            }
        }
    };

    if (conversationPhase === ConversationPhase.PRE_CHAT) {
        fetchSections();
    }
  }, [conversationPhase]);


  const startConversation = useCallback(async (name: string, persona: CEOPersona) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = createChatSession(name, persona);
      setChatSession(session);
      
      const firstMessage = `Hello ${name}. Let's get straight to it. ${CEO_QUESTION}`;
      
      setMessages([{ role: MessageRole.MODEL, content: firstMessage }]);
      setConversationPhase(ConversationPhase.CHATTING);
      
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
    } catch (e) {
      console.error("Failed to send message:", e);
      const errorMessage: Message = {
        role: MessageRole.MODEL,
        content: "I seem to be having trouble connecting. Please try again in a moment.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError("An error occurred while communicating with the API.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndConversation = async () => {
    if (!studentFirstName) return;
    setConversationPhase(ConversationPhase.EVALUATION_LOADING);
    setError(null);
    try {
      const fullName = `${tempFirstName.trim()} ${tempLastName.trim()}`;
      const result = await getEvaluation(messages, studentFirstName, fullName);
      setEvaluationResult(result);
      
      if (studentDBId) {
        const { error: evaluationError } = await supabase
          .from('evaluations')
          .insert({
            student_id: studentDBId,
            score: result.totalScore,
            summary: result.summary,
            criteria: result.criteria,
            persona: ceoPersona,
          });
        if (evaluationError) {
            console.error("Error saving evaluation:", evaluationError);
            // Non-critical error, maybe just log it and don't show to user
        }
      }

      setConversationPhase(ConversationPhase.EVALUATING);
    } catch (e) {
      console.error("Failed to get evaluation:", e);
      setError("Sorry, there was an error generating your performance review. Please try again.");
      setConversationPhase(ConversationPhase.CHATTING); // Revert to chat on error
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempFirstName.trim() && tempLastName.trim()) {
      setIsLoading(true);
      setError(null);
      const trimmedFirstName = tempFirstName.trim();
      const trimmedLastName = tempLastName.trim();
      const fullName = `${trimmedFirstName} ${trimmedLastName}`;
      
      let sectionToSave: string;
      if (selectedSection === '') {
          setError('Please select a course section.');
          setIsLoading(false);
          return;
      } else if (selectedSection === 'other') {
          if (!otherSectionText.trim()) {
              setError('Please enter your course section name.');
              setIsLoading(false);
              return;
          }
          sectionToSave = `other:${otherSectionText.trim().substring(0, 14)}`;
      } else {
          sectionToSave = selectedSection;
      }

      const { data, error } = await supabase
        .from('students')
        .insert({
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          full_name: fullName,
          persona: ceoPersona,
          section_id: sectionToSave,
        })
        .select('id')
        .single();
      
      if (error) {
        console.error("Error saving student to database:", error);
        setError("Could not connect to the database to save session. Please check your Supabase configuration.");
        setIsLoading(false);
        return;
      }
      
      setStudentDBId(data.id);
      setStudentFirstName(trimmedFirstName);
      await startConversation(trimmedFirstName, ceoPersona);
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setStudentFirstName(null);
    setStudentDBId(null);
    setTempFirstName('');
    setTempLastName('');
    setMessages([]);
    setIsLoading(false);
    setChatSession(null);
    setError(null);
    setConversationPhase(ConversationPhase.PRE_CHAT);
    setEvaluationResult(null);
    setCeoPersona(CEOPersona.MODERATE);
    setSelectedSection('');
    setOtherSectionText('');
  };

  if (conversationPhase === ConversationPhase.PRE_CHAT) {
    const isSectionValid = (selectedSection === 'other' && otherSectionText.trim() !== '') || (selectedSection !== 'other' && selectedSection !== '');

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-200">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Chat with the CEO</h1>
            <p className="mt-2 text-gray-600">You will have a brief opportunity to chat with the (simulated) CEO about the case. Enter your name and choose a persona to begin.</p>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={tempFirstName}
                    onChange={(e) => setTempFirstName(e.target.value)}
                    className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Alex"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={tempLastName}
                    onChange={(e) => setTempLastName(e.target.value)}
                    className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Chen"
                    required
                  />
                </div>
            </div>
            <div>
              <label htmlFor="section" className="block text-sm font-medium text-gray-700">
                What course section are you in?
              </label>
              <select
                id="section"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>Click to select...</option>
                {sections.map((sec) => (
                    <option key={sec.section_id} value={sec.section_id}>
                        {sec.section_title} ({sec.year_term})
                    </option>
                ))}
                <option value="other">Other...</option>
              </select>
            </div>
            {selectedSection === 'other' && (
              <div>
                <label htmlFor="otherSection" className="block text-sm font-medium text-gray-700">
                  Please specify your section
                </label>
                <input
                  id="otherSection"
                  type="text"
                  value={otherSectionText}
                  onChange={(e) => setOtherSectionText(e.target.value)}
                  className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., BUSM 101"
                  required
                />
              </div>
            )}
             <div>
                <label htmlFor="ceoPersona" className="block text-sm font-medium text-gray-700">
                    CEO Personality
                </label>
                <select 
                    id="ceoPersona"
                    value={ceoPersona}
                    onChange={(e) => setCeoPersona(e.target.value as CEOPersona)}
                    className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value={CEOPersona.MODERATE}>Moderate (Recommended)</option>
                    <option value={CEOPersona.STRICT}>Strict</option>
                    <option value={CEOPersona.LIBERAL}>Liberal</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Determines how strictly the CEO requires you to cite case facts.</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || !tempFirstName.trim() || !tempLastName.trim() || !isSectionValid}
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
            studentName={`${tempFirstName.trim()} ${tempLastName.trim()}` || 'Student'} 
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
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </aside>
    </div>
  );
};

export default App;
