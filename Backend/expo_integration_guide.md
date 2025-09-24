
# Expo React Native Integration Guide

## Overview
This guide shows how to integrate the Agricultural ML Pipeline backend with your Expo React Native frontend application.

## Setup Instructions

### 1. Install Required Dependencies

```bash
npx create-expo-app AgriculturalApp
cd AgriculturalApp

# Install required packages
npx expo install expo-location
npm install axios react-native-charts-wrapper
npm install @react-native-async-storage/async-storage
npm install react-native-modal
```

### 2. Backend API Integration

#### Configure API Client (services/api.js)

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'  // Development server
  : 'https://your-api-domain.com';  // Production server

class AgriculturalAPI {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Get crop recommendations
  async getCropRecommendations(farmData) {
    try {
      const response = await this.client.post('/recommendations', farmData);

      // Cache recommendations locally
      await AsyncStorage.setItem(
        `recommendations_${farmData.latitude}_${farmData.longitude}`,
        JSON.stringify({
          data: response.data,
          timestamp: Date.now()
        })
      );

      return response.data;
    } catch (error) {
      // Try to get cached data if API fails
      const cached = await this.getCachedRecommendations(farmData);
      if (cached) {
        console.log('Using cached recommendations due to network error');
        return cached;
      }
      throw error;
    }
  }

  // Get cached recommendations
  async getCachedRecommendations(farmData) {
    try {
      const cached = await AsyncStorage.getItem(
        `recommendations_${farmData.latitude}_${farmData.longitude}`
      );

      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Use cache if less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.error('Cache error:', error);
    }
    return null;
  }

  // Get soil analysis
  async getSoilAnalysis(latitude, longitude) {
    const response = await this.client.get('/soil/analysis', {
      params: { lat: latitude, lon: longitude }
    });
    return response.data;
  }

  // Get price forecast
  async getPriceForecast(cropName, monthsAhead = 6) {
    const response = await this.client.get(`/crops/prices/${cropName}`, {
      params: { months_ahead: monthsAhead }
    });
    return response.data;
  }

  // Check API health
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export default new AgriculturalAPI();
```

#### Main App Component (App.js)

```javascript
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import AgriculturalAPI from './services/api';
import FarmInputForm from './components/FarmInputForm';
import RecommendationsList from './components/RecommendationsList';
import SoilAnalysis from './components/SoilAnalysis';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [apiHealth, setApiHealth] = useState(null);

  useEffect(() => {
    checkLocationPermission();
    checkAPIHealth();
  }, []);

  const checkLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to get soil and weather data for your area.'
        );
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Could not get your location');
    }
  };

  const checkAPIHealth = async () => {
    try {
      const health = await AgriculturalAPI.healthCheck();
      setApiHealth(health);
    } catch (error) {
      console.error('API health check failed:', error);
      setApiHealth({ status: 'offline' });
    }
  };

  const handleGetRecommendations = async (farmInput) => {
    setLoading(true);
    try {
      const farmData = {
        ...farmInput,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };

      const result = await AgriculturalAPI.getCropRecommendations(farmData);
      setRecommendations(result);

      // Also get soil analysis
      const soil = await AgriculturalAPI.getSoilAnalysis(
        currentLocation.latitude,
        currentLocation.longitude
      );
      setSoilData(soil);

    } catch (error) {
      Alert.alert(
        'Error',
        'Could not get recommendations. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌱 Smart Crop Advisor</Text>
        {apiHealth && (
          <Text style={[styles.status, { 
            color: apiHealth.status === 'healthy' ? '#4CAF50' : '#F44336' 
          }]}>
            API: {apiHealth.status}
          </Text>
        )}
      </View>

      {currentLocation && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            📍 Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        </View>
      )}

      <FarmInputForm 
        onSubmit={handleGetRecommendations}
        loading={loading}
        disabled={!currentLocation}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Getting AI recommendations...</Text>
        </View>
      )}

      {soilData && <SoilAnalysis data={soilData} />}

      {recommendations && (
        <RecommendationsList 
          data={recommendations}
          onViewPriceForecast={(cropName) => {
            // Navigate to price forecast screen
            console.log('Show price forecast for', cropName);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  status: {
    fontSize: 12,
    marginTop: 5,
    color: 'white',
  },
  locationInfo: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    elevation: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
});
```

#### Farm Input Form Component (components/FarmInputForm.js)

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Picker,
} from 'react-native';

const FarmInputForm = ({ onSubmit, loading, disabled }) => {
  const [areaHectares, setAreaHectares] = useState('1.0');
  const [budgetInr, setBudgetInr] = useState('50000');
  const [plantingSeason, setPlantingSeason] = useState('kharif');
  const [farmerExperience, setFarmerExperience] = useState('medium');

  const handleSubmit = () => {
    if (disabled) return;

    const formData = {
      area_hectares: parseFloat(areaHectares) || 1.0,
      budget_inr: parseFloat(budgetInr) || 50000,
      planting_season: plantingSeason,
      farmer_experience: farmerExperience,
    };

    onSubmit(formData);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Farm Details</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Farm Area (Hectares)</Text>
        <TextInput
          style={styles.input}
          value={areaHectares}
          onChangeText={setAreaHectares}
          placeholder="1.0"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Available Budget (₹)</Text>
        <TextInput
          style={styles.input}
          value={budgetInr}
          onChangeText={setBudgetInr}
          placeholder="50000"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Planting Season</Text>
        <Picker
          style={styles.picker}
          selectedValue={plantingSeason}
          onValueChange={setPlantingSeason}
        >
          <Picker.Item label="Kharif (Monsoon)" value="kharif" />
          <Picker.Item label="Rabi (Winter)" value="rabi" />
          <Picker.Item label="Zaid (Summer)" value="zaid" />
        </Picker>
      </View>

      <TouchableOpacity
        style={[styles.button, { opacity: disabled || loading ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={disabled || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Getting Recommendations...' : 'Get AI Recommendations'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FarmInputForm;
```

### 3. Running the Complete System

#### Backend Setup:
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server
python fastapi_main.py
# Or: uvicorn fastapi_main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Setup:
```bash
# Start Expo development server
npx expo start

# For physical device testing
npx expo start --tunnel
```

### 4. Production Deployment

#### Backend Deployment (Railway/Render/DigitalOcean):
```bash
# Add to requirements.txt for production:
gunicorn==20.1.0

# Procfile for deployment:
web: gunicorn fastapi_main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

#### Frontend Deployment:
```bash
# Build for production
npx expo build:android
npx expo build:ios

# Or use EAS Build
eas build --platform all
```

### 5. Key Integration Points

1. **Offline Functionality**: App caches recommendations locally using AsyncStorage
2. **Location Services**: Uses expo-location for GPS coordinates
3. **Error Handling**: Graceful fallbacks when API is unavailable
4. **Loading States**: Clear feedback during data fetching
5. **Data Visualization**: Ready for charts integration with react-native-charts-wrapper

### 6. Advanced Features to Add

- Push notifications for weather alerts
- Image capture for crop/soil analysis
- Offline maps integration
- Multi-language support for local farmers
- Voice input for better accessibility

This integration provides a complete bridge between your agricultural ML backend and mobile frontend, optimized for real-world farming scenarios.
