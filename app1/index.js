const socket = io("/", { path: "/real-time" });

const waitingScreen = document.getElementById("waiting-screen");
const gameScreen = document.getElementById("game-screen");
const player1Name = document.getElementById("player1-name");
const player2Name = document.getElementById("player2-name");
const player1Score = document.getElementById("player1-score");
const player2Score = document.getElementById("player2-score");
const currentRound = document.getElementById("current-round");
const gameStatus = document.getElementById("game-status");
const results = document.getElementById("results");
const player1Move = document.getElementById("player1-move");
const player2Move = document.getElementById("player2-move");
const resultMessage = document.getElementById("result-message");
const moveButtons = document.querySelectorAll(".move-btn");
const resetBtn = document.getElementById("reset-btn");

let gameState = {
  players: {},
  currentGame: null,
  waitingForPlayers: true
};

let playerId = null;
let currentMove = null;

function init() {
  const playerName = prompt("Ingresa tu nombre (Jugador 1):") || "Jugador 1";
  player1Name.textContent = playerName;
  socket.emit('join-game', playerName);
  
  moveButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (gameState.waitingForPlayers || currentMove) return;
      
      const move = e.target.dataset.move;
      currentMove = move;
      socket.emit('make-move', move);
      
      moveButtons.forEach(b => b.disabled = true);
      gameStatus.textContent = "Esperando al oponente...";
    });
  });
  
  resetBtn.addEventListener('click', () => {
    socket.emit('reset-game');
    resetGame();
  });
}

socket.on('game-state', (state) => {
  gameState = state;
  updateUI();
});

socket.on('player-joined', (data) => {
  console.log('Jugador conectado:', data.playerName);
  if (data.playerId !== socket.id) {
    player2Name.textContent = data.playerName;
  }
});

socket.on('game-start', (game) => {
  gameState.currentGame = game;
  gameState.waitingForPlayers = false;
  updateUI();
  showGameScreen();
});

socket.on('player-ready', (data) => {
  if (data.playerId !== socket.id) {
    gameStatus.textContent = "¡Oponente listo! Calculando resultado...";
  }
});

socket.on('round-result', (result) => {
  showResults(result);
  updateScores(result.scores);
  currentRound.textContent = result.round;
  
  setTimeout(() => {
    resetRound();
  }, 3000);
});

socket.on('game-reset', () => {
  resetGame();
});

socket.on('waiting-for-players', () => {
  gameState.waitingForPlayers = true;
  gameState.currentGame = null;
  showWaitingScreen();
});

function updateUI() {
  if (gameState.waitingForPlayers) {
    showWaitingScreen();
  } else if (gameState.currentGame) {
    showGameScreen();
  }
}

function showWaitingScreen() {
  waitingScreen.style.display = "block";
  gameScreen.style.display = "none";
}

function showGameScreen() {
  waitingScreen.style.display = "none";
  gameScreen.style.display = "block";
}

function showResults(result) {
  const moveEmojis = {
    'piedra': '🪨',
    'papel': '📄',
    'tijera': '✂️'
  };
  
  player1Move.textContent = moveEmojis[result.player1Move];
  player2Move.textContent = moveEmojis[result.player2Move];
  
  let message = "";
  if (result.result === 'empate') {
    message = "¡Empate! 🤝";
  } else if (result.result === 'player1') {
    message = "¡Ganaste esta ronda! 🎉";
  } else {
    message = "Perdiste esta ronda 😔";
  }
  
  resultMessage.textContent = message;
  results.style.display = "block";
}

function updateScores(scores) {
  player1Score.textContent = scores.player1;
  player2Score.textContent = scores.player2;
}

function resetRound() {
  currentMove = null;
  results.style.display = "none";
  moveButtons.forEach(btn => {
    btn.disabled = false;
  });
  gameStatus.textContent = "Esperando tu jugada...";
}

function resetGame() {
  gameState = {
    players: {},
    currentGame: null,
    waitingForPlayers: true
  };
  currentMove = null;
  player1Score.textContent = "0";
  player2Score.textContent = "0";
  currentRound.textContent = "1";
  gameStatus.textContent = "Esperando tu jugada...";
  results.style.display = "none";
  moveButtons.forEach(btn => {
    btn.disabled = false;
  });
  showWaitingScreen();
}

document.addEventListener('DOMContentLoaded', init);
