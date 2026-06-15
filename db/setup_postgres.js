const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSqlFile(client, filename) {
  const filePath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`⏳ Ejecutando ${filename}...`);
  await client.query(sql);
  console.log(`✅ ${filename} ejecutado correctamente.`);
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await runSqlFile(client, 'schema.sql');
    await runSqlFile(client, 'seed.sql');
    console.log('🎉 Base de datos configurada exitosamente.');
  } catch (error) {
    console.error('❌ Error al configurar la base de datos:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
