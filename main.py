import argparse
import asyncio
from pathlib import Path

from poke_env.player import RandomPlayer

BATTLE_FORMAT = "gen9championsvgc2026regmb"
DATA_DIR = Path(__file__).parent / "data"


def parse_args():
    parser = argparse.ArgumentParser(description="Battle two RandomPlayers in Champions VGC 2026 Reg M-B.")
    parser.add_argument(
        "-n",
        "--num-simulations",
        type=int,
        default=1,
        help="Number of battles to simulate (default: 1)",
    )
    return parser.parse_args()


async def main(n_battles: int):
    team1 = (DATA_DIR / "team1.txt").read_text()
    team2 = (DATA_DIR / "team2.txt").read_text()

    player_1 = RandomPlayer(
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

    await player_1.battle_against(player_2, n_battles=n_battles)

    print(f"Finished battles: {player_1.n_finished_battles}")
    print(f"Player 1 wins: {player_1.n_won_battles}")


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(main(args.num_simulations))
