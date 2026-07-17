'use strict';

// Demonstrates the core trick: snapshot a battle mid-fight, then fork it
// into several independent battles that each try a different move from that
// exact shared state, without re-simulating team preview or earlier turns.
//
// Run with: node fork_demo.js

const fs = require('fs');
const path = require('path');
const { createBattle, snapshot, fork, runUntil } = require('./harness');

const FORMAT = 'gen9championsvgc2026regmb';
const DATA_DIR = path.join(__dirname, '..', 'data');
const SHARED_TURNS = 3;

function loadTeam(file) {
  return fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
}

function describe(battle) {
  if (!battle.ended) return `turn ${battle.turn}, in progress`;
  if (!battle.winner) return `turn ${battle.turn}, tie`;
  return `turn ${battle.turn}, winner: ${battle.winner}`;
}

const trunk = createBattle(FORMAT, {
  p1: { name: 'Trunk P1', team: loadTeam('team1.txt') },
  p2: { name: 'Trunk P2', team: loadTeam('team2.txt') },
});

// Play team preview plus a few turns of default ('auto') choices on both
// sides. This is the shared prefix every branch below will fork from.
runUntil(trunk, battle => battle.turn >= SHARED_TURNS);
console.log(`Trunk: ${describe(trunk)}`);

// Builds a full doubles choice string for p1's first active Pokemon using
// move slot `slot` (1-based), auto-targeting the first foe if the move
// needs a target, and leaving the second active Pokemon on 'default'.
function firstMonMoveChoice(battle, slot) {
  const move = battle.sides[0].activeRequest.active[0].moves[slot - 1];
  const needsTarget = move.target === 'normal';
  return `move ${slot}${needsTarget ? ' 1' : ''}, default`;
}

const trunkState = snapshot(trunk);

for (const slot of [1, 2]) {
  const branch = fork(trunkState);
  const p1Choice = firstMonMoveChoice(branch, slot);
  let firstStep = true;

  runUntil(
    branch,
    battle => battle.ended,
    () => {
      if (firstStep) {
        firstStep = false;
        return { p1: p1Choice };
      }
      return {};
    }
  );

  console.log(`Branch p1="${p1Choice}": ${describe(branch)}`);
}

console.log(`\nTrunk after forking: ${describe(trunk)} (unchanged by either branch)`);
