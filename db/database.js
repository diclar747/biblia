const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper function to test connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a la base de datos PostgreSQL establecida correctamente.');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos PostgreSQL:', error.message);
    return false;
  }
}

// Helper para convertir placeholders ? de MySQL a $1, $2, ... de PostgreSQL
function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// Asegura que la columna profile_image sea TEXT para soportar data URIs
async function ensureProfileImageColumn() {
  try {
    const result = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'profile_image'
    `);
    if (result.rows.length === 0) {
      console.warn('⚠️ Columna profile_image no encontrada.');
      return;
    }
    const currentType = result.rows[0].data_type;
    if (currentType !== 'text') {
      await pool.query('ALTER TABLE users ALTER COLUMN profile_image TYPE TEXT');
      console.log('✅ Columna profile_image migrada a TEXT.');
    } else {
      console.log('✅ Columna profile_image ya es TEXT.');
    }
  } catch (error) {
    console.error('❌ Error al verificar/migrar profile_image:', error.message);
  }
}

module.exports = {
  pool,
  testConnection,
  toPgSql,
  ensureProfileImageColumn
};
