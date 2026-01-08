import React, { useState, useEffect } from 'react';
import zoomSdk from '@zoom/appssdk';
import io from 'socket.io-client';
import Engagement from './components/Engagement';
import './App.css';

function App() {
  const [zoomInitialized, setZoomInitialized] = useState(false);
  const [engagementContext, setEngagementContext] = useState(null);
  const [engagementStatus, setEngagementStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rtmsStatus, setRtmsStatus] = useState('waiting');
  const [simulatedTranscripts, setSimulatedTranscripts] = useState([]);

  // Connect to WebSocket for real-time transcripts
  useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    const socket = io(backendUrl, {
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('✅ Connected to backend WebSocket');
    });

    socket.on('transcript-data', (transcript) => {
      console.log('📝 Received transcript:', transcript);
      setSimulatedTranscripts(prev => [...prev, transcript]);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from backend WebSocket');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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
        setMessage('Zoom SDK initialized for Contact Center');

        zoomSdk.onEngagementStatusChange(async (event) => {
          console.log('Engagement status changed:', event);
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
        simulatedTranscripts={simulatedTranscripts}
      />
    </div>
  );
}

export default App;
