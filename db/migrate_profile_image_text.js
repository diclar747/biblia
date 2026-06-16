const { pool } = require('./database');

async function migrate() {
  try {
    await pool.query('ALTER TABLE users ALTER COLUMN profile_image TYPE TEXT');
    console.log('✅ Columna profile_image migrada a TEXT.');
  } catch (error) {
    console.error('❌ Error al migrar profile_image:', error.message);
  } finally {
    await pool.end();
  }
}

migrate();
