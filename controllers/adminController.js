// controllers/adminController.js
const { pool, toPgSql } = require('../db/database');

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

const adminController = {
  // Obtener todos los usuarios registrados
  async getUsers(req, res) {
    try {
      const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los usuarios.' });
    }
  },

  // Agregar una nueva versión de la Biblia
  async addVersion(req, res) {
    const { name, abbreviation } = req.body;

    if (!name || !abbreviation) {
      return res.status(400).json({ error: 'El nombre y la abreviación de la versión son obligatorios.' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO versions (name, abbreviation) VALUES ($1, $2) RETURNING id',
        [name.trim(), abbreviation.trim().toUpperCase()]
      );

      res.status(201).json({
        message: 'Versión bíblica creada con éxito.',
        versionId: result.rows[0].id,
        name: name.trim(),
        abbreviation: abbreviation.trim().toUpperCase()
      });
    } catch (error) {
      console.error(error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Ya existe una versión con esa abreviación.' });
      }
      res.status(500).json({ error: 'Error al crear la versión.' });
    }
  },

  // Importar versículos desde archivo (CSV o JSON)
  async importVerses(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const filename = req.file.originalname;
    let records = [];

    try {
      if (filename.endsWith('.json')) {
        records = JSON.parse(fileContent);
      } else if (filename.endsWith('.csv')) {
        const lines = fileContent.split(/\r?\n/);
        if (lines.length <= 1) {
          return res.status(400).json({ error: 'El archivo CSV está vacío.' });
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
        const bookIdx = headers.indexOf('book');
        const chapIdx = headers.indexOf('chapter');
        const verseIdx = headers.indexOf('verse');
        const verIdx = headers.indexOf('version');
        const textIdx = headers.indexOf('text');

        if (bookIdx === -1 || chapIdx === -1 || verseIdx === -1 || verIdx === -1 || textIdx === -1) {
          return res.status(400).json({ 
            error: 'Formato CSV inválido. Debe contener las columnas: book, chapter, verse, version, text' 
          });
        }

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === '') continue;

          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          const fields = matches.map(f => f.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

          if (fields.length < 5) continue;

          records.push({
            book: fields[bookIdx],
            chapter: parseInt(fields[chapIdx]),
            verse: parseInt(fields[verseIdx]),
            version: fields[verIdx],
            text: fields[textIdx]
          });
        }
      } else {
        return res.status(400).json({ error: 'Formato de archivo no soportado. Suba un archivo .json o .csv' });
      }

      if (records.length === 0) {
        return res.status(400).json({ error: 'No se encontraron registros válidos para importar.' });
      }

      const allBooksResult = await pool.query('SELECT id, name, abbreviation FROM books');
      const allBooks = allBooksResult.rows;
      const bookMap = {};
      allBooks.forEach(b => {
        bookMap[b.name.toLowerCase()] = b.id;
        bookMap[b.abbreviation.toLowerCase()] = b.id;
      });

      const allVersionsResult = await pool.query('SELECT id, abbreviation FROM versions');
      const allVersions = allVersionsResult.rows;
      const versionMap = {};
      allVersions.forEach(v => {
        versionMap[v.abbreviation.toUpperCase()] = v.id;
      });

      let importedCount = 0;
      let skippedCount = 0;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const record of records) {
          let { book, chapter, verse, version, text } = record;
          if (!book || !chapter || !verse || !version || !text) {
            skippedCount++;
            continue;
          }

          const versionKey = version.trim().toUpperCase();
          let versionId = versionMap[versionKey];
          if (!versionId) {
            const verResult = await client.query(
              'INSERT INTO versions (name, abbreviation) VALUES ($1, $2) RETURNING id',
              [`Versión ${versionKey}`, versionKey]
            );
            versionId = verResult.rows[0].id;
            versionMap[versionKey] = versionId;
          }

          const bookKey = book.trim().toLowerCase();
          const bookId = bookMap[bookKey];
          if (!bookId) {
            skippedCount++;
            continue;
          }

          await client.query(
            'INSERT INTO chapters (book_id, number) VALUES ($1, $2) ON CONFLICT (book_id, number) DO NOTHING',
            [bookId, chapter]
          );
          const chaptersResult = await client.query(
            'SELECT id FROM chapters WHERE book_id = $1 AND number = $2',
            [bookId, chapter]
          );
          const chapterId = chaptersResult.rows[0].id;

          await client.query(
            `INSERT INTO verses (chapter_id, version_id, number, text) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (chapter_id, version_id, number) DO UPDATE SET text = EXCLUDED.text`,
            [chapterId, versionId, verse, text.trim()]
          );

          importedCount++;
        }

        await client.query('COMMIT');
        res.json({
          message: 'Importación finalizada correctamente.',
          imported: importedCount,
          skipped: skippedCount
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al procesar la importación.' });
    }
  }
};

module.exports = adminController;
