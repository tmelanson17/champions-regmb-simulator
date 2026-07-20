'use strict';

// Starts a real, playable battle using teams reconstructed from a replay's
// open team sheet reveal (see replay_team.js). This is a *fresh* battle from
// team preview using that roster -- not a resume of the actual replay's
// mid-game state, which needs turn-by-turn action replay (not built yet).
//
// Run with: node battle_from_replay.js path/to/replay.html

const fs = require('fs');
const { reconstructTeamsFromReplay } = require('./replay_team');
const { createBattle, runUntil } = require('./harness');

const FORMAT = 'gen9championsvgc2026regmb';

const replayPath = process.argv[2];
if (!replayPath) {
  console.error('Usage: node battle_from_replay.js path/to/replay.html');
  process.exit(1);
}

const logText = fs.readFileSync(replayPath, 'utf8');
const teams = reconstructTeamsFromReplay(logText);
if (!teams.p1 || !teams.p2) {
  console.error('Could not find both p1 and p2 open team sheets in that replay.');
  process.exit(1);
}

const battle = createBattle(FORMAT, {
  p1: { name: 'Reconstructed P1', team: teams.p1 },
  p2: { name: 'Reconstructed P2', team: teams.p2 },
});
console.log(`Battle started (${FORMAT}). requestState: ${battle.requestState}`);

// Play it out with PS's own auto-picker so you can see the whole thing run.
runUntil(battle, b => b.ended);
console.log(`Finished at turn ${battle.turn}: ${battle.winner ? `winner ${battle.winner}` : 'tie'}`);

module.exports = { battle };
