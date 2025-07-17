import { v4 as uuidv4 } from 'uuid';

class TaskManager {
    constructor() {
        this.tasks = new Map();
        this.maxTasks = 100; // Maximum number of tasks to keep in memory
        this.cleanupInterval = 60 * 60 * 1000; // 1 hour
        
        // Start cleanup timer
        this.startCleanupTimer();
    }

    /**
     * Create a new task
     * @param {object} taskData - Task data
     * @returns {string} - Task ID
     */
    createTask(taskData) {
        const taskId = uuidv4();
        const task = {
            taskId,
            ...taskData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.tasks.set(taskId, task);
        this.cleanupOldTasks();
        
        console.log(`Created task ${taskId}: ${taskData.type} - ${taskData.url}`);
        return taskId;
    }

    /**
     * Get task by ID
     * @param {string} taskId - Task ID
     * @returns {object|null} - Task data or null if not found
     */
    getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }

    /**
     * Update task data
     * @param {string} taskId - Task ID
     * @param {object} updates - Updates to apply
     * @returns {boolean} - Success status
     */
    updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return false;
        }

        const updatedTask = {
            ...task,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.tasks.set(taskId, updatedTask);
        
        console.log(`Updated task ${taskId}: status=${updatedTask.status}, progress=${updatedTask.progress}%`);
        return true;
    }

    /**
     * Delete task
     * @param {string} taskId - Task ID
     * @returns {boolean} - Success status
     */
    deleteTask(taskId) {
        const deleted = this.tasks.delete(taskId);
        if (deleted) {
            console.log(`Deleted task ${taskId}`);
        }
        return deleted;
    }

    /**
     * Get all tasks
     * @returns {Array} - Array of all tasks
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    /**
     * Get tasks by status
     * @param {string} status - Task status
     * @returns {Array} - Array of tasks with the specified status
     */
    getTasksByStatus(status) {
        return Array.from(this.tasks.values()).filter(task => task.status === status);
    }

    /**
     * Get recent results (completed and failed tasks)
     * @param {number} limit - Maximum number of results to return
     * @returns {Array} - Array of recent results
     */
    getRecentResults(limit = 20) {
        const results = Array.from(this.tasks.values())
            .filter(task => task.status === 'completed' || task.status === 'failed')
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, limit);

        return results.map(task => ({
            taskId: task.taskId,
            status: task.status,
            url: task.url,
            quality: task.quality,
            filename: task.filename,
            downloadUrl: task.downloadUrl,
            error: task.error,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
    }

    /**
     * Get task statistics
     * @returns {object} - Task statistics
     */
    getStatistics() {
        const tasks = Array.from(this.tasks.values());
        const stats = {
            total: tasks.length,
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0
        };

        tasks.forEach(task => {
            if (stats.hasOwnProperty(task.status)) {
                stats[task.status]++;
            }
        });

        return stats;
    }

    /**
     * Clean up old tasks to prevent memory leaks
     */
    cleanupOldTasks() {
        if (this.tasks.size <= this.maxTasks) {
            return;
        }

        const tasks = Array.from(this.tasks.values())
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const tasksToRemove = tasks.slice(0, this.tasks.size - this.maxTasks);
        
        tasksToRemove.forEach(task => {
            this.tasks.delete(task.taskId);
            console.log(`Cleaned up old task: ${task.taskId}`);
        });
    }

    /**
     * Start cleanup timer for old completed/failed tasks
     */
    startCleanupTimer() {
        setInterval(() => {
            const now = new Date();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            const tasksToDelete = [];
            
            for (const [taskId, task] of this.tasks.entries()) {
                const taskAge = now - new Date(task.updatedAt);
                
                // Remove old completed or failed tasks
                if ((task.status === 'completed' || task.status === 'failed') && taskAge > maxAge) {
                    tasksToDelete.push(taskId);
                }
            }

            tasksToDelete.forEach(taskId => {
                this.deleteTask(taskId);
            });

            if (tasksToDelete.length > 0) {
                console.log(`Cleaned up ${tasksToDelete.length} old tasks`);
            }
        }, this.cleanupInterval);
    }

    /**
     * Clear all tasks (for testing or reset)
     */
    clearAllTasks() {
        const count = this.tasks.size;
        this.tasks.clear();
        console.log(`Cleared all ${count} tasks`);
    }

    /**
     * Get active tasks count
     * @returns {number} - Number of active tasks
     */
    getActiveTasksCount() {
        return Array.from(this.tasks.values())
            .filter(task => task.status === 'pending' || task.status === 'processing')
            .length;
    }

    /**
     * Check if task exists
     * @param {string} taskId - Task ID
     * @returns {boolean} - Whether task exists
     */
    hasTask(taskId) {
        return this.tasks.has(taskId);
    }
}

export default TaskManager;