

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Chat } from '@google/genai';
import { Message, MessageRole, ConversationPhase, EvaluationResult, CEOPersona, Section } from './types';
import { createChatSession, getEvaluation } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import BusinessCase from './components/BusinessCase';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import Evaluation from './components/Evaluation';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

interface Model {
    model_id: string;
    model_name: string;
}

const App: React.FC = () => {
  // Common state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // View mode state
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState<'student' | 'admin'>('student');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  // Student-specific state
  const [studentFirstName, setStudentFirstName] = useState<string | null>(null);
  const [studentDBId, setStudentDBId] = useState<string | null>(null);
  const [tempFirstName, setTempFirstName] = useState<string>('');
  const [tempLastName, setTempLastName] = useState<string>('');
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [otherSectionText, setOtherSectionText] = useState<string>('');
  const [ceoPersona, setCeoPersona] = useState<CEOPersona>(CEOPersona.MODERATE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>(ConversationPhase.PRE_CHAT);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [helpfulScore, setHelpfulScore] = useState<number | null>(null);
  const [likedFeedback, setLikedFeedback] = useState<string | null>(null);
  const [improveFeedback, setImproveFeedback] = useState<string | null>(null);
  const [chatFontSize, setChatFontSize] = useState<'sm' | 'base' | 'lg'>('sm');
  const [caseFontSize, setCaseFontSize] = useState<'sm' | 'base' | 'lg'>('sm');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [selectedChatModel, setSelectedChatModel] = useState<string | null>(null);
  const [selectedSuperModel, setSelectedSuperModel] = useState<string | null>(null);


  useEffect(() => {
    // Handles client-side routing and auth state
    const handleRouteChange = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const urlParams = new URLSearchParams(window.location.search);
        
        // Use hash-based routing for robust SPA navigation.
        // Fallback to query param for AI Studio Preview compatibility.
        if (window.location.hash === '#/admin' || urlParams.get('view') === 'admin') {
            setView('admin');
            setIsAdminAuthenticated(!!session);
        } else {
            setView('student');
        }
        setIsReady(true);
    };
    
    // On initial page load, always default to the student view.
    // If the URL hash points to the admin page, we clear it.
    // The 'hashchange' listener will then fire and call handleRouteChange,
    // which will correctly set the view to 'student'.
    if (window.location.hash === '#/admin') {
        window.location.hash = '';
    } else {
        // If the hash is not '#/admin', we can safely perform the initial render check.
        handleRouteChange();
    }

    // Listen for hash changes to handle subsequent navigation (e.g., back/forward buttons, ctrl+click)
    window.addEventListener('hashchange', handleRouteChange);
    
    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);
  
  useEffect(() => {
    const fetchSections = async () => {
        const { data, error: fetchError } = await supabase
            .from('sections')
            .select('section_id, section_title, year_term, chat_model, super_model')
            .eq('enabled', true)
            .order('year_term', { ascending: false })
            .order('section_title', { ascending: true });

        if (fetchError) {
            console.error('Error fetching sections:', fetchError);
            setError('Could not load course sections from the database.');
        } else {
            setSections(data as Section[]);
            if (data.length === 0) {
                setSelectedSection('other');
            }
        }
    };
    
    const fetchModels = async () => {
        const { data, error: modelError } = await supabase
            .from('models')
            .select('model_id, model_name, default')
            .eq('enabled', true);
        
        if (modelError) {
            console.error('Error fetching models:', modelError);
            setError('Could not load AI models from the database.');
        } else {
            setModels(data);
            const defaultM = data.find(m => m.default);
            let initialModelId = null;
            if (defaultM) {
                initialModelId = defaultM.model_id;
            } else if (data.length > 0) {
                initialModelId = data[0].model_id;
            }
            
            if (initialModelId) {
                setDefaultModel(initialModelId);
                setSelectedChatModel(initialModelId);
                setSelectedSuperModel(initialModelId);
            }
        }
    };

    if (view === 'student' && conversationPhase === ConversationPhase.PRE_CHAT) {
        fetchModels();
        fetchSections();
    }
  }, [conversationPhase, view]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      !isLoading &&
      conversationPhase !== ConversationPhase.FEEDBACK_COMPLETE &&
      lastMessage?.role === MessageRole.MODEL
    ) {
      inputRef.current?.focus();
    }
  }, [messages, isLoading, conversationPhase]);

  const startConversation = useCallback(async (name: string, persona: CEOPersona, modelId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = createChatSession(name, persona, modelId);
      setChatSession(session);
      const firstMessage = `Hello ${name}, I am Kent Beck, the CEO of Malawi's Pizza. Thank you for meeting with me today. Our time is limited so let's get straight to my quandary: **Should we stay in the catering business, or is pizza catering a distraction from our core restaurant operations?**`;
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
    if (conversationPhase === ConversationPhase.CHATTING) {
        const lowerCaseMessage = userMessage.toLowerCase();
        if (lowerCaseMessage.includes("time is up") || lowerCaseMessage.includes("time's up")) {
            const finalUserMessage: Message = { role: MessageRole.USER, content: userMessage };
            const ceoPermissionRequest: Message = {
                role: MessageRole.MODEL,
                content: `${studentFirstName}, thank you for meeting with me. I am glad you were able to study this case and share your insights. I hope our conversation was challenging yet helpful. **Would you be willing to provide feedback by answering a few questions about our interaction?**`
            };
            setMessages(prev => [...prev, finalUserMessage, ceoPermissionRequest]);
            setConversationPhase(ConversationPhase.AWAITING_HELPFUL_PERMISSION);
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
            setError("An error occurred while communicating with the API.");
            const errorMessage: Message = {
                role: MessageRole.MODEL,
                content: "I seem to be having trouble connecting. Please try again in a moment.",
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    } else if (conversationPhase === ConversationPhase.AWAITING_HELPFUL_PERMISSION) {
        const userReply: Message = { role: MessageRole.USER, content: userMessage };
        setMessages(prev => [...prev, userReply]);
        
        const affirmative = ['yes', 'sure', 'ok', 'yeah', 'yep', 'absolutely', 'i would', 'of course'].some(word => userMessage.toLowerCase().includes(word));
        
        if (affirmative) {
            const ceoScoreRequest: Message = {
                role: MessageRole.MODEL,
                content: "Great! On a scale of 1 to 5, how helpful was our conversation in your thinking through this case situation? (1=not helpful, 5=extremely helpful)"
            };
            setMessages(prev => [...prev, ceoScoreRequest]);
            setConversationPhase(ConversationPhase.AWAITING_HELPFUL_SCORE);
        } else {
            // Student declined, proceed directly to evaluation without feedback.
            await handleProceedToEvaluation();
        }
    } else if (conversationPhase === ConversationPhase.AWAITING_HELPFUL_SCORE) {
        const userScoreReply: Message = { role: MessageRole.USER, content: userMessage };
        
        const numberMatch = userMessage.match(/\d(\.\d+)?/);
        let score: number | null = null;
        if (numberMatch && numberMatch[0]) {
            const parsedScore = parseFloat(numberMatch[0]);
            if (!isNaN(parsedScore) && parsedScore >= 1 && parsedScore <= 5) {
                score = parsedScore;
            }
        }
        setHelpfulScore(score);

        const ceoLikedRequest: Message = {
            role: MessageRole.MODEL,
            content: "Thank you. What did you **like most** about this simulated conversation?",
        };
        setMessages(prev => [...prev, userScoreReply, ceoLikedRequest]);
        setConversationPhase(ConversationPhase.AWAITING_LIKED_FEEDBACK);
    } else if (conversationPhase === ConversationPhase.AWAITING_LIKED_FEEDBACK) {
        const userLikedReply: Message = { role: MessageRole.USER, content: userMessage };
        setLikedFeedback(userMessage);

        const ceoImproveRequest: Message = {
            role: MessageRole.MODEL,
            content: "That's helpful. What way do you think this simulated conversation **might be improved**?",
        };
        setMessages(prev => [...prev, userLikedReply, ceoImproveRequest]);
        setConversationPhase(ConversationPhase.AWAITING_IMPROVE_FEEDBACK);
    } else if (conversationPhase === ConversationPhase.AWAITING_IMPROVE_FEEDBACK) {
        const userImproveReply: Message = { role: MessageRole.USER, content: userMessage };
        setImproveFeedback(userMessage);

        const ceoGoodbyeMessage: Message = {
            role: MessageRole.MODEL,
            content: `Thank you for your feedback, ${studentFirstName}. Goodbye and have a nice day. I am going to turn this over to the AI Supervisor to give you feedback.`,
        };
        setMessages(prev => [...prev, userImproveReply, ceoGoodbyeMessage]);
        setConversationPhase(ConversationPhase.FEEDBACK_COMPLETE);
    }
  };

  const sanitizeFeedback = (text: string | null): string | null => {
    if (!text) return null;
    // Light sanitization to remove common SQL injection characters as a defense-in-depth measure.
    // Supabase client library already provides protection against SQL injection.
    return text.replace(/;/g, '').replace(/--/g, '');
  };

  const handleProceedToEvaluation = async () => {
    if (!studentFirstName || !selectedSuperModel) return;
    setConversationPhase(ConversationPhase.EVALUATION_LOADING);
    setError(null);
    try {
      const fullName = `${tempFirstName.trim()} ${tempLastName.trim()}`;
      const result = await getEvaluation(messages, studentFirstName, fullName, selectedSuperModel);
      setEvaluationResult(result);
      
      if (studentDBId) {
        const sanitizedLiked = sanitizeFeedback(likedFeedback);
        // FIX: Corrected function call from `sanitize feedback` to `sanitizeFeedback`.
        const sanitizedImprove = sanitizeFeedback(improveFeedback);

        const { data: evaluationData, error: evaluationError } = await supabase
          .from('evaluations')
          .insert({
            student_id: studentDBId,
            score: result.totalScore,
            summary: result.summary,
            criteria: result.criteria,
            persona: ceoPersona,
            hints: result.hints,
            helpful: helpfulScore,
            liked: sanitizedLiked,
            improve: sanitizedImprove,
            chat_model: selectedChatModel,
            super_model: selectedSuperModel,
          })
          .select('created_at')
          .single();

        if (evaluationError) {
          console.error("Error saving evaluation:", evaluationError);
        } else if (evaluationData) {
          // If evaluation is saved, try to update the student's finished_at timestamp
          // using the timestamp from the evaluation record for consistency.
          const { error: studentUpdateError } = await supabase
            .from('students')
            .update({ finished_at: evaluationData.created_at })
            .eq('id', studentDBId)
            .select();
          if (studentUpdateError) console.error("Error updating student finished_at timestamp:", studentUpdateError);
        }
      }
      setConversationPhase(ConversationPhase.EVALUATING);
    } catch (e) {
      console.error("Failed to get evaluation:", e);
      setError("Sorry, there was an error generating your performance review. Please try again.");
      setConversationPhase(ConversationPhase.CHATTING);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempFirstName.trim() || !tempLastName.trim() || !selectedChatModel) return;
    
    // Prompt Injection Prevention: Validate names for allowed characters.
    const nameRegex = /^[\p{L}\s'-]+$/u;
    if (!nameRegex.test(tempFirstName.trim()) || !nameRegex.test(tempLastName.trim())) {
        setError("Names can only contain letters, spaces, hyphens (-), and apostrophes (').");
        setIsLoading(false);
        return;
    }

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

    const { data, error: insertError } = await supabase
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
    
    if (insertError) {
      console.error("Error saving student to database:", insertError);
      setError("Could not connect to the database to save session. Please check your Supabase configuration.");
      setIsLoading(false);
      return;
    }
    
    setStudentDBId(data.id);
    setStudentFirstName(trimmedFirstName);
    await startConversation(trimmedFirstName, ceoPersona, selectedChatModel);
    setIsLoading(false);
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
    setHelpfulScore(null);
    setLikedFeedback(null);
    setImproveFeedback(null);
    setSelectedChatModel(defaultModel);
    setSelectedSuperModel(defaultModel);
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const sectionId = e.target.value;
      setSelectedSection(sectionId);

      if (sectionId === 'other' || !sectionId) {
          setSelectedChatModel(defaultModel);
          setSelectedSuperModel(defaultModel);
      } else {
          const section = sections.find(s => s.section_id === sectionId);
          if (section) {
              setSelectedChatModel(section.chat_model || defaultModel);
              setSelectedSuperModel(section.super_model || defaultModel);
          }
      }
  };

  const handleAdminLogin = () => setIsAdminAuthenticated(true);
  
  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setIsAdminAuthenticated(false);
    // Redirect to student view after logout
    window.location.hash = '';
  };

  if (!isReady) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (view === 'admin') {
    if (isAdminAuthenticated) {
      return <Dashboard onLogout={handleAdminLogout} />;
    }
    return <Login onLoginSuccess={handleAdminLogin} />;
  }

  // --- Student View Rendering ---

  if (conversationPhase === ConversationPhase.PRE_CHAT) {
    const isSectionValid = (selectedSection === 'other' && otherSectionText.trim() !== '') || (selectedSection !== 'other' && selectedSection !== '');

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-200">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
          <div className="text-center">
            <h1
              className="text-3xl font-bold text-gray-900"
              title="admin"
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  window.location.hash = '#/admin';
                }
              }}
            >
              Chat with the CEO
            </h1>
            <p className="mt-2 text-gray-600">You will have a brief opportunity to chat with the (AI simulated) CEO about the case. Enter your name and course section and choose a CEO persona to begin.</p>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First name</label>
                  <input id="firstName" type="text" value={tempFirstName} onChange={(e) => setTempFirstName(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., Alex" required />
                </div>
                <div className="flex-1">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last name</label>
                  <input id="lastName" type="text" value={tempLastName} onChange={(e) => setTempLastName(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., Chen" required />
                </div>
            </div>
            <div>
              <label htmlFor="section" className="block text-sm font-medium text-gray-700">What course section are you in?</label>
              <select id="section" value={selectedSection} onChange={handleSectionChange} className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                <option value="" disabled>Click to select...</option>
                {sections.map((sec) => (<option key={sec.section_id} value={sec.section_id}>{sec.section_title} ({sec.year_term})</option>))}
                <option value="other">Other...</option>
              </select>
            </div>
            {selectedSection === 'other' && (
              <div>
                <label htmlFor="otherSection" className="block text-sm font-medium text-gray-700">Please specify your section</label>
                <input id="otherSection" type="text" value={otherSectionText} onChange={(e) => setOtherSectionText(e.target.value)} className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., BUSM 101" required />
              </div>
            )}
             <div>
                <label htmlFor="ceoPersona" className="block text-sm font-medium text-gray-700">CEO Personality</label>
                <p className="mt-1 text-xs text-gray-500">Determines how strictly the CEO requires you to cite case facts.</p>
                <select id="ceoPersona" value={ceoPersona} onChange={(e) => setCeoPersona(e.target.value as CEOPersona)} className="w-full px-4 py-2 mt-1 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    <option value={CEOPersona.MODERATE}>Moderate (Recommended)</option>
                    <option value={CEOPersona.STRICT}>Strict</option>
                    <option value={CEOPersona.LIBERAL}>Liberal</option>
                    <option value={CEOPersona.LEADING}>Leading</option>
                    <option value={CEOPersona.SYCOPHANTIC}>Sycophantic</option>
                </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={isLoading || !tempFirstName.trim() || !tempLastName.trim() || !isSectionValid} className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400">
              {isLoading ? 'Initializing...' : 'Start Chat'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const chatModelName = models.find(m => m.model_id === selectedChatModel)?.model_name || selectedChatModel;
  const superModelName = models.find(m => m.model_id === selectedSuperModel)?.model_name || selectedSuperModel;

  if (conversationPhase === ConversationPhase.EVALUATION_LOADING || conversationPhase === ConversationPhase.EVALUATING) {
    return <Evaluation result={evaluationResult} studentName={`${tempFirstName.trim()} ${tempLastName.trim()}` || 'Student'} onRestart={handleRestart} superModelName={superModelName} />;
  }

  return (
    <div className="h-screen w-screen p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 font-sans">
      <main className="lg:w-1/3 xl:w-1/4 h-1/2 lg:h-full">
        <BusinessCase fontSize={caseFontSize} onFontSizeChange={setCaseFontSize} />
      </main>
      <aside className="lg:w-2/3 xl:w-3/4 h-1/2 lg:h-full flex flex-col bg-gray-200 rounded-xl shadow-lg">
        {error && <div className="p-4 bg-red-500 text-white text-center font-semibold rounded-t-xl">{error}</div>}
        <ChatWindow messages={messages} isLoading={isLoading} ceoPersona={ceoPersona} chatModelName={chatModelName} chatFontSize={chatFontSize} />
        {conversationPhase === ConversationPhase.FEEDBACK_COMPLETE ? (
            <div className="p-4 bg-white border-t border-gray-200 flex justify-center items-center">
                <button
                    onClick={handleProceedToEvaluation}
                    className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 animate-pulse"
                >
                    Click here to engage the AI Supervisor
                </button>
            </div>
        ) : (
            <MessageInput ref={inputRef} onSendMessage={handleSendMessage} isLoading={isLoading} chatFontSize={chatFontSize} onFontSizeChange={setChatFontSize} />
        )}
      </aside>
    </div>
  );
};

export default App;