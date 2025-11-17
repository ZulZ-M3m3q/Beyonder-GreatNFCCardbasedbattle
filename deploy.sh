#!/bin/bash

if [ -z "$VERCEL_TOKEN" ]; then
  echo "Error: VERCEL_TOKEN is not set"
  exit 1
fi

echo "Installing Vercel CLI..."
npm install -g vercel

echo "Deploying to Vercel..."
vercel --token "$VERCEL_TOKEN" --prod --yes

echo "Deployment complete!"
