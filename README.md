# Streaminparty

Plataforma web para descubrir servicios de streaming y ver contenido en salas compartidas.

## Desarrollo

```bash
npm install
npm run dev
```

Abre la URL que muestre Vite en el navegador.

## Configuración de Firebase

1. Crea un proyecto en Firebase y habilita Authentication > Email/Password y Authentication > Google.
2. Crea Firestore en producción y publica las reglas con `firebase deploy --only firestore:rules`.
3. Registra una Web App en Firebase y copia sus valores a un archivo `.env.local` usando `.env.example`.
4. En Vercel, añade las mismas variables `VITE_FIREBASE_*` para Production, Preview y Development.
5. En Firebase Authentication > Settings > Authorized domains, añade el dominio de Vercel y tu dominio personalizado.

El archivo `.env.local` nunca debe subirse a GitHub. Las reglas restringen las salas y perfiles a usuarios autenticados; un enlace compartido permite unirse a esa sala concreta.

## Catálogo y servicios

Si defines `VITE_TMDB_API_KEY`, el catálogo se actualiza con metadatos e imágenes de TMDB. Sin esa variable se utiliza el catálogo de demostración incluido. La app no aloja ni reproduce contenido protegido: los botones de servicios abren los sitios oficiales de Netflix, Prime Video, Max, Disney+ y Apple TV+.

## Funcionalidades actuales

- Catálogo visual con filtros por servicio y género.
- Búsqueda de películas y series.
- Lista personal con favoritos.
- Sala compartida con enlace de invitación.
- Autenticación real con correo y contraseña mediante Firebase Auth.
- Estado de reproducción sincronizado en tiempo real mediante Firestore.
- Diseño responsive para escritorio y móvil.

## Producción en Vercel

- Build command: `npm run build`
- Output directory: `dist`
- Deploy: conecta el repositorio de GitHub y activa Deploy on push.
- Añade las variables de `.env.example` en Project Settings > Environment Variables.