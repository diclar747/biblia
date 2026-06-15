// controllers/adminController.js
const { pool } = require('../db/database');

const adminController = {
  // Obtener todos los usuarios registrados
  async getUsers(req, res) {
    try {
      const [users] = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
      res.json(users);
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
      const [result] = await pool.query(
        'INSERT INTO versions (name, abbreviation) VALUES (?, ?)',
        [name.trim(), abbreviation.trim().toUpperCase()]
      );

      res.status(201).json({
        message: 'Versión bíblica creada con éxito.',
        versionId: result.insertId,
        name: name.trim(),
        abbreviation: abbreviation.trim().toUpperCase()
      });
    } catch (error) {
      console.error(error);
      if (error.code === 'ER_DUP_ENTRY') {
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
      // 1. Procesar archivo según la extensión
      if (filename.endsWith('.json')) {
        records = JSON.parse(fileContent);
      } else if (filename.endsWith('.csv')) {
        // Parsear CSV sencillo
        const lines = fileContent.split(/\r?\n/);
        if (lines.length <= 1) {
          return res.status(400).json({ error: 'El archivo CSV está vacío.' });
        }

        // Leer cabeceras: book, chapter, verse, version, text
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

          // Separar por comas respetando comillas
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

      // Cachear libros y versiones para evitar consultas repetitivas
      const [allBooks] = await pool.query('SELECT id, name, abbreviation FROM books');
      const bookMap = {};
      allBooks.forEach(b => {
        bookMap[b.name.toLowerCase()] = b.id;
        bookMap[b.abbreviation.toLowerCase()] = b.id;
      });

      const [allVersions] = await pool.query('SELECT id, abbreviation FROM versions');
      const versionMap = {};
      allVersions.forEach(v => {
        versionMap[v.abbreviation.toUpperCase()] = v.id;
      });

      let importedCount = 0;
      let skippedCount = 0;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        for (const record of records) {
          let { book, chapter, verse, version, text } = record;
          if (!book || !chapter || !verse || !version || !text) {
            skippedCount++;
            continue;
          }

          // Resolver ID de Versión
          const versionKey = version.trim().toUpperCase();
          let versionId = versionMap[versionKey];
          if (!versionId) {
            // Crear versión si no existe
            const [verResult] = await connection.query(
              'INSERT INTO versions (name, abbreviation) VALUES (?, ?)',
              [`Versión ${versionKey}`, versionKey]
            );
            versionId = verResult.insertId;
            versionMap[versionKey] = versionId;
          }

          // Resolver ID de Libro
          const bookKey = book.trim().toLowerCase();
          const bookId = bookMap[bookKey];
          if (!bookId) {
            // Saltamos si el libro no existe en los 66 libros canónicos precargados
            skippedCount++;
            continue;
          }

          // Resolver/Crear ID de Capítulo
          await connection.query(
            'INSERT IGNORE INTO chapters (book_id, number) VALUES (?, ?)',
            [bookId, chapter]
          );
          const [chapters] = await connection.query(
            'SELECT id FROM chapters WHERE book_id = ? AND number = ?',
            [bookId, chapter]
          );
          const chapterId = chapters[0].id;

          // Insertar o actualizar el versículo
          await connection.query(
            `INSERT INTO verses (chapter_id, version_id, number, text) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE text = VALUES(text)`,
            [chapterId, versionId, verse, text.trim()]
          );

          importedCount++;
        }

        await connection.commit();
        res.json({
          message: 'Importación finalizada correctamente.',
          imported: importedCount,
          skipped: skippedCount
        });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al procesar la importación.' });
    }
  }
};

module.exports = adminController;
