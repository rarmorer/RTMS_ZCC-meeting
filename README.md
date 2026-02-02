# Zoom Contact Center RTMS App

A simple web application for monitoring real-time audio streams from Zoom Contact Center engagements. The app provides live status updates showing when RTMS connections start, how many audio chunks are received, and when they stop.

## What It Does

This app allows you to:
- Start and stop real-time media streaming for Zoom Contact Center engagements
- View live status updates of audio streaming activity
- Monitor audio chunk counts in real-time through a web interface


## Prerequisites

- Docker and Docker Compose installed
- Zoom Contact Center account
- ngrok account (for testing with Zoom webhooks)

## Quick Start

### 1. Clone and Setup Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Zoom credentials
nano .env
```

You'll need these values from Zoom Marketplace (see Zoom Setup section below):
- `ZOOM_APP_CLIENT_ID`
- `ZOOM_APP_CLIENT_SECRET`
- `ZOOM_SECRET_TOKEN`

### 2. Start the Application

```bash
# Start all services with Docker
docker-compose up
```

The app will be available at: http://localhost:3001

### 3. Setup ngrok (for testing with Zoom)

In a new terminal:

```bash
# Start ngrok tunnel
ngrok http 3001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`) and update your `.env` file:

```bash
PUBLIC_URL=https://abc123.ngrok-free.app
FRONTEND_URL=https://abc123.ngrok-free.app
ZOOM_REDIRECT_URL=https://abc123.ngrok-free.app/api/auth/callback
```

Then restart the application:

```bash
docker-compose restart
```

## Zoom Marketplace Setup

### Create a Zoom App

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Click **Develop** > **Build App**
3. Select **Zoom Apps** as the app type
4. Fill in basic information

### Configure the App

**App Credentials Tab:**
- Copy your Client ID, Client Secret, and add to `.env`

**Features Tab -> Surface:**
- Enable **Zoom App SDK** with these capabilities:
  - `getEngagementContext`
  - `getEngagementStatus`
- Enable **Contact Center** as app location
- Set **Home URL**: `https://your-ngrok-url.ngrok-free.app`

**Scopes Tab:**
- Add: `zoomapp:incontactcenter`

**Event Subscriptions Tab:**
- Enable Event Subscriptions
- Set **Event notification endpoint URL**: `https://your-ngrok-url.ngrok-free.app/api/webhooks/zoom`
- Add these event types:
  - `contact_center.engagement_started` ⚠️ **Required** - Enables Start/Stop buttons
  - `contact_center.engagement_ended` ⚠️ **Required** - Disables buttons when engagement ends
  - `contact_center.voice_rtms_started` - Shows RTMS start status
  - `contact_center.voice_rtms_stopped` - Shows RTMS stop status
- Copy the Secret Token to your `.env` as `ZOOM_SECRET_TOKEN`

**RTMS Tab:**
- Enable RTMS

**Activation Tab:**
- Install the app to your account

### Generate Bearer Token (Manual OAuth)

To generate a bearer token for API calls:

1. **Get the Authorization Code**
   - Install your app from the Zoom Marketplace
   - When redirected to your callback URL, copy the `code` parameter from the URL
   - Example: `https://your-ngrok-url.ngrok-free.app/api/auth/callback?code=AUTHORIZATION_CODE`

2. **Exchange Code for Access Token** (using Postman or similar tool)

   Make a POST request to get your access and refresh tokens:


   ```
   POST https://zoom.us/oauth/token

   Headers:
   - Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)
   - Content-Type: application/x-www-form-urlencoded

   Body:
   - grant_type=authorization_code
   - code=YOUR_AUTHORIZATION_CODE
   - redirect_uri=https://your-ngrok-url.ngrok-free.app/api/auth/
   ```

   Response will include:
   ```json
   {
     "access_token": "eyJhbGc...",
     "token_type": "bearer",
     "refresh_token": "eyJhbGc...",
     "expires_in": 3600
   }
   ```

3. **Add to Environment File**
   - Copy the `access_token` value
   - Add it to your `.env` file as `ZOOM_BEARER_TOKEN`

4. **Refresh Token When Expired**

   Access tokens expire after 1 hour. To get a new access token, use the refresh token:

   ```
   POST https://zoom.us/oauth/token

   Headers:
   - Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)
   - Content-Type: application/x-www-form-urlencoded

   Body:
   - grant_type=refresh_token
   - refresh_token=YOUR_REFRESH_TOKEN
   ```

   See [Zoom OAuth documentation](https://developers.zoom.us/docs/integrations/oauth/#app-type-general) for more details.

## Usage

1. Open the app within a Zoom Contact Center engagement
2. Click **Start RTMS** to begin streaming
3. Watch the live status updates showing audio chunks received
4. Click **Stop RTMS** when done

Status messages appear in the terminal-style display:
- 🔵 Starting RTMS connection
- 🟢 Received 50 audio chunks
- 🟢 Received 100 audio chunks
- 🟢 RTMS stopped


## Troubleshooting

**Webhooks not working?**
- Ensure ngrok is running
- Verify ngrok URL is set in both `.env` and Zoom Marketplace
- Check webhook URL matches: `https://your-ngrok-url.ngrok-free.app/api/webhooks/zoom`

**Buttons are greyed out / Can't start RTMS?**
- Make sure you've subscribed to `contact_center.engagement_started` and `contact_center.engagement_ended` webhooks in Zoom Marketplace
- Start an engagement in Zoom Contact Center
- Check backend logs for "Engagement started" message: `docker-compose logs -f backend`
- Verify the webhook is received: Look for `[Engagement Started]` in backend logs
- Check active engagement API: `curl http://localhost:3001/api/engagement/active`
- If webhook received but buttons still greyed: Check browser console for errors

**Can't start RTMS after buttons enabled?**
- Verify `ZOOM_BEARER_TOKEN` is set in `.env`
- View backend logs: `docker-compose logs -f backend`

**Status messages not appearing?**
- Check RTMS server logs: `docker-compose logs -f rtms`
- Verify `BACKEND_URL` is set correctly in `.env`
- Ensure all three services are running: `docker-compose ps`


## License

MIT License
