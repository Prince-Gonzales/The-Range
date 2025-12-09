import dotenv from 'dotenv';
import pg from 'pg'; // Change this import

dotenv.config();

const { Pool } = pg;

// FIX: Use connectionString with SSL for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon.tech
  }
});

export async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        username TEXT UNIQUE,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create User Scores Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_scores (
        username TEXT,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mode TEXT NOT NULL CHECK (mode IN ('Beginner','Intermediate','Professional')),
        best_score INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, mode)
      );
    `);

    // Fix constraints if they are missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_scores_username') THEN
          ALTER TABLE user_scores 
          ADD CONSTRAINT fk_user_scores_username 
          FOREIGN KEY (username) REFERENCES users(username) 
          ON UPDATE CASCADE ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getUserByUsername(username) {
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0] || null;
}

export async function createUser({ firstName, lastName, username, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (first_name, last_name, username, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, first_name, last_name, username`,
    [firstName, lastName, username, passwordHash]
  );
  return rows[0];
}

export async function upsertBestScore(userId, username, mode, score) {
  // Normalize mode string to match database Check Constraint
  const modeDb = mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
  
  const { rows } = await pool.query(
    `INSERT INTO user_scores (user_id, username, mode, best_score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, mode)
     DO UPDATE SET best_score = GREATEST(user_scores.best_score, EXCLUDED.best_score), username = EXCLUDED.username, updated_at = NOW()
     RETURNING best_score`,
    [userId, username, modeDb, score]
  );
  return rows[0];
}

export async function getUserScores(userId) {
  const { rows } = await pool.query(
    `SELECT mode, best_score FROM user_scores WHERE user_id = $1`,
    [userId]
  );
  const result = { beginner: 0, intermediate: 0, professional: 0 };
  for (const r of rows) {
    const key = String(r.mode).toLowerCase();
    if (key in result) result[key] = r.best_score;
  }
  return result;
}

export { pool };