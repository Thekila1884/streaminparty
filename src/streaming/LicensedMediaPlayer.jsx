import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import {
  shouldResync,
  publishPlaybackState,
  subscribeToRoom,
} from "./roomSync";

export function LicensedMediaPlayer({
  db,
  roomId,
  userId,
  mediaUrl,
  poster,
  isHost = false,
}) {
  const videoRef = useRef(null);
  const remoteUpdateRef = useRef(false);
  const publishTimerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db || !roomId) return undefined;
    return subscribeToRoom(
      db,
      roomId,
      (room) => {
        const video = videoRef.current;
        if (!video || typeof room.currentTime !== "number") return;
        remoteUpdateRef.current = true;
        if (shouldResync(video.currentTime, room.currentTime))
          video.currentTime = room.currentTime;
        if (room.isPlaying && video.paused)
          video
            .play()
            .catch(() => setError("Pulsa reproducir para permitir el audio."));
        if (!room.isPlaying && !video.paused) video.pause();
        setIsPlaying(room.isPlaying === true);
        window.setTimeout(() => {
          remoteUpdateRef.current = false;
        }, 0);
      },
      () => setError("No se pudo sincronizar la sala."),
    );
  }, [db, roomId]);

  useEffect(() => () => window.clearTimeout(publishTimerRef.current), []);

  const publish = async (playing) => {
    if (!isHost || !db || !roomId || !userId || remoteUpdateRef.current) return;
    await publishPlaybackState(db, roomId, userId, {
      currentTime: videoRef.current?.currentTime || 0,
      isPlaying: playing,
    });
  };

  const handleTimeUpdate = () => {
    if (!isHost || remoteUpdateRef.current) return;
    window.clearTimeout(publishTimerRef.current);
    publishTimerRef.current = window.setTimeout(
      () => publish(!videoRef.current?.paused),
      500,
    );
  };

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused)
      await video
        .play()
        .catch(() => setError("Pulsa reproducir para permitir el audio."));
    else video.pause();
    setIsPlaying(!video.paused);
    await publish(!video.paused);
  };

  return (
    <section
      className="licensed-player"
      aria-label="Reproductor de contenido con licencia"
    >
      <video
        ref={videoRef}
        src={mediaUrl}
        poster={poster}
        controls={false}
        playsInline
        muted={muted}
        onPlay={() => {
          setIsPlaying(true);
          publish(true);
        }}
        onPause={() => {
          setIsPlaying(false);
          publish(false);
        }}
        onTimeUpdate={handleTimeUpdate}
        onError={() =>
          setError(
            "Este contenido no está disponible o no tiene una licencia válida.",
          )
        }
      />
      <div className="licensed-player-controls">
        <button
          onClick={togglePlayback}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          <Play size={16} fill="currentColor" />
        </button>
        <button
          onClick={() => setMuted(!muted)}
          aria-label={muted ? "Activar sonido" : "Silenciar"}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <span>
          {isHost
            ? "Anfitrión: controla la reproducción"
            : "Sincronizado con la sala"}
        </span>
      </div>
      {error && <p className="licensed-player-error">{error}</p>}
    </section>
  );
}
