'use strict';

/**
 * Generates a random derangement (a permutation with no fixed points)
 * that also avoids mutual pairs (A→B and B→A cannot both occur).
 *
 * Algorithm: Sattolo's algorithm extended with mutual-pair rejection.
 *   1. Run Sattolo's algorithm to get a derangement (guaranteed no self-loops).
 *   2. Check for mutual pairs: if i→j and j→i, swap j's assignment with
 *      another random participant's assignment until no mutual pairs remain.
 *   3. After swapping, re-validate that no self-loops were re-introduced.
 *   4. Repeat up to MAX_ATTEMPTS times to handle edge cases (very small N).
 *
 * Returns null if no valid derangement could be found (e.g., N < 2,
 * or N = 2 which always creates a mutual pair — caller should guard against this).
 *
 * @param {string[]} ids  - array of participant ID strings
 * @returns {Map<string, string> | null} - Map from gifter id → giftee id
 */
const generateDraw = (ids) => {
  const n = ids.length;
  if (n < 2) return null;

  // With only 2 participants a derangement is always mutual — reject early.
  if (n === 2) return null;

  const MAX_ATTEMPTS = 500;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const perm = sattoloDerangement(ids.slice());

    if (!perm) continue; // shouldn't happen for n >= 3

    if (!hasMutualPairs(perm, ids)) {
      return buildMap(ids, perm);
    }

    // Try to fix mutual pairs without breaking the derangement
    const fixed = fixMutualPairs(ids, perm);
    if (fixed) {
      return buildMap(ids, fixed);
    }
    // If fixing failed, try again with a fresh derangement
  }

  return null; // extremely unlikely to reach here for n >= 4
};

// ─── Sattolo's Algorithm ──────────────────────────────────────────────────────
// Produces a uniformly random derangement (no element in its original position).
const sattoloDerangement = (arr) => {
  const perm = arr.slice(); // copy
  for (let i = perm.length - 1; i > 0; i--) {
    // Pick j from [0, i-1] — key difference from Fisher-Yates
    const j = Math.floor(Math.random() * i);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
};

// ─── Check for mutual pairs ───────────────────────────────────────────────────
// perm[i] is the giftee for ids[i].
const hasMutualPairs = (perm, ids) => {
  const indexMap = new Map(ids.map((id, idx) => [id, idx]));
  for (let i = 0; i < ids.length; i++) {
    const gifteeId = perm[i];
    const gifteeIdx = indexMap.get(gifteeId);
    if (perm[gifteeIdx] === ids[i]) return true; // mutual!
  }
  return false;
};

// ─── Attempt to break mutual pairs ───────────────────────────────────────────
const fixMutualPairs = (ids, perm) => {
  const fixed = perm.slice();
  const n = ids.length;
  const indexMap = new Map(ids.map((id, idx) => [id, idx]));

  let changed = true;
  let passes = 0;

  while (changed && passes < 100) {
    changed = false;
    passes++;

    for (let i = 0; i < n; i++) {
      const gifteIdx = indexMap.get(fixed[i]);
      if (fixed[gifteIdx] === ids[i]) {
        // ids[i] → fixed[i] and fixed[i] → ids[i] — mutual pair detected.
        // Try to swap fixed[i] (i's giftee assignment) with another participant j.
        let swapped = false;

        // Shuffle candidate indices to try
        const candidates = shuffledRange(n).filter((k) => k !== i && k !== gifteIdx);

        for (const k of candidates) {
          // Proposed swap: fixed[i] ↔ fixed[k]
          // After swap, check:
          //   1. ids[i] !== fixed[k]  (i doesn't gift themselves)
          //   2. ids[k] !== fixed[i]  (k doesn't gift themselves)
          if (fixed[k] !== ids[i] && fixed[i] !== ids[k]) {
            [fixed[i], fixed[k]] = [fixed[k], fixed[i]];
            swapped = true;
            changed = true;
            break;
          }
        }

        if (!swapped) return null; // couldn't fix — caller will retry
      }
    }
  }

  // Final validation: no self-loops
  for (let i = 0; i < n; i++) {
    if (fixed[i] === ids[i]) return null;
  }

  return fixed;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const shuffledRange = (n) => {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildMap = (ids, perm) => {
  const map = new Map();
  ids.forEach((id, i) => map.set(id, perm[i]));
  return map;
};

module.exports = { generateDraw };
