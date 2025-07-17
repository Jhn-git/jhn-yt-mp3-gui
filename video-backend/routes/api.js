import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import VideoProcessor from '../utils/video-processor.js';
import TaskManager from '../utils/task-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const videoProcessor = new VideoProcessor();
const taskManager = new TaskManager();

// POST /api/download - Submit video download task
router.post('/download', async (req, res) => {
    try {
        const { url, quality = '720p' } = req.body;

        if (!url) {
            return res.status(400).json({
                error: 'URL is required',
                message: 'Please provide a valid YouTube URL'
            });
        }

        // Validate video quality
        const validQualities = ['720p', '1080p', '4K'];
        if (!validQualities.includes(quality)) {
            return res.status(400).json({
                error: 'Invalid quality',
                message: `Quality must be one of: ${validQualities.join(', ')}`
            });
        }

        // Create new task
        const taskId = taskManager.createTask({
            url,
            quality,
            type: 'video',
            status: 'pending'
        });

        // Start processing in background
        processVideoAsync(taskId, url, quality);

        res.json({
            taskId,
            status: 'pending',
            message: 'Video download task created successfully'
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// GET /api/task/:taskId - Get task status
router.get('/task/:taskId', (req, res) => {
    try {
        const { taskId } = req.params;
        const task = taskManager.getTask(taskId);

        if (!task) {
            return res.status(404).json({
                error: 'Task not found',
                message: 'The requested task does not exist'
            });
        }

        res.json(task);

    } catch (error) {
        console.error('Task status error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// GET /api/download/:filename - Download processed video file
router.get('/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '..', 'downloads', filename);

        // Check if file exists
        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({
                error: 'File not found',
                message: 'The requested file does not exist or has been removed'
            });
        }

        // Get file info
        const stats = await fs.stat(filePath);
        const fileSize = stats.size;

        // Set appropriate headers
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Clean up file after download (optional)
        fileStream.on('end', async () => {
            try {
                // Wait a bit then delete the file
                setTimeout(async () => {
                    await fs.remove(filePath);
                    console.log(`Cleaned up file: ${filename}`);
                }, 5000);
            } catch (error) {
                console.error('Error cleaning up file:', error);
            }
        });

    } catch (error) {
        console.error('Download file error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// GET /api/results - Get recent results
router.get('/results', (req, res) => {
    try {
        const results = taskManager.getRecentResults();
        res.json(results);
    } catch (error) {
        console.error('Results error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Background video processing function
async function processVideoAsync(taskId, url, quality) {
    try {
        // Update task status to processing
        taskManager.updateTask(taskId, {
            status: 'processing',
            progress: 0
        });

        // Process video
        const result = await videoProcessor.processVideo(url, quality, (progress) => {
            taskManager.updateTask(taskId, {
                status: 'processing',
                progress: Math.round(progress)
            });
        });

        // Update task with completion
        taskManager.updateTask(taskId, {
            status: 'completed',
            progress: 100,
            filename: result.filename,
            downloadUrl: `/api/download/${result.filename}`,
            result: {
                filename: result.filename,
                downloadUrl: `/api/download/${result.filename}`
            }
        });

        console.log(`Video processing completed for task ${taskId}: ${result.filename}`);

    } catch (error) {
        console.error(`Video processing failed for task ${taskId}:`, error);
        
        taskManager.updateTask(taskId, {
            status: 'failed',
            error: error.message,
            result: {
                error: error.message
            }
        });
    }
}

export default router;