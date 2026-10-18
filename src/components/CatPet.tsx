import React from 'react';

export type CatPetState =
  | 'idle'
  | 'uploading'
  | 'retrieving'
  | 'generating'
  | 'ready'
  | 'quiz_completed'
  | 'insufficient_evidence'
  | 'error';

interface CatPetProps {
  state?: CatPetState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showStatusLabel?: boolean;
  interactive?: boolean;
}

export const CatPet: React.FC<CatPetProps> = ({
  state = 'idle',
  size = 'md',
  className = '',
  showStatusLabel = false,
  interactive = false,
}) => {
  // Dimensions map: sm = 28px, md = 36px, lg = 52px
  const dimension = size === 'sm' ? 28 : size === 'lg' ? 52 : 36;

  // Animation class mapping based on finite state
  const animationClass = (() => {
    switch (state) {
      case 'uploading':
        return 'animate-cat-scan';
      case 'retrieving':
        return 'animate-cat-scan';
      case 'generating':
        return 'animate-cat-think';
      case 'ready':
      case 'quiz_completed':
        return 'animate-cat-bounce';
      case 'insufficient_evidence':
        return 'animate-cat-tilt';
      case 'error':
        return 'animate-cat-tilt';
      case 'idle':
      default:
        return 'animate-cat-float';
    }
  })();

  // Status text for accessibility and optional labels
  const stateLabel = (() => {
    switch (state) {
      case 'uploading':
        return 'Reading PDF...';
      case 'retrieving':
        return 'Searching vectors...';
      case 'generating':
        return 'Synthesizing answer...';
      case 'ready':
        return 'Ready!';
      case 'quiz_completed':
        return 'Quiz complete!';
      case 'insufficient_evidence':
        return 'Thinking...';
      case 'error':
        return 'Need help';
      case 'idle':
      default:
        return 'Contexta Pet';
    }
  })();

  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${
        interactive ? 'cursor-pointer' : 'pointer-events-none'
      } ${className}`}
      title={stateLabel}
      aria-label={`Contexta pet: ${stateLabel}`}
    >
      <div
        className={`relative shrink-0 transition-transform duration-300 ${animationClass}`}
        style={{ width: dimension, height: dimension }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-sm overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glossy cat body gradient: Purple to Dusty-Rose to Lavender */}
            <linearGradient id="catBodyGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#C26E73" />
              <stop offset="45%" stopColor="#AC1ED6" />
              <stop offset="90%" stopColor="#6C1487" />
            </linearGradient>

            {/* Inner ear soft pink gradient */}
            <linearGradient id="catEarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F7D4F2" />
              <stop offset="100%" stopColor="#C26E73" />
            </linearGradient>

            {/* Top head glossy specular reflection */}
            <radialGradient id="catHighlight" cx="35%" cy="30%" r="45%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Left Ear */}
          <path
            d="M 22 42 L 14 18 Q 24 16 38 28 Z"
            fill="url(#catBodyGrad)"
            stroke="#2B2429"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M 22 36 L 18 22 Q 24 20 32 28 Z"
            fill="url(#catEarGrad)"
          />

          {/* Right Ear */}
          <path
            d="M 78 42 L 86 18 Q 76 16 62 28 Z"
            fill="url(#catBodyGrad)"
            stroke="#2B2429"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M 78 36 L 82 22 Q 76 20 68 28 Z"
            fill="url(#catEarGrad)"
          />

          {/* Main Rounded Compact Body / Head */}
          <ellipse
            cx="50"
            cy="54"
            rx="38"
            ry="34"
            fill="url(#catBodyGrad)"
            stroke="#2B2429"
            strokeWidth="3"
          />

          {/* Glossy highlight dome */}
          <ellipse
            cx="50"
            cy="48"
            rx="32"
            ry="24"
            fill="url(#catHighlight)"
          />

          {/* Tiny paws resting at bottom */}
          <ellipse cx="38" cy="84" rx="8" ry="5" fill="#C26E73" stroke="#2B2429" strokeWidth="2" />
          <ellipse cx="62" cy="84" rx="8" ry="5" fill="#C26E73" stroke="#2B2429" strokeWidth="2" />

          {/* Blush marks */}
          <ellipse cx="28" cy="62" rx="5" ry="2.5" fill="#F3A4B5" opacity="0.75" />
          <ellipse cx="72" cy="62" rx="5" ry="2.5" fill="#F3A4B5" opacity="0.75" />

          {/* Whiskers */}
          <path d="M 12 56 L 24 58 M 12 63 L 23 62" stroke="#2B2429" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 88 56 L 76 58 M 88 63 L 77 62" stroke="#2B2429" strokeWidth="1.8" strokeLinecap="round" />

          {/* EXPRESSION RENDERING BASED ON FINITE STATE */}
          {state === 'idle' && (
            <g>
              {/* Cute curved sleeping/content happy eyes */}
              <path d="M 33 50 Q 39 44 45 50" stroke="#090607" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M 55 50 Q 61 44 67 50" stroke="#090607" strokeWidth="3" strokeLinecap="round" fill="none" />
              {/* Nose and mouth */}
              <polygon points="50,56 48,54 52,54" fill="#090607" />
              <path d="M 46 59 Q 50 62 54 59" stroke="#090607" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </g>
          )}

          {state === 'uploading' && (
            <g>
              {/* Attentive wide round eyes looking up */}
              <circle cx="38" cy="49" r="6" fill="#090607" />
              <circle cx="62" cy="49" r="6" fill="#090607" />
              <circle cx="36" cy="47" r="2.2" fill="#FFFFFF" />
              <circle cx="60" cy="47" r="2.2" fill="#FFFFFF" />
              {/* Small determined mouth */}
              <circle cx="50" cy="57" r="2" fill="#090607" />
            </g>
          )}

          {state === 'retrieving' && (
            <g>
              {/* Curious searching eyes looking to side */}
              <ellipse cx="40" cy="49" rx="6.5" ry="6.5" fill="#090607" />
              <ellipse cx="64" cy="49" rx="6.5" ry="6.5" fill="#090607" />
              <circle cx="42" cy="47" r="2.2" fill="#FFFFFF" />
              <circle cx="66" cy="47" r="2.2" fill="#FFFFFF" />
              {/* Curious tiny 'o' mouth */}
              <ellipse cx="50" cy="59" rx="2.5" ry="3" fill="#090607" />
            </g>
          )}

          {state === 'generating' && (
            <g>
              {/* Focused thinking eyes with spectacles or laser focus */}
              <circle cx="38" cy="50" r="5" fill="#090607" />
              <circle cx="62" cy="50" r="5" fill="#090607" />
              <circle cx="37" cy="49" r="1.8" fill="#FFFFFF" />
              <circle cx="61" cy="49" r="1.8" fill="#FFFFFF" />
              {/* Cat smile while thinking */}
              <path d="M 46 58 Q 50 60 54 58" stroke="#090607" strokeWidth="2.4" strokeLinecap="round" fill="none" />
              {/* Sparkle of thought above ear */}
              <path d="M 82 24 L 85 18 L 88 24 L 94 27 L 88 30 L 85 36 L 82 30 L 76 27 Z" fill="#E6B8F0" />
            </g>
          )}

          {(state === 'ready' || state === 'quiz_completed') && (
            <g>
              {/* Big joyous celebratory eyes: ^ ^ */}
              <path d="M 32 52 L 38 45 L 44 52" stroke="#090607" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M 56 52 L 62 45 L 68 52" stroke="#090607" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              {/* Open happy smile */}
              <path d="M 45 57 Q 50 64 55 57 Z" fill="#090607" />
              <ellipse cx="50" cy="60" rx="2.5" ry="1.5" fill="#F3A4B5" />
            </g>
          )}

          {state === 'insufficient_evidence' && (
            <g>
              {/* Thoughtful / puzzled expression: one eye squinted, one wide */}
              <circle cx="37" cy="49" r="6" fill="#090607" />
              <circle cx="36" cy="47" r="2" fill="#FFFFFF" />
              <path d="M 58 50 L 66 50" stroke="#090607" strokeWidth="3" strokeLinecap="round" />
              {/* Wavy uncertain mouth */}
              <path d="M 44 58 Q 48 56 52 59 Q 56 56 58 58" stroke="#090607" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </g>
          )}

          {state === 'error' && (
            <g>
              {/* Concerned round eyes with slight brow furrow */}
              <ellipse cx="38" cy="51" rx="5" ry="5.5" fill="#090607" />
              <ellipse cx="62" cy="51" rx="5" ry="5.5" fill="#090607" />
              <circle cx="37" cy="49" r="1.5" fill="#FFFFFF" />
              <circle cx="61" cy="49" r="1.5" fill="#FFFFFF" />
              {/* Small inverted curve mouth */}
              <path d="M 46 60 Q 50 56 54 60" stroke="#090607" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>
          )}
        </svg>
      </div>

      {showStatusLabel && (
        <span className="text-[11px] font-mono-code font-medium text-[#BEB4BB] dark:text-[#BEB4BB]">
          {stateLabel}
        </span>
      )}
    </div>
  );
};
