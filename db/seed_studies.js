const { Client } = require('pg');
require('dotenv').config();

const studies = [
  {
    topic: 'Fe',
    slug: 'fe',
    summary: 'La fe es la confianza firme en Dios y en sus promesas, aunque no veamos el resultado.',
    content: `La fe es uno de los temas centrales de la Biblia. Desde el Antiguo Testamento, hombres y mujeres caminaron confiando en Dios aun cuando las circunstancias parecían imposibles. La fe no es un mero deseo, sino una convicción profunda de que Dios es fiel y cumple lo que promete.

En el Nuevo Testamento, Pablo enseña que somos justificados por fe, no por obras. Jesús mismo usó la fe como condición para milagros: "Según tu fe te sea hecho". La fe verdadera se manifiesta en obediencia, perseverancia y acción.

La Biblia presenta la fe como un don de Dios, pero también como una responsabilidad humana: debemos creer, mantenernos firmes y vivir de acuerdo con lo que creemos.`
  },
  {
    topic: 'Amor',
    slug: 'amor',
    summary: 'El amor de Dios es el fundamento de toda existencia y el mayor mandamiento para el creyente.',
    content: `El amor en la Biblia no es solo un sentimiento, sino una decisión y un compromiso. Dios es definido como amor, y su amor se demostró de forma suprema al enviar a Jesucristo para salvar al mundo.

El amor ágape es desinteresado, eterno y sacrificial. Jesús resume toda la Ley en dos mandamientos: amar a Dios sobre todas las cosas y amar al prójimo como a nosotros mismos. El amor fraternal es la marca distintiva de los discípulos de Cristo.

Pablo describe el amor en 1 Corintios 13 como paciente, bondadoso, no envidioso, no jactancioso y que todo lo soporta. El amor nunca deja de ser la motivación suprema de la vida cristiana.`
  },
  {
    topic: 'Esperanza',
    slug: 'esperanza',
    summary: 'La esperanza bíblica es una expectativa segura en las promesas futuras de Dios.',
    content: `La esperanza cristiana no es un deseo vago, sino una certeza fundada en el carácter y las promesas de Dios. A diferencia del mundo, que espera lo incierto, el creyente espera con seguridad la segunda venida de Cristo, la resurrección de los muertos y la vida eterna.

La esperanza sostiene en medio de tribulaciones. Pablo dice que la tribulación produce paciencia, la paciencia prueba, y la prueba esperanza. Esta esperanza no avergüenza porque está fundamentada en el amor de Dios derramado en nuestros corazones por el Espíritu Santo.

Jesús es la esperanza viva. En Él encontramos futuro, propósito y la garantía de que Dios hará nuevas todas las cosas.`
  },
  {
    topic: 'Salvación',
    slug: 'salvacion',
    summary: 'La salvación es el regalo de Dios mediante la fe en Jesucristo para perdón de pecados y vida eterna.',
    content: `La salvación es el acto por el cual Dios libra al ser humano del pecado, la muerte y la condenación. No es lograda por obras humanas, sino por gracia mediante la fe en Jesucristo. Jesús pagó el precio en la cruz y resucitó para justificarnos.

La salvación tiene tres dimensiones: pasada (fuimos salvos del castado del pecado), presente (estamos siendo salvos de la potestad del pecado) y futura (seremos salvos de la presencia del pecado). Es un regalo irrevocable para quienes creen.

La respuesta humana es arrepentirse de los pecados y confiar en Cristo como Señor y Salvador. La salvación produce una nueva vida, transformada por el Espíritu Santo.`
  },
  {
    topic: 'Perdón',
    slug: 'perdon',
    summary: 'El perdón de Dios es completo y gratuito; nos llama a perdonar a otros de la misma manera.',
    content: `El perdón es el corazón del evangelio. Dios perdona todos nuestros pecados por causa de Cristo, los echa en el fondo del mar y no los recuerda más. Este perdón inmerecido nos libera de culpa y vergüenza.

Jesús enseñó que debemos perdonar a quienes nos ofenden, no solo siete veces, sino setenta veces siete. El Padrenuestro conecta directamente el perdón recibido con el perdón otorgado: "Perdona nuestras deudas, como también nosotros perdonamos a nuestros deudores".

Perdonar no significa justificar el mal, sino entregar la ofensa a Dios y dejar que sea Él quien juzgue. El perdón libera al ofendido y abre camino para la sanidad.`
  },
  {
    topic: 'Oración',
    slug: 'oracion',
    summary: 'La oración es la comunicación con Dios: adoración, confesión, petición, acción de gracias e intercesión.',
    content: `La oración es el medio por el cual el creyente se relaciona con Dios. A través de ella hablamos con el Padre, escuchamos su voz y encontramos dirección, consuelo y poder. Jesús enseñó el modelo de oración en el Padrenuestro, abarcando adoración, petición, perdón y protección.

La Biblia exhorta a orar sin cesar, en todo tiempo y con toda clase de oración. La oración persistente es valorada por Dios, y la oración de fe puede producir milagros. Sin embargo, Dios responde según su voluntad perfecta, no siempre según nuestros deseos.

La oración también es una expresión de dependencia. Reconocemos que necesitamos de Dios en cada área de nuestra vida y que Él es bueno para darnos lo que necesitamos.`
  }
];

const studyRefs = {
  'fe': [
    ['Génesis', 1, 1], ['Hebreos', 11, 1], ['Hebreos', 11, 6], ['Romanos', 1, 17],
    ['Efesios', 2, 8], ['Santiago', 2, 17], ['Marcos', 9, 23], ['Mateo', 17, 20]
  ],
  'amor': [
    ['Juan', 3, 16], ['1 Juan', 4, 8], ['1 Corintios', 13, 4], ['1 Corintios', 13, 8],
    ['Romanos', 5, 8], ['1 Juan', 4, 19], ['Juan', 13, 34], ['Efesios', 2, 4]
  ],
  'esperanza': [
    ['Romanos', 15, 13], ['Jeremías', 29, 11], ['Salmos', 39, 7], ['Hebreos', 6, 19],
    ['1 Pedro', 1, 3], ['Romanos', 8, 24], ['Tito', 2, 13], ['Isaías', 40, 31]
  ],
  'salvacion': [
    ['Efesios', 2, 8], ['Juan', 3, 16], ['Romanos', 10, 9], ['Hechos', 4, 12],
    ['Tito', 3, 5], ['1 Pedro', 1, 3], ['Romanos', 5, 1], ['Juan', 14, 6]
  ],
  'perdon': [
    ['Salmos', 103, 12], ['Efesios', 4, 32], ['Mateo', 6, 14], ['1 Juan', 1, 9],
    ['Isaías', 1, 18], ['Colosenses', 3, 13], ['Miqueas', 7, 18], ['Lucas', 23, 34]
  ],
  'oracion': [
    ['Mateo', 6, 9], ['Mateo', 7, 7], ['Filipenses', 4, 6], ['1 Tesalonicenses', 5, 17],
    ['Santiago', 5, 16], ['Salmos', 145, 18], ['Marcos', 11, 24], ['Lucas', 18, 1]
  ]
};

const bookStudies = [
  { book: 'Génesis', author: 'Moisés', date_written: 'c. 1445-1405 a.C.', purpose: 'Relatar los orígenes del mundo, la humanidad, el pecado y el pueblo de Israel.', key_themes: 'Creación, caída, pacto, redención', summary: 'Génesis es el libro de los comienzos: la creación, la caída, el diluvio, los patriarcas y el origen del pueblo de Israel.', content: 'Génesis significa "origen" o "principio". Contiene la historia de la creación del universo, la caída del ser humano, el diluvio, la torre de Babel, y la vida de los patriarcas Abraham, Isaac, Jacob y José. Establece los fundamentos teológicos del resto de la Biblia: Dios como Creador, el pecado y sus consecuencias, y el plan redentor de Dios a través de un pueblo escogido.' },
  { book: 'Éxodo', author: 'Moisés', date_written: 'c. 1445-1405 a.C.', purpose: 'Narrar la liberación de Israel de Egipto y el establecimiento del pacto en el Sinaí.', key_themes: 'Liberación, ley, pacto, tabernáculo', summary: 'Éxodo cuenta cómo Dios liberó a Israel de la esclavitud egipcia, le dio la Ley y estableció su presencia en el tabernáculo.', content: 'Éxodo continúa la historia de Génesis mostrando el cumplimiento de las promesas a Abraham. Moisés lidera al pueblo fuera de Egipto mediante diez plagas y el paso por el Mar Rojo. En el Monte Sinaí, Dios entrega los Diez Mandamientos y las instrucciones para el tabernáculo, estableciendo un sistema de adoración y santidad para Israel.' },
  { book: 'Levítico', author: 'Moisés', date_written: 'c. 1445-1405 a.C.', purpose: 'Enseñar a Israel a vivir como pueblo santo ante Dios.', key_themes: 'Santidad, sacrificio, sacerdocio, pureza', summary: 'Levítico contiene las leyes sobre sacrificios, sacerdocio, pureza y santidad para el pueblo de Israel.', content: 'Levítico recibe su nombre de la tribu de Leví, encargada del sacerdocio. El libro enseña que Dios es santo y exige santidad de su pueblo. Presenta cinco tipos de sacrificios, las festividades anuales, las leyes de pureza y el día de la expiación. Todo el sistema sacrificial apunta a la necesidad de un mediador y a la obra expiatoria futura de Cristo.' },
  { book: 'Números', author: 'Moisés', date_written: 'c. 1445-1405 a.C.', purpose: 'Relatar los 40 años de peregrinación de Israel por el desierto.', key_themes: 'Obediencia, juicio, provisión, censos', summary: 'Números narra el fracaso de Israel en el desierto y la paciencia de Dios con su pueblo.', content: 'El libro toma su nombre de los censos realizados a Israel. Relata la marcha desde el Sinaí hasta las puertas de Canaán, incluyendo la rebelión en Cades-barnea, la condena a 40 años de errar por el desierto, y las provisiones continuas de Dios. Es un recordatorio de las consecuencias de la desobediencia y de la fidelidad divina a pesar del fracaso humano.' },
  { book: 'Deuteronomio', author: 'Moisés', date_written: 'c. 1405 a.C.', purpose: 'Renovar el pacto con la nueva generación antes de entrar a Canaán.', key_themes: 'Pacto, ley, obediencia, bendición, maldición', summary: 'Deuteronomio contiene los discursos finales de Moisés recordando la ley de Dios.', content: 'Deuteronomio significa "segunda ley". Moisés repasa la historia de Israel y la ley para la generación que entraría a la tierra prometida. El libro enfatiza el amor exclusivo a Dios, la obediencia a su pacto y las consecuencias de la fidelidad o la apostasía. También profetiza la venida de un profeta como Moisés.' },
  { book: 'Josué', author: 'Josué', date_written: 'c. 1400-1375 a.C.', purpose: 'Narrar la conquista y distribución de la tierra prometida.', key_themes: 'Conquista, fe, liderazgo, herencia', summary: 'Josué cuenta cómo Israel conquistó Canaán bajo el liderazgo de Josué.', content: 'Tras la muerte de Moisés, Josué asume el liderazgo. El libro narra la entrada a Canaán, la caída de Jericó, las batallas contra los cananeos y la distribución de la tierra entre las tribus. El lema del libro es: "Esforzaos y sed valientes". Muestra cómo la victoria depende de la obediencia a Dios.' },
  { book: 'Jueces', author: 'Anónimo / posiblemente Samuel', date_written: 'c. 1043 a.C.', purpose: 'Mostrar el ciclo de pecado, opresión y liberación en Israel.', key_themes: 'Apostasía, liberación, jueces, caos', summary: 'Jueces relata el período en que Israel no tenía rey y cada uno hacía lo que bien le parecía.', content: 'El libro de los Jueces describe un ciclo repetido: Israel peca, Dios lo entrega a enemigos, Israel clama, Dios levanta un juez que los libera. Figuras como Débora, Gedeón, Jefté y Sansón ilustran tanto la gracia de Dios como la debilidad humana. El libro concluye con la frase: "En aquellos días no había rey en Israel; cada uno hacía lo que bien le parecía".' },
  { book: 'Rut', author: 'Anónimo / posiblemente Samuel', date_written: 'c. 1010-930 a.C.', purpose: 'Mostrar la providencia de Dios y el linaje del Mesías.', key_themes: 'Lealtad, redención, providencia, linaje', summary: 'Rut cuenta la historia de una mujer moabita que se une al pueblo de Israel y antepasa del rey David.', content: 'Rut es un relato breve pero poderoso. Tras quedar viuda, Rut elige acompañar a su suegra Noemí a Belén. Allí recoge espigas en el campo de Boaz, su pariente redentor, quien la toma por esposa. De su unión nace Obed, abuelo del rey David. El libro muestra la fidelidad, la redención y cómo Dios incluye a los gentiles en su plan.' },
  { book: '1 Samuel', author: 'Anónimo / posiblemente Samuel, Natán y Gad', date_written: 'c. 930 a.C.', purpose: 'Narrar el establecimiento de la monarquía en Israel.', key_themes: 'Monarquía, unción, obediencia, rebelión', summary: '1 Samuel cuenta la vida de Samuel, el reinado de Saúl y la unción de David.', content: 'El libro comienza con el nacimiento de Samuel, el último juez y profeta. Israel pide un rey, y Dios concede a Saúl, cuya desobediencia lo lleva al rechazo divino. Samuel unge a David, quien sirve en la corte de Saúl, huye de sus persecuciones y finalmente es reconocido como rey. 1 Samuel muestra que Dios valora la obediencia sobre los sacrificios.' },
  { book: '2 Samuel', author: 'Anónimo / posiblemente Natán y Gad', date_written: 'c. 930 a.C.', purpose: 'Relatar el reinado de David sobre Israel.', key_themes: 'Reino, alianza, pecado, consecuencias', summary: '2 Samuel narra las victorias y fracasos del rey David.', content: 'David consolida su reinado, conquista Jerusalén y recibe la promesa de un reino eterno. Sin embargo, comete adulterio con Betsabé y asesina a Urías. El libro no oculta sus pecados ni sus consecuencias, pero también muestra su arrepentimiento. Es un retrato realista de un hombre conforme al corazón de Dios que aun así falla.' },
  { book: '1 Reyes', author: 'Anónimo / posiblemente Jeremías', date_written: 'c. 560-538 a.C.', purpose: 'Narrar la historia de los reyes de Israel y Judá.', key_themes: 'Sabiduría, apostasía, profetas, división', summary: '1 Reyes cubre el reinado de Salomón, la construcción del templo y la división del reino.', content: 'Salomón hereda el trono y construye el templo de Jerusalén, pero sus muchas esposas extranjeras lo apartan de Dios. Tras su muerte, el reino se divide en Israel (norte) y Judá (sur). El libro presenta profetas como Elías y relata la lucha entre el culto verdadero a Yahvé y la idolatría de Baal.' },
  { book: '2 Reyes', author: 'Anónimo / posiblemente Jeremías', date_written: 'c. 560-538 a.C.', purpose: 'Relatar la caída de Israel y Judá por la apostasía.', key_themes: 'Juicio, exilio, profetas, restauración', summary: '2 Reyes narra el exilio de Israel y Judá y el fin de la monarquía.', content: 'El libro continúa la historia de los reyes divididos, destacando ministerios proféticos como Eliseo. Israel cae ante Asiria en 722 a.C. y Judá ante Babilonia en 586 a.C. El templo es destruido y el pueblo es llevado al exilio. A pesar del juicio, el libro deja abierta la esperanza de restauración prometida por los profetas.' },
  { book: '1 Crónicas', author: 'Esdras', date_written: 'c. 450-400 a.C.', purpose: 'Repasar la historia de Israel desde una perspectiva sacerdotal y genealógica.', key_themes: 'Genealogía, adoración, templo, reino', summary: '1 Crónicas presenta genealogías y el reinado de David enfocado en el culto.', content: 'El libro comienza con extensas genealogías desde Adán hasta el retorno del exilio. Luego narra el reinado de David, enfatizando su preparación para la construcción del templo y la organización del culto y los levitas. Es una obra escrita para fortalecer la identidad de Israel después del exilio.' },
  { book: '2 Crónicas', author: 'Esdras', date_written: 'c. 450-400 a.C.', purpose: 'Narrar la historia de Judá hasta el exilio y restauración.', key_themes: 'Templo, reforma, juicio, restauración', summary: '2 Crónicas cubre el reinado de Salomón hasta el retorno del exilio.', content: 'El libro se centra en el reino del sur (Judá), la construcción del templo, las reformas de Josafat, Ezequías y Josías, y finalmente la caída y restauración. Destaca cómo la fidelidad a Dios trae bendición y la apostasía trae juicio. Termina con el decreto de Ciro permitiendo el regreso a Jerusalén.' },
  { book: 'Esdras', author: 'Esdras', date_written: 'c. 458-444 a.C.', purpose: 'Relatar el retorno del exilio y la restauración del culto.', key_themes: 'Retorno, restauración, ley, adoración', summary: 'Esdras narra el regreso de los judíos a Jerusalén y la reconstrucción del templo.', content: 'Tras 70 años de exilio, Ciro de Persia permite que los judíos regresen. Zorobabel lidera la reconstrucción del templo, enfrentando oposición. Más tarde, Esdras, escriba y sacerdote, llega para enseñar la Ley y reformar la vida religiosa del pueblo. El libro subraya la importancia de la Palabra de Dios.' },
  { book: 'Nehemías', author: 'Nehemías', date_written: 'c. 445-425 a.C.', purpose: 'Relatar la reconstrucción de los muros de Jerusalén.', key_themes: 'Liderazgo, reconstrucción, oposición, confesión', summary: 'Nehemías organiza la reconstrucción de los muros de Jerusalén.', content: 'Nehemías, copero del rey persa Artajerjes, obtiene permiso para reconstruir los muros de Jerusalén. A pesar de la oposición externa e interna, la obra se completa en 52 días. El libro también incluye una gran confesión de pecados del pueblo y un pacto de fidelidad a la Ley de Dios.' },
  { book: 'Ester', author: 'Anónimo / posiblemente Mardoqueo', date_written: 'c. 450-331 a.C.', purpose: 'Mostrar la providencia de Dios en la protección de su pueblo.', key_themes: 'Providencia, valor, salvación, anti-Semitismo', summary: 'Ester relata cómo una reina judía salvó a su pueblo de la destrucción en Persia.', content: 'Ester, una joven judía, se convierte en reina de Persia. Cuando Amán planea exterminar a los judíos, Mardoqueo insta a Ester a intervenir. A través de ayunos, banquetes y valentía, Ester logra que el rey derogue el decreto mortal. El libro no menciona explícitamente a Dios, pero muestra su providencia oculta.' },
  { book: 'Job', author: 'Anónimo / posiblemente Moisés o Salomón', date_written: 'Incertidumbre, posiblemente c. 2000-1800 a.C.', purpose: 'Explorar el problema del sufrimiento del justo.', key_themes: 'Sufrimiento, justicia de Dios, sabiduría, fe', summary: 'Job narra la prueba de un hombre justo y su diálogo con Dios.', content: 'Job es un hombre intachable que pierde riquezas, hijos y salud. Sus amigos argumentan que debe haber pecado, pero Job defiende su inocencia. Al final, Dios responde desde el torbellino, mostrando su sabiduría y soberanía. Job aprende a confiar en Dios sin exigir explicaciones, y es restaurado.' },
  { book: 'Salmos', author: 'Varios (David, Asaf, hijos de Coré, Salomón, Moisés, anónimos)', date_written: 'c. 1440-450 a.C.', purpose: 'Ser el himnario y libro de oraciones de Israel.', key_themes: 'Adoración, oración, alabanza, lamentación, confianza', summary: 'Salmos es una colección de cánticos y poesía espiritual.', content: 'Los Salmos expresan toda la gama de emociones humanas ante Dios: alegría, tristeza, confianza, arrepentimiento y alabanza. Incluyen salmos de alabanza, lamentación, acción de gracias, sabiduría y realeza. Muchos salmos son proféticos y apuntan al Mesías, especialmente el Salmo 22 y el Salmo 110.' },
  { book: 'Proverbios', author: 'Salomón y otros', date_written: 'c. 970-700 a.C.', purpose: 'Enseñar sabiduría práctica para vivir rectamente.', key_themes: 'Sabiduría, justicia, disciplina, relaciones', summary: 'Proverbios es una colección de máximas sabias para la vida diaria.', content: 'El libro presenta la sabiduría como un tesoro que proviene del temor de Jehová. A través de proverbios breves, enseña sobre honestidad, trabajo, amistad, familia, riqueza, palabra y conducta sexual. La sabiduría personificada llama a los jóvenes a escoger el camino de la vida y evitar la necedad.' },
  { book: 'Eclesiastés', author: 'Salomón', date_written: 'c. 935 a.C.', purpose: 'Reflexionar sobre el sentido de la vida bajo el sol.', key_themes: 'Vanidad, propósito, temor de Dios, disfrute', summary: 'Eclesiastés examina lo que tiene valor verdadero en la vida.', content: 'El Predicador explora la sabiduría, el placer, el trabajo y la riqueza, y concluye que todo es "vanidad de vanidades" sin Dios. La vida bajo el sol no tiene sentido eterno por sí sola. El resumen del libro es: "Todo lo que tu mano encontrare para hacer, hazlo con toda tu fuerza", y "Teme a Dios, y guarda sus mandamientos; porque esto es el todo del hombre".' },
  { book: 'Cantares', author: 'Salomón', date_written: 'c. 965 a.C.', purpose: 'Celebrar el amor romántico dentro del matrimonio.', key_themes: 'Amor, matrimonio, belleza, intimidad', summary: 'Cantares es un poema lírico sobre el amor entre un esposo y una esposa.', content: 'También llamado Cantar de los Cantares, este libro celebra el amor sexual y emocional dentro del pacto matrimonial. Algunos lo interpretan también como una alegoría del amor de Dios por su pueblo o de Cristo por la iglesia. Su mensaje central es que el amor verdadero es hermoso, mutuo y exclusivo.' },
  { book: 'Isaías', author: 'Isaías', date_written: 'c. 700-681 a.C.', purpose: 'Anunciar juicio, redención y la venida del Mesías.', key_themes: 'Juicio, redención, Mesías, siervo sufriente', summary: 'Isaías es el libro profético más extenso, lleno de profecías mesiánicas.', content: 'Isaías sirvió durante el reinado de Ezequías y profetizó contra Judá, Israel y las naciones. Anunció la caída de Jerusalén y el exilio, pero también la restauración futura. Profecías notables incluyen el nacimiento virginal (7:14), el príncipe de paz (9:6) y el siervo sufriente (capítulos 52-53), claramente cumplidas en Jesucristo.' },
  { book: 'Jeremías', author: 'Jeremías', date_written: 'c. 627-580 a.C.', purpose: 'Advertir a Judá del juicio inminente y prometer restauración.', key_themes: 'Juicio, arrepentimiento, pacto nuevo, restauración', summary: 'Jeremías, el profeta llorón, anunció la destrucción de Jerusalén.', content: 'Jeremías profetizó durante más de 40 años, llamando a Judá al arrepentimiento. Su mensaje fue rechazado y sufrió persecución. Profetizó la caída de Jerusalén, el exilio a Babilonia y, finalmente, un "pacto nuevo" escrito en el corazón. El libro muestra el dolor de Dios por el pecado de su pueblo.' },
  { book: 'Lamentaciones', author: 'Jeremías', date_written: 'c. 586 a.C.', purpose: 'Lamentar la destrucción de Jerusalén.', key_themes: 'Lamento, juicio, esperanza, misericordia', summary: 'Lamentaciones son poemas de duelo por la caída de Jerusalén.', content: 'Estos cinco poemas expresan el profundo dolor por la destrucción del templo y la ciudad. Reconocen que el juicio fue merecido por la rebeldía de Israel. A pesar de la oscuridad, el libro afirma la fidelidad de Dios: "Grandes son tus misericordias, oh Jehová; no me consumas".' },
  { book: 'Ezequiel', author: 'Ezequiel', date_written: 'c. 593-571 a.C.', purpose: 'Anunciar juicio y restauración a Israel en el exilio.', key_themes: 'Gloria de Dios, juicio, restauración, templo futuro', summary: 'Ezequiel profetizó desde Babilonia con visiones poderosas.', content: 'Ezequiel, sacerdote y profeta, fue llevado al exilio. Vio la gloria de Dios abandonar el templo, pero también la promesa de restauración. Usó parábolas, actos simbólicos y visiones del templo futuro. El libro enseña que Dios actúa para santificar su nombre y dar un corazón nuevo a su pueblo.' },
  { book: 'Daniel', author: 'Daniel', date_written: 'c. 605-536 a.C.', purpose: 'Mostrar la soberanía de Dios sobre los imperios y el fin de los tiempos.', key_themes: 'Soberanía, profecía, resurrección, reino eterno', summary: 'Daniel relata la vida de un joven hebreo en Babilonia y sus profecías.', content: 'Daniel fue llevado cautivo a Babilonia, donde sirvió a varios reyes. El libro combina relatos históricos (el horno de fuego, la fosa de leones) con profecías apocalípticas sobre imperios mundiales y el fin de los tiempos. Destaca que el Dios de Israel gobierna sobre todos los reinos humanos.' },
  { book: 'Oseas', author: 'Oseas', date_written: 'c. 755-715 a.C.', purpose: 'Usar el matrimonio de Oseas como metáfora del amor de Dios por Israel.', key_themes: 'Adulterio espiritual, amor inquebrantable, juicio', summary: 'Oseas ilustra la infidelidad de Israel y el amor fiel de Dios.', content: 'Dios mandó a Oseas a casarse con una mujer infiel, simbolizando la relación de Dios con Israel. Aunque Israel se prostituyó adorando ídolos, Dios sigue amando y llamando a su pueblo al arrepentimiento. Es una poderosa demostración de gracia y juicio.' },
  { book: 'Joel', author: 'Joel', date_written: 'Incertidumbre, posiblemente c. 835-796 a.C.', purpose: 'Anunciar juicio mediante langostas y la futura efusión del Espíritu.', key_themes: 'Juicio, arrepentimiento, día del Señor, Espíritu Santo', summary: 'Joel profetizó sobre una plaga de langostas y el día de Jehová.', content: 'Joel usa una plaga de langostas como imagen del juicio venidero. Llama al arrepentimiento genuino y promete la restauración. Su profecía sobre la efusión del Espíritu Santo fue cumplida parcialmente en el día de Pentecostés según Hechos 2.' },
  { book: 'Amós', author: 'Amós', date_written: 'c. 760-750 a.C.', purpose: 'Condenar la injusticia social y religiosa de Israel.', key_themes: 'Justicia social, juicio, opresión, restauración', summary: 'Amós denunció la corrupción y exigió justicia para los pobres.', content: 'Amós era pastor de Tecoa cuando Dios lo llamó a profetizar contra Israel y las naciones vecinas. Condenó la explotación de los pobres, la corrupción judicial y la religión vacía. Su famosa exigencia es: "Hagan rodar la justicia como las aguas, y la rectitud como arroyo perenne".' },
  { book: 'Abdías', author: 'Abdías', date_written: 'c. 586-553 a.C.', purpose: 'Anunciar juicio contra Edom por su hostilidad a Israel.', key_themes: 'Orgullo, juicio, venganza de Dios, restauración', summary: 'Abdías es la profecía más corta del Antiguo Testamento.', content: 'Edom, descendiente de Esaú, se regocijó ante la caída de Jerusalén. Abdías profetiza la destrucción total de Edom por su orgullo y violencia. El libro enseña que Dios juzga a las naciones que se oponen a su pueblo.' },
  { book: 'Jonás', author: 'Jonás', date_written: 'c. 760 a.C.', purpose: 'Mostrar la misericordia de Dios hacia las naciones.', key_themes: 'Misericordia, obediencia, juicio, gracia', summary: 'Jonás intenta huir de Dios, pero termina predicando en Nínive.', content: 'Dios llama a Jonás para que predique en Nínive, capital asiria. Jonás huye, es tragado por un gran pez y finalmente obedece. La ciudad se arrepiente, y Dios perdona. El libro desafía el nacionalismo religioso y muestra que la gracia de Dios alcanza a todas las naciones.' },
  { book: 'Miqueas', author: 'Miqueas', date_written: 'c. 735-700 a.C.', purpose: 'Anunciar juicio y prometer un Mesías nacido en Belén.', key_tmes: 'Justicia, juicio, Mesías, paz', summary: 'Miqueas profetizó contra Samaria y Jerusalén, pero también prometió esperanza.', content: 'Miqueas denunció la corrupción de líderes y profetas falsos. Predijo la destrucción de Samaria y Jerusalén, pero también la llegada de un gobernante de Belén que traerá paz. El libro equilibra juicio y esperanza mesiánica.' },
  { book: 'Nahúm', author: 'Nahúm', date_written: 'c. 663-612 a.C.', purpose: 'Anunciar la caída de Nínive.', key_themes: 'Juicio, venganza divina, justicia', summary: 'Nahúm profetizó la destrucción de Nínive.', content: 'Mientras Jonás muestra el arrepentimiento de Nínive, Nahúm anuncia su caída definitiva por su maldad. El libro describe el poder de Dios sobre las naciones y su justicia contra la crueldad y la opresión.' },
  { book: 'Habacuc', author: 'Habacuc', date_written: 'c. 605 a.C.', purpose: 'Cuestionar a Dios sobre el mal y recibir respuesta de fe.', key_themes: 'Fe, justicia, paciencia, alabanza', summary: 'Habacuc dialoga con Dios sobre la injusticia y aprende a confiar.', content: 'Habacuc le pregunta a Dios por qué permite la injusticia en Judá. Dios responde que usará a Babilonia como instrumento de juicio. El profeta aprende a vivir por fe y concluye con un himno de confianza en Dios aunque todo falle.' },
  { book: 'Sofonías', author: 'Sofonías', date_written: 'c. 640-621 a.C.', purpose: 'Anunciar el día de Jehová y llamar al arrepentimiento.', key_themes: 'Día del Señor, juicio, restauración, alabanza', summary: 'Sofonías habló del día del juicio venidero de Dios.', content: 'El libro anuncia juicio sobre Judá y las naciones en el "día de Jehová". Sin embargo, también promete restauración para el remanente humilde y fiel. Concluye con un canto de alegría porque Dios habita en medio de su pueblo.' },
  { book: 'Hageo', author: 'Hageo', date_written: 'c. 520 a.C.', purpose: 'Motivar a los judíos a terminar la reconstrucción del templo.', key_themes: 'Prioridades, templo, bendición, obediencia', summary: 'Hageo exhortó a retomar la obra del templo después del exilio.', content: 'Tras el retorno del exilio, el pueblo se había detenido en la reconstrucción del templo. Hageo les dice que es tiempo de edificar la casa de Dios. Promete que la gloria futura del templo será mayor que la primera.' },
  { book: 'Zacarías', author: 'Zacarías', date_written: 'c. 520-518 a.C.', purpose: 'Animar al pueblo y profetizar sobre el Mesías y el fin de los tiempos.', key_themes: 'Mesías, templo, restauración, profecía apocalíptica', summary: 'Zacarías usó visiones nocturnas para hablar de restauración y del Mesías.', content: 'Zacarías combina mensajes prácticos para su tiempo con profecías mesiánicas. Anuncia al Rey que entraría en Jerusalén sobre un pollino, al siervo herido, y la futura glorificación de Jerusalén. Sus visiones animaron a los exiliados a seguir reconstruyendo.' },
  { book: 'Malaquías', author: 'Malaquías', date_written: 'c. 450-400 a.C.', purpose: 'Confrontar la apatía religiosa y anunciar la venida del Mesías.', key_themes: 'Pacto, adoración, diezmo, precursor del Mesías', summary: 'Malaquías, último libro del Antiguo Testamento, desafió la mediocridad espiritual.', content: 'El pueblo cuestionaba el amor de Dios, ofrecía sacrificios defectuosos y retenía los diezmos. Malaquías los llama a volver al corazón del pacto. Cierra el Antiguo Testamento con la promesa de que vendía Elías antes del gran día de Jehová.' },
  { book: 'Mateo', author: 'Mateo (Leví)', date_written: 'c. 50-70 d.C.', purpose: 'Presentar a Jesús como el Mesías prometido y Rey de Israel.', key_themes: 'Reino de los cielos, Mesías, cumplimiento de profecías', summary: 'Mateo enfatiza que Jesús es el cumplimiento de las promesas del Antiguo Testamento.', content: 'Escrito para judíos, el Evangelio de Mateo presenta a Jesús como el Mesías descendiente de David y Abraham. Contiene cinco grandes discursos de Jesús, incluyendo el Sermón del Monte. El evangelio muestra cómo Jesús cumple las Escrituras y envía a sus discípulos a todas las naciones.' },
  { book: 'Marcos', author: 'Juan Marcos', date_written: 'c. 55-70 d.C.', purpose: 'Presentar a Jesús como el Siervo sufriente y Hijo de Dios.', key_themes: 'Servicio, acción, sufrimiento, discipulado', summary: 'Marcos es el evangelio más breve y dinámico, enfocado en las acciones de Jesús.', content: 'Marcos presenta a Jesús en acción, usando la palabra "enseguida". Enfatiza el sufrimiento de Jesús como Siervo y el llamado al discipulado. El evangelio probablemente refleja el testimonio de Pedro y fue escrito para cristianos gentiles de Roma.' },
  { book: 'Lucas', author: 'Lucas', date_written: 'c. 60-62 d.C.', purpose: 'Dar un relato ordenado de la vida de Jesús para los gentiles.', key_themes: 'Salvación universal, Espíritu Santo, marginados, oración', summary: 'Lucas destaca que el evangelio es para todos, especialmente los excluidos.', content: 'Lucas, médico y compañero de Pablo, escribió el evangelio más largo. Destaca el ministerio de Jesús hacia mujeres, pobres, samaritanos y pecadores. El libro contiene parábolas únicas como el buen samaritano y el hijo pródigo. Su objetivo es confirmar la fe de Teófilo.' },
  { book: 'Juan', author: 'Juan el Apóstol', date_written: 'c. 80-95 d.C.', purpose: 'Mostrar que Jesús es el Hijo de Dios para que los lectores crean en Él.', key_themes: 'Palabra, vida eterna, fe, Espíritu', summary: 'Juan presenta a Jesús como el Dios eterno hecho carne.', content: 'El Cuarto Evangelio es teológico y profundo. Presenta a Jesús como el Verbo, la luz, el pan de vida, el buen pastor y la resurrección. Fue escrito para que "creyendo, tengáis vida en su nombre". Incluye siete señales milagrosas y discursos extensos.' },
  { book: 'Hechos', author: 'Lucas', date_written: 'c. 61-62 d.C.', purpose: 'Narrar el nacimiento y expansión de la iglesia primitiva.', key_themes: 'Espíritu Santo, evangelización, iglesia, misiones', summary: 'Hechos cuenta cómo los apóstoles predicaron el evangelio desde Jerusalén hasta Roma.', content: 'Hechos es la continuación del Evangelio de Lucas. Narra la ascensión de Jesús, el día de Pentecostés, la iglesia primitiva, el martirio de Esteban, la conversión de Pablo y los primeros viajes misioneros. Muestra la obra del Espíritu Santo extendiendo el reino a judíos y gentiles.' },
  { book: 'Romanos', author: 'Pablo', date_written: 'c. 57 d.C.', purpose: 'Explicar el evangelio de la justificación por fe.', key_themes: 'Justificación, fe, gracia, santificación, Israel', summary: 'Romanos es la exposición más sistemática del evangelio en la Biblia.', content: 'Pablo escribe a la iglesia de Roma para presentar el evangelio. El libro explica la condenación universal por el pecado, la justificación por gracia mediante la fe, la vida nueva en el Espíritu, la relación con Israel y la conducta práctica del creyente. Es fundamental para la teología cristiana.' },
  { book: '1 Corintios', author: 'Pablo', date_written: 'c. 55 d.C.', purpose: 'Corregir divisiones e inmoralidad en la iglesia de Corinto.', key_themes: 'Unidad, santidad, dones espirituales, amor, resurrección', summary: 'Pablo aborda problemas de la iglesia de Corinto con amor y autoridad.', content: 'La iglesia de Corinto tenía divisiones, inmoralidad sexual, conflictos por alimentos sacrificados a ídolos y abuso de los dones espirituales. Pablo les enseña sobre la unidad en Cristo, el amor como camino excelente, la importancia de la resurrección y el orden en la adoración.' },
  { book: '2 Corintios', author: 'Pablo', date_written: 'c. 55-56 d.C.', purpose: 'Defender el ministerio apostólico y llamar al arrepentimiento.', key_themes: 'Consolación, ministerio, generosidad, debilidad y poder', summary: 'Pablo defiende su apostolado y exhorta a la reconciliación.', content: 'En esta segunda carta, Pablo defiende su integridad apostólica contra falsos maestros. Habla de las aflicciones del ministerio, la importancia de la generosidad para los santos de Jerusalén y la suficiencia de la gracia de Dios en la debilidad humana.' },
  { book: 'Gálatas', author: 'Pablo', date_written: 'c. 48-55 d.C.', purpose: 'Defender la libertad del evangelio contra la legalización.', key_themes: 'Libertad, fe, ley, gracia, fruto del Espíritu', summary: 'Pablo combate la enseñanza de que los gentiles deben circuncidarse.', content: 'Algunos judaizantes enseñaban que los creyentes gentiles debían circuncidarse y guardar la ley de Moisés para ser salvos. Pablo defiende fervientemente la justificación por fe sola y la libertad en Cristo. Presenta el fruto del Espíritu como evidencia de la vida cristiana.' },
  { book: 'Efesios', author: 'Pablo', date_written: 'c. 60-62 d.C.', purpose: 'Describir la posición y conducta de la iglesia en Cristo.', key_themes: 'Unidad, iglesia, gracia, armadura de Dios', summary: 'Efesios presenta la riqueza espiritual del creyente y la vida práctica.', content: 'La primera mitad del libro describe las bendiciones espirituales en Cristo: elección, redención, unidad de judíos y gentiles en la iglesia. La segunda mitad enseña cómo vivir: en verdad, amor, unidad familiar y armadura espiritual para resistir al enemigo.' },
  { book: 'Filipenses', author: 'Pablo', date_written: 'c. 61 d.C.', purpose: 'Agradecer a la iglesia de Filipos y animarla al gozo.', key_themes: 'Gozo, humildad, suficiencia en Cristo, buena obra', summary: 'Filipenses es una carta de gozo escrita desde la prisión.', content: 'Pablo agradece el apoyo de la iglesia de Filipos y les exhorta a regocijarse siempre en el Señor. Presenta el himno de la humillación de Cristo y la suficiencia de su gracia. Es una de las cartas más personales y alegres de Pablo.' },
  { book: 'Colosenses', author: 'Pablo', date_written: 'c. 60-62 d.C.', purpose: 'Combatir herejías y exaltar la supremacía de Cristo.', key_themes: 'Supremacía de Cristo, plenitud, misticismo, familia', summary: 'Colosenses enseña que Cristo es suficiente y supremo.', content: 'Pablo combate enseñanzas que menoscababan la divinidad y suficiencia de Cristo. Enseña que en Cristo habita toda la plenitud de la Deidad y que los creyentes están completos en Él. También da instrucciones prácticas para el hogar y el trabajo.' },
  { book: '1 Tesalonicenses', author: 'Pablo', date_written: 'c. 50-51 d.C.', purpose: 'Animar a una joven iglesia en la fe y la esperanza.', key_themes: 'Esperanza, segunda venida, santidad, trabajo', summary: 'La primera carta de Pablo a una iglesia que él plantó.', content: 'Pablo elogia la fe, amor y esperanza de los tesalonicenses. Les enseña sobre la segunda venida de Cristo, la resurrección de los muertos y la necesidad de vivir en santidad. Es una carta pastoral llena de afecto.' },
  { book: '2 Tesalonicenses', author: 'Pablo', date_written: 'c. 51-52 d.C.', purpose: 'Corregir ideas erróneas sobre la segunda venida.', key_themes: 'Segunda venida, apostasía, trabajo, disciplina', summary: 'Pablo aclara el orden de los eventos del fin de los tiempos.', content: 'Algunos creyentes habían dejado de trabajar creyendo que el día del Señor ya había llegado. Pablo corrige esta idea, explicando que primero vendrá una gran apostasía y el hombre de pecado. Insiste en la importancia del trabajo responsable.' },
  { book: '1 Timoteo', author: 'Pablo', date_written: 'c. 62-64 d.C.', purpose: 'Instruir a Timoteo sobre el liderazgo de la iglesia.', key_themes: 'Liderazgo, doctrina, oración, conducta, diáconos', summary: 'Pablo instruye a su hijo en la fe sobre cómo pastorear la iglesia.', content: 'Pablo deja a Timoteo en Éfeso para combatir falsas doctrinas y organizar la iglesia. Da instrucciones sobre la oración, los roles de hombres y mujeres, los requisitos para obispos y diáconos, y el cuidado de viudas. Es una carta pastoral clave para el gobierno eclesial.' },
  { book: '2 Timoteo', author: 'Pablo', date_written: 'c. 66-67 d.C.', purpose: 'Animar a Timoteo a permanecer fiel hasta el fin.', key_themes: 'Fidelidad, sufrimiento, Escritura, testimonio final', summary: 'La última carta de Pablo, escrita poco antes de su muerte.', content: 'Pablo está encarcelado y próximo a morir. Exhorta a Timoteo a ser valiente, a guardar el depósito de la fe, a predicar la Palabra y a soportar las aflicciones. Es un llamado a la fidelidad en tiempos difíciles, reconociendo que todas las Escrituras son inspiradas por Dios.' },
  { book: 'Tito', author: 'Pablo', date_written: 'c. 62-64 d.C.', purpose: 'Instruir a Tito para ordenar la iglesia en Creta.', key_themes: 'Liderazgo, sana doctrina, buenas obras, gracia', summary: 'Pablo instruye a Tito sobre la organización y conducta cristiana.', content: 'Tito debía nombrar ancianos en cada ciudad y enseñar sana doctrina. Pablo contrasta la gracia salvadora de Dios con la vana religiosidad, exhortando a vivir de manera sobria, justa y piadosa mientras esperamos la venida gloriosa de Cristo.' },
  { book: 'Filemón', author: 'Pablo', date_written: 'c. 60-62 d.C.', purpose: 'Interceder por Onésimo, un esclavo fugitivo convertido.', key_themes: 'Misericordia, reconciliación, hermandad, gracia', summary: 'Filemón es una carta personal sobre perdón y restauración.', content: 'Onésimo, esclavo de Filemón, huyó, conoció a Pablo en prisión y se convirtió. Pablo le pide a Filemón que lo reciba no como esclavo, sino como hermano amado. Es una hermosa ilustración práctica del evangelio de reconciliación.' },
  { book: 'Hebreos', author: 'Anónimo / posiblemente Apolos o Bernabé', date_written: 'c. 60-70 d.C.', purpose: 'Demostrar la superioridad de Cristo sobre el sistema del Antiguo Testamento.', key_themes: 'Superioridad de Cristo, fe, sacrificio, descanso', summary: 'Hebreos exhorta a judíos creyentes a no abandonar la fe.', content: 'Cristo es superior a los ángeles, a Moisés, al sacerdocio de Aarón y a los sacrificios del Antiguo Pacto. Es el Sumo Sacerdote perfecto y el sacrificio definitivo por el pecado. El libro incluye el gran capítulo de la fe (Hebreos 11) y una llamada a perseverar.' },
  { book: 'Santiago', author: 'Santiago, hermano de Jesús', date_written: 'c. 45-50 d.C.', purpose: 'Enseñar que la fe verdadera se demuestra en obras.', key_themes: 'Fe y obras, pruebas, lengua, sabiduría, pobreza', summary: 'Santiago es una carta práctica sobre la conducta cristiana.', content: 'Santiago enseña que la fe sin obras está muerta. Aborda el manejo de las pruebas, el control de la lengua, la pureza religiosa, los ricos y los pobres, y la oración. Es un llamado a vivir la fe de manera auténtica y práctica.' },
  { book: '1 Pedro', author: 'Pedro', date_written: 'c. 60-64 d.C.', purpose: 'Animar a cristianos perseguidos a perseverar en la fe.', key_themes: 'Sufrimiento, esperanza, santidad, sumisión, liderazgo', summary: 'Pedro escribe a creyentes dispersos que enfrentaban persecución.', content: 'Pedro anima a los cristianos a regocijarse en medio del sufrimiento, recordando su esperanza viva en Cristo. Enseña sobre la santidad, la sumisión a las autoridades, el matrimonio, el sufrimiento por hacer el bien y el liderazgo en la iglesia.' },
  { book: '2 Pedro', author: 'Pedro', date_written: 'c. 67-68 d.C.', purpose: 'Advertir contra falsos maestros y recordar la segunda venida.', key_themes: 'Conocimiento de Dios, falsos maestros, segunda venida, Escrituras', summary: 'Pedro combate la incredulidad y la inmoralidad de falsos maestros.', content: 'La carta exhorta al crecimiento en el conocimiento de Cristo y advierte contra falsos maestros que niegan la moralidad y la segunda venida. Insiste en que la palabra profética es segura y que el día del Señor vendrá como ladrón en la noche.' },
  { book: '1 Juan', author: 'Juan el Apóstol', date_written: 'c. 85-95 d.C.', purpose: 'Confirmar la fe en Cristo y la vida de comunión con Dios.', key_themes: 'Amor, luz, fe, comunión, anticristo', summary: 'Juan escribe para que los creyentes sepan que tienen vida eterna.', content: 'El libro enfatiza que Dios es luz y amor. El creyente debe caminar en luz, confesar sus pecados, amar a los hermanos y creer en Jesús como Hijo de Dios. Juan combate falsas enseñanzas sobre la encarnación y afirma la seguridad de la salvación.' },
  { book: '2 Juan', author: 'Juan el Apóstol', date_written: 'c. 85-95 d.C.', purpose: 'Advertir contra falsos maestros y exhortar al amor fraternal.', key_themes: 'Verdad, amor, falsos maestros, hospitalidad', summary: 'Carta breve sobre la verdad y el amor en la iglesia.', content: 'Juan escribe a una mujer escogida y a sus hijos, exhortándolos a andar en la verdad y amarse los unos a los otros. Advierte que no reciban a quienes niegan la venida de Cristo en carne.' },
  { book: '3 Juan', author: 'Juan el Apóstol', date_written: 'c. 85-95 d.C.', purpose: 'Elogiar a Gayo y denunciar a Diótrefes.', key_themes: 'Hospitalidad, liderazgo, verdad, ejemplo', summary: 'Carta personal sobre apoyo a misioneros y liderazgo sano.', content: 'Juan alaba a Gayo por su hospitalidad hacia los hermanos que viajaban predicando el evangelio. Al mismo tiempo, reprende a Diótrefes por su ambición de primacía y su rechazo a los misioneros. Es un llamado a imitar el bien.' },
  { book: 'Judas', author: 'Judas, hermano de Jesús', date_written: 'c. 65-80 d.C.', purpose: 'Combatir falsos maestros que corrompían la gracia.', key_themes: 'Contienda por la fe, falsos maestros, juicio, Dios', summary: 'Judas urge a defender la fe contra la inmoralidad encubierta.', content: 'Judas planeaba escribir sobre la salvación común, pero se vio obligado a exhortar a los creyentes a contender por la fe. Denuncia a falsos maestros inmorales que pervierten la gracia de Dios. Concluye con una hermosa doxología sobre la guarda de Dios.' },
  { book: 'Apocalipsis', author: 'Juan el Apóstol', date_written: 'c. 95 d.C.', purpose: 'Revelar la victoria final de Cristo y la consumación de la historia.', key_themes: 'Revelación, juicio, iglesia, segunda venida, nuevo cielo', summary: 'Apocalipsis es una visión profética del triunfo de Cristo sobre el mal.', content: 'Escrito durante el exilio de Juan en Patmos, el libro usa símbolos y visiones para mostrar la soberanía de Cristo sobre la historia. Contiene mensajes a siete iglesias, visiones de juicio, la bestia, la gran tribulación y la gloriosa culminación con un nuevo cielo y una nueva tierra donde Dios habitará con su pueblo.' }
];

const events = [
  { title: 'La Creación', slug: 'la-creacion', description: 'Dios crea los cielos, la tierra, la vida humana y todo lo que existe en seis días, descansando el séptimo.', book: 'Génesis', chapter_start: 1, chapter_end: 2, verse_start: 1, verse_end: 25, timeline_order: 1 },
  { title: 'La Caída del Hombre', slug: 'la-caida-del-hombre', description: 'Adán y Eva desobedecen a Dios en el huerto del Edén, introduciendo el pecado y la muerte.', book: 'Génesis', chapter_start: 3, chapter_end: 3, verse_start: 1, verse_end: 24, timeline_order: 2 },
  { title: 'El Diluvio', slug: 'el-diluvio', description: 'Dios juzga la maldad humana con un diluvio universal, salvando a Noé y su familia en el arca.', book: 'Génesis', chapter_start: 6, chapter_end: 9, verse_start: 1, verse_end: 17, timeline_order: 3 },
  { title: 'La Torre de Babel', slug: 'la-torre-de-babel', description: 'La humanidad intenta edificar una torre hasta el cielo; Dios confunde los idiomas y dispersa a los pueblos.', book: 'Génesis', chapter_start: 11, chapter_end: 11, verse_start: 1, verse_end: 9, timeline_order: 4 },
  { title: 'El Llamado de Abraham', slug: 'el-llamado-de-abraham', description: 'Dios llama a Abram a salir de Ur y le promete descendencia, tierra y bendición para todas las naciones.', book: 'Génesis', chapter_start: 12, chapter_end: 12, verse_start: 1, verse_end: 9, timeline_order: 5 },
  { title: 'El Éxodo', slug: 'el-exodo', description: 'Dios libera a Israel de la esclavitud egipcia mediante diez plagas y el paso por el Mar Rojo.', book: 'Éxodo', chapter_start: 1, chapter_end: 14, verse_start: 1, verse_end: 31, timeline_order: 6 },
  { title: 'La Entrega de los Diez Mandamientos', slug: 'los-diez-mandamientos', description: 'Dios entrega la Ley a Moisés en el Monte Sinaí para guiar a su pueblo.', book: 'Éxodo', chapter_start: 19, chapter_end: 20, verse_start: 1, verse_end: 21, timeline_order: 7 },
  { title: 'La Caída de Jericó', slug: 'la-caida-de-jerico', description: 'Israel conquista Jericó obedeciendo la estrategia de Dios de marchar alrededor de los muros.', book: 'Josué', chapter_start: 6, chapter_end: 6, verse_start: 1, verse_end: 27, timeline_order: 8 },
  { title: 'El Nacimiento de Samuel', slug: 'el-nacimiento-de-samuel', description: 'Ana ora por un hijo y Dios le concede a Samuel, quien se convierte en profeta y juez.', book: '1 Samuel', chapter_start: 1, chapter_end: 3, verse_start: 1, verse_end: 21, timeline_order: 9 },
  { title: 'David y Goliat', slug: 'david-y-goliat', description: 'El joven David vence al gigante filisteo Goliat confiando en Dios.', book: '1 Samuel', chapter_start: 17, chapter_end: 17, verse_start: 1, verse_end: 58, timeline_order: 10 },
  { title: 'La Construcción del Templo', slug: 'la-construccion-del-templo', description: 'Salomón construye el primer templo en Jerusalén como casa de adoración para Dios.', book: '1 Reyes', chapter_start: 6, chapter_end: 8, verse_start: 1, verse_end: 66, timeline_order: 11 },
  { title: 'La Caída de Jerusalén', slug: 'la-caida-de-jerusalen', description: 'Babilonia destruye Jerusalén y el templo; el pueblo es llevado al exilio.', book: '2 Reyes', chapter_start: 25, chapter_end: 25, verse_start: 1, verse_end: 21, timeline_order: 12 },
  { title: 'El Retorno del Exilio', slug: 'el-retorno-del-exilio', description: 'Ciro de Persia permite que los judíos regresen a Jerusalén para reconstruir el templo.', book: 'Esdras', chapter_start: 1, chapter_end: 1, verse_start: 1, verse_end: 11, timeline_order: 13 },
  { title: 'El Nacimiento de Jesús', slug: 'el-nacimiento-de-jesus', description: 'Jesús nace en Belén de una virgen, cumpliendo las profecías mesiánicas.', book: 'Lucas', chapter_start: 2, chapter_end: 2, verse_start: 1, verse_end: 20, timeline_order: 14 },
  { title: 'La Crucifixión', slug: 'la-crucifixion', description: 'Jesús muere en la cruz por los pecados del mundo.', book: 'Juan', chapter_start: 19, chapter_end: 19, verse_start: 16, verse_end: 42, timeline_order: 15 },
  { title: 'La Resurrección', slug: 'la-resurreccion', description: 'Jesús resucita al tercer día, venciendo la muerte.', book: 'Mateo', chapter_start: 28, chapter_end: 28, verse_start: 1, verse_end: 10, timeline_order: 16 },
  { title: 'El Día de Pentecostés', slug: 'el-dia-de-pentecostes', description: 'El Espíritu Santo desciende sobre los discípulos y nace la iglesia.', book: 'Hechos', chapter_start: 2, chapter_end: 2, verse_start: 1, verse_end: 41, timeline_order: 17 },
  { title: 'La Conversión de Pablo', slug: 'la-conversion-de-pablo', description: 'Saulo de Tarso encuentra a Cristo en el camino a Damasco y se convierte en apóstol.', book: 'Hechos', chapter_start: 9, chapter_end: 9, verse_start: 1, verse_end: 22, timeline_order: 18 },
  { title: 'La Nueva Jerusalén', slug: 'la-nueva-jerusalen', description: 'Dios crea un nuevo cielo y una nueva tierra donde habitará con su pueblo para siempre.', book: 'Apocalipsis', chapter_start: 21, chapter_end: 22, verse_start: 1, verse_end: 5, timeline_order: 19 }
];

async function getVerseId(client, bookName, chapter, verse) {
  const result = await client.query(
    `SELECT v.id FROM verses v
     JOIN chapters c ON v.chapter_id = c.id
     JOIN books b ON c.book_id = b.id
     WHERE b.name = $1 AND c.number = $2 AND v.number = $3 AND v.version_id = 1`,
    [bookName, chapter, verse]
  );
  return result.rows[0] ? result.rows[0].id : null;
}

async function getBookId(client, bookName) {
  const result = await client.query('SELECT id FROM books WHERE name = $1', [bookName]);
  return result.rows[0] ? result.rows[0].id : null;
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Insertar estudios temáticos
    for (const study of studies) {
      const insertStudy = await client.query(
        `INSERT INTO studies (topic, slug, summary, content)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET
           summary = EXCLUDED.summary,
           content = EXCLUDED.content,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [study.topic, study.slug, study.summary, study.content]
      );
      const studyId = insertStudy.rows[0].id;

      // Vincular versículos del estudio
      const refs = studyRefs[study.slug] || [];
      for (const [book, chapter, verse] of refs) {
        const verseId = await getVerseId(client, book, chapter, verse);
        if (verseId) {
          await client.query(
            `INSERT INTO study_verses (study_id, verse_id)
             VALUES ($1, $2)
             ON CONFLICT (study_id, verse_id) DO NOTHING`,
            [studyId, verseId]
          );
        } else {
          console.warn(`⚠️ Versículo no encontrado: ${book} ${chapter}:${verse}`);
        }
      }
      console.log(`✅ Estudio "${study.topic}" insertado con ${refs.length} referencias.`);
    }

    // Insertar estudios de libros
    for (const bs of bookStudies) {
      const bookId = await getBookId(client, bs.book);
      if (!bookId) {
        console.warn(`⚠️ Libro no encontrado: ${bs.book}`);
        continue;
      }
      await client.query(
        `INSERT INTO book_studies (book_id, author, date_written, purpose, key_themes, summary, content)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (book_id) DO UPDATE SET
           author = EXCLUDED.author,
           date_written = EXCLUDED.date_written,
           purpose = EXCLUDED.purpose,
           key_themes = EXCLUDED.key_themes,
           summary = EXCLUDED.summary,
           content = EXCLUDED.content,
           updated_at = CURRENT_TIMESTAMP`,
        [bookId, bs.author, bs.date_written, bs.purpose, bs.key_themes, bs.summary, bs.content]
      );
    }
    console.log(`✅ ${bookStudies.length} estudios de libros insertados.`);

    // Insertar eventos
    for (const ev of events) {
      const bookId = await getBookId(client, ev.book);
      if (!bookId) {
        console.warn(`⚠️ Libro no encontrado para evento: ${ev.book}`);
        continue;
      }
      await client.query(
        `INSERT INTO events (title, slug, description, book_id, chapter_start, chapter_end, verse_start, verse_end, timeline_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           book_id = EXCLUDED.book_id,
           chapter_start = EXCLUDED.chapter_start,
           chapter_end = EXCLUDED.chapter_end,
           verse_start = EXCLUDED.verse_start,
           verse_end = EXCLUDED.verse_end,
           timeline_order = EXCLUDED.timeline_order,
           updated_at = CURRENT_TIMESTAMP`,
        [ev.title, ev.slug, ev.description, bookId, ev.chapter_start, ev.chapter_end, ev.verse_start, ev.verse_end, ev.timeline_order]
      );
    }
    console.log(`✅ ${events.length} eventos históricos insertados.`);

    console.log('🎉 Seed de estudios, libros y eventos completado.');
  } catch (error) {
    console.error('❌ Error al ejecutar seed de estudios:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
