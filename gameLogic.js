// type CellValue = 'black' | 'white' | null;
// type BoardState = CellValue[][];
// type Player = 'black' | 'white';

const calculateHitAndBlow = (guess, correctAnswer) => {
  let hit = 0;
  let blow = 0;

  const unmatchedGuess = [];
  const unmatchedAnswer = [];

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === correctAnswer[i]) {
      hit++;
    } else {
      unmatchedGuess.push(guess[i]);
      unmatchedAnswer.push(correctAnswer[i]);
    }
  }

  unmatchedGuess.forEach(digit => {
    const index = unmatchedAnswer.indexOf(digit);
    if (index !== -1) {
      blow++;
      unmatchedAnswer.splice(index, 1); 
    }
  });

  return { hit, blow };
};

const createRandomNumber = () => {
  let num = '';

  while (num.length < 3) {
    const randomDigit = Math.floor(Math.random() * 10);
    if (!num.includes(randomDigit)) {
      num += randomDigit;
    }
  }

  return num;
}


const judge = [[0, 2], [1, 3]];
const images = [
  {
    num: 1,
    img: '/img/IMG_7250.webp',
    isMatched: false
  },
  {
    num: 2,
    img: '/img/IMG_7257.webp',
    isMatched: false
  },
  {
    num: 3,
    img: '/img/IMG_7258.webp',
    isMatched: false
  },
  {
    num: 4,
    img: '/img/bikkuri_2.webp',
    isMatched: false
  },
  {
    num: 5,
    img: '/img/banananeko.webp',
    isMatched: false
  },
  {
    num: 6,
    img: '/img/yamuneko.webp',
    isMatched: false
  },
  {
    num:7,
    img:'/img/neko21.webp',
    isMatched:false
  },
  {
    num:8,
    img:'/img/neko5.webp',
    isMatched:false
  },
  {
    num:9,
    img:'/img/neko4.webp',
    isMatched:false
  },
  {
    num:10,
    img:'/img/neko3.webp',
    isMatched:false
  },
  {
    num:11,
    img:'/img/neko2.webp',
    isMatched:false
  },
]

const initializeCard = () => {
  const shuffledImages = [...images, ...images]
    .map((item, index) => ({ ...item, id: index + 1 }))
    .sort((a, b) => 0.5 - Math.random());

  return shuffledImages
}

const checkShinkeiWinner = (room) => {
  return room.cards.every((element) => element.isMatched);
};


// 盤面の初期化を行う関数
// const initializeBoard2 = () => {
//   const board = Array(8).fill(null).map(() => Array(8).fill(null));

//   // 初期盤面
//   board[0] = [null, null, 'black', null, null, null, null, null];
//   board[1] = [null, null, null, 'black', 'black', 'white', null, null];
//   board[2] = [null, null, null, 'black', 'black', null, null, null];
//   board[3] = ['black', 'black', 'black', null, null, 'white', null, null];
//   board[4] = ['black', 'black', null, null, null, null, null, null];
//   board[5] = [null, null, null, null, null, null, null, null];
//   board[6] = [null, null, null, null, null, null, null, null];
//   board[7] = [null, null, null, null, null, null, null, null];

//   return board;
// };

const initializeBoard2 = () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));

  // 62マス埋まった状態を作成
  board[0] = ['black', 'black', 'black', 'white', 'black', 'black', 'black', 'white'];
  board[1] = ['white', 'white', 'white', 'black', 'white', 'white', 'white', 'black'];
  board[2] = ['black', 'black', 'black', 'white', 'black', 'black', 'black', 'white'];
  board[3] = ['white', 'white', 'white', 'black', 'white', 'white', 'white', 'black'];
  board[4] = ['black', 'black', 'black', 'white', 'black', 'black', 'black', 'white'];
  board[5] = ['white', 'white', 'white', 'black', 'white', 'white', null, null];
  board[6] = ['black', 'black', 'black', 'white', 'black', 'black', null, null];
  board[7] = ['white', 'white', 'white', 'black', 'white', 'white', null, null];

  return board;
};



const initializeBoard = () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  board[3][3] = 'white';
  board[3][4] = 'black';
  board[4][3] = 'black';
  board[4][4] = 'white';
  return board;
};




const makeMove = (board, row, col, player) => {
  if (board[row][col] !== null) {
    return null;
  }

  let canFlip = false;
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  const newBoard = board.map(row => [...row]);

  directions.forEach(([dx, dy]) => {
    let x = row + dx;
    let y = col + dy;
    let toFlip = [];
    while (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y] === (player === 'black' ? 'white' : 'black')) {
      toFlip.push([x, y]);
      x += dx;
      y += dy;
    }

    if (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y] === player && toFlip.length > 0) {
      canFlip = true;
      toFlip.forEach(([fx, fy]) => {
        newBoard[fx][fy] = player;
      });
    }
  });

  if (!canFlip) {
    return null;
  }

  newBoard[row][col] = player;
  return newBoard;
};

const countStones = (board) => {
  let black = 0, white = 0;
  board.forEach(row => {
    row.forEach(cell => {
      if (cell === 'black') black++;
      if (cell === 'white') white++;
    });
  });
  return { black, white };
};

const checkWinner = (board) => {
  const { black, white } = countStones(board);

  if (black + white === 64 || black === 0 || white === 0) {
    if (black > white) return 'black';
    if (white > black) return 'white';
    return 'draw';
  }

  return null;
};

const canMakeMove = (board, player) => {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (makeMove(board, row, col, player)) {
        return true;
      }
    }
  }
  return false;
};

module.exports = {
  initializeBoard,
  initializeBoard2,
  makeMove,
  countStones,
  checkWinner,
  canMakeMove,
  judge,
  initializeCard,
  images,
  checkShinkeiWinner,
  createRandomNumber,
  calculateHitAndBlow
};
