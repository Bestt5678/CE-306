let boardSize = 4;
let board = [];
let moves = 0;
let isWon = false;

const gameBoard = document.getElementById('gameBoard');
const movesDisplay = document.getElementById('movesDisplay');
const statusMessage = document.getElementById('statusMessage');

const btnClasses = {
  active: 'bg-amber-500 text-slate-900',
  inactive: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
};

// [ปรับปรุง]: เพิ่ม flex, items-center, justify-center และขนาดข้อความไอคอน (text-xl ถึง 3xl)
const lightClasses = {
  base: 'w-full h-full rounded-lg transition-all duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-white/50 border-2 flex items-center justify-center text-xl sm:text-2xl md:text-3xl select-none',
  on: 'bg-amber-400 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)] text-amber-950 scale-100', // ไฟเปิด: สว่าง มีออร่าสีทอง
  off: 'bg-slate-700 dark:bg-slate-950 border-slate-600 dark:border-slate-800 shadow-inner text-slate-400 dark:text-slate-600 opacity-60' // ไฟปิด: สีมืดสลายออร่า
};

function setLevel(size) {
  boardSize = size;
  
  [3, 4, 5].forEach(s => {
    const btn = document.getElementById(`btn${s}x${s}`);
    if (s === size) {
      btn.className = `flex-1 py-2 text-sm font-bold rounded-lg transition-colors focus:outline-none ${btnClasses.active}`;
    } else {
      btn.className = `flex-1 py-2 text-sm font-bold rounded-lg transition-colors focus:outline-none ${btnClasses.inactive}`;
    }
  });

  gameBoard.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
  gameBoard.style.gridTemplateRows = `repeat(${size}, minmax(0, 1fr))`;

  initGame();
}

function initGame() {
  moves = 0;
  isWon = false;
  
  board = Array.from({ length: boardSize }, () => Array(boardSize).fill(false));

  const clickCount = boardSize * boardSize * 2;
  for (let i = 0; i < clickCount; i++) {
    const r = Math.floor(Math.random() * boardSize);
    const c = Math.floor(Math.random() * boardSize);
    toggleLogic(r, c);
  }

  if (checkWinCondition()) {
    initGame();
    return;
  }

  updateUI();
  updateStatus("พยายามปิดไฟให้หมดทุกดวง!", "text-slate-800 dark:text-slate-100");
}

function toggleLogic(r, c) {
  const directions = [
    [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]
  ];

  for (let [dr, dc] of directions) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
      board[nr][nc] = !board[nr][nc];
    }
  }
}

function handleLightClick(r, c) {
  if (isWon) return;

  toggleLogic(r, c);
  moves++;
  
  if (checkWinCondition()) {
    isWon = true;
    updateStatus(`🎉 ชนะแล้ว! คุณปิดไฟได้หมดด้วยการกด ${moves} ครั้ง`, "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30");
  }

  updateUI();
}

function checkWinCondition() {
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === true) return false;
    }
  }
  return true;
}

function updateUI() {
  gameBoard.innerHTML = '';
  movesDisplay.textContent = moves;

  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const btn = document.createElement('button');
      const isOn = board[r][c];
      
      btn.className = `${lightClasses.base} ${isOn ? lightClasses.on : lightClasses.off}`;
      
      // [เพิ่มไอคอน]: ใส่ไอคอน 💡 เมื่อไฟเปิด และ 🌑 เมื่อไฟปิด
      btn.innerHTML = isOn ? '💡' : '🌑';
      
      btn.setAttribute('aria-label', `ไฟแถว ${r+1} คอลัมน์ ${c+1} สถานะ ${isOn ? 'เปิด' : 'ปิด'}`);
      btn.addEventListener('click', () => handleLightClick(r, c));
      
      gameBoard.appendChild(btn);
    }
  }
}

function updateStatus(msg, textClass) {
  statusMessage.textContent = msg;
  statusMessage.className = `text-sm font-bold px-4 py-2 rounded-lg text-center w-full min-h-[40px] flex items-center justify-center transition-colors ${textClass}`;
  
  if(!textClass.includes('bg-')) {
    statusMessage.classList.add('bg-slate-200', 'dark:bg-slate-700');
  }
}

const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');

function initTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  themeIcon.textContent = isDark ? '☀️' : '🌙';
}

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  themeIcon.textContent = isDark ? '☀️' : '🌙';
});

initTheme();
setLevel(4);