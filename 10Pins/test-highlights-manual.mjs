// Manually test the computeHighlights logic
const CLUBS = [300, 250, 200, 150, 100];

function computeHighlights(opts) {
  const { score, previousBest } = opts;
  const out = [];

  if (previousBest === null) out.push('FIRST_GAME');
  else if (score > previousBest) out.push('PB');

  const club = CLUBS.find((t) => score >= t && (previousBest ?? -1) < t);
  if (club) out.push(`${club}_CLUB`);

  return out;
}

// Test cases from the claim
console.log('Test 1 - First game, score 87 (tested):');
console.log('  Result:', computeHighlights({ score: 87, previousBest: null }));
console.log('  Expected: [FIRST_GAME]');

console.log('\nTest 2 - First game, score 150 (NOT tested):');
console.log('  Result:', computeHighlights({ score: 150, previousBest: null }));
console.log('  Expected: [FIRST_GAME, 150_CLUB]');

console.log('\nTest 3 - First game, score 100 (NOT tested):');
console.log('  Result:', computeHighlights({ score: 100, previousBest: null }));
console.log('  Expected: [FIRST_GAME, 100_CLUB]');

console.log('\nTest 4 - First game, score 250 (NOT tested):');
console.log('  Result:', computeHighlights({ score: 250, previousBest: null }));
console.log('  Expected: [FIRST_GAME, 250_CLUB]');

console.log('\nTest 5 - PB case for comparison (tested):');
console.log('  Result:', computeHighlights({ score: 150, previousBest: 140 }));
console.log('  Expected: [PB, 150_CLUB]');
