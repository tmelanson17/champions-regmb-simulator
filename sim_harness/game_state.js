'use strict';

// A plain-old-data snapshot of battle state, curated to exactly the fields
// this project tracks (active / confirmed / status / HP / moves+PP / boosts
// per Pokemon, plus weather/terrain/Trick Room for the field).
//
// Checked the sim first: there's no dedicated struct with these exact
// fields, but Battle.toJSON() (sim/state.ts's State.serializeBattle) already
// plain-object-serializes essentially all of it -- pokemon.hp/maxhp/status/
// fainted/isActive/boosts/moveSlots (with pp/maxpp), field.weather/terrain/
// pseudoWeather (Trick Room lives there, keyed 'trickroom'). That's the
// closest built-in analog, but it's the *full* internal engine state (PRNG
// seed, action queue, per-effect internal EffectState objects, etc.), not a
// clean view -- so this module is a thin projection on top of the live
// Pokemon/Field objects (sim/pokemon.ts, sim/field.ts), not a re-derivation.
//
// One field has no engine equivalent at all: `confirmed`. The real
// simulator always has perfect information about every Pokemon on both
// teams -- it has no notion of "not yet confirmed brought". That concept
// only exists here because construct_scene.js / state_from_replay_turn.js
// have to guess at the un-revealed half of each side's brought-4 when
// reconstructing from a replay that only confirms leads and later switch-ins.

const STATUS_NONE = 'NONE';
const STATUS_FAINTED = 'FAINTED';

/**
 * `isConfirmed(pokemon)` decides the `confirmed` field; defaults to "always
 * confirmed", which is correct for any battle this harness built itself
 * (full team knowledge) and wrong only for replay-reconstructed scenes,
 * where the caller should pass a real confirmation check.
 */
function pokemonState(pokemon, { isConfirmed = () => true } = {}) {
  return {
    species: pokemon.species.name,
    active: pokemon.isActive,
    confirmed: isConfirmed(pokemon),
    status: pokemon.fainted ? STATUS_FAINTED : (pokemon.status ? pokemon.status : STATUS_NONE),
    hp: pokemon.hp,
    maxhp: pokemon.maxhp,
    moves: pokemon.moveSlots.map(slot => ({
      id: slot.id,
      name: slot.move,
      pp: slot.pp,
      maxpp: slot.maxpp,
      uses: slot.maxpp - slot.pp,
    })),
    boosts: { ...pokemon.boosts },
  };
}

function fieldState(field) {
  return {
    weather: field.weather || null,
    terrain: field.terrain || null,
    trickRoom: 'trickroom' in field.pseudoWeather,
    pseudoWeather: Object.keys(field.pseudoWeather),
  };
}

/**
 * `isConfirmed` maps side id -> (pokemon) => boolean. Any side omitted
 * defaults to "always confirmed".
 */
function battleState(battle, { isConfirmed = {} } = {}) {
  return {
    turn: battle.turn,
    field: fieldState(battle.field),
    sides: battle.sides.map(side => ({
      id: side.id,
      pokemon: side.pokemon.map(p => pokemonState(p, { isConfirmed: isConfirmed[side.id] })),
    })),
  };
}

module.exports = { pokemonState, fieldState, battleState, STATUS_NONE, STATUS_FAINTED };

// Demo: build the same turn-3 scene as construct_scene.js and print its POD
// state, with confirmed flags reflecting what the replay actually revealed
// (leads + Milotic's switch-in) vs. the guessed placeholder bench mons.
//
// Run with: node game_state.js path/to/replay.html
if (require.main === module) {
  const fs = require('fs');
  const { reconstructTeamsFromReplay } = require('./replay_team');
  const { createBattle, step, setHpPercent, switchActive, refreshRequest } = require('./harness');

  const replayPath = process.argv[2];
  if (!replayPath) {
    console.error('Usage: node game_state.js path/to/replay.html');
    process.exit(1);
  }

  const teams = reconstructTeamsFromReplay(fs.readFileSync(replayPath, 'utf8'));
  const battle = createBattle('gen9championsvgc2026regmb', {
    p1: { name: 'P1', team: teams.p1 },
    p2: { name: 'P2', team: teams.p2 },
  });
  step(battle, { p1: 'team 4612', p2: 'team 4612' });

  const bySpecies = (side, species) => side.pokemon.find(p => p.species.name === species);
  switchActive(bySpecies(battle.sides[1], 'Milotic'), 1);
  setHpPercent(bySpecies(battle.sides[1], 'Gholdengo'), 27);
  setHpPercent(bySpecies(battle.sides[1], 'Milotic'), 85);
  setHpPercent(bySpecies(battle.sides[0], 'Sneasler'), 90);
  battle.turn = 3;
  refreshRequest(battle);

  const revealed = {
    p1: new Set(['Chandelure', 'Sneasler']), // leads only; bench 2 unconfirmed
    p2: new Set(['Gholdengo', 'Hydreigon', 'Milotic']), // leads + confirmed switch-in
  };
  const isConfirmed = {
    p1: p => revealed.p1.has(p.species.name),
    p2: p => revealed.p2.has(p.species.name),
  };

  console.log(JSON.stringify(battleState(battle, { isConfirmed }), null, 2));
}
