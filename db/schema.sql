DROP DATABASE IF EXISTS `biblia_buscador`;
CREATE DATABASE `biblia_buscador` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `biblia_buscador`;

-- Tabla de versiones de la Biblia
CREATE TABLE IF NOT EXISTS `versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `abbreviation` VARCHAR(20) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de libros de la Biblia
CREATE TABLE IF NOT EXISTS `books` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `abbreviation` VARCHAR(10) NOT NULL UNIQUE,
  `testament` ENUM('Antiguo', 'Nuevo') NOT NULL,
  `book_order` INT NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de capítulos
CREATE TABLE IF NOT EXISTS `chapters` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `book_id` INT NOT NULL,
  `number` INT NOT NULL,
  UNIQUE KEY `book_chapter` (`book_id`, `number`),
  FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de versículos (con su texto asociado a una versión y capítulo)
CREATE TABLE IF NOT EXISTS `verses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `chapter_id` INT NOT NULL,
  `version_id` INT NOT NULL,
  `number` INT NOT NULL,
  `text` TEXT NOT NULL,
  UNIQUE KEY `chapter_version_verse` (`chapter_id`, `version_id`, `number`),
  FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON DELETE CASCADE,
  FULLTEXT KEY `text_fulltext` (`text`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('user', 'admin') DEFAULT 'user',
  `default_version_id` INT DEFAULT NULL,
  `profile_image` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`default_version_id`) REFERENCES `versions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de favoritos
CREATE TABLE IF NOT EXISTS `favorites` (
  `user_id` INT NOT NULL,
  `verse_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `verse_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`verse_id`) REFERENCES `verses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de etiquetas globales
CREATE TABLE IF NOT EXISTS `tags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de etiquetas asociadas a versículos
CREATE TABLE IF NOT EXISTS `verse_tags` (
  `verse_id` INT NOT NULL,
  `tag_id` INT NOT NULL,
  PRIMARY KEY (`verse_id`, `tag_id`),
  FOREIGN KEY (`verse_id`) REFERENCES `verses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de notas personales (Cuaderno Espiritual)
CREATE TABLE IF NOT EXISTS `notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de vinculación de notas con versículos (una nota puede tener varios versículos)
CREATE TABLE IF NOT EXISTS `note_verses` (
  `note_id` INT NOT NULL,
  `verse_id` INT NOT NULL,
  PRIMARY KEY (`note_id`, `verse_id`),
  FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`verse_id`) REFERENCES `verses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de listas guardadas del usuario
CREATE TABLE IF NOT EXISTS `lists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de versículos dentro de listas guardadas
CREATE TABLE IF NOT EXISTS `list_verses` (
  `list_id` INT NOT NULL,
  `verse_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`list_id`, `verse_id`),
  FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`verse_id`) REFERENCES `verses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de historial de búsqueda
CREATE TABLE IF NOT EXISTS `search_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `query` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de estadísticas del juego por usuario
CREATE TABLE IF NOT EXISTS `user_game_stats` (
  `user_id` INT PRIMARY KEY,
  `xp` INT DEFAULT 0,
  `level` INT DEFAULT 1,
  `crowns` INT DEFAULT 0,
  `streak` INT DEFAULT 0,
  `last_played` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de logros/medallas desbloqueados por usuario
CREATE TABLE IF NOT EXISTS `user_achievements` (
  `user_id` INT,
  `achievement_key` VARCHAR(50),
  `unlocked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `achievement_key`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
