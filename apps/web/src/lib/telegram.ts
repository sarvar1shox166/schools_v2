interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramInitData(): string | null {
  const webApp = getTelegramWebApp();
  return webApp && webApp.initData ? webApp.initData : null;
}

export function haptic(type: "light" | "medium" = "light") {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(type);
}
