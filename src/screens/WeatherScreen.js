// WeatherScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import LanguageService from '../services/LanguageService';

const {
  EXPO_PUBLIC_WEATHER_API_KEY: API_KEY,
  EXPO_PUBLIC_DEFAULT_LAT: DEFAULT_LAT,
  EXPO_PUBLIC_DEFAULT_LON: DEFAULT_LON,
} = Constants.expoConfig.extra || {};

const WeatherScreen = ({ location: injectedLocation }) => {
  const [coords, setCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [placeName, setPlaceName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const t = LanguageService.t;

  // Resolve coordinates: use injected prop if present; otherwise request permission and read current position
  useEffect(() => {
    let mounted = true;

    async function resolveCoords() {
      try {
        if (injectedLocation?.coords?.latitude && injectedLocation?.coords?.longitude) {
          if (!mounted) return;
          setCoords({
            latitude: injectedLocation.coords.latitude,
            longitude: injectedLocation.coords.longitude,
          });
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (DEFAULT_LAT && DEFAULT_LON) {
            if (!mounted) return;
            setCoords({ latitude: Number(DEFAULT_LAT), longitude: Number(DEFAULT_LON) });
            Alert.alert(t('warning'), t('locationPermissionDeniedUsingDefault') || 'Location permission denied. Using default location.');
          } else {
            Alert.alert(t('error'), t('locationPermissionDenied') || 'Location permission denied.');
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 10000,
          timeout: 15000,
        });
        if (!mounted) return;
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch (err) {
        if (DEFAULT_LAT && DEFAULT_LON) {
          if (!mounted) return;
          setCoords({ latitude: Number(DEFAULT_LAT), longitude: Number(DEFAULT_LON) });
          Alert.alert(t('warning'), t('locationUnavailableUsingDefault') || 'Location unavailable. Using default location.');
        } else {
          Alert.alert(t('error'), (t && t('locationError')) || 'Failed to get current location.');
        }
      }
    }

    resolveCoords();

    return () => {
      mounted = false;
    };
  }, [injectedLocation]); // Re-resolve if parent provides a new location [web:45][web:57]

  // Fetch weather by lat/lon and set place name from API, falling back to reverse geocoding
  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=5&aqi=no&alerts=no`;
      const response = await fetch(url);
      if (!response.ok) {
        const errText = await response.text();
        console.error('Weather fetch failed:', response.status, errText);
        throw new Error('Failed to fetch weather data');
      }
      const data = await response.json();

      const current = data.current;
      const forecastDays = data.forecast?.forecastday || [];

      const weatherData = {
        temperature: current?.temp_c,
        condition: current?.condition?.text || 'N/A',
        humidity: current?.humidity,
        windSpeed: current?.wind_kph,
        rainfall: current?.precip_mm,
      };
      setWeather(weatherData);

      const loc = data.location || {};
      const fromApi = [loc.name, loc.region, loc.country].filter(Boolean).join(', ');
      let nameToShow = fromApi;

      if (!nameToShow && lat && lon) {
        try {
          const rg = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          if (rg && rg.length > 0) {
            const first = rg[0];
            nameToShow = [first.city || first.subregion || first.region, first.country]
              .filter(Boolean)
              .join(', ');
          }
        } catch {
          // Ignore reverse geocode failures
        }
      }
      setPlaceName(nameToShow);

      const forecastData = forecastDays.map((day) => ({
        day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        high: day.day?.maxtemp_c,
        low: day.day?.mintemp_c,
        condition: day.day?.condition?.text || 'N/A',
        rain: day.day?.totalprecip_mm ?? 0,
      }));
      setForecast(forecastData);
    } catch (error) {
      console.error('Fetch weather error:', error);
      Alert.alert(t('error'), t('weatherError') || 'Unable to fetch weather.');
    }
  }, [API_KEY, t]); // Stable deps for useCallback [web:50][web:57]

  // Fetch when coordinates are available or change
  useEffect(() => {
    let mounted = true;
    async function go() {
      if (!coords?.latitude || !coords?.longitude) return;
      setLoading(true);
      await fetchWeather(coords.latitude, coords.longitude);
      if (!mounted) return;
      setLoading(false);
    }
    go();
    return () => { mounted = false; };
  }, [coords, fetchWeather]); // Refetch on coords change [web:57]

  const onRefresh = useCallback(async () => {
    if (!coords) return;
    setIsRefreshing(true);
    await fetchWeather(coords.latitude, coords.longitude);
    setIsRefreshing(false);
  }, [coords, fetchWeather]); // Pull-to-refresh uses latest coords [web:57]

  const getIcon = (condition) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('cloud')) return 'cloudy';
    if (c.includes('rain')) return 'rainy';
    if (c.includes('snow')) return 'snow';
    if (c.includes('clear') || c.includes('sunny')) return 'sunny';
    return 'partly-sunny';
  };

  if (loading || !weather) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 8 }}>{t('loadingWeather')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <StatusBar style="light" backgroundColor="#2E7D32" />

      <View style={styles.header}>
        <Text style={styles.title}>🌤️ Weather & Climate</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.currentCard}>
        <View style={styles.curHeader}>
          <View>
            <Text style={styles.temp}>{weather.temperature}°C</Text>
            <Text style={styles.cond}>{weather.condition}</Text>
            {placeName ? <Text style={styles.loc}>📍 {placeName}</Text> : null}
          </View>
          <Ionicons name={getIcon(weather.condition)} size={80} color="#FFD700" />
        </View>
        <View style={styles.grid}>
          <View style={styles.item}>
           <Ionicons name="water-outline" size={20} color="#2196F3" />
            <Text style={styles.label}>{t('humidity')}</Text>
            <Text style={styles.value}>{weather.humidity}%</Text>
          </View>
          <View style={styles.item}>
            <Ionicons name="car-outline" size={20} color="#607D8B" />
            <Text style={styles.label}>Wind</Text>
            <Text style={styles.value}>{weather.windSpeed} km/h</Text>
          </View>
          <View style={styles.item}>
            <Ionicons name="umbrella-outline" size={20} color="#4CAF50" />
            <Text style={styles.label}>{t('rainfall')}</Text>
            <Text style={styles.value}>{weather.rainfall} mm</Text>
          </View>
        </View>
      </View>

      <View style={styles.forecastCard}>
        <Text style={styles.cardTitle}>📅 5-Day Forecast</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.fcContainer}>
            {forecast.map((d, i) => (
              <View key={i} style={styles.fcItem}>
                <Text style={styles.fcDay}>{d.day}</Text>
                <Ionicons name={getIcon(d.condition)} size={32} color="#FFD700" />
                <Text style={styles.fcHigh}>{d.high}°</Text>
                <Text style={styles.fcLow}>{d.low}°</Text>
                <Text style={styles.fcRain}>{d.rain}mm</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#2E7D32',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  refreshBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  currentCard: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 25,
    borderRadius: 15,
    elevation: 5,
  },
  curHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  temp: { fontSize: 48, color: 'white', fontWeight: 'bold' },
  cond: { fontSize: 18, color: 'white', opacity: 0.9 },
  loc: { fontSize: 14, color: 'white', opacity: 0.9, marginTop: 4 },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  item: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 10,
  },
  label: { color: 'white', fontSize: 12, marginTop: 5 },
  value: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  forecastCard: { margin: 15, padding: 20, backgroundColor: 'white', borderRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  fcContainer: { flexDirection: 'row' },
  fcItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    marginRight: 20,
    alignItems: 'center',
    borderRadius: 10,
    minWidth: 80,
  },
  fcDay: { fontSize: 12, color: '#666', marginBottom: 5 },
 fcHigh: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  fcLow: { fontSize: 14, color: '#666' },
  fcRain: { fontSize: 12, color: '#2196F3', marginTop: 2 },
});

export default WeatherScreen;
