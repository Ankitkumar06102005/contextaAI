import React from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

/**
 * Decorative S-shaped scroll trace for the landing page.
 * Fixed behind the interface, edge-to-edge, and never interactive.
 */
export const ScrollStrokeSection: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const pathLength = useTransform(scrollYProgress, [0, 1], [0.04, 1]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.24] dark:opacity-[0.2]"
    >
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        <motion.path
          d="M 820 -35
             C 760 15, 610 18, 400 35
             C 180 55, 20 105, 45 165
             C 65 225, 300 225, 535 275
             C 780 328, 955 360, 940 435
             C 925 510, 690 500, 440 515
             C 210 530, 20 585, 45 650
             C 70 720, 325 715, 560 775
             C 795 835, 970 870, 935 930
             C 915 970, 850 990, 800 1035"
          pathLength={1}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#8573A8] dark:text-[#B7A0D8]"
          style={{ pathLength: prefersReducedMotion ? 1 : pathLength }}
        />
      </svg>
    </div>
  );
};
