import React, { useState, useEffect } from 'react';
import zoomSdk from '@zoom/appssdk';
import './App.css';

function App() {
  const [zoomInitialized, setZoomInitialized] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [engagementId, setEngagementId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [rtmsActive, setRtmsActive] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState([]);

  // Check for OAuth redirect with auth status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');

    if (authStatus === 'success') {
      setMessage('Authentication successful!');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'error') {
      setError('Authentication failed. Please try again.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Poll for webhook events
  useEffect(() => {
    const fetchWebhookEvents = async () => {
      try {
        const response = await fetch('/api/webhooks/events');
        const data = await response.json();
        setWebhookEvents(data.events || []);
      } catch (err) {
        console.error('Error fetching webhook events:', err);
      }
    };

    // Initial fetch
    fetchWebhookEvents();

    // Poll every 2 seconds
    const interval = setInterval(fetchWebhookEvents, 2000);

    return () => clearInterval(interval);
  }, []);

  // Initialize Zoom SDK
  useEffect(() => {
    async function initializeZoomSdk() {
      try {
        await zoomSdk.config({
          version: '0.16.0',
          capabilities: ['getEngagementContext', 'getEngagementStatus']
        });

        setZoomInitialized(true);

        // Get engagement context
        const context = await zoomSdk.getEngagementContext();
        if (context?.engagementContext?.engagementId) {
          setEngagementId(context.engagementContext.engagementId);
        }

        // Get engagement status and check if active
        const status = await zoomSdk.getEngagementStatus();
        if (status?.engagementStatus?.state === 'active') {
          setIsActive(true);
        }

      } catch (error) {
        console.error('Failed to initialize Zoom SDK:', error);
        setError(`SDK initialization failed: ${error.message}`);
      }
    }

    initializeZoomSdk();
  }, []);

  const handleStartRTMS = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Use relative URL since backend proxies to frontend
      const response = await fetch('/api/zoom/rtms/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          engagementId: engagementId,
          action: 'start'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRtmsActive(true);
        setMessage('RTMS started successfully');
      } else {
        setError(data.error || 'Failed to start RTMS');
      }
    } catch (err) {
      setError(`Error starting RTMS: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopRTMS = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Use relative URL since backend proxies to frontend
      const response = await fetch('/api/zoom/rtms/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          engagementId: engagementId,
          action: 'stop'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRtmsActive(false);
        setMessage('RTMS stopped successfully');
      } else {
        setError(data.error || 'Failed to stop RTMS');
      }
    } catch (err) {
      setError(`Error stopping RTMS: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!zoomInitialized) {
    return (
      <div className="App">
        <div className="container">
          <div className="loading-container">
            <h2>Initializing Zoom SDK...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>Zoom RTMS Control</h1>
          <p className="subtitle">Start and Stop Real-Time Media Streams</p>
        </div>

        {error && (
          <div className="error-box">
            <strong>Error:</strong> {error}
          </div>
        )}

        {message && (
          <div className="success-box">
            <strong>Success:</strong> {message}
          </div>
        )}

        <div className="section">
          <h2>Status</h2>
          <div className="status-item">
            <span className="status-label">Engagement Active:</span>
            <span className={`status-value ${isActive ? 'success' : 'warning'}`}>
              {isActive ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Engagement ID:</span>
            <span className="status-value">{engagementId || 'Not available'}</span>
          </div>
        </div>

        <div className="section">
          <h3>RTMS Controls</h3>
          <div className="action-group">
            <button
              className="btn btn-success"
              onClick={handleStartRTMS}
              disabled={loading || !engagementId || !isActive}
            >
              {loading ? 'Starting...' : 'Start RTMS'}
            </button>
            <button
              className="btn btn-danger"
              onClick={handleStopRTMS}
              disabled={loading || !engagementId || !isActive}
            >
              {loading ? 'Stopping...' : 'Stop RTMS'}
            </button>
          </div>
        </div>

        <div className="section webhook-events-section">
          <h3>RTMS Status</h3>
          <div className="webhook-events-container">
            {webhookEvents.length === 0 ? (
              <p className="no-events">No status messages yet</p>
            ) : (
              <div className="events-list">
                {webhookEvents.map((event) => (
                  <div key={event.id} className={`status-message status-${event.type}`}>
                    <div className="status-message-content">
                      <span className="status-indicator"></span>
                      <span className="status-text">{event.message}</span>
                    </div>
                    <span className="status-timestamp">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="footer">
          <p className="footer-text">Zoom RTMS App | Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}

export default App;
