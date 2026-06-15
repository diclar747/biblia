const { pool, toPgSql } = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authController = {
  // Registro de usuario
  async register(req, res) {
    const { name, email, password, default_version_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Por favor, complete todos los campos requeridos.' });
    }

    try {
      const existingUsersResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUsersResult.rows.length > 0) {
        return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const defVersion = default_version_id || 1;

      const result = await pool.query(
        'INSERT INTO users (name, email, password, role, default_version_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [name, email, hashedPassword, 'user', defVersion]
      );

      const userId = result.rows[0].id;

      const token = jwt.sign(
        { id: userId, name, email, role: 'user' },
        process.env.JWT_SECRET || 'supersecret_key_for_bibliaflow_2026',
        { expiresIn: '30d' }
      );

      res.status(201).json({
        message: 'Usuario registrado con éxito.',
        token,
        user: {
          id: userId,
          name,
          email,
          role: 'user',
          default_version_id: defVersion
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al registrar el usuario.' });
    }
  },

  // Inicio de sesión
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Por favor, proporcione correo electrónico y contraseña.' });
    }

    try {
      const usersResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (usersResult.rows.length === 0) {
        return res.status(400).json({ error: 'Credenciales inválidas.' });
      }

      const user = usersResult.rows[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Credenciales inválidas.' });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'supersecret_key_for_bibliaflow_2026',
        { expiresIn: '30d' }
      );

      res.json({
        message: 'Sesión iniciada con éxito.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          default_version_id: user.default_version_id,
          profile_image: user.profile_image
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al iniciar sesión.' });
    }
  },

  // Obtener perfil del usuario autenticado
  async getProfile(req, res) {
    try {
      const usersResult = await pool.query(
        'SELECT id, name, email, role, default_version_id, profile_image, created_at FROM users WHERE id = $1',
        [req.user.id]
      );
      if (usersResult.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const user = usersResult.rows[0];
      let versionAbbr = 'RVR1960';
      if (user.default_version_id) {
        const versionsResult = await pool.query('SELECT abbreviation FROM versions WHERE id = $1', [user.default_version_id]);
        if (versionsResult.rows.length > 0) {
          versionAbbr = versionsResult.rows[0].abbreviation;
        }
      }

      res.json({
        ...user,
        default_version_abbreviation: versionAbbr
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al obtener el perfil.' });
    }
  },

  // Actualizar configuración del perfil
  async updateProfile(req, res) {
    const { name, default_version_id, password } = req.body;
    const userId = req.user.id;

    try {
      let queryParts = [];
      let queryParams = [];

      if (name) {
        queryParts.push('name = ?');
        queryParams.push(name);
      }

      if (default_version_id) {
        queryParts.push('default_version_id = ?');
        queryParams.push(default_version_id);
      }

      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        queryParts.push('password = ?');
        queryParams.push(hashedPassword);
      }

      if (queryParts.length === 0) {
        return res.status(400).json({ error: 'No se enviaron datos para actualizar.' });
      }

      queryParams.push(userId);
      const sql = toPgSql(`UPDATE users SET ${queryParts.join(', ')} WHERE id = ?`);
      await pool.query(sql, queryParams);

      res.json({ message: 'Perfil actualizado con éxito.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al actualizar el perfil.' });
    }
  },

  // Cargar foto de perfil
  async uploadProfileImage(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'Por favor, proporcione un archivo de imagen.' });
    }

    try {
      const profileImageUrl = `/uploads/profile_pics/${req.file.filename}`;
      await pool.query('UPDATE users SET profile_image = $1 WHERE id = $2', [profileImageUrl, req.user.id]);

      res.json({
        message: 'Foto de perfil actualizada con éxito.',
        profile_image: profileImageUrl
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al subir la foto de perfil.' });
    }
  }
};

module.exports = authController;
