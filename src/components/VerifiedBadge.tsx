import React from 'react';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

/**
 * Official Telegram Verified Rosette Badge
 * Exactly matching the Telegram phone verification header badge in Loans.tsx:
 * 16-point scalloped rosette star path with checkmark
 */
export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ 
  className = "w-3.5 h-3.5",
  size
}) => {
  const sizeStyle = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <svg 
      viewBox="0 0 48 48" 
      className={`shrink-0 inline-block align-middle select-none ${className}`}
      style={sizeStyle}
      fill="none"
    >
      <title>Telegram Verified</title>
      {/* 16-point Telegram Scalloped Rosette Flower from Phone Verification Header */}
      <path
        d="M24 4L28.3 8.3L34.4 8.1L36.8 13.7L42.1 16.9L41.3 23L44 28.5L39.6 32.7L39.9 38.8L33.8 40L30.2 44.9L24 42.8L17.8 44.9L14.2 40L8.1 38.8L8.4 32.7L4 28.5L6.7 23L5.9 16.9L11.2 13.7L13.6 8.1L19.7 8.3L24 4Z"
        fill="#2EA5FF"
      />
      {/* White Verified Checkmark */}
      <path
        d="M17 24.5L22 29.5L31 18.5"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
