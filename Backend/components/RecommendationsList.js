import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const RecommendationsList = ({ data, onViewPriceForecast }) => {
  if (!data || !data.recommendations) {
    return <Text>No recommendations available</Text>;
  }

  const renderItem = ({ item, index }) => (
    <View style={[styles.card, index === 0 && styles.topCard]}>
      <Text style={styles.cropName}>{item.crop_name.toUpperCase()}</Text>
      <Text style={styles.profit}>Profit: ₹{item.expected_profit_inr.toLocaleString()}</Text>
      <Text style={styles.yield}>Yield: {item.expected_yield_kg_ha.toFixed(0)} kg/ha</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => onViewPriceForecast(item.crop_name)}
      >
        <Text style={styles.buttonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌾 Crop Recommendations</Text>
      <FlatList
        data={data.recommendations}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { margin: 15 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  card: { backgroundColor: 'white', padding: 15, marginBottom: 10, borderRadius: 8 },
  topCard: { borderColor: '#4CAF50', borderWidth: 2 },
  cropName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  profit: { fontSize: 14, color: '#4CAF50', marginBottom: 3 },
  yield: { fontSize: 14, color: '#666', marginBottom: 10 },
  button: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' }
});

export default RecommendationsList;