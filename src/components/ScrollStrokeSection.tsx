import React from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

/**
 * A subtle scroll-linked stroke that follows the entire landing-page journey.
 * The MoonHorizon remains in place; it is decorative and does not control scroll progress.
 */
export const ScrollStrokeSection: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden opacity-45 dark:opacity-35"
    >
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        <motion.path
          d="M 850 -80 C 700 20 980 90 760 170 S 420 250 650 330 S 960 410 720 500 S 360 590 570 670 S 900 750 690 830 S 450 930 520 1080"
          pathLength={1}
          stroke="#C2F84F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pathLength: prefersReducedMotion ? 1 : pathLength }}
        />
      </svg>
    </div>
  );
};
