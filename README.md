# Map Agent Arena

Standalone lab for grading and comparing map-agent skill packs:

- **[Royal Rumble](./map-agent-rumble/)**  -  top-10 vendor seats, shared skills, static rubrics
- **[Mapbox Agent Grader](./mapbox-playground/agent-grader.html)**  -  Mapbox GL JS skill scoreboard
- **[MapTiler Agent Grader](./maptiler-playground/agent-grader.html)**  -  MapTiler SDK skill scoreboard

This project was split out of [witcoskitech / cloud-resume-challenge](https://github.com/jwitcoski/cloud-resume-challenge-backend) so agent-eval demos are not on the personal homepage.

## Local setup

```bash
cp admin-boundaries/js/config.example.js admin-boundaries/js/config.js
# add MAPBOX_ACCESS_TOKEN and MAPTILER_API_KEY
npx --yes serve .
```

Open `http://localhost:3000` (or the port `serve` prints).

## Deploy

GitHub Pages is enabled from the `main` branch (`/` root). Workflow: `.github/workflows/pages.yml`.

## Notes

- Solution packs load keys via `admin-boundaries/js/config.js` (gitignored).
- Rumble pending seats (Google, Esri, Azure, ...) stay awaiting-API until keys/packs exist.
- Antikythera dig and other personal demos remain on the homepage repo  -  not here.
