import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

/**
 * Scroll-linked stroke inspired by Skiper UI #19.
 * The drawing is adapted for Contexta AI's learning-focused landing page.
 */
export const ScrollStrokeSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="scroll-stroke-heading"
      className="relative isolate h-[220vh] overflow-clip border-b border-[#E5DEE3] bg-[#FAFDEE] text-[#1E181D] transition-colors dark:border-[#40363E] dark:bg-[#090607] dark:text-[#F7F3F6]"
    >
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden py-16">
        <div className="pointer-events-none absolute inset-0 opacity-90 dark:opacity-70" aria-hidden="true">
          <svg
            viewBox="0 0 1000 1100"
            preserveAspectRatio="xMidYMid meet"
            className="absolute left-[14%] top-[-12%] h-[125%] w-[92%] min-w-[650px] md:left-[28%] md:w-[72%]"
            fill="none"
          >
            <motion.path
              d="M760 30 C 610 60 530 150 620 205 S 850 255 800 350 S 520 420 600 500 S 900 590 760 675 S 420 735 510 825 S 820 900 650 1040"
              pathLength={1}
              stroke="#C2F84F"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pathLength: prefersReducedMotion ? 1 : pathLength }}
            />
            <path
              d="M760 30 C 610 60 530 150 620 205 S 850 255 800 350 S 520 420 600 500 S 900 590 760 675 S 420 735 510 825 S 820 900 650 1040"
              stroke="currentColor"
              strokeOpacity="0.06"
              strokeWidth="1"
              strokeDasharray="4 12"
            />
          </svg>
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <p className="mb-6 flex items-center gap-3 font-mono-code text-xs font-semibold uppercase tracking-[0.22em] text-[#9218B5] dark:text-[#E6B8F0]">
              <span className="h-px w-8 bg-current" />
              02 / Follow the evidence
            </p>
            <h2
              id="scroll-stroke-heading"
              className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-8xl"
            >
              Let the source
              <br />
              <span className="font-normal italic text-[#9218B5] dark:text-[#E6B8F0]">draw the answer.</span>
            </h2>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-[#72656F] dark:text-[#BEB4BB] sm:text-lg">
              Follow each idea from your PDF to a grounded explanation. Contexta keeps page-level evidence close, so understanding never has to be a leap of faith.
            </p>
            <div className="mt-9 inline-flex items-center gap-3 rounded-full border border-[#D9E9A5] bg-white/80 px-4 py-2.5 text-xs font-medium text-[#1E181D] shadow-sm backdrop-blur dark:border-[#596B37] dark:bg-[#1A1618]/90 dark:text-[#F7F3F6]">
              <span className="h-2 w-2 rounded-full bg-[#AC1ED6]" />
              Scroll to trace the learning path
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative ml-auto max-w-md overflow-hidden rounded-[2rem] bg-[#1E181D] p-7 text-[#FAFDEE] shadow-2xl shadow-[#1E181D]/15 dark:bg-[#221F20] sm:p-9">
              <div className="mb-12 flex items-center justify-between">
                <span className="font-mono-code text-[11px] uppercase tracking-[0.2em] text-[#C2F84F]">Contexta / Evidence loop</span>
                <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/70">RAG</span>
              </div>
              <p className="text-sm text-white/60">From question to understanding</p>
              <div className="mt-5 space-y-3">
                {[
                  ['01', 'Retrieve relevant passages'],
                  ['02', 'Verify the source context'],
                  ['03', 'Explain with page citations'],
                ].map(([number, label]) => (
                  <div key={number} className="flex items-center gap-4 border-t border-white/10 py-4">
                    <span className="font-mono-code text-xs text-[#C2F84F]">{number}</span>
                    <span className="text-sm font-medium sm:text-base">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs text-white/55">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C2F84F]" />
                Evidence first. Answers second.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
