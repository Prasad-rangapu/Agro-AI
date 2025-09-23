import * as Speech from 'expo-speech';

class VoiceService {
  constructor() {
    this.isListening = false;
    this.currentLanguage = 'en';
    this.onResults = null;
  }

  async initialize() {
    console.log('Voice service initialized');
    return true;
  }

  // For Expo, we'll focus on TTS since voice recognition requires more complex setup
  async speak(text, language = null) {
    try {
      const options = {
        language: language || this.currentLanguage,
        pitch: 1.0,
        rate: 0.5,
      };

      await Speech.speak(text, options);
      console.log('Speaking:', text);
    } catch (error) {
      console.error('TTS error:', error);
    }
  }

  async stopSpeaking() {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('TTS stop error:', error);
    }
  }

  // Simplified voice command simulation for demo
  simulateVoiceCommand(command) {
    const commands = {
      cropRecommendation: ['recommend crop', 'suggest crop', 'crop advice'],
      diseaseDetection: ['detect disease', 'check disease', 'plant problem'],
      weather: ['weather', 'climate', 'forecast'],
      marketPrice: ['market price', 'crop price', 'market rate']
    };

    const normalizedCommand = command.toLowerCase();

    for (const [action, patterns] of Object.entries(commands)) {
      if (patterns.some(pattern => normalizedCommand.includes(pattern))) {
        return { action, originalText: command };
      }
    }

    return { action: 'general', originalText: command };
  }

  // For demo purposes - in a full implementation, integrate with expo-speech-recognition
  async startListening() {
    this.isListening = true;
    await this.speak('Voice recognition is not implemented in this demo version. Please use the buttons.');
    this.isListening = false;
  }

  async stopListening() {
    this.isListening = false;
  }

  setOnResults(callback) {
    this.onResults = callback;
  }
}

export default new VoiceService();