from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class TurnNode:
    move: Optional[str] = None
    parent: Optional["TurnNode"] = None
    children: List["TurnNode"] = field(default_factory=list)
    is_terminal: bool = False
    is_loss: Optional[bool] = None
    score: float = 0.0  # Heuristic score for this game state. Calculation TBD.

    def child_for_move(self, move: str) -> Optional["TurnNode"]:
        for child in self.children:
            if child.move == move and not child.is_terminal:
                return child
        return None


class BattleTracker:
    """Tracks Player 1's actions across battles as a shared tree of TurnNodes.

    Battles that take the exact same sequence of actions share the same path
    through the tree; the path forks as soon as two battles' actions diverge.
    """

    def __init__(self) -> None:
        self.root = TurnNode()
        self._current: Dict[str, TurnNode] = {}

    def create_battle(self, tag: str) -> None:
        self._current[tag] = self.root

    def update_battle(self, tag: str, move: str) -> None:
        node = self._current[tag]
        child = node.child_for_move(move)
        if child is None:
            child = TurnNode(move=move, parent=node)
            node.children.append(child)
        self._current[tag] = child

    def stop_battle(self, tag: str, is_loss: bool) -> None:
        node = self._current[tag]
        node.is_terminal = True
        node.is_loss = is_loss
        del self._current[tag]
