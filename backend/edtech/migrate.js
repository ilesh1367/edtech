// One-off migration script. Run with: node migrate.js
// Adds any missing columns used by the dashboard's course-hierarchy and
// arrange/priority features. Safe to run multiple times -- it checks
// before adding each column, so nothing breaks if some already exist.

import pool from "./config/database.js";

async function ensureColumn(columnName, columnDefinitionSql) {
  const check = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = $1
  `, [columnName]);

  if (check.rows.length > 0) {
    console.log(`Column '${columnName}' already exists. Nothing to do.`);
  } else {
    console.log(`Column '${columnName}' not found. Adding it now...`);
    await pool.query(`ALTER TABLE courses ADD COLUMN ${columnDefinitionSql}`);
    console.log(`Column '${columnName}' added successfully.`);
  }
}

async function migrate() {
  try {
    console.log("Checking required columns on the courses table...");
    console.log("");

    // Links a sub-course (e.g. "Mathematics") to its parent (e.g. "9th Class").
    await ensureColumn("parent_course_id", "parent_course_id UUID REFERENCES courses(id) DEFAULT NULL");

    // Stores the mentor's manual priority/order for arranging courses.
    await ensureColumn("display_order", "display_order INTEGER DEFAULT 0");

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