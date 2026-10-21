import React from 'react';
import { GraduationCap, FileCheck, BrainCircuit, Search, ArrowRight, CheckCircle2 } from 'lucide-react';

interface FeatureShowcaseProps {
  onOpenWorkspace: () => void;
}

export const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({ onOpenWorkspace }) => {
  const features = [
    {
      agent: 'Teacher Agent',
      label: 'Pedagogical Explanation',
      icon: GraduationCap,
      description: 'Breaks down complex formulas, definitions, and theories into digestible, step-by-step walk-throughs. If the document lacks evidence, it clearly acknowledges the boundary.',
      highlight: 'Step-by-step pedagogy with page citations',
      preview: (
        <div className="bg-[#FAF8F9] dark:bg-[#1A1618] rounded-xl p-4 border border-[#E5DEE3] dark:border-[#40363E] text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#72656F] dark:text-[#BEB4BB]">
            <span className="font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] font-epilogue">Concept Breakdown</span>
            <span className="font-mono-code">Query: "Scaled Dot-Product"</span>
          </div>
          <p className="text-[#1E181D] dark:text-[#F7F3F6] leading-relaxed">
            1. <strong>Linear Projections</strong>: Vectors Q, K, V are mapped to dimension d_k. [Page 2]<br />
            2. <strong>Dot-Product Scaling</strong>: Scaled by 1/√d_k to prevent gradient vanishing in softmax. [Page 3]
          </p>
        </div>
      ),
    },
    {
      agent: 'Summary Agent',
      label: 'Executive & Revision Notes',
      icon: FileCheck,
      description: 'Generates structured synthesis across all chapters: executive summaries, definitions lists, critical findings, and exam-focused revision checklists.',
      highlight: 'Deliberate multi-section sampling across document',
      preview: (
        <div className="bg-[#FAF8F9] dark:bg-[#1A1618] rounded-xl p-4 border border-[#E5DEE3] dark:border-[#40363E] text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#72656F] dark:text-[#BEB4BB]">
            <span className="font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] font-epilogue">Document Synthesis</span>
            <span className="font-mono-code">4 Pages Processed</span>
          </div>
          <ul className="space-y-1 text-[#1E181D] dark:text-[#F7F3F6]">
            <li>• <strong>Core Thesis</strong>: Recurrence-free sequence transduction. [Page 1]</li>
            <li>• <strong>Key Invariant</strong>: LayerNorm(x + Sublayer(x)) with d_model=512. [Page 2]</li>
          </ul>
        </div>
      ),
    },
    {
      agent: 'Quiz Genie',
      label: 'Interactive Knowledge Testing',
      icon: BrainCircuit,
      description: 'Generates verified multiple-choice practice quizzes. Configurable by difficulty (easy, medium, hard) with locked submissions and full rationales.',
      highlight: '4-option schema with verified correct answers',
      preview: (
        <div className="bg-[#FAF8F9] dark:bg-[#1A1618] rounded-xl p-4 border border-[#E5DEE3] dark:border-[#40363E] text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#72656F] dark:text-[#BEB4BB]">
            <span className="font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] font-epilogue">Interactive MCQ</span>
            <span className="text-[#AC1ED6] dark:text-[#E6B8F0] font-semibold font-mono-code">Score: 100%</span>
          </div>
          <div className="p-2 bg-[#F3E2F7] dark:bg-[#2B1D30] rounded-lg border border-[#AC1ED6]/30 text-[#AC1ED6] dark:text-[#E6B8F0] font-medium flex items-center justify-between">
            <span>✓ Option B: Sine & Cosine frequencies</span>
            <span className="text-[10px] font-mono-code bg-[#FFFFFF] dark:bg-[#221F20] px-1.5 py-0.5 rounded border border-[#E5DEE3] dark:border-[#40363E]">Page 4</span>
          </div>
        </div>
      ),
    },
    {
      agent: 'Source Explorer',
      label: 'Ground Truth Verification',
      icon: Search,
      description: 'Every statement is cross-referenced with exact chunk IDs and page numbers. View the verbatim extracted snippet alongside any answer.',
      highlight: 'Zero unverified claims, full passage inspection',
      preview: (
        <div className="bg-[#FAF8F9] dark:bg-[#1A1618] rounded-xl p-4 border border-[#E5DEE3] dark:border-[#40363E] text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#72656F] dark:text-[#BEB4BB]">
            <span className="font-mono-code text-[#AC1ED6] dark:text-[#E6B8F0]">chunk-doc_tr-0003</span>
            <span className="text-[#AC1ED6] dark:text-[#E6B8F0] font-semibold font-mono-code">Page 3</span>
          </div>
          <p className="text-[#72656F] dark:text-[#BEB4BB] italic text-[11px] line-clamp-2">
            "Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V..."
          </p>
        </div>
      ),
    },
  ];

  return (
    <section id="agents" className="py-20 md:py-28 bg-[#FAF8F9] dark:bg-[#090607] border-b border-[#E5DEE3] dark:border-[#40363E] transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-16 space-y-3">
          <div className="text-xs font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] uppercase tracking-wider font-mono-code">
            04 / Purpose-Built Intelligence
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
            Four dedicated agents. <br />
            <span className="font-normal italic text-[#AC1ED6] dark:text-[#E6B8F0]">One unified learning loop.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#72656F] dark:text-[#BEB4BB] leading-relaxed">
            Unlike generic chatbots, each Contexta agent has strict operating boundaries designed specifically for comprehension and retention.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.agent}
                className="bg-[#FFFFFF] dark:bg-[#221F20] rounded-2xl p-7 border border-[#E5DEE3] dark:border-[#40363E] hover:border-[#AC1ED6]/50 dark:hover:border-[#E6B8F0]/40 transition-all flex flex-col justify-between shadow-xs"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F3EEF2] dark:bg-[#2B2429] text-[#AC1ED6] dark:text-[#E6B8F0] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
                          {feat.agent}
                        </h3>
                        <p className="text-xs text-[#AC1ED6] dark:text-[#E6B8F0] font-medium">
                          {feat.label}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#72656F] dark:text-[#BEB4BB] leading-relaxed">
                    {feat.description}
                  </p>

                  <div className="pt-2">
                    {feat.preview}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F3EEF2] dark:border-[#2B2429] flex items-center justify-between text-xs">
                  <span className="text-[#AC1ED6] dark:text-[#E6B8F0] font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#AC1ED6] dark:text-[#E6B8F0]" />
                    {feat.highlight}
                  </span>
                  <button
                    onClick={onOpenWorkspace}
                    className="text-[#AC1ED6] dark:text-[#E6B8F0] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Try agent <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
