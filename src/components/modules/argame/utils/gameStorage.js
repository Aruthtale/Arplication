/**
 * gameStorage.js
 * Utilitas penyimpanan lokal (localStorage) untuk ArGame:
 * - Pengaturan global (suara, getar)
 * - Rekor skor tinggi (High Scores)
 * - Auto-save status game Sudoku yang belum selesai
 */

const STORAGE_KEYS = {
  SETTINGS: 'argame_settings',
  HIGH_SCORES: 'argame_high_scores',
  SUDOKU_SAVE: 'argame_sudoku_state',
};

// Pengaturan awal default
const DEFAULT_SETTINGS = {
  soundEnabled: true,
  hapticEnabled: true,
};

export function getGameSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveGameSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.warn('[ArGame] Gagal menyimpan pengaturan:', err);
  }
}

export function getHighScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
    if (!raw) return { sudoku: { easy: null, medium: null, hard: null }, flappy: 0, duel: 0 };
    return JSON.parse(raw);
  } catch {
    return { sudoku: { easy: null, medium: null, hard: null }, flappy: 0, duel: 0 };
  }
}

export function saveSudokuScore(difficulty, timeInSeconds) {
  try {
    const scores = getHighScores();
    if (!scores.sudoku) scores.sudoku = {};
    const currentBest = scores.sudoku[difficulty];
    if (currentBest === null || currentBest === undefined || timeInSeconds < currentBest) {
      scores.sudoku[difficulty] = timeInSeconds;
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(scores));
      return true; // New record
    }
    return false;
  } catch (err) {
    console.warn('[ArGame] Gagal menyimpan rekor Sudoku:', err);
    return false;
  }
}

export function saveSudokuState(state) {
  try {
    if (!state) {
      localStorage.removeItem(STORAGE_KEYS.SUDOKU_SAVE);
    } else {
      localStorage.setItem(STORAGE_KEYS.SUDOKU_SAVE, JSON.stringify(state));
    }
  } catch (err) {
    console.warn('[ArGame] Gagal menyimpan state Sudoku:', err);
  }
}

export function getSudokuSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUDOKU_SAVE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSudokuState() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SUDOKU_SAVE);
  } catch {
    // Ignore error
  }
}
