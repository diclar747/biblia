const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection, ensureProfileImageColumn } = require('./db/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Importar Rutas
const authRoutes = require('./routes/auth');
const bibleRoutes = require('./routes/bible');
const favoriteRoutes = require('./routes/favorites');
const tagRoutes = require('./routes/tags');
const noteRoutes = require('./routes/notes');
const listRoutes = require('./routes/lists');
const adminRoutes = require('./routes/admin');
const gameRoutes = require('./routes/games');
const studyRoutes = require('./routes/studies');
const communityRoutes = require('./routes/community');

// Registrar Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/bible', bibleRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/studies', studyRoutes);
app.use('/api/community', communityRoutes);

// Servir páginas específicas para soporte de rutas directas si es necesario
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check para diagnosticar conexión a base de datos
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: dbStatus ? 'ok' : 'error',
    database_url_set: !!process.env.DATABASE_URL,
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error no controlado en la aplicación:', err.message);
  res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
});

// Inicializar el servidor solo si se ejecuta directamente (no en Vercel/serverless)
async function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor backend escuchando en: http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

// Verificar conexión y migraciones necesarias en segundo plano (local y serverless)
(async () => {
  const isConnected = await testConnection();
  if (!isConnected) {
    console.warn('⚠️ ADVERTENCIA: La conexión a la base de datos falló. Las funciones dinámicas de la API podrían no estar disponibles.');
  } else {
    await ensureProfileImageColumn();
  }
})();

module.exports = app;
