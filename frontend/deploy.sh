#!/bin/bash

# GitHub deployment script for RoamWise
echo "🚀 Deploying RoamWise to GitHub Pages..."

# Check if gh CLI is authenticated
if ! gh auth status &>/dev/null; then
    echo "⚠️  GitHub CLI not authenticated. Please run:"
    echo "gh auth login"
    echo "Then run this script again."
    exit 1
fi

# Create the repository
echo "📁 Creating GitHub repository..."
gh repo create roamwise-app --public --description "RoamWise - Travel & Local Discovery PWA with Weather Integration" --homepage "https://galsened.github.io/roamwise-app"

# Check if remote already exists
if git remote get-url origin &>/dev/null; then
    echo "🔗 Remote 'origin' already exists, removing..."
    git remote remove origin
fi

# Add remote and push
echo "⬆️  Pushing code to GitHub..."
git remote add origin https://github.com/galsened/roamwise-app.git
git push -u origin main

# Enable GitHub Pages
echo "🌐 Enabling GitHub Pages..."
gh api repos/galsened/roamwise-app --method PATCH \
  --field "pages[source][branch]=main" \
  --field "pages[source][path]=/"

echo "✅ Deployment complete!"
echo ""
echo "🎉 Your RoamWise app will be live at:"
echo "   https://galsened.github.io/roamwise-app/"
echo ""
echo "⏱️  GitHub Pages deployment usually takes 1-2 minutes."
echo "🔄 You can check deployment status at:"
echo "   https://github.com/galsened/roamwise-app/deployments"