Before reading this, review the Player and RandomPlayer class in the poke env library.

I'd like to create a new Player child class, called TrackedPlayer, which adds a BattleTracker object. BattleTracker is the class used to keep track of all battles played, and will have as an object a tree of turn nodes, which are connected by the action taken. Otherwise, TrackedPlayer should behave no differently than a RandomPlayer.

BattleTracker's outward interface will have the following methods:
- create_battle(tag) : starts tracking a new battle with tag
- update_battle(tag, move): updates battle "tag" with new move "move". It should add a new TurnNode based on the move
- stop_battle(tag, is_loss) : cleans up temporary data for tracking to make room for new battles. is_loss is True if the player making the call lost. Internally, this method updates the most recent TurnNode as terminal, and updates is_loss based on the argument flag.

The tree will represent the series of actions taken (Player 1 only). In each TurnNode, there will be the following:
- is_terminal : True if the game has ended in this state
- is_loss : True if the player lost the game, False if the player won, and None if the game isn't over yet
- score : Heuristic score for the game state at this turn. It will determine if immediately getting a loss or going to a high-loss node is possible, but exact calculations TBD.

In order to test this, I'd like you to also create a test that plays the following (against a RandomPlayer):
- Playing X battles, but never taking the exact same pattern --> The resulting tree should have X total branches and X total leaf nodes, each with valid is_loss and is_terminal values
- Playing X battles, but always choosing the same pattern --> The resulting tree should have one branch, which ends in X leaf nodes, denoting each battle outcome.
