import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  GraduationCap,
  FileCheck,
  BrainCircuit,
  CornerDownLeft,
  ExternalLink,
  Activity,
  Timer,
  Menu,
  UploadCloud,
  Paperclip
} from 'lucide-react';
import { ChatMessage, DocumentInfo, SourceSnippet } from '../types';
import { AcademicRenderer } from './AcademicRenderer';
import { MoonHorizon } from './MoonHorizon';
import { CatPet, CatPetState } from './CatPet';

interface ConversationAreaProps {
  document: DocumentInfo | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isUploading?: boolean;
  isDarkMode?: boolean;
  showPets?: boolean;
  onSendMessage: (text: string) => void;
  onSelectSource: (source: SourceSnippet) => void;
  onTriggerSummary: () => void;
  onTriggerQuiz: () => void;
  onToggleMobileSidebar?: () => void;
  onLoadSample?: () => void;
  onFileUpload?: (file: File) => void;
}

export const ConversationArea: React.FC<ConversationAreaProps> = ({
  document,
  messages,
  isLoading,
  isUploading = false,
  isDarkMode = true,
  showPets = true,
  onSendMessage,
  onSelectSource,
  onTriggerSummary,
  onTriggerQuiz,
  onToggleMobileSidebar,
  onLoadSample,
  onFileUpload,
}) => {
  const [inputText, setInputText] = useState('');
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [expandedLatencies, setExpandedLatencies] = useState<Record<string, boolean>>({});
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emptyFileInputRef = useRef<HTMLInputElement>(null);

  const handleEmptyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onFileUpload) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onFileUpload(file);
      }
    }
    e.target.value = '';
  };

  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    } else if (messagesContainerRef.current) {
      // In new session or when empty, stay strictly at top
      messagesContainerRef.current.scrollTop = 0;
    }
    // Guarantee window does not scroll down
    if (typeof window !== 'undefined' && window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const msg = inputText.trim();
    setInputText('');
    onSendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleSource = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const toggleLatency = (msgId: string) => {
    setExpandedLatencies((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const starterPrompts = [
    { label: '🎯 Generate 10 Practice Questions', prompt: 'Generate 10 distinct, non-repeating practice questions testing key concepts in this document with answers, explanations, and page citations.' },
    { label: '🧪 Questions on Specific Topic', prompt: 'Search the document and generate 10 questions focusing specifically on the attention mechanism and architecture.' },
    { label: 'Explain key concepts', prompt: 'Explain the most important concepts step-by-step.' },
    { label: 'Document overview', prompt: 'Summarize the primary thesis and findings of this document.' },
  ];

  // Derive pet state from actual app state
  const currentPetState: CatPetState = (() => {
    if (isLoading) return 'generating';
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender === 'assistant') {
      if (lastMsg.text.toLowerCase().includes("couldn't find this topic")) {
        return 'insufficient_evidence';
      }
      return 'ready';
    }
    return 'idle';
  })();

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF8F9] dark:bg-[#090607] overflow-hidden relative">
      {/* Hidden file input for uploading from any trigger button */}
      <input
        ref={emptyFileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleEmptyFileChange}
      />

      {/* Workspace Header */}
      <div className="h-14 px-3 sm:px-6 border-b border-[#E5DEE3] dark:border-[#40363E] bg-[#FFFFFF] dark:bg-[#221F20] flex items-center justify-between shrink-0 z-10 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile & Tablet Drawer Trigger */}
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl bg-[#F3EEF2] dark:bg-[#2B2429] hover:bg-[#EBE4E9] dark:hover:bg-[#382F35] text-[#1E181D] dark:text-[#F7F3F6] border border-[#E5DEE3] dark:border-[#40363E] transition-colors cursor-pointer shrink-0"
              title="Open Document & Modes Drawer"
              aria-label="Toggle document navigation"
            >
              <Menu className="w-4 h-4 text-[#AC1ED6] dark:text-[#E6B8F0]" />
            </button>
          )}

          {showPets ? (
            <CatPet state={currentPetState} size="sm" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-[#AC1ED6] shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-[#1E181D] dark:text-[#F7F3F6] truncate max-w-[160px] sm:max-w-xs md:max-w-md font-epilogue">
              {isUploading ? 'Indexing PDF...' : (document ? document.filename : 'No Document Active')}
            </h2>
            <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB] font-mono-code truncate">
              {isUploading
                ? 'Extracting text & vector embeddings...'
                : (document ? `${document.page_count} Pages · Grounded Retrieval` : 'Upload your PDF or select Sample Paper')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onFileUpload && (
            <button
              onClick={() => emptyFileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              title={document ? 'Upload a different PDF or re-upload' : 'Upload your PDF'}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#AC1ED6] to-[#9218B5] hover:opacity-95 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              {isUploading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5 text-white" />
              )}
              <span>{isUploading ? 'Indexing...' : (document ? 'Change PDF' : 'Upload PDF')}</span>
            </button>
          )}

          {!document && onLoadSample && (
            <button
              onClick={onLoadSample}
              disabled={isLoading}
              title="Load pre-indexed research paper"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#AC1ED6] dark:text-[#E6B8F0] bg-[#AC1ED6]/10 hover:bg-[#AC1ED6]/20 border border-[#AC1ED6]/30 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sample Paper</span>
            </button>
          )}

          <button
            onClick={onTriggerSummary}
            disabled={isLoading || !document}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1E181D] dark:text-[#F7F3F6] bg-[#F3EEF2] dark:bg-[#2B2429] hover:bg-[#EBE4E9] dark:hover:bg-[#382F35] border border-[#E5DEE3] dark:border-[#40363E] disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5 text-[#AC1ED6] dark:text-[#E6B8F0]" />
            <span>Summarize</span>
          </button>
          <button
            onClick={onTriggerQuiz}
            disabled={isLoading || !document}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-white bg-[#AC1ED6] hover:bg-[#9218B5] disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-white" />
            <span className="hidden xs:inline">Quiz Genie</span>
            <span className="xs:hidden">Quiz</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-3 sm:py-5 space-y-4 relative z-10">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-3.5 py-2 sm:py-4 relative">
            {/* Subtle Moon Horizon background in empty state */}
            <MoonHorizon isDarkMode={isDarkMode} intensity="subtle" />

            <div className="relative z-10 space-y-4 flex flex-col items-center w-full px-2">
              {showPets ? (
                <CatPet state={document ? 'ready' : 'idle'} size="lg" className="mx-auto" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#FFFFFF] dark:bg-[#221F20] border border-[#E5DEE3] dark:border-[#40363E] text-[#AC1ED6] dark:text-[#E6B8F0] flex items-center justify-center shadow-xs">
                  <GraduationCap className="w-7 h-7" />
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
                  Welcome to Contexta AI
                </h3>
                <p className="text-xs sm:text-sm text-[#72656F] dark:text-[#BEB4BB] leading-relaxed max-w-md">
                  {document
                    ? `Your document "${document.filename}" is indexed with Top-K 30 vector chunks. Ask any conceptual question or extract formulas below.`
                    : 'Start your learning session immediately with the pre-indexed research paper or upload your PDF.'}
                </p>
              </div>

              {/* Instant Actions for Empty State */}
              {!document ? (
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-md">
                  {onLoadSample && (
                    <button
                      onClick={onLoadSample}
                      disabled={isLoading}
                      className="w-full flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>Start with Sample Document</span>
                    </button>
                  )}
                  {onFileUpload && (
                    <button
                      onClick={() => emptyFileInputRef.current?.click()}
                      disabled={isLoading}
                      className="w-full flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#1E181D] dark:text-[#F7F3F6] bg-[#FFFFFF] dark:bg-[#221F20] border border-[#E5DEE3] dark:border-[#40363E] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-[#AC1ED6] dark:text-[#E6B8F0]" />
                      <span>Upload your PDF</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full space-y-3 pt-3">
                  <div className="p-3.5 bg-[#FFFFFF]/90 dark:bg-[#221F20]/90 backdrop-blur-md border border-[#AC1ED6]/40 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0 text-left">
                      <div className="w-8 h-8 rounded-lg bg-[#AC1ED6]/10 text-[#AC1ED6] dark:text-[#E6B8F0] flex items-center justify-center shrink-0 border border-[#AC1ED6]/20">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-[#1E181D] dark:text-[#F7F3F6] truncate">{document.filename}</p>
                        <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB] font-mono-code">{document.page_count} Pages · Vector Grounded</p>
                      </div>
                    </div>
                    {onFileUpload && (
                      <button
                        onClick={() => emptyFileInputRef.current?.click()}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] hover:bg-[#AC1ED6]/10 rounded-lg transition-colors shrink-0 cursor-pointer border border-[#AC1ED6]/40 whitespace-nowrap"
                      >
                        Re-upload / Switch
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] uppercase tracking-wider font-mono-code text-left">
                    Suggested Starter Inquiries
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {starterPrompts.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => onSendMessage(item.prompt)}
                        className="p-3 bg-[#FFFFFF]/95 dark:bg-[#221F20]/95 backdrop-blur-md hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] border border-[#E5DEE3] dark:border-[#40363E] hover:border-[#AC1ED6]/50 rounded-xl text-xs transition-all text-[#1E181D] dark:text-[#F7F3F6] space-y-0.5 cursor-pointer shadow-xs"
                      >
                        <p className="font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] font-epilogue">{item.label}</p>
                        <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB] line-clamp-1">{item.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px] text-[#72656F] dark:text-[#BEB4BB]">
                {msg.sender === 'assistant' && showPets && (
                  <CatPet
                    state={msg.text.toLowerCase().includes("couldn't find this topic") ? 'insufficient_evidence' : 'ready'}
                    size="sm"
                  />
                )}
                <span
                  className="font-semibold text-[#72656F] dark:text-[#BEB4BB] font-epilogue"
                  style={{ color: isDarkMode ? '#BEB4BB' : '#72656F' }}
                >
                  {msg.sender === 'user' ? 'You' : msg.agent === 'summary' ? 'Summary Agent' : 'Teacher Agent'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-code" style={{ color: isDarkMode ? '#8E828B' : '#9E919B' }}>{msg.timestamp}</span>
              </div>

              {/* Message Bubble / Card */}
              <div
                className={`max-w-2xl sm:max-w-3xl rounded-2xl p-5 text-sm leading-relaxed transition-all ${
                  msg.sender === 'user'
                    ? 'bg-[#2B2429] text-[#F7F3F6] border border-[#AC1ED6]/30 shadow-xs rounded-tr-xs'
                    : 'bg-[#FFFFFF] dark:bg-[#221F20] text-[#1E181D] dark:text-[#F7F3F6] border border-[#E5DEE3] dark:border-[#40363E] shadow-md rounded-tl-xs space-y-3'
                }`}
                style={{
                  color: msg.sender === 'user' ? '#F7F3F6' : (isDarkMode ? '#F7F3F6' : '#1E181D'),
                  backgroundColor: msg.sender === 'user' ? '#2B2429' : (isDarkMode ? '#221F20' : '#FFFFFF'),
                }}
              >
                {msg.sender === 'user' ? (
                  <div className="whitespace-pre-wrap font-normal text-[#F7F3F6]">
                    {msg.text}
                  </div>
                ) : (
                  <AcademicRenderer content={msg.text} isDarkMode={isDarkMode} />
                )}

                {/* Grounded Sources Drawer for Assistant Messages */}
                {msg.sender === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#F3EEF2] dark:border-[#2B2429] space-y-2">
                    <button
                      onClick={() => toggleSource(msg.id)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] hover:opacity-85 transition-opacity cursor-pointer font-epilogue"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#AC1ED6] dark:text-[#E6B8F0]" />
                        Retrieved Document Sources ({msg.sources.length})
                      </span>
                      {expandedSources[msg.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {expandedSources[msg.id] && (
                      <div className="space-y-2 pt-1">
                        {msg.sources.map((src, idx) => (
                          <div
                            key={src.chunk_id || idx}
                            className="p-3 bg-[#FAF8F9] dark:bg-[#1A1618] border border-[#E5DEE3] dark:border-[#40363E] rounded-xl text-xs space-y-1.5 hover:border-[#AC1ED6]/40 transition-colors"
                            style={{
                              backgroundColor: isDarkMode ? '#1A1618' : '#FAF8F9',
                            }}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono-code font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] bg-[#FFFFFF] dark:bg-[#221F20] px-1.5 py-0.5 rounded border border-[#E5DEE3] dark:border-[#40363E]">
                                Page {src.page}
                              </span>
                              <button
                                onClick={() => onSelectSource(src)}
                                className="text-[#C26E73] hover:text-[#AC1ED6] dark:hover:text-[#E6B8F0] font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                View passage <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                            <p
                              className="text-[#72656F] dark:text-[#BEB4BB] italic text-xs leading-normal"
                              style={{ color: isDarkMode ? '#BEB4BB' : '#72656F' }}
                            >
                              "{src.text.slice(0, 300)}{src.text.length > 300 ? '...' : ''}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Latency Benchmarking Ribbon for Assistant Messages */}
                {msg.sender === 'assistant' && msg.latency_ms && (
                  <div className="pt-2 border-t border-[#F3EEF2] dark:border-[#2B2429]">
                    <button
                      onClick={() => toggleLatency(msg.id)}
                      className="flex items-center gap-2 text-[11px] text-[#72656F] dark:text-[#BEB4BB] hover:text-[#1E181D] dark:hover:text-[#F7F3F6] transition-colors"
                    >
                      <Timer className="w-3 h-3 text-[#AC1ED6] dark:text-[#E6B8F0]" />
                      <span className="font-mono-code">RAG Latency: {msg.latency_ms.total_ms}ms total</span>
                      {expandedLatencies[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {expandedLatencies[msg.id] && (
                      <div
                        className="mt-2 p-2.5 bg-[#FAF8F9] dark:bg-[#1A1618] rounded-xl border border-[#E5DEE3] dark:border-[#40363E] text-[11px] font-mono-code text-[#72656F] dark:text-[#BEB4BB] grid grid-cols-2 sm:grid-cols-3 gap-2"
                        style={{
                          backgroundColor: isDarkMode ? '#1A1618' : '#FAF8F9',
                          color: isDarkMode ? '#BEB4BB' : '#72656F',
                        }}
                      >
                        <div>Embedding: <span className="text-[#1E181D] dark:text-[#F7F3F6] font-semibold">{msg.latency_ms.embedding_ms}ms</span></div>
                        <div>FAISS Top-30: <span className="text-[#1E181D] dark:text-[#F7F3F6] font-semibold">{msg.latency_ms.search_ms}ms</span></div>
                        <div>Filtering: <span className="text-[#1E181D] dark:text-[#F7F3F6] font-semibold">{msg.latency_ms.filtering_ms}ms</span></div>
                        <div>Context: <span className="text-[#1E181D] dark:text-[#F7F3F6] font-semibold">{msg.latency_ms.context_assembly_ms}ms</span></div>
                        <div>Generation: <span className="text-[#1E181D] dark:text-[#F7F3F6] font-semibold">{msg.latency_ms.generation_ms}ms</span></div>
                        <div>Total: <span className="text-[#AC1ED6] dark:text-[#E6B8F0] font-semibold">{msg.latency_ms.total_ms}ms</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col items-start space-y-2">
            <div className="flex items-center gap-2 px-1">
              {showPets && <CatPet state="generating" size="sm" />}
              <span className="text-[11px] font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] font-mono-code">
                Contexta AI is thinking...
              </span>
            </div>
            <div className="bg-[#FFFFFF] dark:bg-[#221F20] border border-[#E5DEE3] dark:border-[#40363E] rounded-2xl rounded-tl-xs p-4 flex items-center gap-3 shadow-xs">
              <div className="w-4 h-4 border-2 border-[#AC1ED6] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#72656F] dark:text-[#BEB4BB]">
                Retrieving Top-30 vector chunks and validating citations...
              </span>
            </div>
          </div>
        )}

        {messages.length > 0 && <div ref={messagesEndRef} />}
      </div>

      {/* Message Composer */}
      <div className="p-3 sm:p-5 bg-[#FFFFFF] dark:bg-[#221F20] border-t border-[#E5DEE3] dark:border-[#40363E] shrink-0 z-10 transition-colors">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-2">
          {/* Quick Action Chips & Active Document Bar */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="text-[11px] text-[#9E919B] dark:text-[#8E828B] whitespace-nowrap font-mono-code">Mode:</span>
              <button
                type="button"
                onClick={() => {
                  if (textareaRef.current) {
                    textareaRef.current.value = 'Explain the following concept: ';
                    textareaRef.current.focus();
                  }
                }}
                className="px-2.5 py-1 bg-[#F3EEF2] dark:bg-[#2B2429] hover:bg-[#EBE4E9] dark:hover:bg-[#382F35] text-[#1E181D] dark:text-[#F7F3F6] rounded-lg transition-colors whitespace-nowrap font-medium cursor-pointer"
              >
                Explain
              </button>
              <button
                type="button"
                onClick={onTriggerSummary}
                disabled={isLoading || !document}
                className="px-2.5 py-1 bg-[#F3EEF2] dark:bg-[#2B2429] hover:bg-[#EBE4E9] dark:hover:bg-[#382F35] text-[#1E181D] dark:text-[#F7F3F6] rounded-lg transition-colors whitespace-nowrap font-medium disabled:opacity-50 cursor-pointer"
              >
                Summarize
              </button>
              <button
                type="button"
                onClick={onTriggerQuiz}
                disabled={isLoading || !document}
                className="px-2.5 py-1 bg-[#F3EEF2] dark:bg-[#2B2429] hover:bg-[#EBE4E9] dark:hover:bg-[#382F35] text-[#1E181D] dark:text-[#F7F3F6] rounded-lg transition-colors whitespace-nowrap font-medium disabled:opacity-50 cursor-pointer"
              >
                Quiz
              </button>
            </div>

            {/* Document Indicator & Re-upload Trigger */}
            {isUploading ? (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-[#AC1ED6]/10 text-[#AC1ED6] dark:text-[#E6B8F0] border border-[#AC1ED6]/30 rounded-lg text-xs font-mono-code shrink-0">
                <div className="w-3 h-3 border-2 border-[#AC1ED6] border-t-transparent rounded-full animate-spin" />
                <span>Indexing new PDF...</span>
              </div>
            ) : document ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#AC1ED6]/10 text-[#AC1ED6] dark:text-[#E6B8F0] border border-[#AC1ED6]/30 rounded-lg text-xs font-mono-code shrink-0">
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate max-w-[130px] sm:max-w-[200px]" title={document.filename}>{document.filename}</span>
                {onFileUpload && (
                  <button
                    type="button"
                    onClick={() => emptyFileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="underline hover:text-[#9218B5] cursor-pointer ml-1 font-sans text-[11px]"
                    title="Upload or switch PDF"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs bg-[#C26E73]/10 border border-[#C26E73]/30 text-[#C26E73] px-2.5 py-1 rounded-lg shrink-0">
                <span className="text-[11px]">No PDF attached</span>
                {onFileUpload && (
                  <button
                    type="button"
                    onClick={() => emptyFileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="font-semibold underline hover:opacity-80 cursor-pointer text-[11px]"
                  >
                    Upload PDF
                  </button>
                )}
                {onLoadSample && (
                  <>
                    <span className="text-[10px] text-[#72656F] dark:text-[#BEB4BB]">or</span>
                    <button
                      type="button"
                      onClick={onLoadSample}
                      disabled={isLoading || isUploading}
                      className="font-semibold underline hover:opacity-80 cursor-pointer text-[11px]"
                    >
                      Sample
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="relative flex items-end bg-[#FAF8F9] dark:bg-[#1A1618] border border-[#E5DEE3] dark:border-[#40363E] focus-within:border-[#AC1ED6] dark:focus-within:border-[#E6B8F0] focus-within:ring-1 focus-within:ring-[#AC1ED6] rounded-2xl p-2 transition-all">
            {onFileUpload && (
              <button
                type="button"
                onClick={() => emptyFileInputRef.current?.click()}
                disabled={isLoading || isUploading}
                title={isUploading ? 'Indexing PDF...' : (document ? `Attached: ${document.filename} (Click to re-upload / change PDF)` : 'Upload & attach PDF')}
                className="p-2 text-[#72656F] dark:text-[#BEB4BB] hover:text-[#AC1ED6] dark:hover:text-[#E6B8F0] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] rounded-xl transition-colors shrink-0 cursor-pointer mb-0.5 disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-[#AC1ED6] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>
            )}

            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={
                document
                  ? 'Ask a question grounded in the document (Press Enter to send, Shift+Enter for new line)...'
                  : 'No document attached. Click the paperclip or Upload button above to attach a PDF...'
              }
              className="w-full bg-transparent resize-none text-xs sm:text-sm text-[#1E181D] dark:text-[#F7F3F6] placeholder-[#9E919B] dark:placeholder-[#8E828B] focus:outline-none p-2 leading-relaxed"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 text-white bg-[#AC1ED6] hover:bg-[#9218B5] disabled:bg-[#E5DEE3] dark:disabled:bg-[#40363E] disabled:text-[#9E919B] dark:disabled:text-[#8E828B] rounded-xl transition-all shrink-0 shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
