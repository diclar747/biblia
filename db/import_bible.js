// db/import_bible.js
const mysql = require('mysql2/promise');
const https = require('https');
require('dotenv').config();

const BIBLE_URL = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/es_rvr.json';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download Bible JSON, status: ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const cleanData = data.trim().replace(/^\uFEFF/, '');
          resolve(JSON.parse(cleanData));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('⏳ Descargando la Biblia completa en español (RVR1960) desde GitHub...');
  let rawBible;
  try {
    rawBible = await fetchJSON(BIBLE_URL);
    console.log(`✅ Descargada. Libros encontrados: ${rawBible.length}`);
  } catch (error) {
    console.error('❌ Error al descargar la Biblia:', error.message);
    process.exit(1);
  }

  // Conectar a la base de datos
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'biblia_buscador',
    charset: 'utf8mb4'
  });

  try {
    console.log('⏳ Iniciando importación en la base de datos MySQL...');
    
    // Obtener los libros precargados con su orden bíblico
    const [dbBooks] = await connection.query('SELECT id, name, book_order FROM books ORDER BY book_order');
    const bookOrderMap = {};
    dbBooks.forEach(b => {
      bookOrderMap[b.book_order] = b.id;
    });

    // Versión 1 es Reina Valera 1960
    const VERSION_ID = 1;

    // Iterar libros del JSON (hay 66 libros)
    for (let i = 0; i < rawBible.length; i++) {
      const jsonBook = rawBible[i];
      const bookOrder = i + 1;
      const bookId = bookOrderMap[bookOrder];

      if (!bookId) {
        console.log(`⚠️ Advertencia: No se encontró libro en BD con book_order = ${bookOrder}. Saltando.`);
        continue;
      }

      const bookName = jsonBook.name || jsonBook.book;
      const chapters = jsonBook.chapters; // Arreglo de arreglos de versículos

      console.log(`📖 Procesando: ${bookName} (Libro ${bookOrder}/66) con ${chapters.length} capítulos...`);

      // 1. Insertar capítulos del libro en bloque
      const chapterInsertData = [];
      for (let c = 0; c < chapters.length; c++) {
        chapterInsertData.push([bookId, c + 1]);
      }
      
      if (chapterInsertData.length > 0) {
        await connection.query(
          'INSERT IGNORE INTO chapters (book_id, number) VALUES ?',
          [chapterInsertData]
        );
      }

      // 2. Obtener IDs de capítulos creados
      const [dbChapters] = await connection.query(
        'SELECT id, number FROM chapters WHERE book_id = ?',
        [bookId]
      );
      const chapterIdMap = {};
      dbChapters.forEach(ch => {
        chapterIdMap[ch.number] = ch.id;
      });

      // 3. Preparar versículos en bloque
      const verseInsertData = [];
      for (let c = 0; c < chapters.length; c++) {
        const chapterNum = c + 1;
        const chapterId = chapterIdMap[chapterNum];
        const verses = chapters[c]; // Lista de versículos

        for (let v = 0; v < verses.length; v++) {
          const verseNum = v + 1;
          const verseText = verses[v];

          if (verseText && verseText.trim() !== '') {
            verseInsertData.push([chapterId, VERSION_ID, verseNum, verseText.trim()]);
          }
        }
      }

      // 4. Insertar versículos en bloque para este libro (rápido)
      if (verseInsertData.length > 0) {
        await connection.query(
          'INSERT INTO verses (chapter_id, version_id, number, text) VALUES ? ON DUPLICATE KEY UPDATE text=VALUES(text)',
          [verseInsertData]
        );
      }
    }

    console.log('🎉 ¡La Biblia RVR1960 ha sido importada completamente en la base de datos local!');
  } catch (err) {
    console.error('❌ Error durante la importación:', err);
  } finally {
    await connection.end();
  }
}

main();
