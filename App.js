import 'intl-pluralrules';
import React, { useEffect, useState, useContext } from "react";
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
// Make sure the path is correct

// Screens
import LanguageSelectionScreen from './src/screens/LanguageSelectionScreen';
import AuthScreen from './src/screens/AuthScreens';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import CropRecommendationScreen from './src/screens/CropRecommendationScreen';
import DiseaseDetectionScreen from './src/screens/DiseaseDetectionScreen';
import WeatherScreen from './src/screens/WeatherScreen';

// Services
import { AuthProvider, AuthContext } from './src/context/AuthContext';
// import MLService from './src/services/MLService';
import DatabaseService from './src/services/DatabaseService';
import LanguageService from './src/services/LanguageService';
import * as Location from 'expo-location';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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
  const [location, setLocation] = useState(null);
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

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          LanguageService.t('error'),
          LanguageService.t('locationPermissionDenied')
        );
        return;
      }

      let locationData = await Location.getCurrentPositionAsync({});
      if (locationData) {
        setLocation(locationData);
        console.log("Location data fetched:", locationData);
      } else {
        console.log("Location data is null.");
      }
    })();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize services
      // await MLService.initialize();
      await DatabaseService.initialize(); // Initialize DatabaseService here
      await LanguageService.initialize();

      // Load user profile and set language
      const userProfile = await DatabaseService.getUserProfile();
      if (userProfile?.language) {
        await LanguageService.changeLanguage(userProfile.language);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert(LanguageService.t('error'), LanguageService.t('locationError'));
    }

    // Check if user is already logged in
    // restoreToken() is now called in the useEffect above

    setIsInitialized(true);
    console.log('AgroAI app initialized successfully');

  };

  if (!isInitialized || !fontsLoaded) {
    return null; // Optionally render a splash screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken ? (
          <>
            <Stack.Screen name="Main" component={MainApp} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthStack} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function MainApp({ location }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
      <Stack.Screen name="Weather">
        {(props) => <WeatherScreen {...props} location={location} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
      <Stack.Screen name="AuthScreen" component={AuthScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
