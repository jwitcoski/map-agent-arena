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

Write-Host "Installed. See map-agent-rumble/AGENT_WORKFLOW.md and map-agent-rumble/agents.json"
Get-ChildItem .agents/skills | Select-Object Name
