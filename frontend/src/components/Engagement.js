import React from 'react';
import './Engagement.css';

function Engagement({
  engagementContext,
  engagementStatus,
  rtmsStatus,
  message,
  error,
  rtmsActive,
  isRtmsLoading,
  engagementStarted,
  setEngagementStarted,
  onStartRTMS,
  onStopRTMS
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
      <div className={`rtms-status-alert ${rtmsActive ? 'capturing' : rtmsStatus}`}>
        <div className="rtms-status-icon">
          {rtmsActive && '🔴'}
          {!rtmsActive && rtmsStatus === 'ready' && '🟢'}
          {rtmsStatus === 'waiting' && '⚪'}
          {rtmsStatus === 'error' && '🔴'}
        </div>
        <div className="rtms-status-text">
          {rtmsActive && (
            <>
              <strong>RTMS ACTIVE - AUDIO BEING CAPTURED</strong>
              <br />
              <span className="rtms-status-detail">Real-time audio and transcripts are being recorded</span>
            </>
          )}
          {!rtmsActive && rtmsStatus === 'ready' && (
            <>
              <strong>RTMS READY</strong>
              <br />
              <span className="rtms-status-detail">Click Start RTMS button below to begin capturing</span>
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

      {/* RTMS Control Button */}
      <div className="section rtms-control-section">
        <h2>RTMS Control</h2>

        {/* Manual Engagement Status Toggle */}
        <div className="engagement-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={engagementStarted}
              onChange={(e) => setEngagementStarted(e.target.checked)}
              className="engagement-checkbox"
            />
            <span className="toggle-text">Engagement Started</span>
          </label>
          <p className="toggle-hint">
            Check this box when your engagement begins to enable RTMS controls
          </p>
        </div>

        <div className="rtms-control">
          <button
            className={`rtms-button ${rtmsActive ? 'stop' : 'start'}`}
            onClick={rtmsActive ? onStopRTMS : onStartRTMS}
            disabled={isRtmsLoading || !engagementStarted}
          >
            {isRtmsLoading ? (
              <>
                <span className="button-icon">⏳</span>
                {rtmsActive ? 'Stopping...' : 'Starting...'}
              </>
            ) : rtmsActive ? (
              <>
                <span className="button-icon">⏹</span>
                Stop RTMS
              </>
            ) : (
              <>
                <span className="button-icon">▶</span>
                Start RTMS
              </>
            )}
          </button>
          <p className="rtms-hint">
            {!engagementStarted
              ? 'Check "Engagement Started" above to enable RTMS controls'
              : rtmsActive
              ? 'RTMS is currently active and capturing audio'
              : 'Click to start RTMS and begin audio capture'
            }
          </p>
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
            <span className="status-value success">Manual Control</span>
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
{/* 
          {consumerContext && (
            <div className="consumer-section">
              <h3>Consumer Information</h3>
              <p><strong>Name:</strong> {consumerContext.consumerName || 'N/A'}</p>
              <p><strong>Phone:</strong> {consumerContext.consumerPhone || 'N/A'}</p>
            </div>
          )} */}

          {/* {engagementContext.consumers && engagementContext.consumers.length > 0 && (
            <div className="consumers-list">
              <h3>Consumers</h3>
              {engagementContext.consumers.map((consumer, index) => (
                <div key={index} className="consumer-item">
                  {consumer.consumerName && <p><strong>Name:</strong> {consumer.consumerName}</p>}
                  {consumer.consumerPhone && <p><strong>Phone:</strong> {consumer.consumerPhone}</p>}
                  {consumer.consumerEmail && <p><strong>Email:</strong> {consumer.consumerEmail}</p>}
                </div>
              ))}
            </div>
          )} */}
        </div>
      )}

      {/* RTMS Information */}
      <div className="section">
        <h2>RTMS Information</h2>
        <div className="rtms-info">
          <p className="info-text">
            <strong>Manual RTMS Control</strong> - Start and stop RTMS capture on demand.
          </p>
          <h4>What gets captured when RTMS is active:</h4>
          <ul>
            <li>Live audio streams (L16 codec, 16kHz)</li>
            <li>Real-time transcripts with timestamps</li>
            <li>Speaker identification (agent + consumer)</li>
            <li>Engagement metadata</li>
          </ul>
          <h4>How it works:</h4>
          <ol>
            <li>When engagement becomes active, the Start RTMS button appears</li>
            <li>Click <strong>Start RTMS</strong> to initiate audio capture</li>
            <li>Zoom will send webhooks to start the RTMS connection</li>
            <li>Click <strong>Stop RTMS</strong> to end the capture session</li>
            <li>Audio and transcript data is saved to the server</li>
          </ol>
          <p className="note">
            All data is stored on the backend RTMS server at <code>rtms/data/</code> indexed by engagement ID.
            Data is automatically saved when RTMS stops or the engagement ends.
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
