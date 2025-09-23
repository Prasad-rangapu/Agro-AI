import 'dotenv/config';

export default {
  expo: {
    name: 'AgroAI - Smart Farming Assistant',
    slug: 'agroai-app',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.agroai.smartfarming',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#2E7D32',
      },
      package: 'com.agroai.smartfarming',
      permissions: [],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-sqlite',
      'expo-camera',
      'expo-image-picker',
      'expo-location',
    ],
    extra: {
      // Access environment variables from process.env
      EXPO_PUBLIC_WEATHER_API_KEY: process.env.EXPO_PUBLIC_WEATHER_API_KEY,
      EXPO_PUBLIC_DEFAULT_LAT: process.env.EXPO_PUBLIC_DEFAULT_LAT,
      EXPO_PUBLIC_DEFAULT_LON: process.env.EXPO_PUBLIC_DEFAULT_LON,
    },
  },
};
