import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EMPTY,
  countNumber,
  countCorrectNumber,
  isNumberComplete,
  canUseHint,
  hintsRemaining,
  MAX_HINTS_PER_GAME,
  generateSudoku,
  isSolved,
} from '../src/components/modules/argame/games/sudoku/sudokuGenerator.js';

function emptyBoard() {
  return Array.from({ length: 9 }, () => Array(9).fill(EMPTY));
}

test('MAX_HINTS_PER_GAME = 3', () => {
  assert.equal(MAX_HINTS_PER_GAME, 3);
});

test('canUseHint: benar sampai batas 3', () => {
  assert.equal(canUseHint(0), true);
  assert.equal(canUseHint(1), true);
  assert.equal(canUseHint(2), true);
  assert.equal(canUseHint(3), false); // habis
  assert.equal(canUseHint(4), false);
  // guard argumen kosong
  assert.equal(canUseHint(), true);
  assert.equal(canUseHint(null), true);
});

test('hintsRemaining: menghitung sisa jatah', () => {
  assert.equal(hintsRemaining(0), 3);
  assert.equal(hintsRemaining(1), 2);
  assert.equal(hintsRemaining(3), 0);
  assert.equal(hintsRemaining(5), 0); // tidak negatif
  assert.equal(hintsRemaining(), 3);
});

test('countNumber: menghitung kemunculan mentah', () => {
  const board = emptyBoard();
  board[0][0] = 5;
  board[1][1] = 5;
  board[2][2] = 7;
  assert.equal(countNumber(board, 5), 2);
  assert.equal(countNumber(board, 7), 1);
  assert.equal(countNumber(board, 1), 0);
  assert.equal(countNumber(null, 5), 0);
});

test('countCorrectNumber: hanya menghitung yang sesuai solusi', () => {
  const board = emptyBoard();
  const solution = emptyBoard();
  // solusi menempatkan 5 di (0,0),(1,1),(2,2)
  solution[0][0] = 5; solution[1][1] = 5; solution[2][2] = 5;
  // papan: 2 benar, 1 salah posisi
  board[0][0] = 5; // benar
  board[1][1] = 5; // benar
  board[5][5] = 5; // salah (solusi di situ bukan 5)
  assert.equal(countCorrectNumber(board, solution, 5), 2);
});

test('isNumberComplete: lengkap hanya bila 9 penempatan benar terisi', () => {
  const solution = emptyBoard();
  const board = emptyBoard();
  // isi solusi angka 3 di 9 posisi
  const positions = [];
  for (let i = 0; i < 9; i++) positions.push([i, i]);
  positions.forEach(([r, c]) => { solution[r][c] = 3; });

  // baru 8 benar -> belum lengkap
  for (let i = 0; i < 8; i++) board[positions[i][0]][positions[i][1]] = 3;
  assert.equal(isNumberComplete(board, solution, 3), false);

  // lengkapi yang ke-9 -> lengkap
  board[positions[8][0]][positions[8][1]] = 3;
  assert.equal(isNumberComplete(board, solution, 3), true);
});

test('isNumberComplete: salah input tidak mengunci angka (berbasis solusi)', () => {
  const solution = emptyBoard();
  const board = emptyBoard();
  // solusi angka 4 hanya 1 posisi
  solution[0][0] = 4;
  // pemain menaruh 4 di banyak posisi yang salah
  for (let c = 0; c < 9; c++) board[0][c] = 4; // 9x "4" tapi hanya 1 yang benar
  assert.equal(countNumber(board, 4), 9, 'hitungan mentah 9');
  assert.equal(
    isNumberComplete(board, solution, 4),
    false,
    'angka tidak boleh terkunci hanya karena salah input berulang',
  );
  // setelah benar di (0,0) tetap belum lengkap (solusi cuma 1x)
  assert.equal(countCorrectNumber(board, solution, 4), 1);
});

test('setelah papan selesai, semua angka 1-9 lengkap', () => {
  const { solution } = generateSudoku('easy');
  // papan == solusi
  for (let num = 1; num <= 9; num++) {
    assert.equal(countCorrectNumber(solution, solution, num), 9, `angka ${num} harus 9`);
    assert.equal(isNumberComplete(solution, solution, num), true);
  }
  assert.equal(isSolved(solution, solution), true);
});

/**
 * Guard regresi wiring (bug-hunter: "check the wiring before editing the content").
 * Pernah terjadi: helper diubah signature-nya (tambah argumen `solution`) tapi
 * pemanggil di komponen tidak ikut diubah → argumen bergeser, hasil selalu salah
 * (angka tak pernah terkunci). Tes ini memastikan komponen memakai API yang benar.
 */
test('SudokuGame: numpad memakai numberCounts (bukan isNumberComplete signature lama)', () => {
  const file = join(
    new URL('..', import.meta.url).pathname,
    'src/components/modules/argame/games/sudoku/SudokuGame.jsx',
  );
  const src = readFileSync(file, 'utf8');
  assert.ok(
    /numberCounts\[num\s*-\s*1\]\s*>=\s*9/.test(src),
    'numpad harus menentukan "complete" dari numberCounts[num-1] >= 9',
  );
  assert.ok(
    !/isNumberComplete\(\s*board\s*,\s*num\s*\)/.test(src),
    'tidak boleh memakai isNumberComplete(board, num) — signature butuh (board, solution, num)',
  );
});

test('SudokuGame: hint dibatasi (canUseHint) + counter hintsUsed', () => {
  const file = join(
    new URL('..', import.meta.url).pathname,
    'src/components/modules/argame/games/sudoku/SudokuGame.jsx',
  );
  const src = readFileSync(file, 'utf8');
  assert.ok(/canUseHint\(hintsUsed\)/.test(src), 'handleHint harus memakai canUseHint(hintsUsed)');
  assert.ok(/setHintsUsed\(/.test(src), 'harus ada state hintsUsed');
  assert.ok(/disabled=\{[^}]*canUseHint\(hintsUsed\)/.test(src), 'tombol Hint harus dinonaktifkan saat jatah habis');
});

