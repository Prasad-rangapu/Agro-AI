import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LanguageService from '../services/LanguageService';
import { SafeAreaView } from 'react-native-safe-area-context';

const AuthScreen = ({ navigation, route }) => {
  const t = LanguageService.t;
  const { selectedLanguage } = route.params || {}; // Get selected language

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="leaf-outline" size={80} color="#2E7D32" />
        <Text style={styles.title}>AgroAI</Text>
        <Text style={styles.subtitle}>{t('smartFarmingAssistant')}</Text>
      </View>

      <View style={styles.buttonContainer}>
       <TouchableOpacity
          style={styles.loginButton}
         onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>{t('login')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
         style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.buttonText}>{t('register')}</Text>
        </TouchableOpacity>
      </View>

      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back-outline" size={20} color="#666" />
        <Text style={styles.backButtonText}>{t('changeLanguage')}</Text>
      </Pressable>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 80 },
  title: { fontSize: 40, fontWeight: 'bold', color: '#333', marginTop: 20 },
 subtitle: { fontSize: 16, color: '#666' },
  buttonContainer: { width: '100%' },
  loginButton: { backgroundColor: '#2E7D32', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  registerButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default AuthScreen;
