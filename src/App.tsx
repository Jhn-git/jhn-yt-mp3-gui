import React, { useState, useEffect } from 'react';
import DownloadForm from './components/DownloadForm';
import { checkAllBackendsHealth } from './api/backend';

const App: React.FC = () => {
    const [status, setStatus] = useState<string>('');
    const [audioStatus, setAudioStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [videoStatus, setVideoStatus] = useState<'checking' | 'online' | 'offline'>('checking');

    useEffect(() => {
        checkBackends();
    }, []);

    const checkBackends = async () => {
        try {
            const healthData = await checkAllBackendsHealth();
            setAudioStatus(healthData.audioStatus === 'fulfilled' ? 'online' : 'offline');
            setVideoStatus(healthData.videoStatus === 'fulfilled' ? 'online' : 'offline');
        } catch (error) {
            setAudioStatus('offline');
            setVideoStatus('offline');
        }
    };

    const handleDownloadStatus = (message: string) => {
        setStatus(message);
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1>🎵 YouTube Media Downloader</h1>
                <div className="status-indicators">
                    <div className="status-indicator">
                        <span className={`status-dot ${audioStatus}`}></span>
                        <span className="status-text">
                            Audio: {audioStatus === 'checking' ? 'Checking...' : audioStatus}
                        </span>
                    </div>
                    <div className="status-indicator">
                        <span className={`status-dot ${videoStatus}`}></span>
                        <span className="status-text">
                            Video: {videoStatus === 'checking' ? 'Checking...' : videoStatus}
                        </span>
                    </div>
                    {(audioStatus === 'offline' || videoStatus === 'offline') && (
                        <button onClick={checkBackends} className="retry-btn">
                            Retry Connection
                        </button>
                    )}
                </div>
            </header>

            <main className="app-main">
                {(audioStatus === 'offline' && videoStatus === 'offline') ? (
                    <div className="offline-message">
                        <h2>All Backends Offline</h2>
                        <p>Please ensure your backend servers are running:</p>
                        <p>Audio: <code>docker-compose up -d</code> or MP3 backend on port 8088</p>
                        <p>Video: <code>./video-backend/start.sh start</code> or video backend on port 3003</p>
                    </div>
                ) : (
                    <DownloadForm onStatusChange={handleDownloadStatus} />
                )}
            </main>

            {status && (
                <footer className="app-footer">
                    <div className="status-message">{status}</div>
                </footer>
            )}
        </div>
    );
};

export default App;