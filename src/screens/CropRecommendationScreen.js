import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import DatabaseService from '../services/DatabaseService';

export default function CropRecommendationScreen() {
  const [location, setLocation] = useState(null);
  const [farmData, setFarmData] = useState({
    farmArea: '1',
    budget: '50000',
    season: 'kharif',
  });
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [scaleValue] = useState(new Animated.Value(1));

  useEffect(() => {
    DatabaseService.initialize();
  }, []);

  async function getRecommendations() {
    setLoading(true);

    const netInfo = await NetInfo.fetch();

    if (netInfo.isConnected) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Location permission is needed to fetch crop recommendations.'
          );
          setLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        const locationKey = `${loc.coords.latitude.toFixed(4)},${loc.coords.longitude.toFixed(4)}`;

        const requestBody = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          area_hectares: parseFloat(farmData.farmArea),
          budget_inr: parseFloat(farmData.budget),
          planting_season: farmData.season,
        };

        const response = await fetch('http://10.13.14.15:8000/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();
        setRecommendations(data);
        await DatabaseService.cacheRecommendations(locationKey, JSON.stringify(data));
      } catch (error) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Location permission is needed to fetch crop recommendations.'
          );
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const locationKey = `${loc.coords.latitude.toFixed(4)},${loc.coords.longitude.toFixed(4)}`;
        const cachedData = await DatabaseService.getRecommendationsCache(locationKey);
        if (cachedData) {
          console.log("Loaded recommendations from cache");
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
  }

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crop Recommendations</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Farm Area (hectares):</Text>
        <TextInput
          value={farmData.farmArea}
          keyboardType="numeric"
          onChangeText={(text) => setFarmData({ ...farmData, farmArea: text })}
          style={styles.input}
          placeholder="Enter farm area"
        />

        <Text style={styles.label}>Budget (₹):</Text>
        <TextInput
          value={farmData.budget}
          keyboardType="numeric"
          onChangeText={(text) => setFarmData({ ...farmData, budget: text })}
          style={styles.input}
          placeholder="Enter budget"
        />

        <Text style={styles.label}>Planting Season:</Text>
        <TextInput
          value={farmData.season}
          onChangeText={(text) => setFarmData({ ...farmData, season: text })}
          style={styles.input}
          placeholder="Enter season (e.g. kharif)"
        />

        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={{ transform: [{ scale: scaleValue }] }}
          onPress={getRecommendations}
          disabled={loading}
        >
          <Animated.View style={styles.button}>
            <Text style={styles.buttonText}>Get Recommendations</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

            {loading && <View><ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 20 }} /><Text style={{textAlign: 'center'}}>Please wait while fetching recommendations...</Text></View>}

      

      {recommendations?.recommendations && (
        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>
            Recommendations
          </Text>
          {recommendations.recommendations.map((rec, idx) => (
            <View key={idx} style={styles.recommendationCard}>
              <Text style={styles.cropName}>{rec.crop_name}</Text>
              <View style={styles.detailsRow}>
                <Ionicons name="stats-chart" size={16} color="#2E7D32" />
                <Text style={styles.detailText}>Rank: {rec.rank}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Ionicons name="leaf" size={16} color="#2E7D32" />
                <Text style={styles.detailText}>Yield: {rec.expected_yield_kg_ha.toFixed(0)} kg/ha</Text>
              </View>
              <View style={styles.detailsRow}>
                <Ionicons name="cash" size={16} color="#2E7D32" />
                <Text style={styles.detailText}>Profit: ₹{rec.expected_profit_inr.toFixed(0)}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Ionicons name="wallet" size={16} color="#2E7D32" />
                <Text style={styles.detailText}>Upfront Cost: ₹{rec.upfront_cost_inr.toFixed(0)}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Ionicons name={rec.budget_feasible ? 'checkmark-circle' : 'close-circle'} size={16} color={rec.budget_feasible ? '#2E7D32' : '#C62828'} />
                <Text style={styles.detailText}>Budget Feasible: {rec.budget_feasible ? 'Yes' : 'No'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  header: {
    backgroundColor: '#2E7D32',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  formContainer: {
    padding: 25,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  recommendationsContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  recommendationsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#2E7D32'
  },
  recommendationCard: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cropName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2E7D32',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#555'
  },
});