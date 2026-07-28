# Adding a fighter (platform seat)

The rumble is **registry-driven**. The primary roster is a **top-10** agent-eval set:

| # | Platform | Strength |
|---|----------|----------|
| 1 | Google Maps Platform | POI quality, global coverage |
| 2 | Mapbox | Custom styling, DX |
| 3 | Esri (ArcGIS) | Enterprise GIS, spatial analysis |
| 4 | HERE Maps | Fleet, logistics, offline |
| 5 | Azure Maps | Microsoft / enterprise cloud |
| 6 | AWS Location Service | AWS-native, cost control |
| 7 | TomTom | Nav, traffic, truck |
| 8 | MapTiler | OSM-friendly, self-hostable |
| 9 | Stadia Maps | Cost-effective OSM tiles |
| 10 | OSM · MapLibre | Full control, open data (No Agent baseline) |

## 1. Register the seat

Edit `fighters.json` and append an object:

| Field | Purpose |
|-------|---------|
| `id` | Folder name under `fighters/<id>/` (kebab-case) |
| `rank` | Optional top-N order for the UI |
| `label` / `color` | UI name + accent |
| `strength` / `apis` / `agentTestFit` | Why this platform is in the roster |
| `sdk` / `sdkPin` / `configKey` | What the agent should use |
| `ready` | `false` until keys + packs exist (shows **pending**, not F) |
| `status` | `active` \| `awaiting-api` |
| `checkProfile` | Usually same as `id` (catalog check key) |
| `adapterPrompt` | SDK-specific instructions shown in the agent brief |
| `capabilities` | Gates Navigation skills (`directions`, `geocoding`, `terrain`, `isochrone`) |
| `run` | Cursor/model/token attribution once the seat is live |

Flip `ready: true` when packs ship.

## 2. Scaffold packs

```bash
node HTML/public/map-agent-rumble/_generate_packs.js
```

- Fighters **without** hand-written pack functions get honest **awaiting API** HTML automatically.
- When ready, add real solutions in `_generate_packs.js` (or drop HTML into `fighters/<id>/`) and re-run.

## 3. Wire grading checks

In `challenges/catalog.json`, each skill has `checks.<fighterId>: [...]`.

- Pending: `["awaiting_api"]` (or omit — `RumbleChecks.resolveCheckIds` falls back when `ready: false`).
- Live: SDK checks (`uses_google`, `uses_esri`, `uses_azure`, `uses_stadia`, …) + shared behavior checks.

Add new check functions in `challenges/checks.js` (`CHECK_LABELS` + `CHECK_WHY` too).

## 4. Keys & playground hub

1. Inject the platform key via site `admin-boundaries/js/config.js` (never hardcode in packs).
2. Link a playground hub card to `/map-agent-rumble/`.
3. Optional: vendor skillset grader URL on the fighter (`skillsetUrl`).

## 5. Activate

1. Set `ready: true`, fill `run.model` / `inputBaseTokens` / `skillPack`.
2. Replace awaiting placeholders with imperfect skill-agent packs.
3. Re-run the generator, open the rumble, hit **Grade visible**.

## Resolve order (grading)

`skill.checks[fighter.id]` → `skill.checks[fighter.checkProfile]` → `["awaiting_api"]` if `!ready` → `skill.checks.shared` → none.

## Capability fairness

If a skill lists `"requires": ["directions"]` and the fighter’s `capabilities.directions` is `false`, the cell is **N/A** (not F).
