import React from 'react';
import { TelegramStarIcon } from './TelegramStarIcon';

interface CryptoIconProps {
  symbol: string;
  network?: string;
  className?: string;
  customIconUrl?: string;
}

export function CryptoIcon({ symbol, network, className = "w-6 h-6", customIconUrl }: CryptoIconProps) {
  const [imgError, setImgError] = React.useState(false);
  let raw = (symbol || '').toUpperCase().trim();
  const net = (network || '').toUpperCase().trim();

  // Strip trailing USDT for ticker pairs like TONUSDT, BTCUSDT, SUIUSDT, etc.
  if (raw.endsWith('USDT') && raw !== 'USDT') {
    raw = raw.replace(/USDT$/, '');
  }

  // Telegram Stars: Unboxed, borderless, no cadre/circle clip, bigger optical presence
  if (raw === 'STARS' || raw === 'XTR') {
    let starsCustomIcon: string | undefined | null = customIconUrl;
    if (!starsCustomIcon && typeof window !== 'undefined' && window.localStorage) {
      starsCustomIcon = localStorage.getItem('custom_icon_STARS') || 
                        localStorage.getItem('custom_stars_icon_url') ||
                        localStorage.getItem('custom_icon_wallet_stars-stars-native') ||
                        localStorage.getItem('custom_icon_wallet_stars');
    }

    // Strip rounded, border and background classes so STARS is completely frame-free
    const cleanedClass = className
      .replace(/\brounded-\S+/g, '')
      .replace(/\bborder\S*/g, '')
      .replace(/\bbg-\S+/g, '')
      .trim();

    return (
      <TelegramStarIcon 
        className={`${cleanedClass} scale-125 object-contain overflow-visible`} 
        customIconUrl={starsCustomIcon || undefined} 
      />
    );
  }

  // Resolve custom icon URL with strict network specificity
  let activeCustomIcon: string | undefined | null = customIconUrl;

  if (!activeCustomIcon && typeof window !== 'undefined' && window.localStorage) {
    // If a network is provided:
    if (net) {
      // 1. Direct wallet ID match (e.g. custom_icon_wallet_usdt-ton)
      activeCustomIcon = localStorage.getItem(`custom_icon_wallet_${raw.toLowerCase()}-${net.toLowerCase()}`);
      
      // 2. Direct symbol + network match (e.g. custom_icon_USDT_TON)
      if (!activeCustomIcon) {
        activeCustomIcon = localStorage.getItem(`custom_icon_${raw}_${net}`);
      }

      // 3. Network aliases
      if (!activeCustomIcon) {
        if (net.includes('TON') || net.includes('GRAM')) {
          activeCustomIcon = localStorage.getItem(`custom_icon_${raw}_TON`) || 
                             localStorage.getItem(`custom_icon_wallet_${raw.toLowerCase()}-ton`);
        } else if (net.includes('TRC') || net.includes('TRON')) {
          activeCustomIcon = localStorage.getItem(`custom_icon_${raw}_TRC20`) || 
                             localStorage.getItem(`custom_icon_${raw}_TRON`) || 
                             localStorage.getItem(`custom_icon_wallet_${raw.toLowerCase()}-trc20`);
        } else if (net.includes('BEP') || net.includes('BSC') || net.includes('BNB')) {
          activeCustomIcon = localStorage.getItem(`custom_icon_${raw}_BEP20`) || 
                             localStorage.getItem(`custom_icon_${raw}_BSC`) || 
                             localStorage.getItem(`custom_icon_wallet_${raw.toLowerCase()}-bsc`);
        } else if (net.includes('ERC') || net.includes('ETH')) {
          activeCustomIcon = localStorage.getItem(`custom_icon_${raw}_ERC20`) || 
                             localStorage.getItem(`custom_icon_${raw}_ETH`) || 
                             localStorage.getItem(`custom_icon_wallet_${raw.toLowerCase()}-erc20`);
        } else if (net.includes('SOL')) {
          activeCustomIcon = localStorage.getItem(`custom_icon_${raw}_SOL`) || 
                             localStorage.getItem(`custom_icon_wallet_${raw.toLowerCase()}-sol`);
        } else if (net.includes('POLY') || net.includes('MATIC')) {
          activeCustomIcon = localStorage.getItem(`custom_icon_${raw}_POLYGON`) || 
                             localStorage.getItem(`custom_icon_wallet_${raw.toLowerCase()}-polygon`);
        }
      }
    } else {
      // No network provided: ONLY check general icon if it's NOT a multi-network token like USDT or USDC!
      if (raw !== 'USDT' && raw !== 'USDC') {
        activeCustomIcon = localStorage.getItem(`custom_icon_${raw}`) || localStorage.getItem(`custom_icon_${symbol}`);
      }
    }

    if (raw === 'STARS' || raw === 'XTR') {
      if (!activeCustomIcon) {
        activeCustomIcon = localStorage.getItem('custom_icon_STARS') || 
                           localStorage.getItem('custom_icon_wallet_stars-stars-native') ||
                           localStorage.getItem('custom_icon_wallet_stars') ||
                           localStorage.getItem('custom_stars_icon_url') ||
                           '/telegram-stars.png';
      }
    }
  }

  if (activeCustomIcon && !imgError) {
    return (
      <img 
        src={activeCustomIcon} 
        alt={`${symbol} ${network || ''}`} 
        className={`${className} object-contain rounded-full`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  }

  // NOT (Notcoin)
  if (raw === 'NOT' || raw.includes('NOTCOIN')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#000000"/>
        <path d="M16 8L23 22H9L16 8Z" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round"/>
      </svg>
    );
  }

  // USDe (Ethena USDe)
  if (raw === 'USDE' || raw.includes('ETHENA')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill="#18181B" stroke="#27272A" strokeWidth="1"/>
        <circle cx="16" cy="16" r="11" fill="none" stroke="#FFFFFF" strokeWidth="1.2"/>
        <text x="16" y="20.5" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">$</text>
      </svg>
    );
  }

  // STAKED (Staked TON / Tonstakers)
  if (raw === 'STAKED' || raw.includes('TONSTAKERS') || raw === 'TSG' || raw === 'TSTON') {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#22C55E"/>
        <path d="M16 6.5L24 16L16 25.5L8 16L16 6.5Z" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M16 10L21 16L16 22L11 16L16 10Z" fill="#FFFFFF"/>
      </svg>
    );
  }
  
  if (raw === 'STARS' || raw === 'XTR') {
    return <TelegramStarIcon className={className} customIconUrl={activeCustomIcon || undefined} />;
  }

  // 1. USDT (Tether) & Multi-Network Sub-Badges
  if (raw === 'USDT' || raw.includes('TETHER')) {
    // TRC20 (Tron)
    if (net.includes('TRC') || net.includes('TRON') || raw.includes('TRC20')) {
      return (
        <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" fill="#26A17B"/>
          <path fill="#FFF" d="M17.92 16.38c-.1.01-.68.04-1.94.04-1.01 0-1.72-.03-1.97-.04-3.89-.17-6.79-.85-6.79-1.66s2.9-1.49 6.79-1.66v2.64c.25.02.98.06 1.99.06 1.2 0 1.81-.05 1.92-.06v-2.64c3.88.17 6.78.85 6.78 1.66s-2.9 1.48-6.78 1.66m0-3.59v-2.37h5.41V6.82H8.6v3.61h5.41v2.36c-4.4.2-7.7 1.08-7.7 2.12s3.3 1.92 7.7 2.12v6.58h3.91v-6.58c4.4-.2 7.7-1.08 7.7-2.12s-3.3-1.92-7.7-2.12"/>
          {/* Sub-badge: TRON */}
          <circle cx="24" cy="24" r="7.5" fill="#141417" stroke="#1E1E24" strokeWidth="1" />
          <circle cx="24" cy="24" r="6" fill="#EF0027"/>
          <g transform="translate(19, 19) scale(0.3125)">
            <path d="M21.932 9.913L7.5 7.257l7.595 19.112 10.583-12.894-3.746-3.562zm-.232 1.17l2.208 2.099-6.038 1.093 3.83-3.192zm-5.142 2.973l-6.364-5.278 10.402 1.914-4.038 3.364zm-.453.934l-1.038 8.58L9.472 9.487l6.633 5.502zm.96.455l6.687-1.21-7.67 9.343.983-8.133z" fill="#FFF"/>
          </g>
        </svg>
      );
    }

    // ERC20 (Ethereum)
    if (net.includes('ERC') || net.includes('ETH') || raw.includes('ERC20')) {
      return (
        <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" fill="#26A17B"/>
          <path fill="#FFF" d="M17.92 16.38c-.1.01-.68.04-1.94.04-1.01 0-1.72-.03-1.97-.04-3.89-.17-6.79-.85-6.79-1.66s2.9-1.49 6.79-1.66v2.64c.25.02.98.06 1.99.06 1.2 0 1.81-.05 1.92-.06v-2.64c3.88.17 6.78.85 6.78 1.66s-2.9 1.48-6.78 1.66m0-3.59v-2.37h5.41V6.82H8.6v3.61h5.41v2.36c-4.4.2-7.7 1.08-7.7 2.12s3.3 1.92 7.7 2.12v6.58h3.91v-6.58c4.4-.2 7.7-1.08 7.7-2.12s-3.3-1.92-7.7-2.12"/>
          {/* Sub-badge: ETH */}
          <circle cx="24" cy="24" r="7.5" fill="#141417" stroke="#1E1E24" strokeWidth="1" />
          <circle cx="24" cy="24" r="6" fill="#627EEA"/>
          <g transform="translate(19, 19) scale(0.3125)" fill="#FFF">
            <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z"/>
            <path d="M16.498 4L9 16.22l7.498-3.35z"/>
            <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z"/>
            <path d="M16.498 27.995v-6.028L9 17.616z"/>
            <path fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z"/>
            <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z"/>
          </g>
        </svg>
      );
    }

    // BEP20 (BNB Smart Chain)
    if (net.includes('BEP') || net.includes('BSC') || net.includes('BNB') || raw.includes('BEP20')) {
      return (
        <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" fill="#26A17B"/>
          <path fill="#FFF" d="M17.92 16.38c-.1.01-.68.04-1.94.04-1.01 0-1.72-.03-1.97-.04-3.89-.17-6.79-.85-6.79-1.66s2.9-1.49 6.79-1.66v2.64c.25.02.98.06 1.99.06 1.2 0 1.81-.05 1.92-.06v-2.64c3.88.17 6.78.85 6.78 1.66s-2.9 1.48-6.78 1.66m0-3.59v-2.37h5.41V6.82H8.6v3.61h5.41v2.36c-4.4.2-7.7 1.08-7.7 2.12s3.3 1.92 7.7 2.12v6.58h3.91v-6.58c4.4-.2 7.7-1.08 7.7-2.12s-3.3-1.92-7.7-2.12"/>
          {/* Sub-badge: BNB */}
          <circle cx="24" cy="24" r="7.5" fill="#141417" stroke="#1E1E24" strokeWidth="1" />
          <circle cx="24" cy="24" r="6" fill="#F3BA2F"/>
          <g transform="translate(19, 19) scale(0.3125)">
            <path fill="#FFF" d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.188-.002h.002V16L16 18.294l-2.291-2.29-.004-.004.004-.003.401-.402.195-.195L16 13.706l2.293 2.293z"/>
          </g>
        </svg>
      );
    }

    // TON (Gram / Telegram Open Network)
    if (net.includes('TON') || net.includes('GRAM')) {
      return (
        <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" fill="#26A17B"/>
          <path fill="#FFF" d="M17.92 16.38c-.1.01-.68.04-1.94.04-1.01 0-1.72-.03-1.97-.04-3.89-.17-6.79-.85-6.79-1.66s2.9-1.49 6.79-1.66v2.64c.25.02.98.06 1.99.06 1.2 0 1.81-.05 1.92-.06v-2.64c3.88.17 6.78.85 6.78 1.66s-2.9 1.48-6.78 1.66m0-3.59v-2.37h5.41V6.82H8.6v3.61h5.41v2.36c-4.4.2-7.7 1.08-7.7 2.12s3.3 1.92 7.7 2.12v6.58h3.91v-6.58c4.4-.2 7.7-1.08 7.7-2.12s-3.3-1.92-7.7-2.12"/>
          {/* Sub-badge: TON */}
          <circle cx="24" cy="24" r="7.5" fill="#141417" stroke="#1E1E24" strokeWidth="1" />
          <circle cx="24" cy="24" r="6" fill="#0098EA"/>
          <g transform="translate(19, 19) scale(0.3125)">
            <path d="M16 6.8c-.3 0-.6.2-.7.4L8.1 19.4c-.2.4-.2.9.1 1.2.3.4.8.6 1.3.4l6.5-2.6 6.5 2.6c.5.2 1 0 1.3-.4.3-.3.3-.8.1-1.2L16.7 7.2c-.1-.2-.4-.4-.7-.4zm0 2.9l4.9 8.6-4.9-2v-6.6zm-1.5 6.6l-4.9 2 4.9-8.6v6.6z" fill="#FFF"/>
          </g>
        </svg>
      );
    }

    // SOL (Solana)
    if (net.includes('SOL')) {
      return (
        <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" fill="#26A17B"/>
          <path fill="#FFF" d="M17.92 16.38c-.1.01-.68.04-1.94.04-1.01 0-1.72-.03-1.97-.04-3.89-.17-6.79-.85-6.79-1.66s2.9-1.49 6.79-1.66v2.64c.25.02.98.06 1.99.06 1.2 0 1.81-.05 1.92-.06v-2.64c3.88.17 6.78.85 6.78 1.66s-2.9 1.48-6.78 1.66m0-3.59v-2.37h5.41V6.82H8.6v3.61h5.41v2.36c-4.4.2-7.7 1.08-7.7 2.12s3.3 1.92 7.7 2.12v6.58h3.91v-6.58c4.4-.2 7.7-1.08 7.7-2.12s-3.3-1.92-7.7-2.12"/>
          {/* Sub-badge: SOL */}
          <circle cx="24" cy="24" r="7.5" fill="#141417" stroke="#1E1E24" strokeWidth="1" />
          <circle cx="24" cy="24" r="6" fill="#141417"/>
          <g transform="translate(19, 19) scale(0.3125)">
            <path d="M9.925 19.687a.59.59 0 01.415-.17h14.366a.29.29 0 01.207.497l-2.838 2.815a.59.59 0 01-.415.171H7.294a.291.291 0 01-.207-.498l2.838-2.815zm0-10.517A.59.59 0 0110.34 9h14.366c.261 0 .392.314.207.498l-2.838 2.815a.59.59 0 01-.415.17H7.294a.291.291 0 01-.207-.497L9.925 9.17zm12.15 5.225a.59.59 0 00-.415-.17H7.294a.291.291 0 00-.207.498l2.838 2.815c.11.109.26.17.415.17h14.366a.291.291 0 00.207-.498l-2.838-2.815z" fill="#00FFA3"/>
          </g>
        </svg>
      );
    }

    // POLYGON (Matic)
    if (net.includes('POLYGON') || net.includes('MATIC')) {
      return (
        <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" fill="#26A17B"/>
          <path fill="#FFF" d="M17.92 16.38c-.1.01-.68.04-1.94.04-1.01 0-1.72-.03-1.97-.04-3.89-.17-6.79-.85-6.79-1.66s2.9-1.49 6.79-1.66v2.64c.25.02.98.06 1.99.06 1.2 0 1.81-.05 1.92-.06v-2.64c3.88.17 6.78.85 6.78 1.66s-2.9 1.48-6.78 1.66m0-3.59v-2.37h5.41V6.82H8.6v3.61h5.41v2.36c-4.4.2-7.7 1.08-7.7 2.12s3.3 1.92 7.7 2.12v6.58h3.91v-6.58c4.4-.2 7.7-1.08 7.7-2.12s-3.3-1.92-7.7-2.12"/>
          {/* Sub-badge: Polygon */}
          <circle cx="24" cy="24" r="7.5" fill="#141417" stroke="#1E1E24" strokeWidth="1" />
          <circle cx="24" cy="24" r="6" fill="#6F41D8"/>
          <g transform="translate(19, 19) scale(0.3125)">
            <path d="M21.092 12.693c-.369-.215-.848-.215-1.254 0l-2.879 1.654-1.955 1.078-2.879 1.653c-.369.216-.848.216-1.254 0l-2.288-1.294c-.369-.215-.627-.61-.627-1.042V12.19c0-.431.221-.826.627-1.042l2.25-1.258c.37-.216.85-.216 1.256 0l2.25 1.258c.37.216.628.611.628 1.042v1.654l1.955-1.115v-1.653a1.16 1.16 0 00-.627-1.042l-4.17-2.372c-.369-.216-.848-.216-1.254 0l-4.244 2.372A1.16 1.16 0 006 11.076v4.78c0 .432.221.827.627 1.043l4.244 2.372c.369.215.849.215 1.254 0l2.879-1.618 1.955-1.114 2.879-1.617c.369-.216.848-.216 1.254 0l2.251 1.258c.37.215.627.61.627 1.042v2.552c0 .431-.22.826-.627 1.042l-2.25 1.294c-.37.216-.85.216-1.255 0l-2.251-1.258c-.37-.216-.628-.611-.628-1.042v-1.654l-1.955 1.115v1.653c0 .431.221.827.627 1.042l4.244 2.372c.369.216.848.216 1.254 0l4.244-2.372c.369-.215.627-.61.627-1.042v-4.78a1.16 1.16 0 00-.627-1.042l-4.28-2.409z" fill="#FFF"/>
          </g>
        </svg>
      );
    }

    // Default Tether (USDT)
    return (
      <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#26A17B"/>
        <path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"/>
      </svg>
    );
  }

  // 2. BTC (Bitcoin)
  if (raw === 'BTC' || raw.includes('BITCOIN') || raw.startsWith('BTC')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#F7931A"/>
        <path fill="#FFF" fillRule="nonzero" d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"/>
      </svg>
    );
  }

  // 3. ETH (Ethereum)
  if (raw === 'ETH' || raw.includes('ETHER') || raw.startsWith('ETH')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#627EEA"/>
        <g fill="#FFF" fillRule="nonzero">
          <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z"/>
          <path d="M16.498 4L9 16.22l7.498-3.35z"/>
          <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z"/>
          <path d="M16.498 27.995v-6.028L9 17.616z"/>
          <path fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z"/>
          <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z"/>
        </g>
      </svg>
    );
  }

  // Dedicated GRAM (Telegram Gram Token) - Cyan circle with white Gram diamond sparkle
  if (raw === 'GRAM' || raw === 'GRAMCOIN') {
    return (
      <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#0098EA" />
        <path
          d="M16 6.5C16 11.75 20.25 16 25.5 16C20.25 16 16 20.25 16 25.5C16 20.25 11.75 16 6.5 16C11.75 16 16 11.75 16 6.5Z"
          fill="#FFFFFF"
        />
        <circle cx="19.5" cy="12.5" r="1.5" fill="#0098EA" opacity="0.6" />
      </svg>
    );
  }

  // 4. TON (Toncoin) - Official crisp Telegram vector
  if (raw === 'TON' || raw.includes('TONCOIN') || raw.startsWith('TON')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#0098EA"/>
        <path d="M16 6.8c-.3 0-.6.2-.7.4L8.1 19.4c-.2.4-.2.9.1 1.2.3.4.8.6 1.3.4l6.5-2.6 6.5 2.6c.5.2 1 0 1.3-.4.3-.3.3-.8.1-1.2L16.7 7.2c-.1-.2-.4-.4-.7-.4zm0 2.9l4.9 8.6-4.9-2v-6.6zm-1.5 6.6l-4.9 2 4.9-8.6v6.6z" fill="#FFF"/>
      </svg>
    );
  }

  // 5. SOL (Solana)
  if (raw === 'SOL' || raw.startsWith('SOL')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#141417"/>
        <path d="M9.925 19.687a.59.59 0 01.415-.17h14.366a.29.29 0 01.207.497l-2.838 2.815a.59.59 0 01-.415.171H7.294a.291.291 0 01-.207-.498l2.838-2.815zm0-10.517A.59.59 0 0110.34 9h14.366c.261 0 .392.314.207.498l-2.838 2.815a.59.59 0 01-.415.17H7.294a.291.291 0 01-.207-.497L9.925 9.17zm12.15 5.225a.59.59 0 00-.415-.17H7.294a.291.291 0 00-.207.498l2.838 2.815c.11.109.26.17.415.17h14.366a.291.291 0 00.207-.498l-2.838-2.815z" fill="#00FFA3"/>
      </svg>
    );
  }

  // 6. BNB (Binance Coin)
  if (raw === 'BNB' || raw.startsWith('BNB') || raw.includes('BINANCE')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#F3BA2F"/>
        <path fill="#FFF" d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.188-.002h.002V16L16 18.294l-2.291-2.29-.004-.004.004-.003.401-.402.195-.195L16 13.706l2.293 2.293z"/>
      </svg>
    );
  }

  // 7. TRX (Tron)
  if (raw === 'TRX' || raw.includes('TRON') || raw.startsWith('TRX')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle fill="#EF0027" cx="16" cy="16" r="16"/>
        <path d="M21.932 9.913L7.5 7.257l7.595 19.112 10.583-12.894-3.746-3.562zm-.232 1.17l2.208 2.099-6.038 1.093 3.83-3.192zm-5.142 2.973l-6.364-5.278 10.402 1.914-4.038 3.364zm-.453.934l-1.038 8.58L9.472 9.487l6.633 5.502zm.96.455l6.687-1.21-7.67 9.343.983-8.133z" fill="#FFF"/>
      </svg>
    );
  }

  // 8. XRP (Ripple)
  if (raw === 'XRP' || raw.includes('RIPPLE') || raw.startsWith('XRP')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#23292F"/>
        <path d="M23.07 8h2.89l-6.015 5.957a5.621 5.621 0 01-7.89 0L6.035 8H8.93l4.57 4.523a3.556 3.556 0 004.996 0L23.07 8zM8.895 24.563H6l6.055-5.993a5.621 5.621 0 017.89 0L26 24.562h-2.895L18.5 20a3.556 3.556 0 00-4.996 0l-4.61 4.563z" fill="#FFF"/>
      </svg>
    );
  }

  // 9. DOGE (Dogecoin)
  if (raw === 'DOGE' || raw.includes('DOGECOIN') || raw.startsWith('DOGE')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#C3A634"/>
        <path fill="#FFF" d="M13.248 14.61h4.314v2.286h-4.314v4.818h2.721c1.077 0 1.958-.145 2.644-.437.686-.291 1.224-.694 1.615-1.21a4.4 4.4 0 00.796-1.815 11.4 11.4 0 00.21-2.252 11.4 11.4 0 00-.21-2.252 4.396 4.396 0 00-.796-1.815c-.391-.516-.93-.919-1.615-1.21-.686-.292-1.567-.437-2.644-.437h-2.721v4.325zm-2.766 2.286H9v-2.285h1.482V8h6.549c1.21 0 2.257.21 3.142.627.885.419 1.607.99 2.168 1.715.56.724.977 1.572 1.25 2.543.273.971.409 2.01.409 3.115a11.47 11.47 0 01-.41 3.115c-.272.97-.689 1.819-1.25 2.543-.56.725-1.282 1.296-2.167 1.715-.885.418-1.933.627-3.142.627h-6.549v-7.104z"/>
      </svg>
    );
  }

  // 10. BCH (Bitcoin Cash)
  if (raw === 'BCH' || raw.includes('CASH') || raw.startsWith('BCH')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" fill="#8dc351" r="16"/>
        <path d="M21.207 10.534c-.776-1.972-2.722-2.15-4.988-1.71l-.807-2.813-1.712.491.786 2.74c-.45.128-.908.27-1.363.41l-.79-2.758-1.711.49.805 2.813c-.368.114-.73.226-1.085.328l-.003-.01-2.362.677.525 1.83s1.258-.388 1.243-.358c.694-.199 1.035.139 1.2.468l.92 3.204c.047-.013.11-.029.184-.04l-.181.052 1.287 4.49c.032.227.004.612-.48.752.027.013-1.246.356-1.246.356l.247 2.143 2.228-.64c.415-.117.825-.227 1.226-.34l.817 2.845 1.71-.49-.807-2.815a65.74 65.74 0 001.372-.38l.802 2.803 1.713-.491-.814-2.84c2.831-.991 4.638-2.294 4.113-5.07-.422-2.234-1.724-2.912-3.471-2.836.848-.79 1.213-1.858.642-3.3zm-.65 6.77c.61 2.127-3.1 2.929-4.26 3.263l-1.081-3.77c1.16-.333 4.704-1.71 5.34.508zm-2.322-5.09c.554 1.935-2.547 2.58-3.514 2.857l-.98-3.419c.966-.277 3.915-1.455 4.494.563z" fill="#fff" fillRule="nonzero"/>
      </svg>
    );
  }

  // 11. SUI (Sui)
  if (raw === 'SUI' || raw.startsWith('SUI')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle fill="#2A82E4" cx="16" cy="16" r="16"/>
        <path d="M16 6.5C13.5 10 9 15.5 9 19.2C9 23.1 12.1 26 16 26C19.9 26 23 23.1 23 19.2C23 15.5 18.5 10 16 6.5ZM16 23.8C13.4 23.8 11.2 21.7 11.2 19.1C11.2 16.5 14.2 12.3 16 9.8C17.8 12.3 20.8 16.5 20.8 19.1C20.8 21.7 18.6 23.8 16 23.8Z" fill="#FFF"/>
        <path d="M16 11.5C14.8 13.8 12.8 16.9 12.8 19C12.8 20.8 14.2 22.2 16 22.2C17.8 22.2 19.2 20.8 19.2 19C19.2 16.9 17.2 13.8 16 11.5Z" fill="#FFF"/>
      </svg>
    );
  }

  // 12. MATIC / POLYGON
  if (raw === 'MATIC' || raw.includes('POLYGON') || raw.startsWith('MATIC')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle fill="#6F41D8" cx="16" cy="16" r="16"/>
        <path d="M21.092 12.693c-.369-.215-.848-.215-1.254 0l-2.879 1.654-1.955 1.078-2.879 1.653c-.369.216-.848.216-1.254 0l-2.288-1.294c-.369-.215-.627-.61-.627-1.042V12.19c0-.431.221-.826.627-1.042l2.25-1.258c.37-.216.85-.216 1.256 0l2.25 1.258c.37.216.628.611.628 1.042v1.654l1.955-1.115v-1.653a1.16 1.16 0 00-.627-1.042l-4.17-2.372c-.369-.216-.848-.216-1.254 0l-4.244 2.372A1.16 1.16 0 006 11.076v4.78c0 .432.221.827.627 1.043l4.244 2.372c.369.215.849.215 1.254 0l2.879-1.618 1.955-1.114 2.879-1.617c.369-.216.848-.216 1.254 0l2.251 1.258c.37.215.627.61.627 1.042v2.552c0 .431-.22.826-.627 1.042l-2.25 1.294c-.37.216-.85.216-1.255 0l-2.251-1.258c-.37-.216-.628-.611-.628-1.042v-1.654l-1.955 1.115v1.653c0 .431.221.827.627 1.042l4.244 2.372c.369.216.848.216 1.254 0l4.244-2.372c.369-.215.627-.61.627-1.042v-4.78a1.16 1.16 0 00-.627-1.042l-4.28-2.409z" fill="#FFF"/>
      </svg>
    );
  }

  // 13. USDC (USD Coin)
  if (raw === 'USDC' || raw.includes('USD COIN') || raw.startsWith('USDC')) {
    return (
      <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle fill="#3E73C4" cx="16" cy="16" r="16"/>
        <g fill="#FFF">
          <path d="M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.243-2.193-.728-2.193-1.578 0-.85.61-1.396 1.828-1.396 1.097 0 1.707.364 2.011 1.275a.458.458 0 00.427.303h.975a.416.416 0 00.427-.425v-.06a3.04 3.04 0 00-2.743-2.489V9.142c0-.243-.183-.425-.487-.486h-.915c-.243 0-.426.182-.487.486v1.396c-1.829.242-2.986 1.456-2.986 2.974 0 2.002 1.218 2.791 3.778 3.095 1.707.303 2.255.668 2.255 1.639 0 .97-.853 1.638-2.011 1.638-1.585 0-2.133-.667-2.316-1.578-.06-.242-.244-.364-.427-.364h-1.036a.416.416 0 00-.426.425v.06c.243 1.518 1.219 2.61 3.23 2.914v1.457c0 .242.183.425.487.485h.915c.243 0 .426-.182.487-.485V21.34c1.829-.303 3.047-1.578 3.047-3.217z"/>
          <path d="M12.892 24.497c-4.754-1.7-7.192-6.98-5.424-11.653.914-2.55 2.925-4.491 5.424-5.402.244-.121.365-.303.365-.607v-.85c0-.242-.121-.424-.365-.485-.061 0-.183 0-.244.06a10.895 10.895 0 00-7.13 13.717c1.096 3.4 3.717 6.01 7.13 7.102.244.121.488 0 .548-.243.061-.06.061-.122.061-.243v-.85c0-.182-.182-.424-.365-.546zm6.46-18.936c-.244-.122-.488 0-.548.242-.061.061-.061.122-.061.243v.85c0 .243.182.485.365.607 4.754 1.7 7.192 6.98 5.424 11.653-.914 2.55-2.925 4.491-5.424 5.402-.244.121-.365.303-.365.607v.85c0 .242.121.424.365.485.061 0 .183 0 .244-.06a10.895 10.895 0 007.13-13.717c-1.096-3.46-3.778-6.07-7.13-7.162z"/>
        </g>
      </svg>
    );
  }

  // Fallback generic badge
  return (
    <div className={`${className} rounded-full bg-[#007AFF]/20 text-[#007AFF] flex items-center justify-center font-bold text-[10px]`}>
      {symbol.slice(0, 3).toUpperCase()}
    </div>
  );
}
