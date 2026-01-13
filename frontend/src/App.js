import React, { useState, useEffect } from 'react';
import zoomSdk from '@zoom/appssdk';
import Engagement from './components/Engagement';
import './App.css';

function App() {
  const [zoomInitialized, setZoomInitialized] = useState(false);
  const [engagementContext, setEngagementContext] = useState(null);
  const [engagementStatus, setEngagementStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rtmsStatus, setRtmsStatus] = useState('waiting');
  const [rtmsActive, setRtmsActive] = useState(false); // Track if RTMS is started
  const [isRtmsLoading, setIsRtmsLoading] = useState(false); // Loading state for API calls
  const [engagementStarted, setEngagementStarted] = useState(false); // Manual engagement started toggle

  const backendUrl = 'https://uncongregative-unexpedient-detra.ngrok-free.dev'; // Use ngrok URL for Zoom app

  // Start RTMS for an engagement
  const handleStartRTMS = async () => {
    if (!engagementContext?.engagementId) {
      setError('No active engagement found');
      return;
    }

    setIsRtmsLoading(true);
    setError('');
    try {
      const response = await fetch(`${backendUrl}/api/zoom/rtms/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          engagementId: engagementContext.engagementId,
          action: 'start'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setRtmsActive(true);
        setRtmsStatus('capturing');
        setMessage('RTMS started successfully! Audio capture will begin shortly.');
      } else {
        setError(data.error || 'Failed to start RTMS');
      }
    } catch (err) {
      setError(`Failed to start RTMS: ${err.message}`);
    } finally {
      setIsRtmsLoading(false);
    }
  };

  // Stop RTMS for an engagement
  const handleStopRTMS = async () => {
    if (!engagementContext?.engagementId) {
      setError('No active engagement found');
      return;
    }

    setIsRtmsLoading(true);
    setError('');

    try {
      const response = await fetch(`${backendUrl}/api/zoom/rtms/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          engagementId: engagementContext.engagementId,
          action: 'stop'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setRtmsActive(false);
        setRtmsStatus('ready');
        setMessage('RTMS stopped successfully.');
      } else {
        setError(data.error || 'Failed to stop RTMS');
      }
    } catch (err) {
      setError(`Failed to stop RTMS: ${err.message}`);
    } finally {
      setIsRtmsLoading(false);
    }
  };

  // Initialize Zoom SDK
  useEffect(() => {
    async function initializeZoomSdk() {
      try {
        const configResponse = await zoomSdk.config({
          version: '0.16.0',
          popoutSize: { width: 480, height: 360 },
          capabilities: [
            'authorize',
            'onAuthorized',
            'getUserContext',
            'getRunningContext',
            'getEngagementContext',
            'getEngagementStatus',
            'getEngagementVariableValue',
            'onEngagementContextChange',
            'onEngagementStatusChange',
            'onEngagementVariableValueChange'
          ]
        });

        console.log('Zoom SDK configured:', configResponse);
        setZoomInitialized(true);
        setRtmsStatus('ready');
        setMessage('Zoom SDK initialized for Contact Center. Check "Engagement Started" when ready.');

      } catch (error) {
        console.error('Failed to initialize Zoom SDK:', error);
        setError(`SDK initialization failed: ${error.message}`);
      }
    }

    initializeZoomSdk();
  }, []);

  // Fetch engagement context when user indicates engagement has started
  useEffect(() => {
    async function fetchEngagementContext() {
      if (!engagementStarted || !zoomInitialized) {
        console.log('Skipping fetch - engagementStarted:', engagementStarted, 'zoomInitialized:', zoomInitialized);
        return;
      }

      try {
        console.log('Fetching engagement context...');
        const response = await zoomSdk.getEngagementContext();
        console.log('Context response:', response);

        if (response?.engagementContext?.engagementId) {
          setEngagementContext(response.engagementContext);
          console.log('Engagement context set:', response.engagementContext);
          setMessage('Engagement context loaded. You can now start RTMS.');
        } else {
          setError('No engagement context available. Please ensure you are in an active engagement.');
        }
      } catch (err) {
        console.error('Failed to get engagement context:', err);
        setError('Failed to retrieve engagement context: ' + err.message);
      }
    }

    fetchEngagementContext();
  }, [engagementStarted, zoomInitialized]);

  if (!zoomInitialized) {
    return (
      <div className="App">
        <div className="container loading-container">
          <div className="loading-message">
            <h2>Initializing Zoom SDK...</h2>
            <p>Please wait while we connect to Zoom</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Engagement
        engagementContext={engagementContext}
        engagementStatus={engagementStatus}
        rtmsStatus={rtmsStatus}
        message={message}
        error={error}
        rtmsActive={rtmsActive}
        isRtmsLoading={isRtmsLoading}
        engagementStarted={engagementStarted}
        setEngagementStarted={setEngagementStarted}
        onStartRTMS={handleStartRTMS}
        onStopRTMS={handleStopRTMS}
      />
    </div>
  );
}

export default App;
