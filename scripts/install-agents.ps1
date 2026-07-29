# Install vendor agent skills (project-scoped)

# Run from map-agent-arena repo root.
# Requires network. Skills land in .agents/skills/

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path .agents/skills | Out-Null

npx --yes skills add mapbox/mapbox-agent-skills -a cursor -y
npx --yes skills add maptiler/maptiler-skills -a cursor -y
npx --yes skills add googlemaps/agent-skills -a cursor -y
npx --yes skills add CartoDB/agent-skills -a cursor -y
npx --yes skills add MicrosoftDocs/Agent-Skills --skill azure-maps -a cursor -y
npx --yes skills add cline/skills --skill amazon-location-service -a cursor -y

Write-Host @"

Also link (not Cursor skills packs):
  TomTom SDK: https://github.com/tomtom-international/maps-sdk-js
  Stadia MCP: https://github.com/stadiamaps/stadiamaps-mcp-server-ts
    (clone, bun install, bun run build, set API_KEY in MCP config)

See map-agent-rumble/AGENT_WORKFLOW.md and map-agent-rumble/agents.json
"@
Get-ChildItem .agents/skills | Select-Object Name
