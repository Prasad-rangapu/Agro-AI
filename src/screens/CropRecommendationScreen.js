import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function CropRecommendationScreen() {
  const [location, setLocation] = useState(null);
  const [farmData, setFarmData] = useState({
    farmArea: '1',
    budget: '50000',
    season: 'kharif',
  });
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  async function getRecommendations() {
    setLoading(true);

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
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

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
          style={styles.button}
          onPress={getRecommendations}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Get Recommendations</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 20 }} />}

      

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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  formContainer: {
    padding: 20,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    backgroundColor: '#E8F5E9',
  },
  button: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  locationText: {
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
    color: '#555',
  },
  recommendationsContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  recommendationCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  cropName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2E7D32',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 14,
  },
});