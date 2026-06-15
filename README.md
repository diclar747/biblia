# Biblia Online

Aplicación web para buscar, leer y estudiar la Biblia. Incluye buscador inteligente, lector continuo, favoritos, etiquetas, listas personales, cuaderno espiritual y juegos bíblicos.

## Tecnologías

- **Backend:** Node.js, Express, PostgreSQL (Neon)
- **Frontend:** HTML, CSS, JavaScript vanilla (PWA)
- **Autenticación:** JWT
- **Base de datos:** PostgreSQL mediante `pg`

## Requisitos

- Node.js 18+
- Cuenta en [Neon](https://neon.tech/) (o servidor PostgreSQL propio)

## Configuración

1. Clonar el repositorio:

```bash
git clone https://github.com/diclar747/biblia.git
cd biblia
```

2. Instalar dependencias:

```bash
npm install
```

3. Configurar la variable `DATABASE_URL` en el archivo `.env`:

```env
DATABASE_URL=postgresql://usuario:password@host.neon.tech/basedatos?sslmode=require
JWT_SECRET=tu_secreto_jwt
PORT=3000
```

4. Crear tablas y datos iniciales:

```bash
node db/setup_postgres.js
```

5. (Opcional) Importar la Biblia completa en RVR1960:

```bash
node db/import_bible.js
```

6. Iniciar el servidor:

```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000`.

## Usuarios de demostración

| Usuario            | Email                 | Contraseña | Rol   |
|--------------------|-----------------------|------------|-------|
| Administrador      | admin@biblia.com      | admin123   | admin |
| Juan Lector        | juan@biblia.com       | juan123    | user  |
| María Lectora      | maria@biblia.com      | maria123   | user  |

## Funcionalidades principales

- Búsqueda por palabra clave con filtros por versión, libro, testamento y etiqueta.
- Búsqueda por cita bíblica (`Lucas 2:5`, `Juan 3:16-18`) mostrando el capítulo completo.
- Lector lateral con navegación entre capítulos.
- Guardar favoritos, etiquetar versículos, crear listas y escribir notas.
- Comparar versículos entre versiones.
- Generar tarjetas bíblicas con imágenes.
- Juegos bíblicos con sistema de puntos y logros.

## Estructura del proyecto

```
controllers/    # Lógica de la API
routes/         # Definición de rutas
middleware/     # Middleware (autenticación)
db/             # Esquema, seed, scripts y conexión a BD
public/         # Frontend estático
```

## Licencia

ISC
