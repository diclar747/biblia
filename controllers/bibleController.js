const { pool } = require('../db/database');

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
          matrix[i - 1][j - 1] + 1, // sustitución
          matrix[i][j - 1] + 1,     // inserción
          matrix[i - 1][j] + 1      // eliminación
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Encontrar la mejor coincidencia de libro con tolerancia a errores ortográficos
function findBestBookMatch(typedName, books) {
  const cleanTyped = typedName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
  
  let bestMatch = null;
  let minScore = 999;
  
  for (const book of books) {
    const cleanBookName = book.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    const cleanBookAbbr = book.abbreviation.toLowerCase();
    
    // 1. Coincidencia exacta o de abreviatura
    if (cleanTyped === cleanBookName || cleanTyped === cleanBookAbbr) {
      return book;
    }
    
    // 2. Empieza con
    if (cleanBookName.startsWith(cleanTyped) || cleanTyped.startsWith(cleanBookName)) {
      return book;
    }
    
    // 3. Levenshtein + Prefijos
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
    const baseDist = getLevenshteinDistance(cleanTyped, bestMatch.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    // Permitir tolerancia proporcional al tamaño del nombre del libro (máx 3 dist o la mitad del nombre)
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
      const [versions] = await pool.query('SELECT id, name, abbreviation FROM versions ORDER BY name');
      res.json(versions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener versiones de la Biblia.' });
    }
  },

  // Obtener todos los libros
  async getBooks(req, res) {
    try {
      const [books] = await pool.query('SELECT id, name, abbreviation, testament, book_order FROM books ORDER BY book_order');
      res.json(books);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los libros bíblicos.' });
    }
  },

  // Obtener capítulos de un libro
  async getChapters(req, res) {
    const { bookId } = req.params;
    try {
      const [chapters] = await pool.query('SELECT id, number FROM chapters WHERE book_id = ? ORDER BY number', [bookId]);
      res.json(chapters);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los capítulos del libro.' });
    }
  },

  // Obtener versículos de un capítulo para una versión específica
  async getVerses(req, res) {
    const { bookId, chapterNumber } = req.params;
    const versionId = req.query.version_id || 1; // 1 = RVR1960 por defecto

    try {
      let [verses] = await pool.query(
        `SELECT v.id, v.number, v.text, vt.abbreviation as version, b.name as book_name, c.number as chapter_number 
         FROM verses v 
         JOIN chapters c ON v.chapter_id = c.id 
         JOIN books b ON c.book_id = b.id 
         JOIN versions vt ON v.version_id = vt.id 
         WHERE b.id = ? AND c.number = ? AND v.version_id = ? 
         ORDER BY v.number`,
        [bookId, chapterNumber, versionId]
      );

      // Smart Fallback: Si la versión solicitada (ej: NVI) no tiene versículos para este capítulo,
      // reintentar con la versión 1 (RVR1960) para no dejar al usuario con pantalla vacía.
      if (verses.length === 0 && Number(versionId) !== 1) {
        const [fallbackVerses] = await pool.query(
          `SELECT v.id, v.number, v.text, vt.abbreviation as version, b.name as book_name, c.number as chapter_number 
           FROM verses v 
           JOIN chapters c ON v.chapter_id = c.id 
           JOIN books b ON c.book_id = b.id 
           JOIN versions vt ON v.version_id = vt.id 
           WHERE b.id = ? AND c.number = ? AND v.version_id = 1 
           ORDER BY v.number`,
          [bookId, chapterNumber]
        );
        verses = fallbackVerses;
      }

      res.json(verses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los versículos.' });
    }
  },

  // Buscador inteligente y avanzado
  async search(req, res) {
    const { q, version_id, book_id, testament, tag, limit = 20, offset = 0 } = req.query;
    
    try {
      // 1. Verificar si la consulta tiene formato de cita (ej: "Juan 3 16", "juna 3:16", "Génesis 1", "Lucas 2:5-10")
      const citationRegex = /^([1-3]?\s*[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)\s+(\d+)(?:(?:\s*:\s*|\s+)(\d+))?(?:\s*[-–]\s*(\d+))?$/;
      const citationMatch = q ? q.trim().match(citationRegex) : null;
      
      let parsedCitation = null;
      if (citationMatch) {
        const typedBook = citationMatch[1].trim();
        const chapterNum = parseInt(citationMatch[2]);
        const verseNum = citationMatch[3] ? parseInt(citationMatch[3]) : null;
        const endVerseNum = citationMatch[4] ? parseInt(citationMatch[4]) : null;
        
        // Obtener todos los libros para buscar coincidencia difusa
        const [allBooks] = await pool.query('SELECT id, name, abbreviation FROM books');
        const matchedBook = findBestBookMatch(typedBook, allBooks);
        
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

      // Si es una cita con capítulo (opcionalmente versículo o rango), devolvemos TODO el capítulo
      // para permitir lectura continua, resaltando el/los versículo(s) buscado(s).
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
            (SELECT GROUP_CONCAT(t.name) FROM verse_tags vt3 JOIN tags t ON vt3.tag_id = t.id WHERE vt3.verse_id = v.id) as tags
          FROM verses v
          JOIN chapters c ON v.chapter_id = c.id
          JOIN books b ON c.book_id = b.id
          JOIN versions vt ON v.version_id = vt.id
          WHERE b.id = ? AND c.number = ? AND v.version_id = ?
          ORDER BY v.number
        `;

        let [verses] = await pool.query(chapterSql, [parsedCitation.book_id, parsedCitation.chapter, effectiveVersionId]);

        // Smart Fallback: si la versión elegida no tiene contenido, usar RVR1960
        if (verses.length === 0 && effectiveVersionId !== 1) {
          [verses] = await pool.query(chapterSql, [parsedCitation.book_id, parsedCitation.chapter, 1]);
        }

        // Identificar versículos que coinciden con la cita buscada
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

        // Guardar historial de búsqueda
        if (q && q.trim() !== '' && offset == 0) {
          if (req.user) {
            await pool.query('INSERT INTO search_history (user_id, query) VALUES (?, ?)', [req.user.id, q.trim()]);
          } else {
            await pool.query('INSERT INTO search_history (user_id, query) VALUES (NULL, ?)', [q.trim()]);
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

      // BÚSQUEDA POR PALABRAS CLAVE Y FILTROS (sin cambios funcionales)
      let queryParts = [];
      let queryParams = [];

      if (q && q.trim() !== '') {
        const keywords = q.trim().split(/\s+/);
        keywords.forEach(word => {
          queryParts.push('v.text LIKE ?');
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
        queryParts.push('v.id IN (SELECT vt2.verse_id FROM verse_tags vt2 JOIN tags t2 ON vt2.tag_id = t2.id WHERE t2.name = ? OR t2.id = ?)');
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
          (SELECT GROUP_CONCAT(t.name) FROM verse_tags vt3 JOIN tags t ON vt3.tag_id = t.id WHERE vt3.verse_id = v.id) as tags
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
      const [countResult] = await pool.query(countSql, queryParams);
      let total = countResult[0].total;

      // Smart Fallback para búsquedas por palabra clave
      if (total === 0 && version_id && Number(version_id) !== 1) {
        queryParts = [];
        queryParams = [];
        
        if (q && q.trim() !== '') {
          const keywords = q.trim().split(/\s+/);
          keywords.forEach(word => {
            queryParts.push('v.text LIKE ?');
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
          queryParts.push('v.id IN (SELECT vt2.verse_id FROM verse_tags vt2 JOIN tags t2 ON vt2.tag_id = t2.id WHERE t2.name = ? OR t2.id = ?)');
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
            (SELECT GROUP_CONCAT(t.name) FROM verse_tags vt3 JOIN tags t ON vt3.tag_id = t.id WHERE vt3.verse_id = v.id) as tags
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
        const [fallbackCountResult] = await pool.query(countSql, queryParams);
        total = fallbackCountResult[0].total;
      }

      sql += ' LIMIT ? OFFSET ?';
      const pagedQueryParams = [...queryParams, Number(limit), Number(offset)];

      const [results] = await pool.query(sql, pagedQueryParams);

      // Guardar historial de búsqueda
      if (q && q.trim() !== '' && offset == 0) {
        if (req.user) {
          await pool.query('INSERT INTO search_history (user_id, query) VALUES (?, ?)', [req.user.id, q.trim()]);
        } else {
          await pool.query('INSERT INTO search_history (user_id, query) VALUES (NULL, ?)', [q.trim()]);
        }
      }

      res.json({
        total,
        results,
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

      // 1. Buscar coincidencia con nombres de libros
      const [books] = await pool.query(
        'SELECT name, id FROM books WHERE name LIKE ? ORDER BY book_order LIMIT 3',
        [`${searchTerm}%`]
      );
      books.forEach(b => {
        suggestions.push({ type: 'book', label: b.name, data: { book_id: b.id } });
      });

      // 2. Comprobar si coincide con un patrón tipo "Libro Cap" (Ej: "Génesis 1" o "Juan 3")
      const bookCapRegex = /^([a-zA-ZáéíóúÁÉÍÓÚñÑ\s\d]+?)\s*(\d+)$/;
      const match = searchTerm.match(bookCapRegex);
      if (match) {
        const bookName = match[1].trim();
        const capNum = parseInt(match[2]);
        const [matchedBooks] = await pool.query(
          'SELECT name, id FROM books WHERE name LIKE ? ORDER BY book_order LIMIT 1',
          [`${bookName}%`]
        );
        if (matchedBooks.length > 0) {
          const b = matchedBooks[0];
          suggestions.push({
            type: 'chapter',
            label: `${b.name} ${capNum}`,
            data: { book_id: b.id, chapter: capNum }
          });
        }
      }

      // 3. Buscar etiquetas coincidentes
      const [tags] = await pool.query(
        'SELECT name FROM tags WHERE name LIKE ? LIMIT 3',
        [`${searchTerm}%`]
      );
      tags.forEach(t => {
        suggestions.push({ type: 'tag', label: `Tema: ${t.name}`, data: { tag: t.name } });
      });

      // 4. Buscar palabras clave populares en el texto bíblico
      if (suggestions.length < 5) {
        const [verses] = await pool.query(
          `SELECT DISTINCT b.name as book_name, c.number as chapter, v.number as verse 
           FROM verses v 
           JOIN chapters c ON v.chapter_id = c.id
           JOIN books b ON c.book_id = b.id
           WHERE v.text LIKE ? LIMIT 3`,
          [`%${searchTerm}%`]
        );
        verses.forEach(v => {
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
      const [countResult] = await pool.query('SELECT COUNT(*) as total FROM verses WHERE version_id = 1');
      const total = countResult[0].total;

      if (total === 0) {
        return res.status(404).json({ error: 'No hay versículos disponibles para el Versículo del Día.' });
      }

      // Obtener el día del año como semilla pseudoaleatoria
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now - start;
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);

      const offset = dayOfYear % total;

      const [verses] = await pool.query(
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
        LIMIT 1 OFFSET ?`,
        [offset]
      );

      res.json(verses[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener el versículo del día.' });
    }
  },

  // Comparar un versículo específico en varias versiones
  async compareVerse(req, res) {
    const { bookId, chapterNumber, verseNumber } = req.params;

    try {
      const [verses] = await pool.query(
        `SELECT v.text, vt.name as version_name, vt.abbreviation as version_abbreviation
         FROM verses v
         JOIN chapters c ON v.chapter_id = c.id
         JOIN versions vt ON v.version_id = vt.id
         WHERE c.book_id = ? AND c.number = ? AND v.number = ?`,
        [bookId, chapterNumber, verseNumber]
      );
      
      if (verses.length === 0) {
        return res.status(404).json({ error: 'Versículo no encontrado.' });
      }
      res.json(verses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al comparar el versículo.' });
    }
  },

  // Obtener historial de búsquedas del usuario
  async getSearchHistory(req, res) {
    try {
      const [history] = await pool.query(
        'SELECT id, query, created_at FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
        [req.user.id]
      );
      res.json(history);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener el historial de búsqueda.' });
    }
  },

  // Borrar historial de búsquedas
  async clearSearchHistory(req, res) {
    try {
      await pool.query('DELETE FROM search_history WHERE user_id = ?', [req.user.id]);
      res.json({ message: 'Historial de búsqueda eliminado.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar el historial de búsqueda.' });
    }
  }
};

module.exports = bibleController;
