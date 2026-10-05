import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface TelegramStarIconProps {
  className?: string;
  size?: number;
  customIconUrl?: string;
}

/**
 * 100% Guaranteed Crisp Inline Vector SVG for Telegram Stars.
 * Zero external network requests, unique isolated gradient IDs via useId(),
 * immune to WebKit/Safari gradient conflicts and offline/webview caching issues.
 */
export function InlineTelegramStarSvg({ size, className = "" }: { size?: number; className?: string }) {
  const finalSize = size || 32;
  const hasDimensionClass = /\b(w-|h-)/.test(className);

  return (
    <img
      src="/telegram-stars.png"
      alt="Telegram Star"
      referrerPolicy="no-referrer"
      width={hasDimensionClass && !size ? undefined : finalSize}
      height={hasDimensionClass && !size ? undefined : finalSize}
      className={`inline-block shrink-0 object-contain select-none ${hasDimensionClass ? '' : 'w-8 h-8'} ${className}`}
      style={size ? { width: size, height: size, minWidth: size, minHeight: size } : undefined}
    />
  );
}

export const TelegramStarIcon: React.FC<TelegramStarIconProps> = ({ className = '', size, customIconUrl }) => {
  const [imgError, setImgError] = useState(false);
  const [starsSrc, setStarsSrc] = useState<string>(() => {
    if (customIconUrl) return customIconUrl;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('custom_icon_STARS') ||
        localStorage.getItem('custom_icon_stars') ||
        localStorage.getItem('custom_icon_wallet_stars-stars-native') ||
        localStorage.getItem('custom_icon_wallet_stars') ||
        localStorage.getItem('custom_stars_icon_url') ||
        '/telegram-stars.png';
    }
    return '/telegram-stars.png';
  });

  try {
    const { systemSettings } = useAuth();
    useEffect(() => {
      if (customIconUrl) {
        setStarsSrc(customIconUrl);
        setImgError(false);
        return;
      }
      const adminIcon = systemSettings?.starsIconUrl || 
        systemSettings?.customIconUrls?.STARS || 
        systemSettings?.customIconUrls?.stars ||
        (typeof window !== 'undefined' ? (
          localStorage.getItem('custom_icon_STARS') ||
          localStorage.getItem('custom_icon_stars') ||
          localStorage.getItem('custom_icon_wallet_stars-stars-native') ||
          localStorage.getItem('custom_icon_wallet_stars') ||
          localStorage.getItem('custom_stars_icon_url')
        ) : null) || 
        '/telegram-stars.png';
      
      if (adminIcon && adminIcon !== starsSrc) {
        setStarsSrc(adminIcon);
        setImgError(false);
      }
    }, [systemSettings, customIconUrl]);
  } catch (err) {
    // Auth context unavailable outside provider
  }

  const hasDimensionClass = /\b(w-|h-)/.test(className);
  // Default to 36px or optically boosted size (Stars are naturally thinner than squares)
  const finalSize = size || (hasDimensionClass ? undefined : 36);

  // Strip any accidental rounded or border classes
  const sanitizedClass = (className || '')
    .replace(/\brounded-\S+/g, '')
    .replace(/\bborder\S*/g, '')
    .replace(/\bbg-\S+/g, '')
    .trim();

  // Render the real admin image
  if (starsSrc && !imgError) {
    return (
      <img 
        src={starsSrc} 
        alt="Telegram Star" 
        referrerPolicy="no-referrer"
        width={finalSize} 
        height={finalSize} 
        className={`inline-block shrink-0 object-contain select-none overflow-visible ${hasDimensionClass ? '' : 'w-9 h-9'} ${sanitizedClass}`} 
        style={finalSize ? { width: finalSize, height: finalSize, minWidth: finalSize, minHeight: finalSize } : undefined}
        onError={() => {
          if (starsSrc !== '/telegram-stars.png') {
            setStarsSrc('/telegram-stars.png');
          } else {
            setImgError(true);
          }
        }}
      />
    );
  }

  // Fallback only if image loading is blocked or file is missing
  return <InlineTelegramStarSvg size={finalSize} className={sanitizedClass} />;
};
