# Advisor: routine pointers wear out; advice does not (2026-11-25)

Playtest feedback from a new player in co-op: she liked the advisor's suggestions but not being shown where to move a unit every turn. The useful split is control lessons versus advice. Moving, Fortify, Skip, Auto-explore, End turn and Close Research teach a control, so they stop after the player has done each on 3 different turns. Builds, research, Settler moves, Found City and attacks carry the Hard plan's judgement, so they keep showing.

Practice counts what the player does (their own valid orders, a turn ending, closing Research after choosing), not what the card showed, so a player who already knows a control never sees it often. It is stored with the advisor preference in localStorage, so it is per browser: each online player has their own. Counts are capped at the threshold and deduplicated per turn.
