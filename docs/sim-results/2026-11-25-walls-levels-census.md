# Walls levels (rules 58): faction census before and after (2026-11-25)

PR #137. Published as measured, no tuning.

## Setup

- BASE = master ea0288fb (rules 57). WALLS2 = branch commit 38b1615a (rules 58 plus the AI pricing rival cities net of the Walls levels its Siege covers).
- Same design as `2026-11-22-census-eleven-factions-rules50.md`: 8 empires, all Hard, medium map, `--rotate-factions` over the 11 cyclic rosters of the faction order Switzerland, India, Byzantium, Germany, Celts, Mongols, Sparta, Athens, Aztecs, Egypt, Rome; 96 games per roster, seed bases 9311003 and 9411003 (+100000 per roster). 2,112 games per arm, identical seeds; every faction played 1,536 seats. 0 panics.
- Run on 4 AWS spot servers (`tools/cloud/run-batch.sh`), about 3 minutes of games per arm. Raw JSON not committed.

## Win rate per seat (95% Wilson interval)

| Faction | BASE | WALLS2 | Change |
| --- | --- | --- | --- |
| Egypt | 22.6% (20.6–24.7) | 18.6% (16.7–20.6) | −4.0 pp |
| Athens | 13.8% (12.2–15.6) | 16.0% (14.2–17.9) | +2.1 |
| Germany | 16.0% (14.3–17.9) | 15.8% (14.0–17.7) | −0.3 |
| Aztecs | 14.2% (12.5–16.0) | 14.8% (13.1–16.6) | +0.6 |
| Celts | 12.2% (10.7–14.0) | 13.4% (11.8–15.2) | +1.2 |
| Sparta | 13.7% (12.0–15.5) | 12.9% (11.3–14.7) | −0.8 |
| Switzerland | 9.4% (8.1–11.0) | 10.5% (9.1–12.2) | +1.1 |
| India | 9.5% (8.1–11.1) | 10.5% (9.0–12.1) | +1.0 |
| Mongols | 10.9% (9.5–12.6) | 9.6% (8.2–11.1) | −1.4 |
| Byzantium | 9.3% (8.0–10.9) | 9.3% (8.0–10.9) | 0.0 |
| Rome | 5.7% (4.7–7.0) | 6.2% (5.1–7.6) | +0.5 |

Best/worst (Egypt over Rome in both): 3.94 → 2.97. Pillar 8's 1.5x is still not met. Egypt's drop is the only change whose intervals do not overlap.

## Pace, endings and conquest

| Metric | BASE | WALLS2 |
| --- | --- | --- |
| End turn, median (mean) | 217 (221.9) | 218 (222.0) |
| Ended by VP hold / capitals / stalled | 99.1% / 0.9% / 1 game | 99.1% / 0.9% / 0 |
| City captures per game | 21.90 | 21.48 |
| Captures before turn 60 per game | 2.45 | 2.45 |
| Median turn of the first capture | 26 | 26 |

Early rush is unchanged (level I is unchanged, as intended; `walls-and-early-rush`), and conquest overall is about the same in AI-vs-AI play.

## Two-player Hard duels (64 games, `--players 2 --difficulty hard --seed 1`)

| | BASE | WALLS2 |
| --- | --- | --- |
| Stalls (safety cap) | 1 | 0 (longest 347 turns) |
| End turn, median (mean) | 205.5 (237.6) | 209 (212.5) |
| Endings | capitals 46, VP 16, elimination 1, stalled 1 | capitals 48, VP 15, elimination 1 |
| City captures per game | 4.16 | 4.84 |

An earlier Walls build without the AI pricing fix (d572a011) stalled one duel (seed 14, Sparta vs Switzerland): the Hard AI priced late cities at their full Walls level and never declared war. Its 8-player census read 2.96 best/worst, Egypt 17.7%, no stalls.
