import React from 'react';
import { Upload, Cpu, MessageSquareText, HelpCircle } from 'lucide-react';

export const WorkflowSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Upload your PDF',
      description: 'Ingest research papers, textbooks, technical documentation, or study guides with page-by-page text extraction.',
      icon: Upload,
    },
    {
      number: '02',
      title: 'Build document context',
      description: 'Sentence-aligned chunking (~800 chars) converted into normalized Gemini embeddings stored in a cosine similarity vector index.',
      icon: Cpu,
    },
    {
      number: '03',
      title: 'Ask, understand, and explore',
      description: 'Interact with the Teacher and Summary agents. Every explanation cites specific PDF pages and quotes original evidence.',
      icon: MessageSquareText,
    },
    {
      number: '04',
      title: 'Test your knowledge',
      description: 'Quiz Genie creates multiple-choice questions with verified answers, instant feedback, and page-backed explanations.',
      icon: HelpCircle,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-[#FFFFFF] dark:bg-[#090607] border-b border-[#E5DEE3] dark:border-[#40363E] transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-16 space-y-3">
          <div className="text-xs font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] uppercase tracking-wider font-mono-code">
            02 / Methodical Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
            How Contexta AI builds <br />
            <span className="font-normal italic text-[#AC1ED6] dark:text-[#E6B8F0]">grounded understanding.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#72656F] dark:text-[#BEB4BB] leading-relaxed">
            No hallucinated claims. Every step preserves page alignment so you can trace every concept directly back to its source.
          </p>
        </div>

        {/* 4-Step Sequence Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative bg-[#FAF8F9] dark:bg-[#221F20] rounded-2xl p-6 border border-[#E5DEE3] dark:border-[#40363E] hover:border-[#AC1ED6]/50 dark:hover:border-[#E6B8F0]/40 transition-colors flex flex-col justify-between group shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-epilogue text-2xl font-bold text-[#AC1ED6] dark:text-[#E6B8F0]">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] dark:bg-[#2B2429] border border-[#E5DEE3] dark:border-[#40363E] flex items-center justify-center text-[#AC1ED6] dark:text-[#E6B8F0] group-hover:bg-[#AC1ED6] group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-[#1E181D] dark:text-[#F7F3F6] mb-2 font-epilogue">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#72656F] dark:text-[#BEB4BB] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E5DEE3] dark:border-[#40363E] text-[11px] text-[#9E919B] dark:text-[#8E828B] flex items-center justify-between font-mono-code">
                  <span>Step {idx + 1} of 4</span>
                  <span className="text-[#C26E73] font-medium">Active Engine</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
