// controllers/gameController.js
const { pool } = require('../db/database');
const fs = require('fs');
const path = require('path');

// Cargar datos de juegos desde el JSON
const gameDataPath = path.join(__dirname, '../db/game_data.json');
let gameData = {};
try {
  gameData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
} catch (error) {
  console.error('Error al cargar game_data.json:', error.message);
}

// Calcular rango basado en nivel
function getSpiritualRange(level) {
  if (level <= 5) return 'Aprendiz Bíblico';
  if (level <= 12) return 'Discípulo';
  if (level <= 20) return 'Guerrero de Fe';
  if (level <= 35) return 'Maestro de la Palabra';
  return 'Sabio de Israel';
}

const gameController = {
  // Obtener estadísticas y logros del usuario
  async getGameStats(req, res) {
    const userId = req.user.id;

    try {
      // 1. Obtener estadísticas del juego (o crear fila si no existe)
      let [rows] = await pool.query('SELECT * FROM user_game_stats WHERE user_id = ?', [userId]);
      
      if (rows.length === 0) {
        await pool.query('INSERT INTO user_game_stats (user_id, xp, level, crowns, streak) VALUES (?, 0, 1, 0, 0)', [userId]);
        const [newRows] = await pool.query('SELECT * FROM user_game_stats WHERE user_id = ?', [userId]);
        rows = newRows;
      }

      const stats = rows[0];

      // 2. Obtener logros desbloqueados
      const [achievementsRows] = await pool.query('SELECT achievement_key FROM user_achievements WHERE user_id = ?', [userId]);
      const achievements = achievementsRows.map(a => a.achievement_key);

      // 3. Obtener clasificación/rango en el ranking mundial
      const [rankRows] = await pool.query(
        'SELECT COUNT(*) + 1 as rank_pos FROM user_game_stats WHERE xp > ?',
        [stats.xp]
      );
      const rankingPosition = rankRows[0].rank_pos;

      res.json({
        xp: stats.xp,
        level: stats.level,
        crowns: stats.crowns,
        streak: stats.streak,
        range: getSpiritualRange(stats.level),
        ranking: rankingPosition,
        achievements
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al recuperar estadísticas.' });
    }
  },

  // Añadir puntos de experiencia (XP) y coronas al usuario
  async addXp(req, res) {
    const userId = req.user.id;
    const { xpToAdd, crownsToAdd, completeGame } = req.body;

    if (xpToAdd === undefined) {
      return res.status(400).json({ error: 'Falta especificar xpToAdd.' });
    }

    try {
      // 1. Obtener estadísticas actuales
      let [rows] = await pool.query('SELECT * FROM user_game_stats WHERE user_id = ?', [userId]);
      if (rows.length === 0) {
        await pool.query('INSERT INTO user_game_stats (user_id, xp, level, crowns, streak) VALUES (?, 0, 1, 0, 0)', [userId]);
        const [newRows] = await pool.query('SELECT * FROM user_game_stats WHERE user_id = ?', [userId]);
        rows = newRows;
      }

      let { xp, level, crowns, streak, last_played } = rows[0];
      xp += parseInt(xpToAdd);
      if (crownsToAdd) crowns += parseInt(crownsToAdd);

      // Calcular racha (streak) básica
      const now = new Date();
      if (completeGame) {
        if (last_played) {
          const lastDate = new Date(last_played);
          const diffTime = Math.abs(now - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streak += 1;
          } else if (diffDays > 1) {
            streak = 1; // Racha rota, iniciar de nuevo
          }
        } else {
          streak = 1; // Primera vez jugando
        }
        last_played = now;
      }

      // Sistema de Niveles (Nivel = 1 + floor(sqrt(XP / 50)))
      const newLevel = Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
      const isLevelUp = newLevel > level;
      level = newLevel;

      // Actualizar en base de datos
      await pool.query(
        'UPDATE user_game_stats SET xp = ?, level = ?, crowns = ?, streak = ?, last_played = ? WHERE user_id = ?',
        [xp, level, crowns, streak, last_played, userId]
      );

      // 2. Verificar logros a desbloquear
      const unlocked = [];
      const checkAndUnlock = async (key) => {
        const [existing] = await pool.query('SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_key = ?', [userId, key]);
        if (existing.length === 0) {
          await pool.query('INSERT INTO user_achievements (user_id, achievement_key) VALUES (?, ?)', [userId, key]);
          unlocked.push(key);
        }
      };

      if (completeGame) {
        await checkAndUnlock('first_game');
      }
      if (level >= 10) {
        await checkAndUnlock('level_10');
      }
      if (streak >= 3) {
        await checkAndUnlock('streak_3');
      }
      if (crowns >= 15) {
        await checkAndUnlock('crown_15');
      }

      res.json({
        xp,
        level,
        crowns,
        streak,
        range: getSpiritualRange(level),
        isLevelUp,
        unlockedAchievements: unlocked
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al registrar puntos.' });
    }
  },

  // Obtener preguntas según modo de juego
  async getQuestions(req, res) {
    const { mode } = req.query;

    if (!mode) {
      return res.status(400).json({ error: 'Por favor, proporcione el parámetro mode.' });
    }

    try {
      let questions = [];
      
      // Mapear modos a claves del JSON
      if (mode === 'riddles') questions = gameData.riddles || [];
      else if (mode === 'characters') questions = gameData.characters || [];
      else if (mode === 'verses') questions = gameData.verses || [];
      else if (mode === 'order_verses') questions = gameData.order_verses || [];
      else if (mode === 'stories') questions = gameData.stories || [];
      else if (mode === 'true_false') questions = gameData.true_false || [];
      else if (mode === 'books') questions = gameData.books || [];
      else if (mode === 'memory') questions = gameData.memory || [];
      else {
        // Modo aleatorio (desafío diario o contrarreloj)
        // Combinamos verdaderos/falsos y versículos incompletos
        const tf = (gameData.true_false || []).map(q => ({ ...q, type: 'true_false' }));
        const vs = (gameData.verses || []).map(q => ({ ...q, type: 'verses' }));
        const bk = (gameData.books || []).map(q => ({ ...q, type: 'books' }));
        questions = [...tf, ...vs, ...bk];
      }

      // Barajar preguntas
      const shuffled = [...questions].sort(() => 0.5 - Math.random());
      
      // Retornar máximo de 10 preguntas
      res.json(shuffled.slice(0, 10));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al recuperar preguntas.' });
    }
  },

  // Obtener ranking global (Leaderboard)
  async getLeaderboard(req, res) {
    try {
      const [rows] = await pool.query(`
        SELECT u.id, u.name, u.profile_image, gs.xp, gs.level
        FROM user_game_stats gs
        JOIN users u ON gs.user_id = u.id
        ORDER BY gs.xp DESC
        LIMIT 10
      `);

      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al recuperar tabla de posiciones.' });
    }
  },

  // IA Bíblica: Explicador de respuestas
  async aiExplain(req, res) {
    const { question, answer, isCorrect } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Falta especificar la pregunta o la respuesta.' });
    }

    try {
      // Simular respuestas detalladas de una IA teológica basada en el texto
      let explanation = '';
      
      if (question.includes('Moisés') || answer.includes('Moisés')) {
        explanation = 'Moisés es una de las figuras más importantes de la Biblia. Su nombre significa \"Rescatado de las aguas\". Dios lo llamó para liberar a los hebreos, entregó las Tablas de la Ley en el Monte Sinaí y escribió el Pentateuco (primeros 5 libros). Su viaje por el desierto enseña perseverancia y fe frente a la rebeldía del pueblo.';
      } else if (question.includes('David') || answer.includes('David')) {
        explanation = 'David, pastor de Belén, ilustra cómo Dios no mira las apariencias sino el corazón (1 Samuel 16:7). Su victoria contra el gigante Goliat demuestra que el poder de la fe triunfa sobre la fuerza humana. Autor de gran parte de los Salmos, es ancestro directo de Jesucristo en la carne.';
      } else if (question.includes('Jonás') || answer.includes('Jonás')) {
        explanation = 'El libro de Jonás es un testimonio de la misericordia universal de Dios. Al principio Jonás intentó huir porque no quería que Dios perdonara a Nínive (ciudad enemiga). Su permanencia de tres días en el pez fue referenciada por Jesús como prefiguración de su propia muerte y resurrección (Mateo 12:40).';
      } else if (question.includes('arca') || answer.includes('Noé')) {
        explanation = 'El Arca de Noé simboliza refugio y salvación divina. Representa el juicio de Dios sobre la corrupción de la tierra, pero a la vez abre una puerta de misericordia a través del pacto del arcoíris. En el Nuevo Testamento, el arca es tipo del bautismo y de la salvación de las almas en Cristo.';
      } else if (question.includes('Pedro') || answer.includes('Pedro')) {
        explanation = 'Pedro destaca por su carácter impulsivo pero profundamente leal. Su caída al negar a Jesús y su posterior restauración en Juan 21 muestran el amor perdonador de Dios. Fue el líder de la iglesia en Jerusalén y el primer apóstol en abrir la puerta del Evangelio a los gentiles (Cornelio).';
      } else if (question.includes('todo lo puedo') || answer.includes('fortalece')) {
        explanation = 'Filipenses 4:13 expresa la fortaleza de Pablo en medio de la adversidad. El apóstol escribe esta carta estando preso en Roma. El contexto enseña el secreto del contentamiento: estar satisfecho en abundancia o en escasez gracias al poder sustentador de Cristo.';
      } else {
        explanation = `Este pasaje y su respuesta se relacionan estrechamente con la revelación histórica de Dios. La lección principal de este evento es el llamado a la obediencia, la confianza plena en las promesas divinas y el entendimiento de que el plan de salvación se cumple a través de la providencia del Señor en cada época.`;
      }

      res.json({
        aiName: 'IA Bíblica (Entrenador de Sabiduría)',
        aiExplanation: explanation,
        motivationMsg: isCorrect ? '¡Excelente trabajo! Has captado la esencia espiritual del pasaje.' : 'No te preocupes por el fallo. La sabiduría bíblica se adquiere paso a paso. ¡Sigue leyendo y aprendiendo!'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al obtener explicación de la IA.' });
    }
  }
};

module.exports = gameController;
