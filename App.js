import 'intl-pluralrules';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';


// Screens
import HomeScreen from './src/screens/HomeScreen';
import CropRecommendationScreen from './src/screens/CropRecommendationScreen';
import DiseaseDetectionScreen from './src/screens/DiseaseDetectionScreen';
import WeatherScreen from './src/screens/WeatherScreen';
import LanguageSelectionScreen from './src/screens/LanguageSelectionScreen';
import AuthScreen from './src/screens/AuthScreens';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Services
import MLService from './src/services/MLService';
import LanguageService from './src/services/LanguageService';
import { AuthContext, AuthProvider } from './src/context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Crops':
              iconName = 'leaf';
              break;
            case 'Disease':
              iconName = 'camera';
              break;
            case 'Weather':
              iconName = 'cloud';
              break;
            default:
              iconName = 'help-circle';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Crops" component={CropRecommendationScreen} />
      <Tab.Screen name="Disease" component={DiseaseDetectionScreen} />
      <Tab.Screen name="Weather" component={WeatherScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { userToken, restoreToken } = useContext(AuthContext);
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    // This effect runs once on startup
    initializeApp();
  }, []);

  // This effect will restore the user session once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) restoreToken();
  }, [fontsLoaded]);

  const initializeApp = async () => {
    try {
      // Initialize services
      await MLService.initialize();
      await LanguageService.initialize();

      // Check if user is already logged in
      // restoreToken() is now called in the useEffect above

      setIsInitialized(true);
      console.log('AgroAI app initialized successfully');
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert(LanguageService.t('error'), LanguageService.t('initError'));
    }
  };

  if (!isInitialized || !fontsLoaded) {
    return null; // Optionally render a splash screen here
  }

  return (
    <NavigationContainer>
      {userToken ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
