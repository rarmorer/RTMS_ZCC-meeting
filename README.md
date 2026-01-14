# Zoom Contact Center RTMS App

A Zoom Contact Center application that captures real-time media streams (RTMS) with manual start/stop control. This app allows agents to record audio from contact center engagements on demand.

## Overview

This application provides manual RTMS control for Zoom Contact Center engagements, enabling agents to:
- Start and stop audio capture during active engagements
- Capture high-quality audio (L16 codec, 16kHz, mono)
- Save captured audio as WAV files for processing

## Architecture

The application consists of three main services:

### 1. Frontend (React App)
- **Port:** 3000
- **Purpose:** Zoom Apps SDK interface that runs inside Zoom Contact Center
- **Key Features:**
  - Detects when engagement starts
  - Provides manual Start/Stop RTMS buttons
  - Shows real-time capture status
  - Displays engagement context and metadata

### 2. Backend API Server (Express)
- **Port:** 3001
- **Purpose:** Handles API requests, webhooks, and proxies to frontend
- **Key Features:**
  - Receives Zoom webhooks (RTMS started/stopped events)
  - Forwards RTMS events to the RTMS server
  - Handles RTMS control API (start/stop actions)
  - Validates webhook signatures
  - Prevents duplicate webhook processing
  - Serves as single entry point for ngrok

### 3. RTMS Server (Node.js WebSocket)
- **Port:** 8080
- **Purpose:** Manages real-time media stream connections
- **Key Features:**
  - Connects to Zoom's RTMS signaling WebSocket
  - Connects to Zoom's media WebSocket for audio
  - Receives and saves audio chunks as WAV files
  - Handles engagement lifecycle (start/stop/cleanup)

## Prerequisites

Before setting up the application, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** (v9 or higher)
3. **Docker & Docker Compose** (for containerized deployment)
4. **ngrok** (for exposing local server to Zoom)
5. **Zoom Contact Center** account with agent access
6. **Zoom Marketplace** developer account

## Zoom Marketplace Setup

### Step 1: Create a Contact Center App

1. Go to [Zoom Marketplace](https://marketplace.zoom.us)
2. Click "Develop" → "Build App"
3. Select "General app"
4. Fill in basic information:
   - **App Name:** Your app name (e.g., "RTMS Audio Capture")
   - **Short Description:** Brief description
   - **Long Description:** Detailed description

### Step 2: Configure App Credentials

After creating the app, you'll receive credentials from the "App Credentials" tab:

- **Client ID** → `ZOOM_APP_CLIENT_ID`
- **Client Secret** → `ZOOM_APP_CLIENT_SECRET`
- **Secret Token** → `ZOOM_SECRET_TOKEN`

You'll also need to generate a **Bearer Token**:
1. Use the OAuth flow or get it from your Zoom account
2. This token is used to call Zoom's Contact Center API
3. Set as `ZOOM_BEARER_TOKEN`

**IMPORTANT NOTE:** This application currently uses a hard-coded bearer token for OAuth authorization with the Zoom Contact Center API. This is a simplified approach suitable for development and testing. For production deployments, it is strongly recommended to implement proper OAuth token management, including:
- Automatic token generation through OAuth 2.0 flow
- Token refresh logic to handle expired tokens
- Secure token storage (e.g., encrypted database or secrets manager)
- Token rotation and expiration handling

See the "Production Deployment" section for more details on implementing proper OAuth token management.

### Step 3: Configure App URLs

You'll need an ngrok URL for the following settings. Start ngrok first:

```bash
npm run ngrok
# or
ngrok http 3001
```

Copy your ngrok HTTPS URL (e.g., `https://abc123.ngrok-free.dev`) and configure:

#### OAuth Settings
- **OAuth Redirect URL:** `https://your-ngrok-url.ngrok-free.dev/api/auth/callback`
- **OAuth Allow List:** `https://your-ngrok-url.ngrok-free.dev`

#### App Settings
- **Home URL:** `https://your-ngrok-url.ngrok-free.dev/api/home`
- **Webhook Event Notification Endpoint:** `https://your-ngrok-url.ngrok-free.dev/api/webhooks/zoom`

#### Feature Configuration
Enable the following:
- Contact Center App
- RTMS (Real-Time Media Streams)
- Webhook Events:
  - `contact_center.voice_rtms_started`
  - `contact_center.voice_rtms_stopped`

Within the "Surface" Section enable the following: 
- add in your Home URL 
- Select "Contact Center" under "Select where to use your app"
- In the domain allow list, add in the domain where your app is hosted (ex: uncongregative-unexpedient-detra.ngrok-free.dev), and any other domains accessed by your application 
- Toggle Zoom Apps SDK **ON** under "In-client App Features"
  - Add the following APIs: `getEngagementContext`, `getEngagementStatus`

### Step 4: Configure Scopes

Add these OAuth scopes:
- `contact_center:read:zcc_voice_audio`
- `contact_center:update:engagement_rtms_app_status`

## Environment Setup

### 1. Copy Environment File

```bash
cp .env.example .env
```

### 2. Configure Required Credentials

Edit `.env` and add your Zoom credentials:

```bash
# From Zoom Marketplace App Credentials
ZOOM_APP_CLIENT_ID=your_client_id_here
ZOOM_APP_CLIENT_SECRET=your_client_secret_here
ZOOM_SECRET_TOKEN=your_webhook_secret_token_here
ZOOM_BEARER_TOKEN=your_bearer_token_here 

# Your ngrok URL (update after starting ngrok)
PUBLIC_URL=https://your-ngrok-url.ngrok-free.dev
ZOOM_REDIRECT_URL=https://your-ngrok-url.ngrok-free.dev/api/auth/callback
```

### 3. Generate Session Secret

```bash
# Generate a random session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the generated secret to `.env`:
```bash
SESSION_SECRET=your_generated_session_secret
```

## Installation

### Install Dependencies for All Services

```bash
npm run install:all
```

This will install dependencies for:
- Root workspace
- Frontend (React app)
- Backend (Express API)
- RTMS server (WebSocket handler)

## Running the Application

### Option 1: Docker (Recommended)

1. Start ngrok (in a separate terminal):
```bash
npm run ngrok
```

2. Update `.env` with your ngrok URL

3. Start all services:
```bash
npm start
```

This starts:
- Frontend at `http://localhost:3000`
- Backend at `http://localhost:3001` (exposed via ngrok)
- RTMS server at `http://localhost:8080`

### Option 2: Local Development (without Docker)

1. Start ngrok:
```bash
npm run ngrok
```

2. Update `.env` with your ngrok URL

3. Start all services:
```bash
npm run dev:local
```

## Verification

### 1. Check Service Health

```bash
# Backend health check
curl http://localhost:3001/health

# RTMS server health check
curl http://localhost:8080/health
```

### 2. Test Zoom App

1. Log into Zoom Contact Center as an agent
2. Open the Apps panel
3. Find and launch your app
4. Wait for an active engagement
5. Check "Engagement Started" checkbox
6. Click "Start RTMS" button
7. Verify audio capture begins

### 3. Check Audio Files

Captured audio files are saved to:
```bash
rtms/data/audio/audio_{engagement_id}_{timestamp}.wav
```

## Project Structure

```
.
├── frontend/                 # React app (Zoom Apps SDK)
│   ├── src/
│   │   ├── App.js           # Main app component
│   │   ├── components/
│   │   │   ├── Engagement.js    # Engagement UI with RTMS controls
│   │   │   └── Engagement.css
│   │   └── index.js
│   └── package.json
│
├── backend/                  # Express API server
│   ├── server.js            # Main server file
│   ├── routes/
│   │   └── zoom.js          # Zoom API routes
│   ├── controllers/
│   │   └── zoomController.js    # RTMS control logic
│   ├── middleware/
│   │   └── security.js      # Security headers
│   └── package.json
│
├── rtms/                     # RTMS WebSocket server
│   ├── server.js            # WebSocket handler
│   ├── data/
│   │   └── audio/           # Captured audio files (WAV)
│   └── package.json
│
├── docker-compose.yml        # Docker services configuration
├── .env.example             # Environment variables template
├── package.json             # Root workspace scripts
└── README.md                # This file
```

## How It Works

### RTMS Authentication

The RTMS server authenticates with Zoom using HMAC-SHA256 signatures:

```javascript
const message = `${CLIENT_ID},${engagement_id},${rtms_stream_id}`;
const signature = crypto
  .createHmac('sha256', CLIENT_SECRET)
  .update(message)
  .digest('hex');
```

### Audio Format

Audio is captured with the following specifications:
- **Codec:** L16 (uncompressed linear PCM)
- **Sample Rate:** 16kHz
- **Channels:** Mono (1 channel)
- **Bit Depth:** 16-bit
- **Interval:** 20ms chunks
- **Format:** WAV file

### Manual Control Flow

1. Agent checks "Engagement Started" when call begins
2. Agent clicks "Start RTMS"
3. Frontend calls Backend API: `POST /api/zoom/rtms/control`
4. Backend calls Zoom API to start RTMS
5. Zoom sends webhook: `contact_center.voice_rtms_started`
6. Backend forwards webhook to RTMS server
7. RTMS server connects to Zoom WebSockets
8. Audio chunks are received and saved to WAV file
9. Agent clicks "Stop RTMS" to end capture
10. RTMS server closes connections and finalizes WAV file

## Troubleshooting

### Issue: Webhooks not received

**Solution:**
1. Verify ngrok is running: `npm run ngrok`
2. Check webhook URL in Zoom Marketplace matches ngrok URL
3. Verify `ZOOM_SECRET_TOKEN` in `.env` matches Marketplace
4. Check backend logs: `npm run logs:backend`

### Issue: RTMS connection fails

**Solution:**
1. Verify `ZOOM_APP_CLIENT_ID` and `ZOOM_APP_CLIENT_SECRET` are correct
2. Check RTMS server logs: `npm run logs:rtms`
3. Ensure RTMS feature is enabled in Marketplace app settings

### Issue: Bearer token expired

**Solution:**
1. Generate a new bearer token from Zoom
2. Update `ZOOM_BEARER_TOKEN` in `.env`
3. Restart services: `npm stop && npm start`

### Issue: No audio file created

**Solution:**
1. Check RTMS server logs for errors
2. Verify `rtms/data/audio/` directory exists and is writable
3. Ensure WebSocket connections succeeded
4. Check for duplicate webhook processing (dedup window = 5 seconds)

## NPM Scripts

```bash
# Install dependencies
npm run install:all          # Install for all services

# Start services
npm start                    # Docker mode (recommended)
npm run dev:local           # Local mode (no Docker)

# Individual services (local mode)
npm run dev:frontend        # Start frontend only
npm run dev:backend         # Start backend only
npm run dev:rtms            # Start RTMS server only

# Docker management
npm stop                    # Stop Docker containers
npm run logs                # View all logs
npm run logs:frontend       # Frontend logs only
npm run logs:backend        # Backend logs only
npm run logs:rtms          # RTMS server logs only
npm run rebuild             # Rebuild and restart containers
npm run clean               # Clean Docker volumes

# Utilities
npm run ngrok               # Start ngrok tunnel
npm run health              # Check backend health
npm run clean:data          # Clear audio files
npm run build               # Build frontend for production
```

## Security Considerations

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Bearer token is hard-coded** - This is NOT production-ready:
   - Current implementation uses a static `ZOOM_BEARER_TOKEN` in `.env`
   - Tokens expire and need to be manually updated
   - For production, implement OAuth 2.0 flow with automatic token refresh
   - See "Production Deployment" section for proper token management
3. **Use HTTPS in production** - ngrok provides this automatically
4. **Validate webhook signatures** - Implemented with `ZOOM_SECRET_TOKEN`
5. **Prevent duplicate webhooks** - 5-second deduplication window
6. **Secure RTMS connections** - HMAC signatures for authentication

## Production Deployment

For production deployment:

1. Replace ngrok with a production domain
2. Set up SSL certificates (Let's Encrypt)
3. Configure Redis for session storage (optional)
4. Set `NODE_ENV=production`
5. Use environment-specific secrets
6. **Implement OAuth token management** (CRITICAL):
   - Replace hard-coded `ZOOM_BEARER_TOKEN` with dynamic token generation
   - Implement OAuth 2.0 authorization code flow
   - Add token refresh logic to automatically renew expired tokens
   - Store tokens securely in encrypted database or secrets manager
   - Add error handling for token expiration (401 responses)
   - Implement token rotation for security
7. Set up monitoring and logging
8. Configure auto-scaling for RTMS server

## Support

For issues or questions:
1. Check logs: `npm run logs`
2. Review Zoom Marketplace app configuration
3. Verify environment variables in `.env`
4. Check webhook delivery in Marketplace dashboard

## License

MIT
