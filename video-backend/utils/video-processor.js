import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VideoProcessor {
    constructor() {
        this.downloadsDir = path.join(__dirname, '..', 'downloads');
        this.ensureDownloadsDir();
    }

    async ensureDownloadsDir() {
        await fs.ensureDir(this.downloadsDir);
    }

    /**
     * Process video download and conversion
     * @param {string} url - YouTube URL
     * @param {string} quality - Video quality (720p, 1080p, 4K)
     * @param {function} progressCallback - Progress callback function
     * @returns {Promise<object>} - Result object with filename
     */
    async processVideo(url, quality, progressCallback) {
        return new Promise((resolve, reject) => {
            try {
                // Generate unique filename
                const timestamp = Date.now();
                const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
                const filename = `video_${timestamp}_${hash}.mp4`;
                const outputPath = path.join(this.downloadsDir, filename);

                // Map quality to yt-dlp format - use specific format selection with fallbacks
                const qualityMap = {
                    '720p': '398+140/136+140/best[height<=720]+140/best[height<=720]',
                    '1080p': '399+140/137+140/best[height<=1080]+140/best[height<=1080]',
                    '4K': '401+140/313+140/best[height<=2160]+140/best[height<=2160]'
                };

                const formatSelector = qualityMap[quality] || 'best';

                // Prepare yt-dlp command with minimal options to avoid merge issues
                const ytDlpArgs = [
                    '--format', formatSelector,
                    '--output', outputPath,
                    '--no-playlist',
                    '--merge-output-format', 'mp4',
                    '--progress-template', '%(progress)j',
                    '--no-warnings',
                    url
                ];

                console.log(`Starting video download: ${url} (${quality})`);
                console.log(`Command: yt-dlp ${ytDlpArgs.join(' ')}`);

                // Spawn yt-dlp process
                const ytDlpProcess = spawn('yt-dlp', ytDlpArgs, {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let progressData = '';
                let errorOutput = '';

                // Handle stdout for progress
                ytDlpProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    progressData += output;

                    // Parse progress information
                    const lines = progressData.split('\n');
                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const progressInfo = JSON.parse(line.trim());
                                if (progressInfo.status === 'downloading' && progressInfo.percent) {
                                    const progress = parseFloat(progressInfo.percent);
                                    if (!isNaN(progress) && progressCallback) {
                                        progressCallback(progress);
                                    }
                                }
                            } catch (e) {
                                // Not JSON, likely other output
                                console.log('yt-dlp output:', line.trim());
                            }
                        }
                    }
                });

                // Handle stderr for errors
                ytDlpProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    console.error('yt-dlp error output:', data.toString());
                });

                // Handle process completion
                ytDlpProcess.on('close', async (code) => {
                    if (code === 0) {
                        // Check if file was created
                        try {
                            const stats = await fs.stat(outputPath);
                            if (stats.size > 0) {
                                console.log(`Video download completed: ${filename} (${this.formatFileSize(stats.size)})`);
                                resolve({
                                    filename,
                                    path: outputPath,
                                    size: stats.size
                                });
                            } else {
                                throw new Error('Downloaded file is empty');
                            }
                        } catch (error) {
                            console.error('Error checking output file:', error);
                            reject(new Error(`Output file not found or empty: ${error.message}`));
                        }
                    } else {
                        const error = new Error(`yt-dlp process failed with code ${code}`);
                        error.details = errorOutput;
                        console.error('yt-dlp failed:', error.message);
                        console.error('Error details:', errorOutput);
                        reject(error);
                    }
                });

                // Handle process errors
                ytDlpProcess.on('error', (error) => {
                    console.error('yt-dlp process error:', error);
                    if (error.code === 'ENOENT') {
                        reject(new Error('yt-dlp is not installed or not in PATH'));
                    } else {
                        reject(new Error(`Process error: ${error.message}`));
                    }
                });

                // Set timeout for very long downloads
                const timeout = setTimeout(() => {
                    ytDlpProcess.kill('SIGTERM');
                    reject(new Error('Video download timeout (30 minutes)'));
                }, 30 * 60 * 1000); // 30 minutes

                ytDlpProcess.on('close', () => {
                    clearTimeout(timeout);
                });

            } catch (error) {
                console.error('Video processing error:', error);
                reject(error);
            }
        });
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get video info without downloading
     * @param {string} url - YouTube URL
     * @returns {Promise<object>} - Video information
     */
    async getVideoInfo(url) {
        return new Promise((resolve, reject) => {
            const ytDlpArgs = [
                '--dump-json',
                '--no-playlist',
                url
            ];

            const ytDlpProcess = spawn('yt-dlp', ytDlpArgs, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            ytDlpProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            ytDlpProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ytDlpProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const videoInfo = JSON.parse(output);
                        resolve({
                            title: videoInfo.title,
                            duration: videoInfo.duration,
                            uploader: videoInfo.uploader,
                            upload_date: videoInfo.upload_date,
                            view_count: videoInfo.view_count,
                            like_count: videoInfo.like_count,
                            description: videoInfo.description
                        });
                    } catch (error) {
                        reject(new Error(`Failed to parse video info: ${error.message}`));
                    }
                } else {
                    reject(new Error(`Failed to get video info: ${errorOutput}`));
                }
            });

            ytDlpProcess.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    reject(new Error('yt-dlp is not installed or not in PATH'));
                } else {
                    reject(new Error(`Process error: ${error.message}`));
                }
            });
        });
    }
}

export default VideoProcessor;