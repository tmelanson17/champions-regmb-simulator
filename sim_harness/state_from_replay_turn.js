'use strict';

// Reconstructs a real, continuable Battle state matching turn 3 of
// Gen9ChampionsVGC2026RegMBBo3-2026-07-19-neuesspielzeug-ctjn17: right after
// Chandelure's Heat Wave hits Gholdengo and the just-switched-in Milotic,
// and Gholdengo uses Nasty Plot.
//
// This is NOT an automatic parser of the replay's |move|/|switch| lines --
// the choices below were read off that log by hand and encoded as harness
// step() calls. It proves the state is reachable and gets structurally the
// same sequence of events as the real game, but two things can't be
// recovered from a display log:
//
//   1. The real PRNG seed is unknown, so damage rolls / secondary-effect
//      chances (e.g. Poison Touch's 30% proc) differ turn to turn. Expect
//      HP percentages close to, but not identical to, the real game.
//   2. Only the two leads per side are confirmed by turn 3; the other 2 of
//      each side's brought-4 are unconfirmed placeholders (they never
//      entered play by this point, so it doesn't affect the outcome here,
//      but don't trust their identity beyond that).
//
// Run with: node state_from_replay_turn.js path/to/replay.html

const fs = require('fs');
const { reconstructTeamsFromReplay } = require('./replay_team');
const { createBattle, step } = require('./harness');

const FORMAT = 'gen9championsvgc2026regmb';

const replayPath = process.argv[2];
if (!replayPath) {
  console.error('Usage: node state_from_replay_turn.js path/to/replay.html');
  process.exit(1);
}

const logText = fs.readFileSync(replayPath, 'utf8');
const teams = reconstructTeamsFromReplay(logText);

const battle = createBattle(FORMAT, {
  p1: { name: 'P1', team: teams.p1 },
  p2: { name: 'P2', team: teams.p2 },
});

// Team preview: leads confirmed by the log are Chandelure+Sneasler (p1) and
// Gholdengo+Hydreigon (p2). Milotic is confirmed brought (it switches in on
// turn 2). The other bench slot per side is an unconfirmed placeholder.
step(battle, { p1: 'team 4612', p2: 'team 4612' });

// Turn 1: Gholdengo Protect; Sneasler Fake Out -> Hydreigon (flinches it);
// Hydreigon's queued move never resolves because of the flinch, so its
// choice doesn't matter -- left on 'default'; Chandelure Heat Wave (spread,
// no target needed) into the Protect-shielded Gholdengo/Hydreigon backline.
step(battle, { p1: 'move 2, move 1 2', p2: 'move 4, default' });

// Turn 2: Gholdengo Nasty Plot; Hydreigon switches out for Milotic; Sneasler
// Protect; Chandelure Heat Wave again (now hits Gholdengo + the incoming
// Milotic).
step(battle, { p1: 'move 2, move 4', p2: 'move 3, switch 3' });

console.log(`Reached turn ${battle.turn}, requestState: ${battle.requestState}`);
console.log('--- p1 ---');
for (const p of battle.sides[0].pokemon) {
  console.log(`${p.species.name}: ${p.hp}/${p.maxhp} (${Math.round(100 * p.hp / p.maxhp)}%)`);
}
console.log('--- p2 ---');
for (const p of battle.sides[1].pokemon) {
  console.log(`${p.species.name}: ${p.hp}/${p.maxhp} (${Math.round(100 * p.hp / p.maxhp)}%)`);
}

module.exports = { battle };
