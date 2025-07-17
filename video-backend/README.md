# YouTube Video Download Backend

A Node.js backend service for downloading and converting YouTube videos to MP4 format using yt-dlp.

## Features

- Download YouTube videos in multiple qualities (720p, 1080p, 4K)
- Task-based queue system with progress tracking
- RESTful API with authentication
- Automatic file cleanup
- CORS support for frontend integration
- Error handling and logging

## Prerequisites

- Node.js 16+ 
- npm or yarn
- yt-dlp installed and accessible in PATH

### Installing yt-dlp

```bash
# Using pip
pip install yt-dlp

# Using homebrew (macOS)
brew install yt-dlp

# Using apt (Ubuntu/Debian)
sudo apt install yt-dlp
```

## Installation

1. Navigate to the video-backend directory:
```bash
cd video-backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will start on port 3003 by default.

## API Endpoints

All API endpoints (except `/health`) require authentication using the `X-API-Key` header.

### Authentication

Include the API key in your requests:
```
X-API-Key: your-api-key-here
```

### Endpoints

#### POST /api/download
Submit a video download task.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "quality": "720p"
}
```

**Response:**
```json
{
  "taskId": "uuid-string",
  "status": "pending",
  "message": "Video download task created successfully"
}
```

**Supported qualities:**
- `720p` - 720p or lower
- `1080p` - 1080p or lower  
- `4K` - 4K/2160p or lower

#### GET /api/task/:taskId
Get task status and progress.

**Response:**
```json
{
  "taskId": "uuid-string",
  "status": "processing",
  "progress": 45,
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "quality": "720p",
  "createdAt": "2023-12-01T12:00:00.000Z",
  "updatedAt": "2023-12-01T12:01:30.000Z"
}
```

**Task Status Values:**
- `pending` - Task created, waiting to start
- `processing` - Video is being downloaded
- `completed` - Download completed successfully
- `failed` - Download failed

#### GET /api/download/:filename
Download the processed video file.

**Response:** MP4 video file stream

#### GET /api/results
Get recent completed and failed tasks.

**Response:**
```json
[
  {
    "taskId": "uuid-string",
    "status": "completed",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "quality": "720p",
    "filename": "video_1638360000000_abc12345.mp4",
    "downloadUrl": "/api/download/video_1638360000000_abc12345.mp4",
    "createdAt": "2023-12-01T12:00:00.000Z",
    "updatedAt": "2023-12-01T12:05:00.000Z"
  }
]
```

#### GET /health
Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "healthy",
  "service": "yt-video-backend",
  "timestamp": "2023-12-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3003)
- `NODE_ENV` - Environment (development/production)

### API Key

The API key is currently hardcoded in `server.js`. In production, consider moving it to environment variables:

```javascript
const API_KEY = process.env.API_KEY || 'your-default-key';
```

## File Management

- Downloaded videos are stored in the `downloads/` directory
- Files are automatically cleaned up after download
- Old files (24+ hours) are removed on server startup and periodically

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses Node.js `--watch` flag for auto-restart on file changes.

### Project Structure

```
video-backend/
├── server.js              # Main server file
├── routes/
│   └── api.js             # API routes
├── utils/
│   ├── video-processor.js # Video processing logic
│   └── task-manager.js    # Task management
├── downloads/             # Downloaded files (created automatically)
├── package.json
└── README.md
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid API key)
- `404` - Not Found (task/file not found)
- `500` - Internal Server Error

Error responses include:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Logging

The server logs important events:
- Task creation and updates
- File downloads and cleanup
- Errors and warnings
- Server startup and shutdown

## Integration with Frontend

This backend is designed to work with the existing MP3 frontend. The frontend can be configured to use both backends:

```javascript
// In frontend config
const videoBackendUrl = 'http://localhost:3003';
const audioBackendUrl = 'http://localhost:8088';
```

## Troubleshooting

### Common Issues

1. **yt-dlp not found**: Make sure yt-dlp is installed and in your PATH
2. **Download failures**: Check the YouTube URL is valid and accessible
3. **Large file timeouts**: Increase timeout values for very large videos
4. **Permission errors**: Ensure the downloads directory is writable

### Debugging

Enable debug logging by setting:
```bash
NODE_ENV=development npm start
```

## Security Considerations

- Use HTTPS in production
- Implement rate limiting
- Use environment variables for secrets
- Regular security updates for dependencies
- Consider implementing user authentication

## License

MIT License - See LICENSE file for details.