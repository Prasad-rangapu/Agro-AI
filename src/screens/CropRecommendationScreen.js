import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import MLService from '../services/MLService';
import VoiceService from '../services/VoiceService';
import LanguageService from '../services/LanguageService';

const CropRecommendationScreen = () => {
  const [farmData, setFarmData] = useState({
    soilType: 'Loam',
    farmArea: '1',
    season: 'kharif',
    budget: '50000',
  });

  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const t = LanguageService.t;

  const getRecommendations = async () => {
    try {
      setIsLoading(true);

      const requestData = {
        soilType: farmData.soilType,
        farmArea: parseFloat(farmData.farmArea),
        season: farmData.season,
        budget: parseFloat(farmData.budget),
        weatherData: { temperature: 25, rainfall: 800 }, // Mock data
      };

      const result = await MLService.recommendCrops(requestData);
      setRecommendations(result.recommendations);

      if (result.recommendations.length > 0) {
        const topCrop = result.recommendations[0];
        await VoiceService.speak(
          `I recommend ${topCrop.crop} with ${Math.round(
            topCrop.suitabilityScore * 100
          )}% suitability`
        );
      }
    } catch (error) {
      Alert.alert(t('error'), t('recommendationError'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderInputForm = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🌾 Farm Information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Farm Area (hectares)</Text>
        <TextInput
          style={styles.input}
          value={farmData.farmArea}
          onChangeText={(text) =>
            setFarmData((prev) => ({ ...prev, farmArea: text }))
          }
          keyboardType="numeric"
          placeholder="Enter farm area"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Budget (₹)</Text>
        <TextInput
          style={styles.input}
          value={farmData.budget}
          onChangeText={(text) =>
            setFarmData((prev) => ({ ...prev, budget: text }))
          }
          keyboardType="numeric"
          placeholder="Enter budget"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Season</Text>
        <TextInput
          style={styles.input}
          value={farmData.season}
          onChangeText={(text) =>
            setFarmData((prev) => ({ ...prev, season: text }))
          }
          placeholder={t('enterSeason')}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Soil Type</Text>
        <TextInput
          style={styles.input}
          value={farmData.soilType}
          onChangeText={(text) =>
            setFarmData((prev) => ({ ...prev, soilType: text }))
          }
         placeholder={t('enterSoilType')}
        />
      </View>
    </View>
  );

  const renderRecommendations = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🎯 Recommendations</Text>
      {recommendations.length > 0 ? (
        recommendations.map((crop, index) => (
          <View key={index} style={styles.cropCard}>
            <View style={styles.cropHeader}>
              <Text style={styles.cropName}>{crop.crop}</Text>
              <Text style={styles.suitabilityScore}>
                {Math.round(crop.suitabilityScore * 100)}% match
              </Text>
            </View>

            <Text style={styles.variety}>Variety: {crop.variety}</Text>

            <View style={styles.cropDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="leaf-outline" size={16} color="#4CAF50" />
                <Text style={styles.detailText}>
                  Yield: {crop.expectedYield}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={16} color="#2196F3" />
                <Text style={styles.detailText}>
                  Profit: {crop.profitMargin}%
                </Text>
              </View>
            </View>

            <View style={styles.timing}>
              <Text style={styles.timingText}>
                🌱 Plant: {crop.plantingTime} → 🌾 Harvest: {crop.harvestTime}
              </Text>
            </View>

            <View style={styles.reasonsContainer}>
              <Text style={styles.reasonsTitle}>Why this crop:</Text>
              {crop.reasons.map((reason, idx) => (
                <Text key={idx} style={styles.reasonText}>
                  • {reason}
                </Text>
              ))}
            </View>

            {crop.tips && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>💡 Tips:</Text>
                {crop.tips.map((tip, idx) => (
                  <Text key={idx} style={styles.tipText}>
                    • {tip}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.noRecommendations}>
          <Ionicons
            name="information-circle-outline"
            size={40}
            color="#ccc"
          />
       <Text style={styles.noRecommendationsText}>
            Click "Get AI Recommendations" to see crop suggestions
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="light" backgroundColor="#2E7D32" />

      <View style={styles.header}>
        <Text style={styles.title}>🌾 Crop Recommendations</Text>
        <Text style={styles.subtitle}>AI-powered farming advice</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.getRecommendationsButton,
          isLoading && styles.disabledButton,
        ]}
        onPress={getRecommendations}
        disabled={isLoading}
      >
        <Ionicons name="bulb-outline" size={24} color="white" />
       <Text style={styles.buttonText}>
          {isLoading ? 'Getting Recommendations...' : 'Get AI Recommendations'}
        </Text>
      </TouchableOpacity>

      {renderInputForm()}
      {renderRecommendations()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  getRecommendationsButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  card: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  cropCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cropName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  suitabilityScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  variety: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  cropDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  timing: {
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
  },
  timingText: {
    fontSize: 12,
    color: '#2E7D32',
    textAlign: 'center',
  },
  reasonsContainer: {
    marginBottom: 10,
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  reasonText: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
  tipsContainer: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 5,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 11,
    color: '#856404',
    lineHeight: 16,
  },
  noRecommendations: {
    alignItems: 'center',
    padding: 40,
  },
 noRecommendationsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default CropRecommendationScreen;
