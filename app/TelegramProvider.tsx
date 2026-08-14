'use client';

import { useEffect } from 'react';
import { initTelegram } from '../lib/telegram';

export const TelegramProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    initTelegram();
  }, []);

  return <>{children}</>;
};
