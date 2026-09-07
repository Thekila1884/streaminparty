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
3. Activa Storage y publica sus reglas con `firebase deploy --only storage`.
4. Registra una Web App en Firebase y copia sus valores a un archivo `.env.local` usando `.env.example`.
5. En Vercel, añade las mismas variables `VITE_FIREBASE_*` para Production, Preview y Development.
6. En Firebase Authentication > Settings > Authorized domains, añade el dominio de Vercel y tu dominio personalizado.

El archivo `.env.local` nunca debe subirse a GitHub. Las reglas restringen las salas y perfiles a usuarios autenticados; un enlace compartido permite unirse a esa sala concreta.

## Catálogo y servicios

Si defines `VITE_TMDB_API_KEY`, el catálogo se actualiza con metadatos e imágenes de TMDB. Sin esa variable se utiliza el catálogo de demostración incluido. La app no aloja ni reproduce contenido protegido: los botones de servicios abren los sitios oficiales de Netflix, Prime Video, Max, Disney+ y Apple TV+.

### Google dentro de la app

Google TV no forma parte del catálogo. Para ofrecer una búsqueda de Google dentro de la interfaz, la opción correcta es Google Programmable Search, no un `iframe` de `google.com`.

1. Crea un buscador en Google Programmable Search Engine.
2. Configura los sitios que quieres consultar y copia el `Search Engine ID`.
3. Crea una API key en Google Cloud con acceso a Custom Search JSON API.
4. Añade `VITE_GOOGLE_SEARCH_API_KEY` y `VITE_GOOGLE_SEARCH_ENGINE_ID` en Vercel.

La búsqueda se renderiza en una vista propia usando la API oficial. No se deben capturar sesiones, ocultar redirecciones ni intentar saltarse `X-Frame-Options` o CSP de Google.

## Integración OTT autorizada

La carpeta `src/streaming/` contiene una capa separada para reproducción sincronizada de contenido propio o de un proveedor que entregue un SDK/API oficial:

- `roomSync.js` publica y escucha `currentTime`, `isPlaying` y `updatedAt` en Firestore, y fuerza resincronización cuando la diferencia supera 2 segundos.
- `LicensedMediaPlayer.jsx` usa el elemento multimedia del navegador con una URL de contenido licenciada, separando el reproductor de la lógica de sala.
- El modelo de sala es `Room { id, participants, hostId, mediaUrl, currentTime, isPlaying }`. En Firestore se valida que solo se actualicen campos de sincronización permitidos.

Para Netflix, Disney+, Max u otro OTT con DRM, la reproducción integrada requiere un acuerdo comercial y el SDK oficial del proveedor (por ejemplo, un módulo Widevine/FairPlay autorizado). La aplicación no captura cookies, no intercepta tráfico, no llama endpoints privados, no extrae tokens y no implementa bypass de DRM. Sin esa autorización, la opción soportada es abrir el servicio oficial y sincronizar únicamente el estado de la sala.

```mermaid
flowchart LR
	A[Usuario inicia sesión con Firebase] --> B[Entra o crea una sala]
	B --> C{Fuente autorizada}
	C -->|SDK oficial OTT| D[Reproductor DRM del proveedor]
	C -->|Contenido propio| E[LicensedMediaPlayer]
	D --> F[Host publica play/pause/tiempo]
	E --> F
	F --> G[Firestore /rooms/{id}]
	G --> H[Guests reciben onSnapshot]
	H --> I{Desviación > 2 s}
	I -->|Sí| J[Reajustar currentTime]
	I -->|No| K[Continuar reproducción]
```

## Funcionalidades actuales

- Catálogo visual con filtros por servicio y género.
- Búsqueda de películas y series.
- Lista personal con favoritos.
- Sala compartida con enlace de invitación.
- Autenticación real con correo y contraseña mediante Firebase Auth.
- Estado de reproducción sincronizado en tiempo real mediante Firestore.
- Chat en tiempo real por sala con fotos y videos de hasta 50 MB mediante Storage.
- Llamada de audio/video WebRTC entre participantes con señalización protegida por Firestore.
- Instalación como aplicación web (PWA) desde el botón `Instalar` o el menú del navegador.
- Diseño responsive para escritorio y móvil.

## Producción en Vercel

- Build command: `npm run build`
- Output directory: `dist`
- Deploy: conecta el repositorio de GitHub y activa Deploy on push.
- Añade las variables de `.env.example` en Project Settings > Environment Variables.
