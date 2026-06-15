-- Seed PostgreSQL para Biblia Online

-- Insertar versiones de la Biblia
INSERT INTO versions (id, name, abbreviation) VALUES
(1, 'Reina Valera 1960', 'RVR1960'),
(2, 'Nueva Versión Internacional', 'NVI')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, abbreviation = EXCLUDED.abbreviation;

-- Insertar libros de la Biblia
INSERT INTO books (id, name, abbreviation, testament, book_order) VALUES
(1, 'Génesis', 'GEN', 'Antiguo', 1),
(2, 'Éxodo', 'EXO', 'Antiguo', 2),
(3, 'Levítico', 'LEV', 'Antiguo', 3),
(4, 'Números', 'NUM', 'Antiguo', 4),
(5, 'Deuteronomio', 'DEU', 'Antiguo', 5),
(6, 'Josué', 'JOS', 'Antiguo', 6),
(7, 'Jueces', 'JUE', 'Antiguo', 7),
(8, 'Rut', 'RUT', 'Antiguo', 8),
(9, '1 Samuel', '1SA', 'Antiguo', 9),
(10, '2 Samuel', '2SA', 'Antiguo', 10),
(11, '1 Reyes', '1RE', 'Antiguo', 11),
(12, '2 Reyes', '2RE', 'Antiguo', 12),
(13, '1 Crónicas', '1CR', 'Antiguo', 13),
(14, '2 Crónicas', '2CR', 'Antiguo', 14),
(15, 'Esdras', 'ESD', 'Antiguo', 15),
(16, 'Nehemías', 'NEH', 'Antiguo', 16),
(17, 'Ester', 'EST', 'Antiguo', 17),
(18, 'Job', 'JOB', 'Antiguo', 18),
(19, 'Salmos', 'SAL', 'Antiguo', 19),
(20, 'Proverbios', 'PRO', 'Antiguo', 20),
(21, 'Eclesiastés', 'ECL', 'Antiguo', 21),
(22, 'Cantares', 'CAN', 'Antiguo', 22),
(23, 'Isaías', 'ISA', 'Antiguo', 23),
(24, 'Jeremías', 'JER', 'Antiguo', 24),
(25, 'Lamentaciones', 'LAM', 'Antiguo', 25),
(26, 'Ezequiel', 'EZE', 'Antiguo', 26),
(27, 'Daniel', 'DAN', 'Antiguo', 27),
(28, 'Oseas', 'OSE', 'Antiguo', 28),
(29, 'Joel', 'JOE', 'Antiguo', 29),
(30, 'Amós', 'AMO', 'Antiguo', 30),
(31, 'Abdías', 'ABD', 'Antiguo', 31),
(32, 'Jonás', 'JON', 'Antiguo', 32),
(33, 'Miqueas', 'MIQ', 'Antiguo', 33),
(34, 'Nahúm', 'NAH', 'Antiguo', 34),
(35, 'Habacuc', 'HAB', 'Antiguo', 35),
(36, 'Sofonías', 'SOF', 'Antiguo', 36),
(37, 'Hageo', 'HAG', 'Antiguo', 37),
(38, 'Zacarías', 'ZAC', 'Antiguo', 38),
(39, 'Malaquías', 'MAL', 'Antiguo', 39),
(40, 'Mateo', 'MAT', 'Nuevo', 40),
(41, 'Marcos', 'MAR', 'Nuevo', 41),
(42, 'Lucas', 'LUC', 'Nuevo', 42),
(43, 'Juan', 'JUA', 'Nuevo', 43),
(44, 'Hechos', 'HEC', 'Nuevo', 44),
(45, 'Romanos', 'ROM', 'Nuevo', 45),
(46, '1 Corintios', '1CO', 'Nuevo', 46),
(47, '2 Corintios', '2CO', 'Nuevo', 47),
(48, 'Gálatas', 'GAL', 'Nuevo', 48),
(49, 'Efesios', 'EFE', 'Nuevo', 49),
(50, 'Filipenses', 'FIL', 'Nuevo', 50),
(51, 'Colosenses', 'COL', 'Nuevo', 51),
(52, '1 Tesalonicenses', '1TE', 'Nuevo', 52),
(53, '2 Tesalonicenses', '2TE', 'Nuevo', 53),
(54, '1 Timoteo', '1TI', 'Nuevo', 54),
(55, '2 Timoteo', '2TI', 'Nuevo', 55),
(56, 'Tito', 'TIT', 'Nuevo', 56),
(57, 'Filemón', 'FLM', 'Nuevo', 57),
(58, 'Hebreos', 'HEB', 'Nuevo', 58),
(59, 'Santiago', 'SAN', 'Nuevo', 59),
(60, '1 Pedro', '1PE', 'Nuevo', 60),
(61, '2 Pedro', '2PE', 'Nuevo', 61),
(62, '1 Juan', '1JU', 'Nuevo', 62),
(63, '2 Juan', '2JU', 'Nuevo', 63),
(64, '3 Juan', '3JU', 'Nuevo', 64),
(65, 'Judas', 'JUD', 'Nuevo', 65),
(66, 'Apocalipsis', 'APO', 'Nuevo', 66)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, abbreviation = EXCLUDED.abbreviation, testament = EXCLUDED.testament, book_order = EXCLUDED.book_order;

-- Insertar algunos capítulos correspondientes a nuestras pruebas
INSERT INTO chapters (id, book_id, number) VALUES
(1, 1, 1),
(2, 19, 23),
(3, 43, 1),
(4, 43, 3),
(5, 50, 4),
(6, 6, 1)
ON CONFLICT (id) DO UPDATE SET book_id = EXCLUDED.book_id, number = EXCLUDED.number;

-- Insertar Versículos en RVR1960 (version_id = 1)
INSERT INTO verses (chapter_id, version_id, number, text) VALUES
-- Génesis 1 (RVR1960)
(1, 1, 1, 'En el principio creó Dios los cielos y la tierra.'),
(1, 1, 2, 'Y la tierra estaba desordenada y vacía, y las tinieblas estaban sobre la faz del abismo, y el Espíritu de Dios se movía sobre la faz de las aguas.'),
(1, 1, 3, 'Y dijo Dios: Sea la luz; y fue la luz.'),
(1, 1, 4, 'Y vio Dios que la luz era buena; y separó Dios la luz de las tinieblas.'),
(1, 1, 5, 'Y llamó Dios a la luz Día, y a las tinieblas llamó Noche. Y fue la tarde y la mañana un día.'),
-- Salmos 23 (RVR1960)
(2, 1, 1, 'Jehová es mi pastor; nada me faltará.'),
(2, 1, 2, 'En lugares de delicados pastos me hará descansar; Junto a aguas de reposo me pastoreará.'),
(2, 1, 3, 'Confortará mi alma; Me guiará por sendas de justicia por amor de su nombre.'),
(2, 1, 4, 'Aunque ande en valle de sombra de muerte, No temeré mal alguno, porque tú estarás conmigo; Tu vara y tu cayado me infundirán aliento.'),
(2, 1, 5, 'Aderezas mesa delante de mí en presencia de mis angustiadores; Unges mi cabeza con aceite; mi copa está rebosando.'),
(2, 1, 6, 'Ciertamente el bien y la misericordia me seguirán todos los días de mi vida, Y en la casa de Jehová moraré por largos días.'),
-- Juan 1 (RVR1960)
(3, 1, 1, 'En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios.'),
(3, 1, 2, 'Este era en el principio con Dios.'),
(3, 1, 3, 'Todas las cosas por él fueron hechas, y sin él nada de lo que ha sido hecho, fue hecho.'),
(3, 1, 4, 'En él estaba la vida, y la vida era la luz de los hombres.'),
(3, 1, 5, 'La luz en las tinieblas resplandece, y las tinieblas no prevalecieron contra ella.'),
-- Juan 3:16 (RVR1960)
(4, 1, 16, 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.'),
-- Filipenses 4:13 (RVR1960)
(5, 1, 13, 'Todo lo puedo en Cristo que me fortalece.'),
-- Josué 1:9 (RVR1960)
(6, 1, 9, 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.')
ON CONFLICT (chapter_id, version_id, number) DO UPDATE SET text = EXCLUDED.text;

-- Insertar Versículos en NVI (version_id = 2)
INSERT INTO verses (chapter_id, version_id, number, text) VALUES
-- Génesis 1 (NVI)
(1, 2, 1, 'Dios, en el principio, creó los cielos y la tierra.'),
(1, 2, 2, 'La tierra era un caos total, las tinieblas cubrían el abismo, y el Espíritu de Dios se iba cerniendo sobre la superficie de las aguas.'),
(1, 2, 3, 'Y dijo Dios: «¡Que exista la luz!» Y la luz llegó a existir.'),
(1, 2, 4, 'Dios consideró que la luz era buena y la separó de las tinieblas.'),
(1, 2, 5, 'A la luz la llamó «día», y a las tinieblas la llamó «noche». Y vino la noche, y llegó la mañana: ese fue el primer día.'),
-- Salmos 23 (NVI)
(2, 2, 1, 'El Señor es mi pastor; nada me falta.'),
(2, 2, 2, 'En verdes pastos me hace descansar; junto a tranquilas aguas me conduce.'),
(2, 2, 3, 'Me infunde nuevas fuerzas. Me guía por sendas de justicia por amor a su nombre.'),
(2, 2, 4, 'Aun si voy por valles tenebrosos, no temo peligro alguno porque tú estás a mi lado; tu vara y tu bastón me brindan aliento.'),
(2, 2, 5, 'Dispones ante mí un banquete en presencia de mis enemigos. Has ungido con perfume mi cabeza; mi copa está rebosando.'),
(2, 2, 6, 'La bondad y el amor me seguirán todos los días de mi vida; y en la casa del Señor habitaré para siempre.'),
-- Juan 1 (NVI)
(3, 2, 1, 'En el principio ya existía el Verbo, y el Verbo estaba con Dios, y el Verbo era Dios.'),
(3, 2, 2, 'Él estaba en el principio con Dios.'),
(3, 2, 3, 'Por medio de él todas las cosas fueron creadas; sin él nada de lo que existe fue creado.'),
(3, 2, 4, 'En él estaba la vida, y la vida era la luz de la humanidad.'),
(3, 2, 5, 'Esta luz resplandece en las tinieblas, y las tinieblas no han podido extinguirla.'),
-- Juan 3:16 (NVI)
(4, 2, 16, 'Porque tanto amó Dios al mundo que dio a su Hijo unigénito, para que todo el que cree en él no se pierda, sino que tenga vida eterna.'),
-- Filipenses 4:13 (NVI)
(5, 2, 13, 'Todo lo puedo en Cristo que me fortalece.'),
-- Josué 1:9 (NVI)
(6, 2, 9, 'Ya te lo he ordenado: ¡Sé fuerte y valiente! No tengas miedo ni te desanimes, porque el Señor tu Dios te acompañará dondequiera que vayas.')
ON CONFLICT (chapter_id, version_id, number) DO UPDATE SET text = EXCLUDED.text;

-- Insertar etiquetas globales por defecto
INSERT INTO tags (id, name) VALUES
(1, 'Fe'),
(2, 'Amor'),
(3, 'Esperanza'),
(4, 'Salvación'),
(5, 'Familia'),
(6, 'Perdón'),
(7, 'Protección'),
(8, 'Sabiduría'),
(9, 'Sanidad')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Asociar etiquetas a algunos versículos de ejemplo
-- Salmo 23:1 (Jehová es mi pastor) -> Fe (1) y Protección (7)
-- RVR1960: verse_id para Salmo 23:1 (RVR1960) es 6
-- NVI: verse_id para Salmo 23:1 (NVI) es 21
INSERT INTO verse_tags (verse_id, tag_id) VALUES
(6, 1), (6, 7),
(21, 1), (21, 7)
ON CONFLICT (verse_id, tag_id) DO NOTHING;

-- Crear usuarios de demostración predeterminados con hashes bcrypt válidos
INSERT INTO users (id, name, email, password, role, default_version_id) VALUES
(1, 'Administrador', 'admin@biblia.com', '$2b$10$8Hq1meMiXjj76OF/c//ZCOgNWQnpt/0HutYdTqxur9cZawNxvBLOa', 'admin', 1),
(2, 'Juan Lector', 'juan@biblia.com', '$2b$10$yqGaKMc.7s00vgPccHUk4eBeN.aJKV69EeJfDSC5CQLhBDTQdh9LW', 'user', 1),
(3, 'María Lectora', 'maria@biblia.com', '$2b$10$6CzJCI7bgm6t2QY2moIkne5VHJfUI7oxFP2jdQZhSS/XIkCEwGaJq', 'user', 2)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password, role = EXCLUDED.role, default_version_id = EXCLUDED.default_version_id;

-- Actualizar secuencias para que los próximos INSERT sin id específico no fallen
SELECT setval('versions_id_seq', COALESCE((SELECT MAX(id) FROM versions), 1));
SELECT setval('books_id_seq', COALESCE((SELECT MAX(id) FROM books), 1));
SELECT setval('chapters_id_seq', COALESCE((SELECT MAX(id) FROM chapters), 1));
SELECT setval('verses_id_seq', COALESCE((SELECT MAX(id) FROM verses), 1));
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('tags_id_seq', COALESCE((SELECT MAX(id) FROM tags), 1));
