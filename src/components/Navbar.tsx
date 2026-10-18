import React from 'react';
import { Sparkles, ArrowRight, BookOpen, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  currentView: 'landing' | 'workspace';
  onNavigate: (view: 'landing' | 'workspace') => void;
  activeDoc: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeDoc,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF8F9]/90 dark:bg-[#090607]/90 backdrop-blur-md border-b border-[#E5DEE3] dark:border-[#40363E] transition-colors">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#AC1ED6] to-[#C26E73] text-white flex items-center justify-center font-epilogue font-bold text-base shadow-sm group-hover:opacity-90 transition-opacity">
            C
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#1E181D] dark:text-[#F7F3F6] font-epilogue whitespace-nowrap">
            Contexta <span className="font-normal italic text-[#AC1ED6] dark:text-[#E6B8F0]">AI</span>
          </span>
        </button>

        {/* Zone 2: Clean Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#72656F] dark:text-[#BEB4BB]">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-colors whitespace-nowrap hover:text-[#1E181D] dark:hover:text-[#F7F3F6] cursor-pointer ${
              currentView === 'landing' ? 'text-[#1E181D] dark:text-[#F7F3F6] font-semibold' : ''
            }`}
          >
            Overview
          </button>
          <a
            href="#how-it-works"
            onClick={(e) => {
              if (currentView !== 'landing') {
                e.preventDefault();
                onNavigate('landing');
                setTimeout(() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="hover:text-[#1E181D] dark:hover:text-[#F7F3F6] transition-colors whitespace-nowrap"
          >
            How it works
          </a>
          <a
            href="#agents"
            onClick={(e) => {
              if (currentView !== 'landing') {
                e.preventDefault();
                onNavigate('landing');
                setTimeout(() => {
                  document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="hover:text-[#1E181D] dark:hover:text-[#F7F3F6] transition-colors whitespace-nowrap"
          >
            Agents
          </a>
          <a
            href="#rag-architecture"
            onClick={(e) => {
              if (currentView !== 'landing') {
                e.preventDefault();
                onNavigate('landing');
                setTimeout(() => {
                  document.getElementById('rag-architecture')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="hover:text-[#1E181D] dark:hover:text-[#F7F3F6] transition-colors whitespace-nowrap"
          >
            RAG Pipeline
          </a>
        </nav>

        {/* Zone 3: Actions + Dark Mode Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg text-[#72656F] dark:text-[#BEB4BB] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] hover:text-[#1E181D] dark:hover:text-[#F7F3F6] transition-colors cursor-pointer"
              aria-label="Toggle color mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#E6B8F0]" /> : <Moon className="w-4 h-4 text-[#AC1ED6]" />}
            </button>
          )}

          {currentView === 'landing' ? (
            <button
              onClick={() => onNavigate('workspace')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] dark:bg-[#AC1ED6] dark:hover:bg-[#9218B5] rounded-xl transition-all whitespace-nowrap shadow-sm cursor-pointer"
            >
              <span>{activeDoc ? 'Open Workspace' : 'Launch Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('landing')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-[#1E181D] dark:text-[#F7F3F6] bg-[#F3EEF2] dark:bg-[#2B2429] hover:bg-[#EBE4E9] dark:hover:bg-[#382F35] border border-[#E5DEE3] dark:border-[#40363E] rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#AC1ED6]" />
              <span>Product Tour</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
