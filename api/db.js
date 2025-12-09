const { Pool } = require('pg');
require('dotenv').config();

// Use the DATABASE_URL if available (Production), otherwise use local settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

module.exports = pool;