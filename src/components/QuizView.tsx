import React, { useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Award,
  Menu,
  Search,
  Hash,
  X,
  Layers,
  ListFilter
} from 'lucide-react';
import { DocumentInfo, QuizQuestion } from '../types';
import { CatPet } from './CatPet';

interface QuizViewProps {
  document: DocumentInfo | null;
  quizQuestions: QuizQuestion[];
  isLoading: boolean;
  isDarkMode?: boolean;
  showPets?: boolean;
  activeTopic?: string | null;
  onGenerateQuiz: (numQuestions: number, difficulty: 'easy' | 'medium' | 'hard', topic?: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  document,
  quizQuestions,
  isLoading,
  isDarkMode = true,
  showPets = true,
  activeTopic = null,
  onGenerateQuiz,
  onToggleMobileSidebar,
}) => {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [topicInput, setTopicInput] = useState<string>(activeTopic || '');
  const [currentSelectedTopic, setCurrentSelectedTopic] = useState<string | null>(activeTopic || null);
  const [viewMode, setViewMode] = useState<'stepper' | 'all'>('stepper');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ questionIndex: number; selected: string; isCorrect: boolean }[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const suggestedTopics = [
    'Attention Mechanisms',
    'Self-Attention & Multi-Head',
    'Positional Encoding',
    'Residual Connections',
    'Layer Normalization',
    'Training & Optimization',
  ];

  const currentQuestion: QuizQuestion | undefined = quizQuestions[currentIndex];

  const handleSelectOption = (option: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(option);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || !currentQuestion || isAnswerSubmitted) return;

    const isCorrect = selectedOption === currentQuestion.correct_answer;
    setIsAnswerSubmitted(true);
    setUserAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionIndex !== currentIndex);
      return [...filtered, { questionIndex: currentIndex, selected: selectedOption, isCorrect }];
    });
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < quizQuestions.length) {
      goToQuestion(currentIndex + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  };

  const goToQuestion = (idx: number) => {
    setCurrentIndex(idx);
    const existing = userAnswers.find((a) => a.questionIndex === idx);
    if (existing) {
      setSelectedOption(existing.selected);
      setIsAnswerSubmitted(true);
    } else {
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setUserAnswers([]);
    setQuizCompleted(false);
  };

  const handleTriggerGenerate = (topicToUse?: string) => {
    handleRestartQuiz();
    const finalTopic = topicToUse !== undefined ? topicToUse : (currentSelectedTopic || undefined);
    onGenerateQuiz(numQuestions, difficulty, finalTopic);
  };

  const handleSearchTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = topicInput.trim();
    setCurrentSelectedTopic(trimmed || null);
    handleTriggerGenerate(trimmed || undefined);
  };

  const handleSelectTopicPill = (pill: string) => {
    setTopicInput(pill);
    setCurrentSelectedTopic(pill);
    handleTriggerGenerate(pill);
  };

  const handleClearTopic = () => {
    setTopicInput('');
    setCurrentSelectedTopic(null);
    handleTriggerGenerate('');
  };

  const score = userAnswers.filter((a) => a.isCorrect).length;
  const percentage = quizQuestions.length > 0 ? Math.round((score / quizQuestions.length) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF8F9] dark:bg-[#090607] overflow-y-auto p-4 sm:p-8 transition-colors">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header Configuration Card */}
        <div className="bg-[#FFFFFF] dark:bg-[#221F20] rounded-2xl p-5 sm:p-6 border border-[#E5DEE3] dark:border-[#40363E] shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F3EEF2] dark:border-[#2B2429]">
            <div className="flex items-center gap-3">
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
              <div className="w-10 h-10 rounded-xl bg-[#F3E2F7] dark:bg-[#2B2429] text-[#AC1ED6] dark:text-[#E6B8F0] flex items-center justify-center border border-[#E5DEE3] dark:border-[#40363E] shrink-0">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue flex items-center gap-2">
                  <span>Quiz Genie</span>
                  <span className="text-[10px] font-mono-code font-normal px-2 py-0.5 rounded-full bg-[#F3E2F7] dark:bg-[#2B2429] text-[#AC1ED6] dark:text-[#E6B8F0] border border-[#E5DEE3] dark:border-[#40363E]">
                    10+ Fresh Questions
                  </span>
                </h2>
                <p className="text-xs text-[#72656F] dark:text-[#BEB4BB]">
                  Generates 10+ grounded, non-repeating questions on any topic or the full document
                </p>
              </div>
            </div>

            {/* Difficulty & Count Selectors */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-[#FAF8F9] dark:bg-[#1A1618] border border-[#E5DEE3] dark:border-[#40363E] rounded-xl text-[#1E181D] dark:text-[#F7F3F6] font-medium focus:outline-none focus:border-[#AC1ED6] dark:focus:border-[#E6B8F0] cursor-pointer"
              >
                <option value="easy">Easy Difficulty</option>
                <option value="medium">Medium Difficulty</option>
                <option value="hard">Hard Difficulty</option>
              </select>

              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                className="px-2.5 py-1.5 text-xs bg-[#FAF8F9] dark:bg-[#1A1618] border border-[#E5DEE3] dark:border-[#40363E] rounded-xl text-[#1E181D] dark:text-[#F7F3F6] font-medium focus:outline-none focus:border-[#AC1ED6] dark:focus:border-[#E6B8F0] cursor-pointer"
              >
                <option value={10}>10 Questions (Standard)</option>
                <option value={12}>12 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={5}>5 Questions (Quick)</option>
              </select>

              <button
                onClick={() => handleTriggerGenerate()}
                disabled={!document || isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] disabled:bg-[#E5DEE3] dark:disabled:bg-[#40363E] disabled:text-[#9E919B] dark:disabled:text-[#8E828B] rounded-xl transition-all whitespace-nowrap shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Generating 10...' : 'Generate New Questions'}</span>
              </button>
            </div>
          </div>

          {/* Topic Search & Specific Topic Question Generation */}
          <div className="space-y-2.5 pt-1">
            <form onSubmit={handleSearchTopicSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#AC1ED6] dark:text-[#E6B8F0]" />
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Ask questions on a specific topic (e.g., 'Attention Mechanism', 'Backpropagation')..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-[#FAF8F9] dark:bg-[#1A1618] border border-[#E5DEE3] dark:border-[#40363E] rounded-xl text-[#1E181D] dark:text-[#F7F3F6] placeholder-[#9E919B] dark:placeholder-[#8E828B] focus:outline-none focus:border-[#AC1ED6] dark:focus:border-[#E6B8F0] transition-colors"
                />
                {topicInput && (
                  <button
                    type="button"
                    onClick={() => setTopicInput('')}
                    className="absolute right-2.5 top-2.5 text-[#9E919B] hover:text-[#1E181D] dark:hover:text-[#F7F3F6]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!document || isLoading || !topicInput.trim()}
                className="px-4 py-2 text-xs font-semibold text-[#1E181D] dark:text-[#F7F3F6] bg-[#F3EEF2] dark:bg-[#2B2429] hover:bg-[#EBE4E9] dark:hover:bg-[#382F35] disabled:opacity-50 border border-[#E5DEE3] dark:border-[#40363E] rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                <Search className="w-3 h-3 text-[#AC1ED6] dark:text-[#E6B8F0]" />
                <span>Search & Ask on Topic</span>
              </button>
            </form>

            {/* Topic Suggested Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-[11px] text-[#9E919B] dark:text-[#8E828B] font-mono-code mr-1">
                Quick Topics:
              </span>
              <button
                onClick={handleClearTopic}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  !currentSelectedTopic
                    ? 'bg-[#AC1ED6] text-white border-[#AC1ED6]'
                    : 'bg-[#FAF8F9] dark:bg-[#1A1618] border-[#E5DEE3] dark:border-[#40363E] text-[#72656F] dark:text-[#BEB4BB] hover:border-[#AC1ED6]/50'
                }`}
              >
                All Document (Comprehensive)
              </button>

              {suggestedTopics.map((topic) => {
                const isActive = currentSelectedTopic?.toLowerCase() === topic.toLowerCase();
                return (
                  <button
                    key={topic}
                    onClick={() => handleSelectTopicPill(topic)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#AC1ED6] text-white border-[#AC1ED6]'
                        : 'bg-[#FAF8F9] dark:bg-[#1A1618] border-[#E5DEE3] dark:border-[#40363E] text-[#72656F] dark:text-[#BEB4BB] hover:border-[#AC1ED6]/50'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>

            {/* Active Topic Banner */}
            {currentSelectedTopic && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#F3E2F7] dark:bg-[#2B2429] border border-[#AC1ED6]/30 rounded-xl text-xs">
                <span className="text-[#AC1ED6] dark:text-[#E6B8F0] font-medium">
                  🎯 Focused Topic: <strong>{currentSelectedTopic}</strong> (Questions tailored specifically to this concept)
                </span>
                <button
                  onClick={handleClearTopic}
                  className="text-xs text-[#AC1ED6] dark:text-[#E6B8F0] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Topic</span>
                </button>
              </div>
            )}
          </div>

          {/* Document Context Ribbon */}
          {document && (
            <div className="flex flex-wrap items-center justify-between text-xs text-[#72656F] dark:text-[#BEB4BB] pt-1 border-t border-[#F3EEF2] dark:border-[#2B2429]">
              <span>Active Source: <strong className="text-[#1E181D] dark:text-[#F7F3F6]">{document.filename}</strong></span>
              <div className="flex items-center gap-3 font-mono-code text-[11px]">
                <span>{document.page_count} Pages Indexed</span>
                <span>•</span>
                <span>Entropy Nonce: Always New</span>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-[#FFFFFF] dark:bg-[#221F20] rounded-2xl p-12 border border-[#E5DEE3] dark:border-[#40363E] text-center space-y-4 shadow-xs">
            {showPets ? (
              <CatPet state="generating" size="lg" className="mx-auto" />
            ) : (
              <div className="w-8 h-8 border-3 border-[#AC1ED6] border-t-transparent rounded-full animate-spin mx-auto" />
            )}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
                Generating 10 brand-new, grounded questions...
              </h3>
              <p className="text-xs text-[#72656F] dark:text-[#BEB4BB]">
                {currentSelectedTopic
                  ? `Searching passages related to "${currentSelectedTopic}" and constructing fresh multiple-choice questions.`
                  : 'Sampling diverse sections across the document and formulating non-repeating questions.'}
              </p>
            </div>
          </div>
        )}

        {/* Active Quiz Question Display */}
        {!isLoading && quizQuestions.length > 0 && !quizCompleted && currentQuestion && (
          <div className="space-y-4">
            {/* View Mode Toggle & Question Jump Navigator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#221F20] p-3.5 rounded-xl border border-[#E5DEE3] dark:border-[#40363E] shadow-xs">
              {/* Question Number Pills for Direct Navigation */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-[11px] font-mono-code text-[#9E919B] dark:text-[#8E828B] mr-1 shrink-0">
                  Questions:
                </span>
                {quizQuestions.map((_, qIdx) => {
                  const answered = userAnswers.find((a) => a.questionIndex === qIdx);
                  const isCur = qIdx === currentIndex;

                  let styleClass = 'bg-[#FAF8F9] dark:bg-[#1A1618] border-[#E5DEE3] dark:border-[#40363E] text-[#72656F] dark:text-[#BEB4BB]';
                  if (isCur) {
                    styleClass = 'bg-[#AC1ED6] text-white border-[#AC1ED6] shadow-xs font-bold';
                  } else if (answered) {
                    styleClass = answered.isCorrect
                      ? 'bg-[#F3E2F7] dark:bg-[#2B2429] border-[#AC1ED6] text-[#AC1ED6] dark:text-[#E6B8F0] font-semibold'
                      : 'bg-[#FAEBEB] dark:bg-[#331A1E] border-[#C2454E] text-[#C2454E] dark:text-[#F08080] font-semibold';
                  }

                  return (
                    <button
                      key={qIdx}
                      onClick={() => goToQuestion(qIdx)}
                      className={`w-7 h-7 rounded-lg border text-xs font-mono-code flex items-center justify-center transition-all cursor-pointer shrink-0 ${styleClass}`}
                      title={`Go to Question ${qIdx + 1}`}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 self-end sm:self-center">
                <button
                  onClick={() => setViewMode('stepper')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'stepper'
                      ? 'bg-[#AC1ED6] text-white'
                      : 'text-[#72656F] dark:text-[#BEB4BB] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429]'
                  }`}
                >
                  <Hash className="w-3 h-3" />
                  <span>Card View</span>
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'all'
                      ? 'bg-[#AC1ED6] text-white'
                      : 'text-[#72656F] dark:text-[#BEB4BB] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429]'
                  }`}
                >
                  <ListFilter className="w-3 h-3" />
                  <span>All 10 View</span>
                </button>
              </div>
            </div>

            {/* Stepper Card View */}
            {viewMode === 'stepper' ? (
              <div className="bg-[#FFFFFF] dark:bg-[#221F20] rounded-2xl p-6 sm:p-8 border border-[#E5DEE3] dark:border-[#40363E] shadow-sm space-y-6">
                {/* Progress Header */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] uppercase tracking-wider font-mono-code flex items-center gap-2">
                    <span>Question {currentIndex + 1} of {quizQuestions.length}</span>
                    {currentSelectedTopic && (
                      <span className="text-[10px] text-[#72656F] dark:text-[#BEB4BB] lowercase">
                        • {currentSelectedTopic}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#9E919B] dark:text-[#8E828B]">Answered:</span>
                    <span className="font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] bg-[#F3EEF2] dark:bg-[#2B2429] px-2 py-0.5 rounded-lg border border-[#E5DEE3] dark:border-[#40363E] font-mono-code">
                      {userAnswers.length}/{quizQuestions.length}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-[#F3EEF2] dark:bg-[#2B2429] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#AC1ED6] to-[#C26E73] transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / quizQuestions.length) * 100}%` }}
                  />
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold text-[#1E181D] dark:text-[#F7F3F6] leading-snug font-epilogue">
                    {currentQuestion.question}
                  </h3>
                  {currentQuestion.source_pages && currentQuestion.source_pages.length > 0 && (
                    <p className="text-xs text-[#72656F] dark:text-[#BEB4BB] font-mono-code">
                      Referenced in Document: Page {currentQuestion.source_pages.join(', ')}
                    </p>
                  )}
                </div>

                {/* 4 Options */}
                <div className="space-y-2.5">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrect = option === currentQuestion.correct_answer;

                    let stateClasses = 'bg-[#FAF8F9] dark:bg-[#2B2429] border-[#E5DEE3] dark:border-[#40363E] text-[#1E181D] dark:text-[#F7F3F6] hover:bg-[#F3EEF2] dark:hover:bg-[#382F35] hover:border-[#AC1ED6]/50';

                    if (isAnswerSubmitted) {
                      if (isCorrect) {
                        stateClasses = 'bg-[#F8EDFB] dark:bg-[#2A1D30] border-[#AC1ED6] text-[#AC1ED6] dark:text-[#E6B8F0] font-semibold';
                      } else if (isSelected && !isCorrect) {
                        stateClasses = 'bg-[#FAEBEB] dark:bg-[#331A1E] border-[#C2454E] text-[#C2454E] dark:text-[#F08080] font-medium';
                      } else {
                        stateClasses = 'bg-[#FAF8F9] dark:bg-[#1A1618] border-[#E5DEE3] dark:border-[#40363E] text-[#9E919B] dark:text-[#8E828B] opacity-60';
                      }
                    } else if (isSelected) {
                      stateClasses = 'bg-[#F3E2F7] dark:bg-[#34203A] border-[#AC1ED6] text-[#1E181D] dark:text-[#F7F3F6] font-semibold ring-1 ring-[#AC1ED6]';
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(option)}
                        disabled={isAnswerSubmitted}
                        className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${stateClasses}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md bg-white/70 dark:bg-black/30 border border-current/20 flex items-center justify-center text-xs font-mono-code font-semibold shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{option}</span>
                        </div>

                        {isAnswerSubmitted && (
                          <div className="shrink-0 ml-2">
                            {isCorrect && <CheckCircle2 className="w-5 h-5 text-[#AC1ED6] dark:text-[#E6B8F0]" />}
                            {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-[#C2454E] dark:text-[#F08080]" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation card after submit */}
                {isAnswerSubmitted && (
                  <div className="p-4 bg-[#FAF8F9] dark:bg-[#1A1618] rounded-xl border border-[#E5DEE3] dark:border-[#40363E] text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] font-epilogue">
                        Verified Explanation & Page Citation:
                      </span>
                      {currentQuestion.source_pages && (
                        <span className="font-mono-code text-[11px] text-[#AC1ED6] dark:text-[#E6B8F0] bg-[#FFFFFF] dark:bg-[#221F20] px-1.5 py-0.5 rounded border border-[#E5DEE3] dark:border-[#40363E]">
                          Page {currentQuestion.source_pages.join(', ')}
                        </span>
                      )}
                    </div>
                    <p className="text-[#72656F] dark:text-[#BEB4BB] leading-relaxed">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-[#F3EEF2] dark:border-[#2B2429]">
                  <button
                    onClick={handlePrevQuestion}
                    disabled={currentIndex === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#72656F] dark:text-[#BEB4BB] hover:text-[#1E181D] dark:hover:text-[#F7F3F6] disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {!isAnswerSubmitted ? (
                      <button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedOption}
                        className="px-6 py-2.5 text-xs font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] disabled:bg-[#E5DEE3] dark:disabled:bg-[#40363E] disabled:text-[#9E919B] dark:disabled:text-[#8E828B] rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        <span>{currentIndex + 1 < quizQuestions.length ? 'Next Question' : 'View Final Score'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* All Questions List View */
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2 text-xs text-[#72656F] dark:text-[#BEB4BB]">
                  <span>Showing all <strong>{quizQuestions.length}</strong> questions on {currentSelectedTopic || document?.filename}</span>
                  <button
                    onClick={() => setQuizCompleted(true)}
                    className="text-xs font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] hover:underline cursor-pointer"
                  >
                    Finish Quiz & Score
                  </button>
                </div>

                {quizQuestions.map((q, qIndex) => {
                  const existingAnswer = userAnswers.find((a) => a.questionIndex === qIndex);
                  return (
                    <div
                      key={qIndex}
                      className="bg-[#FFFFFF] dark:bg-[#221F20] rounded-2xl p-5 border border-[#E5DEE3] dark:border-[#40363E] shadow-xs space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] font-mono-code uppercase">
                          Question {qIndex + 1}
                        </span>
                        {q.source_pages && (
                          <span className="font-mono-code text-[11px] text-[#72656F] dark:text-[#BEB4BB]">
                            Page {q.source_pages.join(', ')}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
                        {q.question}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, optIdx) => {
                          const isPicked = existingAnswer?.selected === opt;
                          const isCorrect = opt === q.correct_answer;

                          let cls = 'bg-[#FAF8F9] dark:bg-[#2B2429] border-[#E5DEE3] dark:border-[#40363E] text-[#1E181D] dark:text-[#F7F3F6]';
                          if (existingAnswer) {
                            if (isCorrect) {
                              cls = 'bg-[#F8EDFB] dark:bg-[#2A1D30] border-[#AC1ED6] text-[#AC1ED6] dark:text-[#E6B8F0] font-semibold';
                            } else if (isPicked && !isCorrect) {
                              cls = 'bg-[#FAEBEB] dark:bg-[#331A1E] border-[#C2454E] text-[#C2454E] dark:text-[#F08080]';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                goToQuestion(qIndex);
                                setViewMode('stepper');
                                setSelectedOption(opt);
                              }}
                              className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${cls}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-black/5 dark:bg-white/5 flex items-center justify-center font-mono-code text-[10px] shrink-0">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {existingAnswer && isCorrect && <CheckCircle2 className="w-4 h-4 text-[#AC1ED6] shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>

                      {existingAnswer && (
                        <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB] bg-[#FAF8F9] dark:bg-[#1A1618] p-2.5 rounded-lg border border-[#E5DEE3] dark:border-[#40363E]">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quiz Completed Summary */}
        {!isLoading && quizCompleted && (
          <div className="bg-[#FFFFFF] dark:bg-[#221F20] rounded-2xl p-8 border border-[#E5DEE3] dark:border-[#40363E] shadow-sm text-center space-y-6">
            {showPets ? (
              <div className="space-y-2">
                <CatPet state="quiz_completed" size="lg" className="mx-auto" />
                <p className="text-xs font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] font-mono-code uppercase tracking-wider">
                  Mastery Assessment Complete!
                </p>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#F3E2F7] dark:bg-[#2B1D30] text-[#AC1ED6] dark:text-[#E6B8F0] flex items-center justify-center mx-auto border border-[#E5DEE3] dark:border-[#40363E]">
                <Award className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
                Quiz Completed
              </h3>
              <p className="text-sm text-[#72656F] dark:text-[#BEB4BB]">
                You scored <strong className="text-[#1E181D] dark:text-[#F7F3F6]">{score}</strong> out of <strong className="text-[#1E181D] dark:text-[#F7F3F6]">{quizQuestions.length}</strong> questions ({percentage}%).
              </p>
              {currentSelectedTopic && (
                <p className="text-xs text-[#AC1ED6] dark:text-[#E6B8F0] font-mono-code">
                  Tested topic: {currentSelectedTopic}
                </p>
              )}
            </div>

            {/* Score Metric Card */}
            <div className="max-w-xs mx-auto p-4 bg-[#FAF8F9] dark:bg-[#1A1618] rounded-xl border border-[#E5DEE3] dark:border-[#40363E] flex items-center justify-around">
              <div>
                <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB] font-mono-code">Correct Answers</p>
                <p className="text-xl font-bold text-[#AC1ED6] dark:text-[#E6B8F0] font-mono-code tabular-nums">
                  {score} / {quizQuestions.length}
                </p>
              </div>
              <div className="w-px h-8 bg-[#E5DEE3] dark:border-[#40363E]" />
              <div>
                <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB] font-mono-code">Mastery Score</p>
                <p className="text-xl font-bold text-[#1E181D] dark:text-[#F7F3F6] font-mono-code tabular-nums">
                  {percentage}%
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleRestartQuiz}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#1E181D] dark:text-[#F7F3F6] bg-[#F3EEF2] dark:bg-[#2B2429] hover:bg-[#EBE4E9] dark:hover:bg-[#382F35] border border-[#E5DEE3] dark:border-[#40363E] rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Same 10 Questions</span>
              </button>

              <button
                onClick={() => handleTriggerGenerate()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate 10 New Questions</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty State when no quiz generated yet */}
        {!isLoading && quizQuestions.length === 0 && (
          <div className="bg-[#FFFFFF] dark:bg-[#221F20] rounded-2xl p-12 border border-[#E5DEE3] dark:border-[#40363E] text-center space-y-4 shadow-xs">
            {showPets ? (
              <CatPet state="idle" size="lg" className="mx-auto" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#FAF8F9] dark:bg-[#2B2429] text-[#AC1ED6] dark:text-[#E6B8F0] border border-[#E5DEE3] dark:border-[#40363E] flex items-center justify-center mx-auto">
                <BrainCircuit className="w-6 h-6" />
              </div>
            )}
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
                Ready to test your comprehension?
              </h3>
              <p className="text-xs text-[#72656F] dark:text-[#BEB4BB] max-w-sm mx-auto">
                Select your preferred difficulty or search any specific topic above, then click <strong>Generate New Questions</strong> to receive 10 fresh, grounded questions.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleTriggerGenerate()}
                disabled={!document}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] disabled:bg-[#E5DEE3] dark:disabled:bg-[#40363E] disabled:text-[#9E919B] dark:disabled:text-[#8E828B] rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate 10 Questions on Document</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
