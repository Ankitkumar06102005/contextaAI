import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingHero } from './components/LandingHero';
import { WorkflowSection } from './components/WorkflowSection';
import { FeatureShowcase } from './components/FeatureShowcase';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { ConversationArea } from './components/ConversationArea';
import { QuizView } from './components/QuizView';
import { SourceInspector } from './components/SourceInspector';
import { Footer } from './components/Footer';
import { DocumentInfo, ChatMessage, QuizQuestion, SourceSnippet } from './types';
import { AlertCircle, X } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'workspace'>('landing');
  const [document, setDocument] = useState<DocumentInfo | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('contexta_active_doc');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [currentMode, setCurrentMode] = useState<'teacher' | 'summary' | 'quiz'>('teacher');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [pastQuestionHistory, setPastQuestionHistory] = useState<string[]>([]);
  const [activeQuizTopic, setActiveQuizTopic] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<SourceSnippet | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Sync active document to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (document) {
          localStorage.setItem('contexta_active_doc', JSON.stringify(document));
        } else {
          localStorage.removeItem('contexta_active_doc');
        }
      } catch (e) {
        console.warn('Failed to sync document to localStorage:', e);
      }
    }
  }, [document]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('contexta_dark_mode') : null;
    if (saved !== null) {
      return saved === 'true';
    }
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [showPets, setShowPets] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('contexta_show_pets') : null;
    return saved !== null ? saved === 'true' : true;
  });

  const togglePets = () => {
    setShowPets((prev) => {
      const next = !prev;
      localStorage.setItem('contexta_show_pets', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      window.document.documentElement.classList.add('dark');
      window.document.documentElement.classList.add('dark-mode');
      localStorage.setItem('contexta_dark_mode', 'true');
    } else {
      window.document.documentElement.classList.remove('dark');
      window.document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('contexta_dark_mode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorMessage((current) => (current === msg ? null : current));
    }, 6000);
  };

  // Safe JSON response parser that prevents raw HTML "SyntaxError: Unexpected token <" from surfacing
  const safeFetchJson = async (res: Response, actionName: string) => {
    const raw = await res.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        `${actionName} failed (Status ${res.status}): ${raw.slice(0, 120) || res.statusText || 'Non-JSON server response'}`
      );
    }
    if (!res.ok) {
      throw new Error(data.error || `${actionName} failed.`);
    }
    return data;
  };

  // 1. Upload PDF
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await safeFetchJson(res, 'PDF upload & indexing');

      const newDoc: DocumentInfo = {
        doc_id: data.doc_id,
        filename: data.filename,
        status: data.status,
        page_count: data.page_count,
        chunk_count: data.chunk_count,
        uploaded_at: new Date().toLocaleTimeString(),
      };

      setDocument(newDoc);
      setCurrentView('workspace');
      setCurrentMode('teacher');
      setMessages([
        {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          agent: 'teacher',
          text: `Document "${data.filename}" has been indexed into ${data.chunk_count} vector chunks across ${data.page_count} pages.\n\nI am your Teacher Agent. Ask any question about this document, or select "Summarize" or "Quiz Genie" from the menu.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      console.error('Upload failed:', err);
      showError(err.message || 'Error uploading document.');
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Load Sample Document
  const handleLoadSample = async () => {
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/sample-doc');
      const data = await safeFetchJson(res, 'Loading sample document');

      const sampleDoc: DocumentInfo = {
        doc_id: data.doc_id,
        filename: data.filename,
        status: data.status,
        page_count: data.page_count,
        chunk_count: data.chunk_count,
        uploaded_at: new Date().toLocaleTimeString(),
      };

      setDocument(sampleDoc);
      setCurrentView('workspace');
      setCurrentMode('teacher');
      setMessages([
        {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          agent: 'teacher',
          text: `Welcome! "${data.filename}" is preloaded and indexed with ${data.chunk_count} vector chunks across ${data.page_count} pages.\n\nTry asking: "Why does the architecture scale dot products by 1 / √d_k?" or click "Summarize" above.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      console.error('Sample loading failed:', err);
      showError(err.message || 'Error loading sample document.');
    } finally {
      setIsUploading(false);
    }
  };

  // 3. Send User Message (Chat)
  const handleSendMessage = async (text: string) => {
    let activeDoc = document;
    if (!activeDoc) {
      showError('No document attached. Please upload your PDF or load the sample paper first so Contexta AI knows which document to answer from.');
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: activeDoc.doc_id,
          message: text,
        }),
      });

      const data = await safeFetchJson(res, 'Generating answer');

      const assistantMsg: ChatMessage = {
        id: `msg-asst-${Date.now()}`,
        sender: 'assistant',
        agent: data.agent || 'teacher',
        text: data.answer,
        sources: data.sources || [],
        latency_ms: data.latency_ms,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat request failed:', err);
      showError(err.message || 'Failed to generate answer.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Trigger Summary Agent
  const handleTriggerSummary = async () => {
    if (!document) {
      showError('Please upload a PDF first.');
      return;
    }

    setCurrentMode('teacher');
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: 'Please generate a comprehensive, structured summary of this document.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: document.doc_id }),
      });

      const data = await safeFetchJson(res, 'Generating summary');

      const assistantMsg: ChatMessage = {
        id: `msg-asst-${Date.now()}`,
        sender: 'assistant',
        agent: 'summary',
        text: data.answer,
        sources: data.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Summary failed:', err);
      showError(err.message || 'Failed to summarize document.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Trigger Quiz Genie
  const handleGenerateQuiz = async (
    numQuestions: number = 10,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    topic?: string
  ) => {
    if (!document) {
      showError('Please upload a document to generate questions.');
      return;
    }

    setIsLoading(true);
    setCurrentMode('quiz');
    if (topic !== undefined) {
      setActiveQuizTopic(topic || null);
    }

    try {
      const res = await fetch('/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: document.doc_id,
          num_questions: numQuestions,
          difficulty,
          topic: topic || undefined,
          exclude_questions: pastQuestionHistory,
        }),
      });

      const data = await safeFetchJson(res, 'Generating questions');
      const questions: QuizQuestion[] = data.questions || [];

      setQuizQuestions(questions);
      if (questions.length > 0) {
        setPastQuestionHistory((prev) => [
          ...prev,
          ...questions.map((q) => q.question),
        ]);
      }
    } catch (err: any) {
      console.error('Quiz generation failed:', err);
      showError(err.message || 'Failed to generate questions.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Delete Document
  const handleDeleteDocument = async () => {
    if (!document) return;

    try {
      const res = await fetch(`/document/${encodeURIComponent(document.doc_id)}`, {
        method: 'DELETE',
      });

      await safeFetchJson(res, 'Deleting document index');

      setDocument(null);
      setMessages([]);
      setQuizQuestions([]);
      setActiveQuizTopic(null);
      setActiveSource(null);
      setIsInspectorOpen(false);
      setCurrentMode('teacher');
    } catch (err: any) {
      console.error('Delete failed:', err);
      showError(err.message || 'Failed to delete document.');
    }
  };

  // 7. Reset Chat Session
  const handleResetChat = () => {
    setMessages([]);
    setQuizQuestions([]);
    setActiveQuizTopic(null);
    setActiveSource(null);
    setCurrentMode('teacher');
  };

  // 8. Select Source for Inspector
  const handleSelectSource = (src: SourceSnippet) => {
    setActiveSource(src);
    setIsInspectorOpen(true);
  };

  useEffect(() => {
    if (currentView === 'workspace' && typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [currentView]);

  return (
    <div className={`flex flex-col bg-[#FAF8F9] dark:bg-[#090607] text-[#1E181D] dark:text-[#F7F3F6] transition-colors font-epilogue ${
      currentView === 'workspace' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
    }`}>
      {/* Toast Notification */}
      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[#FFFFFF] dark:bg-[#221F20] border border-[#C26E73]/40 shadow-xl rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#C26E73] shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-[#C26E73]">Notice</p>
            <p className="text-[#72656F] dark:text-[#BEB4BB] mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[#9E919B] dark:text-[#8E828B] hover:text-[#1E181D] dark:hover:text-[#F7F3F6] p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        activeDoc={!!document}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* View Switcher */}
      {currentView === 'landing' ? (
        <main className="flex-1">
          <LandingHero
            onFileUpload={handleFileUpload}
            onLoadSample={handleLoadSample}
            onOpenWorkspace={() => setCurrentView('workspace')}
            onAskQuestion={(question) => {
              setCurrentView('workspace');
              setCurrentMode('teacher');
              handleSendMessage(question);
            }}
            isUploading={isUploading}
            isDarkMode={isDarkMode}
          />
          <WorkflowSection />
          <FeatureShowcase onOpenWorkspace={() => setCurrentView('workspace')} />
          <Footer onOpenWorkspace={() => setCurrentView('workspace')} />
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* Left Sidebar */}
          <WorkspaceSidebar
            document={document}
            currentMode={currentMode}
            onSelectMode={(mode) => {
              setCurrentMode(mode);
              if (mode === 'quiz' && quizQuestions.length === 0 && document) {
                handleGenerateQuiz(10, 'medium');
              }
            }}
            onFileUpload={handleFileUpload}
            onLoadSample={handleLoadSample}
            onDeleteDocument={handleDeleteDocument}
            onResetChat={handleResetChat}
            onBackToLanding={() => setCurrentView('landing')}
            isUploading={isUploading}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            showPets={showPets}
            onTogglePets={togglePets}
            isOpenOnMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Central Workspace (Conversation or Quiz) */}
          {currentMode === 'quiz' ? (
            <QuizView
              document={document}
              quizQuestions={quizQuestions}
              isLoading={isLoading}
              isDarkMode={isDarkMode}
              showPets={showPets}
              activeTopic={activeQuizTopic}
              onGenerateQuiz={handleGenerateQuiz}
              onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
            />
          ) : (
            <ConversationArea
              document={document}
              messages={messages}
              isLoading={isLoading}
              isUploading={isUploading}
              isDarkMode={isDarkMode}
              showPets={showPets}
              onSendMessage={handleSendMessage}
              onSelectSource={handleSelectSource}
              onTriggerSummary={handleTriggerSummary}
              onTriggerQuiz={() => {
                setCurrentMode('quiz');
                if (quizQuestions.length === 0 && document) {
                  handleGenerateQuiz(10, 'medium');
                }
              }}
              onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
              onLoadSample={handleLoadSample}
              onFileUpload={handleFileUpload}
            />
          )}

          {/* Right Contextual Panel */}
          <SourceInspector
            document={document}
            activeSource={activeSource}
            isOpen={isInspectorOpen}
            onClose={() => setIsInspectorOpen(false)}
            onAskAboutSource={(prompt) => {
              setCurrentMode('teacher');
              handleSendMessage(prompt);
            }}
          />
        </main>
      )}
    </div>
  );
}
