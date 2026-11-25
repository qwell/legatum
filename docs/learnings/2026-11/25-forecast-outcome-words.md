# The attack forecast leads with the outcome in words (2026-11-25)

A first-time player read the old card as noise: a red "Risky" verdict over "0% destroy it / 0% lose your unit", big strength numbers with no label, and "Rolls 80–120%". "Risky" meant "nobody dies and you take more damage", which no first-time player can decode, and the 0% row read as contradicting it.

The card now opens with `forecastHeadline` (app/src/ui/ForecastCard.tsx): a title ("Both units survive", "You will likely destroy the Archer", "Your Horseman could be destroyed", "Lugano holds this turn") and one line saying who takes more damage, with both HP numbers taken from the same before/after values the HP bars show. The odds row is hidden when both chances are 0, the strength numbers carry a "Strength" label, and the "Risky:" prefix is gone from the loss warning, which is also dropped when the headline already names the loss. `verdict` stays in the model (data-verdict) for tests.

The same player could not read the HP bars either: green and red did not say "health left" and "health lost", and "HP" meant nothing. Each side now says "Health 100 → 63" with "−37 health" in red, the headline says "health" instead of "HP", and a likely loss shows "→ lost" instead of an average that reads as surviving.

Gotchas found on the way:
- Multi-human fixture saves (p881, walls) now open the online host screen on Continue, so the e2e specs that use them stop at the title screen; a one-human fixture (others `is_human: false` in the setup, before `createState`) opens straight into the game. Flipping `isHuman` after `createState` makes the save unreadable.
- In this cloud container wasm-pack cannot download binaryen: build the engine with `LEGATUM_WASM_NO_OPT=1`, and point Playwright at `/opt/pw-browsers/chromium`.
- The 3D map has no attack forecast at all yet (it shows only hover and route); the UI skill already requires one before 3D becomes the default.
