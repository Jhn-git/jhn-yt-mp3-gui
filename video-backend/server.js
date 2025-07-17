import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
await fs.ensureDir(downloadsDir);

// Cleanup old files on startup
const cleanupOldFiles = async () => {
    try {
        const files = await fs.readdir(downloadsDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const file of files) {
            const filePath = path.join(downloadsDir, file);
            const stats = await fs.stat(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
                await fs.remove(filePath);
                console.log(`Cleaned up old file: ${file}`);
            }
        }
    } catch (error) {
        console.error('Error cleaning up old files:', error);
    }
};

// Run cleanup on startup
cleanupOldFiles();

// API key middleware
const API_KEY = process.env.API_KEY || 'your-api-key-here';

const authenticateApiKey = (req, res, next) => {
    const apiKey = req.header('X-API-Key');
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
};

// Routes
app.use('/api', authenticateApiKey, apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'yt-video-backend',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Static files for downloads
app.use('/downloads', express.static(downloadsDir));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Video backend server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Shutting down gracefully...');
    process.exit(0);
});