/// <reference types="vite/client" />

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, any>; callback?: (result: any) => void }) => void;
  }
}
