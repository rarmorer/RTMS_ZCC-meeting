import React from 'react';
import './Engagement.css';

function Engagement({
  engagementContext,
  engagementStatus,
  rtmsStatus,
  message,
  error
}) {
  return (
    <div className="engagement-container">
      <header className="header engagement-header">
        <h1>Zoom RTMS App</h1>
        <p className="subtitle">Real-Time Media Streams for Contact Center</p>
      </header>

      {error && (
        <div className="error-box">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* RTMS Status Alert */}
      <div className={`rtms-status-alert ${rtmsStatus}`}>
        <div className="rtms-status-text">
          {rtmsStatus === 'capturing' && (
            <>
              <strong>RTMS ACTIVE - AUDIO BEING CAPTURED</strong>
              <br />
              <span className="rtms-status-detail">Real-time audio is being recorded</span>
            </>
          )}
          {rtmsStatus === 'ready' && (
            <>
              <strong>RTMS READY</strong>
              <br />
              <span className="rtms-status-detail">Capturing engagement activity</span>
            </>
          )}
          {rtmsStatus === 'waiting' && (
            <>
              <strong>RTMS INITIALIZING</strong>
              <br />
              <span className="rtms-status-detail">Setting up real-time media streams...</span>
            </>
          )}
          {rtmsStatus === 'error' && (
            <>
              <strong>RTMS ERROR</strong>
              <br />
              <span className="rtms-status-detail">Failed to connect to RTMS server</span>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="message-box">
          {message}
        </div>
      )}

      {/* Engagement Status */}
      <div className="section">
        <h2>Status</h2>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">SDK:</span>
            <span className="status-value success">Initialized</span>
          </div>
          <div className="status-item">
            <span className="status-label">Context:</span>
            <span className="status-value">inContactCenter</span>
          </div>
          <div className="status-item">
            <span className="status-label">RTMS:</span>
            <span className="status-value success">Auto-Enabled</span>
          </div>
        </div>
      </div>

      {/* Engagement Context */}
      {engagementContext && (
        <div className="section">
          <h2>Engagement Context</h2>
          <p><strong>Engagement ID:</strong> {engagementContext.engagementId}</p>
          <p><strong>Start Time:</strong> {new Date(engagementContext.startTime).toLocaleString()}</p>
          {engagementContext.queueName && (
            <p><strong>Queue:</strong> {engagementContext.queueName}</p>
          )}
          {engagementContext.isTransfer && (
            <p className="warning-text">This is a transferred engagement</p>
          )}

          {engagementStatus && (
            <div className="status-section">
              <h3>Engagement Status</h3>
              <p><strong>State:</strong> {engagementStatus.state}</p>
              <p><strong>Direction:</strong> {engagementStatus.direction}</p>
            </div>
          )}
        </div>
      )}

      {/* RTMS Information */}
      <div className="section">
        <h2>RTMS Information</h2>
        <div className="rtms-info">
          <p className="info-text">
            <strong>RTMS is automatically enabled</strong> based on your Zoom account settings.
          </p>
          <h4>What gets captured automatically:</h4>
          <ul>
            <li>Live audio streams (16kHz, 16-bit, mono WAV)</li>
            <li>Engagement metadata</li>
          </ul>
          <p className="note">
            All data is stored on the backend RTMS server at <code>rtms/data/audio/</code> indexed by engagement ID.
            Data is automatically saved when the engagement ends.
          </p>
          <p className="note">
            <strong>No manual controls needed</strong> - RTMS connects automatically when webhooks are received.
          </p>
        </div>
      </div>

      <div className="section footer">
        <p className="footer-text">
          Zoom RTMS App | Version 1.0.0 | Contact Center Mode
        </p>
      </div>
    </div>
  );
}

export default Engagement;
