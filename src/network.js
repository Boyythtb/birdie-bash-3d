// Network adapter for Realtime Multiplayer using Firebase Realtime Database
import { firebaseNet, myClientId } from './firebase.js';

export class NetworkManager {
  constructor() {
    this.clientId = myClientId;
    this.isConnected = true;
    this.currentRoom = null;
    this.yourSlot = null;
    this.callbacks = {};

    this.bindFirebaseEvents();
  }

  bindFirebaseEvents() {
    firebaseNet.on('roomUpdated', (data) => {
      this.currentRoom = data.room;
      this.yourSlot = data.yourSlot;
      this.emit('roomUpdated', data);
    });

    firebaseNet.on('matchStart', (data) => {
      this.currentRoom = data.room;
      this.yourSlot = data.yourSlot;
      this.emit('matchStart', data);
    });

    firebaseNet.on('remoteMove', (data) => {
      this.emit('remoteMove', data);
    });

    firebaseNet.on('remoteHit', (data) => {
      this.emit('remoteHit', data);
    });

    firebaseNet.on('remoteScore', (data) => {
      this.emit('remoteScore', data);
    });

    firebaseNet.on('roomClosed', () => {
      this.emit('error', 'Chủ phòng đã rời hoặc phòng đã đóng!');
    });
  }

  on(event, callback) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
    // Báo ngay trạng thái connected tới UI
    if (event === 'connected') {
      callback(true);
    }
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((cb) => cb(data));
    }
  }

  async createRoom(mode, playerName, avatar, color) {
    try {
      const code = await firebaseNet.createRoom(mode, playerName, avatar, color);
      this.yourSlot = 0;
      return code;
    } catch (err) {
      this.emit('error', err.message || 'Không thể tạo phòng!');
    }
  }

  async joinRoom(roomCode, playerName, avatar, color) {
    try {
      const code = await firebaseNet.joinRoom(roomCode, playerName, avatar, color);
      this.yourSlot = firebaseNet.mySlot;
      return code;
    } catch (err) {
      this.emit('error', err.message || 'Không thể vào phòng!');
    }
  }

  async quickMatch(mode, playerName, avatar, color) {
    try {
      return await firebaseNet.quickMatch(mode, playerName, avatar, color);
    } catch (err) {
      this.emit('error', err.message || 'Lỗi ghép trận!');
    }
  }

  toggleReady() {
    firebaseNet.toggleReady();
  }

  startMatch() {
    firebaseNet.startMatch();
  }

  sendMove(x, z, state) {
    firebaseNet.sendMove(x, z, state);
  }

  sendHit(hitData) {
    firebaseNet.sendHit(hitData);
  }

  sendScore(scoreData) {
    firebaseNet.sendScore(scoreData);
  }

  leaveRoom() {
    firebaseNet.leaveRoom();
    this.currentRoom = null;
    this.yourSlot = null;
  }
}

export const network = new NetworkManager();
