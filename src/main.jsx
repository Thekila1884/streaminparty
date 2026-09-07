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
  Paperclip,
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
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, db, firebaseReady, storage } from "./firebase";
import "./styles.css";

const services = [
  { name: "Todos", color: "#f1f1ed" },
  { name: "Netflix", color: "#e50914", url: "https://www.netflix.com/" },
  { name: "Prime Video", color: "#20a8e0", url: "https://www.primevideo.com/" },
  { name: "Max", color: "#9272ff", url: "https://www.max.com/" },
  { name: "Disney+", color: "#3c72ff", url: "https://www.disneyplus.com/" },
  { name: "Apple TV+", color: "#d7d7d7", url: "https://tv.apple.com/" },
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
const fallbackShows = [
  {
    title: "The Last Voyage",
    type: "SERIE",
    genre: "Acción",
    service: "Netflix",
    year: "2024",
    rating: "8.7",
    image:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Midnight City",
    type: "PELÍCULA",
    genre: "Drama",
    service: "Max",
    year: "2024",
    rating: "8.1",
    image:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Neon Runner",
    type: "PELÍCULA",
    genre: "Ciencia ficción",
    service: "Prime Video",
    year: "2023",
    rating: "7.9",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Wild North",
    type: "SERIE",
    genre: "Drama",
    service: "Apple TV+",
    year: "2024",
    rating: "9.0",
    image:
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Parallel Worlds",
    type: "SERIE",
    genre: "Ciencia ficción",
    service: "Disney+",
    year: "2023",
    rating: "8.4",
    image:
      "https://images.unsplash.com/photo-1534791547706-9a05559b672c?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Paper Planes",
    type: "PELÍCULA",
    genre: "Comedia",
    service: "Netflix",
    year: "2024",
    rating: "7.5",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1000&q=85",
  },
];

function initials(user) {
  return (user?.displayName || user?.email || "JD").slice(0, 2).toUpperCase();
}

function RoomChat({ roomId, user, notify }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);

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

  const uploadAttachment = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !storage || !db || !user) return;
    if (!file.type.match(/^(image|video)\//))
      return notify("Solo puedes enviar fotos o videos");
    if (file.size > 50 * 1024 * 1024)
      return notify("El archivo supera el límite de 50 MB");
    setUploading(true);
    try {
      const fileRef = ref(
        storage,
        `rooms/${roomId}/${user.uid}/${crypto.randomUUID()}-${file.name}`,
      );
      await uploadBytes(fileRef, file, { contentType: file.type });
      const attachmentUrl = await getDownloadURL(fileRef);
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        senderId: user.uid,
        senderName: user.displayName || user.email,
        attachmentUrl,
        attachmentName: file.name,
        attachmentType: file.type,
        createdAt: serverTimestamp(),
      });
    } catch {
      notify("No se pudo enviar el archivo");
    } finally {
      setUploading(false);
    }
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
        <label className="attachment-button" aria-label="Adjuntar foto o video">
          <Paperclip size={16} />
          <input
            type="file"
            accept="image/*,video/*"
            onChange={uploadAttachment}
            disabled={uploading}
          />
        </label>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            uploading ? "Subiendo archivo..." : "Escribe un mensaje..."
          }
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

function RoomCall({ roomId, user, notify }) {
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

function AuthModal({ onClose, notify }) {
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

function RoomModal({ room, user, shows, onSelectShow, onClose, notify }) {
  const [copying, setCopying] = useState(false);
  const roomUrl = `${window.location.origin}/?room=${room.id}`;
  const selectedService = room.service || "Netflix";
  const selectedShow = shows.find((show) => show.title === room.currentTitle);
  const serviceShows = shows.filter((show) => show.service === selectedService);
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
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="room-modal" onClick={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="room-icon">
          <Users size={24} />
        </div>
        <p className="eyebrow">SALA EN TIEMPO REAL</p>
        <h2>{room.title || "Tu sala de watch party"}</h2>
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
        <div className="room-player-frame">
          {selectedShow ? (
            <img src={selectedShow.image} alt={selectedShow.title} />
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
            <strong>{room.currentTitle || "Sin título"}</strong>
            <small>{selectedService} · sincronizado para la sala</small>
          </div>
        </div>
        <div className="room-state">
          <span className={room.playing ? "live-dot" : "paused-dot"} />
          {room.playing ? "Reproducción activa" : "En pausa"}
          <strong>{room.currentTitle || "Selecciona un título"}</strong>
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
      </div>
    </div>
  );
}

function SettingsModal({
  user,
  preferences,
  onPreferencesChange,
  onClose,
  onClearData,
  notify,
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

function HelpModal({ onClose }) {
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

function GoogleSearchModal({ onClose }) {
  const searchContainer = useRef(null);

  useEffect(() => {
    const renderSearch = () => {
      if (window.google?.search?.cse?.element && searchContainer.current) {
        searchContainer.current.innerHTML = "";
        window.google.search.cse.element.render({
          div: searchContainer.current,
          tag: "search",
        });
      }
    };
    const existingScript = document.querySelector(
      'script[data-streamin-google-cse="true"]',
    );
    if (existingScript) {
      renderSearch();
      return undefined;
    }
    const script = document.createElement("script");
    script.src = "https://cse.google.com/cse.js?cx=e4507537a2d404791";
    script.async = true;
    script.dataset.streaminGoogleCse = "true";
    script.onload = renderSearch;
    document.head.appendChild(script);
    return undefined;
  }, []);

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
        <p>Resultados proporcionados por Google Programmable Search.</p>
        <div ref={searchContainer} className="gcse-search" />
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [activeService, setActiveService] = useState("Todos");
  const [activeGenre, setActiveGenre] = useState("Todos");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Explorar");
  const [roomOpen, setRoomOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
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
  const [shows, setShows] = useState(fallbackShows);
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
    return onAuthStateChanged(auth, setUser);
  }, []);
  useEffect(() => {
    if (!user || !db || !roomId) return undefined;
    let unsubscribe = () => {};
    const joinAndListen = async () => {
      try {
        await setDoc(
          doc(db, "rooms", roomId, "members", user.uid),
          {
            displayName: user.displayName || user.email,
            joinedAt: serverTimestamp(),
          },
          { merge: true },
        );
        unsubscribe = onSnapshot(
          doc(db, "rooms", roomId),
          (snapshot) => {
            if (snapshot.exists()) {
              setRoom({ id: snapshot.id, ...snapshot.data() });
              setRoomOpen(true);
            }
          },
          () => notify("No se pudo leer la sala"),
        );
      } catch {
        notify("No se pudo unir a la sala");
      }
    };
    joinAndListen();
    return () => unsubscribe();
  }, [user, roomId]);
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
          data.results.slice(0, 12).map((item) => ({
            title: item.title || item.name,
            type: item.media_type === "tv" ? "SERIE" : "PELÍCULA",
            genre: "Drama",
            service: "Catálogo",
            year: (item.release_date || item.first_air_date || "").slice(0, 4),
            rating: item.vote_average?.toFixed(1),
            image: item.poster_path
              ? `https://image.tmdb.org/t/p/w780${item.poster_path}`
              : fallbackShows[0].image,
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
              show.title.toLowerCase().includes(query.toLowerCase()),
          );
  const toggleLike = (title) =>
    setLiked((current) =>
      current.includes(title)
        ? current.filter((item) => item !== title)
        : [...current, title],
    );
  const createRoom = async () => {
    if (!user) return setAuthOpen(true);
    if (!db) return notify("Configura Firebase para crear salas");
    const newRoomId =
      globalThis.crypto?.randomUUID?.() ||
      `room-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const newRoom = {
      id: newRoomId,
      ownerId: user.uid,
      title: "Sala de Javier",
      currentTitle: "Neon Runner",
      playing: false,
    };
    try {
      await setDoc(doc(db, "rooms", newRoomId), {
        ...newRoom,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, "rooms", newRoomId, "members", user.uid), {
        displayName: user.displayName || user.email,
        joinedAt: serverTimestamp(),
      });
      setRoom(newRoom);
      setRoomId(newRoomId);
      setRoomOpen(true);
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
          <button className="nav-item" onClick={createRoom}>
            <Users size={18} />
            Sala compartida
            <span className="live-dot" />
          </button>
          <button className="nav-item" onClick={createRoom}>
            <Plus size={18} />
            Crear una sala
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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
            <button className="invite-button" onClick={createRoom}>
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
              <button className="primary-button" onClick={createRoom}>
                <Play size={17} fill="currentColor" /> Entrar a mi sala
              </button>
            </div>
            <div className="hero-art">
              <div className="hero-glow" />
              <img src={shows[0].image} alt="Escena destacada" />
              <div className="floating-card">
                <div
                  className="mini-poster"
                  style={{ backgroundImage: `url(${shows[2]?.image})` }}
                />
                <div>
                  <span>AHORA EN LA SALA</span>
                  <strong>{room?.currentTitle || "Neon Runner"}</strong>
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
                <p>No encontramos títulos para “{query}”.</p>
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
