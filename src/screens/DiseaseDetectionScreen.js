import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import MLService from '../services/MLService';
import LanguageService from '../services/LanguageService';

const DiseaseDetectionScreen = () => {
  const [image, setImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = LanguageService.t;

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissionDenied'),
          t('cameraPermission')
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert(t('error'), t('cameraPermissionError'));
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionDenied'), t('cameraPermission'));
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: "Images", // Changed here to string literal
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setAnalysisResult(null);
      } else {
        Alert.alert(t('error'), t('captureError'));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('error'), t('captureError'));
    }
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "Images", // Changed here to string literal
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setAnalysisResult(null);
      } else {
        Alert.alert(t('error'), t('selectImageError'));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('error'), t('selectImageError'));
    }
  };

  const analyzeImage = async () => {
    if (!image) {
      Alert.alert(t('error'), 'Please select or take a photo first.');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate image analysis
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = {
        disease: 'Healthy',
        confidence: 0.95,
        treatment: 'No treatment needed',
      };
      setAnalysisResult(result);
    } catch (error) {
      console.error('Error analyzing image:', error);
      Alert.alert(t('error'), t('analyzeError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2E7D32" />
      <View style={styles.header}>
        <Text style={styles.title}>🌱 Disease Detection</Text>
        <Text style={styles.subtitle}>Analyze plant health with AI</Text>
      </View>

      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <Ionicons name="image-outline" size={80} color="#ddd" />
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={24} color="white" />
          <Text style={styles.buttonText}>{t('takePhoto')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Ionicons name="image-outline" size={24} color="white" />
          <Text style={styles.buttonText}>{t('gallery')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.analyzeButton, !image && styles.disabledButton]}
        onPress={analyzeImage}
        disabled={!image || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Ionicons name="search-outline" size={24} color="white" />
            <Text style={styles.analyzeButtonText}>{t('analyzing')}</Text>
          </>
        )}
      </TouchableOpacity>

      {analysisResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Analysis Result</Text>
          <Text style={styles.resultText}>
            Status: {analysisResult.disease} ({analysisResult.confidence * 100}%)
          </Text>
          <Text style={styles.resultText}>Treatment: {analysisResult.treatment}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2E7D32',
    paddingTop: 50,
    paddingBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginTop: 5,
  },
  imageContainer: {
    width: 200,
    height: 200,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  analyzeButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  resultContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    width: '80%',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 16,
    marginBottom: 5,
  },
});

export default DiseaseDetectionScreen;