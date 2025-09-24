import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Pressable } from 'react-native';
import LanguageService from '../services/LanguageService';
import DatabaseService from '../services/DatabaseService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const { signIn } = useContext(AuthContext);
  const t = LanguageService.t;

  const handleLogin = async () => {
    if (mobileNumber.length !== 10) {
      Alert.alert(t('error'), t('invalidMobile'));
      return;
    }
    const user = await DatabaseService.loginUser(mobileNumber);
    if (user) {
      await LanguageService.changeLanguage(user.language); // Set language after login
      Alert.alert(t('success'), t('welcomeBackUser', { name: user.name }));
      signIn(mobileNumber);
    } else {
      Alert.alert(t('error'), t('noAccountFound'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('welcomeBack')}</Text>
      <Text style={styles.subtitle}>{t('loginToContinue')}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('mobileNumber')}</Text>
        <TextInput
          style={styles.input}
         placeholder="9876543210"
          keyboardType="phone-pad"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          maxLength={10}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>{t('login')}</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.footerText}>{t('dontHaveAccount')} <Text style={styles.linkText}>{t('register')}</Text></Text>
        </Pressable>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={20} color="#666" />
          <Text style={styles.backButtonText}>{t('goBack')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  button: { backgroundColor: '#2E7D32', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 16,
  },
  linkText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default LoginScreen;
