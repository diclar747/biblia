const { pool, toPgSql } = require('../db/database');

// Algoritmo de distancia de Levenshtein para coincidencia difusa de libros
function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Normaliza un texto para comparaciones sin acentos ni mayúsculas
function normalizeText(str) {
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

// Encontrar la mejor coincidencia de libro con tolerancia a errores ortográficos
function findBestBookMatch(typedName, books) {
  const cleanTyped = normalizeText(typedName);

  let bestMatch = null;
  let minScore = 999;

  for (const book of books) {
    const cleanBookName = normalizeText(book.name);
    const cleanBookAbbr = normalizeText(book.abbreviation);

    if (cleanTyped === cleanBookName || cleanTyped === cleanBookAbbr) {
      return book;
    }

    if (cleanBookName.startsWith(cleanTyped) || cleanTyped.startsWith(cleanBookName)) {
      return book;
    }

    const dist = getLevenshteinDistance(cleanTyped, cleanBookName);

    let prefixMatch = 0;
    for (let i = 0; i < Math.min(cleanTyped.length, cleanBookName.length); i++) {
      if (cleanTyped[i] === cleanBookName[i]) {
        prefixMatch++;
      } else {
        break;
      }
    }

    const score = dist - prefixMatch;

    if (score < minScore) {
      minScore = score;
      bestMatch = book;
    }
  }

  if (bestMatch) {
    const baseDist = getLevenshteinDistance(cleanTyped, normalizeText(bestMatch.name));
    if (baseDist <= Math.max(3, bestMatch.name.length / 2)) {
      return bestMatch;
    }
  }

  return null;
}

const bibleController = {
  // Obtener todas las versiones de la Biblia
  async getVersions(req, res) {
    try {
      const result = await pool.query('SELECT id, name, abbreviation FROM versions ORDER BY name');
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener versiones de la Biblia.' });
    }
  },

  // Obtener todos los libros
  async getBooks(req, res) {
    try {
      const result = await pool.query('SELECT id, name, abbreviation, testament, book_order FROM books ORDER BY book_order');
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los libros bíblicos.' });
    }
  },

  // Obtener capítulos de un libro
  async getChapters(req, res) {
    const { bookId } = req.params;
    try {
      const result = await pool.query('SELECT id, number FROM chapters WHERE book_id = $1 ORDER BY number', [bookId]);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los capítulos del libro.' });
    }
  },

  // Obtener versículos de un capítulo para una versión específica
  async getVerses(req, res) {
    const { bookId, chapterNumber } = req.params;
    const versionId = req.query.version_id || 1;

    try {
      let result = await pool.query(
        `SELECT v.id, v.number, v.text, vt.abbreviation as version, b.name as book_name, c.number as chapter_number 
         FROM verses v 
         JOIN chapters c ON v.chapter_id = c.id 
         JOIN books b ON c.book_id = b.id 
         JOIN versions vt ON v.version_id = vt.id 
         WHERE b.id = $1 AND c.number = $2 AND v.version_id = $3 
         ORDER BY v.number`,
        [bookId, chapterNumber, versionId]
      );

      if (result.rows.length === 0 && Number(versionId) !== 1) {
        const fallbackResult = await pool.query(
          `SELECT v.id, v.number, v.text, vt.abbreviation as version, b.name as book_name, c.number as chapter_number 
           FROM verses v 
           JOIN chapters c ON v.chapter_id = c.id 
           JOIN books b ON c.book_id = b.id 
           JOIN versions vt ON v.version_id = vt.id 
           WHERE b.id = $1 AND c.number = $2 AND v.version_id = 1 
           ORDER BY v.number`,
          [bookId, chapterNumber]
        );
        result = fallbackResult;
      }

      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los versículos.' });
    }
  },

  // Buscador inteligente y avanzado
  async search(req, res) {
    const { q, version_id, book_id, testament, tag, limit = 20, offset = 0 } = req.query;
    
    try {
      const citationRegex = /^([1-3]?\s*[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)\s+(\d+)(?:(?:\s*:\s*|\s+)(\d+))?(?:\s*[-–]\s*(\d+))?$/;
      const citationMatch = q ? q.trim().match(citationRegex) : null;
      
      let parsedCitation = null;
      if (citationMatch) {
        const typedBook = citationMatch[1].trim();
        const chapterNum = parseInt(citationMatch[2]);
        const verseNum = citationMatch[3] ? parseInt(citationMatch[3]) : null;
        const endVerseNum = citationMatch[4] ? parseInt(citationMatch[4]) : null;
        
        const allBooksResult = await pool.query('SELECT id, name, abbreviation FROM books');
        const matchedBook = findBestBookMatch(typedBook, allBooksResult.rows);
        
        if (matchedBook) {
          parsedCitation = {
            book_id: matchedBook.id,
            book_name: matchedBook.name,
            chapter: chapterNum,
            verse: verseNum,
            end_verse: endVerseNum
          };
        }
      }

      if (parsedCitation) {
        const effectiveVersionId = version_id ? Number(version_id) : 1;
        const chapterSql = `
          SELECT 
            v.id, 
            v.number, 
            v.text, 
            vt.abbreviation as version, 
            b.name as book_name, 
            b.id as book_id,
            c.number as chapter_number,
            (SELECT STRING_AGG(t.name, ',') FROM verse_tags vt3 JOIN tags t ON vt3.tag_id = t.id WHERE vt3.verse_id = v.id) as tags
          FROM verses v
          JOIN chapters c ON v.chapter_id = c.id
          JOIN books b ON c.book_id = b.id
          JOIN versions vt ON v.version_id = vt.id
          WHERE b.id = $1 AND c.number = $2 AND v.version_id = $3
          ORDER BY v.number
        `;

        let result = await pool.query(chapterSql, [parsedCitation.book_id, parsedCitation.chapter, effectiveVersionId]);

        if (result.rows.length === 0 && effectiveVersionId !== 1) {
          result = await pool.query(chapterSql, [parsedCitation.book_id, parsedCitation.chapter, 1]);
        }

        const verses = result.rows;
        const matchedIds = [];
        if (parsedCitation.verse) {
          const start = parsedCitation.verse;
          const end = parsedCitation.end_verse || parsedCitation.verse;
          verses.forEach(v => {
            if (v.number >= start && v.number <= end) {
              matchedIds.push(v.id);
            }
          });
        }
        parsedCitation.matched_verse_ids = matchedIds;

        if (q && q.trim() !== '' && offset == 0) {
          if (req.user) {
            await pool.query('INSERT INTO search_history (user_id, query) VALUES ($1, $2)', [req.user.id, q.trim()]);
          } else {
            await pool.query('INSERT INTO search_history (user_id, query) VALUES (NULL, $1)', [q.trim()]);
          }
        }

        return res.json({
          total: verses.length,
          results: verses,
          limit: verses.length,
          offset: 0,
          parsed_citation: parsedCitation
        });
      }

      let queryParts = [];
      let queryParams = [];

      if (q && q.trim() !== '') {
        const keywords = q.trim().split(/\s+/);
        keywords.forEach(word => {
          queryParts.push('v.text ILIKE ?');
          queryParams.push(`%${word}%`);
        });
      }

      if (version_id) {
        queryParts.push('v.version_id = ?');
        queryParams.push(version_id);
      }

      if (book_id) {
        queryParts.push('c.book_id = ?');
        queryParams.push(book_id);
      }

      if (testament) {
        queryParts.push('b.testament = ?');
        queryParams.push(testament);
      }

      if (tag) {
        queryParts.push('v.id IN (SELECT vt2.verse_id FROM verse_tags vt2 JOIN tags t2 ON vt2.tag_id = t2.id WHERE t2.name = ? OR t2.id::text = ?)');
        queryParams.push(tag, tag);
      }

      let sql = `
        SELECT 
          v.id, 
          v.number, 
          v.text, 
          vt.abbreviation as version, 
          b.name as book_name, 
          b.id as book_id,
          c.number as chapter_number,
          (SELECT STRING_AGG(t.name, ',') FROM verse_tags vt3 JOIN tags t ON vt3.tag_id = t.id WHERE vt3.verse_id = v.id) as tags
        FROM verses v
        JOIN chapters c ON v.chapter_id = c.id
        JOIN books b ON c.book_id = b.id
        JOIN versions vt ON v.version_id = vt.id
      `;

      if (queryParts.length > 0) {
        sql += ' WHERE ' + queryParts.join(' AND ');
      }

      sql += ' ORDER BY b.book_order, c.number, v.number';
      
      let countSql = `SELECT COUNT(*) as total FROM (${sql}) as results`;
      const pgCountSql = toPgSql(countSql);
      const countResult = await pool.query(pgCountSql, queryParams);
      let total = parseInt(countResult.rows[0].total);

      if (total === 0 && version_id && Number(version_id) !== 1) {
        queryParts = [];
        queryParams = [];
        
        if (q && q.trim() !== '') {
          const keywords = q.trim().split(/\s+/);
          keywords.forEach(word => {
            queryParts.push('v.text ILIKE ?');
            queryParams.push(`%${word}%`);
          });
        }
        
        queryParts.push('v.version_id = ?');
        queryParams.push(1);
        
        if (book_id) {
          queryParts.push('c.book_id = ?');
          queryParams.push(book_id);
        }
        if (testament) {
          queryParts.push('b.testament = ?');
          queryParams.push(testament);
        }
        if (tag) {
          queryParts.push('v.id IN (SELECT vt2.verse_id FROM verse_tags vt2 JOIN tags t2 ON vt2.tag_id = t2.id WHERE t2.name = ? OR t2.id::text = ?)');
          queryParams.push(tag, tag);
        }
        
        sql = `
          SELECT 
            v.id, 
            v.number, 
            v.text, 
            vt.abbreviation as version, 
            b.name as book_name, 
            b.id as book_id,
            c.number as chapter_number,
            (SELECT STRING_AGG(t.name, ',') FROM verse_tags vt3 JOIN tags t ON vt3.tag_id = t.id WHERE vt3.verse_id = v.id) as tags
          FROM verses v
          JOIN chapters c ON v.chapter_id = c.id
          JOIN books b ON c.book_id = b.id
          JOIN versions vt ON v.version_id = vt.id
        `;
        if (queryParts.length > 0) {
          sql += ' WHERE ' + queryParts.join(' AND ');
        }
        sql += ' ORDER BY b.book_order, c.number, v.number';
        
        countSql = `SELECT COUNT(*) as total FROM (${sql}) as results`;
        const pgFallbackCountSql = toPgSql(countSql);
        const fallbackCountResult = await pool.query(pgFallbackCountSql, queryParams);
        total = parseInt(fallbackCountResult.rows[0].total);
      }

      sql += ' LIMIT ? OFFSET ?';
      queryParams.push(Number(limit), Number(offset));

      const pgSql = toPgSql(sql);
      const result = await pool.query(pgSql, queryParams);

      if (q && q.trim() !== '' && offset == 0) {
        if (req.user) {
          await pool.query('INSERT INTO search_history (user_id, query) VALUES ($1, $2)', [req.user.id, q.trim()]);
        } else {
          await pool.query('INSERT INTO search_history (user_id, query) VALUES (NULL, $1)', [q.trim()]);
        }
      }

      res.json({
        total,
        results: result.rows,
        limit: Number(limit),
        offset: Number(offset),
        parsed_citation: parsedCitation
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al realizar la búsqueda.' });
    }
  },

  // Auto-sugerencias mientras escribe el usuario
  async getSuggestions(req, res) {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.json([]);
    }

    const searchTerm = q.trim();

    try {
      const suggestions = [];

      // Cargar todos los libros una sola vez para búsqueda con/sin acentos y para citas
      const allBooksResult = await pool.query(
        'SELECT id, name, abbreviation, book_order FROM books ORDER BY book_order'
      );
      const allBooks = allBooksResult.rows;
      const normalizedSearch = normalizeText(searchTerm);

      // 1. Buscar coincidencia con nombres/abreviaturas de libros (ignora acentos y espacios)
      const matchingBooks = allBooks.filter(b => {
        const normName = normalizeText(b.name);
        const normAbbr = normalizeText(b.abbreviation);
        return normName.startsWith(normalizedSearch) || normAbbr.startsWith(normalizedSearch);
      }).slice(0, 3);
      matchingBooks.forEach(b => {
        suggestions.push({ type: 'book', label: b.name, data: { book_id: b.id } });
      });

      // 2. Detectar cita parcial: "Marcos 5", "Marcos 5:", "Marcos 5:4", "Marcos 5:4-6"
      const citationRegex = /^([1-3]?\s*[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)\s+(\d+):?\s*(\d+)?(?:\s*[-–]\s*(\d+))?$/;
      const citationMatch = searchTerm.match(citationRegex);

      if (citationMatch) {
        const typedBook = citationMatch[1].trim();
        const chapterNum = parseInt(citationMatch[2]);
        const verseNum = citationMatch[3] ? parseInt(citationMatch[3]) : null;
        const endVerseNum = citationMatch[4] ? parseInt(citationMatch[4]) : null;

        const matchedBook = findBestBookMatch(typedBook, allBooks);

        if (matchedBook) {
          if (verseNum && endVerseNum) {
            // Sugerir rango de versículos
            suggestions.unshift({
              type: 'verse',
              label: `${matchedBook.name} ${chapterNum}:${verseNum}-${endVerseNum}`,
              data: { book_id: matchedBook.id, chapter: chapterNum, verse: verseNum, end_verse: endVerseNum }
            });
          } else if (verseNum) {
            // Sugerir versículo exacto
            suggestions.unshift({
              type: 'verse',
              label: `${matchedBook.name} ${chapterNum}:${verseNum}`,
              data: { book_id: matchedBook.id, chapter: chapterNum, verse: verseNum }
            });
          } else {
            // Sugerir capítulo
            suggestions.unshift({
              type: 'chapter',
              label: `${matchedBook.name} ${chapterNum}`,
              data: { book_id: matchedBook.id, chapter: chapterNum }
            });

            // Si escribió "Libro Cap:", sugerir los primeros versículos del capítulo
            if (searchTerm.includes(':')) {
              const versesResult = await pool.query(
                `SELECT v.number as verse
                 FROM verses v
                 JOIN chapters c ON v.chapter_id = c.id
                 WHERE c.book_id = $1 AND c.number = $2 AND v.version_id = 1
                 ORDER BY v.number
                 LIMIT 5`,
                [matchedBook.id, chapterNum]
              );
              versesResult.rows.forEach(v => {
                suggestions.push({
                  type: 'verse',
                  label: `${matchedBook.name} ${chapterNum}:${v.verse}`,
                  data: { book_id: matchedBook.id, chapter: chapterNum, verse: v.verse }
                });
              });
            }
          }
        }
      }

      // 3. Buscar etiquetas coincidentes
      const tagsResult = await pool.query(
        'SELECT name FROM tags WHERE name ILIKE $1 LIMIT 3',
        [`${searchTerm}%`]
      );
      tagsResult.rows.forEach(t => {
        suggestions.push({ type: 'tag', label: `Tema: ${t.name}`, data: { tag: t.name } });
      });

      // 4. Buscar palabras clave populares en el texto bíblico
      if (suggestions.length < 5) {
        const versesResult = await pool.query(
          `SELECT DISTINCT b.name as book_name, c.number as chapter, v.number as verse 
           FROM verses v 
           JOIN chapters c ON v.chapter_id = c.id
           JOIN books b ON c.book_id = b.id
           WHERE v.text ILIKE $1 LIMIT 3`,
          [`%${searchTerm}%`]
        );
        versesResult.rows.forEach(v => {
          suggestions.push({
            type: 'verse',
            label: `${v.book_name} ${v.chapter}:${v.verse}`,
            data: { book_name: v.book_name, chapter: v.chapter, verse: v.verse }
          });
        });
      }

      res.json(suggestions.slice(0, 7));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener sugerencias.' });
    }
  },

  // Versículo del día (consistente para la misma fecha)
  async getVerseOfTheDay(req, res) {
    try {
      const countResult = await pool.query('SELECT COUNT(*) as total FROM verses WHERE version_id = 1');
      const total = parseInt(countResult.rows[0].total);

      if (total === 0) {
        return res.status(404).json({ error: 'No hay versículos disponibles para el Versículo del Día.' });
      }

      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now - start;
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);

      const offset = dayOfYear % total;

      const result = await pool.query(
        `SELECT 
          v.id, 
          v.number, 
          v.text, 
          vt.abbreviation as version, 
          b.name as book_name, 
          b.id as book_id,
          c.number as chapter_number
        FROM verses v
        JOIN chapters c ON v.chapter_id = c.id
        JOIN books b ON c.book_id = b.id
        JOIN versions vt ON v.version_id = vt.id
        WHERE v.version_id = 1
        LIMIT 1 OFFSET $1`,
        [offset]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener el versículo del día.' });
    }
  },

  // Comparar un versículo específico en varias versiones
  async compareVerse(req, res) {
    const { bookId, chapterNumber, verseNumber } = req.params;

    try {
      const result = await pool.query(
        `SELECT v.text, vt.name as version_name, vt.abbreviation as version_abbreviation
         FROM verses v
         JOIN chapters c ON v.chapter_id = c.id
         JOIN versions vt ON v.version_id = vt.id
         WHERE c.book_id = $1 AND c.number = $2 AND v.number = $3`,
        [bookId, chapterNumber, verseNumber]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Versículo no encontrado.' });
      }
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al comparar el versículo.' });
    }
  },

  // Obtener historial de búsquedas del usuario
  async getSearchHistory(req, res) {
    try {
      const result = await pool.query(
        'SELECT id, query, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
        [req.user.id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener el historial de búsqueda.' });
    }
  },

  // Borrar historial de búsquedas
  async clearSearchHistory(req, res) {
    try {
      await pool.query('DELETE FROM search_history WHERE user_id = $1', [req.user.id]);
      res.json({ message: 'Historial de búsqueda eliminado.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar el historial de búsqueda.' });
    }
  }
};

module.exports = bibleController;
