const express = require('express');
const router = express.Router();
const bibleController = require('../controllers/bibleController');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

// Rutas de lectura y configuración
router.get('/versions', bibleController.getVersions);
router.get('/books', bibleController.getBooks);
router.get('/books/:bookId/chapters', bibleController.getChapters);
router.get('/books/:bookId/chapters/:chapterNumber/verses', bibleController.getVerses);

// Rutas de búsqueda y sugerencias (el buscador es opcionalmente autenticado para guardar el historial)
router.get('/search', optionalAuthenticateToken, bibleController.search);
router.get('/suggestions', bibleController.getSuggestions);
router.get('/verse-of-the-day', bibleController.getVerseOfTheDay);
router.get('/compare/:bookId/:chapterNumber/:verseNumber', bibleController.compareVerse);

// Rutas de historial (requiere autenticación)
router.get('/history', authenticateToken, bibleController.getSearchHistory);
router.delete('/history', authenticateToken, bibleController.clearSearchHistory);

module.exports = router;
