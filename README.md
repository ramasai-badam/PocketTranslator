# Local Speech Translation App

A React Native app that provides real-time speech translation using local AI models. The app features a split-screen interface where two users can speak in different languages and get instant translations.

## Features

- **Local AI Translation**: Uses llama.rn to run GGUF models locally for translation
- **Speech-to-Text**: Records and converts speech to text
- **Text-to-Speech**: Reads translated text aloud
- **Dual Interface**: Split screen design for two-way conversations
- **Language Selection**: Support for 12+ languages
- **Offline Capability**: Works without internet connection

## Architecture

### Current Implementation
- UI framework with recording and TTS capabilities
- Placeholder translation logic
- Language selection and audio controls

### Next Steps for llama.rn Integration

1. **Create Development Build**
   ```bash
   npx create-expo-app --template
   cd your-app
   npx expo install expo-dev-client
   npx expo run:ios # or expo run:android
   ```

2. **Install llama.rn**
   ```bash
   npm install llama.rn
   ```

3. **Add Model Files**
   - Download GGUF translation models
   - Place in `assets/models/` directory
   - Update bundle configuration

4. **Integrate Translation**
   ```typescript
   import { LlamaContext } from 'llama.rn';
   
   const context = await LlamaContext.init({
     model: 'path/to/translation-model.gguf',
     n_ctx: 2048,
   });
   
   const result = await context.completion({
     prompt: `Translate from ${fromLang} to ${toLang}: "${text}"`,
     n_predict: 100,
   });
   ```

5. **Add Speech Recognition**
   - Integrate with expo-speech or react-native-voice
   - Convert audio to text for translation input

## Usage

1. Select source and target languages
2. Hold microphone button to record speech
3. Release to stop recording and get translation
4. Tap speaker button to hear translation
5. Use swap button to reverse language directions

## Development

Since this requires native code compilation, you'll need to:

1. Export your Expo project locally
2. Install llama.rn and configure native dependencies
3. Create a development build
4. Test on physical devices for best performance

## Model Recommendations

- **Lightweight**: Use quantized models (Q4_0, Q5_0) for mobile
- **Multilingual**: Models like mT5 or NLLB for translation
- **Size**: Keep models under 1GB for reasonable app size

## Performance Notes

- Local inference requires significant device resources
- Consider model caching and optimization
- Test on target devices for performance validation