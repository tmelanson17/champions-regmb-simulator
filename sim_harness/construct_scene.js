'use strict';

// Directly constructs the turn-3 scene from
// Gen9ChampionsVGC2026RegMBBo3-2026-07-19-neuesspielzeug-ctjn17 -- Gholdengo
// at 27%, Milotic switched in at 85%, Sneasler at 90% -- by writing those
// values straight onto the Pokemon objects, instead of simulating turns 1-2
// and hoping RNG lines up (see state_from_replay_turn.js for that approach
// and why it can't match exactly).
//
// This *is* exact, by construction: there's no RNG involved in setting a
// field. The tradeoff is the opposite one -- nothing here is derived from
// what actually happened in the replay, so it's on you to specify every
// field that matters (HP, status, boosts, ...); anything you don't set
// stays at its post-team-preview default (full HP, no status, no boosts).
//
// Run with: node construct_scene.js path/to/replay.html

const fs = require('fs');
const { reconstructTeamsFromReplay } = require('./replay_team');
const { createBattle, step, setHpPercent, switchActive, refreshRequest } = require('./harness');

const FORMAT = 'gen9championsvgc2026regmb';

const replayPath = process.argv[2];
if (!replayPath) {
  console.error('Usage: node construct_scene.js path/to/replay.html');
  process.exit(1);
}

const logText = fs.readFileSync(replayPath, 'utf8');
const teams = reconstructTeamsFromReplay(logText);

const battle = createBattle(FORMAT, {
  p1: { name: 'P1', team: teams.p1 },
  p2: { name: 'P2', team: teams.p2 },
});

// Team preview gets the confirmed leads onto the field (Chandelure+Sneasler
// for p1, Gholdengo+Hydreigon for p2) with no moves played -- see
// state_from_replay_turn.js for the placeholder-bench caveat.
step(battle, { p1: 'team 4612', p2: 'team 4612' });

const bySpecies = (side, species) => side.pokemon.find(p => p.species.name === species);

// Hydreigon -> Milotic in p2's second slot, per the target scene.
switchActive(bySpecies(battle.sides[1], 'Milotic'), 1);

setHpPercent(bySpecies(battle.sides[1], 'Gholdengo'), 27);
setHpPercent(bySpecies(battle.sides[1], 'Milotic'), 85);
setHpPercent(bySpecies(battle.sides[0], 'Sneasler'), 90);

battle.turn = 3;
refreshRequest(battle);

console.log(`Constructed turn ${battle.turn}, requestState: ${battle.requestState}`);
console.log('--- p1 ---');
for (const p of battle.sides[0].pokemon) {
  console.log(`${p.species.name}: ${p.hp}/${p.maxhp} (${Math.round(100 * p.hp / p.maxhp)}%)`);
}
console.log('--- p2 ---');
for (const p of battle.sides[1].pokemon) {
  console.log(`${p.species.name}: ${p.hp}/${p.maxhp} (${Math.round(100 * p.hp / p.maxhp)}%)`);
}

module.exports = { battle };
