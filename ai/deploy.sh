#!/bin/bash

# RoamWise Personal AI - Google Cloud Deployment Script
# This deploys your personal travel intelligence system

set -e  # Exit on any error

echo "🚀 Deploying RoamWise Personal AI to Google Cloud..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "🔐 Please authenticate with Google Cloud..."
    gcloud auth login
fi

# Set project (you can modify this or pass as parameter)
PROJECT_ID=${1:-$(gcloud config get-value project)}
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project ID specified. Please set your project:"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Using project: $PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable \
    appengine.googleapis.com \
    firestore.googleapis.com \
    aiplatform.googleapis.com \
    maps-backend.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com \
    --project=$PROJECT_ID

# Initialize App Engine (if not already done)
echo "🏗️ Initializing App Engine..."
if ! gcloud app describe --project=$PROJECT_ID &> /dev/null; then
    echo "Creating App Engine application..."
    gcloud app create --region=us-central --project=$PROJECT_ID
fi

# Initialize Firestore (if not already done)
echo "🗄️ Setting up Firestore..."
if ! gcloud firestore databases describe --database="(default)" --project=$PROJECT_ID &> /dev/null; then
    echo "Creating Firestore database..."
    gcloud firestore databases create --database="(default)" --location=nam5 --project=$PROJECT_ID
fi

# Create environment file for deployment
echo "⚙️ Setting up environment variables..."
cat > .env << EOF
NODE_ENV=production
PORT=8080
GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
OPENWEATHER_API_KEY=your_weather_key_here
EOF

echo "📝 Please update the .env file with your API keys:"
echo "   - OpenAI API Key (for AI conversations)"
echo "   - Google Maps API Key (for place data)"
echo "   - OpenWeather API Key (for weather intelligence)"
echo ""
echo "Press Enter when you've updated the API keys..."
read -r

# Deploy to App Engine
echo "🚀 Deploying to App Engine..."
gcloud app deploy app.yaml --project=$PROJECT_ID --quiet

# Get the deployed URL
APP_URL="https://$PROJECT_ID.uc.r.appspot.com"

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🧠 Your Personal Travel AI is now live at:"
echo "   $APP_URL"
echo ""
echo "🔗 API Endpoints:"
echo "   🤖 Chat: $APP_URL/api/ai/chat"
echo "   🎯 Recommendations: $APP_URL/api/ai/recommend" 
echo "   🧠 Memory: $APP_URL/api/memory/insights"
echo "   📊 Preferences: $APP_URL/api/preferences/profile"
echo "   🔍 Intelligence: $APP_URL/api/intelligence/search"
echo ""
echo "📱 Frontend Integration:"
echo "   Update your frontend to use: $APP_URL"
echo ""
echo "🔧 Next Steps:"
echo "   1. Test your Personal AI: curl $APP_URL/health"
echo "   2. Update frontend API endpoints"
echo "   3. Start using your intelligent travel companion!"
echo ""
echo "🎉 Your world-class travel AI is ready to learn and assist!"

# Optional: Open the app in browser
if command -v open &> /dev/null; then
    echo "Opening your Personal AI in browser..."
    open "$APP_URL"
elif command -v xdg-open &> /dev/null; then
    echo "Opening your Personal AI in browser..."
    xdg-open "$APP_URL"
fi