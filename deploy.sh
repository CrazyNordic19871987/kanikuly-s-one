#!/bin/bash
# Deploy to GitHub Pages - Automated Script
# Usage: ./deploy.sh "Your commit message"

echo "🚀 Starting deployment to GitHub Pages..."

# Check if commit message provided
if [ -z "$1" ]; then
  COMMIT_MSG="Update Каникулы с ONE!"
else
  COMMIT_MSG="$1"
fi

# Add all files
git add .

# Commit
git commit -m "$COMMIT_MSG"

# Push to main branch
git push origin main

echo "✅ Deployed! Check GitHub Pages in 2-3 minutes:"
echo "   https://$(git config --get remote.origin.url | sed 's/.*github.com[/:]\(.*\)\.git/\1/')"
