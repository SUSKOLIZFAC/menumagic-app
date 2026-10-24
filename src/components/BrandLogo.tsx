import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'mark' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
  className?: string;
}

export function BrandLogo({
  variant = 'full',
  size = 'md',
  theme = 'light',
  className = '',
}: BrandLogoProps) {
  // Size specifications
  const markSizeMap = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const textStyleMap = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const accentDot = 'text-amber-500';

  const MarkSvg = (
    <div className={`relative ${markSizeMap[size]} shrink-0 flex items-center justify-center rounded-xl shadow-xs overflow-hidden`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background rounded squircle */}
        <rect width="64" height="64" rx="16" fill="#0F172A" />
        
        {/* Subtle inner highlight border */}
        <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" stroke="#334155" strokeWidth="1.5" />

        {/* Minimalist QR/Camera Scan Aperture Brackets */}
        <path
          d="M14 23V16C14 14.8954 14.8954 14 16 14H23"
          stroke="#94A3B8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M41 14H48C49.1046 14 50 14.8954 50 16V23"
          stroke="#94A3B8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M50 41V48C50 49.1046 49.1046 50 48 50H41"
          stroke="#94A3B8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M23 50H16C14.8954 50 14 49.1046 14 48V41"
          stroke="#94A3B8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Cloche Finial Handle */}
        <circle cx="32" cy="22.5" r="2.5" fill="#F59E0B" />

        {/* Cloche Dome */}
        <path
          d="M21 38C21 28.5 25.5 25 32 25C38.5 25 43 28.5 43 38H21Z"
          fill="url(#om-cloche-grad)"
        />

        {/* Serving Platter Baseline */}
        <rect x="19" y="40" width="26" height="2.5" rx="1.25" fill="#F8FAFC" />

        {/* Soft Golden Reflection Beam under platter */}
        <path
          d="M24 44.5H40"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />

        <defs>
          <linearGradient
            id="om-cloche-grad"
            x1="21"
            y1="25"
            x2="43"
            y2="38"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FBBF24" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );

  if (variant === 'mark') {
    return <div className={`inline-flex items-center ${className}`}>{MarkSvg}</div>;
  }

  const TextElement = (
    <span className={`font-sans tracking-tight ${textStyleMap[size]} ${textColor} leading-none whitespace-nowrap`}>
      <span className="font-semibold">One</span>
      <span className="font-extrabold">menu</span>
      <span className={accentDot}>.</span>
    </span>
  );

  if (variant === 'text') {
    return <div className={`inline-flex items-center ${className}`}>{TextElement}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {MarkSvg}
      {TextElement}
    </div>
  );
}
