#!/bin/bash
# ─────────────────────────────────────────────────
# deploy.sh — One-command deploy for Team Collaborator
# Run this in Google Cloud Shell
# ─────────────────────────────────────────────────

set -e

PROJECT_ID="pw-chennai"
REGION="us-central1"
SERVICE_NAME="team-collaborator"

echo "=== Running Automated Tests ==="
npm install
npm test
# npm run test:e2e # Optional: uncomment if browser dependencies are installed in CI

echo "=== Setting project ==="
# Sample credentials to store in Secret Manager
SAMPLE_USERNAME="admin"
SAMPLE_PASSWORD="KekronMekron@2026"

# Get Gemini Key from environment or prompt
if [ -z "$GEMINI_API_KEY" ]; then
  read -p "Enter your Gemini API Key: " GEMINI_API_KEY
fi

echo "=== Setting project ==="
gcloud config set project $PROJECT_ID

echo "=== Enabling required APIs ==="
gcloud services enable \
  secretmanager.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  --quiet

echo "=== Creating secrets in Secret Manager ==="
# Create username secret (ignore error if already exists)
echo -n "$SAMPLE_USERNAME" | gcloud secrets create app-username \
  --data-file=- --replication-policy=automatic 2>/dev/null || \
echo -n "$SAMPLE_USERNAME" | gcloud secrets versions add app-username --data-file=-

# Create password secret (ignore error if already exists)
echo -n "$SAMPLE_PASSWORD" | gcloud secrets create app-password \
  --data-file=- --replication-policy=automatic 2>/dev/null || \
echo -n "$SAMPLE_PASSWORD" | gcloud secrets versions add app-password --data-file=-

# Create Gemini key secret (ignore error if already exists)
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- --replication-policy=automatic 2>/dev/null || \
echo -n "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

echo "=== Deploying to Cloud Run ==="
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="GCP_PROJECT=$PROJECT_ID,NODE_ENV=production" \
  --quiet

echo "=== Granting Secret Manager access to Cloud Run service account ==="
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Sample login credentials:"
echo "  Username: $SAMPLE_USERNAME"
echo "  Password: $SAMPLE_PASSWORD"
echo ""
gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"
