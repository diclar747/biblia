const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
  // Check Authorization header or fallback to cookie/query parameter
  let token = null;
  const authHeader = req.headers['authorization'];
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_key_for_bibliaflow_2026');
    req.user = verified;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
  });
}

// Optional middleware that checks if user is logged in, but doesn't block if they aren't
// (useful for search log history where guest searches are allowed)
function optionalAuthenticateToken(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_key_for_bibliaflow_2026');
    req.user = verified;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuthenticateToken
};
