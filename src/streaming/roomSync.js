import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const SYNC_THRESHOLD_SECONDS = 2;

export function subscribeToRoom(db, roomId, onState, onError) {
  return onSnapshot(
    doc(db, "rooms", roomId),
    (snapshot) => {
      if (snapshot.exists()) onState({ id: snapshot.id, ...snapshot.data() });
    },
    onError,
  );
}

export async function publishPlaybackState(db, roomId, userId, state) {
  await updateDoc(doc(db, "rooms", roomId), {
    currentTime: state.currentTime,
    isPlaying: state.isPlaying,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });
}

export function shouldResync(localTime, remoteTime) {
  return Math.abs(localTime - remoteTime) > SYNC_THRESHOLD_SECONDS;
}

export { SYNC_THRESHOLD_SECONDS };
