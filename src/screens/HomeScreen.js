import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LanguageService from '../services/LanguageService';
import DatabaseService from '../services/DatabaseService'; // Import DatabaseService
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [lang, setLang] = useState(LanguageService.getCurrentLanguage());
  const navigation = useNavigation();

  useEffect(() => {
    let mounted = true;
    const fetchUserProfile = async () => {
      try {
        const profile = await DatabaseService.getUserProfile();
        if (!mounted) return;
        if (profile) {
          setUserProfile(profile);
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchUserProfile();

    // subscribe to language changes so UI updates immediately
    const unsubscribe = LanguageService.onLanguageChanged((lng) => {
      setLang(lng);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [navigation]);

  const handleChangeLanguage = async () => {
    navigation.navigate('LanguageSelection');
  };

  const t = LanguageService.t; // use LanguageService.t as before; re-render will occur on lang change

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{t('welcome')}</Text>
          <TouchableOpacity
            style={styles.changeLanguageButton}
            onPress={handleChangeLanguage}
          >
            <Ionicons name="globe" size={24} color="white" />
            <Text style={styles.changeLanguageText}>{t('changeLanguage')}</Text>
          </TouchableOpacity>
        </View>
        {userProfile && (
          <Text style={styles.subtitle}>
            {t('welcomeBackUser', { name: userProfile?.name || 'User' })}
          </Text>
        )}
      </View>

      <View style={styles.dashboard}>
        <Text style={styles.dashboardTitle}>{t('farmStats')}</Text>
        {userProfile && (
          <View style={styles.statContainer}>
            <Text style={styles.statLabel}>{t('farmSize')}:</Text>
            <Text style={styles.statValue}>{userProfile?.farmSize} {t('acres')}</Text>
            <Text style={styles.statLabel}>{t('location')}:</Text>
            <Text style={styles.statValue}>{userProfile?.location}</Text>
          </View>
        )}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>{t('quickActions')}</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionBox, { backgroundColor: '#E8F5E9' }]} // Light green background
            onPress={() => navigation.navigate('Crops')}
          >
            <Ionicons name="leaf" size={30} color="#2E7D32" />
            <Text style={styles.actionText}>{t('cropRecommendation')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBox, { backgroundColor: '#E8F5E9' }]} // Light green background
            onPress={() => navigation.navigate('Disease')}
          >
            <Ionicons name="camera" size={30} color="#2E7D32" />
            <Text style={styles.actionText}>{t('diseaseDetection')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBox, { backgroundColor: '#E8F5E9' }]} // Light green background
            onPress={() => navigation.navigate('Weather')}
          >
            <Ionicons name="cloud" size={30} color="#2E7D32" />
            <Text style={styles.actionText}>{t('weatherForecast')}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    marginTop: 5,
  },
  dashboard: {
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
  dashboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statContainer: {
    flexDirection: 'column', // Changed to column
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 16,
  },
  quickActions: {
    padding: 20,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow items to wrap to the next line
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionBox: {
    backgroundColor: 'white',
    width: '45%', // Take up almost half the width
    height: 120, // Increased height for better spacing
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    marginBottom: 10, // Add some margin between the boxes
  },
  actionText: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  changeLanguageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#388E3C', // A slightly darker green
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  changeLanguageText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
});

export default HomeScreen;