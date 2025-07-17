import React, { useState, useEffect } from 'react';
import { downloadMedia, getTaskStatus, downloadFile, DownloadResponse, TaskStatus, MediaType, AudioFormat, VideoQuality } from '../api/backend';

interface DownloadFormProps {
    onStatusChange?: (message: string) => void;
}

const DownloadForm: React.FC<DownloadFormProps> = ({ onStatusChange }) => {
    const [url, setUrl] = useState('');
    const [mediaType, setMediaType] = useState<MediaType>('audio');
    const [audioFormat, setAudioFormat] = useState<AudioFormat>('mp3');
    const [videoQuality, setVideoQuality] = useState<VideoQuality>('720p');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
    const [progress, setProgress] = useState<number>(0);

    const pollTaskStatus = async (id: string) => {
        try {
            const status = await getTaskStatus(id, mediaType);
            console.log('Task status:', status); // Debug log
            setTaskStatus(status);
            setProgress(status.progress || 0);

            if (status.status === 'completed') {
                // Check if completed with error
                if (status.error) {
                    setError(`Download failed: ${status.error}`);
                    setLoading(false);
                    onStatusChange?.('Download failed');
                } else {
                    const filename = status.filename || status.file || status.result?.filename || 'download';
                    setSuccess(`Download completed! File: ${filename}`);
                    setLoading(false);
                    onStatusChange?.(`Download completed: ${filename}`);
                }
            } else if (status.status === 'failed') {
                let errorMsg = status.error || status.result?.error || 'Download failed';
                
                // Check if it's a YouTube Music URL validation error
                if (errorMsg.includes('Invalid URL') && url.includes('music.youtube.com')) {
                    errorMsg = 'YouTube Music URLs are not supported by the backend. Please try the regular YouTube version of this video instead.';
                }
                
                setError(errorMsg);
                setLoading(false);
                onStatusChange?.('Download failed');
            } else if (status.status === 'processing' || status.status === 'pending' || status.status === 'active') {
                setTimeout(() => pollTaskStatus(id), 2000);
            } else {
                // Unknown status, stop polling but don't show error yet
                setTimeout(() => pollTaskStatus(id), 2000);
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) {
            setError('Please enter a valid YouTube URL');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        setTaskStatus(null);
        setProgress(0);

        try {
            const format = mediaType === 'audio' ? audioFormat : videoQuality;
            const response: DownloadResponse = await downloadMedia(url, mediaType, format);
            setTaskId(response.taskId);
            onStatusChange?.(`${mediaType} download started...`);
            pollTaskStatus(response.taskId);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
            onStatusChange?.(`${mediaType} download failed to start`);
        }
    };

    const handleDownloadFile = async () => {
        const filename = taskStatus?.filename || taskStatus?.file;
        if (filename) {
            try {
                const fileUrl = await downloadFile(filename, mediaType);
                const link = document.createElement('a');
                link.href = fileUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(fileUrl);
            } catch (err: any) {
                setError(`Failed to download file: ${err.message}`);
            }
        } else {
            setError('No filename available for download');
        }
    };

    const isValidYouTubeUrl = (url: string) => {
        const patterns = [
            /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\/.+/,
            /^https?:\/\/(www\.)?youtube\.com\/watch\?v=.+/,
            /^https?:\/\/music\.youtube\.com\/watch\?v=.+/,
            /^https?:\/\/youtu\.be\/.+/
        ];
        return patterns.some(pattern => pattern.test(url));
    };

    return (
        <div className="download-form">
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="url">YouTube URL:</label>
                    <input
                        type="url"
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        required
                        className={url && !isValidYouTubeUrl(url) ? 'invalid' : ''}
                    />
                    {url && !isValidYouTubeUrl(url) && (
                        <small className="error-text">Please enter a valid YouTube URL</small>
                    )}
                    {url.includes('music.youtube.com') && (
                        <small className="warning-text">
                            💡 Tip: YouTube Music URLs may not work. Try the regular YouTube version instead.
                        </small>
                    )}
                </div>
                
                <div className="form-group">
                    <label>Media Type:</label>
                    <div className="media-type-toggle">
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="mediaType"
                                value="audio"
                                checked={mediaType === 'audio'}
                                onChange={(e) => setMediaType(e.target.value as MediaType)}
                            />
                            <span>🎵 Audio</span>
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="mediaType"
                                value="video"
                                checked={mediaType === 'video'}
                                onChange={(e) => setMediaType(e.target.value as MediaType)}
                            />
                            <span>🎬 Video</span>
                        </label>
                    </div>
                </div>
                
                {mediaType === 'audio' ? (
                    <div className="form-group">
                        <label htmlFor="audioFormat">Audio Format:</label>
                        <select
                            id="audioFormat"
                            value={audioFormat}
                            onChange={(e) => setAudioFormat(e.target.value as AudioFormat)}
                        >
                            <option value="mp3">MP3 (Recommended)</option>
                            <option value="wav">WAV (High Quality)</option>
                            <option value="flac">FLAC (Lossless)</option>
                        </select>
                    </div>
                ) : (
                    <div className="form-group">
                        <label htmlFor="videoQuality">Video Quality:</label>
                        <select
                            id="videoQuality"
                            value={videoQuality}
                            onChange={(e) => setVideoQuality(e.target.value as VideoQuality)}
                        >
                            <option value="720p">720p (HD)</option>
                            <option value="1080p">1080p (Full HD)</option>
                            <option value="4K">4K (Ultra HD)</option>
                        </select>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading || (url.length > 0 && !isValidYouTubeUrl(url))}
                    className="download-btn"
                >
                    {loading ? 'Processing...' : `Download ${mediaType === 'audio' ? 'Audio' : 'Video'}`}
                </button>
            </form>

            {loading && taskStatus && (
                <div className="progress-section">
                    <p>Status: {taskStatus.status}</p>
                    {progress > 0 && (
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}
                </div>
            )}

            {taskStatus?.status === 'completed' && (
                <div className="download-complete">
                    <button onClick={handleDownloadFile} className="download-file-btn">
                        Download {taskStatus.filename || taskStatus.file || 'File'}
                    </button>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
        </div>
    );
};

export default DownloadForm;