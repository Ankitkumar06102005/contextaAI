import React from 'react';
import { ArrowRight } from 'lucide-react';

interface FooterProps {
  onOpenWorkspace: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenWorkspace }) => {
  return (
    <footer className="bg-[#FAF8F9] dark:bg-[#090607] border-t border-[#E5DEE3] dark:border-[#40363E] py-16 transition-colors">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Final CTA Strip */}
        <div className="bg-[#FFFFFF] dark:bg-[#221F20] rounded-3xl p-8 sm:p-12 border border-[#E5DEE3] dark:border-[#40363E] text-center space-y-6 shadow-xs">
          <div className="text-xs font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] uppercase tracking-wider font-mono-code">
            05 / Next Step
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1E181D] dark:text-[#F7F3F6] max-w-xl mx-auto leading-tight font-epilogue">
            Your next document <br />
            <span className="font-normal italic text-[#AC1ED6] dark:text-[#E6B8F0]">
              can teach you more.
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#72656F] dark:text-[#BEB4BB] max-w-md mx-auto leading-relaxed">
            Upload your lecture slides, academic journals, or industry specifications. Experience grounded, hallucination-free document learning.
          </p>
          <div>
            <button
              onClick={onOpenWorkspace}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <span>Start Learning in Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Metadata & Links */}
        <div className="pt-8 border-t border-[#E5DEE3] dark:border-[#40363E] flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#72656F] dark:text-[#BEB4BB]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#AC1ED6] to-[#C26E73] text-white flex items-center justify-center font-epilogue font-bold text-xs">
              C
            </div>
            <span className="font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
              Contexta AI
            </span>
            <span aria-hidden="true" className="text-[#E5DEE3] dark:text-[#40363E]">·</span>
            <span>RAG PDF Learning Assistant</span>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono-code">
            <span>FAISS Top-30 Retrieval</span>
            <span aria-hidden="true" className="text-[#E5DEE3] dark:text-[#40363E]">·</span>
            <span>Gemini Grounding</span>
            <span aria-hidden="true" className="text-[#E5DEE3] dark:text-[#40363E]">·</span>
            <span>Page Citations</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
