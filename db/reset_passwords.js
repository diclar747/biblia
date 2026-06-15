const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('⏳ Restableciendo contraseñas de demostración con hashes correctos...');

    // Generar hashes dinámicamente con bcryptjs
    const adminHash = await bcrypt.hash('admin123', 10);
    const juanHash = await bcrypt.hash('juan123', 10);
    const mariaHash = await bcrypt.hash('maria123', 10);

    // Limpiar usuarios antiguos
    await client.query('DELETE FROM users WHERE id IN (1, 2, 3)');

    // Insertar usuarios con hashes correctos
    await client.query(`
      INSERT INTO users (id, name, email, password, role, default_version_id) VALUES
      (1, 'Administrador', 'admin@biblia.com', $1, 'admin', 1),
      (2, 'Juan Lector', 'juan@biblia.com', $2, 'user', 1),
      (3, 'María Lectora', 'maria@biblia.com', $3, 'user', 2)
    `, [adminHash, juanHash, mariaHash]);

    console.log('✅ Contraseñas de demostración restablecidas con éxito.');
  } catch (error) {
    console.error('❌ Error al restablecer contraseñas:', error.message);
  } finally {
    await client.end();
  }
}

main();
