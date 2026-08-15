// Access Telegram WebApp directly from global window object
// to avoid loading duplicate SDK bundles and redundant postEvents.

const getWebApp = () => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp;
  }
  return null;
};

export const initTelegram = () => {
  const WebApp = getWebApp();
  if (WebApp && WebApp.initData) {
    WebApp.ready();
    WebApp.expand();
    if (WebApp.themeParams?.bg_color) {
      try {
        WebApp.setHeaderColor(WebApp.themeParams.bg_color);
      } catch (e) {
        // Ignore header color error if unsupported
      }
    }
  }
};

export const getTelegramUser = () => {
  const WebApp = getWebApp();
  if (WebApp && WebApp.initDataUnsafe?.user) {
    return WebApp.initDataUnsafe.user;
  }
  return null;
};
