# PocketTranslator

An **Android-focused** React Native app that provides real-time speech translation using locally-running AI models. The app features a conversational interface where users can speak in different languages and receive instant translations, all processed on-device.

## 🚀 Features

- **🤖 Local AI Translation**: Uses `llama.rn` with Google Gemma 3n model for offline translation
- **🎤 Speech-to-Text**: Uses `whisper.rn` with Whisper base model for voice recognition  
- **🔊 Text-to-Speech**: Integrated `expo-speech` for audio playback of translations
- **💬 Conversation History**: Chat-like interface showing translation history
- **🌍 Multi-language Support**: 19 languages including Arabic, Chinese, and European languages
- **📱 Android Optimized**: TalkBack accessibility support and Android-specific optimizations
- **⚡ Offline Capability**: All processing happens on-device, no internet required after model download

## 🏗️ Architecture

### AI Models
- **Translation**: Google Gemma 3n E2B (IQ4_XS quantized, ~2.8GB)
- **Speech Recognition**: Whisper Base multilingual model (~148MB)
- **Model Management**: Automatic download with progress tracking and validation

### Tech Stack
- **Framework**: React Native with Expo Router
- **AI Runtime**: `llama.rn` v0.6.1 and `whisper.rn` v0.4.3
- **Audio**: `expo-audio`, `expo-speech`, `react-native-audio-record`
- **Platform**: Android-focused with development build support

## 📱 Supported Languages (19 total)

English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Thai, Vietnamese, Dutch, Polish, Turkish, Swedish, Danish, Norwegian

## 🛠️ Installation & Setup

### Prerequisites (Android Development)
```bash
# Install dependencies
npm install

# For development builds (required for native modules)
npx expo install expo-dev-client
```

### Building for Android
```bash
# Development build
npm run android

# Production build with EAS
npm run build:android
```

### Model Download
The app automatically downloads AI models on first launch:
- Models are stored in `FileSystem.documentDirectory`
- Total download size: ~3GB (Whisper: 148MB, Gemma: 2.8GB)
- Progress tracking and validation included

## 📋 Usage

1. **Launch App**: Download models on first run (one-time ~3GB download)
2. **Select Languages**: Choose source and target languages from dropdowns
3. **Record Speech**: Tap and hold microphone button to record
4. **Get Translation**: Release to process speech and see translation
5. **Listen**: Tap speaker button to hear translation aloud
6. **Conversation**: Previous translations shown in chat-like history
7. **Swap Languages**: Quick button to reverse translation direction

## 🔧 Development

### Local Development
```bash
# Start development server
npm run dev

# Run on Android device/emulator
npm run android

# Build and preview
npm run preview
```

### Code Structure
```
app/
├── (tabs)/index.tsx          # Main translation interface
├── WelcomeScreen.tsx         # Model download screen
components/
├── LanguageSelector.tsx      # Language dropdown
├── TranslationDisplay.tsx    # Chat history
├── RecordingIndicator.tsx    # Mic button states
utils/
├── ModelManager.ts           # AI model management
├── ModelConfig.ts            # Model URLs and configs
├── LanguageConfig.ts         # Supported languages
├── TranslationHistory.ts     # Chat persistence
hooks/
├── useSpeechToText.ts        # Whisper integration
├── useTranslation.ts         # Gemma integration
├── useAudioRecording.ts      # Audio capture
```

## ⚡ Performance & Optimization

### Android-Specific Optimizations
- **Memory Management**: Memory-mapped model loading to reduce RAM usage
- **Background Processing**: Models persist across app lifecycle
- **TalkBack Support**: Full accessibility with screen reader compatibility
- **Haptic Feedback**: Android-native feedback for user interactions

### Model Performance
- **Whisper Base**: ~1-2 seconds processing time for 5-10 second audio clips
- **Gemma 3n**: ~2-5 seconds for translation depending on text length
- **RAM Usage**: ~1-2GB during active translation (models memory-mapped)
- **Storage**: ~3GB for both models

### Recommended Hardware
- **RAM**: 4GB+ recommended, 3GB minimum
- **Storage**: 5GB+ free space for models and app data
- **CPU**: ARM64 processor (modern Android devices)

## 🧪 Testing

### Model Validation
- File size validation ensures complete downloads
- Automatic cleanup of incomplete/corrupted models
- Error handling for network interruptions during download

### Development Features
- Skip button for testing without models
- Detailed logging for debugging translation issues
- Model reinitialization on context loss

## 📝 Configuration

### Adjusting Model Settings
Edit `utils/ModelConfig.ts` to customize:
- Model URLs and file paths
- Expected file sizes for validation
- Display names in UI

### Language Support
Modify `utils/LanguageConfig.ts` to:
- Add/remove supported languages
- Update language codes and native names
- Set default languages

## 🚨 Troubleshooting

### Common Issues
- **Models not downloading**: Check network connection and storage space
- **Translation errors**: Verify model files are complete (check file sizes)
- **Audio issues**: Ensure microphone permissions granted
- **Performance issues**: Close other apps to free RAM during translation

### Android-Specific
- Enable "Install unknown apps" for development builds
- Grant microphone and storage permissions
- Disable battery optimization for consistent performance

## 📦 Download

### Latest Production APK
**[Download PocketTranslator v1.0.0 APK](https://github.com/ramasai-badam/PocketTranslator/releases/tag/v1.0.0)**


