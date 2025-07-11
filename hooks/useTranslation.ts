// Dummy translation hook for testing STT and transcription only
export function useTranslation() {
  return {
    translateText: async (text: string, fromLanguage: string, toLanguage: string) => text,
    isTranslating: false,
    llamaReady: true,
    error: null,
  };
}