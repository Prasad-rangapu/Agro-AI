import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import RecommendationsList from './components/RecommendationsList';
import SoilAnalysis from './components/SoilAnalysis';
import NetInfo from '@react-native-community/netinfo';
import DatabaseService from '../../src/services/DatabaseService';

const API_BASE_URL = 'http://localhost:8000';

export default function App() {
  const [location, setLocation] = useState(null);
  const [area, setArea] = useState('2.0');
  const [budget, setBudget] = useState('50000');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  useEffect(() => {
    DatabaseService.initialize();
    getLocation();
  }, []);

  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied');
      return;
    }
    let loc = await Location.getCurrentPositionAsync({});
    setLocation({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
  };

  const getRecommendations = async () => {
    if (!location) return;
    setLoading(true);

    const netInfo = await NetInfo.fetch();

    if (netInfo.isConnected) {
      try {
        const response = await axios.post(API_BASE_URL + '/recommendations', {
          latitude: location.latitude,
          longitude: location.longitude,
          area_hectares: parseFloat(area),
          budget_inr: parseFloat(budget),
          planting_season: 'kharif'
        });
        setRecommendations(response.data);
        const locationKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
        await DatabaseService.cacheRecommendations(locationKey, JSON.stringify(response.data));
      } catch (error) {
        Alert.alert('Error', 'Could not get recommendations');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const locationKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
        const cachedData = await DatabaseService.getRecommendationsCache(locationKey);
        if (cachedData) {
          setRecommendations(cachedData.data);
        } else {
          Alert.alert('Offline', 'You are offline and no recommendations are cached.');
        }
      } catch (error) {
        Alert.alert('Error', 'Could not load cached recommendations.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌱 Smart Crop Advisor</Text>
      </View>

      

      <View style={styles.form}>
        <Text style={styles.label}>Farm Area (Hectares):</Text>
        <TextInput style={styles.input} value={area} onChangeText={setArea} keyboardType="numeric" />

        <Text style={styles.label}>Budget (₹):</Text>
        <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="numeric" />

        <TouchableOpacity style={styles.button} onPress={getRecommendations} disabled={loading || !location}>
          <Text style={styles.buttonText}>
            {loading ? 'Getting Recommendations...' : 'Get AI Recommendations'}
          </Text>
        </TouchableOpacity>
      </View>

            {loading && <View><ActivityIndicator size="large" color="#4CAF50" style={{margin: 20}} /><Text style={{textAlign: 'center'}}>Please wait while fetching recommendations...</Text></View>}
      {recommendations && <SoilAnalysis data={recommendations} />}
      {recommendations && (
        <RecommendationsList 
          data={recommendations}
          onViewPriceForecast={(crop) => Alert.alert('Price Forecast', 'Coming soon for ' + crop)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#4CAF50', padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  location: { padding: 15, textAlign: 'center', color: '#666' },
  form: { backgroundColor: 'white', margin: 15, padding: 20, borderRadius: 8 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 5, fontSize: 16 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, marginTop: 20 },
  buttonText: { color: 'white', textAlign: 'center', fontSize: 16, fontWeight: 'bold' }
});