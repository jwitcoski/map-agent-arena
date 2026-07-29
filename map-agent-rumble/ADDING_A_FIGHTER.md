# Adding a fighter (platform seat)

The rumble is **registry-driven**. Follow **[AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md)** for every seat: **find agent → install → run → link**.

## Roster

See `fighters.json` (includes CARTO). Pending seats stay `ready: false` until keys + agent-linked packs exist.

## 1. Find & install the agent

1. Locate the vendor Agent Skills repo (table in `AGENT_WORKFLOW.md` / `agents.json`).
2. Install into this repo: `npx skills add <org/repo> -a cursor` (or `scripts/install-agents.ps1`).
3. Confirm files under `.agents/skills/`.

## 2. Register the seat

Edit `fighters.json` and append an object:

| Field | Purpose |
|-------|---------|
| `id` | Folder name under `fighters/<id>/` (kebab-case) |
| `rank` | Optional top-N order for the UI |
| `label` / `color` | UI name + accent |
| `agent.url` / `agent.install` / `agent.localPath` | **Required link** to the agent skills pack |
| `skillsetUrl` | Usually same as `agent.url` (shown in the UI) |
| `strength` / `apis` / `agentTestFit` | Why this platform is in the roster |
| `sdk` / `sdkPin` / `configKey` | What the agent should use |
| `ready` | `false` until keys + packs exist (shows **pending**, not F) |
| `status` | `active` \| `awaiting-api` |
| `checkProfile` | Usually same as `id` (catalog check key) |
| `adapterPrompt` | SDK-specific instructions shown in the agent brief |
| `capabilities` | Gates Navigation skills (`directions`, `geocoding`, `terrain`, `isochrone`) |
| `run` | Cursor/model/token attribution once the seat is live (`skillUsed`, `skillPack`) |

Flip `ready: true` when packs ship.

## 3. Run the agent & scaffold packs

With the vendor skill loaded, author imperfect skill-agent solutions, then:

```bash
node map-agent-rumble/_generate_packs.js
```

- Fighters **without** hand-written pack functions get honest **awaiting API** HTML automatically.
- Pack HTML must include the agent comment stamped by the generator (`<!-- Agent skills: … -->`).

## 4. Wire grading checks

In `challenges/catalog.json`, each skill has `checks.<fighterId>: [...]`.

- Pending: `["awaiting_api"]` (or omit — `RumbleChecks.resolveCheckIds` falls back when `ready: false`).
- Live: SDK checks (`uses_google`, `uses_esri`, `uses_azure`, `uses_stadia`, …) + shared behavior checks.

Add new check functions in `challenges/checks.js` (`CHECK_LABELS` + `CHECK_WHY` too).

## 5. Keys & activate

1. Inject the platform key via site `admin-boundaries/js/config.js` (never hardcode in packs).
2. Set `ready: true`, fill `run.model` / `inputBaseTokens` / `skillPack` / `agent.*`.
3. Re-run the generator, open the rumble, hit **Grade visible**.

## Resolve order (grading)

`skill.checks[fighter.id]` → `skill.checks[fighter.checkProfile]` → `["awaiting_api"]` if `!ready` → `skill.checks.shared` → none.

## Capability fairness

If a skill lists `"requires": ["directions"]` and the fighter’s `capabilities.directions` is `false`, the cell is **N/A** (not F).
