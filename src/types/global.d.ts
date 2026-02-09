// Global type augmentations for Furrie audio system

declare global {
  interface Window {
    __furrie_audio_context?: AudioContext;
    __furrie_audio_unlocked?: boolean;
  }
}

export {};
