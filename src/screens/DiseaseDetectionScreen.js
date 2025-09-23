import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import VoiceService from '../services/VoiceService';
import DatabaseService from '../services/DatabaseService';
import LanguageService from '../services/LanguageService';

const DiseaseDetectionScreen = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef(null);
  const t = LanguageService.t;

  React.useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasPermission(cameraStatus === 'granted' && mediaStatus === 'granted');
    } catch (error) {
      console.error('Permission error:', error);
      setHasPermission(false);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setSelectedImage(photo.uri);
        setShowCamera(false);
        await analyzeImage(photo.uri);
      } catch (error) {
        Alert.alert(t('error'), t('captureError'));
      }
    }
  };

  const selectFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        await analyzeImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(t('error'), t('selectImageError'));
    }
  };

  const analyzeImage = async (imageUri) => {
    setIsAnalyzing(true);
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));

      const diseases = [
        { 
          name: 'Leaf Spot', 
          confidence: 0.89, 
          description: 'Fungal infection causing circular spots on leaves',
          treatment: 'Apply copper-based fungicide spray every 7-10 days'
        },
        { 
          name: 'Powdery Mildew', 
          confidence: 0.75, 
          description: 'White powdery growth on leaf surfaces',
          treatment: 'Use sulfur-based fungicide and improve air circulation'
        },
        { 
          name: 'Bacterial Blight', 
          confidence: 0.82, 
          description: 'Water-soaked lesions with yellow halos',
          treatment: 'Remove affected parts and apply copper bactericide'
        },
        { 
          name: 'Healthy', 
          confidence: 0.95, 
          description: 'Plant appears healthy with no visible diseases',
          treatment: 'Continue regular care and monitoring'
        }
      ];

      const randomDisease = diseases[Math.floor(Math.random() * diseases.length)];

      setAnalysisResult(randomDisease);

      // Save to database
      await DatabaseService.addDiseaseDetection({
        cropName: 'Unknown Crop',
        diseaseName: randomDisease.name,
        confidence: randomDisease.confidence,
        imagePath: imageUri
      });

      // Voice feedback
      if (randomDisease.name === 'Healthy') {
        await VoiceService.speak('Great news! Your plant appears healthy.');
      } else {
        await VoiceService.speak(`Disease detected: ${randomDisease.name}. Check the treatment recommendations.`);
      }

    } catch (error) {
      Alert.alert(t('error'), t('analyzeError'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderCameraView = () => (
    <Modal visible={showCamera} animationType="slide">
      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          ref={cameraRef}
        >
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCamera(false)}
            >
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <Ionicons name="camera" size={40} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </Camera>
      </View>
    </Modal>
  );

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text>Requesting camera permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={60} color="#ccc" />
        <Text style={styles.permissionText}>Camera permission is required</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="light" backgroundColor="#2E7D32" />

      <View style={styles.header}>
        <Text style={styles.title}>🔍 Disease Detection</Text>
        <Text style={styles.subtitle}>AI-powered plant health analysis</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowCamera(true)}
        >
          <Ionicons name="camera-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={selectFromGallery}
        >
          <Ionicons name="images-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {selectedImage && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
        </View>
      )}

      {isAnalyzing && (
        <View style={styles.analyzingContainer}>
          <Text style={styles.analyzingText}>🔬 Analyzing plant health...</Text>
          <Text style={styles.analyzingSubtext}>Please wait while AI examines your image</Text>
        </View>
      )}

      {analysisResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>📊 Analysis Results</Text>

          <View style={styles.diseaseCard}>
            <View style={styles.diseaseHeader}>
              <Text style={styles.diseaseName}>
                {analysisResult.name === 'Healthy' ? '✅' : '⚠️'} {analysisResult.name}
              </Text>
              <Text style={[
                styles.confidence,
                { color: analysisResult.confidence > 0.8 ? '#4CAF50' : '#FF9800' }
              ]}>
                {Math.round(analysisResult.confidence * 100)}%
              </Text>
            </View>

            <Text style={styles.description}>
              {analysisResult.description}
            </Text>

            <View style={styles.treatmentSection}>
              <Text style={styles.treatmentTitle}>💊 Recommended Treatment:</Text>
              <Text style={styles.treatmentText}>
                {analysisResult.treatment}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setSelectedImage(null);
              setAnalysisResult(null);
            }}
          >
            <Ionicons name="refresh-outline" size={20} color="#2E7D32" />
            <Text style={styles.retryButtonText}>Analyze Another Image</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderCameraView()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginLeft: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  selectedImage: {
    width: 250,
    height: 250,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#2E7D32',
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: 30,
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    elevation: 3,
  },
  analyzingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  analyzingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  resultContainer: {
    margin: 20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  diseaseCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    marginBottom: 20,
  },
  diseaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  diseaseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  confidence: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  treatmentSection: {
    backgroundColor: '#f0f8f0',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  treatmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  treatmentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  retryButtonText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#2E7D32',
    padding: 20,
    borderRadius: 40,
  },
});

export default DiseaseDetectionScreen;