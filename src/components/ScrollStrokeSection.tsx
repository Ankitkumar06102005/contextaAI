import React from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

/**
 * Full-page decorative scroll trace. It sits behind the UI, spans the viewport
 * from edge to edge, and never intercepts pointer or keyboard interaction.
 */
export const ScrollStrokeSection: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden opacity-[0.16] dark:opacity-[0.13]"
    >
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        <motion.path
          d="M -40 90 C 180 10 300 170 470 130 S 700 40 820 170 S 1080 330 1240 190 S 1460 60 1640 150 M -40 420 C 160 320 300 540 500 430 S 760 320 900 470 S 1180 610 1350 460 S 1510 380 1640 470 M -40 760 C 180 650 360 870 560 750 S 820 650 980 790 S 1250 920 1430 780 S 1550 710 1640 810"
          pathLength={1}
          stroke="#C2F84F"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pathLength: prefersReducedMotion ? 1 : pathLength }}
        />
      </svg>
    </div>
  );
};
