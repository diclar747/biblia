// routes/games.js
const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { authenticateToken } = require('../middleware/auth');

// Rutas protegidas (Requieren inicio de sesión)
router.get('/stats', authenticateToken, gameController.getGameStats);
router.post('/add-xp', authenticateToken, gameController.addXp);

// Rutas públicas (Opcionalmente autenticadas)
router.get('/questions', gameController.getQuestions);
router.get('/leaderboard', gameController.getLeaderboard);
router.post('/ai-explain', gameController.aiExplain);

module.exports = router;
