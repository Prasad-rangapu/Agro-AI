import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SoilAnalysis = ({ data }) => {
  if (!data || !data.soil_analysis) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Soil Analysis</Text>
      <View style={styles.row}>
        <Text style={styles.label}>pH Level:</Text>
        <Text style={styles.value}>{data.soil_analysis.ph}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Organic Carbon:</Text>
        <Text style={styles.value}>{data.soil_analysis.organic_carbon}%</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Nitrogen:</Text>
        <Text style={styles.value}>{data.soil_analysis.nitrogen} ppm</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', margin: 15, padding: 15, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontWeight: '600' },
  value: { color: '#4CAF50' }
});

export default SoilAnalysis;