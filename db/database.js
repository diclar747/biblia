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

module.exports = {
  pool,
  testConnection,
  toPgSql
};
