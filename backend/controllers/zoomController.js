const axios = require('axios');

/**
 * Handle RTMS control - Start/Stop RTMS for an engagement
 */
async function handleRtmsControl(req, res) {
  console.log('handleRtmsControl called');
  console.log('Request body:', req.body);

  const { engagementId, action } = req.body;
  const clientId = process.env.ZOOM_APP_CLIENT_ID;
  const bearerToken = process.env.ZOOM_BEARER_TOKEN;

  if (!engagementId || !action) {
    console.error('Missing required fields:', { engagementId, action });
    return res.status(400).json({
      error: 'Missing required fields: engagementId, action'
    });
  }

  if (!bearerToken) {
    console.error('ZOOM_BEARER_TOKEN not configured in environment');
    return res.status(500).json({
      error: 'Server configuration error: Bearer token not found'
    });
  }

  if (!clientId) {
    console.error('ZOOM_APP_CLIENT_ID not configured in environment');
    return res.status(500).json({
      error: 'Server configuration error: Client ID not found'
    });
  }

  if (action !== 'start' && action !== 'stop') {
    console.error('Invalid action:', action);
    return res.status(400).json({
      error: 'Invalid action. Must be "start" or "stop"'
    });
  }

  try {
    // Use the specific Zoom Contact Center API endpoint
    const zoomApiUrl = `https://goocicci.zoom.us/v2/contact_center/${engagementId}/rtms_app/status`;

    console.log(`${action.toUpperCase()} RTMS for engagement: ${engagementId}`);
    console.log('Zoom API URL:', zoomApiUrl);

    const response = await axios.put(
      zoomApiUrl,
      {
        action: action,
        settings: {
          client_id: clientId
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`RTMS ${action} successful:`, response.data);

    res.json({
      success: true,
      action: action,
      engagementId: engagementId,
      data: response.data
    });
  } catch (error) {
    console.error(`RTMS ${action} failed:`, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: `Failed to ${action} RTMS`,
      details: error.response?.data || error.message
    });
  }
}

module.exports = {
  handleRtmsControl
};
