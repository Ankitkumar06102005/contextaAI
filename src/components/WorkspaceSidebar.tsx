import React, { useRef, useState } from 'react';
import {
  FileText,
  UploadCloud,
  GraduationCap,
  FileCheck,
  BrainCircuit,
  Trash2,
  RefreshCw,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Sparkles,
  Search,
  Eye,
  EyeOff,
  Plus,
  X
} from 'lucide-react';
import { DocumentInfo } from '../types';
import { CatPet } from './CatPet';

interface WorkspaceSidebarProps {
  document: DocumentInfo | null;
  currentMode: 'teacher' | 'summary' | 'quiz';
  onSelectMode: (mode: 'teacher' | 'summary' | 'quiz') => void;
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
  onDeleteDocument: () => void;
  onResetChat: () => void;
  onBackToLanding: () => void;
  isUploading: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  showPets?: boolean;
  onTogglePets?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  document,
  currentMode,
  onSelectMode,
  onFileUpload,
  onLoadSample,
  onDeleteDocument,
  onResetChat,
  onBackToLanding,
  isUploading,
  isDarkMode = true,
  onToggleDarkMode,
  showPets = true,
  onTogglePets,
  searchQuery = '',
  onSearchChange,
  isOpenOnMobile = false,
  onCloseMobile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onFileUpload(file);
        onCloseMobile?.();
      }
    }
  };

  const handleModeSelect = (mode: 'teacher' | 'summary' | 'quiz') => {
    onSelectMode(mode);
    onCloseMobile?.();
  };

  const handleResetSession = () => {
    onResetChat();
    onCloseMobile?.();
  };

  const handleSampleClick = () => {
    onLoadSample();
    onCloseMobile?.();
  };

  const sidebarContent = (
    <aside className={`bg-[#FFFFFF] dark:bg-[#221F20] border-r border-[#E5DEE3] dark:border-[#40363E] flex flex-col justify-between h-full select-none shrink-0 transition-colors ${
      isOpenOnMobile
        ? 'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] shadow-2xl flex'
        : 'hidden lg:flex lg:w-80'
    }`}>
      {/* Top Section */}
      <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
        {/* Navigation & Brand Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#F3EEF2] dark:border-[#2B2429]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#AC1ED6] to-[#C26E73] text-white flex items-center justify-center font-epilogue font-bold text-xs shadow-xs">
              C
            </div>
            <div>
              <p className="text-xs font-semibold tracking-tight text-[#1E181D] dark:text-[#F7F3F6] font-epilogue leading-none">
                Contexta <span className="text-[#AC1ED6] dark:text-[#E6B8F0] italic">AI</span>
              </p>
              <p className="text-[10px] text-[#72656F] dark:text-[#BEB4BB] font-mono-code mt-0.5">
                RAG Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onTogglePets && (
              <button
                onClick={onTogglePets}
                title={showPets ? 'Hide Desktop Pets' : 'Show Desktop Pets'}
                className="p-1.5 rounded-lg text-[#72656F] dark:text-[#BEB4BB] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] hover:text-[#1E181D] dark:hover:text-[#F7F3F6] transition-colors cursor-pointer"
                aria-label="Toggle desktop pets"
              >
                {showPets ? <Eye className="w-3.5 h-3.5 text-[#AC1ED6]" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            )}

            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                className="p-1.5 rounded-lg text-[#72656F] dark:text-[#BEB4BB] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] hover:text-[#1E181D] dark:hover:text-[#F7F3F6] transition-colors cursor-pointer"
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-[#E6B8F0]" /> : <Moon className="w-3.5 h-3.5 text-[#AC1ED6]" />}
              </button>
            )}

            <button
              onClick={() => {
                onBackToLanding();
                onCloseMobile?.();
              }}
              title="Return to Overview"
              className="p-1.5 rounded-lg text-[#72656F] dark:text-[#BEB4BB] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] hover:text-[#1E181D] dark:hover:text-[#F7F3F6] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {/* Mobile / Tablet close drawer button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                title="Close drawer"
                className="lg:hidden p-1.5 rounded-lg text-[#72656F] dark:text-[#BEB4BB] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] hover:text-[#1E181D] dark:hover:text-[#F7F3F6] transition-colors cursor-pointer"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4 text-[#C26E73]" />
              </button>
            )}
          </div>
        </div>

        {/* New Learning Session Action */}
        <button
          onClick={handleResetSession}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Learning Session</span>
        </button>

        {/* Search Bar for Messages */}
        {onSearchChange && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9E919B] dark:text-[#8E828B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversation..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF8F9] dark:bg-[#1A1618] border border-[#E5DEE3] dark:border-[#40363E] rounded-xl text-[#1E181D] dark:text-[#F7F3F6] placeholder-[#9E919B] dark:placeholder-[#8E828B] focus:outline-none focus:border-[#AC1ED6] dark:focus:border-[#E6B8F0] transition-colors"
            />
          </div>
        )}

        {/* Upload Action / Active Document Card */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {document ? (
            <div className="p-3.5 bg-[#FAF8F9] dark:bg-[#2B2429] rounded-xl border border-[#E5DEE3] dark:border-[#40363E] space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F3E2F7] dark:bg-[#221F20] text-[#AC1ED6] dark:text-[#E6B8F0] flex items-center justify-center shrink-0 border border-[#E5DEE3] dark:border-[#40363E]">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1E181D] dark:text-[#F7F3F6] truncate font-epilogue" title={document.filename}>
                    {document.filename}
                  </p>
                  <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB] font-mono-code">
                    {document.page_count} pages · {document.chunk_count} chunks
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E5DEE3] dark:border-[#40363E] text-[11px]">
                <span className="flex items-center gap-1.5 text-[#AC1ED6] dark:text-[#E6B8F0] font-medium font-mono-code">
                  <CheckCircle2 className="w-3 h-3 text-[#AC1ED6]" />
                  FAISS Ready
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-[#AC1ED6] dark:text-[#E6B8F0] hover:underline font-semibold transition-colors cursor-pointer text-[11px]"
                >
                  Change PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-4 px-3 border-2 border-dashed border-[#E5DEE3] dark:border-[#40363E] hover:border-[#AC1ED6] dark:hover:border-[#E6B8F0] bg-[#FAF8F9] dark:bg-[#1A1618] rounded-xl text-center space-y-1 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 mx-auto rounded-full bg-[#FFFFFF] dark:bg-[#2B2429] border border-[#E5DEE3] dark:border-[#40363E] flex items-center justify-center text-[#AC1ED6] dark:text-[#E6B8F0] group-hover:scale-105 transition-transform shadow-xs">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
                  {isUploading ? 'Indexing PDF...' : 'Upload Learning PDF'}
                </p>
                <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB]">
                  Drag & drop or browse
                </p>
              </button>

              <button
                onClick={handleSampleClick}
                disabled={isUploading}
                className="w-full py-2 px-3 bg-[#FFFFFF] dark:bg-[#2B2429] border border-[#E5DEE3] dark:border-[#40363E] hover:bg-[#F3EEF2] dark:hover:bg-[#382F35] rounded-xl text-xs font-medium text-[#1E181D] dark:text-[#F7F3F6] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#AC1ED6] dark:text-[#E6B8F0]" />
                <span>Load Sample Research PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Mode Selector */}
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-semibold text-[#9E919B] dark:text-[#8E828B] uppercase tracking-wider px-1 font-mono-code">
            Learning Mode
          </p>

          <div className="space-y-1.5">
            <button
              onClick={() => handleModeSelect('teacher')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                currentMode === 'teacher'
                  ? 'bg-[#AC1ED6] text-white shadow-xs'
                  : 'text-[#72656F] dark:text-[#BEB4BB] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] hover:text-[#1E181D] dark:hover:text-[#F7F3F6]'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-semibold leading-none font-epilogue">Teacher Agent</p>
                <p className={`text-[10px] mt-0.5 ${currentMode === 'teacher' ? 'text-white/80' : 'text-[#9E919B] dark:text-[#8E828B]'}`}>
                  Ask & get grounded explanations
                </p>
              </div>
            </button>

            <button
              onClick={() => handleModeSelect('summary')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                currentMode === 'summary'
                  ? 'bg-[#AC1ED6] text-white shadow-xs'
                  : 'text-[#72656F] dark:text-[#BEB4BB] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] hover:text-[#1E181D] dark:hover:text-[#F7F3F6]'
              }`}
            >
              <FileCheck className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-semibold leading-none font-epilogue">Summary Agent</p>
                <p className={`text-[10px] mt-0.5 ${currentMode === 'summary' ? 'text-white/80' : 'text-[#9E919B] dark:text-[#8E828B]'}`}>
                  Executive brief & revision points
                </p>
              </div>
            </button>

            <button
              onClick={() => handleModeSelect('quiz')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                currentMode === 'quiz'
                  ? 'bg-[#AC1ED6] text-white shadow-xs'
                  : 'text-[#72656F] dark:text-[#BEB4BB] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] hover:text-[#1E181D] dark:hover:text-[#F7F3F6]'
              }`}
            >
              <BrainCircuit className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-semibold leading-none font-epilogue">Quiz Genie</p>
                <p className={`text-[10px] mt-0.5 ${currentMode === 'quiz' ? 'text-white/80' : 'text-[#9E919B] dark:text-[#8E828B]'}`}>
                  Interactive MCQ self-testing
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Controls / Session Management */}
      <div className="p-4 border-t border-[#E5DEE3] dark:border-[#40363E] bg-[#FAF8F9] dark:bg-[#1A1618] space-y-2">
        <div className="flex items-center justify-between text-xs text-[#72656F] dark:text-[#BEB4BB] px-1">
          <span className="font-mono-code text-[11px]">Contexta Assistant</span>
          {showPets && <CatPet state="idle" size="sm" />}
        </div>

        {document && (
          <div>
            {showDeleteConfirm ? (
              <div className="p-3 bg-[#FAEBEB] dark:bg-[#331A1E] rounded-xl border border-[#C2454E]/30 space-y-2">
                <p className="text-[11px] text-[#C2454E] dark:text-[#D64251] font-medium leading-snug">
                  Delete index & vector files permanently?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onDeleteDocument();
                      setShowDeleteConfirm(false);
                      onCloseMobile?.();
                    }}
                    className="flex-1 py-1 px-2 text-[11px] font-semibold text-white bg-[#C2454E] hover:bg-[#A83840] rounded-lg transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-1 px-2 text-[11px] font-medium text-[#72656F] dark:text-[#BEB4BB] bg-white dark:bg-[#221F20] border border-[#E5DEE3] dark:border-[#40363E] rounded-lg hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-[#C2454E] dark:text-[#D64251] hover:bg-[#FAEBEB] dark:hover:bg-[#331A1E] rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Document Index</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile/Tablet backdrop overlay when sidebar drawer is open */}
      {isOpenOnMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      {sidebarContent}
    </>
  );
};
