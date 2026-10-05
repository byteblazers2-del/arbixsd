import React from 'react';

/**
 * Custom SVG Icons specified by the user:
 * 1. FaLanguageIcon (Language - 640x512)
 * 2. FaWalletIcon (Wallet - 512x512)
 * 3. FaReferralIcon (People Group - 640x512)
 * 4. FaEarningsIcon (Sack Dollar - 512x512)
 * 5. FaFaqIcon (Circle Question - 512x512)
 * 6. FaDollarIcon (Dollar Sign - 320x512)
 * 7. FaMarketIcon (Store - 576x512)
 * 8. FaGiftIcon (Gift - 512x512)
 * 9. FaEnergyIcon (Bolt - 448x512)
 * 10. FaShareIcon (Share - 512x512)
 * 11. FaSupportIcon (Headset - 512x512)
 */

// 1. Language
export function FaLanguageIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 640 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M0 128C0 92.7 28.7 64 64 64H256h48 16H576c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H320 304 256 64c-35.3 0-64-28.7-64-64V128zm320 0V384H576V128H320zM178.3 175.9c-3.2-7.2-10.4-11.9-18.3-11.9s-15.1 4.7-18.3 11.9l-64 144c-4.5 10.1 .1 21.9 10.2 26.4s21.9-.1 26.4-10.2l8.9-20.1h73.6l8.9 20.1c4.5 10.1 16.3 14.6 26.4 10.2s14.6-16.3 10.2-26.4l-64-144zM160 233.2L179 276H141l19-42.8zM448 164c11 0 20 9 20 20v4h44 16c11 0 20 9 20 20s-9 20-20 20h-2l-1.6 4.5c-8.9 24.4-22.4 46.6-39.6 65.4c.9 .6 1.8 1.1 2.7 1.6l18.9 11.3c9.5 5.7 12.5 18 6.9 27.4s-18 12.5-27.4 6.9l-18.9-11.3c-4.5-2.7-8.8-5.5-13.1-8.5c-10.6 7.5-21.9 14-34 19.4l-3.6 1.6c-10.1 4.5-21.9-.1-26.4-10.2s.1-21.9 10.2-26.4l3.6-1.6c6.4-2.9 12.6-6.1 18.5-9.8l-12.2-12.2c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l14.6 14.6 .5 .5c12.4-13.1 22.5-28.3 29.8-45H448 376c-11 0-20-9-20-20s9-20 20-20h52v-4c0-11 9-20 20-20z"/>
    </svg>
  );
}

// 2. Wallet
export function FaWalletIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64H80c-8.8 0-16-7.2-16-16s7.2-16 16-16H448c17.7 0 32-14.3 32-32s-14.3-32-32-32H64zM416 272a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>
    </svg>
  );
}

// 3. Referral (People Group)
export function FaReferralIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 640 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M72 88a56 56 0 1 1 112 0A56 56 0 1 1 72 88zM64 245.7C54 256.9 48 271.8 48 288s6 31.1 16 42.3V245.7zm144.4-49.3C178.7 222.7 160 261.2 160 304c0 34.3 12 65.8 32 90.5V416c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V389.2C26.2 371.2 0 332.7 0 288c0-61.9 50.1-112 112-112h32c24 0 46.2 7.5 64.4 20.3zM448 416V394.5c20-24.7 32-56.2 32-90.5c0-42.8-18.7-81.3-48.4-107.7C449.8 183.5 472 176 496 176h32c61.9 0 112 50.1 112 112c0 44.7-26.2 83.2-64 101.2V416c0 17.7-14.3 32-32 32H480c-17.7 0-32-14.3-32-32zm8-328a56 56 0 1 1 112 0A56 56 0 1 1 456 88zM576 245.7v84.7c10-11.3 16-26.1 16-42.3s-6-31.1-16-42.3zM320 32a64 64 0 1 1 0 128 64 64 0 1 1 0-128zM240 304c0 16.2 6 31 16 42.3V261.7c-10 11.3-16 26.1-16 42.3zm144-42.3v84.7c10-11.3 16-26.1 16-42.3s-6-31.1-16-42.3zM448 304c0 44.7-26.2 83.2-64 101.2V448c0 17.7-14.3 32-32 32H288c-17.7 0-32-14.3-32-32V405.2c-37.8-18-64-56.5-64-101.2c0-61.9 50.1-112 112-112h32c61.9 0 112 50.1 112 112z"/>
    </svg>
  );
}

// 4. Earnings (Sack Dollar)
export function FaEarningsIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M320 96H192L144.6 24.9C137.5 14.2 145.1 0 157.9 0H354.1c12.8 0 20.4 14.2 13.3 24.9L320 96zM192 128H320c3.8 2.5 8.1 5.3 13 8.4C389.7 172.7 512 250.9 512 416c0 53-43 96-96 96H96c-53 0-96-43-96-96C0 250.9 122.3 172.7 179 136.4l0 0 0 0c4.8-3.1 9.2-5.9 13-8.4zm84 88c0-11-9-20-20-20s-20 9-20 20v14c-7.6 1.7-15.2 4.4-22.2 8.5c-13.9 8.3-25.9 22.8-25.8 43.9c.1 20.3 12 33.1 24.7 40.7c11 6.6 24.7 10.8 35.6 14l1.7 .5c12.6 3.8 21.8 6.8 28 10.7c5.1 3.2 5.8 5.4 5.9 8.2c.1 5-1.8 8-5.9 10.5c-5 3.1-12.9 5-21.4 4.7c-11.1-.4-21.5-3.9-35.1-8.5c-2.3-.8-4.7-1.6-7.2-2.4c-10.5-3.5-21.8 2.2-25.3 12.6s2.2 21.8 12.6 25.3c1.9 .6 4 1.3 6.1 2.1l0 0 0 0c8.3 2.9 17.9 6.2 28.2 8.4V424c0 11 9 20 20 20s20-9 20-20V410.2c8-1.7 16-4.5 23.2-9c14.3-8.9 25.1-24.1 24.8-45c-.3-20.3-11.7-33.4-24.6-41.6c-11.5-7.2-25.9-11.6-37.1-15l0 0-.7-.2c-12.8-3.9-21.9-6.7-28.3-10.5c-5.2-3.1-5.3-4.9-5.3-6.7c0-3.7 1.4-6.5 6.2-9.3c5.4-3.2 13.6-5.1 21.5-5c9.6 .1 20.2 2.2 31.2 5.2c10.7 2.8 21.6-3.5 24.5-14.2s-3.5-21.6-14.2-24.5c-6.5-1.7-13.7-3.4-21.1-4.7V216z"/>
    </svg>
  );
}

// 5. FAQ (Circle Question)
export function FaFaqIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM169.8 165.3c7.9-22.3 29.1-37.3 52.8-37.3h58.3c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10.9 23.6-24 23.6c-13.3 0-24-10.7-24-24V250.5c0-8.6 4.6-16.5 12.1-20.8l44.3-25.4c4.7-2.7 7.6-7.7 7.6-13.1c0-8.4-6.8-15.1-15.1-15.1H222.6c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
    </svg>
  );
}

// 6. Dollar (Dollar Sign)
export function FaDollarIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 320 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M160 0c17.7 0 32 14.3 32 32V67.7c1.6 .2 3.1 .4 4.7 .7c.4 .1 .7 .1 1.1 .2l48 8.8c17.4 3.2 28.9 19.9 25.7 37.2s-19.9 28.9-37.2 25.7l-47.5-8.7c-31.3-4.6-58.9-1.5-78.3 6.2s-27.2 18.3-29 28.1c-2 10.7-.5 16.7 1.2 20.4c1.8 3.9 5.5 8.3 12.8 13.2c16.3 10.7 41.3 17.7 73.7 26.3l2.9 .8c28.6 7.6 63.6 16.8 89.6 33.8c14.2 9.3 27.6 21.9 35.9 39.5c8.5 17.9 10.3 37.9 6.4 59.2c-6.9 38-33.1 63.4-65.6 76.7c-13.7 5.6-28.6 9.2-44.4 11V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V445.1c-.4-.1-.9-.1-1.3-.2l-.2 0 0 0c-24.4-3.8-64.5-14.3-91.5-26.3c-16.1-7.2-23.4-26.1-16.2-42.2s26.1-23.4 42.2-16.2c20.9 9.3 55.3 18.5 75.2 21.6c31.9 4.7 58.2 2 76-5.3c16.9-6.9 24.6-16.9 26.8-28.9c1.9-10.6 .4-16.7-1.3-20.4c-1.9-4-5.6-8.4-13-13.3c-16.4-10.7-41.5-17.7-74-26.3l-2.8-.7 0 0C119.4 279.3 84.4 270 58.4 253c-14.2-9.3-27.5-22-35.8-39.6c-8.4-17.9-10.1-37.9-6.1-59.2C23.7 116 52.3 91.2 84.8 78.3c13.3-5.3 27.9-8.9 43.2-11V32c0-17.7 14.3-32 32-32z"/>
    </svg>
  );
}

// 7. Market (Store)
export function FaMarketIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 576 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M547.6 103.8L490.3 13.1C485.2 5 476.1 0 466.4 0H109.6C99.9 0 90.8 5 85.7 13.1L28.3 103.8c-29.6 46.8-3.4 111.9 51.9 119.4c4 .5 8.1 .8 12.1 .8c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.2 0 49.3-11.4 65.2-29c16 17.6 39.1 29 65.2 29c4.1 0 8.1-.3 12.1-.8c55.5-7.4 81.8-72.5 52.1-119.4zM499.7 254.9l-.1 0c-5.3 .7-10.7 1.1-16.2 1.1c-12.4 0-24.3-1.9-35.4-5.3V384H128V250.6c-11.2 3.5-23.2 5.4-35.6 5.4c-5.5 0-11-.4-16.3-1.1l-.1 0c-4.1-.6-8.1-1.3-12-2.3V384v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V384 252.6c-4 1-8 1.8-12.3 2.3z"/>
    </svg>
  );
}

// 8. Gift
export function FaGiftIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M190.5 68.8L225.3 128H224 152c-22.1 0-40-17.9-40-40s17.9-40 40-40h2.2c14.9 0 28.8 7.9 36.3 20.8zM64 88c0 14.4 3.5 28 9.6 40H32c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32H480c17.7 0 32-14.3 32-32V160c0-17.7-14.3-32-32-32H438.4c6.1-12 9.6-25.6 9.6-40c0-48.6-39.4-88-88-88h-2.2c-31.9 0-61.5 16.9-77.7 44.4L256 85.5l-24.1-41C215.7 16.9 186.1 0 154.2 0H152C103.4 0 64 39.4 64 88zm336 0c0 22.1-17.9 40-40 40H288h-1.3l34.8-59.2C329.1 55.9 342.9 48 357.8 48H360c22.1 0 40 17.9 40 40zM32 288V464c0 26.5 21.5 48 48 48H224V288H32zM288 512H432c26.5 0 48-21.5 48-48V288H288V512z"/>
    </svg>
  );
}

// 9. Energy (Bolt)
export function FaEnergyIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 448 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M349.4 44.6c5.9-13.7 1.5-29.7-10.6-38.5s-28.6-8-39.9 1.8l-256 224c-10 8.8-13.6 22.9-8.9 35.3S50.7 288 64 288H175.5L98.6 467.4c-5.9 13.7-1.5 29.7 10.6 38.5s28.6 8 39.9-1.8l256-224c10-8.8 13.6-22.9 8.9-35.3s-16.6-20.7-30-20.7H272.5L349.4 44.6z"/>
    </svg>
  );
}

// 10. Share
export function FaShareIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M307 34.8c-11.5 5.1-19 16.6-19 29.2v64H176C78.8 128 0 206.8 0 304C0 417.3 81.5 467.9 100.2 478.1c2.5 1.4 5.3 1.9 8.1 1.9c10.9 0 19.7-8.9 19.7-19.7c0-7.5-4.3-14.4-9.8-19.5C108.8 431.9 96 414.4 96 384c0-53 43-96 96-96h96v64c0 12.6 7.4 24.1 19 29.2s25 3 34.4-5.4l160-144c6.7-6.1 10.6-14.7 10.6-23.8s-3.8-17.7-10.6-23.8l-160-144c-9.4-8.5-22.9-10.6-34.4-5.4z"/>
    </svg>
  );
}

// 11. Support (Headset)
export function FaSupportIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className={className} 
      aria-hidden="true" 
      focusable="false" 
      role="img" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="currentColor"
      {...props}
    >
      <path fill="currentColor" d="M256 48C141.1 48 48 141.1 48 256v40c0 13.3-10.7 24-24 24s-24-10.7-24-24V256C0 114.6 114.6 0 256 0S512 114.6 512 256V400.1c0 48.6-39.4 88-88.1 88L313.6 488c-8.3 14.3-23.8 24-41.6 24H240c-26.5 0-48-21.5-48-48s21.5-48 48-48h32c17.8 0 33.3 9.7 41.6 24l110.4 .1c22.1 0 40-17.9 40-40V256c0-114.9-93.1-208-208-208zM144 208h16c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32H144c-35.3 0-64-28.7-64-64V272c0-35.3 28.7-64 64-64zm224 0c35.3 0 64 28.7 64 64v48c0 35.3-28.7 64-64 64H352c-17.7 0-32-14.3-32-32V240c0-17.7 14.3-32 32-32h16z"/>
    </svg>
  );
}

// Country Flag 1: Russian Federation (Circular)
export function RuFlagIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  const id = React.useId();
  const clipId = `ru-flag-clip-${id.replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Russian Flag" {...props}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50"/>
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="33.34" fill="#fff"/>
        <rect y="33.33" width="100" height="33.34" fill="#0039A6"/>
        <rect y="66.66" width="100" height="33.34" fill="#D52B1E"/>
      </g>
    </svg>
  );
}

// Country Flag 2: United Kingdom / English (Circular)
export function UkFlagIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  const id = React.useId();
  const clipId = `uk-flag-clip-${id.replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="UK Flag" {...props}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50"/>
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="100" fill="#012169"/>
        <path d="M0 0L100 100M100 0L0 100" stroke="#fff" strokeWidth="20"/>
        <path d="M0 0L100 100M100 0L0 100" stroke="#C8102E" strokeWidth="8"/>
        <path d="M50 0V100M0 50H100" stroke="#fff" strokeWidth="30"/>
        <path d="M50 0V100M0 50H100" stroke="#C8102E" strokeWidth="18"/>
      </g>
    </svg>
  );
}

// Country Flag 3: China / Chinese (Circular)
export function CnFlagIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Chinese Flag" {...props}>
      <circle cx="50" cy="50" r="50" fill="#DE2910"/>
      <path fill="#FFDE00" d="M25 17l3.5 10.8h11.4l-9.2 6.7 3.5 10.8-9.2-6.7-9.2 6.7 3.5-10.8-9.2-6.7h11.4z"/>
      <path fill="#FFDE00" d="M48 12l2 6h6.3l-5.1 3.7 2 6-5.2-3.7-5.1 3.7 2-6-5.1-3.7h6.3z"/>
      <path fill="#FFDE00" d="M61 27l2 6h6.3l-5.1 3.7 2 6-5.2-3.7-5.1 3.7 2-6-5.1-3.7h6.3z"/>
      <path fill="#FFDE00" d="M62 46l2 6h6.3l-5.1 3.7 2 6-5.2-3.7-5.1 3.7 2-6-5.1-3.7h6.3z"/>
      <path fill="#FFDE00" d="M49 62l2 6h6.3l-5.1 3.7 2 6-5.2-3.7-5.1 3.7 2-6-5.1-3.7h6.3z"/>
    </svg>
  );
}

// Country Flag 4: Iran / Persian (Circular)
export function IrFlagIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  const id = React.useId();
  const clipId = `ir-flag-clip-${id.replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Iranian Flag" {...props}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50"/>
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="33.34" fill="#239F40"/>
        <rect y="33.33" width="100" height="33.34" fill="#FFFFFF"/>
        <rect y="66.66" width="100" height="33.34" fill="#DA0000"/>
        <circle cx="50" cy="50" r="8" fill="#DA0000"/>
      </g>
    </svg>
  );
}

// Country Flag 5: UAE / Arabic (Circular)
export function AeFlagIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  const id = React.useId();
  const clipId = `ae-flag-clip-${id.replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Arabic Flag" {...props}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50"/>
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="33.34" fill="#00732F"/>
        <rect y="33.33" width="100" height="33.34" fill="#FFFFFF"/>
        <rect y="66.66" width="100" height="33.34" fill="#000000"/>
        <rect width="30" height="100" fill="#FF0000"/>
      </g>
    </svg>
  );
}

// Country Flag 6: Turkey / Turkish (Circular)
export function TrFlagIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Turkish Flag" {...props}>
      <circle cx="50" cy="50" r="50" fill="#E30A17"/>
      <circle cx="44" cy="50" r="22" fill="#FFFFFF"/>
      <circle cx="50" cy="50" r="18" fill="#E30A17"/>
      <polygon points="62,50 54,44 57,54 51,47 59,47" fill="#FFFFFF"/>
    </svg>
  );
}

// Unified Language Flag Component (Strictly English, Russian, Chinese)
export function LanguageFlagIcon({ code, className = "w-5 h-5", ...props }: { code: string; className?: string } & React.SVGProps<SVGSVGElement>) {
  if (code === 'ru') return <RuFlagIcon className={className} {...props} />;
  if (code === 'zh' || code === 'cn') return <CnFlagIcon className={className} {...props} />;
  return <UkFlagIcon className={className} {...props} />;
}

// 12. Telegram Paper Plane Icon (Clean crisp white vector from provided SVG)
export function TelegramPlaneIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path 
        d="M23.5 4.2 20.1 20c-.3 1.1-.9 1.4-1.9.9l-5.3-3.9-2.6 2.5c-.3.3-.5.5-1 .5l.4-5.4 9.8-8.8c.4-.4-.1-.6-.6-.2L6.8 13.2 1.6 11.6C.5 11.3.5 10.5 1.8 10L22.1 2.2c.9-.3 1.7.2 1.4 2z"
        fill="currentColor"
      />
    </svg>
  );
}
