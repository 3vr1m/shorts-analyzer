#!/bin/bash

# Shorts Analyzer Deployment Script
echo "🚀 Deploying Shorts Analyzer..."

# Build the application
echo "📦 Building application..."
npm run build

# Create deployment directory
DEPLOY_DIR="shorts-analyzer-deploy"
echo "📁 Creating deployment package..."

# Remove old deployment directory if it exists
rm -rf $DEPLOY_DIR

# Create new deployment directory
mkdir $DEPLOY_DIR

# Copy necessary files
cp -r .next $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/
cp -r node_modules $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp next.config.ts $DEPLOY_DIR/
cp ecosystem.config.js $DEPLOY_DIR/

# Copy environment file template
echo "# Environment Variables for Production
# Copy this to .env.local and fill in your values
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_gemini_api_key_here
# Add other environment variables as needed" > $DEPLOY_DIR/.env.example

echo "✅ Deployment package created in $DEPLOY_DIR/"
echo ""
echo "📋 Next steps:"
echo "1. Upload the $DEPLOY_DIR folder to your server"
echo "2. Create .env.local file with your API keys"
echo "3. Run: npm start"
echo "4. Your app will be available at http://your-domain:3000"
echo ""
echo "🔧 Alternative: Use PM2 for process management:"
echo "   npm install -g pm2"
echo "   pm2 start ecosystem.config.js"
