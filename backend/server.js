const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
// COMMENTED OUT: Frontend-Backend WebSocket (Socket.IO)
// const { Server } = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { securityHeaders } = require('./middleware/security');
const zoomRoutes = require('./routes/zoom');

const app = express();
const server = http.createServer(app);
// COMMENTED OUT: Frontend-Backend WebSocket (Socket.IO)
// const io = new Server(server, {
//   cors: {
//     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//     methods: ['GET', 'POST'],
//     credentials: true
//   }
// });

const PORT = process.env.BACKEND_PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FRONTEND_INTERNAL_URL = process.env.FRONTEND_INTERNAL_URL || FRONTEND_URL;

// Middleware - IMPORTANT: Order matters!
// 1. CORS must come FIRST
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.PUBLIC_URL || 'https://uncongregative-unexpedient-detra.ngrok-free.dev'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Security headers AFTER CORS
app.use(securityHeaders);

// Serve static frontend files (for production/ngrok deployment)
// Only serve static files if build directory exists (not in Docker dev mode)
const frontendBuildPath = path.join(__dirname, '../frontend/build');
const fs = require('fs');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  console.log('📦 Serving frontend build from:', frontendBuildPath);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// COMMENTED OUT: Frontend-Backend WebSocket (Socket.IO)
// WebSocket connection handling
// io.on('connection', (socket) => {
//   console.log('✅ Frontend client connected via WebSocket:', socket.id);
//
//   socket.on('disconnect', () => {
//     console.log('❌ Frontend client disconnected:', socket.id);
//   });
// });

// Note: RTMS control endpoint now handled by /api/zoom/rtms/control route

// Debug: Log all incoming requests to /api/webhooks/zoom
app.use('/api/webhooks/zoom', (req, _res, next) => {
  // console.log('\n' + '='.repeat(70));
  console.log('📨 WEBHOOK REQUEST RECEIVED');
  // console.log('='.repeat(70));
  // console.log('Method:', req.method);
  // console.log('Headers:', JSON.stringify(req.headers, null, 2));
  // console.log('Body:', JSON.stringify(req.body, null, 2));
  // console.log('Query:', JSON.stringify(req.query, null, 2));
  // console.log('='.repeat(70) + '\n');
  next();
});

// Home endpoint - serves the React app (for Zoom Marketplace)
// In Docker mode, this redirects to root which is proxied to frontend
app.get('/api/home', (req, res) => {
  // Redirect to root - the proxy will handle serving the frontend
  res.redirect('/');
});

// Mount Zoom API routes (includes RTMS control)
app.use('/api/zoom', zoomRoutes);

// Store recent webhook event signatures to prevent duplicates
const recentWebhooks = new Map();
const WEBHOOK_DEDUP_WINDOW_MS = 5000; // 5 seconds

// Webhook endpoint for Zoom events
app.post('/api/webhooks/zoom', async (req, res) => {
  const { event, payload } = req.body;

  console.log('Webhook received:', event);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  // Handle URL validation
  if (event === 'endpoint.url_validation') {
    if (!payload?.plainToken) {
      return res.status(400).json({ error: 'Missing plainToken' });
    }

    const encryptedToken = crypto
      .createHmac('sha256', process.env.ZOOM_SECRET_TOKEN || 'your-secret-token')
      .update(payload.plainToken)
      .digest('hex');

    return res.json({
      plainToken: payload.plainToken,
      encryptedToken
    });
  }

  // Forward RTMS events to RTMS server
  // The @zoom/rtms SDK creates its own webhook endpoint at the root path
  // Support both ZCC events (contact_center.voice_rtms_*) and regular meeting events
  const rtmsEvents = [
    'contact_center.voice_rtms_started',
    'contact_center.voice_rtms_stopped',
    'meeting.rtms_started',
    'meeting.rtms_stopped'
  ];

  if (rtmsEvents.includes(event)) {
    // Create unique signature for this webhook to detect duplicates
    const webhookSignature = `${event}:${payload.engagement_id || payload.rtms_stream_id}:${req.body.event_ts}`;

    // Check if we've recently processed this exact webhook
    if (recentWebhooks.has(webhookSignature)) {
      console.log(`⚠ Duplicate webhook detected (${webhookSignature}), skipping forward`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Mark this webhook as processed
    recentWebhooks.set(webhookSignature, Date.now());

    // Clean up old entries after dedup window
    setTimeout(() => {
      recentWebhooks.delete(webhookSignature);
    }, WEBHOOK_DEDUP_WINDOW_MS);

    try {
      const rtmsServerUrl = process.env.RTMS_SERVER_URL || 'http://localhost:8080';
      console.log(`→ Forwarding ${event} to RTMS server at ${rtmsServerUrl}`);
      await axios.post(rtmsServerUrl, req.body, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`✓ Successfully forwarded ${event} to RTMS server`);
    } catch (error) {
      console.error(`✗ Failed to forward ${event} to RTMS server:`, error.message);
    }
  }

  res.status(200).json({ received: true });
});

// Note: Zoom API proxy endpoints now handled by /api/zoom routes

// Proxy all other requests to frontend React dev server (Docker mode)
// This allows the backend to serve as single entry point
app.use('/', createProxyMiddleware({
  target: FRONTEND_INTERNAL_URL,
  changeOrigin: true,
  ws: true, // Proxy websockets for React hot reload
  logLevel: 'silent',
  onError: (err, req, res) => {
    console.log('Proxy error:', err.message);
    res.writeHead(500, {
      'Content-Type': 'text/plain',
    });
    res.end('Frontend proxy error. Is the frontend container running?');
  }
}));

// Start server
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL (OAuth redirects): ${FRONTEND_URL}`);
  console.log(`Frontend Internal URL (proxy): ${FRONTEND_INTERNAL_URL}`);
  console.log(`Public URL: ${process.env.PUBLIC_URL || 'http://localhost:3001'}`);
  console.log(`\n✅ All requests to http://localhost:${PORT} are proxied to frontend at ${FRONTEND_INTERNAL_URL}`);
  console.log(`✅ OAuth redirects go to: ${FRONTEND_URL}`);
  console.log(`✅ API requests to /api/* are handled by this backend\n`);
});
