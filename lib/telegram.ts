export const initTelegram = async () => {
  if (typeof window !== 'undefined') {
    const WebApp = (await import('@twa-dev/sdk')).default;
    if (WebApp.initData) {
      WebApp.ready();
      WebApp.expand();
      
      if (WebApp.themeParams.bg_color) {
        try {
          WebApp.setHeaderColor(WebApp.themeParams.bg_color);
        } catch (e) {
          console.error('Failed to set header color', e);
        }
      }
    }
  }
};

export const getTelegramUser = async () => {
  if (typeof window !== 'undefined') {
    const WebApp = (await import('@twa-dev/sdk')).default;
    if (WebApp.initDataUnsafe?.user) {
      return WebApp.initDataUnsafe.user;
    }
  }
  return null;
};
