const { Client } = require('pg');
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

// Genera placeholders ($1,$2,...$N) para bulk insert
function generatePlaceholders(rowCount, colCount, startAt = 1) {
  const rows = [];
  let index = startAt;
  for (let r = 0; r < rowCount; r++) {
    const cols = [];
    for (let c = 0; c < colCount; c++) {
      cols.push(`$${index++}`);
    }
    rows.push(`(${cols.join(', ')})`);
  }
  return { placeholders: rows.join(', '), nextIndex: index };
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
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('⏳ Iniciando importación en la base de datos PostgreSQL...');

    // Obtener los libros precargados con su orden bíblico
    const dbBooksResult = await client.query('SELECT id, name, book_order FROM books ORDER BY book_order');
    const dbBooks = dbBooksResult.rows;
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
        chapterInsertData.push(bookId, c + 1);
      }

      if (chapterInsertData.length > 0) {
        const { placeholders } = generatePlaceholders(chapters.length, 2);
        await client.query(
          `INSERT INTO chapters (book_id, number) VALUES ${placeholders} ON CONFLICT (book_id, number) DO NOTHING`,
          chapterInsertData
        );
      }

      // 2. Obtener IDs de capítulos creados
      const dbChaptersResult = await client.query(
        'SELECT id, number FROM chapters WHERE book_id = $1',
        [bookId]
      );
      const dbChapters = dbChaptersResult.rows;
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
            verseInsertData.push(chapterId, VERSION_ID, verseNum, verseText.trim());
          }
        }
      }

      // 4. Insertar versículos en bloque para este libro (rápido)
      if (verseInsertData.length > 0) {
        const rowCount = verseInsertData.length / 4;
        const { placeholders } = generatePlaceholders(rowCount, 4);
        await client.query(
          `INSERT INTO verses (chapter_id, version_id, number, text) VALUES ${placeholders}
           ON CONFLICT (chapter_id, version_id, number) DO UPDATE SET text = EXCLUDED.text`,
          verseInsertData
        );
      }
    }

    console.log('🎉 ¡La Biblia RVR1960 ha sido importada completamente en la base de datos PostgreSQL!');
  } catch (err) {
    console.error('❌ Error durante la importación:', err);
  } finally {
    await client.end();
  }
}

main();
