import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import express from 'express';
import crypto from 'crypto';
import WebSocket from 'ws';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const PORT = process.env.PORT || 8080;
const CLIENT_ID = process.env.ZOOM_APP_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOOM_APP_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3001';

// Send status update to backend for UI display
async function sendStatusUpdate(message, type = 'info') {
  try {
    await axios.post(`${BACKEND_URL}/api/rtms/status`, {
      message,
      type
    });
  } catch (error) {
    // Silently fail if backend is not available
  }
}

// Store active engagements
const activeEngagements = new Map();

// Generate signature: HMAC-SHA256(client_id + "," + engagement_id + "," + rtms_stream_id, secret)
function generateSignature(engagementId, rtmsStreamId) {
  const message = `${CLIENT_ID},${engagementId},${rtmsStreamId}`;
  return crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(message)
    .digest('hex');
}

// Connect to signaling WebSocket
function connectToSignalingWebSocket(engagementId, rtmsStreamId, serverUrl, engagementData) {
  const ws = new WebSocket(serverUrl);
  engagementData.signalingWs = ws;

  ws.on('open', () => {
    console.log(`[${engagementId}] Signaling WebSocket connected`);

    const handshake = {
      msg_type: 1,
      protocol_version: 1,
      engagement_id: engagementId,
      rtms_stream_id: rtmsStreamId,
      sequence: 0,
      signature: generateSignature(engagementId, rtmsStreamId)
    };

    ws.send(JSON.stringify(handshake));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    if (message.msg_type === 2) {
      // Signaling handshake response
      if (message.status_code === 0) {
        console.log(`[${engagementId}] Signaling handshake successful`);
        const mediaUrl = message.media_server?.server_urls?.audio || message.media_server?.server_urls?.all;
        if (mediaUrl) {
          connectToMediaWebSocket(mediaUrl, engagementId, rtmsStreamId, ws, engagementData);
        }
      } else {
        console.error(`[${engagementId}] Signaling handshake failed:`, message.reason);
      }
    } else if (message.msg_type === 12) {
      // Keep-alive request
      ws.send(JSON.stringify({ msg_type: 13, timestamp: message.timestamp }));
    }
  });

  ws.on('error', (error) => {
    console.error(`[${engagementId}] Signaling WebSocket error:`, error.message);
  });

  ws.on('close', (code, reason) => {
    console.log(`[${engagementId}] Signaling WebSocket closed (code: ${code})`);
  });
}

// Connect to media WebSocket
function connectToMediaWebSocket(mediaUrl, engagementId, rtmsStreamId, signalingWs, engagementData) {
  const ws = new WebSocket(mediaUrl);
  engagementData.mediaWs = ws;

  ws.on('open', () => {
    console.log(`[${engagementId}] Media WebSocket connected`);

    const handshake = {
      msg_type: 3,
      protocol_version: 1,
      engagement_id: engagementId,
      rtms_stream_id: rtmsStreamId,
      signature: generateSignature(engagementId, rtmsStreamId),
      media_type: 1, // Audio only
      payload_encryption: false,
      media_params: {
        audio: {
          content_type: 2, // RAW_AUDIO
          sample_rate: 1,  // 16kHz
          channel: 1,      // Mono
          codec: 1,        // L16
          data_opt: 1,     // Mixed stream
          send_rate: 20    // 20ms intervals
        }
      }
    };

    ws.send(JSON.stringify(handshake));
    console.log(`[${engagementId}] Sent media handshake`);
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    if (message.msg_type === 4) {
      // Media handshake response
      if (message.status_code === 0) {
        console.log(`[${engagementId}] Media handshake successful`);

        // Send CLIENT_READY_ACK to signaling connection
        signalingWs.send(JSON.stringify({
          msg_type: 7,
          rtms_stream_id: rtmsStreamId
        }));

        console.log(`[${engagementId}] Ready to receive audio`);
      } else {
        console.error(`[${engagementId}] Media handshake failed:`, message.reason);
      }
    } else if (message.msg_type === 12) {
      // Keep-alive request
      ws.send(JSON.stringify({ msg_type: 13, timestamp: message.timestamp }));
    } else if (message.msg_type === 14) {
      // Audio data
      engagementData.audioChunkCount++;

      if (engagementData.audioChunkCount % 50 === 0) {
        console.log(`[${engagementId}] Received ${engagementData.audioChunkCount} audio chunks`);
        sendStatusUpdate(`Received ${engagementData.audioChunkCount} audio chunks`, 'success');
      }
    }
  });

  ws.on('error', (error) => {
    console.error(`[${engagementId}] Media WebSocket error:`, error.message);
  });

  ws.on('close', (code) => {
    console.log(`[${engagementId}] Media WebSocket closed (code: ${code})`);
  });
}

// Handle RTMS started webhook
function handleRTMSStarted(payload) {
  const { engagement_id, rtms_stream_id, server_urls } = payload;

  if (!engagement_id || !rtms_stream_id || !server_urls) {
    console.error('Invalid payload - missing required fields');
    return;
  }

  // Check for duplicate
  if (activeEngagements.has(engagement_id)) {
    console.warn(`[${engagement_id}] Connection already exists, skipping`);
    return;
  }

  // Reserve this engagement_id immediately to prevent race condition
  activeEngagements.set(engagement_id, { reservedAt: new Date() });

  console.log(`[${engagement_id}] Starting RTMS connection`);
  sendStatusUpdate(`Starting RTMS connection`, 'info');

  // Store engagement data
  const engagementData = {
    engagementId: engagement_id,
    rtmsStreamId: rtms_stream_id,
    audioChunkCount: 0,
    startedAt: new Date(),
    signalingWs: null,
    mediaWs: null
  };

  activeEngagements.set(engagement_id, engagementData);

  // Connect to signaling WebSocket
  try {
    connectToSignalingWebSocket(engagement_id, rtms_stream_id, server_urls, engagementData);
  } catch (error) {
    console.error(`Failed to connect:`, error.message);
    cleanupEngagement(engagement_id);
  }
}

// Handle RTMS stopped webhook
async function handleRTMSStopped(payload) {
  const { engagement_id } = payload;

  if (!engagement_id) {
    console.error('Invalid payload - missing engagement_id');
    return;
  }

  console.log(`[${engagement_id}] Stopping RTMS`);
  sendStatusUpdate(`RTMS stopped`, 'success');
  await cleanupEngagement(engagement_id);
}

// Cleanup engagement resources
async function cleanupEngagement(engagementId) {
  const data = activeEngagements.get(engagementId);

  if (!data) {
    console.warn(`[${engagementId}] No active connection found`);
    return;
  }

  try {
    // Close WebSockets
    if (data.signalingWs) {
      data.signalingWs.close();
    }
    if (data.mediaWs) {
      data.mediaWs.close();
    }

    console.log(`[${engagementId}] Total audio chunks received: ${data.audioChunkCount}`);
  } catch (error) {
    console.error(`[${engagementId}] Cleanup error:`, error.message);
  } finally {
    activeEngagements.delete(engagementId);
    console.log(`[${engagementId}] Cleaned up`);
  }
}

// Create Express app
const app = express();
app.use(express.json());

// Webhook endpoint
app.post('/', (req, res) => {
  const { event, payload } = req.body;

  console.log(`\n[Webhook] Event: ${event}`);

  if (event === 'contact_center.voice_rtms_started') {
    handleRTMSStarted(payload);
    res.status(200).json({ received: true });
  } else if (event === 'contact_center.voice_rtms_stopped') {
    handleRTMSStopped(payload);
    res.status(200).json({ received: true });
  } else {
    console.log(`[Webhook] Unknown event: ${event}`);
    res.status(200).json({ received: true });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeEngagements: activeEngagements.size,
    engagements: Array.from(activeEngagements.keys())
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down...');
  for (const [engagementId] of activeEngagements.entries()) {
    await cleanupEngagement(engagementId);
  }
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('ZCC RTMS Server');
  console.log('='.repeat(50));
  console.log(`Port: ${PORT}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('='.repeat(50));
  console.log('\nServer ready - waiting for webhooks...\n');
});
