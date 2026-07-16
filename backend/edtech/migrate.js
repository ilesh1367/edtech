// One-off migration script. Run once with: node migrate.js
// Adds the parent_course_id column used for linking sub-courses to a
// parent course. Safe to run multiple times (checks before adding).

import pool from "./config/database.js";

async function migrate() {
  try {
    console.log("Checking for parent_course_id column...");

    const check = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'courses' AND column_name = 'parent_course_id'
    `);

    if (check.rows.length > 0) {
      console.log("Column parent_course_id already exists. Nothing to do.");
    } else {
      console.log("Column not found. Adding it now...");
      await pool.query(`
        ALTER TABLE courses
        ADD COLUMN parent_course_id UUID REFERENCES courses(id) DEFAULT NULL
      `);
      console.log("Column parent_course_id added successfully.");
    }

    const verify = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'courses'
      ORDER BY ordinal_position
    `);
    console.log("");
    console.log("Current courses table columns:");
    verify.rows.forEach(r => console.log(" - " + r.column_name + " (" + r.data_type + ")"));

  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrate();
