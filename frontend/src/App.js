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

        setZoomInitialized(true);
        setRtmsStatus('ready');
        setMessage('Zoom SDK initialized for Contact Center');

        zoomSdk.onEngagementStatusChange(async (event) => {
          const newStatus = event.engagementStatus;
          setEngagementStatus(newStatus);

          if (newStatus?.state === 'end') {
            setMessage('Engagement ended. RTMS data saved to server.');
            setRtmsStatus('ready');
          } else if (newStatus?.state === 'active') {
            setMessage('Engagement is active. RTMS is capturing audio/transcripts automatically.');
            setRtmsStatus('capturing');
          } else if (newStatus?.state === 'wrap-up') {
            setMessage('Engagement in wrap-up');
            setRtmsStatus('not ready');
          }
        });

      } catch (error) {
        console.error('Failed to initialize Zoom SDK:', error);
        setError(`SDK initialization failed: ${error.message}`);
      }
    }

    initializeZoomSdk();
  }, []);

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
      />
    </div>
  );
}

export default App;
