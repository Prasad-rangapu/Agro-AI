const SOILGRIDS_API_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/archive';

class DataSetService {
  parseSoilGridsData(soilResponse, targetDepth = '0-5cm') {
    const properties = ['cec', 'cfvo', 'clay', 'nitrogen', 'phh2o', 'sand', 'silt', 'soc'];
    const soilFeatures = {};
    
    if (!soilResponse.properties?.layers) {
      console.warn('Invalid SoilGrids response structure');
      return soilFeatures;
    }

    properties.forEach(prop => {
      const layer = soilResponse.properties.layers.find(l => l.name === prop);
      if (layer && layer.depths?.length > 0) {
        const depth = layer.depths[0];
        if (depth.values?.mean !== undefined) {
          soilFeatures[prop] = depth.values.mean;
          soilFeatures[`${prop}_unit`] = layer.unit_measure?.mapped_units || '';
        }
      }
    });
    
    return soilFeatures;
  }

  /**
   * Get last 6 months date range
   */
  getLast6MonthsDateRange() {
    const endDate = new Date();
    endDate.setDate(1); // First day of current month
    
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 6);
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Fetch soil data from SoilGrids API
   */
  async getSoilData(lat, lon) {
    try {
      const properties = ['cec', 'cfvo', 'clay', 'nitrogen', 'phh2o', 'sand', 'silt', 'soc'];
      const depth = '0-5cm';
      const value = 'mean';
      
      const propertyParams = properties.map(p => `property=${p}`).join('&');
      const url = `${SOILGRIDS_API_URL}?lon=${lon}&lat=${lat}&${propertyParams}&depth=${depth}&value=${value}`;
      
      console.log(`Fetching soil data for lat: ${lat}, lon: ${lon}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`SoilGrids API request failed: ${response.status} ${response.statusText}`);
      }
      
      const soilResponse = await response.json();
      const parsedData = this.parseSoilGridsData(soilResponse);
      
      return {
        ...parsedData,
        lat: lat,
        lon: lon
      };
      
    } catch (error) {
      console.error("Error fetching soil data:", error);
      throw error;
    }
  }

  /**
   * Fetch 6 months historical weather data from Open-Meteo
   */
  async getWeatherData(lat, lon) {
    try {
      console.log(`Fetching weather data for lat: ${lat}, lon: ${lon}`);
      
      const { start_date, end_date } = this.getLast6MonthsDateRange();
      
      const url = `${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&start_date=${start_date}&end_date=${end_date}&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,humidity_mean&timezone=auto`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Weather API request failed: ${response.status} ${response.statusText}`);
      }
      
      const weatherData = await response.json();
      
      // Calculate 6-month aggregated features for ML
      const features = this.calculateWeatherFeatures(weatherData.daily);
      
      return {
        ...features,
        lat: lat,
        lon: lon,
        period_start: start_date,
        period_end: end_date
      };
      
    } catch (error) {
      console.error("Error fetching weather data:", error);
      throw error;
    }
  }

  /**
   * Calculate aggregated weather features for ML model
   */
  calculateWeatherFeatures(dailyData) {
    if (!dailyData || !dailyData.time) {
      return this.getFallbackWeatherFeatures();
    }

    const temps = dailyData.temperature_2m_mean?.filter(t => t !== null) || [];
    const maxTemps = dailyData.temperature_2m_max?.filter(t => t !== null) || [];
    const minTemps = dailyData.temperature_2m_min?.filter(t => t !== null) || [];
    const precip = dailyData.precipitation_sum?.filter(p => p !== null) || [];
    const humidity = dailyData.humidity_mean?.filter(h => h !== null) || [];

    return {
      // Temperature features
      avg_temperature: temps.length > 0 ? parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2)) : null,
      max_temperature: maxTemps.length > 0 ? Math.max(...maxTemps) : null,
      min_temperature: minTemps.length > 0 ? Math.min(...minTemps) : null,
      temperature_range: maxTemps.length > 0 && minTemps.length > 0 ? 
        parseFloat((Math.max(...maxTemps) - Math.min(...minTemps)).toFixed(2)) : null,
      
      // Precipitation features
      total_rainfall: precip.length > 0 ? parseFloat(precip.reduce((a, b) => a + b, 0).toFixed(2)) : null,
      avg_daily_rainfall: precip.length > 0 ? parseFloat((precip.reduce((a, b) => a + b, 0) / precip.length).toFixed(2)) : null,
      rainy_days: precip.filter(p => p > 0.1).length,
      max_daily_rainfall: precip.length > 0 ? Math.max(...precip) : null,
      
      // Humidity features
      avg_humidity: humidity.length > 0 ? parseFloat((humidity.reduce((a, b) => a + b, 0) / humidity.length).toFixed(2)) : null,
      max_humidity: humidity.length > 0 ? Math.max(...humidity) : null,
      min_humidity: humidity.length > 0 ? Math.min(...humidity) : null,
      
      // Derived features
      days_analyzed: dailyData.time?.length || 0
    };
  }

  /**
   * Fallback weather features if API fails
   */
  getFallbackWeatherFeatures() {
    return {
      avg_temperature: 26.5,
      max_temperature: 35.0,
      min_temperature: 18.0,
      temperature_range: 17.0,
      total_rainfall: 650.0,
      avg_daily_rainfall: 3.6,
      rainy_days: 45,
      max_daily_rainfall: 25.0,
      avg_humidity: 68.0,
      max_humidity: 85.0,
      min_humidity: 45.0,
      days_analyzed: 180,
      fallback: true
    };
  }

  /**
   * Get current season based on month
   */
  getCurrentSeason() {
    const month = new Date().getMonth() + 1; // 1-12
    
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';  
    if (month >= 9 && month <= 11) return 'monsoon';
    return 'winter';
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat, lon) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid coordinates: lat and lon must be numbers');
    }
    
    if (latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude: must be between -90 and 90');
    }
    
    if (longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude: must be between -180 and 180');
    }
    
    return { lat: latitude, lon: longitude };
  }

  /**
   * Main function to fetch all data for ML model
   * @param {number} acres - Number of acres from user form
   * @param {number} lat - Latitude  
   * @param {number} lon - Longitude
   * @returns {Promise<object>} Complete dataset for ML recommendation
   */
  async fetchDataForML(acres, lat, lon) {
    try {
      // Validate inputs
      const coords = this.validateCoordinates(lat, lon);
      const acreage = parseFloat(acres);
      
      if (isNaN(acreage) || acreage <= 0) {
        throw new Error('Invalid acres: must be a positive number');
      }

      console.log(`Fetching ML data for ${acreage} acres at ${coords.lat}, ${coords.lon}`);
      
      // Fetch soil and weather data in parallel
      const [soilData, weatherData] = await Promise.all([
        this.getSoilData(coords.lat, coords.lon),
        this.getWeatherData(coords.lat, coords.lon)
      ]);

      // Prepare ML-ready dataset
      const mlDataset = {
        // Basic info
        acres: acreage,
        season: this.getCurrentSeason(),
        
        // Soil features (NPK + pH + texture)
        nitrogen: soilData.nitrogen,
        phosphorus: soilData.soc, // Using SOC as P proxy
        potassium: soilData.cec,  // Using CEC as K proxy
        ph: soilData.phh2o,
        clay: soilData.clay,
        sand: soilData.sand,
        silt: soilData.silt,
        
        // Weather features (6 months)
        temperature: weatherData.avg_temperature,
        max_temperature: weatherData.max_temperature,
        min_temperature: weatherData.min_temperature,
        rainfall: weatherData.total_rainfall,
        humidity: weatherData.avg_humidity,
        rainy_days: weatherData.rainy_days,
        
        // Location
        latitude: coords.lat,
        longitude: coords.lon,
        
        // Metadata
        data_timestamp: new Date().toISOString(),
        weather_period: `${weatherData.period_start} to ${weatherData.period_end}`,
        fallback_weather: weatherData.fallback || false
      };

      console.log("ML dataset prepared successfully");
      return mlDataset;
      
    } catch (error) {
      console.error("Error fetching ML data:", error);
      throw error;
    }
  }

  /**
   * Get sample of expected data structure for ML model
   */
  getSampleDataStructure() {
    return {
      acres: "number - farm size",
      season: "string - current season (spring/summer/monsoon/winter)",
      nitrogen: "number - soil nitrogen content (g/kg)",
      phosphorus: "number - soil phosphorus proxy (SOC g/kg)", 
      potassium: "number - soil potassium proxy (CEC cmol/kg)",
      ph: "number - soil pH in water",
      clay: "number - clay content (%)",
      sand: "number - sand content (%)", 
      silt: "number - silt content (%)",
      temperature: "number - avg temperature (°C)",
      max_temperature: "number - max temperature (°C)",
      min_temperature: "number - min temperature (°C)",
      rainfall: "number - total rainfall (mm)",
      humidity: "number - avg humidity (%)",
      rainy_days: "number - count of rainy days",
      latitude: "number - location latitude",
      longitude: "number - location longitude"
    };
  }
}

export default new DataSetService();
