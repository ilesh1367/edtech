import express from "express";
import pool from "../config/database.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// POST /api/video/progress
router.post("/progress", authMiddleware, async (req, res) => {
    try {
        const { contentId, courseId, position } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        if (!contentId || !courseId) {
            return res.status(400).json({ error: "contentId and courseId are required" });
        }
        
        if (position === undefined || position < 0) {
            return res.status(400).json({ error: "Valid position is required" });
        }

        const isAdmin = userRole === 'admin';
        
        // Check if the user is the creator of the course
        const courseCheck = await pool.query(
            `SELECT educator_id FROM courses WHERE id = $1`,
            [courseId]
        );
        const isCreator = courseCheck.rows.length > 0 && 
                          (userRole === 'educator' && courseCheck.rows[0].educator_id === userId);

        // Check video metadata for free preview and max total duration
        const contentCheck = await pool.query(
            `SELECT preview, duration_seconds FROM content_items WHERE id = $1 AND is_active = true`,
            [contentId]
        );
        
        if (contentCheck.rows.length === 0) {
            return res.status(404).json({ error: "Video asset not found" });
        }
        
        const isPreviewVideo = contentCheck.rows[0].preview === true;
        const videoDuration = contentCheck.rows[0].duration_seconds || 0;

        // Enforce active course enrollment validation checks
        if (!isAdmin && !isCreator && !isPreviewVideo) {
            const enrollmentCheck = await pool.query(
                `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = 'active'`,
                [userId, courseId]
            );
            
            if (enrollmentCheck.rows.length === 0) {
                return res.status(403).json({ error: "Not authorized or enrolled in this course" });
            }
        }
        
        // 🚀 FIX: Automatically handle completion flags. 
        // If they are within 5 seconds of the end or past the video length, mark it completed.
        const isCompleted = videoDuration > 0 && (position >= videoDuration - 5);
        
        // Upsert progress cleanly
        // Note: Ensure your 'video_progress' table structure has an 'is_completed' BOOLEAN column.
        await pool.query(`
            INSERT INTO video_progress (user_id, content_id, course_id, position, is_completed, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (user_id, content_id) 
            DO UPDATE SET 
                position = EXCLUDED.position,
                is_completed = CASE WHEN video_progress.is_completed = true THEN true ELSE EXCLUDED.is_completed END,
                updated_at = NOW()
        `, [userId, contentId, courseId, position, isCompleted]);
        
        res.json({ 
            success: true, 
            message: "Progress saved",
            isCompleted 
        });
        
    } catch (err) {
        console.error("Save progress error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/video/progress/:contentId
router.get("/progress/:contentId", authMiddleware, async (req, res) => {
    try {
        const { contentId } = req.params;
        const { courseId } = req.query; 
        const userId = req.user.id;
        const userRole = req.user.role;
        
        if (!courseId) {
            return res.status(400).json({ error: "courseId query parameter is required for access verification" });
        }

        const isAdmin = userRole === 'admin';

        const courseCheck = await pool.query(
            `SELECT educator_id FROM courses WHERE id = $1`,
            [courseId]
        );
        const isCreator = courseCheck.rows.length > 0 && 
                          (userRole === 'educator' && courseCheck.rows[0].educator_id === userId);

        const contentCheck = await pool.query(
            `SELECT preview FROM content_items WHERE id = $1 AND is_active = true`,
            [contentId]
        );
        const isPreviewVideo = contentCheck.rows.length > 0 && contentCheck.rows[0].preview === true;

        if (!isAdmin && !isCreator && !isPreviewVideo) {
            const enrollmentCheck = await pool.query(
                `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = 'active'`,
                [userId, courseId]
            );
            
            if (enrollmentCheck.rows.length === 0) {
                return res.status(403).json({ error: "Not authorized to read watch history records for this course" });
            }
        }
        
        const result = await pool.query(`
            SELECT position, is_completed, updated_at
            FROM video_progress
            WHERE user_id = $1 AND content_id = $2
        `, [userId, contentId]);
        
        if (result.rows.length === 0) {
            return res.json({ 
                hasProgress: false, 
                position: 0,
                isCompleted: false
            });
        }
        
        res.json({
            hasProgress: true,
            position: result.rows[0].position,
            isCompleted: result.rows[0].is_completed || false,
            lastUpdated: result.rows[0].updated_at
        });
        
    } catch (err) {
        console.error("Get progress error:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;