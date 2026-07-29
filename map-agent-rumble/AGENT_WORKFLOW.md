# Agent workflow (find → install → run → link)

Every rumble seat must follow this loop. Hand-authored packs without an agent link are a process miss.

## 1. Find the agent

Search for the vendor’s **Agent Skills** (or MCP) pack:

| Vendor | Official skills |
|--------|-----------------|
| Google | [googlemaps/agent-skills](https://github.com/googlemaps/agent-skills) |
| Mapbox | [mapbox/mapbox-agent-skills](https://github.com/mapbox/mapbox-agent-skills) · [docs](https://docs.mapbox.com/api/guides/mapbox-agent-skills/) |
| MapTiler | [maptiler/maptiler-skills](https://github.com/maptiler/maptiler-skills) |
| Azure Maps | [MicrosoftDocs/Agent-Skills → azure-maps](https://github.com/MicrosoftDocs/Agent-Skills/tree/main/skills/azure-maps) |
| AWS Location | [cline/skills → amazon-location-service](https://github.com/cline/skills/tree/main/skills/amazon-location-service) |
| CARTO | [CartoDB/agent-skills](https://github.com/CartoDB/agent-skills) · [docs](https://docs.carto.com/carto-for-agents/agent-skills) |
| TomTom / Stadia / Esri / HERE | No public Agent Skills pack found yet — document `agent.status: none-official` and use vendor docs until one ships |

Canonical registry copy: [`agents.json`](./agents.json) + each fighter’s `agent` object in [`fighters.json`](./fighters.json).

## 2. Install the agent

From the **map-agent-arena** repo root (project-scoped Cursor skills):

```bash
# All known packs (also scripted in scripts/install-agents.ps1)
npx skills add mapbox/mapbox-agent-skills -a cursor
npx skills add maptiler/maptiler-skills -a cursor
npx skills add googlemaps/agent-skills -a cursor
npx skills add CartoDB/agent-skills -a cursor
npx skills add MicrosoftDocs/Agent-Skills --skill azure-maps -a cursor
npx skills add cline/skills --skill amazon-location-service -a cursor
```

Skills land under `.agents/skills/`. Commit them so CI/Pages and other machines share the same skill context.

## 3. Run the agent

With the vendor skill loaded in Cursor Agent:

1. Open the skill brief (`adapterPrompt` + skill catalog prompt for `S01`…`M02`).
2. Ask the agent to implement the imperfect skill-agent pack for that fighter (intentional gaps OK — this is a rumble, not gold).
3. Drop / regenerate HTML under `fighters/<id>/` via `node map-agent-rumble/_generate_packs.js` after wiring `_vendor_packs.js`.
4. Set `ready: true`, `run.skillUsed: true`, `run.skillPack`, and `agent.url` / `agent.install`.

**No Agent** seat: skip install — that is the open OSM baseline (`agent.status: baseline`).

## 4. Link the agent in the code

Required links:

1. `fighters.json` → `agent.url`, `agent.install`, `agent.localPath`, `skillsetUrl`
2. Generated HTML → HTML comment under `<title>`:
   `<!-- Agent skills: https://github.com/... | install: npx skills add ... | local: .agents/skills/... -->`
3. Pack module header (e.g. `_carto_packs.js`) → comment with the same URL
4. Rumble UI → “agent skills” link on each cell (`skillsetUrl`)

## Activate checklist

- [ ] Found agent (or documented none-official)
- [ ] Installed into `.agents/skills`
- [ ] Ran Cursor Agent with that skill to produce / refine packs
- [ ] Linked URL in fighters.json + HTML comment + pack header
- [ ] Secrets in GitHub Actions → `config.js`
- [ ] `node map-agent-rumble/_generate_packs.js` + push
