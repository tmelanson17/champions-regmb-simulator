'use strict';

const fs = require('fs');
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

function escapeHtml(text) {
  return String(text).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/**
 * Renders `battle.log` (the same '|'-prefixed protocol PS replays are made
 * of) into the same standalone HTML wrapper PS's own "Download replay"
 * produces. Opening the result in a browser (with internet access, since it
 * loads PS's replay-embed.js from their CDN to actually render/animate it)
 * shows the simulated battle exactly like a real replay page.
 */
function replayHtml(battle, { title = 'Simulated battle' } = {}) {
  const p1 = (battle.p1 && battle.p1.name) || 'p1';
  const p2 = (battle.p2 && battle.p2.name) || 'p2';
  // PS escapes every '/' in the embedded log so nothing inside it can ever
  // be misread as a literal '</script>' closing the tag early.
  const logText = battle.log.join('\n').replace(/\//g, '\\/');

  return `<!DOCTYPE html>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<div class="wrapper replay-wrapper" style="max-width:1180px;margin:0 auto">
<input type="hidden" name="replayid" value="" />
<div class="battle"></div><div class="battle-log"></div><div class="replay-controls"></div><div class="replay-controls-2"></div>
<h1 style="font-weight:normal;text-align:center"><strong>${escapeHtml(title)}</strong><br />${escapeHtml(p1)} vs. ${escapeHtml(p2)}</h1>
<script type="text/plain" class="battle-log-data">${logText}</script>
</div>
<script>
let daily = Math.floor(Date.now()/1000/60/60/24);document.write('<script src="https://play.pokemonshowdown.com/js/replay-embed.js?version'+daily+'"></'+'script>');
</script>
`;
}

/** Writes replayHtml(battle, options) to outputPath and returns outputPath. */
function writeReplayHtml(battle, outputPath, options) {
  fs.writeFileSync(outputPath, replayHtml(battle, options));
  return outputPath;
}

module.exports = { createBattle, snapshot, fork, step, runUntil, replayHtml, writeReplayHtml };
