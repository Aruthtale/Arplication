/**
 * sudokuGenerator.js
 * Generator & Solver Sudoku 9x9 dengan tingkat kesulitan kustom & validasi cepat.
 */

// Format ketiadaan angka = 0
export const EMPTY = 0;

/**
 * Memeriksa apakah penempatan angka pada posisi (row, col) valid
 */
export function isValid(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    // Cek baris
    if (board[row][i] === num && i !== col) return false;
    // Cek kolom
    if (board[i][col] === num && i !== row) return false;
    // Cek subgrid 3x3
    const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
    const boxCol = 3 * Math.floor(col / 3) + (i % 3);
    if (board[boxRow][boxCol] === num && (boxRow !== row || boxCol !== col)) return false;
  }
  return true;
}

/**
 * Memecahkan papan Sudoku menggunakan algoritma Backtracking
 */
export function solve(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === EMPTY) {
        const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of numbers) {
          if (isValid(board, r, c, num)) {
            board[r][c] = num;
            if (solve(board)) return true;
            board[r][c] = EMPTY;
          }
        }
        return false;
      }
    }
  }
  return true;
}

/**
 * Acak array (Fisher-Yates Shuffle)
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Membuat papan Sudoku baru berdasarkan tingkat kesulitan
 * Difficulty: 'easy' | 'medium' | 'hard'
 */
export function generateSudoku(difficulty = 'easy') {
  // 1. Inisialisasi papan kosong 9x9
  const solution = Array.from({ length: 9 }, () => Array(9).fill(EMPTY));

  // 2. Isi blok diagonal 3x3 independen secara acak untuk keberagaman solusi
  for (let i = 0; i < 9; i += 3) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        solution[i + r][i + c] = nums[idx++];
      }
    }
  }

  // 3. Cari solusi lengkap untuk seluruh papan 9x9
  solve(solution);

  // 4. Buat salinan papan awal (puzzle) dengan mengosongkan sejumlah sel
  const puzzle = solution.map((row) => [...row]);

  // Jumlah sel yang tetap terbuka berdasarkan kesulitan
  let cluesCount = 38; // Default 'easy'
  if (difficulty === 'medium') cluesCount = 31;
  if (difficulty === 'hard') cluesCount = 25;

  const totalToRemove = 81 - cluesCount;
  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }

  const shuffledPositions = shuffle(positions);
  for (let i = 0; i < totalToRemove; i++) {
    const [r, c] = shuffledPositions[i];
    puzzle[r][c] = EMPTY;
  }

  return {
    puzzle,     // Board awal dengan sel kosong
    solution,   // Solusi lengkap
  };
}

/**
 * Deteksi seluruh sel yang mengalami konflik (duplikasi angka pada baris/kolom/blok)
 */
export function findConflicts(currentBoard) {
  const conflicts = Array.from({ length: 9 }, () => Array(9).fill(false));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = currentBoard[r][c];
      if (val === EMPTY) continue;

      // Periksa apakah angka val mengalami bentrokan dengan sel lain
      for (let i = 0; i < 9; i++) {
        // Bentrokan baris
        if (i !== c && currentBoard[r][i] === val) {
          conflicts[r][c] = true;
          conflicts[r][i] = true;
        }
        // Bentrokan kolom
        if (i !== r && currentBoard[i][c] === val) {
          conflicts[r][c] = true;
          conflicts[i][c] = true;
        }
      }

      // Bentrokan subgrid 3x3
      const startR = 3 * Math.floor(r / 3);
      const startC = 3 * Math.floor(c / 3);
      for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
          const nr = startR + br;
          const nc = startC + bc;
          if ((nr !== r || nc !== c) && currentBoard[nr][nc] === val) {
            conflicts[r][c] = true;
            conflicts[nr][nc] = true;
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Memeriksa apakah papan sudah terisi penuh dan sesuai dengan solusi
 */
export function isSolved(currentBoard, solution) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentBoard[r][c] === EMPTY || currentBoard[r][c] !== solution[r][c]) {
        return false;
      }
    }
  }
  return true;
}
