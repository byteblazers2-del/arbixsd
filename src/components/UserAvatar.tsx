import React, { useState } from 'react';
import { UserData } from '../types';

interface UserAvatarProps {
  user?: UserData | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  showOnlineStatus?: boolean;
}

export function UserAvatar({ user, size = 'md', className = '', showOnlineStatus = false }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
    '3xl': 'w-24 h-24 text-3xl'
  };

  const statusDotSize = {
    sm: 'w-2 h-2 -bottom-0.5 -right-0.5',
    md: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
    lg: 'w-3 h-3 -bottom-0.5 -right-0.5',
    xl: 'w-4 h-4 -bottom-0.5 -right-0.5',
    '2xl': 'w-5 h-5 bottom-0 right-0',
    '3xl': 'w-6 h-6 bottom-0 right-0'
  };

  // Determine initial letter
  const displayName = user?.firstName || user?.telegramUsername || 'Trader';
  const initial = displayName.charAt(0).toUpperCase();

  // Color gradient based on username/ID for aesthetic Telegram consistency
  const getGradient = (name: string) => {
    const gradients = [
      'from-[#007AFF] to-[#007AFF]',
      'from-[#6366F1] to-[#8B5CF6]',
      'from-[#EC4899] to-[#F43F5E]',
      'from-[#F59E0B] to-[#EF4444]',
      'from-[#007AFF] to-[#06B6D4]',
      'from-[#3B82F6] to-[#1D4ED8]'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const hasPhoto = Boolean(user?.photoUrl) && !imageError;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full p-[1.5px] bg-gradient-to-tr ${getGradient(displayName)}`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-[#18181B] flex items-center justify-center font-bold text-white select-none">
          {hasPhoto ? (
            <img 
              src={user?.photoUrl} 
              alt={displayName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="font-extrabold tracking-wider">{initial}</span>
          )}
        </div>
      </div>
      {showOnlineStatus && (
        <div className={`absolute ${statusDotSize[size]} bg-[#007AFF] rounded-full border-[#0C0C0E]`} />
      )}
    </div>
  );
}
