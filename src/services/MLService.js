class MLService {
  constructor() {
    this.isInitialized = false;
    this.cropDatabase = this.initializeCropDatabase();
    this.diseaseDatabase = this.initializeDiseaseDatabase();
  }

  async initialize() {

    try {
      this.isInitialized = true;
      console.log('ML Service initialized successfully');
    } catch (error) {
      console.error('ML Service initialization error:', error);
      throw error;
    }
  }

  // Crop Recommendation System
  async recommendCrops(farmData) {
    try {
      const features = this.extractFeaturesForCropRecommendation(farmData);

      const recommendations = await this.getRuleBasedCropRecommendations(features);

      return {
        recommendations,
        confidence: 0.85,
        factors: ['Soil type', 'Climate', 'Season', 'Market demand'],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Crop recommendation error:', error);
      throw error;
    }
  }

  extractFeaturesForCropRecommendation(farmData) {

    return {
      soilType: farmData.soilType || 'Loam',
      area: farmData.farmArea || 1,
      season: farmData.season || 'kharif',
      temperature: farmData.weatherData?.temperature || 25,
      rainfall: farmData.weatherData?.rainfall || 800,
      budget: farmData.budget || 50000,
    };
  }

  async getRuleBasedCropRecommendations(features) {

    const crops = this.cropDatabase;
    const recommendations = [];

    for (const crop of crops) {
      const suitability = this.calculateCropSuitability(crop, features);

      if (suitability.score > 0.6) {
        recommendations.push({
          crop: crop.name,
          variety: crop.recommendedVariety,
          suitabilityScore: suitability.score,
          expectedYield: `${crop.averageYield} ${crop.yieldUnit}`,
          profitMargin: this.calculateProfitMargin(crop, features),
          plantingTime: crop.plantingTime,
          harvestTime: crop.harvestTime,
          reasons: suitability.reasons,
          risks: crop.risks,
          tips: crop.tips
        });
      }
    }

    return recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore).slice(0, 5);
  }

  calculateCropSuitability(crop, features) {
    let score = 0;
    const reasons = [];

    // Soil suitability
    if (crop.suitableSoils.includes(features.soilType)) {
      score += 0.3;
      reasons.push(`Suitable for ${features.soilType} soil`);
    }

    // Season suitability
    if (crop.seasons.includes(features.season)) {
      score += 0.3;
      reasons.push(`Good for ${features.season} season`);
    }

    // Climate suitability
    if (features.temperature >= crop.tempRange[0] && features.temperature <= crop.tempRange[1]) {
      score += 0.2;
      reasons.push('Suitable temperature range');
    }

    // Area suitability
    if (features.area >= crop.minArea) {
      score += 0.2;
      reasons.push('Adequate farm area');
    }

    return { score: Math.min(score, 1), reasons };
  }

  calculateProfitMargin(crop, features) {
    const baseMargin = crop.avgProfitMargin;
    const areaFactor = Math.min(features.area / crop.optimalArea, 1.2);
    const budgetFactor = Math.min(features.budget / crop.avgCost, 1.1);

    return Math.round(baseMargin * areaFactor * budgetFactor);
  }

  initializeCropDatabase() {
    return [

      {
        name: 'Rice',
        recommendedVariety: 'Basmati',
        seasons: ['kharif'],
        suitableSoils: ['Clay', 'Loam', 'Clay Loam'],
        tempRange: [20, 35],
        minArea: 0.5,
        optimalArea: 2,
        averageYield: 4000,
        yieldUnit: 'kg/ha',
        avgProfitMargin: 35,
        avgCost: 40000,
        plantingTime: 'June-July',
        harvestTime: 'October-November',
        risks: ['Blast disease', 'Brown plant hopper'],
        tips: ['Maintain water level', 'Use certified seeds']
      },
      {
        name: 'Wheat',
        recommendedVariety: 'HD-2967',
        seasons: ['rabi'],
        suitableSoils: ['Loam', 'Clay Loam', 'Sandy Loam'],
        tempRange: [15, 25],
        minArea: 1,
        optimalArea: 3,
        averageYield: 3500,
        yieldUnit: 'kg/ha',
        avgProfitMargin: 30,
        avgCost: 35000,
        plantingTime: 'November-December',
        harvestTime: 'April-May',
        risks: ['Rust diseases', 'Aphids'],
        tips: ['Timely sowing', 'Proper seed rate']
      },
      {
        name: 'Tomato',
        recommendedVariety: 'Pusa Ruby',
        seasons: ['rabi', 'summer'],
        suitableSoils: ['Loam', 'Sandy Loam'],
        tempRange: [18, 29],
        minArea: 0.25,
        optimalArea: 1,
        averageYield: 25000,
        yieldUnit: 'kg/ha',
        avgProfitMargin: 45,
        avgCost: 50000,
        plantingTime: 'October-November',
        harvestTime: 'January-March',
        risks: ['Late blight', 'Fruit borer'],
        tips: ['Drip irrigation', 'Regular pruning']
      },
      {
        name: 'Cotton',
        recommendedVariety: 'Bt Cotton',
        seasons: ['kharif'],
        suitableSoils: ['Clay', 'Clay Loam', 'Sandy Loam'],
        tempRange: [21, 30],
        minArea: 2,
        optimalArea: 5,
        averageYield: 1500,
        yieldUnit: 'kg/ha',
        avgProfitMargin: 40,
        avgCost: 45000,
        plantingTime: 'May-June',
        harvestTime: 'October-January',
        risks: ['Bollworm', 'Whitefly'],
        tips: ['Balanced fertilization', 'IPM practices']
      }
    ];
  }

  initializeDiseaseDatabase() {
    return [

      {
        name: 'Leaf Spot',
        description: 'Fungal disease causing circular spots on leaves',
        treatments: ['Copper-based fungicide', 'Remove affected leaves'],
        severity: 'Medium'
      },
      {
        name: 'Powdery Mildew',
        description: 'White powdery growth on leaf surfaces',
        treatments: ['Sulfur spray', 'Improve air circulation'],
        severity: 'Low'
      },
      {
        name: 'Bacterial Blight',
        description: 'Water-soaked lesions with yellow halos',
        treatments: ['Copper bactericide', 'Remove affected parts'],
        severity: 'High'
      }
    ];
  }
}

export default new MLService();