import express from "express";
import pool from "../config/database.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ============================================================
// POST /api/quiz/create
// Body: { moduleId, title, description, questions: [{ question_text, options: [...], correct_option_index }] }
// Only the course creator (educator who owns the module's course) can create.
// ============================================================
router.post("/create", authMiddleware, async (req, res) => {
    const { moduleId, title, description, questions } = req.body;

    if (!moduleId || !title || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "moduleId, title and at least one question are required" });
    }

    // authMiddleware resolves req.isCourseCreator when moduleId is present in body?
    // It only reads req.params/req.query for moduleId, not req.body — so we verify manually here.
    const moduleCheck = await pool.query(`
        SELECT c.educator_id
        FROM modules m
        JOIN courses c ON m.course_id = c.id
        WHERE m.id = $1 AND m.is_active = true
    `, [moduleId]);

    if (moduleCheck.rows.length === 0) {
        return res.status(404).json({ error: "Module not found" });
    }
    if (moduleCheck.rows[0].educator_id !== req.user.id) {
        return res.status(403).json({ error: "Only the course creator can add quizzes" });
    }

    for (const q of questions) {
        if (!q.question_text || !Array.isArray(q.options) || q.options.length < 2) {
            return res.status(400).json({ error: "Each question needs text and at least 2 options" });
        }
        if (
            typeof q.correct_option_index !== "number" ||
            q.correct_option_index < 0 ||
            q.correct_option_index >= q.options.length
        ) {
            return res.status(400).json({ error: "Each question needs a valid correct_option_index" });
        }
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const quizResult = await client.query(`
            INSERT INTO quizzes (module_id, title, description, created_by)
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [moduleId, title, description || "", req.user.id]);

        const quiz = quizResult.rows[0];

        for (const q of questions) {
            await client.query(`
                INSERT INTO quiz_questions (quiz_id, question_text, options, correct_option_index)
                VALUES ($1, $2, $3, $4)
            `, [quiz.id, q.question_text, JSON.stringify(q.options), q.correct_option_index]);
        }

        await client.query("COMMIT");
        res.status(201).json({ success: true, quiz });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Quiz create error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ============================================================
// GET /api/quiz/module/:moduleId
// Lists quizzes for a module (title/description/question count only — no answers).
// ============================================================
router.get("/module/:moduleId", authMiddleware, async (req, res) => {
    try {
        const { moduleId } = req.params;
        const result = await pool.query(`
            SELECT q.id, q.title, q.description, q.created_at,
                   COUNT(qq.id)::int AS question_count
            FROM quizzes q
            LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
            WHERE q.module_id = $1
            GROUP BY q.id
            ORDER BY q.created_at DESC
        `, [moduleId]);

        res.json({ success: true, quizzes: result.rows });
    } catch (err) {
        console.error("Quiz list error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/quiz/:id
// Returns quiz + questions. Correct answers are stripped unless
// the requester is the course creator (so students can take it blind).
// ============================================================
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const quizResult = await pool.query(`
            SELECT q.*, c.educator_id
            FROM quizzes q
            JOIN modules m ON q.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE q.id = $1
        `, [id]);

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ error: "Quiz not found" });
        }

        const quiz = quizResult.rows[0];
        const isOwner = quiz.educator_id === req.user.id;

        const questionsResult = await pool.query(`
            SELECT id, question_text, options, correct_option_index
            FROM quiz_questions WHERE quiz_id = $1 ORDER BY created_at ASC
        `, [id]);

        const questions = questionsResult.rows.map((q) => ({
            id: q.id,
            question_text: q.question_text,
            options: q.options,
            ...(isOwner ? { correct_option_index: q.correct_option_index } : {})
        }));

        res.json({
            success: true,
            quiz: { id: quiz.id, title: quiz.title, description: quiz.description, module_id: quiz.module_id },
            questions,
            isOwner
        });
    } catch (err) {
        console.error("Quiz fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// POST /api/quiz/:id/submit
// Body: { answers: { [questionId]: selectedIndex } }
// Scores the attempt server-side (so answers never leak to the client).
// ============================================================
router.post("/:id/submit", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body;

        if (!answers || typeof answers !== "object") {
            return res.status(400).json({ error: "answers object is required" });
        }

        const questionsResult = await pool.query(`
            SELECT id, correct_option_index FROM quiz_questions WHERE quiz_id = $1
        `, [id]);

        if (questionsResult.rows.length === 0) {
            return res.status(404).json({ error: "Quiz not found or has no questions" });
        }

        let correctCount = 0;
        for (const q of questionsResult.rows) {
            if (answers[q.id] === q.correct_option_index) correctCount++;
        }

        res.json({
            success: true,
            total: questionsResult.rows.length,
            correct: correctCount,
            score: Math.round((correctCount / questionsResult.rows.length) * 100)
        });
    } catch (err) {
        console.error("Quiz submit error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// DELETE /api/quiz/:id
// ============================================================
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const quizCheck = await pool.query(`
            SELECT c.educator_id
            FROM quizzes q
            JOIN modules m ON q.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE q.id = $1
        `, [id]);

        if (quizCheck.rows.length === 0) {
            return res.status(404).json({ error: "Quiz not found" });
        }
        if (quizCheck.rows[0].educator_id !== req.user.id) {
            return res.status(403).json({ error: "Only the course creator can delete this quiz" });
        }

        await pool.query(`DELETE FROM quizzes WHERE id = $1`, [id]);
        res.json({ success: true, message: "Quiz deleted" });
    } catch (err) {
        console.error("Quiz delete error:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;