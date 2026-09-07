import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Copy,
  Download,
  Grid2X2,
  Heart,
  History,
  Home,
  Info,
  Link2,
  ListFilter,
  LogIn,
  LogOut,
  MessageCircle,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  arrayUnion,
  deleteDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, db, firebaseReady } from "./firebase";
import "./styles.css";

const NOOP = () => {};

const services = [
  { name: "Todos", color: "#f1f1ed" },
  { name: "Netflix", color: "#e50914", url: "https://www.netflix.com/" },
  { name: "Prime Video", color: "#20a8e0", url: "https://www.primevideo.com/" },
  { name: "Max", color: "#9272ff", url: "https://www.max.com/" },
  { name: "Disney+", color: "#3c72ff", url: "https://www.disneyplus.com/" },
  { name: "Apple TV+", color: "#d7d7d7", url: "https://tv.apple.com/" },
  { name: "Crunchyroll", color: "#f47521" },
  { name: "Google", color: "#4285f4", google: true },
];
const genres = [
  "Todos",
  "Acción",
  "Comedia",
  "Drama",
  "Ciencia ficción",
  "Animación",
];
function initials(user) {
  return (user?.displayName || user?.email || "JD").slice(0, 2).toUpperCase();
}

async function hashRoomPassword(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function getYouTubeEmbedUrl(value) {
  if (!value) return "";
  try {
    const parsedUrl = new URL(value);
    let videoId = parsedUrl.searchParams.get("v");
    if (parsedUrl.hostname === "youtu.be") videoId = parsedUrl.pathname.slice(1);
    if (parsedUrl.pathname.startsWith("/shorts/"))
      videoId = parsedUrl.pathname.split("/")[2];
    return videoId
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`
      : "";
  } catch {
    return "";
  }
}

function CreateRoomModal({ onClose = NOOP, onCreate = NOOP }) {
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="room-modal room-form-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="room-icon">
          <Plus size={22} />
        </div>
        <p className="eyebrow">NUEVA SALA</p>
        <h2>Crea tu sala</h2>
        <p>Comparte el enlace con tus amigos. La contraseña es opcional.</p>
        <input
          className="auth-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre de la sala"
        />
        <input
          className="auth-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña opcional"
          minLength="4"
        />
        <button
          className="primary-button full"
          onClick={() => onCreate(name, password)}
        >
          Crear sala
        </button>
      </div>
    </div>
  );
}

function RoomAccessModal({ room, onClose = NOOP, onJoin = NOOP }) {
  const [password, setPassword] = useState("");
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="room-modal room-form-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="room-icon">
          <Users size={22} />
        </div>
        <p className="eyebrow">SALA PROTEGIDA</p>
        <h2>{room.title}</h2>
        <p>
          Introduce la contraseña para entrar y comenzar la reproducción
          sincronizada.
        </p>
        <input
          className="auth-input"
          autoFocus
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña de la sala"
        />
        <button
          className="primary-button full"
          onClick={() => onJoin(password)}
        >
          Entrar a la sala
        </button>
      </div>
    </div>
  );
}

function RoomsDirectoryModal({
  rooms,
  queryText,
  onQueryChange = NOOP,
  onJoin = NOOP,
  onClose = NOOP,
}) {
  const visibleRooms = rooms.filter((room) =>
    `${room.title} ${room.ownerName}`
      .toLowerCase()
      .includes(queryText.toLowerCase()),
  );
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="room-modal rooms-directory"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="room-icon">
          <Users size={22} />
        </div>
        <p className="eyebrow">SALAS ACTIVAS</p>
        <h2>Encuentra una sala</h2>
        <input
          className="auth-input"
          value={queryText}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por nombre o anfitrión"
        />
        <div className="rooms-list">
          {visibleRooms.length === 0 ? (
            <p className="chat-empty">No hay salas activas con esa búsqueda.</p>
          ) : (
            visibleRooms.map((room) => (
              <button
                className="room-list-item"
                key={room.id}
                onClick={() => onJoin(room)}
              >
                <span className="room-list-icon">
                  <Users size={16} />
                </span>
                <span>
                  <strong>{room.title}</strong>
                  <small>
                    {room.ownerName} ·{" "}
                    {room.passwordProtected ? "Con contraseña" : "Acceso libre"}
                  </small>
                </span>
                <span className="live-dot" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RoomChat({ roomId, user, notify = NOOP }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!db || !roomId) return undefined;
    const messagesQuery = query(
      collection(db, "rooms", roomId, "messages"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
        );
      },
      () => notify("No se pudo cargar el chat"),
    );
  }, [roomId, notify]);

  const sendMessage = async (event) => {
    event?.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || !db || !user) return;
    await addDoc(collection(db, "rooms", roomId, "messages"), {
      senderId: user.uid,
      senderName: user.displayName || user.email,
      text: cleanText,
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  return (
    <section className="room-chat">
      <div className="chat-heading">
        <MessageCircle size={16} />
        <strong>Chat de la sala</strong>
        <span>{messages.length} mensajes</span>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">
            Escribe algo para empezar la conversación.
          </p>
        )}
        {messages.map((message) => (
          <article
            className={
              message.senderId === user?.uid
                ? "chat-message own"
                : "chat-message"
            }
            key={message.id}
          >
            <div className="chat-avatar">
              {message.senderName?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{message.senderName}</strong>
              {message.text && <p>{message.text}</p>}
              {message.attachmentUrl &&
                (message.attachmentType?.startsWith("video") ? (
                  <video controls src={message.attachmentUrl} />
                ) : (
                  <a
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={message.attachmentUrl}
                      alt={message.attachmentName || "Imagen compartida"}
                    />
                  </a>
                ))}
            </div>
          </article>
        ))}
      </div>
      <form className="chat-composer" onSubmit={sendMessage}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <button type="submit" aria-label="Enviar mensaje">
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}

function storedArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function RoomCall({ roomId, user, notify = NOOP }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);
  const seenCandidates = useRef(new Set());
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState("idle");

  const stopCall = async () => {
    peerRef.current?.close();
    peerRef.current = null;
    localVideo.current?.srcObject?.getTracks().forEach((track) => track.stop());
    remoteVideo.current?.srcObject
      ?.getTracks()
      .forEach((track) => track.stop());
    if (callRef.current) await deleteDoc(callRef.current).catch(() => {});
    callRef.current = null;
    setIncomingCall(null);
    setCallStatus("idle");
  };

  const media = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    if (localVideo.current) localVideo.current.srcObject = stream;
    return stream;
  };

  const createPeer = (callDocument) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peer.ontrack = (event) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
    };
    peer.onicecandidate = (event) => {
      if (event.candidate)
        updateDoc(callDocument, {
          callerCandidates: arrayUnion(event.candidate.toJSON()),
        }).catch(() => {});
    };
    peerRef.current = peer;
    callRef.current = callDocument;
    return peer;
  };

  useEffect(() => {
    if (!db || !roomId || !user) return undefined;
    return onSnapshot(
      collection(db, "rooms", roomId, "calls"),
      async (snapshot) => {
        for (const item of snapshot.docs) {
          const call = item.data();
          if (
            call.from === user.uid &&
            call.answer &&
            peerRef.current &&
            !peerRef.current.currentRemoteDescription
          ) {
            await peerRef.current.setRemoteDescription(JSON.parse(call.answer));
            setCallStatus("connected");
          } else if (
            call.from !== user.uid &&
            call.status === "ringing" &&
            call.to !== user.uid
          ) {
            setIncomingCall({ id: item.id, ...call });
          }
          if (
            call.from === user.uid &&
            call.calleeCandidates &&
            peerRef.current
          ) {
            for (const candidate of call.calleeCandidates) {
              const key = JSON.stringify(candidate);
              if (!seenCandidates.current.has(key)) {
                seenCandidates.current.add(key);
                await peerRef.current
                  .addIceCandidate(candidate)
                  .catch(() => {});
              }
            }
          }
          if (
            call.from !== user.uid &&
            call.callerCandidates &&
            peerRef.current &&
            callRef.current?.id === item.id
          ) {
            for (const candidate of call.callerCandidates) {
              const key = JSON.stringify(candidate);
              if (!seenCandidates.current.has(key)) {
                seenCandidates.current.add(key);
                await peerRef.current
                  .addIceCandidate(candidate)
                  .catch(() => {});
              }
            }
          }
        }
      },
    );
  }, [roomId, user]);

  useEffect(
    () => () => {
      peerRef.current?.close();
    },
    [],
  );

  const startCall = async () => {
    try {
      const stream = await media();
      const callDocument = doc(
        collection(db, "rooms", roomId, "calls"),
        user.uid,
      );
      const peer = createPeer(callDocument);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await setDoc(callDocument, {
        from: user.uid,
        fromName: user.displayName || user.email,
        offer: JSON.stringify(offer),
        status: "ringing",
        createdAt: serverTimestamp(),
      });
      setCallStatus("calling");
    } catch {
      notify("No se pudo acceder a la cámara o micrófono");
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      const stream = await media();
      const callDocument = doc(db, "rooms", roomId, "calls", incomingCall.id);
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peer.ontrack = (event) => {
        if (remoteVideo.current)
          remoteVideo.current.srcObject = event.streams[0];
      };
      peer.onicecandidate = (event) => {
        if (event.candidate)
          updateDoc(callDocument, {
            calleeCandidates: arrayUnion(event.candidate.toJSON()),
          }).catch(() => {});
      };
      peerRef.current = peer;
      callRef.current = callDocument;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      await peer.setRemoteDescription(JSON.parse(incomingCall.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await updateDoc(callDocument, {
        answer: JSON.stringify(answer),
        to: user.uid,
        status: "connected",
      });
      setIncomingCall(null);
      setCallStatus("connected");
    } catch {
      notify("No se pudo aceptar la llamada");
    }
  };

  return (
    <section className="room-call">
      <div className="call-heading">
        <Phone size={15} />
        <strong>Llamada de sala</strong>
        <span>
          {callStatus === "connected" ? "Conectados" : "Audio y video"}
        </span>
      </div>
      {incomingCall && (
        <div className="incoming-call">
          <span>{incomingCall.fromName} te está llamando</span>
          <button onClick={acceptCall} className="primary-button">
            Aceptar
          </button>
          <button onClick={() => setIncomingCall(null)}>Rechazar</button>
        </div>
      )}
      <div className="call-videos">
        {callStatus !== "idle" && (
          <>
            <video ref={remoteVideo} autoPlay playsInline />
            <video ref={localVideo} autoPlay muted playsInline />
          </>
        )}
      </div>
      {callStatus === "idle" ? (
        <button className="primary-button full" onClick={startCall}>
          <Phone size={16} /> Iniciar llamada
        </button>
      ) : (
        <button className="danger-button" onClick={stopCall}>
          Colgar llamada
        </button>
      )}
    </section>
  );
}

function AuthModal({ onClose = NOOP, notify = NOOP }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const result = register
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);
      if (register && name)
        await updateProfile(result.user, { displayName: name });
      notify(register ? "Cuenta creada correctamente" : "Sesión iniciada");
      onClose();
    } catch (authError) {
      setError(
        authError.code?.replace("auth/", "").replaceAll("-", " ") ||
          "No se pudo completar la operación",
      );
    }
  };
  const googleSignIn = async () => {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      notify("Sesión iniciada con Google");
      onClose();
    } catch (authError) {
      setError(
        authError.code?.replace("auth/", "").replaceAll("-", " ") ||
          "No se pudo iniciar sesión con Google",
      );
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="room-modal auth-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="room-icon">
          <LogIn size={22} />
        </div>
        <p className="eyebrow">CUENTA STREAMINPARTY</p>
        <h2>{register ? "Crea tu cuenta" : "Bienvenido de vuelta"}</h2>
        <button className="google-button" onClick={googleSignIn}>
          <span className="google-mark">G</span> Continuar con Google
        </button>
        <div className="auth-divider">
          <span>o continúa con email</span>
        </div>
        <form onSubmit={submit}>
          {register && (
            <input
              className="auth-input"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre"
            />
          )}
          <input
            className="auth-input"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo electrónico"
          />
          <input
            className="auth-input"
            required
            minLength="6"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña (mínimo 6 caracteres)"
          />
          {error && <p className="auth-error">{error}</p>}
          <button className="primary-button full" type="submit">
            {register ? "Crear cuenta" : "Iniciar sesión"}
          </button>
        </form>
        <button className="switch-auth" onClick={() => setRegister(!register)}>
          {register ? "Ya tengo una cuenta" : "Crear una cuenta nueva"}
        </button>
      </div>
    </div>
  );
}

function RoomModal({
  room,
  user,
  shows,
  onSelectShow = NOOP,
  onClose = NOOP,
  notify = NOOP,
}) {
  const [copying, setCopying] = useState(false);
  const [contentUrl, setContentUrl] = useState(room.mediaUrl || "");
  const [googleSearchOpen, setGoogleSearchOpen] = useState(false);
  const roomUrl = `${window.location.origin}/?room=${room.id}`;
  const userRoomName =
    user?.displayName || user?.email?.split("@")[0] || "tu sala";
  const roomTitle = room.ownerName ? room.title : `Sala de ${userRoomName}`;
  const selectedService = room.service || "Netflix";
  const serviceShows = shows.filter((show) => show.service === selectedService);
  const selectedShow = shows.find(
    (show) =>
      show.title === room.currentTitle && show.service === selectedService,
  );
  const displayShow = selectedShow || serviceShows[0];
  const displayTitle =
    displayShow?.title ||
    (room.currentTitle && room.currentTitle !== "Selecciona un título"
      ? room.currentTitle
      : "");
  const copyLink = async () => {
    await navigator.clipboard?.writeText(roomUrl);
    setCopying(true);
    notify("Enlace de sala copiado");
    window.setTimeout(() => setCopying(false), 1600);
  };
  const changePlayback = async (playing) => {
    if (db)
      await updateDoc(doc(db, "rooms", room.id), {
        playing,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
  };
  const selectPlatform = async (service) => {
    if (!db) return;
    const firstShow = shows.find((show) => show.service === service);
    await updateDoc(doc(db, "rooms", room.id), {
      service,
      currentTitle: firstShow?.title || "Selecciona un título",
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  };
  const selectGoogleResult = async (title) => {
    if (!db || !title) return;
    await updateDoc(doc(db, "rooms", room.id), {
      service: selectedService,
      currentTitle: title,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
    notify(`${title} seleccionado para ${selectedService}`);
    setGoogleSearchOpen(false);
  };
  const saveContentUrl = async (event) => {
    event.preventDefault();
    const cleanUrl = contentUrl.trim();
    try {
      const parsedUrl = new URL(cleanUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol))
        throw new Error("protocol");
      await updateDoc(doc(db, "rooms", room.id), {
        mediaUrl: parsedUrl.toString(),
        currentTitle: room.currentTitle || parsedUrl.hostname,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      notify("Enlace guardado para toda la sala");
    } catch {
      notify("Introduce un enlace válido que empiece por https://");
    }
  };
  return (
    <div className="modal-backdrop">
      <div className="room-modal" onClick={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="room-icon">
          <Users size={24} />
        </div>
        <p className="eyebrow">SALA EN TIEMPO REAL</p>
        <h2>{roomTitle || `Sala de ${userRoomName}`}</h2>
        <p>
          La reproducción y el estado de la sala se sincronizan con Firestore.
        </p>
        <div className="room-link">
          <span>{roomUrl.replace("http://", "").replace("https://", "")}</span>
          <button onClick={copyLink}>
            <Copy size={15} /> {copying ? "Copiado" : "Copiar"}
          </button>
        </div>
        <div className="room-platform-picker">
          <div className="room-section-label">PLATAFORMA DE LA SALA</div>
          <div className="room-platforms">
            {services
              .filter((service) => service.name !== "Todos" && !service.google)
              .map((service) => (
                <button
                  key={service.name}
                  className={
                    selectedService === service.name
                      ? "room-platform active"
                      : "room-platform"
                  }
                  onClick={() => selectPlatform(service.name)}
                >
                  <span
                    className="service-dot"
                    style={{ background: service.color }}
                  />
                  {service.name}
                </button>
              ))}
          </div>
          {serviceShows.length > 0 && (
            <div className="room-title-picker">
              {serviceShows.map((show) => (
                <button
                  key={show.title}
                  className={
                    room.currentTitle === show.title
                      ? "room-title active"
                      : "room-title"
                  }
                  onClick={() => onSelectShow(show)}
                >
                  {show.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="room-google-button"
          onClick={() => setGoogleSearchOpen(true)}
        >
          <Search size={15} /> Buscar títulos en Google
        </button>
        <form className="room-url-form" onSubmit={saveContentUrl}>
          <div className="room-section-label">ENLACE DEL CONTENIDO</div>
          <div className="room-url-fields">
            <input
              type="url"
              required
              value={contentUrl}
              onChange={(event) => setContentUrl(event.target.value)}
              placeholder="https://tu-contenido-autorizado.com/video"
              aria-label="Enlace del contenido"
            />
            <button type="submit" className="primary-button">
              Usar enlace
            </button>
          </div>
          <small>
            Usa contenido propio o con licencia. Los servicios DRM pueden
            impedir la incrustación.
          </small>
        </form>
        <div className="room-player-frame">
          {getYouTubeEmbedUrl(room.mediaUrl) ? (
            <iframe
              className="room-player-media"
              src={getYouTubeEmbedUrl(room.mediaUrl)}
              title={displayTitle || "Contenido de la sala"}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : room.mediaUrl && /\.(mp4|webm|ogg)(\?.*)?$/i.test(room.mediaUrl) ? (
            <video
              className="room-player-media"
              src={room.mediaUrl}
              controls
              playsInline
              poster={displayShow?.image}
            />
          ) : displayShow ? (
            <img src={displayShow.image} alt={displayShow.title} />
          ) : (
            <div className="room-player-placeholder">
              <Play size={28} />
              <span>Selecciona un título para comenzar</span>
            </div>
          )}
          <div className="room-player-overlay">
            <span className="room-player-badge">
              <span className={room.playing ? "live-dot" : "paused-dot"} />{" "}
              {room.playing ? "EN REPRODUCCIÓN" : "EN PAUSA"}
            </span>
            <strong>{displayTitle || "Sin título seleccionado"}</strong>
            <small>{selectedService} · sincronizado para la sala</small>
            {room.mediaUrl && (
              <small className="room-content-source">
                Contenido: {room.mediaUrl}
              </small>
            )}
          </div>
        </div>
        <div className="room-state">
          <span className={room.playing ? "live-dot" : "paused-dot"} />
          {room.playing ? "Reproducción activa" : "En pausa"}
          <strong>{displayTitle || "Selecciona un título"}</strong>
        </div>
        <div className="room-controls">
          <button onClick={() => changePlayback(false)}>
            Pausar para todos
          </button>
          <button
            onClick={() => changePlayback(true)}
            className="primary-button"
          >
            <Play size={15} fill="currentColor" /> Reproducir
          </button>
        </div>
        <button className="primary-button full" onClick={copyLink}>
          <Link2 size={17} /> Invitar amigos
        </button>
        <RoomChat roomId={room.id} user={user} notify={notify} />
        <RoomCall roomId={room.id} user={user} notify={notify} />
        {googleSearchOpen && (
          <GoogleSearchModal
            onClose={() => setGoogleSearchOpen(false)}
            onSelectResult={selectGoogleResult}
          />
        )}
      </div>
    </div>
  );
}

function SettingsModal({
  user,
  preferences,
  onPreferencesChange = NOOP,
  onClose = NOOP,
  onClearData = NOOP,
  notify = NOOP,
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="room-modal settings-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="room-icon">
          <Settings size={22} />
        </div>
        <p className="eyebrow">PREFERENCIAS</p>
        <h2>Configuración</h2>
        <p>Gestiona tu experiencia en Streaminparty desde este dispositivo.</p>
        <div className="settings-user">
          <div className="avatar">{initials(user)}</div>
          <div>
            <strong>{user?.email || "Modo demo"}</strong>
            <span>{user ? "Cuenta sincronizada" : "Preferencias locales"}</span>
          </div>
        </div>
        <label className="settings-option">
          <span>
            <strong>Notificaciones</strong>
            <small>Recibir avisos de actividad en salas</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.notifications}
            onChange={(event) =>
              onPreferencesChange({
                ...preferences,
                notifications: event.target.checked,
              })
            }
          />
        </label>
        <label className="settings-option">
          <span>
            <strong>Reducir movimiento</strong>
            <small>Limitar animaciones de la interfaz</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.reducedMotion}
            onChange={(event) =>
              onPreferencesChange({
                ...preferences,
                reducedMotion: event.target.checked,
              })
            }
          />
        </label>
        <button
          className="danger-button"
          onClick={() => {
            onClearData();
            notify("Datos locales eliminados");
          }}
        >
          Limpiar favoritos e historial local
        </button>
        <button className="primary-button full" onClick={onClose}>
          Guardar preferencias
        </button>
      </div>
    </div>
  );
}

function HelpModal({ onClose = NOOP }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="room-modal help-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="room-icon">
          <CircleHelp size={22} />
        </div>
        <p className="eyebrow">CENTRO DE AYUDA</p>
        <h2>¿En qué podemos ayudarte?</h2>
        <p>
          Consulta las respuestas rápidas o contacta con el equipo para resolver
          un problema.
        </p>
        <a
          className="help-link"
          href="https://github.com/Thekila1884/streaminparty/issues"
          target="_blank"
          rel="noreferrer"
        >
          <span>
            <strong>Reportar un problema</strong>
            <small>Abre un ticket en GitHub</small>
          </span>
          <Link2 size={16} />
        </a>
        <a className="help-link" href="mailto:soporte@streaminparty.com">
          <span>
            <strong>Contactar soporte</strong>
            <small>soporte@streaminparty.com</small>
          </span>
          <Link2 size={16} />
        </a>
        <div className="help-note">
          <Info size={15} />
          <span>
            Para unirte a una sala, inicia sesión y abre el enlace de invitación
            que te compartió tu anfitrión.
          </span>
        </div>
      </div>
    </div>
  );
}

function GoogleSearchModal({ onClose = NOOP, onSelectResult = NOOP }) {
  const searchContainer = useRef(null);

  useEffect(() => {
    let observer;
    const addSelectionButtons = () => {
      if (!searchContainer.current) return;
      searchContainer.current
        .querySelectorAll(".gsc-result")
        .forEach((result) => {
          if (result.dataset.streaminSelectable) return;
          const title = result.querySelector(".gs-title")?.textContent?.trim();
          if (!title) return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "cse-select-button";
          button.textContent = "Seleccionar para la sala";
          button.addEventListener("click", () => onSelectResult(title));
          result.appendChild(button);
          result.dataset.streaminSelectable = "true";
        });
    };
    const renderSearch = () => {
      if (window.google?.search?.cse?.element && searchContainer.current) {
        searchContainer.current.innerHTML = "";
        window.google.search.cse.element.render({
          div: searchContainer.current,
          tag: "search",
        });
        observer = new MutationObserver(addSelectionButtons);
        observer.observe(searchContainer.current, {
          childList: true,
          subtree: true,
        });
        addSelectionButtons();
      }
    };
    const existingScript = document.querySelector(
      'script[data-streamin-google-cse="true"]',
    );
    if (existingScript) {
      renderSearch();
      return () => observer?.disconnect();
    }
    const script = document.createElement("script");
    script.src = "https://cse.google.com/cse.js?cx=e4507537a2d404791";
    script.async = true;
    script.dataset.streaminGoogleCse = "true";
    script.onload = renderSearch;
    document.head.appendChild(script);
    return () => observer?.disconnect();
  }, [onSelectResult]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="room-modal google-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="room-icon">
          <Search size={22} />
        </div>
        <p className="eyebrow">BÚSQUEDA GOOGLE</p>
        <h2>Busca dentro de Streaminparty</h2>
        <p>
          Resultados proporcionados por Google Programmable Search. Selecciona
          un resultado para añadirlo a la sala.
        </p>
        <div ref={searchContainer} className="gcse-search" />
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [activeService, setActiveService] = useState("Todos");
  const [activeGenre, setActiveGenre] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Explorar");
  const [roomOpen, setRoomOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [roomsDirectoryOpen, setRoomsDirectoryOpen] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [activeRooms, setActiveRooms] = useState([]);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [verifiedRooms, setVerifiedRooms] = useState([]);
  const [liked, setLiked] = useState(() =>
    storedArray("streaminparty-favorites"),
  );
  const [history, setHistory] = useState(() =>
    storedArray("streaminparty-history"),
  );
  const [room, setRoom] = useState(null);
  const [roomId, setRoomId] = useState(() =>
    new URLSearchParams(window.location.search).get("room"),
  );
  const [toast, setToast] = useState("");
  const [shows, setShows] = useState([]);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [preferences, setPreferences] = useState(() => {
    try {
      return {
        notifications: true,
        reducedMotion: false,
        ...JSON.parse(
          localStorage.getItem("streaminparty-preferences") || "{}",
        ),
      };
    } catch {
      return { notifications: true, reducedMotion: false };
    }
  });
  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  useEffect(() => {
    localStorage.setItem(
      "streaminparty-preferences",
      JSON.stringify(preferences),
    );
    document.documentElement.classList.toggle(
      "reduced-motion",
      preferences.reducedMotion,
    );
  }, [preferences]);
  useEffect(() => {
    localStorage.setItem("streaminparty-favorites", JSON.stringify(liked));
  }, [liked]);
  useEffect(() => {
    localStorage.setItem("streaminparty-history", JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    const capturePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);
  const installApp = async () => {
    if (!installPrompt)
      return notify(
        "En el móvil, usa el menú del navegador y selecciona Añadir a pantalla de inicio",
      );
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };
  useEffect(() => {
    if (!auth) return undefined;
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return typeof unsubscribe === "function" ? unsubscribe : undefined;
  }, []);
  useEffect(() => {
    if (!db || !user) return undefined;
    const unsubscribe = onSnapshot(
      query(collection(db, "publicRooms"), orderBy("updatedAt", "desc")),
      (snapshot) => {
        setActiveRooms(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
        );
      },
      () => notify("No se pudieron cargar las salas activas"),
    );
    return typeof unsubscribe === "function" ? unsubscribe : undefined;
  }, [user]);
  const joinRoom = async (targetRoom, password = "") => {
    if (!user) return setAuthOpen(true);
    if (!db) return notify("Configura Firebase para entrar a salas");
    try {
      if (targetRoom.passwordProtected) {
        const passwordHash = await hashRoomPassword(password);
        if (passwordHash !== targetRoom.passwordHash)
          return notify("Contraseña incorrecta");
        setVerifiedRooms((current) =>
          current.includes(targetRoom.id)
            ? current
            : [...current, targetRoom.id],
        );
      }
      await setDoc(
        doc(db, "rooms", targetRoom.id, "members", user.uid),
        {
          displayName: user.displayName || user.email,
          joinedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setRoomId(targetRoom.id);
      setRoom({
        id: targetRoom.id,
        ...targetRoom,
        isPlaying: true,
        playing: true,
      });
      setRoomOpen(true);
      setRoomsDirectoryOpen(false);
      setPendingRoom(null);
      await updateDoc(doc(db, "rooms", targetRoom.id), {
        playing: true,
        isPlaying: true,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch {
      notify("No se pudo entrar a la sala");
    }
  };
  useEffect(() => {
    if (!user || !db || !roomId) return undefined;
    let unsubscribe = () => {};
    const joinAndListen = async () => {
      try {
        const publicSnapshot = await new Promise((resolve, reject) =>
          onSnapshot(doc(db, "publicRooms", roomId), resolve, reject),
        );
        const publicRoom = publicSnapshot.exists()
          ? { id: publicSnapshot.id, ...publicSnapshot.data() }
          : { id: roomId, title: "Sala compartida" };
        if (publicRoom.passwordProtected && !verifiedRooms.includes(roomId)) {
          setPendingRoom(publicRoom);
          return;
        }
        await joinRoom(publicRoom);
        const roomUnsubscribe = onSnapshot(
          doc(db, "rooms", roomId),
          (snapshot) => {
            if (snapshot.exists()) {
              setRoom({ id: snapshot.id, ...snapshot.data() });
              setRoomOpen(true);
            }
          },
          () => notify("No se pudo leer la sala"),
        );
        unsubscribe =
          typeof roomUnsubscribe === "function" ? roomUnsubscribe : () => {};
      } catch {
        notify("No se pudo unir a la sala");
      }
    };
    joinAndListen();
    return () => unsubscribe();
  }, [user, roomId, verifiedRooms]);
  useEffect(() => {
    if (roomId && !user) notify("Inicia sesión para unirte a la sala");
  }, [roomId, user]);
  useEffect(() => {
    const key = import.meta.env.VITE_TMDB_API_KEY;
    if (!key) return;
    fetch(
      `https://api.themoviedb.org/3/trending/all/week?api_key=${key}&language=es-ES`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data?.results) return;
        setShows(
          data.results
            .filter((item) => item.poster_path)
            .slice(0, 12)
            .map((item) => ({
              title: item.title || item.name,
              type: item.media_type === "tv" ? "SERIE" : "PELÍCULA",
              genre: "Drama",
              service: "Catálogo",
              year: (item.release_date || item.first_air_date || "").slice(
                0,
                4,
              ),
              rating: item.vote_average?.toFixed(1),
              image: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
            })),
        );
      })
      .catch(() => notify("No se pudo actualizar el catálogo"));
  }, []);
  const filteredShows =
    activeTab === "Mi lista"
      ? shows.filter((show) => liked.includes(show.title))
      : activeTab === "Historial"
        ? history
        : shows.filter(
            (show) =>
              (activeService === "Todos" || show.service === activeService) &&
              (activeGenre === "Todos" || show.genre === activeGenre) &&
              show.title.toLowerCase().includes(searchQuery.toLowerCase()),
          );
  const toggleLike = (title) =>
    setLiked((current) =>
      current.includes(title)
        ? current.filter((item) => item !== title)
        : [...current, title],
    );
  const createRoom = async (roomName = "", password = "") => {
    if (!user) return setAuthOpen(true);
    if (!db) return notify("Configura Firebase para crear salas");
    if (typeof roomName !== "string") roomName = "";
    if (typeof password !== "string") password = "";
    const newRoomId =
      globalThis.crypto?.randomUUID?.() ||
      `room-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const newRoom = {
      id: newRoomId,
      ownerId: user.uid,
      ownerName: user.displayName || user.email?.split("@")[0] || "Usuario",
      title:
        roomName.trim() ||
        `Sala de ${user.displayName || user.email?.split("@")[0] || "tu sala"}`,
      service: "Netflix",
      currentTitle: "",
      playing: false,
      isPlaying: false,
      passwordProtected: Boolean(password.trim()),
    };
    try {
      const passwordHash = password.trim()
        ? await hashRoomPassword(password.trim())
        : "";
      await setDoc(doc(db, "rooms", newRoomId), {
        ...newRoom,
        passwordHash,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, "rooms", newRoomId, "members", user.uid), {
        displayName: user.displayName || user.email,
        joinedAt: serverTimestamp(),
      });
      await setDoc(doc(db, "publicRooms", newRoomId), {
        id: newRoomId,
        ownerId: user.uid,
        ownerName: newRoom.ownerName,
        title: newRoom.title,
        service: newRoom.service,
        currentTitle: "",
        playing: false,
        passwordProtected: newRoom.passwordProtected,
        passwordHash,
        updatedAt: serverTimestamp(),
      });
      setRoom(newRoom);
      setRoomId(newRoomId);
      setRoomOpen(true);
      setCreateRoomOpen(false);
    } catch (error) {
      const reason =
        error?.code === "permission-denied"
          ? "Firebase rechazó la sala: publica firestore.rules y verifica que tu usuario esté autenticado."
          : error?.code === "unavailable"
            ? "Firebase no está disponible. Permite firestore.googleapis.com en tu navegador o red."
            : "No se pudo crear la sala. Revisa la configuración de Firebase.";
      notify(reason);
    }
  };
  const selectShow = async (show) => {
    setHistory((current) =>
      [show, ...current.filter((item) => item.title !== show.title)].slice(
        0,
        12,
      ),
    );
    if (db && room && user)
      await updateDoc(doc(db, "rooms", room.id), {
        currentTitle: show.title,
        service: show.service,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    notify(`${show.title} seleccionado para la sala`);
  };
  const logout = async () => {
    if (auth) await signOut(auth);
    setRoom(null);
    setRoomOpen(false);
    setActiveTab("Explorar");
    notify("Sesión cerrada");
  };
  const clearLocalData = () => {
    setLiked([]);
    setHistory([]);
    localStorage.removeItem("streaminparty-favorites");
    localStorage.removeItem("streaminparty-history");
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={16} fill="currentColor" />
          </span>
          <span>
            streamin<span className="brand-accent">party</span>
          </span>
        </div>
        <div className="profile">
          <div className="avatar">{initials(user)}</div>
          <div>
            <strong>
              {user?.displayName || user?.email?.split("@")[0] || "Invitado"}
            </strong>
            <span>{user ? "Cuenta conectada" : "Modo demo"}</span>
          </div>
          <ChevronDown size={15} className="muted" />
        </div>
        <nav className="main-nav">
          <span className="nav-label">MENÚ</span>
          {[
            ["Explorar", Home],
            ["Mi lista", Heart],
            ["Historial", History],
          ].map(([label, Icon]) => (
            <button
              className={`nav-item ${activeTab === label ? "active" : ""}`}
              key={label}
              onClick={() => setActiveTab(label)}
            >
              <Icon size={18} />
              {label}
              {label === "Mi lista" && liked.length > 0 && (
                <small>{liked.length}</small>
              )}
            </button>
          ))}
          <span className="nav-label space-top">TU SALA</span>
          <button className="nav-item" onClick={() => createRoom()}>
            <Users size={18} />
            Sala compartida
            <span className="live-dot" />
          </button>
          <button
            className="nav-item"
            onClick={() => (user ? setCreateRoomOpen(true) : setAuthOpen(true))}
          >
            <Plus size={18} />
            Crear una sala
          </button>
          <button
            className="nav-item"
            onClick={() =>
              user ? setRoomsDirectoryOpen(true) : setAuthOpen(true)
            }
          >
            <Search size={18} />
            Buscar salas
            {activeRooms.length > 0 && <small>{activeRooms.length}</small>}
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => (user ? logout() : setAuthOpen(true))}
          >
            {user ? <LogOut size={18} /> : <LogIn size={18} />}
            {user ? "Cerrar sesión" : "Iniciar sesión"}
          </button>
          <button className="nav-item" onClick={() => setSettingsOpen(true)}>
            <Settings size={18} />
            Configuración
          </button>
          <button className="nav-item" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={18} />
            Ayuda
          </button>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div className="mobile-brand">
            streamin<span>party</span>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar películas, series..."
            />
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              onClick={() => notify("No tienes notificaciones nuevas")}
              aria-label="Notificaciones"
            >
              <Bell size={19} />
            </button>
            <button className="invite-button" onClick={() => createRoom()}>
              <Link2 size={16} /> Invitar amigos
            </button>
            <button
              className="install-button"
              onClick={installApp}
              aria-label="Instalar Streaminparty"
            >
              <Download size={16} /> Instalar
            </button>
            <button
              className="tiny-avatar"
              onClick={() => (user ? logout() : setAuthOpen(true))}
            >
              {initials(user)}
            </button>
          </div>
        </header>
        <div className="page-wrap">
          <section className="hero-section">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="pulse" /> SALA ACTIVA AHORA
              </p>
              <h1>
                Tu noche.
                <br />
                <em>Tu película.</em>
                <br />
                Juntos.
              </h1>
              <p className="hero-description">
                Descubre qué ver, crea una sala y disfruta de tus plataformas
                favoritas con tus amigos.
              </p>
              <button className="primary-button" onClick={() => createRoom()}>
                <Play size={17} fill="currentColor" /> Entrar a mi sala
              </button>
            </div>
            <div className="hero-art">
              <div className="hero-glow" />
              {shows[0] ? (
                <img src={shows[0].image} alt={shows[0].title} />
              ) : (
                <div className="hero-art-empty">
                  Configura TMDB para cargar títulos reales
                </div>
              )}
              <div className="floating-card">
                <div
                  className="mini-poster"
                  style={
                    shows[2]
                      ? { backgroundImage: `url(${shows[2].image})` }
                      : undefined
                  }
                />
                <div>
                  <span>AHORA EN LA SALA</span>
                  <strong>
                    {shows.find((show) => show.title === room?.currentTitle)
                      ?.title || "Sin título seleccionado"}
                  </strong>
                  <small>
                    <span className="live-dot" />{" "}
                    {room?.playing
                      ? "Reproduciendo sincronizado"
                      : "Sala lista para empezar"}
                  </small>
                </div>
                <Play size={16} fill="currentColor" />
              </div>
              <div className="hero-tag">
                <Sparkles size={13} /> Watch together
              </div>
            </div>
          </section>
          <section className="services-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">EXPLORA POR SERVICIO</p>
                <h2>
                  {activeService === "Todos"
                    ? "Todo tu streaming, en un solo lugar"
                    : `Catálogo de ${activeService}`}
                </h2>
              </div>
              <button
                className="filter-button"
                onClick={() =>
                  notify("Usamos enlaces oficiales de cada plataforma")
                }
              >
                <SlidersHorizontal size={16} /> Filtros
              </button>
            </div>
            <div className="service-tabs">
              {services.map((service) => (
                <button
                  key={service.name}
                  className={
                    activeService === service.name
                      ? "service-tab selected"
                      : "service-tab"
                  }
                  onClick={() =>
                    service.google
                      ? setGoogleOpen(true)
                      : (setActiveService(service.name),
                        setActiveTab("Explorar"))
                  }
                >
                  <span
                    className="service-dot"
                    style={{ background: service.color }}
                  />
                  {service.name}
                </button>
              ))}
            </div>
          </section>
          <section className="catalog-section">
            <div className="catalog-toolbar">
              <div className="genre-tabs">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    className={activeGenre === genre ? "genre active" : "genre"}
                    onClick={() => setActiveGenre(genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
              <div className="view-controls">
                <span>{filteredShows.length} títulos</span>
                <button className="view-button active">
                  <Grid2X2 size={16} />
                </button>
                <button className="view-button">
                  <ListFilter size={16} />
                </button>
              </div>
            </div>
            <div className="show-grid">
              {filteredShows.map((show) => (
                <article className="show-card" key={show.title}>
                  <div className="poster-wrap">
                    <img src={show.image} alt={show.title} />
                    <span className="service-pill">{show.service}</span>
                    <button
                      className={`heart-button ${liked.includes(show.title) ? "liked" : ""}`}
                      onClick={() => toggleLike(show.title)}
                      aria-label={`Añadir ${show.title} a mi lista`}
                    >
                      <Heart
                        size={17}
                        fill={
                          liked.includes(show.title) ? "currentColor" : "none"
                        }
                      />
                    </button>
                    <button
                      className="card-play"
                      onClick={() => selectShow(show)}
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  </div>
                  <div className="card-info">
                    <div>
                      <span className="card-type">{show.type}</span>
                      <h3>{show.title}</h3>
                    </div>
                    <div className="card-meta">
                      <span>{show.year}</span>
                      <span className="rating">★ {show.rating}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {filteredShows.length === 0 && (
              <div className="empty-state">
                <Search size={25} />
                <p>No encontramos títulos para “{searchQuery}”.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      {roomOpen && room && (
        <RoomModal
          room={room}
          user={user}
          shows={shows}
          onSelectShow={selectShow}
          onClose={() => setRoomOpen(false)}
          notify={notify}
        />
      )}
      {createRoomOpen && (
        <CreateRoomModal
          onClose={() => setCreateRoomOpen(false)}
          onCreate={createRoom}
        />
      )}
      {roomsDirectoryOpen && (
        <RoomsDirectoryModal
          rooms={activeRooms}
          queryText={roomSearch}
          onQueryChange={setRoomSearch}
          onJoin={(targetRoom) =>
            targetRoom.passwordProtected
              ? setPendingRoom(targetRoom)
              : joinRoom(targetRoom)
          }
          onClose={() => setRoomsDirectoryOpen(false)}
        />
      )}
      {pendingRoom && (
        <RoomAccessModal
          room={pendingRoom}
          onClose={() => setPendingRoom(null)}
          onJoin={(password) => joinRoom(pendingRoom, password)}
        />
      )}
      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)} notify={notify} />
      )}
      {settingsOpen && (
        <SettingsModal
          user={user}
          preferences={preferences}
          onPreferencesChange={setPreferences}
          onClose={() => setSettingsOpen(false)}
          onClearData={clearLocalData}
          notify={notify}
        />
      )}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {googleOpen && <GoogleSearchModal onClose={() => setGoogleOpen(false)} />}
      {toast && (
        <div className="toast">
          <Info size={16} /> {toast}
        </div>
      )}
      {!firebaseReady && (
        <div className="config-banner">
          Modo demo: añade las variables de Firebase en Vercel para activar
          cuentas y salas reales.
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
