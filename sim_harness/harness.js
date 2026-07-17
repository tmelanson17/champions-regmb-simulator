'use strict';

const { Battle, BattleStream, Teams } = require('pokemon-showdown');

/**
 * Builds a fresh battle by sending the same '>start' / '>player' commands a
 * real PS server would (this is what resolves the format, validates teams,
 * and runs team preview), then hands back the underlying Battle object for
 * direct, in-process control instead of continuing to talk to it over text.
 *
 * `players` maps side id ('p1', 'p2', ...) to { name, team } where `team`
 * is Showdown export-format text (the same format as data/team1.txt).
 */
function createBattle(formatid, players) {
  const stream = new BattleStream();
  stream.write(`>start ${JSON.stringify({ formatid })}`);
  for (const [slot, { name, team }] of Object.entries(players)) {
    const packed = Teams.pack(Teams.import(team));
    stream.write(`>player ${slot} ${JSON.stringify({ name, team: packed })}`);
  }
  return stream.battle;
}

/** Deep-clones the full battle state (field, sides, PRNG, queue, ...) into a plain object. */
function snapshot(battle) {
  return battle.toJSON();
}

/**
 * Rebuilds an independent, continuable Battle from a snapshot taken by
 * `snapshot()`. The clone shares no mutable state with the battle it came
 * from, so playing one branch forward never affects any other branch (or
 * the original) taken from the same snapshot.
 */
function fork(snapshotObj) {
  const battle = Battle.fromJSON(snapshotObj);
  // restart() just re-attaches a send callback; we read state directly off
  // the battle object rather than parsing the text protocol, so a no-op sink
  // is enough here.
  battle.restart(() => {});
  return battle;
}

/**
 * Advances one decision point. `choices` maps side id to a choice string
 * ('move 1', 'move 2 terastallize', 'team 1234', ...); any side not listed
 * defaults to 'auto', PS's own legal-choice autopicker.
 */
function step(battle, choices = {}) {
  const inputs = battle.sides.map(side => choices[side.id] || 'auto');
  battle.makeChoices(...inputs);
}

/**
 * Plays until the battle ends or `stopWhen(battle)` returns true (checked
 * before each step, so it can land exactly on a pending decision point).
 * `choicesForTurn(battle)` is called before each step and may return a
 * per-side choices map, e.g. to inject one specific move on one turn only.
 */
function runUntil(battle, stopWhen, choicesForTurn = () => ({})) {
  while (!battle.ended && !stopWhen(battle)) {
    step(battle, choicesForTurn(battle));
  }
  return battle;
}

module.exports = { createBattle, snapshot, fork, step, runUntil };
