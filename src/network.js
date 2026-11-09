// Network adapter for Realtime Multiplayer using Firebase Realtime Database
import { firebaseNet, myClientId } from './firebase.js';

export class NetworkManager {
  constructor() {
    this.clientId = myClientId;
    this.playerId = myClientId; // Đồng bộ playerId cho UI
    this.isConnected = true;
    this.currentRoom = null;
    this.yourSlot = null;
    this.callbacks = {};

    this.bindFirebaseEvents();
  }

  bindFirebaseEvents() {
    firebaseNet.on('roomUpdated', (data) => {
      const room = data.room || data;
      if (room) {
        room.id = room.code || room.id;
      }
      this.currentRoom = room;
      this.yourSlot = data.yourSlot !== undefined ? data.yourSlot : this.yourSlot;
      this.emit('roomUpdated', room);
    });

    firebaseNet.on('matchStart', (data) => {
      const room = data.room || data;
      if (room) {
        room.id = room.code || room.id;
      }
      this.currentRoom = room;
      this.yourSlot = data.yourSlot !== undefined ? data.yourSlot : this.yourSlot;
      this.emit('matchStart', room);
      this.emit('gameStart', room);
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
    if (event === 'connected') {
      callback(true);
    }
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error('Error in callback for event ' + event, e);
        }
      });
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

  startGame() {
    this.startMatch();
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
