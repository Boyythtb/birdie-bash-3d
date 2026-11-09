import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  onValue,
  off,
  onDisconnect,
  serverTimestamp
} from 'firebase/database';

// Cấu hình Firebase đã xác thực của bạn (Project: game-gac-mai)
export const firebaseConfig = {
  projectId: "game-gac-mai",
  appId: "1:280548544010:web:b8075178f9b9581dca59f3",
  databaseURL: "https://game-gac-mai-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "game-gac-mai.firebasestorage.app",
  apiKey: "AIzaSyDe41rkWkGH-EuUl2qQgPUEI5ccsOvjA_4",
  authDomain: "game-gac-mai.firebaseapp.com",
  messagingSenderId: "280548544010",
  measurementId: "G-EFKKBTRQWD"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Client ID duy nhất cho phiên chơi này
export const myClientId = 'user_' + Math.random().toString(36).substring(2, 9);

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// BỘ ĐIỀU PHỐI REALTIME MULTIPLAYER HOÀN TOÀN SERVERLESS QUA FIREBASE
export class FirebaseMultiplayer {
  constructor() {
    this.currentRoomCode = null;
    this.mySlot = null; // 0 (Host / Team 1) | 1 (Opponent / Team 2)
    this.roomRef = null;
    this.callbacks = {};
    this.roomListener = null;
    this.shuttleListener = null;
    this.moveListener = null;
    this.scoreListener = null;
  }

  on(event, cb) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(cb);
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((cb) => cb(data));
    }
  }

  // 1. TẠO PHÒNG MỚI
  async createRoom(mode = '1v1', playerName = 'Tuyển Thủ', avatar = '🐶', color = 0xf59e0b) {
    const code = generateRoomCode();
    this.currentRoomCode = code;
    this.mySlot = 0;
    this.roomRef = ref(db, `rooms/${code}`);

    const newRoom = {
      code,
      mode,
      maxPlayers: mode === '2v2' ? 4 : 2,
      hostId: myClientId,
      state: 'LOBBY',
      createdAt: serverTimestamp(),
      players: {
        slot_0: {
          id: myClientId,
          name: playerName,
          avatar,
          color,
          ready: true,
          team: 1,
          slot: 0,
          x: 1.2,
          z: 4.6,
          state: 'idle'
        }
      }
    };

    await set(this.roomRef, newRoom);

    // Tự động xóa phòng nếu Host mất mạng
    onDisconnect(this.roomRef).remove();

    this.listenToRoom();
    return code;
  }

  // 2. VÀO PHÒNG BẰNG MÃ
  async joinRoom(roomCode, playerName = 'Đấu Thủ', avatar = '🐱', color = 0xec4899) {
    const code = roomCode.toUpperCase().trim();
    const targetRef = ref(db, `rooms/${code}`);
    const snapshot = await get(targetRef);

    if (!snapshot.exists()) {
      throw new Error(`Phòng "${code}" không tồn tại!`);
    }

    const roomData = snapshot.val();
    const players = roomData.players || {};
    const playerKeys = Object.keys(players);

    if (playerKeys.length >= roomData.maxPlayers) {
      throw new Error(`Phòng "${code}" đã đủ người!`);
    }

    // Tìm slot trống kế tiếp
    let slotNum = 1;
    while (players[`slot_${slotNum}`]) {
      slotNum++;
    }

    this.currentRoomCode = code;
    this.mySlot = slotNum;
    this.roomRef = targetRef;

    const team = roomData.mode === '2v2' ? (slotNum < 2 ? 1 : 2) : 2;

    const myPlayerData = {
      id: myClientId,
      name: playerName,
      avatar,
      color,
      ready: false,
      team,
      slot: slotNum,
      x: -1.2,
      z: -4.6,
      state: 'idle'
    };

    await set(ref(db, `rooms/${code}/players/slot_${slotNum}`), myPlayerData);

    // Xóa slot khi mất kết nối
    onDisconnect(ref(db, `rooms/${code}/players/slot_${slotNum}`)).remove();

    this.listenToRoom();
    return code;
  }

  // 3. TÌM TRẬN NHANH (QUICK MATCH)
  async quickMatch(mode = '1v1', playerName = 'Tuyển Thủ', avatar = '🐶', color = 0xf59e0b) {
    const allRoomsSnap = await get(ref(db, 'rooms'));
    if (allRoomsSnap.exists()) {
      const allRooms = allRoomsSnap.val();
      for (const [code, r] of Object.entries(allRooms)) {
        if (r.mode === mode && r.state === 'LOBBY') {
          const count = Object.keys(r.players || {}).length;
          if (count < r.maxPlayers) {
            return await this.joinRoom(code, playerName, avatar, color);
          }
        }
      }
    }
    // Không có phòng trống -> Tạo phòng mới
    return await this.createRoom(mode, playerName, avatar, color);
  }

  // 4. LẮNG NGHE THAY ĐỔI TRONG PHÒNG
  listenToRoom() {
    if (!this.roomRef) return;

    this.roomListener = onValue(this.roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        this.emit('roomClosed');
        this.leaveRoom();
        return;
      }

      const room = snapshot.val();
      const playersList = Object.values(room.players || {});

      this.emit('roomUpdated', {
        room: {
          code: room.code,
          mode: room.mode,
          maxPlayers: room.maxPlayers,
          hostId: room.hostId,
          state: room.state,
          players: playersList
        },
        yourSlot: this.mySlot,
        isHost: room.hostId === myClientId
      });

      if (room.state === 'PLAYING') {
        this.emit('matchStart', {
          room,
          yourSlot: this.mySlot
        });
      }
    });

    // Lắng nghe di chuyển của đối thủ
    this.moveListener = onValue(ref(db, `rooms/${this.currentRoomCode}/players`), (snap) => {
      if (!snap.exists()) return;
      const players = snap.val();
      for (const [key, p] of Object.entries(players)) {
        if (p.slot !== this.mySlot) {
          this.emit('remoteMove', {
            slot: p.slot,
            x: p.x,
            z: p.z,
            state: p.state
          });
        }
      }
    });

    // Lắng nghe cú đánh quả cầu
    this.shuttleListener = onValue(ref(db, `rooms/${this.currentRoomCode}/shuttle`), (snap) => {
      if (!snap.exists()) return;
      const hit = snap.val();
      if (hit && hit.hitterSlot !== this.mySlot) {
        this.emit('remoteHit', hit);
      }
    });

    // Lắng nghe điểm số
    this.scoreListener = onValue(ref(db, `rooms/${this.currentRoomCode}/score`), (snap) => {
      if (!snap.exists()) return;
      const score = snap.val();
      if (score) {
        this.emit('remoteScore', score);
      }
    });
  }

  // 5. GỬI TỌA ĐỘ DI CHUYỂN
  sendMove(x, z, state) {
    if (!this.currentRoomCode || this.mySlot === null) return;
    update(ref(db, `rooms/${this.currentRoomCode}/players/slot_${this.mySlot}`), {
      x,
      z,
      state
    });
  }

  // 6. GỬI CÚ ĐÁNH CẦU
  sendHit(hitData) {
    if (!this.currentRoomCode || this.mySlot === null) return;
    set(ref(db, `rooms/${this.currentRoomCode}/shuttle`), {
      ...hitData,
      hitterSlot: this.mySlot,
      ts: Date.now()
    });
  }

  // 7. GỬI CẬP NHẬT ĐIỂM SỐ
  sendScore(scoreData) {
    if (!this.currentRoomCode) return;
    set(ref(db, `rooms/${this.currentRoomCode}/score`), {
      ...scoreData,
      ts: Date.now()
    });
  }

  // 8. BẬT/TẮT SẴN SÀNG
  async toggleReady() {
    if (!this.currentRoomCode || this.mySlot === null) return;
    const readyRef = ref(db, `rooms/${this.currentRoomCode}/players/slot_${this.mySlot}/ready`);
    const snap = await get(readyRef);
    const curr = snap.exists() ? snap.val() : false;
    await set(readyRef, !curr);
  }

  // 9. CHỦ PHÒNG BẮT ĐẦU TRẬN
  async startMatch() {
    if (!this.currentRoomCode) return;
    await update(ref(db, `rooms/${this.currentRoomCode}`), {
      state: 'PLAYING'
    });
  }

  // 10. RỜI PHÒNG
  leaveRoom() {
    if (this.currentRoomCode && this.mySlot !== null) {
      if (this.mySlot === 0) {
        // Host rời -> Xóa phòng
        set(ref(db, `rooms/${this.currentRoomCode}`), null);
      } else {
        set(ref(db, `rooms/${this.currentRoomCode}/players/slot_${this.mySlot}`), null);
      }
    }
    if (this.roomRef) {
      off(this.roomRef);
    }
    this.currentRoomCode = null;
    this.mySlot = null;
    this.roomRef = null;
  }
}

export const firebaseNet = new FirebaseMultiplayer();
