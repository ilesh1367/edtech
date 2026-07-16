// One-off helper script. Run with:
//   node link-course.js <childCourseId> <parentCourseId>

import pool from "./config/database.js";

async function linkCourse() {
  const childId = process.argv[2];
  const parentId = process.argv[3];

  if (!childId || !parentId) {
    console.error("Usage: node link-course.js <childCourseId> <parentCourseId>");
    process.exit(1);
  }

  try {
    const result = await pool.query(
      "UPDATE courses SET parent_course_id = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, parent_course_id",
      [parentId, childId]
    );

    if (result.rows.length === 0) {
      console.error("No course found with that childCourseId.");
    } else {
      console.log("Linked successfully:");
      console.log(result.rows[0]);
    }

  } catch (err) {
    console.error("Failed to link course:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

linkCourse();
