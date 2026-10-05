import React from 'react';

interface IconProps {
  className?: string;
}

export function SolidHome({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.09961L1 12.0996H4V20.0996C4 20.6519 4.44772 21.0996 5 21.0996H10V15.0996H14V21.0996H19C19.5523 21.0996 20 20.6519 20 20.0996V12.0996H23L12 2.09961Z" />
    </svg>
  );
}

export function SolidZap({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
    </svg>
  );
}

export function SolidWallet({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 7.28V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V16.72C21.59 16.37 22 15.74 22 15V9C22 8.26 21.59 7.63 21 7.28ZM19 19H5V5H19V7H12C10.9 7 10 7.9 10 9V15C10 16.1 10.9 17 12 17H19V19ZM20 15H12V9H20V15ZM16 13C16.5523 13 17 12.5523 17 12C17 11.4477 16.5523 11 16 11C15.4477 11 15 11.4477 15 12C15 12.5523 15.4477 13 16 13Z" />
    </svg>
  );
}

export function SolidUser({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12ZM12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" />
    </svg>
  );
}

export function SolidShield({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L4 5V11C4 16.55 7.41 21.74 12 23C16.59 21.74 20 16.55 20 11V5L12 2ZM10 16.5L6 12.5L7.41 11.09L10 13.67L16.59 7.08L18 8.5L10 16.5Z" />
    </svg>
  );
}

export function SolidSend({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" />
    </svg>
  );
}

export function SolidPlus({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
    </svg>
  );
}

export function SolidArrowUp({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 20H11V8L5.5 13.5L4.08 12.08L12 4.16L19.92 12.08L18.5 13.5L13 8V20Z" />
    </svg>
  );
}

export function SolidBell({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" />
    </svg>
  );
}

export function SolidUsdtLogo({ className = "w-8 h-8" }: IconProps) {
  return (
    <div className={`rounded-full bg-[#009393] flex items-center justify-center text-white border-[#009393]/20 shrink-0 ${className}`}>
      <span className="font-black text-white text-sm select-none leading-none">₮</span>
    </div>
  );
}
