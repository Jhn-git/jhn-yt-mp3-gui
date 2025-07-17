// This file defines TypeScript types and interfaces used throughout the application.

export interface DownloadRequest {
    url: string;
    format: 'mp3' | 'wav' | 'flac';
}

export interface DownloadResponse {
    taskId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    message?: string;
}

export interface ApiError {
    message: string;
    code?: number;
}