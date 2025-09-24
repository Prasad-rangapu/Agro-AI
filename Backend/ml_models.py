
"""
Machine Learning Models for Agricultural Prediction
Includes XGBoost for yield prediction and Prophet for price forecasting
"""

import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from prophet import Prophet
import joblib
import shap
import warnings
warnings.filterwarnings('ignore')

class YieldPredictor:
    """XGBoost-based crop yield predictor with spatial cross-validation"""

    def __init__(self, crop_name: str):
        self.crop_name = crop_name
        self.model = None
        self.feature_cols = None
        self.scaler = None
        self.is_trained = False

    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare and clean features for training"""
        feature_cols = [
            'nitrogen_mean', 'ph_mean', 'organic_carbon', 
            'sand_percent', 'clay_percent',
            'season_gdd_base_10_total', 'season_precip_total', 
            'season_temp_max_mean', 'precip_anomaly',
            'n_deficit', 'p_deficit', 'price_trend_slope', 
            'price_volatility'
        ]

        # Use only available columns
        available_cols = [col for col in feature_cols if col in df.columns]

        if not available_cols:
            raise ValueError("No suitable features found in dataset")

        self.feature_cols = available_cols
        return df[available_cols].fillna(df[available_cols].median())

    def train(self, df: pd.DataFrame, target_col: str = 'yield_kg_ha', 
              group_col: str = 'district', n_splits: int = 5):
        """Train XGBoost model with spatial cross-validation"""

        crop_df = df[df['crop'] == self.crop_name].copy().dropna()

        if len(crop_df) < 50:
            raise ValueError(f"Insufficient data for {self.crop_name}: {len(crop_df)} samples")

        X = self.prepare_features(crop_df)
        y = crop_df[target_col]

        if group_col in crop_df.columns:
            groups = crop_df[group_col]
        else:
            # Create pseudo-groups if no district info
            groups = np.random.randint(0, max(5, len(crop_df)//10), len(crop_df))

        # Initialize model with agricultural-appropriate hyperparameters
        self.model = XGBRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=6,
            min_child_weight=3,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        )

        # Spatial cross-validation
        gkf = GroupKFold(n_splits=n_splits)
        cv_scores = []

        for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups)):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

            fold_model = XGBRegressor(
                n_estimators=200, learning_rate=0.05, max_depth=6,
                min_child_weight=3, subsample=0.8, colsample_bytree=0.8,
                random_state=42, n_jobs=-1
            )

            fold_model.fit(X_train, y_train)
            y_pred = fold_model.predict(X_val)

            mae = mean_absolute_error(y_val, y_pred)
            rmse = np.sqrt(mean_squared_error(y_val, y_pred))
            r2 = r2_score(y_val, y_pred)

            cv_scores.append({'fold': fold, 'mae': mae, 'rmse': rmse, 'r2': r2})

        # Train final model on all data
        self.model.fit(X, y)
        self.is_trained = True

        # Calculate average performance
        avg_scores = {
            'mae_mean': np.mean([s['mae'] for s in cv_scores]),
            'rmse_mean': np.mean([s['rmse'] for s in cv_scores]),
            'r2_mean': np.mean([s['r2'] for s in cv_scores])
        }

        return avg_scores

    def predict(self, features: pd.DataFrame):
        """Make yield predictions"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")

        X = features[self.feature_cols].fillna(features[self.feature_cols].median())
        return self.model.predict(X)

    def get_feature_importance(self, features: pd.DataFrame):
        """Get SHAP feature importance"""
        if not self.is_trained:
            raise ValueError("Model must be trained before getting importance")

        explainer = shap.TreeExplainer(self.model)
        X = features[self.feature_cols].fillna(features[self.feature_cols].median())
        shap_values = explainer.shap_values(X)

        importance_df = pd.DataFrame({
            'feature': self.feature_cols,
            'importance': np.abs(shap_values).mean(0) if len(shap_values.shape) > 1 else np.abs(shap_values)
        }).sort_values('importance', ascending=False)

        return importance_df

    def save_model(self, filepath: str):
        """Save trained model"""
        if not self.is_trained:
            raise ValueError("No trained model to save")

        model_data = {
            'model': self.model,
            'feature_cols': self.feature_cols,
            'crop_name': self.crop_name
        }
        joblib.dump(model_data, filepath)

    def load_model(self, filepath: str):
        """Load trained model"""
        model_data = joblib.load(filepath)
        self.model = model_data['model']
        self.feature_cols = model_data['feature_cols']
        self.crop_name = model_data['crop_name']
        self.is_trained = True

class PriceForecaster:
    """Prophet-based agricultural price forecaster"""

    def __init__(self, commodity_name: str):
        self.commodity_name = commodity_name
        self.model = None
        self.is_trained = False

    def prepare_data(self, price_df: pd.DataFrame, 
                    date_col: str = 'date', price_col: str = 'price') -> pd.DataFrame:
        """Prepare price data for Prophet"""
        prophet_df = price_df[[date_col, price_col]].copy()
        prophet_df = prophet_df.rename(columns={date_col: 'ds', price_col: 'y'})
        prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
        prophet_df = prophet_df.dropna().sort_values('ds')

        # Remove outliers (prices beyond 3 standard deviations)
        q1, q3 = prophet_df['y'].quantile([0.25, 0.75])
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        prophet_df = prophet_df[(prophet_df['y'] >= lower_bound) & (prophet_df['y'] <= upper_bound)]

        return prophet_df

    def train(self, prophet_df: pd.DataFrame):
        """Train Prophet model for price forecasting"""

        if len(prophet_df) < 100:
            raise ValueError(f"Insufficient data: {len(prophet_df)} points. Need at least 100.")

        # Configure Prophet for agricultural prices
        self.model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.5,
            seasonality_prior_scale=10,
            interval_width=0.8
        )

        # Add custom seasonalities
        self.model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        self.model.add_seasonality(name='quarterly', period=91.25, fourier_order=3)

        # Fit model
        self.model.fit(prophet_df)
        self.is_trained = True

        # Calculate performance metrics
        forecast = self.model.predict(prophet_df[['ds']])
        mae = mean_absolute_error(prophet_df['y'], forecast['yhat'])
        mape = np.mean(np.abs((prophet_df['y'] - forecast['yhat']) / prophet_df['y'])) * 100

        return {'mae': mae, 'mape': mape}

    def forecast(self, months_ahead: int = 6):
        """Generate price forecast"""
        if not self.is_trained:
            raise ValueError("Model must be trained before forecasting")

        future = self.model.make_future_dataframe(periods=months_ahead * 30, freq='D')
        forecast = self.model.predict(future)

        return forecast

    def get_harvest_price(self, harvest_date: str):
        """Get price forecast for specific harvest date"""
        if not self.is_trained:
            raise ValueError("Model must be trained before forecasting")

        harvest_dt = pd.to_datetime(harvest_date)
        future = pd.DataFrame({'ds': [harvest_dt]})
        forecast = self.model.predict(future)

        return {
            'date': harvest_date,
            'predicted_price': forecast['yhat'].iloc[0],
            'lower_bound': forecast['yhat_lower'].iloc[0],
            'upper_bound': forecast['yhat_upper'].iloc[0]
        }

# Example usage and training pipeline
def train_crop_models(data_file: str):
    """Train models for all crops in dataset"""
    df = pd.read_csv(data_file)

    trained_models = {}

    for crop in df['crop'].unique():
        print(f"Training model for {crop}...")

        try:
            predictor = YieldPredictor(crop)
            scores = predictor.train(df)

            print(f"  {crop} - R²: {scores['r2_mean']:.3f}, MAE: {scores['mae_mean']:.1f}")

            # Save model
            predictor.save_model(f"{crop}_yield_model.joblib")
            trained_models[crop] = predictor

        except Exception as e:
            print(f"  Failed to train {crop} model: {e}")

    return trained_models

if __name__ == "__main__":
    # Example training
    print("Training agricultural ML models...")
    models = train_crop_models('sample_agricultural_data.csv')
    print("Model training complete!")
