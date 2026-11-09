import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 3001;
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', server: 'Birdie Bash 3D Multiplayer Server' }));
});

const wss = new WebSocketServer({ server });

// Bộ nhớ lưu trữ các phòng thi đấu
const rooms = new Map();
// Map socket -> user info
const clients = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function broadcastToRoom(roomCode, data, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const msg = JSON.stringify(data);
  for (const p of room.players) {
    if (p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  const clientId = 'user_' + Math.random().toString(36).substring(2, 9);
  clients.set(ws, { id: clientId, roomCode: null });

  ws.send(JSON.stringify({
    type: 'CONNECTED',
    clientId
  }));

  ws.on('message', (messageText) => {
    try {
      const data = JSON.parse(messageText);
      const client = clients.get(ws);
      if (!client) return;

      switch (data.type) {
        // 1. TẠO PHÒNG MỚI
        case 'CREATE_ROOM': {
          const roomCode = generateRoomCode();
          const mode = data.mode || '1v1';
          const maxPlayers = mode === '2v2' ? 4 : 2;

          const player = {
            id: client.id,
            ws,
            name: data.playerName || 'Tuyển Thủ',
            avatar: data.avatar || '🐶',
            color: data.color || 0xf59e0b,
            ready: true,
            team: 1, // Team 1: Player/Chủ phòng, Team 2: Đối thủ
            slot: 0
          };

          const room = {
            code: roomCode,
            mode,
            maxPlayers,
            hostId: client.id,
            state: 'LOBBY',
            players: [player]
          };

          rooms.set(roomCode, room);
          client.roomCode = roomCode;

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            roomCode,
            room: serializeRoom(room),
            yourSlot: 0
          }));
          break;
        }

        // 2. VÀO PHÒNG BẰNG MÃ
        case 'JOIN_ROOM': {
          const reqCode = (data.roomCode || '').toUpperCase().trim();
          const room = rooms.get(reqCode);

          if (!room) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: `Không tìm thấy phòng "${reqCode}"!`
            }));
            return;
          }

          if (room.players.length >= room.maxPlayers) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: `Phòng "${reqCode}" đã đủ ${room.maxPlayers} người chơi!`
            }));
            return;
          }

          const slot = room.players.length;
          const team = room.mode === '2v2' ? (slot < 2 ? 1 : 2) : (slot === 0 ? 1 : 2);

          const player = {
            id: client.id,
            ws,
            name: data.playerName || `Người chơi ${slot + 1}`,
            avatar: data.avatar || '🐱',
            color: data.color || 0xec4899,
            ready: false,
            team,
            slot
          };

          room.players.push(player);
          client.roomCode = reqCode;

          ws.send(JSON.stringify({
            type: 'JOINED_ROOM',
            roomCode: reqCode,
            room: serializeRoom(room),
            yourSlot: slot
          }));

          // Báo cho các người chơi khác trong phòng
          broadcastToRoom(reqCode, {
            type: 'PLAYER_JOINED',
            player: serializePlayer(player),
            room: serializeRoom(room)
          }, ws);
          break;
        }

        // 3. TÌM TRẬN NHANH (QUICK MATCH)
        case 'QUICK_MATCH': {
          const targetMode = data.mode || '1v1';
          let matchedRoom = null;

          for (const [code, r] of rooms.entries()) {
            if (r.mode === targetMode && r.state === 'LOBBY' && r.players.length < r.maxPlayers) {
              matchedRoom = r;
              break;
            }
          }

          if (matchedRoom) {
            // Join vào phòng có sẵn
            const slot = matchedRoom.players.length;
            const team = matchedRoom.mode === '2v2' ? (slot < 2 ? 1 : 2) : 2;
            const player = {
              id: client.id,
              ws,
              name: data.playerName || `Đấu thủ ${slot + 1}`,
              avatar: data.avatar || '🐱',
              color: data.color || 0x0284c7,
              ready: true,
              team,
              slot
            };
            matchedRoom.players.push(player);
            client.roomCode = matchedRoom.code;

            ws.send(JSON.stringify({
              type: 'JOINED_ROOM',
              roomCode: matchedRoom.code,
              room: serializeRoom(matchedRoom),
              yourSlot: slot
            }));

            broadcastToRoom(matchedRoom.code, {
              type: 'PLAYER_JOINED',
              player: serializePlayer(player),
              room: serializeRoom(matchedRoom)
            }, ws);

            // Nếu đủ người thì tự động bắt đầu
            if (matchedRoom.players.length === matchedRoom.maxPlayers) {
              matchedRoom.state = 'PLAYING';
              broadcastToRoom(matchedRoom.code, {
                type: 'MATCH_START',
                room: serializeRoom(matchedRoom)
              });
            }
          } else {
            // Tạo phòng mới chờ người khác
            const roomCode = generateRoomCode();
            const player = {
              id: client.id,
              ws,
              name: data.playerName || 'Chủ phòng',
              avatar: data.avatar || '🐶',
              color: data.color || 0xf59e0b,
              ready: true,
              team: 1,
              slot: 0
            };
            const room = {
              code: roomCode,
              mode: targetMode,
              maxPlayers: targetMode === '2v2' ? 4 : 2,
              hostId: client.id,
              state: 'LOBBY',
              players: [player]
            };
            rooms.set(roomCode, room);
            client.roomCode = roomCode;

            ws.send(JSON.stringify({
              type: 'ROOM_CREATED',
              roomCode,
              room: serializeRoom(room),
              yourSlot: 0,
              waitingForOpponent: true
            }));
          }
          break;
        }

        // 4. SẴN SÀNG (TOGGLE READY)
        case 'TOGGLE_READY': {
          const room = rooms.get(client.roomCode);
          if (!room) return;
          const p = room.players.find((pl) => pl.id === client.id);
          if (p) {
            p.ready = !p.ready;
            broadcastToRoom(room.code, {
              type: 'PLAYER_READY_CHANGED',
              playerId: p.id,
              ready: p.ready,
              room: serializeRoom(room)
            });
          }
          break;
        }

        // 5. CHỦ PHÒNG BẮT ĐẦU TRẬN ĐẤU
        case 'START_MATCH': {
          const room = rooms.get(client.roomCode);
          if (!room || room.hostId !== client.id) return;
          room.state = 'PLAYING';
          broadcastToRoom(room.code, {
            type: 'MATCH_START',
            room: serializeRoom(room)
          });
          break;
        }

        // 6. ĐỒNG BỘ DI CHUYỂN NHÂN VẬT (REALTIME POSITION SYNC)
        case 'PLAYER_MOVE': {
          if (!client.roomCode) return;
          broadcastToRoom(client.roomCode, {
            type: 'REMOTE_MOVE',
            playerId: client.id,
            slot: data.slot,
            x: data.x,
            z: data.z,
            state: data.state
          }, ws);
          break;
        }

        // 7. ĐỒNG BỘ CÚ ĐÁNH CẦU (AUTHORITATIVE HIT SYNC)
        case 'HIT_SHUTTLE': {
          if (!client.roomCode) return;
          broadcastToRoom(client.roomCode, {
            type: 'REMOTE_HIT',
            playerId: client.id,
            slot: data.slot,
            shotType: data.shotType,
            from: data.from,
            velocity: data.velocity,
            target: data.target,
            timing: data.timing
          }, ws);
          break;
        }

        // 8. ĐỒNG BỘ ĐIỂM SỐ
        case 'SCORE_UPDATE': {
          if (!client.roomCode) return;
          broadcastToRoom(client.roomCode, {
            type: 'REMOTE_SCORE',
            team1Score: data.team1Score,
            team2Score: data.team2Score,
            scorerTeam: data.scorerTeam,
            reason: data.reason
          });
          break;
        }

        // 9. BIỂU CẢM / EMOTE
        case 'SEND_EMOTE': {
          if (!client.roomCode) return;
          broadcastToRoom(client.roomCode, {
            type: 'REMOTE_EMOTE',
            playerId: client.id,
            emote: data.emote
          });
          break;
        }

        // 10. RỜI PHÒNG
        case 'LEAVE_ROOM': {
          handleClientLeave(ws);
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    handleClientLeave(ws);
    clients.delete(ws);
  });
});

function handleClientLeave(ws) {
  const client = clients.get(ws);
  if (!client || !client.roomCode) return;

  const roomCode = client.roomCode;
  const room = rooms.get(roomCode);
  if (!room) return;

  room.players = room.players.filter((p) => p.id !== client.id);
  client.roomCode = null;

  if (room.players.length === 0) {
    rooms.delete(roomCode);
    console.log(`[Multiplayer] Phòng ${roomCode} đã đóng.`);
  } else {
    // Nếu host rời, chuyển quyền host cho người kế tiếp
    if (room.hostId === client.id) {
      room.hostId = room.players[0].id;
    }
    broadcastToRoom(roomCode, {
      type: 'PLAYER_LEFT',
      playerId: client.id,
      room: serializeRoom(room)
    });
  }
}

function serializePlayer(p) {
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    ready: p.ready,
    team: p.team,
    slot: p.slot
  };
}

function serializeRoom(r) {
  return {
    code: r.code,
    mode: r.mode,
    maxPlayers: r.maxPlayers,
    hostId: r.hostId,
    state: r.state,
    players: r.players.map(serializePlayer)
  };
}

server.listen(PORT, () => {
  console.log(`🏸 [Birdie Bash 3D] WebSocket Server đang chạy tại http://localhost:${PORT} (ws://localhost:${PORT})`);
});
