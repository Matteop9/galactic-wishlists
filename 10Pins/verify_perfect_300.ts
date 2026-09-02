import { score } from "./src/engine";
import { frameCounts } from "./src/lib/frames";
import type { Roll, FrameInput } from "./src/engine";

const perfectGame: FrameInput[] = [
  { rolls: ['X' as Roll] },
  { rolls: ['X' as Roll] },
  { rolls: ['X' as Roll] },
  { rolls: ['X' as Roll] },
  { rolls: ['X' as Roll] },
  { rolls: ['X' as Roll] },
  { rolls: ['X' as Roll] },
  { rolls: ['X' as Roll] },
  { rolls: ['X' as Roll] },
  { rolls: ['X' as Roll, 'X' as Roll, 'X' as Roll] },
];

const scored = score(perfectGame);
const counts = frameCounts(scored);

console.log("Perfect 300 game:");
console.log("- Total score:", scored.total);
console.log("- Frame counts:", counts);
console.log("- Expected by bowlers: strikes: 12, spares: 0, opens: 0");
console.log("- Actual strike rolls in game:");

let strikeRollCount = 0;
for (const frame of scored.frames) {
  for (const roll of frame.rolls) {
    if (roll === 'X') strikeRollCount++;
  }
}
console.log("  Total X rolls:", strikeRollCount);

// Test the case from highlights.test.ts
const testGame: FrameInput[] = [
  { rolls: ['X' as Roll] },
  { rolls: [5, '/'] as Roll[] },
  { rolls: [3, 4] as Roll[] },
  { rolls: ['X' as Roll] },
  { rolls: [7, '/'] as Roll[] },
  { rolls: [0, 0] as Roll[] },
  { rolls: ['X' as Roll] },
  { rolls: [1, 2] as Roll[] },
  { rolls: [9, '/'] as Roll[] },
  { rolls: ['X' as Roll, 'X' as Roll, 'X' as Roll] },
];

const testScored = score(testGame);
const testCounts = frameCounts(testScored);

console.log("\nTest game from highlights.test.ts:");
console.log("- Frame counts:", testCounts);
console.log("- Expected: { strikes: 4, spares: 3, opens: 3 }");
