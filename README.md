# Map Agent Arena

Standalone lab for grading and comparing map-agent skill packs:

- **[Royal Rumble](./map-agent-rumble/)** - top-10 vendor seats, shared skills, static rubrics
- **[Mapbox Agent Grader](./mapbox-playground/agent-grader.html)** - Mapbox GL JS skill scoreboard
- **[MapTiler Agent Grader](./maptiler-playground/agent-grader.html)** - MapTiler SDK skill scoreboard

This project was split out of [witcoskitech / cloud-resume-challenge](https://github.com/jwitcoski/cloud-resume-challenge-backend) so agent-eval demos are not on the personal homepage.

## Local setup

```bash
cp admin-boundaries/js/config.example.js admin-boundaries/js/config.js
# add MAPBOX_ACCESS_TOKEN, MAPTILER_API_KEY, GOOGLE_MAPS_API_KEY, AZURE_MAPS_SUBSCRIPTION_KEY
npx --yes serve .
```

Open `http://localhost:3000` (or the port `serve` prints).

## GitHub secrets (required for Pages)

**Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|-------------|--------|
| `MAPBOX_ACCESS_TOKEN` | your Mapbox public token (`pk.…`) |
| `MAPTILER_API_KEY` | your MapTiler API key |
| `GOOGLE_MAPS_API_KEY` | your Google Maps Platform key (Maps JS + Geocoding + Directions) |
| `AZURE_MAPS_SUBSCRIPTION_KEY` | Azure Maps primary or secondary shared key |

Optional later (pending seats):

| Secret name |
|--------------|
| `ARCGIS_API_KEY` |
| `HERE_API_KEY` |
| `TOMTOM_API_KEY` |
| `STADIA_API_KEY` |
| `AWS_LOCATION_API_KEY` |

Then: **Settings → Pages → Build and deployment → Source = GitHub Actions**, and run workflow **Deploy GitHub Pages**. It writes `admin-boundaries/js/config.js` from the secrets at deploy time.

URL-restrict both live keys to:
- `https://jwitcoski.github.io/map-agent-arena/*`
- `http://localhost:*` and `http://127.0.0.1:*` for local

## Notes

- Browser keys are visible in the deployed page source by design; URL restrictions matter.
- Rumble pending seats stay awaiting-API until keys/packs exist.
- Antikythera dig and other personal demos remain on the homepage repo.
