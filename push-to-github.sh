#!/bin/bash

echo "🚀 Pushing your latest changes to GitHub..."
echo ""

# Remove git lock file if it exists
rm -f .git/index.lock

# Add all changes
git add -A

# Commit changes
git commit -m "Update game with roulette battle system and latest features"

# Push to GitHub
git push origin main

echo ""
echo "✅ Done! Your changes are now on GitHub."
echo "🌐 Vercel will automatically deploy your updates in ~1 minute."
echo ""
echo "Check your Vercel dashboard to see the deployment progress!"
