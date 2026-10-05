// Native Haptic Feedback & Touch Response for Telegram Mini App and Web
export function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'selection' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (tg) {
      if (style === 'selection') {
        tg.selectionChanged();
      } else {
        tg.impactOccurred(style);
      }
      return;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(style === 'heavy' ? 22 : style === 'medium' ? 14 : 8);
    }
  } catch {}
}

// Global active touch & Telegram UI Ripple listener for instant native app feel across all pages
if (typeof window !== 'undefined') {
  document.addEventListener('pointerdown', (e) => {
    const el = e.target as HTMLElement | null;
    if (!el) return;

    // Detect any interactive / clickable element
    const target = el.closest<HTMLElement>(
      'button, [role="button"], a, input[type="button"], input[type="submit"], select, .cursor-pointer, .app-pressable, .setting-row, .clickable-card, .tg-cell, .tg-button, .tg-tap-effect, .liquid-tab, .liquid-bubble, .liquid-avatar-bubble, [data-tour], [data-clickable]'
    ) || (el.onclick ? el : null);

    if (!target) return;

    // Trigger instant haptic vibration
    triggerHaptic('light');

    // Spawn Telegram UI Ripple wave inside target
    try {
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const style = window.getComputedStyle(target);
      if (style.position === 'static') {
        target.style.position = 'relative';
      }
      if (style.overflow !== 'hidden') {
        target.style.overflow = 'hidden';
      }

      const rippleContainer = document.createElement('span');
      rippleContainer.className = 'tgui-8071f6e38c77bc0b';
      rippleContainer.setAttribute('aria-hidden', 'true');

      const wave = document.createElement('span');
      wave.className = 'tgui-e156954daf886976';
      wave.style.top = `${y}px`;
      wave.style.left = `${x}px`;

      rippleContainer.appendChild(wave);
      target.appendChild(rippleContainer);
      setTimeout(() => {
        rippleContainer.remove();
      }, 320);
    } catch {}
  }, { passive: true });
}
