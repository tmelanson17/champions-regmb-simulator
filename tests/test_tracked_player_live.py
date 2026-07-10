import asyncio
import socket
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from poke_env.player import RandomPlayer

from tracked_player import TrackedPlayer

BATTLE_FORMAT = "gen9championsvgc2026regmb"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
N_BATTLES = 3


def _server_reachable(host="localhost", port=8000, timeout=1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def leaves(node):
    if not node.children:
        return [node]
    result = []
    for child in node.children:
        result.extend(leaves(child))
    return result


@unittest.skipUnless(
    _server_reachable(), "Local Pokemon Showdown server not reachable on :8000"
)
class TrackedPlayerLiveTest(unittest.TestCase):
    def test_tracked_player_records_real_battles_against_random_player(self):
        team1 = (DATA_DIR / "team1.txt").read_text()
        team2 = (DATA_DIR / "team2.txt").read_text()

        player_1 = TrackedPlayer(
            battle_format=BATTLE_FORMAT,
            team=team1,
            max_concurrent_battles=1,
            accept_open_team_sheet=True,
        )
        player_2 = RandomPlayer(
            battle_format=BATTLE_FORMAT,
            team=team2,
            max_concurrent_battles=1,
            accept_open_team_sheet=True,
        )

        asyncio.run(player_1.battle_against(player_2, n_battles=N_BATTLES))

        self.assertEqual(player_1.n_finished_battles, N_BATTLES)

        leaf_nodes = leaves(player_1.battle_tracker.root)
        self.assertEqual(len(leaf_nodes), N_BATTLES)

        for leaf in leaf_nodes:
            self.assertTrue(leaf.is_terminal)
            self.assertIsNotNone(leaf.is_loss)
            # Every recorded move should be a genuine order taken in-game,
            # not a placeholder value.
            self.assertTrue(leaf.move.startswith("/choose"))

        expected_n_losses = sum(1 for b in player_1.battles.values() if b.lost)
        actual_n_losses = sum(1 for leaf in leaf_nodes if leaf.is_loss)
        self.assertEqual(expected_n_losses, actual_n_losses)


if __name__ == "__main__":
    unittest.main()
