-- Esquema PostgreSQL para Biblia Online
-- Ejecutar en la base de datos objetivo (Neon)

-- Tabla de versiones de la Biblia
CREATE TABLE IF NOT EXISTS versions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de libros de la Biblia
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  abbreviation VARCHAR(10) NOT NULL UNIQUE,
  testament VARCHAR(10) NOT NULL CHECK (testament IN ('Antiguo', 'Nuevo')),
  book_order INT NOT NULL UNIQUE
);

-- Tabla de capítulos
CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  book_id INT NOT NULL,
  number INT NOT NULL,
  UNIQUE (book_id, number),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Tabla de versículos (con su texto asociado a una versión y capítulo)
CREATE TABLE IF NOT EXISTS verses (
  id SERIAL PRIMARY KEY,
  chapter_id INT NOT NULL,
  version_id INT NOT NULL,
  number INT NOT NULL,
  text TEXT NOT NULL,
  UNIQUE (chapter_id, version_id, number),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
);

-- Índice para búsqueda de texto completo en versículos
CREATE INDEX IF NOT EXISTS text_fulltext ON verses USING GIN (to_tsvector('spanish', text));

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  default_version_id INT DEFAULT NULL,
  profile_image VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (default_version_id) REFERENCES versions(id) ON DELETE SET NULL
);

-- Tabla de favoritos
CREATE TABLE IF NOT EXISTS favorites (
  user_id INT NOT NULL,
  verse_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, verse_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE
);

-- Tabla de etiquetas globales
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Tabla de etiquetas asociadas a versículos
CREATE TABLE IF NOT EXISTS verse_tags (
  verse_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (verse_id, tag_id),
  FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Tabla de notas personales (Cuaderno Espiritual)
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trigger para actualizar updated_at automáticamente en notes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabla de vinculación de notas con versículos (una nota puede tener varios versículos)
CREATE TABLE IF NOT EXISTS note_verses (
  note_id INT NOT NULL,
  verse_id INT NOT NULL,
  PRIMARY KEY (note_id, verse_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE
);

-- Tabla de listas guardadas del usuario
CREATE TABLE IF NOT EXISTS lists (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de versículos dentro de listas guardadas
CREATE TABLE IF NOT EXISTS list_verses (
  list_id INT NOT NULL,
  verse_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (list_id, verse_id),
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
  FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE
);

-- Tabla de historial de búsqueda
CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id INT DEFAULT NULL,
  query VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de estadísticas del juego por usuario
CREATE TABLE IF NOT EXISTS user_game_stats (
  user_id INT PRIMARY KEY,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  crowns INT DEFAULT 0,
  streak INT DEFAULT 0,
  last_played TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de logros/medallas desbloqueados por usuario
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INT,
  achievement_key VARCHAR(50),
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
