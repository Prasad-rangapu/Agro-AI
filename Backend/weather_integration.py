
"""
Weather Data Integration Module
Fetches historical and current weather data from Open-Meteo API
"""

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional

def get_historical_weather(lat: float, lon: float, 
                          start_date: str = "2015-01-01", 
                          end_date: str = "2024-12-31") -> pd.DataFrame:
    """
    Fetch historical weather data from Open-Meteo

    Parameters:
    lat, lon: Coordinates
    start_date, end_date: Date range for historical data

    Returns:
    pandas.DataFrame: Weather data with temperature, precipitation, etc.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_mean,shortwave_radiation_sum",
        "timezone": "auto"
    }

    try:
        response = requests.get("https://archive-api.open-meteo.com/v1/archive", params=params, timeout=60)
        response.raise_for_status()
        data = response.json()

        # Convert to DataFrame
        df_weather = pd.DataFrame(data['daily'])
        df_weather['time'] = pd.to_datetime(df_weather['time'])

        # Calculate additional derived features
        df_weather['tmean'] = (df_weather['temperature_2m_max'] + 
                              df_weather['temperature_2m_min']) / 2

        # Growing Degree Days with multiple base temperatures
        for base_temp in [5, 10, 15]:
            df_weather[f'gdd_base_{base_temp}'] = (df_weather['tmean'] - base_temp).clip(lower=0)

        # Temperature stress indicators
        df_weather['heat_stress'] = (df_weather['temperature_2m_max'] > 35).astype(int)
        df_weather['cold_stress'] = (df_weather['temperature_2m_min'] < 5).astype(int)

        # Precipitation categories
        df_weather['precip_category'] = pd.cut(
            df_weather['precipitation_sum'], 
            bins=[0, 2.5, 10, 25, float('inf')], 
            labels=['none', 'light', 'moderate', 'heavy']
        )

        # Add time-based features
        df_weather['month'] = df_weather['time'].dt.month
        df_weather['year'] = df_weather['time'].dt.year
        df_weather['day_of_year'] = df_weather['time'].dt.dayofyear

        return df_weather

    except Exception as e:
        print(f"Error fetching weather data: {e}")
        return pd.DataFrame()

def calculate_seasonal_features(weather_df: pd.DataFrame, 
                               crop_season_months: List[int] = [6, 7, 8, 9]) -> Dict:
    """
    Calculate seasonal weather features for crop growing season

    Parameters:
    weather_df: Weather DataFrame from get_historical_weather
    crop_season_months: List of months representing growing season

    Returns:
    dict: Seasonal weather features
    """
    if weather_df.empty:
        return {}

    seasonal_data = weather_df[weather_df['month'].isin(crop_season_months)]

    if seasonal_data.empty:
        return {}

    features = {}

    # Temperature features
    features['season_temp_max_mean'] = seasonal_data['temperature_2m_max'].mean()
    features['season_temp_min_mean'] = seasonal_data['temperature_2m_min'].mean()
    features['season_temp_range'] = (seasonal_data['temperature_2m_max'].mean() - 
                                   seasonal_data['temperature_2m_min'].mean())

    # Growing degree days
    for base_temp in [5, 10, 15]:
        features[f'season_gdd_base_{base_temp}_total'] = seasonal_data[f'gdd_base_{base_temp}'].sum()

    # Precipitation features
    features['season_precip_total'] = seasonal_data['precipitation_sum'].sum()
    features['season_precip_mean'] = seasonal_data['precipitation_sum'].mean()
    features['season_precip_std'] = seasonal_data['precipitation_sum'].std()
    features['rainy_days'] = (seasonal_data['precipitation_sum'] > 0.1).sum()
    features['heavy_rain_days'] = (seasonal_data['precipitation_sum'] > 25).sum()

    # Stress indicators
    features['heat_stress_days'] = seasonal_data['heat_stress'].sum()
    features['cold_stress_days'] = seasonal_data['cold_stress'].sum()

    # Other meteorological features
    features['season_humidity_mean'] = seasonal_data['relative_humidity_2m_mean'].mean()
    features['season_wind_mean'] = seasonal_data['wind_speed_10m_mean'].mean()
    features['season_radiation_total'] = seasonal_data['shortwave_radiation_sum'].sum()

    # Calculate anomalies compared to long-term average
    if len(weather_df) > 365:  # At least one full year of data
        long_term_seasonal = weather_df[weather_df['month'].isin(crop_season_months)]

        features['precip_anomaly'] = (features['season_precip_total'] - 
                                    long_term_seasonal['precipitation_sum'].sum() / 
                                    (len(weather_df) / 365.25))

        features['temp_anomaly'] = (features['season_temp_max_mean'] - 
                                  long_term_seasonal['temperature_2m_max'].mean())

    return features

def get_weather_forecast(lat: float, lon: float, days_ahead: int = 7) -> pd.DataFrame:
    """
    Get weather forecast data from Open-Meteo
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean",
        "forecast_days": days_ahead,
        "timezone": "auto"
    }

    try:
        response = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        df_forecast = pd.DataFrame(data['daily'])
        df_forecast['time'] = pd.to_datetime(df_forecast['time'])
        df_forecast['tmean'] = (df_forecast['temperature_2m_max'] + 
                               df_forecast['temperature_2m_min']) / 2

        return df_forecast

    except Exception as e:
        print(f"Error fetching forecast data: {e}")
        return pd.DataFrame()

# Example usage
if __name__ == "__main__":
    lat, lon = 26.85, 80.95

    # Get historical weather
    weather_df = get_historical_weather(lat, lon, "2020-01-01", "2023-12-31")
    print(f"Retrieved {len(weather_df)} days of weather data")

    if not weather_df.empty:
        # Calculate seasonal features for kharif season
        seasonal_features = calculate_seasonal_features(weather_df, [6, 7, 8, 9])
        print("Seasonal features:", seasonal_features)

        # Get forecast
        forecast_df = get_weather_forecast(lat, lon, 7)
        print(f"Retrieved {len(forecast_df)} days of forecast data")
