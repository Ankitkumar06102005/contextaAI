import React, { useState, useEffect } from 'react';

interface MoonHorizonProps {
  isDarkMode?: boolean;
  intensity?: 'full' | 'subtle';
}

export const MoonHorizon: React.FC<MoonHorizonProps> = ({
  isDarkMode = true,
  intensity = 'full',
}) => {
  // Synchronously compute theme to prevent mismatch
  const [effectiveDark, setEffectiveDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || isDarkMode;
    }
    return isDarkMode;
  });

  useEffect(() => {
    setEffectiveDark(isDarkMode);
  }, [isDarkMode]);

  // Keep in sync with HTML class changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      const hasDark = document.documentElement.classList.contains('dark');
      setEffectiveDark(hasDark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden select-none z-0 transition-opacity duration-500"
      style={{
        height: intensity === 'subtle' ? '22vh' : '32vh',
        minHeight: intensity === 'subtle' ? '150px' : '200px',
        maxHeight: intensity === 'subtle' ? '240px' : '340px',
        opacity: effectiveDark
          ? (intensity === 'subtle' ? 0.75 : 0.88)
          : (intensity === 'subtle' ? 0.85 : 0.98),
      }}
    >
      {/* 1. Atmospheric backdrop with theme-tailored contrast */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: effectiveDark
            ? 'linear-gradient(to top, rgba(9, 6, 7, 0.95) 0%, rgba(18, 13, 20, 0.55) 45%, transparent 100%)'
            : 'linear-gradient(to top, rgba(230, 215, 238, 0.65) 0%, rgba(245, 238, 248, 0.3) 50%, transparent 100%)',
        }}
      />

      {/* 2. Primary Wide Radiant Aura */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-[-10%] w-[130%] sm:w-[115%] md:w-[105%] h-[120%] rounded-t-[100%] blur-3xl animate-shining-white-aura pointer-events-none transition-all duration-500"
        style={{
          background: effectiveDark
            ? 'radial-gradient(ellipse at 50% 25%, rgba(240, 230, 255, 0.35) 0%, rgba(190, 150, 235, 0.18) 28%, rgba(172, 30, 214, 0.08) 55%, transparent 75%)'
            : 'radial-gradient(ellipse at 50% 20%, rgba(255, 255, 255, 1) 0%, rgba(243, 230, 255, 0.85) 25%, rgba(220, 195, 245, 0.45) 50%, rgba(172, 30, 214, 0.15) 75%, transparent 85%)',
        }}
      />

      {/* 3. Secondary Concentrated Inner Corona */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-[-5%] w-[110%] sm:w-[95%] h-[90%] rounded-t-[100%] blur-2xl animate-aura-corona-pulse pointer-events-none transition-all duration-500"
        style={{
          background: effectiveDark
            ? 'radial-gradient(ellipse at 50% 18%, rgba(255, 255, 255, 0.5) 0%, rgba(215, 185, 245, 0.28) 20%, rgba(172, 30, 214, 0.1) 45%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 15%, rgba(255, 255, 255, 1) 0%, rgba(240, 222, 255, 0.9) 20%, rgba(200, 170, 240, 0.5) 45%, transparent 70%)',
        }}
      />

      {/* 4. High-Definition Curved Moon Horizon SVG */}
      <svg
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[160%] sm:w-[130%] md:w-[115%] h-full max-h-[340px] animate-shining-white-aura transition-all duration-500 ${
          effectiveDark
            ? 'drop-shadow-[0_-3px_12px_rgba(255,255,255,0.4)] drop-shadow-[0_-6px_22px_rgba(172,30,214,0.28)]'
            : 'drop-shadow-[0_-5px_18px_rgba(172,30,214,0.32)] drop-shadow-[0_-2px_8px_rgba(146,24,181,0.25)]'
        }`}
        viewBox="0 0 1600 500"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Luminous Moon Surface Gradient - Tailored for both modes */}
          <radialGradient id="lunarBodyGrad" cx="50%" cy="8%" r="80%">
            {effectiveDark ? (
              <>
                <stop offset="0%" stopColor="#F7F3F6" stopOpacity="0.95" />
                <stop offset="12%" stopColor="#D8CEDC" stopOpacity="0.85" />
                <stop offset="30%" stopColor="#382A3D" stopOpacity="0.95" />
                <stop offset="60%" stopColor="#1D1422" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#0B080D" stopOpacity="1" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="12%" stopColor="#FAF5FC" stopOpacity="0.99" />
                <stop offset="35%" stopColor="#EFE3F4" stopOpacity="0.98" />
                <stop offset="65%" stopColor="#DECEE6" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#CCB5D6" stopOpacity="0.95" />
              </>
            )}
          </radialGradient>

          {/* Laser Rim Glow Gradient */}
          <linearGradient id="shiningRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            {effectiveDark ? (
              <>
                <stop offset="0%" stopColor="#AC1ED6" stopOpacity="0.1" />
                <stop offset="20%" stopColor="#AC1ED6" stopOpacity="0.4" />
                <stop offset="42%" stopColor="#E6B8F0" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="58%" stopColor="#E6B8F0" stopOpacity="0.8" />
                <stop offset="80%" stopColor="#AC1ED6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#AC1ED6" stopOpacity="0.1" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#9218B5" stopOpacity="0.25" />
                <stop offset="20%" stopColor="#AC1ED6" stopOpacity="0.6" />
                <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="80%" stopColor="#AC1ED6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#9218B5" stopOpacity="0.25" />
              </>
            )}
          </linearGradient>

          {/* Atmospheric Aura Corona Gradient */}
          <linearGradient id="auraAtmosphere" x1="0%" y1="0%" x2="100%" y2="0%">
            {effectiveDark ? (
              <>
                <stop offset="10%" stopColor="#AC1ED6" stopOpacity="0" />
                <stop offset="38%" stopColor="#E6B8F0" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.7" />
                <stop offset="62%" stopColor="#E6B8F0" stopOpacity="0.45" />
                <stop offset="90%" stopColor="#AC1ED6" stopOpacity="0" />
              </>
            ) : (
              <>
                <stop offset="10%" stopColor="#AC1ED6" stopOpacity="0" />
                <stop offset="35%" stopColor="#9218B5" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="65%" stopColor="#9218B5" stopOpacity="0.5" />
                <stop offset="90%" stopColor="#AC1ED6" stopOpacity="0" />
              </>
            )}
          </linearGradient>

          {/* Lunar maria crater shading gradients */}
          <radialGradient id="craterGlow1" cx="48%" cy="32%" r="48%">
            <stop offset="0%" stopColor={effectiveDark ? '#AC1ED6' : '#9218B5'} stopOpacity={effectiveDark ? '0.14' : '0.22'} />
            <stop offset="50%" stopColor={effectiveDark ? '#64748B' : '#CBD5E1'} stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="craterGlow2" cx="54%" cy="40%" r="42%">
            <stop offset="0%" stopColor={effectiveDark ? '#C26E73' : '#7C3AED'} stopOpacity={effectiveDark ? '0.12' : '0.18'} />
            <stop offset="60%" stopColor={effectiveDark ? '#332438' : '#E2D7E8'} stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Glowing Aura Filter */}
          <filter id="moonAuraBloom" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. The Full Moon Body */}
        <path
          d="M 0 500 L 0 460 Q 800 60 1600 460 L 1600 500 Z"
          fill="url(#lunarBodyGrad)"
        />

        {/* 2. Tactile Lunar Surface Maria (craters) */}
        <ellipse cx="680" cy="220" rx="150" ry="48" fill="url(#craterGlow1)" />
        <ellipse cx="940" cy="255" rx="200" ry="60" fill="url(#craterGlow2)" />
        <ellipse cx="480" cy="320" rx="120" ry="38" fill="url(#craterGlow1)" />
        <ellipse cx="1140" cy="330" rx="140" ry="42" fill="url(#craterGlow2)" />
        <ellipse cx="800" cy="180" rx="90" ry="28" fill="url(#craterGlow1)" opacity="0.75" />

        {/* 3. Diffuse Luminous Corona along the Horizon Arc */}
        <path
          d="M 0 460 Q 800 60 1600 460"
          stroke="url(#auraAtmosphere)"
          strokeWidth={effectiveDark ? '9' : '12'}
          fill="none"
          opacity={effectiveDark ? '0.5' : '0.8'}
          filter="url(#moonAuraBloom)"
        />

        {/* 4. Secondary Glowing Atmospheric Stroke */}
        <path
          d="M 10 459 Q 800 59 1590 459"
          stroke={effectiveDark ? '#FFFFFF' : '#FAF5FF'}
          strokeWidth="4"
          fill="none"
          opacity={effectiveDark ? '0.6' : '0.9'}
          filter="url(#moonAuraBloom)"
        />

        {/* 5. Primary Laser-Sharp Shining Horizon Rim */}
        <path
          d="M 0 460 Q 800 60 1600 460"
          stroke="url(#shiningRimGrad)"
          strokeWidth={effectiveDark ? '2.8' : '3.6'}
          fill="none"
          strokeLinecap="round"
        />

        {/* 6. Ultra-Bright Shining Apex Diamond Highlight */}
        <path
          d="M 640 105 Q 800 60 960 105"
          stroke="#FFFFFF"
          strokeWidth={effectiveDark ? '2' : '2.8'}
          fill="none"
          opacity={effectiveDark ? '0.85' : '1'}
          strokeLinecap="round"
        />

        {/* 7. Ethereal Shimmering Celestial Star Sparkles hovering over the crest */}
        <g className="animate-lunar-sparkle" style={{ transformOrigin: '720px 85px' }}>
          <path d="M 720 77 Q 720 85 712 85 Q 720 85 720 93 Q 720 85 728 85 Q 720 85 720 77 Z" fill="#FFFFFF" opacity="0.95" />
          <circle cx="720" cy="85" r="1.5" fill="#FFFFFF" />
        </g>

        <g className="animate-lunar-sparkle" style={{ transformOrigin: '800px 52px', animationDelay: '1.2s' }}>
          <path d="M 800 42 Q 800 52 790 52 Q 800 52 800 62 Q 800 52 810 52 Q 800 52 800 42 Z" fill="#FFFFFF" opacity="1" />
          <circle cx="800" cy="52" r="2" fill="#FFFFFF" />
        </g>

        <g className="animate-lunar-sparkle" style={{ transformOrigin: '880px 85px', animationDelay: '2.1s' }}>
          <path d="M 880 77 Q 880 85 872 85 Q 880 85 880 93 Q 880 85 888 85 Q 880 85 880 77 Z" fill="#FFFFFF" opacity="0.95" />
          <circle cx="880" cy="85" r="1.5" fill="#FFFFFF" />
        </g>

        <g className="animate-lunar-sparkle" style={{ transformOrigin: '560px 145px', animationDelay: '0.6s' }}>
          <circle cx="560" cy="145" r="2.2" fill={effectiveDark ? '#E6B8F0' : '#FFFFFF'} opacity="0.85" />
        </g>

        <g className="animate-lunar-sparkle" style={{ transformOrigin: '1040px 145px', animationDelay: '1.7s' }}>
          <circle cx="1040" cy="145" r="2.2" fill={effectiveDark ? '#E6B8F0' : '#FFFFFF'} opacity="0.85" />
        </g>
      </svg>
    </div>
  );
};
