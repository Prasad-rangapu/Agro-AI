import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import VoiceService from '../services/VoiceService';
import DatabaseService from '../services/DatabaseService';
import LanguageService from '../services/LanguageService';

const HomeScreen = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const t = LanguageService.t;

  useEffect(() => {
    loadUserProfile();
    setupVoiceCallbacks();
  }, []);

  const setupVoiceCallbacks = () => {
    VoiceService.setOnResults((results) => {
      if (results && results.length > 0) {
        handleVoiceCommand(results);
        setIsVoiceListening(false);
      }
    });
  };

  const handleVoiceCommand = async (results) => {
    const command = VoiceService.simulateVoiceCommand(results[0]);

    switch (command.action) {
      case 'cropRecommendation':
        navigation.navigate('Crops');
        await VoiceService.speak('Opening crop recommendations');
        break;
      case 'diseaseDetection':
        navigation.navigate('Disease');
        await VoiceService.speak('Opening disease detection');
        break;
      case 'weather':
        navigation.navigate('Weather');
        await VoiceService.speak('Opening weather information');
        break;
      default:
        await VoiceService.speak('How can I help you with farming today?');
    }
  };

  const startVoiceListening = async () => {
    try {
      setIsVoiceListening(true);
      await VoiceService.startListening();
    } catch (error) {
      setIsVoiceListening(false);
      Alert.alert(t('error'), t('voiceDemoError'));
    } finally {
      setIsVoiceListening(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await DatabaseService.getUserProfile();
      if (!profile) {
        // Create a default profile for demo
        await DatabaseService.createUserProfile({
          name: 'Demo Farmer',
          phone: '+91 9876543210',
          location: 'Visakhapatnam, AP',
          farmSize: 2.5,
          soilType: 'Loam'
        });
        const newProfile = await DatabaseService.getUserProfile();
        setUserProfile(newProfile);
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserProfile();
    setIsRefreshing(false);
  };

  const renderQuickActions = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Disease')}
        >
          <Ionicons name="camera-outline" size={24} color="white" />
          <Text style={styles.actionButtonText}>Detect Disease</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Crops')}
        >
          <Ionicons name="leaf-outline" size={24} color="white" />
          <Text style={styles.actionButtonText}>Crop Advice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, isVoiceListening && styles.listeningButton]}
          onPress={startVoiceListening}
          disabled={isVoiceListening}
        >
          <Ionicons name={isVoiceListening ? "mic-off" : "mic-outline"} size={24} color="white" />
         <Text style={styles.actionButtonText}>{t('voiceAssistant')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Weather')}
        >
          <Ionicons name="cloud-outline" size={24} color="white" />
          <Text style={styles.actionButtonText}>Weather</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWelcomeCard = () => (
    <View style={styles.card}>
      <View style={styles.welcomeHeader}>
        <Ionicons name="person-circle-outline" size={40} color="#2E7D32" />
        <View style={styles.welcomeText}>
          <Text style={styles.welcomeName}>
            Welcome, {userProfile?.name || 'Farmer'}!
          </Text>
          <Text style={styles.welcomeLocation}>
            {userProfile?.location || 'Your Farm'}
          </Text>
        </View>
      </View>
      <View style={styles.farmStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userProfile?.farm_size || '2.5'} ha</Text>
          <Text style={styles.statLabel}>Farm Size</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userProfile?.soil_type || 'Loam'}</Text>
          <Text style={styles.statLabel}>Soil Type</Text>
        </View>
      </View>
    </View>
  );

  const renderTipsCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Today's Farming Tips</Text>
      <View style={styles.tipItem}>
        <Ionicons name="water-outline" size={20} color="#2196F3" />
        <Text style={styles.tipText}>
          Monitor soil moisture levels regularly for optimal crop growth
        </Text>
      </View>
      <View style={styles.tipItem}>
        <Ionicons name="leaf-outline" size={20} color="#4CAF50" />
        <Text style={styles.tipText}>
          Check plants for early signs of disease or pest damage
        </Text>
      </View>
      <View style={styles.tipItem}>
        <Ionicons name="sunny-outline" size={20} color="#FF9800" />
        <Text style={styles.tipText}>
          Plan planting schedule based on weather forecasts
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2E7D32" />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.appTitle}>🌾 AgroAI</Text>
          <Text style={styles.tagline}>Smart Farming Assistant</Text>
        </View>

        {renderWelcomeCard()}
        {renderQuickActions()}
        {renderTipsCard()}
      </ScrollView>
    </View>
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
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  card: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  welcomeText: {
    marginLeft: 15,
    flex: 1,
  },
  welcomeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  welcomeLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  farmStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  listeningButton: {
   backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'center',
    fontSize: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});

export default HomeScreen;