const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'biblia_buscador',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Helper function to test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a la base de datos MySQL establecida correctamente.');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos MySQL:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
