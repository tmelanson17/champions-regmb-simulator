import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from battle_tracker import BattleTracker


def leaves(node):
    if not node.children:
        return [node]
    result = []
    for child in node.children:
        result.extend(leaves(child))
    return result


class BattleTrackerTest(unittest.TestCase):
    def test_distinct_patterns_produce_x_branches_and_leaves(self):
        tracker = BattleTracker()
        n_battles = 5

        for i in range(n_battles):
            tag = f"battle-{i}"
            # Each battle's move sequence is unique from the very first move,
            # so no two battles should ever share a node.
            pattern = [f"move-{i}-{turn}" for turn in range(3)]
            tracker.create_battle(tag)
            for move in pattern:
                tracker.update_battle(tag, move)
            tracker.stop_battle(tag, is_loss=(i % 2 == 0))

        self.assertEqual(len(tracker.root.children), n_battles)

        leaf_nodes = leaves(tracker.root)
        self.assertEqual(len(leaf_nodes), n_battles)
        for leaf in leaf_nodes:
            self.assertTrue(leaf.is_terminal)
            self.assertIsNotNone(leaf.is_loss)

    def test_identical_pattern_produces_one_branch_then_x_leaves(self):
        tracker = BattleTracker()
        n_battles = 5
        shared_pattern = ["move-a", "move-b", "move-c"]

        for i in range(n_battles):
            tag = f"battle-{i}"
            tracker.create_battle(tag)
            for move in shared_pattern:
                tracker.update_battle(tag, move)
            tracker.stop_battle(tag, is_loss=(i % 2 == 0))

        # The shared prefix (all but the final move) never branches.
        node = tracker.root
        for _ in shared_pattern[:-1]:
            self.assertEqual(len(node.children), 1)
            node = node.children[0]

        # The final move forks into one terminal leaf per battle.
        self.assertEqual(len(node.children), n_battles)
        leaf_nodes = node.children
        self.assertEqual(len(leaves(tracker.root)), n_battles)
        for i, leaf in enumerate(leaf_nodes):
            self.assertTrue(leaf.is_terminal)
            self.assertEqual(leaf.move, shared_pattern[-1])
            self.assertEqual(leaf.is_loss, i % 2 == 0)


if __name__ == "__main__":
    unittest.main()
