from typing import Set

from poke_env.battle.abstract_battle import AbstractBattle
from poke_env.player import Player
from poke_env.player.battle_order import BattleOrder

from battle_tracker import BattleTracker


class TrackedPlayer(Player):
    """A RandomPlayer that records its action history into a BattleTracker."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.battle_tracker = BattleTracker()
        self._tracked_tags: Set[str] = set()

    def choose_move(self, battle: AbstractBattle) -> BattleOrder:
        if battle.battle_tag not in self._tracked_tags:
            self.battle_tracker.create_battle(battle.battle_tag)
            self._tracked_tags.add(battle.battle_tag)
        order = self.choose_random_move(battle)
        self.battle_tracker.update_battle(battle.battle_tag, order.message)
        return order

    def _battle_finished_callback(self, battle: AbstractBattle) -> None:
        self.battle_tracker.stop_battle(battle.battle_tag, bool(battle.lost))
        self._tracked_tags.discard(battle.battle_tag)
