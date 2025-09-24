// import React, { useEffect, useState } from 'react';
// import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';
// import * as Location from 'expo-location';

// export default function CropRecommendation(formData) {
//   const [location, setLocation] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [recommendations, setRecommendations] = useState(null);

//   async function askLocationPermissionAndFetch() {
//     setLoading(true);
//     try {
//       // Request permissions
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         Alert.alert('Permission Denied', 'Location permission is needed to fetch crop recommendations.');
//         setLoading(false);
//         return;
//       }

//       // Get current location
//       const userLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
//       const { latitude, longitude } = userLocation.coords;
//       setLocation({ latitude, longitude });

//       // Prepare request data
//       const requestBody = {
//         latitude,
//         longitude,
//         area_hectares: 2.0,           // Adjust as per your app input
//         budget_inr: 50000,            // Adjust as per your app input
//         planting_season: 'kharif'     // Example; you can customize via UI
//         // Add preferred_crops or farmer_experience if needed
//       };

//       // Call backend
//       const response = await fetch('http://localhost:8000/recommendations', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(requestBody),
//       });

//       if (!response.ok) {
//         throw new Error(`Server error: ${response.status}`);
//       }

//       const data = await response.json();
//       setRecommendations(data);

//     } catch (error) {
//       Alert.alert('Error', error.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <View style={{ padding: 20 }}>
//       <Button title="Get Crop Recommendations" onPress={askLocationPermissionAndFetch} />
//       {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
//       {location && (
//         <Text style={{ marginTop: 20 }}>Latitude: {location.latitude.toFixed(6)}, Longitude: {location.longitude.toFixed(6)}</Text>
//       )}
//       {recommendations && (
//         <View style={{ marginTop: 20 }}>
//           <Text>Farm ID: {recommendations.farm_id}</Text>
//           <Text>Top Recommendation: {recommendations.recommendations[0]?.crop_name}</Text>
//           <Text>Expected Profit: ₹{recommendations.recommendations[0]?.expected_profit_inr.toFixed(0)}</Text>
//           {/* Render other details as needed */}
//         </View>
//       )}
//     </View>
//   );
// }
