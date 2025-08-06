// Shared language configuration for consistent language support across the app
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  isDefault?: boolean;
}

// All supported languages - this is the single source of truth
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', isDefault: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
];

// Helper functions
export const getLanguageByCode = (code: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};

export const getLanguageDisplayName = (code: string): string => {
  const language = getLanguageByCode(code);
  return language ? language.nativeName : code.toUpperCase();
};

export const getLanguageFullName = (code: string): string => {
  const language = getLanguageByCode(code);
  return language ? `${language.name} (${language.nativeName})` : code.toUpperCase();
};

export const getDefaultLanguages = (): Language[] => {
  return SUPPORTED_LANGUAGES.filter(lang => lang.isDefault);
};

export const getDefaultLanguageCodes = (): string[] => {
  return getDefaultLanguages().map(lang => lang.code);
};
