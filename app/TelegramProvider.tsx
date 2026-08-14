'use client';

import { useEffect } from 'react';
import { initTelegram } from '../lib/telegram';

export const TelegramProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    initTelegram();

    // Anti-screenshot / Anti-copy measures
    const handleContextMenu = (e: Event) => e.preventDefault();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block PrintScreen and Mac screenshot shortcuts (Cmd+Shift+3/4/5)
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key))) {
        e.preventDefault();
        // Temporarily blank the screen
        document.body.style.opacity = '0';
        setTimeout(() => { document.body.style.opacity = '1'; }, 2000);
      }
    };
    
    // Blur screen when app loses focus (prevents mobile task-switcher screenshots)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.classList.add('blurred-screen');
      } else {
        document.body.classList.remove('blurred-screen');
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <>{children}</>;
};
