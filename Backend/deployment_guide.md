# Agricultural ML Pipeline - Deployment Guide

## Quick Start Instructions

### Backend Deployment (FastAPI)

1. **Local Development:**
   ```bash
   pip install -r requirements.txt
   python fastapi_main.py
   # API will be available at http://localhost:8000
   ```

2. **Production Deployment Options:**

   **Option A: Railway (Recommended for beginners)**
   - Sign up at railway.app
   - Connect your GitHub repo
   - Railway will auto-detect Python app
   - Set environment variables if needed
   - Deploy with one click

   **Option B: Render**
   - Sign up at render.com
   - Create new Web Service
   - Connect repo and set:
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `python fastapi_main.py`

   **Option C: DigitalOcean App Platform**
   - Create droplet with Python runtime
   - Configure gunicorn for production
   - Set up reverse proxy with nginx

### Frontend Deployment (Expo)

1. **Development Testing:**
   ```bash
   npm install -g @expo/cli
   npx create-expo-app AgriculturalApp
   cd AgriculturalApp
   # Copy the provided App.js and components
   npx expo start
   ```

2. **Production Build:**
   ```bash
   # Install EAS CLI
   npm install -g @expo/cli

   # Configure EAS
   eas build:configure

   # Build for Android
   eas build --platform android

   # Build for iOS (requires Apple Developer account)
   eas build --platform ios
   ```

### Environment Configuration

**Backend (.env file):**
```
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=*
LOG_LEVEL=INFO
MODEL_PATH=./models/
DATA_CACHE_TTL=3600
```

**Frontend (expo app config):**
```javascript
// app.config.js
export default {
  expo: {
    name: "Smart Crop Advisor",
    slug: "agricultural-advisor",
    version: "1.0.0",
    platforms: ["ios", "android"],
    permissions: ["LOCATION"],
    // Add your backend API URL here
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000"
    }
  }
};
```

### Testing the Integration

1. Start backend server
2. Update API_BASE_URL in Expo app
3. Test with device/simulator
4. Verify location permissions work
5. Test offline functionality

### Monitoring & Maintenance

- Set up error tracking (Sentry)
- Monitor API response times
- Regular model retraining schedule
- Update agricultural data sources quarterly

### Support & Troubleshooting

Common issues:
- CORS errors: Configure FastAPI CORS middleware
- Location permissions: Handle permissions gracefully
- Network timeouts: Implement retry logic
- Model loading: Verify model file paths

Contact: Check the GitHub repository for issues and updates
