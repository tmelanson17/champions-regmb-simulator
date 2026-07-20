'use strict';

// Reconstructs team text from a replay's Open Team Sheet reveal.
//
// `|showteam|PLAYER|<packed>` lines (present when the format uses open team
// sheets, like this project's) reveal species/item/ability/moves/nature/
// gender/level for every Pokemon -- but never EVs. This fills in EVs with a
// simple, explicit heuristic instead of guessing per Pokemon by hand.

const { Teams } = require('pokemon-showdown');

const NATURE_BOOST = {
  Adamant: 'atk', Bold: 'def', Brave: 'atk', Calm: 'spd', Careful: 'spd',
  Gentle: 'spd', Hasty: 'spe', Impish: 'def', Jolly: 'spe', Lax: 'def',
  Lonely: 'atk', Mild: 'spa', Modest: 'spa', Naive: 'spe', Naughty: 'atk',
  Quiet: 'spa', Rash: 'spa', Relaxed: 'def', Sassy: 'spd', Timid: 'spe',
};

// Species that get 32 HP regardless of nature (in addition to Bold/Calm).
const BULKY_HP_SPECIES = new Set(['Milotic', 'Gholdengo']);
// Species that get 32 SpA regardless of nature.
const SPA_INVESTED_SPECIES = new Set(['Hydreigon']);

/** Extracts { p1: PokemonSet[], p2: PokemonSet[] } from a raw replay log's text. */
function parseShowteams(logText) {
  const teams = {};
  for (const line of logText.split('\n')) {
    if (!line.startsWith('|showteam|')) continue;
    const [, , player, ...rest] = line.split('|');
    teams[player] = Teams.unpack(rest.join('|'));
  }
  return teams;
}

/** Fills in a PokemonSet's EVs per the project's default-spread heuristic. */
function applyDefaultEvs(set) {
  const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  const boosted = NATURE_BOOST[set.nature];
  if (boosted) evs[boosted] = Math.max(evs[boosted], 32);

  if (set.nature === 'Jolly') evs.atk = Math.max(evs.atk, 32);
  if (set.nature === 'Bold' || set.nature === 'Calm') evs.hp = Math.max(evs.hp, 32);
  if (BULKY_HP_SPECIES.has(set.species)) evs.hp = Math.max(evs.hp, 32);
  if (SPA_INVESTED_SPECIES.has(set.species)) evs.spa = Math.max(evs.spa, 32);

  set.evs = evs;
  return set;
}

/** Parses a replay log and returns { p1: exportText, p2: exportText }. */
function reconstructTeamsFromReplay(logText) {
  const teams = parseShowteams(logText);
  const out = {};
  for (const [player, sets] of Object.entries(teams)) {
    for (const set of sets) applyDefaultEvs(set);
    out[player] = Teams.export(sets);
  }
  return out;
}

module.exports = { parseShowteams, applyDefaultEvs, reconstructTeamsFromReplay, NATURE_BOOST };
