# champions-regmb-battle

Battles two [poke-env](https://github.com/hsahovic/poke-env) `RandomPlayer` agents
against each other in the `[Gen 9 Champions] VGC 2026 Reg M-B` format
(`gen9championsvgc2026regmb`), with each side's team loaded from a Pokepaste text
file in `data/`.

## Prerequisites

- Python >= 3.10
- Node.js and npm
- A local Pokemon Showdown server (see below) — this project does **not** use the
  public Smogon server

## 1. Set up the Pokemon Showdown server

Clone and build the server:

```bash
git clone https://github.com/smogon/pokemon-showdown.git
cd pokemon-showdown
npm install
cp config/config-example.js config/config.js
```

The `[Gen 9 Champions]` formats (including Reg M-B) are only available in recent
versions of the server. If you already have a clone, make sure it's up to date:

```bash
git pull origin master
npm install
npm run build
```

Start the server with rate limiting disabled (recommended for local
training/testing):

```bash
node pokemon-showdown start --no-security
```

Leave this running — it listens on `ws://localhost:8000/showdown/websocket` by
default, which is what poke-env connects to.

## 2. Set up this project

In a separate terminal, from this repo's root:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 3. Run a battle

With the Showdown server still running:

```bash
python main.py
```

Run more than one battle with `-n`/`--num-simulations`:

```bash
python main.py --num-simulations 10
```

Output reports how many battles finished and how many Player 1 won, e.g.:

```
Finished battles: 10
Player 1 wins: 4
```

## Teams

`data/team1.txt` and `data/team2.txt` each contain a Pokepaste-format team (the
same "Showdown export" text you'd get from https://pokepast.es). Edit these files
to try different teams — they're validated against the `gen9championsvgc2026regmb`
ruleset when the battle starts.
