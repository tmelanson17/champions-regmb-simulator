'use strict';

// No wrapper: the sim's own Pokemon/Field/Battle objects already are the
// data this project tracks, and they stay live as the battle continues (a
// projected copy would go stale the moment another step() runs). Read them
// directly off the battle:
//
//   pokemon.hp, pokemon.maxhp        HP
//   pokemon.fainted                  true once HP hits 0
//   pokemon.status                   '' | 'brn' | 'par' | 'slp' | 'frz' | 'psn' | 'tox'
//   pokemon.isActive                 on the field right now
//   pokemon.boosts                   { atk, def, spa, spd, spe, accuracy, evasion }, -6..6
//   pokemon.moveSlots                [{ id, move, pp, maxpp, disabled, ... }]
//   battle.field.weather              ID string, '' if none
//   battle.field.terrain               ID string, '' if none
//   battle.field.pseudoWeather          { [id]: EffectState }; Trick Room is 'trickroom'
//
// The one field with no engine equivalent is `confirmed` -- the real
// simulator always has perfect information about both teams, so it has no
// notion of "not yet confirmed brought". That only matters when
// reconstructing from a replay that only confirms leads and later
// switch-ins (see construct_scene.js). markConfirmed() below sets it
// directly on the live Pokemon objects, same as any other field.

/**
 * Sets `pokemon.confirmed` directly on every Pokemon in `battle`, true
 * unless its species is named in `unconfirmedSpecies[sideId]`. Call again
 * whenever new information is revealed (e.g. a switch-in) to flip one back
 * to true.
 */
function markConfirmed(battle, unconfirmedSpecies = {}) {
  for (const side of battle.sides) {
    const unconfirmed = unconfirmedSpecies[side.id] || new Set();
    for (const pokemon of side.pokemon) {
      pokemon.confirmed = !unconfirmed.has(pokemon.species.name);
    }
  }
  return battle;
}

module.exports = { markConfirmed };

// Demo: build the same turn-3 scene as construct_scene.js, mark the
// placeholder bench mons unconfirmed, then read the state straight off the
// live objects -- no snapshot/wrapper involved.
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

  markConfirmed(battle, {
    p1: new Set(['Scrafty', 'Toxapex']), // leads (Chandelure, Sneasler) unlisted -> confirmed
    p2: new Set(['Scovillain']), // leads + Milotic (confirmed switch-in) unlisted -> confirmed
  });

  console.log(`turn ${battle.turn}`);
  console.log('field:', battle.field.weather || '(no weather)', battle.field.terrain || '(no terrain)',
    'trickroom' in battle.field.pseudoWeather ? 'trick room active' : '(no trick room)');
  for (const side of battle.sides) {
    console.log(`--- ${side.id} ---`);
    for (const p of side.pokemon) {
      const status = p.fainted ? 'FAINTED' : (p.status || 'NONE');
      console.log(
        `${p.species.name}: active=${p.isActive} confirmed=${p.confirmed} status=${status} ` +
        `hp=${p.hp}/${p.maxhp} boosts=${JSON.stringify(p.boosts)}`
      );
      for (const m of p.moveSlots) console.log(`  ${m.move}: ${m.pp}/${m.maxpp} pp (${m.maxpp - m.pp} used)`);
    }
  }
}
