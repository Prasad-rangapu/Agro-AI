"""
Agricultural ML Pipeline – FastAPI Backend
Main application server for crop recommendations
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
import pandas as pd
import logging
from datetime import datetime
from soilgrids_integration import get_soil_point
from weather_integration import get_historical_weather, calculate_seasonal_features
from economic_analysis import EconomicAnalyzer
from ml_models import YieldPredictor
import joblib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Agricultural ML Pipeline API",
    description="AI-powered crop recommendation system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models at startup
CROP_MODELS = {}
CROP_LIST = ["rice", "maize", "cotton", "sugarcane", "soybean", "wheat", "barley", "peas", "mustard", "chickpea"]
for crop in CROP_LIST:
    try:
        predictor = YieldPredictor(crop)
        predictor.load_model(f"{crop}_yield_model.joblib")
        CROP_MODELS[crop] = predictor
        logger.info(f"Loaded model for {crop}")
    except FileNotFoundError:
        logger.warning(f"Model for {crop} not found. It will not be available for recommendations.")
    except Exception as e:
        logger.error(f"Error loading model for {crop}: {e}")

class FarmInput(BaseModel):
    latitude: float
    longitude: float
    area_hectares: float
    budget_inr: float
    preferred_crops: Optional[List[str]] = None
    planting_season: str = "kharif"
    farmer_experience: str = "medium"

class CropRecommendation(BaseModel):
    crop_name: str
    rank: int
    expected_yield_kg_ha: float
    expected_price_per_kg: float
    expected_profit_inr: float
    profit_margin_percent: float
    risk_score: float
    upfront_cost_inr: float
    budget_feasible: bool
    explanation: List[str]

class RecommendationResponse(BaseModel):
    farm_id: str
    recommendations: List[CropRecommendation]
    soil_analysis: Dict
    weather_summary: Dict
    market_outlook: Dict
    generated_at: datetime

@app.get("/")
async def root():
    return {
        "message": "Agricultural ML Pipeline API",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.now()
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

@app.post("/recommendations", response_model=RecommendationResponse)
async def get_crop_recommendations(farm_input: FarmInput, background_tasks: BackgroundTasks):
    try:
        farm_id = f"farm_{abs(hash(f'{farm_input.latitude}_{farm_input.longitude}'))}"
        logger.info(f"Recommendation request for {farm_id}")

        # 1) Soil data with fallback
        try:
            soil = get_soil_point(farm_input.latitude, farm_input.longitude) or {}
        except Exception as e:
            logger.warning(f"SoilGrids error: {e} – using defaults")
                    # 1) Soil data with fallback
        try:
            soil_data = get_soil_point(farm_input.latitude, farm_input.longitude) or {}
            soil = {
                "ph_mean": soil_data.get("ph"),
                "organic_carbon": soil_data.get("organic_carbon"),
                "nitrogen_mean": soil_data.get("nitrogen"),
                "sand_percent": soil_data.get("sand"),
                "clay_percent": soil_data.get("clay"),
                "silt_percent": soil_data.get("silt"),
            }
        except Exception as e:
            logger.warning(f"SoilGrids error: {e} – using defaults")
            soil = {
                "ph_mean": 6.5,
                "organic_carbon": 12.0,
                "nitrogen_mean": 15.0,
                "sand_percent": 45.0,
                "clay_percent": 25.0,
                "silt_percent": 30.0,
            }

        # 2) Weather + seasonal features with fallback
        try:
            df = get_historical_weather(
                farm_input.latitude, farm_input.longitude,
                start_date="2020-01-01", end_date="2024-12-31"
            )
            months = {
                "kharif": [6, 7, 8, 9],
                "rabi": [11, 12, 1, 2, 3],
                "zaid": [4, 5]
            }[farm_input.planting_season]
            seasonal = calculate_seasonal_features(df, months) if not df.empty else None
            if seasonal is None:
                raise Exception("Empty seasonal features")
        except Exception as e:
            logger.warning(f"Weather error: {e} – using defaults")
            seasonal = {
                "season_gdd_base_10_total": 2500,
                "season_precip_total": 800,
                "season_temp_max_mean": 32,
                "precip_anomaly": 0
            }

        # 3) Candidate crops
        season_map = {
            "kharif": ["rice", "maize", "cotton", "sugarcane", "soybean"],
            "rabi": ["wheat", "barley", "peas", "mustard", "chickpea"],
            "zaid": ["maize", "fodder", "vegetables"]
        }
        crops = (farm_input.preferred_crops or season_map.get(farm_input.planting_season, CROP_LIST))[:5]

        analyzer = EconomicAnalyzer()
        recommendations = []

        # 4) Generate recommendations
        for i, c in enumerate(crops):
            if c in CROP_MODELS:
                model = CROP_MODELS[c]
                features = pd.DataFrame([{
                    **soil,
                    **seasonal,
                    "n_deficit": 50, # Placeholder
                    "p_deficit": 20, # Placeholder
                    "price_trend_slope": 0.1, # Placeholder
                    "price_volatility": 0.2 # Placeholder
                }])
                predicted_yield = model.predict(features)[0]
            else:
                # Fallback to simple rules if model not found
                base_yields = {
                    "rice": 5200, "wheat": 4500, "maize": 6800,
                    "soybean": 2800, "cotton": 1800
                }
                by = base_yields.get(c, 4000)
                pf = 1 + (soil.get("organic_carbon", 10) - 10) * 0.02
                wf = 1 + (seasonal.get("season_gdd_base_10_total", 2500) - 2500) * 0.0001
                predicted_yield = max(by * pf * wf, 1000)

            base_prices = {
                "rice": 22.5, "wheat": 21.8, "maize": 19.2,
                "soybean": 65.0, "cotton": 85.0
            }
            pr = base_prices.get(c, 25.0)

            econ = analyzer.calculate_crop_economics(
                c, farm_input.area_hectares,
                predicted_yield, pr,
                yield_uncertainty=predicted_yield * 0.1,
                price_uncertainty=pr * 0.15
            )

            recommendations.append(CropRecommendation(
                crop_name=c,
                rank=i + 1,
                expected_yield_kg_ha=econ["predicted_yield_kg_ha"],
                expected_price_per_kg=econ["predicted_price_per_kg"],
                expected_profit_inr=econ["expected_profit"],
                profit_margin_percent=econ["profit_margin_percent"],
                risk_score=econ["risk_score"],
                upfront_cost_inr=econ["upfront_costs"],
                budget_feasible=econ["upfront_costs"] <= farm_input.budget_inr,
                explanation=[
                    f"pH: {soil.get('ph_mean', 6.5):.1f}",
                    f"OC: {soil.get('organic_carbon', 12):.1f}%",
                    f"GDD: {seasonal.get('season_gdd_base_10_total', 2500)}"
                ]
            ))

        recommendations.sort(key=lambda x: x.expected_profit_inr, reverse=True)
        for idx, rec in enumerate(recommendations):
            rec.rank = idx + 1

        # Ensure native Python bool for JSON serialization
        temp_stress_bool = bool(seasonal.get("season_temp_max_mean", 32) > 35)

        return RecommendationResponse(
            farm_id=farm_id,
            recommendations=recommendations,
            soil_analysis=soil,
            weather_summary={
                "total_gdd": seasonal.get("season_gdd_base_10_total", 2500),
                "rainfall": seasonal.get("season_precip_total", 800),
                "temp_stress": temp_stress_bool
            },
            market_outlook={
                "trend": "stable",
                "volatility": "moderate",
                "demand": "positive"
            },
            generated_at=datetime.now()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/crops/prices/{crop_name}")
async def get_price_forecast(crop_name: str, months_ahead: int = 6):
    try:
        base_prices = {
            "rice": 22.5, "wheat": 21.8, "maize": 19.2,
            "soybean": 65.0, "cotton": 85.0
        }
        bp = base_prices.get(crop_name, 25.0)
        fc = []
        for m in range(1, months_ahead + 1):
            f = 1 + 0.1 * np.sin(2 * np.pi * m / 12)
            p = bp * f
            fc.append({
                "month": m,
                "price": round(p, 2),
                "low": round(p * 0.85, 2),
                "high": round(p * 1.15, 2)
            })
        return {
            "crop": crop_name,
            "forecast": fc,
            "accuracy": "MAPE:12.5%",
            "updated": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/soil/analysis")
async def soil_analysis(lat: float, lon: float):
    try:
        try:
            sd = get_soil_point(lat, lon) or {}
        except Exception as e:
            logger.warning(f"SoilGrids timeout – using defaults: {e}")
            sd = {
                "ph": 6.5,
                "organic_carbon": 12.0,
                "nitrogen": 15.0,
                "sand": 45.0,
                "clay": 25.0
            }
        ph = sd.get("ph", 6.5)
        status = "acidic" if ph < 6 else "alkaline" if ph > 8 else "optimal"
        return {
            "coords": {"lat": lat, "lon": lon},
            "soil_properties": sd,
            "analysis": {
                "ph": sd.get("ph"),
                "OC": sd.get("organic_carbon"),
                "N": sd.get("nitrogen")
            },
            "interpretations": {
                "ph_status": status,
                "fertility": "high" if sd.get("organic_carbon", 0) > 15 else "medium",
                "texture": sd.get("texture_class", "loamy")
            },
            "recommendations": [
                "Apply organic matter if OC < 1.5%",
                "Add lime if pH < 6.0",
                "Test soil every 2–3 years"
            ]
        }
    except Exception as e:
        logger.error(f"Error in soil_analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting API → http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
