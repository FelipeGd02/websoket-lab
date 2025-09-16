const express = require("express");
const path = require("path");
const { Server } = require("socket.io");
const { createServer } = require("http");

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/real-time",
  cors: {
    origin: "*",
  },
});

app.use(express.json());
app.use("/app1", express.static(path.join(__dirname, "app1")));
app.use("/app2", express.static(path.join(__dirname, "app2")));

let gameState = {
  players: {},
  currentGame: null,
  waitingForPlayers: true
};

const gameLogic = {
  'piedra': { beats: 'tijera', loses: 'papel' },
  'papel': { beats: 'piedra', loses: 'tijera' },
  'tijera': { beats: 'papel', loses: 'piedra' }
};

function determineWinner(player1Move, player2Move) {
  if (player1Move === player2Move) return 'empate';
  if (gameLogic[player1Move].beats === player2Move) return 'player1';
  return 'player2';
}

io.on('connection', (socket) => {
  console.log('Jugador conectado:', socket.id);
  
  socket.on('join-game', (playerName) => {
    gameState.players[socket.id] = {
      name: playerName,
      move: null,
      ready: false
    };
    
    socket.emit('game-state', gameState);
    io.emit('player-joined', { playerId: socket.id, playerName });
    
    if (Object.keys(gameState.players).length === 2) {
      gameState.waitingForPlayers = false;
      gameState.currentGame = {
        round: 1,
        player1Score: 0,
        player2Score: 0
      };
      io.emit('game-start', gameState.currentGame);
    }
  });
  
  socket.on('make-move', (move) => {
    if (!gameState.players[socket.id] || gameState.waitingForPlayers) return;
    
    gameState.players[socket.id].move = move;
    gameState.players[socket.id].ready = true;
    
    socket.emit('move-received', move);
    io.emit('player-ready', { playerId: socket.id, playerName: gameState.players[socket.id].name });
    
    const players = Object.values(gameState.players);
    if (players.length === 2 && players.every(p => p.ready)) {
      const playerIds = Object.keys(gameState.players);
      const player1Move = gameState.players[playerIds[0]].move;
      const player2Move = gameState.players[playerIds[1]].move;
      
      const result = determineWinner(player1Move, player2Move);
      
      if (result === 'player1') {
        gameState.currentGame.player1Score++;
      } else if (result === 'player2') {
        gameState.currentGame.player2Score++;
      }
      
      gameState.currentGame.round++;
      
      io.emit('round-result', {
        player1Move,
        player2Move,
        result,
        scores: {
          player1: gameState.currentGame.player1Score,
          player2: gameState.currentGame.player2Score
        },
        round: gameState.currentGame.round
      });
      
      Object.values(gameState.players).forEach(player => {
        player.move = null;
        player.ready = false;
      });
    }
  });
  
  socket.on('reset-game', () => {
    gameState = {
      players: {},
      currentGame: null,
      waitingForPlayers: true
    };
    io.emit('game-reset');
  });
  
  socket.on('disconnect', () => {
    console.log('Jugador desconectado:', socket.id);
    delete gameState.players[socket.id];
    
    if (Object.keys(gameState.players).length < 2) {
      gameState.waitingForPlayers = true;
      gameState.currentGame = null;
      io.emit('waiting-for-players');
    }
  });
});

let users = [
  {
    id: 1,
    name: "John Doe",
  },
];

app.get("/users", (req, res) => {
  res.send(users);
});

app.post("/users", (req, res) => {
  const { id, name } = req.body;
  users.push({ id, name });
  res.send(users);
});

app.post("/change-screen", (req, res) => {
  io.emit("next-screen");
  res.send({ message: "Cambio de pantalla exitoso" });
});

httpServer.listen(5050, () =>
  console.log(`Server running at http://localhost:${5050}`)
);
