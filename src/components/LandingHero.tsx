import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, ArrowRight, BookOpen, Sparkles, Send } from 'lucide-react';
import { MoonHorizon } from './MoonHorizon';
import { CatPet } from './CatPet';

interface LandingHeroProps {
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
  onOpenWorkspace: () => void;
  onAskQuestion?: (question: string) => void;
  isUploading: boolean;
  isDarkMode?: boolean;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onFileUpload,
  onLoadSample,
  onOpenWorkspace,
  onAskQuestion,
  isUploading,
  isDarkMode = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quickQuestion, setQuickQuestion] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onFileUpload(file);
      }
    }
  };

  const handleQuickQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuestion.trim()) {
      if (onAskQuestion) {
        onAskQuestion(quickQuestion.trim());
      } else {
        onOpenWorkspace();
      }
    }
  };

  return (
    <section className="relative overflow-hidden pt-16 pb-28 md:pt-24 md:pb-36 border-b border-[#E5DEE3] dark:border-[#40363E] transition-colors bg-[#FAF8F9] dark:bg-[#090607]">
      {/* Curved Moon Horizon background layer behind content */}
      <MoonHorizon isDarkMode={isDarkMode} intensity="full" />

      {/* Atmospheric subtle radial glow in upper background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[760px] h-[520px] rounded-full blur-3xl opacity-35 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(172, 30, 214, 0.4) 0%, rgba(194, 110, 115, 0.25) 45%, transparent 75%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-7 space-y-6">
            {/* Small eyebrow label with desktop pet */}
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] tracking-wider font-mono-code uppercase">
              <CatPet state={isUploading ? 'uploading' : 'idle'} size="sm" />
              <span>01 / Intelligent Learning Assistant</span>
              <span aria-hidden="true">·</span>
              <span>Grounded RAG Pipeline</span>
            </div>

            {/* Editorial Headline with Epilogue */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-[#1E181D] dark:text-[#F7F3F6] font-epilogue leading-[1.08] text-balance">
              Make knowledge <br />
              <span className="font-normal italic text-[#AC1ED6] dark:text-[#E6B8F0] text-6xl sm:text-7xl lg:text-8xl">
                click into place.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-lg sm:text-xl text-[#72656F] dark:text-[#BEB4BB] max-w-xl font-normal leading-relaxed">
              Upload any PDF. Ask deep questions. Learn with answers strictly grounded in your document—verified by page-level citations and interactive diagram generation.
            </p>

            {/* CTA Controls - Clean & Spaced */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] disabled:bg-[#40363E] rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isUploading ? 'Extracting & Indexing...' : 'Upload your PDF'}</span>
              </button>

              <button
                onClick={onLoadSample}
                disabled={isUploading}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium text-[#1E181D] dark:text-[#F7F3F6] bg-[#FFFFFF] dark:bg-[#221F20] border border-[#E5DEE3] dark:border-[#40363E] hover:bg-[#F3EEF2] dark:hover:bg-[#2B2429] rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-[#AC1ED6] dark:text-[#E6B8F0]" />
                <span>Explore sample document</span>
              </button>

              <button
                onClick={onOpenWorkspace}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium text-[#AC1ED6] dark:text-[#E6B8F0] hover:text-[#9218B5] rounded-xl transition-colors cursor-pointer"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Streamlined Value Badges - Clean & Uncluttered */}
            <div className="pt-3 flex flex-wrap items-center gap-3 text-xs text-[#72656F] dark:text-[#BEB4BB]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF]/85 dark:bg-[#1A1618]/85 backdrop-blur-sm border border-[#E5DEE3] dark:border-[#40363E] font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#AC1ED6] dark:text-[#E6B8F0]" />
                Page citations
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF]/85 dark:bg-[#1A1618]/85 backdrop-blur-sm border border-[#E5DEE3] dark:border-[#40363E] font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C26E73]" />
                Zero hallucinations
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF]/85 dark:bg-[#1A1618]/85 backdrop-blur-sm border border-[#E5DEE3] dark:border-[#40363E] font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#AC1ED6] dark:text-[#E6B8F0]" />
                Interactive Quiz Genie
              </span>
            </div>
          </div>

          {/* Right Column: Floating Product Preview Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main Card: Teacher Agent Answer Preview */}
              <div className="bg-[#FFFFFF] dark:bg-[#221F20] rounded-2xl border border-[#E5DEE3] dark:border-[#40363E] shadow-xl p-6 relative z-20 space-y-4">
                {/* Document Status Strip */}
                <div className="flex items-center justify-between pb-3 border-b border-[#F3EEF2] dark:border-[#2B2429]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#F3EEF2] dark:bg-[#2B2429] text-[#AC1ED6] dark:text-[#E6B8F0] flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1E181D] dark:text-[#F7F3F6] truncate max-w-[200px]">
                        transformer-foundations.pdf
                      </p>
                      <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB] font-mono-code">
                        4 pages · 138 chunks · FAISS Top-30
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] bg-[#F3E2F7] dark:bg-[#2B2429] border border-[#E5DEE3] dark:border-[#40363E] px-2 py-0.5 rounded-md">
                    Indexed
                  </span>
                </div>

                {/* Question */}
                <div className="text-xs font-medium text-[#72656F] dark:text-[#BEB4BB] bg-[#FAF8F9] dark:bg-[#1A1618] rounded-lg p-3 border border-[#E5DEE3] dark:border-[#40363E]">
                  <span className="font-semibold text-[#1E181D] dark:text-[#F7F3F6]">Learner:</span> Why does the architecture scale dot products by 1 / √d_k?
                </div>

                {/* Teacher Agent Grounded Answer */}
                <div className="text-xs text-[#1E181D] dark:text-[#F7F3F6] leading-relaxed space-y-2 bg-[#FAF8F9] dark:bg-[#2B2429] rounded-lg p-3 border border-[#E5DEE3]/80 dark:border-[#40363E]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CatPet state="ready" size="sm" />
                      <span className="text-[11px] font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] uppercase tracking-wide">
                        Teacher Agent
                      </span>
                    </div>
                    <span className="text-[11px] text-[#C26E73] font-medium">
                      Grounded in PDF
                    </span>
                  </div>
                  <p>
                    For large values of <code className="bg-[#F3EEF2] dark:bg-[#221F20] text-[#AC1ED6] dark:text-[#E6B8F0] px-1 py-0.5 rounded text-[11px] font-mono-code">d_k</code>, the dot products grow excessively large in magnitude, pushing the softmax function into regions with near-zero gradients. Scaling by <code className="bg-[#F3EEF2] dark:bg-[#221F20] text-[#AC1ED6] dark:text-[#E6B8F0] px-1 py-0.5 rounded text-[11px] font-mono-code">1 / √d_k</code> counteracts this effect.
                  </p>
                </div>

                {/* Floating Citation Pill */}
                <div className="flex items-center justify-between p-2.5 bg-[#F3EEF2] dark:bg-[#2B2429] rounded-lg border border-[#E5DEE3] dark:border-[#40363E] text-xs">
                  <div className="flex items-center gap-2 text-[#AC1ED6] dark:text-[#E6B8F0] font-medium text-[11px]">
                    <span className="font-mono-code bg-[#FFFFFF] dark:bg-[#221F20] px-1.5 py-0.5 rounded border border-[#E5DEE3] dark:border-[#40363E]">
                      Page 3
                    </span>
                    <span className="truncate max-w-[180px] text-[#72656F] dark:text-[#BEB4BB]">
                      "Section 3: Scaled Dot-Product Attention"
                    </span>
                  </div>
                  <button
                    onClick={onOpenWorkspace}
                    className="text-[11px] font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Inspect <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Floating Element 2: Small Quiz Card Preview */}
              <div className="hidden sm:block absolute -bottom-6 -left-6 z-30 bg-[#FFFFFF] dark:bg-[#221F20] rounded-xl border border-[#E5DEE3] dark:border-[#40363E] shadow-xl p-3.5 w-64 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#AC1ED6] dark:text-[#E6B8F0]">Quiz Genie</span>
                  <span className="text-[#72656F] dark:text-[#BEB4BB]">Question 2 of 5</span>
                </div>
                <p className="text-xs text-[#1E181D] dark:text-[#F7F3F6] font-medium leading-snug">
                  What is the primary role of residual connections around sub-layers?
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-[#C26E73] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Correct: Gradient propagation [Page 2]</span>
                </div>
              </div>

              {/* Floating Element 3: Top Right Metric Preview */}
              <div className="hidden sm:block absolute -top-5 -right-5 z-10 bg-[#FFFFFF]/90 dark:bg-[#221F20]/90 backdrop-blur-sm rounded-xl border border-[#E5DEE3] dark:border-[#40363E] shadow-md px-3.5 py-2 text-xs">
                <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB]">Cosine Similarity</p>
                <p className="font-mono-code font-semibold text-[#1E181D] dark:text-[#F7F3F6] text-sm tabular-nums">
                  0.894 <span className="text-[11px] font-normal text-[#AC1ED6] dark:text-[#E6B8F0]">Top Chunk</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
