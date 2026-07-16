// One-off helper script. Run with: node list-courses.js
// Prints every course id, title, and current parent_course_id.

import pool from "./config/database.js";

async function listCourses() {
  try {
    const result = await pool.query(`
      SELECT id, title, parent_course_id, status, created_at
      FROM courses
      WHERE is_active = true AND deleted_at IS NULL
      ORDER BY created_at ASC
    `);

    console.log("Found " + result.rows.length + " course(s):");
    console.log("");
    result.rows.forEach(c => {
      console.log("Title: " + c.title);
      console.log("  id: " + c.id);
      console.log("  parent_course_id: " + (c.parent_course_id || "NULL (top-level)"));
      console.log("  status: " + c.status);
      console.log("---");
    });

  } catch (err) {
    console.error("Failed to list courses:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

listCourses();
