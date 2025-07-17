import axios from 'axios';
import { config } from '../config';

const API_KEY = config.apiKey;

const audioApiClient = axios.create({
    baseURL: `${config.audioBackendUrl}/api`,
    headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
    },
});

const videoApiClient = axios.create({
    baseURL: `${config.videoBackendUrl}/api`,
    headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
    },
});

export interface DownloadResponse {
    taskId: string;
    status: string;
    message: string;
}

export interface TaskStatus {
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'active';
    progress?: number;
    downloadUrl?: string;
    filename?: string;
    file?: string;
    error?: string | null;
    result?: {
        filename?: string;
        error?: string;
        downloadUrl?: string;
    };
}

export type MediaType = 'audio' | 'video';
export type AudioFormat = 'mp3' | 'wav' | 'flac';
export type VideoQuality = '720p' | '1080p' | '4K';

export const downloadMedia = async (
    url: string, 
    mediaType: MediaType, 
    format: AudioFormat | VideoQuality = 'mp3'
): Promise<DownloadResponse> => {
    try {
        const client = mediaType === 'audio' ? audioApiClient : videoApiClient;
        const payload = mediaType === 'audio' 
            ? { url, format }
            : { url, quality: format };
        
        const response = await client.post('/download', payload);
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to download ${mediaType}: ${error.response?.data?.message || error.message}`);
    }
};

// Legacy function for backward compatibility
export const downloadAudio = async (url: string, format: string = 'mp3'): Promise<DownloadResponse> => {
    return downloadMedia(url, 'audio', format as AudioFormat);
};

export const getTaskStatus = async (taskId: string, mediaType: MediaType = 'audio'): Promise<TaskStatus> => {
    try {
        const client = mediaType === 'audio' ? audioApiClient : videoApiClient;
        const response = await client.get(`/task/${taskId}`);
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to get task status: ${error.response?.data?.message || error.message}`);
    }
};

export const getRecentResults = async (mediaType: MediaType = 'audio') => {
    try {
        const client = mediaType === 'audio' ? audioApiClient : videoApiClient;
        const response = await client.get('/results');
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to get recent results: ${error.response?.data?.message || error.message}`);
    }
};

export const downloadFile = async (filename: string, mediaType: MediaType = 'audio'): Promise<string> => {
    try {
        const client = mediaType === 'audio' ? audioApiClient : videoApiClient;
        const response = await client.get(`/download/${filename}`, {
            responseType: 'blob',
        });
        
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        return url;
    } catch (error: any) {
        throw new Error(`Failed to download file: ${error.response?.data?.message || error.message}`);
    }
};

export const checkBackendHealth = async (mediaType: MediaType = 'audio') => {
    try {
        const url = mediaType === 'audio' ? config.audioBackendUrl : config.videoBackendUrl;
        const response = await axios.get(`${url}/health`);
        return response.data;
    } catch (error: any) {
        throw new Error(`${mediaType} backend health check failed: ${error.message}`);
    }
};

export const checkAllBackendsHealth = async () => {
    try {
        const [audioHealth, videoHealth] = await Promise.allSettled([
            checkBackendHealth('audio'),
            checkBackendHealth('video')
        ]);
        
        return {
            audio: audioHealth.status === 'fulfilled' ? audioHealth.value : null,
            video: videoHealth.status === 'fulfilled' ? videoHealth.value : null,
            audioStatus: audioHealth.status,
            videoStatus: videoHealth.status,
        };
    } catch (error: any) {
        throw new Error(`Health check failed: ${error.message}`);
    }
};