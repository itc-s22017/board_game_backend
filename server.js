const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const {
  initializeBoard, initializeBoard2, makeMove,
  checkWinner, countStones, canMakeMove,
  judge, initializeCard, images, checkShinkeiWinner,
  createRandomNumber, calculateHitAndBlow
} = require('./gameLogic');

const app = express();
app.use(cors({
  origin: ['https://board-game-five.vercel.app', 'http://localhost:3000', 'http://localhost:3001'],
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'x-requested-with'],
  credentials: true,
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['https://board-game-five.vercel.app', 'http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-requested-with'],
    credentials: true
  }
});

app.get('/', (req, res) => {
  return res.send('Hello World!');
});

const othelloRooms = new Map();
const shinkeiRooms = new Map();
const hitandblowRooms = new Map();

const getGameRooms = game => {
  switch (game) {
    case 'othello':
      return othelloRooms;
    case 'shinkei':
      return shinkeiRooms;
    case 'hitandblow':
      return hitandblowRooms;
    default:
      return null;
  }
}

const playersLimit = 4;

io.on('connection', (socket) => {

  socket.on('sendBubbleMessage', ({ roomId, message, playerId }) => {
    io.to(roomId).emit('receiveBubbleMessage', { message, playerId });
  });

  socket.on('existroom', game => {
    const GAME = getGameRooms(game);
    const roomList = Array.from(GAME.keys());
    socket.emit('hasroom', roomList);
  });

  socket.on('createothelloRoom', (roomId) => {
    if (!othelloRooms.has(roomId)) {
      const newBoard = initializeBoard();
      othelloRooms.set(roomId, {
        board: newBoard,
        currentPlayerIndex: 0,
        players: [],
        isStarted: false
      });
    }
    socket.join(roomId);
  });

  socket.on('joinRoom', (roomId, game) => {
    const GAME = getGameRooms(game);
    if (GAME.has(roomId)) {
      const room = GAME.get(roomId);
      if (!room.players.some(player => player !== null && player.id === socket.id)) {
        const activePlayers = room.players.filter(player => player !== null && player.id !== null).length;

        if (activePlayers < playersLimit) {
          const findNull = room.players.findIndex(player => player === null);
          if (findNull === -1) {
            // room.players.push(socket.id);
            room.players.push({ id: socket.id, contribution: 0, percent: 0 });
          } else {
            room.players[findNull] = { id: socket.id, contribution: 0, percent: 0 };
          }
          socket.join(roomId);

          // ---------------------- Othelloの処理 ----------------------
          if (game === 'othello') {
            socket.emit('joinOthelloResponse', {
              success: true,
              board: room.board,
              currentPlayer: room.players[room.currentPlayerIndex]?.id,
            });

            const stones = countStones(room.board);

            io.to(roomId).emit('updateGameState', {
              board: room.board,
              currentPlayer: room.players[room.currentPlayerIndex]?.id,
              winner: null,
              stones,
              playerCount: room.players.filter(player => player !== null).length,
            });
            io.to(roomId).emit('updatePlayers', room.players);
          }

          // ---------------------- Shinkeiの処理 ----------------------
          else if (game === 'shinkei') {
            socket.emit('joinShinkeiResponse', {
              success: true,
              // cards: room.cards,
              // currentPlayer: room.players[room.currentPlayerIndex],
            });
            io.to(roomId).emit('updateShinkeiGameState', {
              cards: room.cards,
              currentPlayer: room.players[room.currentPlayerIndex].id,
              playerCount: room.players.filter(player => player !== null).length,
              isStarted: room.isStarted,
              winner: room.winner,
              flippedCardIndex: room.flippedCardIndex
            });
            io.to(roomId).emit('updatePlayers', room.players);
            // ---------------- hit&blowの処理 -------------------------
          } else if (game === 'hitandblow') {
            const isIncludes = room.players.findIndex(player => player.id === socket.id);
            const currentPlayer = room.players[room.currentPlayerIndex].id;

            socket.emit('joinHitAndBlowResponse', {
              success: true,
              currentPlayer: currentPlayer,
            });

            if (isIncludes % 2 === 0) {
              // blue team
              if (room.players[0] && room.players[0].id) {
                io.to(room.players[0].id).emit('updateHitAndBlowGameState', {
                  currentPlayer: room.players[room.currentPlayerIndex]?.id,
                  playerCount: room.players.filter(player => player !== null).length,
                  isStarted: room.isStarted,
                  winner: room.winner,
                  number: room.blue,
                  team: 'blue'
                });
              }
              if (room.players[2] && room.players[2].id) {
                io.to(room.players[2].id).emit('updateHitAndBlowGameState', {
                  currentPlayer: room.players[room.currentPlayerIndex]?.id,
                  playerCount: room.players.filter(player => player !== null).length,
                  isStarted: room.isStarted,
                  winner: room.winner,
                  number: room.blue,
                  team: 'blue'
                });
              }
            } else {
              // red team
              if (room.players[1] && room.players[1].id) {
                io.to(room.players[1].id).emit('updateHitAndBlowGameState', {
                  currentPlayer: room.players[room.currentPlayerIndex]?.id,
                  playerCount: room.players.filter(player => player !== null).length,
                  isStarted: room.isStarted,
                  winner: room.winner,
                  number: room.red,
                  team: 'red'
                });
              }
              if (room.players[3] && room.players[3].id) {
                io.to(room.players[3].id).emit('updateHitAndBlowGameState', {
                  currentPlayer: room.players[room.currentPlayerIndex]?.id,
                  playerCount: room.players.filter(player => player !== null).length,
                  isStarted: room.isStarted,
                  winner: room.winner,
                  number: room.red,
                  team: 'red'
                });
              }
            }
            io.to(roomId).emit('updatePlayerCount', {
              playerCount: room.players.filter(player => player !== null).length
            });
            io.to(roomId).emit('updatePlayers', room.players);  // Send only player IDs
          }


        } else {
          socket.emit('joinRoomResponse', { success: false, isMax: true });
        }
      }
    } else {
      socket.emit('joinRoomResponse', { success: false });
    }
  });

  socket.on('checkRoom', (roomId, game) => {
    const GAME = getGameRooms(game);
    const isExist = GAME.has(roomId)
    if (isExist) {
      const room = GAME.get(roomId)
      if (room.players.filter(player => player !== null).length < playersLimit && !room.isStarted) {
        socket.emit("RoomResponse", { success: true, isMax: false })
      } else {
        socket.emit("RoomResponse", { success: false, isMax: true })
      }
    }
  })


  socket.on('makeMove', ({ roomId, row, col }) => {
    const room = othelloRooms.get(roomId);
    const { board, currentPlayerIndex, players } = room;
    const currentPlayer = players[currentPlayerIndex]?.id;

    if (!room || room.players.filter(player => player !== null).length < playersLimit || socket.id !== room.players[currentPlayerIndex]?.id) {
      console.log('プレイヤーが足りないか、部屋が存在しないか、現在のプレイヤーではありません。');
      return;
    }

    if (room) {
      if (socket.id === currentPlayer) {
        const cp = players.findIndex(player => player.id === currentPlayer)
        const BorW = cp % 2 === 0;
        const newBoard = makeMove(board, row, col, BorW ? 'black' : 'white');

        if (newBoard) {
          if (!room.isStarted) {
            room.isStarted = true;
          }

          const nextPlayerIndex = room.currentPlayerIndex + 1
          room.currentPlayerIndex = nextPlayerIndex % playersLimit
          room.board = newBoard;

          const winner = checkWinner(newBoard);
          const stones = countStones(newBoard);


          if (winner) {
            room.board = initializeBoard();
            room.currentPlayerIndex = 0;
            io.to(roomId).emit('updateGameState', {
              board: room.board,
              currentPlayer: players[room.currentPlayerIndex]?.id,
              winner: winner || null,
              stones: countStones(room.board),
            });
            return;
          }

          let hasPassed = false;
          while (!canMakeMove(newBoard, nextPlayerIndex % 2 === 0 ? 'black' : 'white')) {
            nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
            hasPassed = true;
            io.to(roomId).emit('playerPassed', { player: currentPlayer });

            // 全員がパスする場合はゲーム終了
            if (nextPlayerIndex === currentPlayerIndex) {
              const winner = checkWinner(newBoard);
              const stones = countStones(newBoard);
              io.to(roomId).emit('updateGameState', {
                board: newBoard,
                currentPlayer: null,
                winner: winner || null,
                stones,
              });
              return;
            }
          }

          // クライアントに更新された状態を送信
          io.to(roomId).emit('updateGameState', {
            board: newBoard,
            currentPlayer: players[room.currentPlayerIndex]?.id,
            winner: winner || null,
            stones,
            isStarted: room.isStarted,
          });
          io.to(roomId).emit('updatePlayers', room.players);
        } else {
          socket.emit('invalidMove', { message: 'そこに石は置けないよ！' });
        }
      }
    }
  });

  socket.on('disconnect', () => {
    // ----------------------Othello----------------------------
    othelloRooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(player => player?.id === socket.id);

      if (playerIndex !== -1) {
        room.players = room.players.map(player => player?.id === room.players[playerIndex]?.id ? null : player);


        if (room.isStarted) {
          const isEvenTeam = playerIndex % 2 === 0;
          const partnerIndex = isEvenTeam ? (playerIndex === 0 ? 2 : 0) : (playerIndex === 1 ? 3 : 1);

          const partnerPlayer = room.players[partnerIndex];

          if (partnerPlayer !== null) {
            room.players[playerIndex] = partnerPlayer;
            room.flippedCardIndex = []
          } else {
            console.log('２人いなくなったよお')
          }
        } else {
          room.players[playerIndex] = null;
          room.flippedCardIndex = []
        }
        const activePlayers = room.players.filter(player => player !== null).length;
        const stones = countStones(room.board);
        const winner = checkWinner(room.board);

        // ルームが空の場合は削除
        if (activePlayers === 0) {
          othelloRooms.delete(roomId);
        } else {
          io.to(roomId).emit('updateGameState', {
            board: room.board,
            currentPlayer: room.players[room.currentPlayerIndex]?.id,
            winner: winner || null,
            stones,
            playerCount: room.players.filter(player => player !== null).length,
            isStarted: room.isStarted,
            flippedCardIndex: room.flippedCardIndex
          });
          io.to(roomId).emit('updatePlayers', room.players);

          judge.forEach(([a, b]) => {
            const playersLeft = room.players[a] === null && room.players[b] === null
            if (playersLeft) {
              room.board = initializeBoard();
              room.currentPlayerIndex = 0;
              io.to(roomId).emit('updateGameState', {
                board: room.board,
                currentPlayer: room.players[room.currentPlayerIndex]?.id,
                winner: null,
                stones: countStones(room.board),
              });
              io.to(roomId).emit('reset')
              return;
            }
          })
        }
      }
    });

    // ---------------------------Shinkei----------------------------
    shinkeiRooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(player => player?.id === socket.id);

      if (playerIndex !== -1) {
        room.players = room.players.map(player => player?.id === room.players[playerIndex]?.id ? null : player);


        if (room.isStarted) {
          const isEvenTeam = playerIndex % 2 === 0;
          const partnerIndex = isEvenTeam ? (playerIndex === 0 ? 2 : 0) : (playerIndex === 1 ? 3 : 1);

          const partnerPlayer = room.players[partnerIndex];

          if (partnerPlayer !== null) {
            room.players[playerIndex] = partnerPlayer;
          } else {
            console.log('２人いなくなったよお')
          }
        } else {
          room.players[playerIndex] = null;
        }

        judge.forEach(([a, b]) => {
          const playersLeft = room.players[a] === null && room.players[b] === null
          if (playersLeft) {
            io.to(roomId).emit('reset')
            return;
          }
        })

        io.to(roomId).emit('updatePlayers', room.players);
        const activePlayers = room.players.filter(player => player !== null).length;

        // ルームが空の場合は削除
        if (activePlayers === 0) {
          shinkeiRooms.delete(roomId);
        } else {
          io.to(roomId).emit('updateShinkeiGameState', {
            cards: room.cards,
            playerCount: room.players.filter(player => player !== null).length,
            currentPlayer: room.players[room.currentPlayerIndex]?.id,
            isStarted: room.isStarted,
            flippedCardIndex: room.flippedCardIndex
          });
        }
      }
    });

    // ---------------------Hit&Blow----------------------------------
    hitandblowRooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(player => player?.id === socket.id);

      if (playerIndex !== -1) {
        room.players = room.players.map(player => player?.id === room.players[playerIndex]?.id ? null : player);


        if (room.isStarted) {
          const isEvenTeam = playerIndex % 2 === 0;
          const partnerIndex = isEvenTeam ? (playerIndex === 0 ? 2 : 0) : (playerIndex === 1 ? 3 : 1);

          const partnerPlayer = room.players[partnerIndex];

          if (partnerPlayer !== null) {
            room.players[playerIndex] = partnerPlayer;
          } else {
            console.log('２人いなくなったよお')
          }
        } else {
          room.players[playerIndex] = null;
        }

        judge.forEach(([a, b]) => {
          const playersLeft = room.players[a] === null && room.players[b] === null
          if (playersLeft) {
            io.to(roomId).emit('reset')
            return;
          }
        })
        io.to(roomId).emit('updatePlayers', room.players);

        const activePlayers = room.players.filter(player => player !== null).length;

        if (activePlayers === 0) {
          hitandblowRooms.delete(roomId);
        } else {
          io.to(roomId).emit('updateHitAndBlowGameState', {
            currentPlayer: room.players[room.currentPlayerIndex]?.id,
            playerCount: room.players.filter(player => player !== null).length,
            isStarted: room.isStarted,
            winner: room.winner,
            guesses: {
              teamA: room.guesses.teamA,
              teamB: room.guesses.teamB,
            },
          });
        }
      }
    });

  });
  // --------------------------Shinkei---------------------------------
  socket.on('createshinkeiRoom', (roomId) => {
    if (!shinkeiRooms.has(roomId)) {
      const newCard = initializeCard();
      shinkeiRooms.set(roomId, {
        cards: newCard,
        currentPlayerIndex: 0,
        players: [],
        winner: null,
        isStarted: false,
        flippedCardIndex: [],
        red: 0,
        blue: 0
      });
    }
    socket.join(roomId);
  });

  socket.on('flipCard', (index, roomId) => {
    const room = shinkeiRooms.get(roomId);
    const { currentPlayerIndex, players } = room;
    const currentPlayer = players[currentPlayerIndex]?.id;

    if (!room || room.players.filter(player => player !== null).length < playersLimit || socket.id !== room.players[currentPlayerIndex]?.id) {
      console.log('プレイヤーが足りないか、部屋が存在しないか、現在のプレイヤーではありません。');
      return;
    }

    if (socket.id === currentPlayer) {
      if (!room.isStarted) {
        room.isStarted = true;
      }

      if (room.flippedCardIndex.length === 1) {
        room.flippedCardIndex.push(index);
        const firstCard = room.cards[room.flippedCardIndex[0]];
        const secondCard = room.cards[room.flippedCardIndex[1]];

        if (firstCard.num === secondCard.num) {
          firstCard.isMatched = true;
          secondCard.isMatched = true;
          currentPlayerIndex % 2 === 0 ? room.red += 1 : room.blue += 1
          room.players[currentPlayerIndex].contribution += 10
        } else {
          const nextPlayerIndex = room.currentPlayerIndex + 1
          room.currentPlayerIndex = nextPlayerIndex % playersLimit
        }

        const redContribution = room.players.reduce((sum, player, index) => {
          return player && index % 2 === 0 ? sum + player.contribution : sum;
        }, 0);

        const blueContribution = room.players.reduce((sum, player, index) => {
          return player && index % 2 !== 0 ? sum + player.contribution : sum;
        }, 0);

        room.players.forEach((player, index) => {
          if (player) {
            const teamTotal = index % 2 === 0 ? redContribution : blueContribution;
            player.percent = teamTotal > 0 ? (player.contribution / teamTotal) * 100 : 0;
          }
        });

        if (checkShinkeiWinner(room)) {
          const winner = room.red > room.blue ? 'red' : room.red < room.blue ? 'blue' : 'draw';

          room.players.forEach((player) => {
            if (player) {
              player.contribution = 0;
              player.percent = 0;
            }
          });

          room.cards = initializeCard();
          room.currentPlayerIndex = 0;
          room.flippedCardIndex = [];
          room.red = 0;
          room.blue = 0;

          io.to(roomId).emit('updateShinkeiGameState', {
            cards: room.cards,
            currentPlayer: room.players[room.currentPlayerIndex].id,
            winner: winner,
            flippedCardIndex: room.flippedCardIndex
          });
          return;
        }


        io.to(roomId).emit('updateShinkeiGameState', {
          cards: room.cards,
          playerCount: room.players.filter((player) => player !== null).length,
          currentPlayer: room.players[room.currentPlayerIndex]?.id,
          isStarted: room.isStarted,
          flippedCardIndex: room.flippedCardIndex,
          winner: null
        });
        room.flippedCardIndex = [];
      } else {
        room.flippedCardIndex.push(index);
        io.to(roomId).emit('updateShinkeiGameState', {
          cards: room.cards,
          playerCount: room.players.filter((player) => player !== null).length,
          currentPlayer: room.players[room.currentPlayerIndex]?.id,
          isStarted: room.isStarted,
          flippedCardIndex: room.flippedCardIndex,
          winner: null
        });
      }
      io.to(roomId).emit('updatePlayers', room.players);
    }
  });

  socket.on('createhitandblowRoom', roomId => {
    if (!hitandblowRooms.has(roomId)) {
      const red = createRandomNumber();
      const blue = createRandomNumber();
      hitandblowRooms.set(roomId, {
        currentPlayerIndex: 0,
        players: [],
        guesses: {
          teamA: [],
          teamB: [],
        },
        winner: null,
        isStarted: false,
        red,
        blue,
      });
    }
    socket.join(roomId);
  })

  socket.on('makeGuess', (roomId, guess) => {
    const room = hitandblowRooms.get(roomId);
    const { currentPlayerIndex, players, red, blue, guesses } = room;

    if (!room || room.players.filter(player => player !== null).length < playersLimit || socket.id !== room.players[currentPlayerIndex]?.id) {
      console.log('プレイヤーが足りないか、部屋が存在しないか、現在のプレイヤーではありません。');
      return;
    }

    const isTeamA = players.findIndex(player => player.id === socket.id) % 2 === 0; // チームA: 偶数、チームB: 奇数
    const correctAnswer = isTeamA ? red : blue;

    if (!room.isStarted) {
      room.isStarted = true;
    }

    const { hit, blow } = calculateHitAndBlow(guess, correctAnswer);
    players[currentPlayerIndex].contribution += hit * 10 + blow * 5;

    if (isTeamA) {
      guesses.teamA.push({ guess, hit, blow });
    } else {
      guesses.teamB.push({ guess, hit, blow });
    }

    room.currentPlayerIndex = (currentPlayerIndex + 1) % room.players.length;

    if (hit === 3 && blow === 0) {
      const newRed = createRandomNumber();
      const newBlue = createRandomNumber();

      room.players.forEach((player) => {
        if (player) {
          player.contribution = 0;
          player.percent = 0;
        }
      });

      room.winner = isTeamA ? 'blue' : 'red';
      room.isStarted = false;
      room.currentPlayerIndex = 0;
      room.guesses.teamA = [];
      room.guesses.teamB = [];
      room.red = newRed;
      room.blue = newBlue;

      players.forEach((player, index) => {
        if (player !== null) {
          const isPlayerTeamA = index % 2 === 0;
          const teamData = isPlayerTeamA ? newBlue : newRed;

          io.to(player.id).emit('updateHitAndBlowGameState', {
            currentPlayer: room.players[room.currentPlayerIndex]?.id,
            playerCount: room.players.filter((player) => player !== null).length,
            isStarted: room.isStarted,
            winner: room.winner,
            number: teamData,
            guesses: {
              teamA: guesses.teamA,
              teamB: guesses.teamB,
            },
          });
        }
      });
      room.winner = null;
    } else {
      io.to(roomId).emit('updateHitAndBlowGameState', {
        currentPlayer: room.players[room.currentPlayerIndex]?.id,
        playerCount: room.players.filter(player => player !== null).length,
        isStarted: room.isStarted,
        winner: room.winner,
        guesses: {
          teamA: guesses.teamA,
          teamB: guesses.teamB,
        },
      });
    }

    const currentPlayerIsTeamA = currentPlayerIndex % 2 === 0;

    let teamContribution = 0;
    const teammates = players.filter((_, index) => index % 2 === (currentPlayerIsTeamA ? 0 : 1));
    teammates.forEach(player => {
      teamContribution += player?.contribution || 0;
    });

    teammates.forEach(player => {
      if (player) {
        const contribution = player.contribution || 0;
        const percent = teamContribution > 0 ? (contribution / teamContribution) * 100 : 0;
        player.percent = Math.round(percent);
      }
    });
    io.to(roomId).emit('updatePlayers', room.players);
  });

});



const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});