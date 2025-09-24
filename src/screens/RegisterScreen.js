import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Pressable } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import LanguageService from '../services/LanguageService';
import DatabaseService from '../services/DatabaseService';
import { AuthContext } from '../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const { signIn } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    farmSize: '',
    location: '',
  });
  const t = LanguageService.t;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const requestPermissions = async () => {
    // Location
    let { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    if (locationStatus !== 'granted') {
      Alert.alert(t('permissionDenied'), t('locationPermission'));
      return false;
    }

    // Microphone (Voice)
    let { status: audioStatus } = await Audio.requestPermissionsAsync();
    if (audioStatus !== 'granted') {
      Alert.alert(t('permissionDenied'), t('micPermission'));
      return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    const { name, mobileNumber, farmSize, location } = formData;
    if (!name || !mobileNumber || !farmSize || !location) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    if (mobileNumber.length !== 10) {
      Alert.alert(t('error'), t('invalidMobile'));
      return;
    }

    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) return;

    try {
      const newUser = {
        name,
        mobileNumber,
        farmSize: parseFloat(farmSize),
        location,
      };
      await DatabaseService.createUserProfile(newUser);
      Alert.alert(t('success'), t('accountCreated'));
      signIn(newUser.mobileNumber);

      // Request camera permissions after successful registration
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert(t('permissionDenied'), t('cameraPermission'));
      }

    } catch (error) {
      Alert.alert(t('error'), t('accountCreateFailed'));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>{t('createAccount')}</Text>
      <Text style={styles.subtitle}>{t('farmDetails')}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('name')}</Text>
        <TextInput style={styles.input} value={formData.name} onChangeText={val => handleInputChange('name', val)} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('mobileNumber')}</Text>
        <TextInput style={styles.input} value={formData.mobileNumber} onChangeText={val => handleInputChange('mobileNumber', val)} keyboardType="phone-pad" maxLength={10} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('acresOfLand')}</Text>
        <TextInput style={styles.input} value={formData.farmSize} onChangeText={val => handleInputChange('farmSize', val)} keyboardType="numeric" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('areaOfLand')}</Text>
        <TextInput style={styles.input} value={formData.location} onChangeText={val => handleInputChange('location', val)} />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>{t('register')}</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerText}>{t('alreadyHaveAccount')} <Text style={styles.linkText}>{t('login')}</Text></Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 20, paddingTop: 50 },
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
});

export default RegisterScreen;
