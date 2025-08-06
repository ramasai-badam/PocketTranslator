import { AccessibilityInfo } from 'react-native';

/**
 * Accessibility configuration and utilities for TalkBack support
 */
export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private isScreenReaderEnabled = false;
  private subscription: any = null;

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  async initialize() {
    // Check if screen reader is enabled
    try {
      this.isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      
      // Listen for screen reader state changes
      const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', this.onScreenReaderStateChange);
      
      // Store subscription for cleanup
      this.subscription = subscription;
    } catch (error) {
      console.warn('Failed to initialize accessibility:', error);
    }
  }

  private onScreenReaderStateChange = (isEnabled: boolean) => {
    this.isScreenReaderEnabled = isEnabled;
    console.log('Screen reader state changed:', isEnabled);
  };

  isScreenReaderActive(): boolean {
    return this.isScreenReaderEnabled;
  }

  announceForAccessibility(message: string) {
    if (this.isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  // Predefined announcement messages
  static Messages = {
    RECORDING_STARTED: (language: string) => `Recording started for ${language}`,
    RECORDING_STOPPED: () => 'Recording stopped',
    TRANSCRIPTION_STARTED: () => 'Converting speech to text',
    TRANSCRIPTION_COMPLETED: () => 'Speech transcribed. Starting translation.',
    TRANSCRIPTION_FAILED: () => 'Failed to understand speech. Please try again.',
    TRANSLATION_STARTED: (targetLanguage: string) => `Translating to ${targetLanguage}`,
    TRANSLATION_COMPLETED: (targetLanguage: string) => `Translation completed to ${targetLanguage}`,
    TRANSLATION_FAILED: () => 'Translation failed. Please try again.',
    LANGUAGE_CHANGED: (language: string) => `Language changed to ${language}`,
    THEME_CHANGED: (theme: string) => `Theme changed to ${theme}`,
    TEXT_SIZE_CHANGED: (size: string) => `Text size changed to ${size}`,
    SPEAKING_STARTED: () => 'Playing audio',
    SPEAKING_STOPPED: () => 'Audio playback stopped',
    APP_READY: () => 'Pocket Translator is ready. Tap microphone buttons to start recording.',
  };

  cleanup() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}

/**
 * Common accessibility props for interactive elements
 */
export const AccessibilityProps = {
  // Microphone button props
  microphoneButton: (isRecording: boolean, isProcessing: boolean, language: string) => ({
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: isRecording 
      ? 'Stop recording' 
      : isProcessing
        ? 'Processing speech'
        : `Start recording for ${language}`,
    accessibilityHint: isRecording 
      ? 'Tap to stop recording and translate' 
      : isProcessing
        ? 'Please wait while processing'
        : `Tap to start recording in ${language}`,
    accessibilityState: {
      disabled: isProcessing,
      busy: isProcessing
    }
  }),

  // Language selector props
  languageSelector: (selectedLanguage: string, isExpanded: boolean) => ({
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: `Language selector. Currently selected: ${selectedLanguage}`,
    accessibilityHint: isExpanded ? 'Tap to close language options' : 'Tap to open language options',
    accessibilityState: { expanded: isExpanded }
  }),

  // Speaker button props
  speakerButton: (isPlaying: boolean, textType: string = 'text') => ({
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: `Speak ${textType}`,
    accessibilityHint: `Tap to hear this ${textType} spoken aloud`,
    accessibilityState: { disabled: isPlaying }
  }),

  // Settings button props
  settingsButton: () => ({
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: 'Settings',
    accessibilityHint: 'Opens the settings screen'
  }),

  // History button props
  historyButton: () => ({
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: 'Translation History',
    accessibilityHint: 'Opens the translation history screen'
  }),

  // Text display props
  textDisplay: (hasText: boolean, language: string) => ({
    accessible: hasText,
    accessibilityRole: 'text' as const,
    accessibilityLabel: hasText ? `Translation text in ${language}` : undefined,
    accessibilityLiveRegion: 'polite' as const
  })
};

export default AccessibilityManager;
