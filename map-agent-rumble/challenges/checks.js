/**
 * Static graders for Map Agent Royal Rumble skills.
 */
(function (global) {
  const LETTERS = [
    { min: 94, letter: "A" },
    { min: 86, letter: "B" },
    { min: 76, letter: "C" },
    { min: 65, letter: "D" },
    { min: 0, letter: "F" },
  ];

  function pts(pass, weight, id, detail) {
    return { pass: !!pass, weight, id, detail: detail || id };
  }

  function substanceLen(src) {
    let s = String(src || "");
    s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
    s = s.replace(/<!--[\s\S]*?-->/g, "");
    s = s.replace(/\/\*[\s\S]*?\*\//g, "");
    s = s.replace(/(^|[^:])\/\/.*$/gm, "$1");
    return s.replace(/\s+/g, " ").trim().length;
  }

  function minSubstance(src, n, id) {
    const len = substanceLen(src);
    const ok = len >= n;
    return pts(ok, 10, id || "min_substance", ok ? `substance ${len}` : `Need ~${n}+ chars of substance (got ${len})`);
  }

  const CHECKS = {
    uses_mapbox(src) {
      const ok = /mapbox-gl|mapboxgl|new\s+mapboxgl\.Map/i.test(src);
      return pts(ok, 12, "uses_mapbox", ok ? "mapbox-gl" : "Use Mapbox GL JS");
    },
    pinned_mapbox(src) {
      const ok = /mapbox-gl-js\/v3\.9\.0|mapbox-gl[@/]3\.9\.0/i.test(src);
      return pts(ok, 8, "pinned_mapbox", ok ? "v3.9.0" : "Pin mapbox-gl v3.9.0");
    },
    uses_maptiler(src) {
      const ok = /maptilersdk|@maptiler\/sdk|maptiler-sdk/i.test(src);
      return pts(ok, 12, "uses_maptiler", ok ? "MapTiler SDK" : "Use MapTiler SDK");
    },
    pinned_maptiler(src) {
      const ok = /maptiler-sdk-js\/v4\.0\.2|@maptiler\/sdk[@/]4\.0\.2/i.test(src);
      return pts(ok, 8, "pinned_maptiler", ok ? "v4.0.2" : "Pin MapTiler SDK v4.0.2");
    },
    uses_maplibre(src) {
      const ok = /maplibre-gl|maplibregl|new\s+maplibregl\.Map/i.test(src);
      return pts(ok, 12, "uses_maplibre", ok ? "MapLibre" : "Use MapLibre GL JS");
    },
    loads_config(src) {
      const ok = /admin-boundaries\/js\/config\.js/i.test(src);
      return pts(ok, 10, "loads_config", ok ? "config.js" : "Load config.js");
    },
    token_hygiene(src) {
      const bad = /mapboxgl\.accessToken\s*=\s*["']pk\./i.test(src) || /MAPBOX_ACCESS_TOKEN\s*=\s*["']pk\./i.test(src);
      return pts(!bad, 14, "token_hygiene", bad ? "Hardcoded pk." : "OK");
    },
    key_hygiene(src) {
      const bad = /MAPTILER_API_KEY\s*=\s*["'][A-Za-z0-9]{10,}["']/i.test(src) && !/window\.MAPTILER_API_KEY/.test(src);
      const hard = /apiKey\s*=\s*["'][A-Za-z0-9_-]{16,}["']/i.test(src);
      return pts(!bad && !hard, 14, "key_hygiene", hard || bad ? "Hardcoded key" : "OK");
    },
    no_commercial_key(src) {
      const bad =
        /pk\.eyJ|MAPBOX_ACCESS_TOKEN|MAPTILER_API_KEY|ARCGIS_API_KEY|GOOGLE_MAPS_API_KEY|AZURE_MAPS|STADIA_API_KEY|CARTO_API|HERE_API_KEY|TOMTOM_API_KEY|MAPKIT_JWT|AWS_LOCATION|CESIUM_ION|arcgis.*[Aa]pi[Kk]ey|googleapis\.com\/maps|bing\.com\/api\/maps|js\.api\.here\.com|api\.tomtom\.com|stadiamaps\.com/i.test(
          src
        );
      return pts(!bad, 16, "no_commercial_key", bad ? "Commercial key/SDK leak" : "No commercial keys");
    },
    open_style(src) {
      const ok =
        /demotiles\.maplibre\.org|openfreemap\.org|tiles\.openfreemap|protomaps|osm-bright|positron/i.test(src);
      return pts(ok, 10, "open_style", ok ? "Open style" : "Use open/demo tiles style URL");
    },
    token_guard(src) {
      const ok = /MAPBOX_ACCESS_TOKEN/.test(src) && /(!\s*token|!window\.MAPBOX|missing|throw)/i.test(src);
      return pts(ok, 10, "token_guard", ok ? "Guard" : "Missing-token guard");
    },
    key_guard(src) {
      const ok = /MAPTILER_API_KEY/.test(src) && /(!\s*key|!window\.MAPTILER|missing|throw)/i.test(src);
      return pts(ok, 10, "key_guard", ok ? "Guard" : "Missing-key guard");
    },
    google_key_hygiene(src) {
      const hard =
        /GOOGLE_MAPS_API_KEY\s*=\s*["']AIza[A-Za-z0-9_-]{10,}["']/i.test(src) ||
        /[?&]key=["']AIza[A-Za-z0-9_-]{20,}["']/i.test(src);
      return pts(!hard, 14, "google_key_hygiene", hard ? "Hardcoded Google key" : "OK");
    },
    google_key_guard(src) {
      const ok =
        /GOOGLE_MAPS_API_KEY/.test(src) && /(!\s*key|!window\.GOOGLE|missing|throw)/i.test(src);
      return pts(ok, 10, "google_key_guard", ok ? "Guard" : "Missing Google key guard");
    },
    azure_key_hygiene(src) {
      const hard =
        /AZURE_MAPS_SUBSCRIPTION_KEY\s*=\s*["'][A-Za-z0-9_\-+/=]{20,}["']/i.test(src);
      return pts(!hard, 14, "azure_key_hygiene", hard ? "Hardcoded Azure key" : "OK");
    },
    azure_key_guard(src) {
      const ok =
        /AZURE_MAPS_SUBSCRIPTION_KEY/.test(src) &&
        /(!\s*key|!window\.AZURE|missing|throw)/i.test(src);
      return pts(ok, 10, "azure_key_guard", ok ? "Guard" : "Missing Azure key guard");
    },
    prague_center(src) {
      const ok =
        /\[\s*14\.4178\s*,\s*50\.1167\s*\]/.test(src) ||
        (/lat\s*:\s*50\.1167/.test(src) && /lng\s*:\s*14\.4178/.test(src));
      return pts(ok, 10, "prague_center", ok ? "Prague" : "Center Prague [14.4178, 50.1167] or {lat:50.1167,lng:14.4178}");
    },
    full_viewport(src) {
      const ok = /#map/.test(src) && /height:\s*100%|inset:\s*0|100vh/.test(src);
      return pts(ok, 8, "full_viewport", ok ? "Full viewport" : "Full-viewport #map");
    },
    has_markers(src) {
      const ctor = (
        src.match(/new\s+(?:mapboxgl|maplibregl|maptilersdk|google\.maps)\.Marker\s*\(/g) || []
      ).length;
      const htmlMarkers = (src.match(/new\s+atlas\.HtmlMarker\s*\(/g) || []).length;
      const coords = (src.match(/\[\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+/g) || []).length;
      const gLatLng = (src.match(/lat\s*:\s*-?\d+\.\d+[\s\S]{0,40}lng\s*:\s*-?\d+\.\d+/g) || []).length;
      const looped =
        /\.forEach/.test(src) &&
        /Marker|HtmlMarker/.test(src) &&
        !/Only one/.test(src) &&
        (coords >= 3 || gLatLng >= 3);
      const ok = ctor >= 3 || htmlMarkers >= 3 || looped;
      return pts(ok, 12, "has_markers", ok ? `Markers (ctors=${ctor + htmlMarkers}, coords=${coords})` : "Need >=3 markers/points");
    },
    has_popup(src) {
      const ok = /Popup|popup|setPopup|infoWindow|InfoWindow|bindPopup|atlas\.Popup/i.test(src);
      return pts(ok, 10, "has_popup", ok ? "Popup" : "Need popups/info UI");
    },
    style_switcher(src) {
      const dataStyles = src.match(/data-style="[^"]+"/g) || [];
      const unique = new Set(dataStyles);
      const mapStyles = (src.match(/MapStyle\.\w+/g) || []).length;
      const mapTypes = (src.match(/data-type="[^"]+"/g) || []).length;
      const ok = unique.size >= 3 || mapStyles >= 3 || mapTypes >= 3;
      return pts(ok, 12, "style_switcher", ok ? `>=3 styles (${unique.size || mapStyles || mapTypes})` : "Need >=3 distinct style controls");
    },
    set_style(src) {
      const ok = /setStyle|setMapTypeId|mapTypeId|style\s*=|map\.setStyle/i.test(src);
      return pts(ok, 8, "set_style", ok ? "setStyle/mapType" : "Call setStyle / setMapTypeId");
    },
    has_atmosphere(src) {
      const ok = /setFog|lightPreset|halo|space|atmosphere|fog|styles\.|StyledMapType|grayscale_dark|night/i.test(src);
      return pts(ok, 14, "has_atmosphere", ok ? "Atmosphere" : "Fog/lights/globe mood");
    },
    geocode_forward(src) {
      const ok =
        /geocod|Geocoder|searchbox|nominatim|forward|\/search\?|places\.Autocomplete|PlacesService|search\/address/i.test(
          src
        );
      return pts(ok, 12, "geocode_forward", ok ? "Forward geocode" : "Forward geocode/search");
    },
    geocode_reverse(src) {
      const omitted = /click reverse omitted|reverse omitted|TODO reverse/i.test(src);
      const ok =
        !omitted &&
        (/\/reverse\b|reverse\?|method:\s*['"]reverse['"]|geocode\(\s*\{\s*location|search\/address\/reverse/i.test(
          src
        ) ||
          (/map\.on\(\s*['"]click['"]|addListener\(\s*map\s*,\s*['"]click['"]|events\.add\(\s*['"]click['"]/i.test(
            src
          ) &&
            /geocod|nominatim|Geocoder|search\/address/i.test(src)));
      return pts(ok, 12, "geocode_reverse", ok ? "Reverse" : "Reverse geocode on click");
    },
    has_debounce(src) {
      const ok = /debounc|setTimeout\s*\(|throttle/i.test(src);
      return pts(ok, 8, "has_debounce", ok ? "Debounce" : "Debounce search input");
    },
    has_flyto(src) {
      const ok = /flyTo|easeTo|goTo|setView|animateTo|panTo|panBy|setCamera/i.test(src);
      return pts(ok, 12, "has_flyto", ok ? "Camera move" : "flyTo/easeTo/panTo/setCamera sequence");
    },
    has_pitch_or_bearing(src) {
      const ok = /pitch|bearing|setTilt|setHeading|tilt|heading/i.test(src);
      return pts(ok, 10, "has_pitch_or_bearing", ok ? "Pitch/bearing" : "Change pitch/tilt or bearing/heading");
    },
    has_inset(src) {
      const ok = /inset|#overview|overview-map|minimap/i.test(src);
      return pts(ok, 14, "has_inset", ok ? "Inset" : "Need inset/overview map");
    },
    extent_rect(src) {
      const ok = /extent|bounds|getBounds|rectangle|bbox|LatLngBounds/i.test(src);
      return pts(ok, 10, "extent_rect", ok ? "Extent" : "Show main extent on inset");
    },
    has_extrusion(src) {
      const ok = /fill-extrusion|extrusion|3d.?building|building.*height/i.test(src);
      return pts(ok, 14, "has_extrusion", ok ? "Extrusion" : "3D buildings / fill-extrusion");
    },
    has_terrain(src) {
      const ok = /setTerrain|terrain-dem|terrain\s*:\s*true|exaggeration/i.test(src);
      return pts(ok, 14, "has_terrain", ok ? "Terrain" : "Enable terrain/DEM");
    },
    has_terrain_or_honest(src) {
      const ok =
        /setTerrain|terrain-dem|terrain\s*:\s*true|exaggeration|no terrain|honest|hillshade|pitch:\s*6|tilt:\s*45|no DEM/i.test(
          src
        );
      return pts(ok, 12, "has_terrain_or_honest", ok ? "Terrain or honest fallback" : "Terrain or documented fallback");
    },
    has_cluster(src) {
      const ok =
        /cluster\s*:\s*true|clustered|supercluster|clusterMaxZoom|MarkerClusterer|clusterRadius|BubbleLayer/i.test(
          src
        );
      return pts(ok, 14, "has_cluster", ok ? "Cluster" : "Enable clustering");
    },
    has_story_chapters(src) {
      const ok = /chapter|story|scrolly|section.*fly|data-chapter/i.test(src);
      return pts(ok, 14, "has_story_chapters", ok ? "Chapters" : "Multi-chapter story UI");
    },
    has_legend(src) {
      const ok =
        /id=["']legend["']|class=["'][^"']*legend[^"']*["']/i.test(src) &&
        /legend[\s\S]{0,200}(Heat|Corridor|Sites|layer|fill|line|point)/i.test(src);
      return pts(ok, 12, "has_legend", ok ? "Legend" : "Need legend with layer labels");
    },
    has_layer_toggles(src) {
      const ok = /toggle|opacity|checkbox|setLayoutProperty|setPaintProperty|filter/i.test(src);
      return pts(ok, 12, "has_layer_toggles", ok ? "Toggles" : "Layer toggles/opacity/filter");
    },
    has_swipe(src) {
      const ui = /swipe|compare|clip-path|splitter|map-compare/i.test(src);
      // Swipe compare must keep maps geographically synced while dragging/panning
      const synced =
        /function\s+bind\s*\([^)]*\)\s*\{[\s\S]{0,500}(jumpTo|setCenter|setZoom|easeTo|setCamera)/i.test(src) &&
        !/maps not synced/i.test(src);
      const ok = ui && synced;
      return pts(ok, 14, "has_swipe", ok ? "Swipe + sync" : ui ? "Swipe UI but maps not synced" : "Swipe/compare control");
    },
    has_playback(src) {
      const ok = /play|pause|scrubber|timeline|time-travel|currentTime|frame/i.test(src);
      return pts(ok, 12, "has_playback", ok ? "Playback" : "Play/pause or scrubber");
    },
    has_raf_or_interval(src) {
      // Must actually loop: raf/interval inside the tick/loop body, not only a one-shot start
      const looped =
        /function\s+(tick|loop)\s*\([^)]*\)\s*\{[\s\S]*?requestAnimationFrame\s*\(\s*(tick|loop)\s*\)/i.test(src) ||
        /requestAnimationFrame\s*\(\s*function[\s\S]{0,300}requestAnimationFrame/i.test(src) ||
        /setInterval\s*\(/i.test(src);
      const broken = /no raf loop/i.test(src);
      const ok = looped && !broken;
      return pts(ok, 10, "has_raf_or_interval", ok ? "Animation loop" : "Need recurring raf/interval loop (not one-shot)");
    },
    has_game_controls(src) {
      const ok = /keydown|ArrowUp|wasd|pointerdown|gamepad/i.test(src);
      return pts(ok, 12, "has_game_controls", ok ? "Controls" : "Keyboard/pointer controls");
    },
    has_follow_cam(src) {
      const ok = /follow|setCenter|easeTo|jumpTo|panTo|setCamera|camera.*car|car.*camera/i.test(src);
      return pts(ok, 10, "has_follow_cam", ok ? "Follow cam" : "Camera follows vehicle");
    },
    has_track(src) {
      const ok = /track|LineString|race|street|route\.geometry|overview_path|Polyline|LineLayer/i.test(src);
      return pts(ok, 10, "has_track", ok ? "Track layer" : "Visible street/track LineString");
    },
    real_street_route(src) {
      const ok =
        (/directions\/v5|DirectionsService|route\/directions|map matching|map-matching|router\.project-osrm\.org\/route|\/match\/v1|geometries=geojson/i.test(
          src
        ) &&
          !/hand-?drawn rectangle|fake track|toy oval/i.test(src));
      return pts(ok, 16, "real_street_route", ok ? "Routed street geometry" : "Load track from Directions/OSRM/map-matching (real street)");
    },
    road_constrained(src) {
      const constrained =
        /along|distanceAlong|nearestPointOnLine|snap|progress|interpolate|pointAlong|getCoordinate|arcLength|distAlong|t\s*\+=|metersAlong/i.test(
          src
        ) && !/free.?driv|off.?road|not constrained|drives anywhere/i.test(src);
      // Free 2D heading integration without projecting back onto the line fails
      const freeFly =
        /car\.(lng|lon)\s*\+=\s*Math\.sin/i.test(src) &&
        !/along|nearestPoint|snap|progress|pointAlong|distAlong/i.test(src);
      const ok = constrained && !freeFly;
      return pts(ok, 18, "road_constrained", ok ? "On-street only" : "Car must stay on street centerline (no free off-road drive)");
    },
    has_directions(src) {
      const ok = /directions|routing|osrm|\/route\/v1|route\/directions/i.test(src);
      return pts(ok, 14, "has_directions", ok ? "Directions" : "Directions/routing API");
    },
    has_line_layer(src) {
      const ok = /line|LineString|addLayer.*line|Polyline|polyline|LineLayer/i.test(src);
      return pts(ok, 10, "has_line_layer", ok ? "Line" : "Draw route line");
    },
    has_isochrone(src) {
      const ok = /isochrone|reachability|contour|table\/v1/i.test(src);
      return pts(ok, 14, "has_isochrone", ok ? "Isochrone" : "Reachability/isochrone");
    },
    has_responsive(src) {
      const ok = /max-width|@media|viewport|touch-action|clamp\(/i.test(src);
      return pts(ok, 10, "has_responsive", ok ? "Responsive" : "Responsive CSS / media");
    },
    has_touch_friendly(src) {
      const ok = /touch|min-height:\s*(44|48)|padding:\s*1[2-9]|button/i.test(src);
      return pts(ok, 8, "has_touch_friendly", ok ? "Touch UI" : "Touch-friendly controls");
    },
    has_geolocation(src) {
      const ok = /geolocation|getCurrentPosition|GeolocateControl|locate|atlas\.control\.GeolocationControl/i.test(src);
      return pts(ok, 14, "has_geolocation", ok ? "Geolocation" : "Locate me / geolocation");
    },
    no_stub_placeholder(src) {
      const bad = /\/\*\s*omitted|TODO:|FIXME|not implemented|skill gap|coming soon|implement me/i.test(src);
      return pts(!bad, 14, "no_stub_placeholder", bad ? "Stub/omitted/TODO left in source" : "No stub markers");
    },
    style_reload_hook(src) {
      const ok = /style\.load|on\(['"]load['"].*setStyle|styledata/i.test(src);
      return pts(ok, 10, "style_reload_hook", ok ? "style.load hook" : "Re-bind after setStyle (style.load)");
    },
    extrusion_height_expr(src) {
      const ok = /fill-extrusion-height["']?\s*:\s*\[[\s\S]*?get|interpolate/i.test(src);
      return pts(ok, 12, "extrusion_height_expr", ok ? "Data-driven height" : "Use data-driven extrusion height expression");
    },
    cluster_volume(src) {
      const m = src.match(/for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*(\d+)/);
      const n = m ? Number(m[1]) : 0;
      const ok = n >= 4000 || /5000/.test(src);
      return pts(ok, 10, "cluster_volume", ok ? `~${n || 5000} points` : "Need ~5k points for cluster storm");
    },
    placeholder_or_esri(src) {
      const ok =
        /@arcgis\/core|esri\/Map|MapView|arcgis-map|awaiting API|coming soon/i.test(src);
      return pts(ok, 10, "placeholder_or_esri", ok ? "Esri / awaiting" : "Esri SDK or awaiting placeholder");
    },
    awaiting_api(src) {
      const ok = /awaiting API|awaiting-api|coming soon|not run yet|placeholder/i.test(src);
      return pts(ok, 10, "awaiting_api", ok ? "Awaiting API placeholder" : "Need honest awaiting-API placeholder");
    },
    uses_esri(src) {
      const ok = /@arcgis\/core|esri\/Map|MapView|arcgis-map|ArcGISMap/i.test(src);
      return pts(ok, 12, "uses_esri", ok ? "ArcGIS Maps SDK" : "Use ArcGIS Maps SDK for JS");
    },
    uses_google(src) {
      const ok = /maps\.googleapis\.com|google\.maps|new\s+google\.maps\.Map/i.test(src);
      return pts(ok, 12, "uses_google", ok ? "Google Maps JS" : "Use Google Maps JavaScript API");
    },
    uses_bing(src) {
      const ok = /atlas\.microsoft\.com|azure-maps|AzureMaps|Microsoft\.Maps|bing\.com\/api\/maps/i.test(src);
      return pts(ok, 12, "uses_bing", ok ? "Azure/Bing Maps" : "Use Azure Maps or Bing Maps Web SDK");
    },
    uses_azure(src) {
      const ok = /atlas\.microsoft\.com|azure-maps|new\s+atlas\.Map|atlas\.Map\s*\(/i.test(src);
      return pts(ok, 12, "uses_azure", ok ? "Azure Maps" : "Use Azure Maps Web SDK");
    },
    uses_stadia(src) {
      const ok = /stadiamaps\.com|stadia\.maps|api\.stadiamaps/i.test(src);
      return pts(ok, 12, "uses_stadia", ok ? "Stadia Maps" : "Use Stadia Maps tiles/API");
    },
    uses_carto(src) {
      const ok = /@carto\/|carto\.com|carto-vl|deck\.gl.*[Cc]arto|CartoLayer/i.test(src);
      return pts(ok, 12, "uses_carto", ok ? "CARTO" : "Use CARTO / CartoDB stack");
    },
    uses_here(src) {
      const ok = /js\.api\.here\.com|H\.Map|here\.com|@here\//i.test(src);
      return pts(ok, 12, "uses_here", ok ? "HERE Maps" : "Use HERE Maps API for JavaScript");
    },
    uses_tomtom(src) {
      const ok = /api\.tomtom\.com|tt\.map|@tomtom-international|tomtom\.maps/i.test(src);
      return pts(ok, 12, "uses_tomtom", ok ? "TomTom Maps" : "Use TomTom Maps SDK for Web");
    },
    uses_leaflet(src) {
      const ok = /leaflet\.js|L\.map\s*\(|new\s+L\.Map/i.test(src);
      return pts(ok, 12, "uses_leaflet", ok ? "Leaflet" : "Use Leaflet");
    },
    uses_openlayers(src) {
      const ok = /ol\/Map|new\s+ol\.Map|openlayers/i.test(src);
      return pts(ok, 12, "uses_openlayers", ok ? "OpenLayers" : "Use OpenLayers");
    },
    uses_apple(src) {
      const ok = /mapkit\.|MapKit|maps\.apple\.com/i.test(src);
      return pts(ok, 12, "uses_apple", ok ? "MapKit JS" : "Use Apple MapKit JS");
    },
    uses_aws_location(src) {
      const ok = /geo\.(.*\.)?amazonaws\.com|@aws\/amazon-location|AWSLocation|amazon-location/i.test(src);
      return pts(ok, 12, "uses_aws_location", ok ? "AWS Location" : "Use Amazon Location Service");
    },
    uses_cesium(src) {
      const ok = /Cesium\.Viewer|cesium\.js|cesium\/Build|Ion\.defaultAccessToken/i.test(src);
      return pts(ok, 12, "uses_cesium", ok ? "CesiumJS" : "Use CesiumJS");
    },
    min_substance(src) {
      return minSubstance(src, 400, "min_substance");
    },
    min_substance_med(src) {
      return minSubstance(src, 700, "min_substance_med");
    },
    min_substance_hard(src) {
      return minSubstance(src, 1000, "min_substance_hard");
    },
  };

  /** Human labels for the grading rubric UI (what we look for). */
  const CHECK_LABELS = {
    uses_mapbox: "Uses Mapbox GL JS",
    pinned_mapbox: "Pinned mapbox-gl v3.9.0",
    uses_maptiler: "Uses MapTiler SDK",
    pinned_maptiler: "Pinned MapTiler SDK v4.0.2",
    uses_maplibre: "Uses MapLibre GL JS",
    loads_config: "Loads config.js for keys",
    token_hygiene: "No hardcoded Mapbox pk. token",
    key_hygiene: "No hardcoded MapTiler key",
    no_commercial_key: "No commercial SDK/key leak",
    open_style: "Open/demo tiles style URL",
    token_guard: "Missing-token guard",
    key_guard: "Missing-key guard",
    google_key_hygiene: "No hardcoded Google Maps key",
    google_key_guard: "Missing Google Maps key guard",
    azure_key_hygiene: "No hardcoded Azure Maps subscription key",
    azure_key_guard: "Missing Azure Maps key guard",
    prague_center: "Center Prague [14.4178, 50.1167]",
    full_viewport: "Full-viewport #map",
    has_markers: "Markers / points (≥3 expected in prompt)",
    has_popup: "Popups or info UI",
    style_switcher: "≥3 style / basemap controls",
    set_style: "Calls setStyle / style change",
    has_atmosphere: "Fog, lights, globe, or mood controls",
    geocode_forward: "Forward geocode / search",
    geocode_reverse: "Reverse geocode on click",
    has_debounce: "Debounced search input",
    has_flyto: "flyTo / easeTo camera move",
    has_pitch_or_bearing: "Pitch or bearing change",
    has_inset: "Inset / overview map",
    extent_rect: "Main extent shown on inset",
    has_extrusion: "3D buildings / fill-extrusion",
    has_terrain: "Terrain / DEM + exaggeration",
    has_terrain_or_honest: "Terrain or honest open-tiles fallback",
    has_cluster: "Point clustering enabled",
    has_story_chapters: "Multi-chapter story UI",
    has_legend: "Legend for thematic layers",
    has_layer_toggles: "Layer toggles / opacity / filter",
    has_swipe: "Swipe or split compare",
    has_playback: "Play/pause or time scrubber",
    has_raf_or_interval: "Animation loop (raf / interval)",
    has_game_controls: "Keyboard / pointer game controls",
    has_follow_cam: "Camera follows vehicle",
    has_track: "Track / street LineString layer",
    real_street_route: "Track loaded from real routing (Directions / OSRM / map-matching)",
    road_constrained: "Car stays on street centerline (progress/snap along line)",
    has_directions: "Directions / routing API",
    has_line_layer: "Route drawn as line layer",
    has_isochrone: "Reachability / isochrone polygons",
    has_responsive: "Responsive / narrow-width CSS",
    has_touch_friendly: "Touch-friendly control sizes",
    has_geolocation: "Geolocation / locate-me",
    placeholder_or_esri: "Esri SDK or awaiting-API placeholder",
    awaiting_api: "Honest awaiting-API placeholder (seat not ready)",
    uses_esri: "Uses ArcGIS Maps SDK for JavaScript",
    uses_google: "Uses Google Maps JavaScript API",
    uses_bing: "Uses Azure Maps / Bing Maps Web SDK",
    uses_azure: "Uses Azure Maps Web SDK",
    uses_stadia: "Uses Stadia Maps",
    uses_carto: "Uses CARTO (CartoDB)",
    uses_here: "Uses HERE Maps API for JavaScript",
    uses_tomtom: "Uses TomTom Maps SDK for Web",
    uses_leaflet: "Uses Leaflet",
    uses_openlayers: "Uses OpenLayers",
    uses_apple: "Uses Apple MapKit JS",
    uses_aws_location: "Uses Amazon Location Service",
    uses_cesium: "Uses CesiumJS",
    no_stub_placeholder: "No TODO/omitted/skill-gap stubs in source",
    style_reload_hook: "Re-attach handlers after setStyle (style.load)",
    extrusion_height_expr: "Data-driven fill-extrusion height",
    cluster_volume: "~5k points for cluster storm",
    min_substance: "Minimum code substance (easy)",
    min_substance_med: "Minimum code substance (medium)",
    min_substance_hard: "Minimum code substance (hard/insane)",
  };

  /** Why this check exists — shown in the agent brief / rubric. */
  const CHECK_WHY = {
    uses_mapbox: "Confirms the fighter used the Mapbox stack, not a substitute library.",
    pinned_mapbox: "Pins a known-good CDN version so demos don't silently break on major upgrades.",
    uses_maptiler: "Confirms MapTiler SDK (not raw MapLibre-only) when grading the MapTiler seat.",
    pinned_maptiler: "Same version-pinning idea for MapTiler SDK.",
    uses_maplibre: "No Agent must stay on open MapLibre — not a commercial SDK in disguise.",
    loads_config: "Tokens/keys belong in config, not pasted into agent output.",
    token_hygiene: "Hardcoded pk. tokens get leaked into git and screenshots.",
    key_hygiene: "Same leak risk for MapTiler API keys.",
    no_commercial_key: "Impartial baseline fails if it sneaks Mapbox/MapTiler/Esri/Google credentials.",
    open_style: "No Agent must render a real open basemap (OpenFreeMap, etc.), not an empty canvas.",
    token_guard: "Missing-token UX prevents a blank white crash for end users.",
    key_guard: "Same for MapTiler API key.",
    google_key_hygiene: "Same leak risk for Google Maps API keys.",
    google_key_guard: "Missing-key UX for Google Maps Platform.",
    azure_key_hygiene: "Same leak risk for Azure Maps subscription keys.",
    azure_key_guard: "Missing-key UX for Azure Maps Web SDK.",
    prague_center: "Shared geographic fixture — also catches classic [lat,lng] vs [lng,lat] swaps.",
    full_viewport: "A 'hello map' that is a tiny div fails the product brief.",
    has_markers: "Pins & popups is useless without multiple interactive points.",
    has_popup: "Clicking a pin should reveal information.",
    style_switcher: "Basemap switching is a core display skill — need real choices, not one button.",
    set_style: "UI without calling setStyle doesn't actually switch maps.",
    has_atmosphere: "Mood/fog/globe separates a polished map from a flat default.",
    geocode_forward: "Search must resolve text → coordinates on the map.",
    geocode_reverse: "Click-the-map → address proves reverse geocoding, not just a marker drop.",
    has_debounce: "Without debounce, every keystroke hammers the geocoder.",
    has_flyto: "Camera choreography requires animated camera moves, not only setCenter.",
    has_pitch_or_bearing: "A tour that never tilts/rotates is a weak choreography.",
    has_inset: "Inset maps need a second map instance (overview), not a CSS thumbnail.",
    extent_rect: "Overview must show where the main map is looking.",
    has_extrusion: "3D buildings need extrusion (or vendor 3D buildings), not just pitch.",
    has_terrain: "Terrain fly needs DEM + exaggeration, not only a mountain center.",
    has_terrain_or_honest: "Open stacks may lack DEM — document an honest fallback instead of faking it.",
    has_cluster: "5k raw circles without clustering will tank performance.",
    has_story_chapters: "Story maps need narrative chapters that drive the map.",
    has_legend: "Thematic layers without a legend fail cartography basics.",
    has_layer_toggles: "Layer studio must let users turn layers on/off or filter them.",
    has_swipe: "Compare views need a swipe/clip interaction with geographic sync between maps.",
    has_playback: "Time-travel needs play/pause or a scrubber, not a single frame.",
    has_raf_or_interval: "Animation must keep looping (raf inside tick / setInterval) — a one-shot start is a fail.",
    has_game_controls: "Racecar without input isn't a game.",
    has_follow_cam: "Camera should track the vehicle.",
    has_track: "Need a visible street/track LineString to race on.",
    real_street_route: "Toy ovals fail — the track must come from real road routing between map points.",
    road_constrained: "The car may only move along that street — free off-road driving is a fail.",
    has_directions: "Navigation track requires a real router (Directions / OSRM).",
    has_line_layer: "A route JSON without drawing the line fails the display brief.",
    has_isochrone: "Reachability must show polygons, not just a point.",
    has_responsive: "Mobile web maps must work at narrow widths.",
    has_touch_friendly: "Tiny hover-only controls fail on phones.",
    has_geolocation: "Locate-me needs the Geolocation API / control + permission UX.",
    placeholder_or_esri: "Esri seat stays honest until API packs exist.",
    awaiting_api: "Pending seats must show an awaiting placeholder — not a fake F.",
    uses_esri: "Confirms ArcGIS Maps SDK when the Esri seat is active.",
    uses_google: "Confirms Google Maps JS API when the Google seat is active.",
    uses_bing: "Confirms Azure Maps / Bing Maps when that seat is active.",
    uses_azure: "Confirms Azure Maps when that seat is active.",
    uses_stadia: "Confirms Stadia Maps when that seat is active.",
    uses_carto: "Confirms CARTO (CartoDB) when that seat is active.",
    uses_here: "Confirms HERE Maps when that seat is active.",
    uses_tomtom: "Confirms TomTom Maps when that seat is active.",
    uses_leaflet: "Confirms Leaflet when that seat is active.",
    uses_openlayers: "Confirms OpenLayers when that seat is active.",
    uses_apple: "Confirms Apple MapKit JS when that seat is active.",
    uses_aws_location: "Confirms Amazon Location Service when that seat is active.",
    uses_cesium: "Confirms CesiumJS when that seat is active.",
    no_stub_placeholder: "Skill agents often leave /* omitted */ / TODO — that is a real fail, same spirit as individual graders.",
    style_reload_hook: "After setStyle, layers/handlers die unless re-bound on style.load.",
    extrusion_height_expr: "Hardcoded extrusion height is a common first-pass miss vs data-driven height.",
    cluster_volume: "Under-sampling (hundreds instead of ~5k) is a typical skill-pass shortcut.",
    min_substance: "Filters empty stubs and one-liner fakes.",
    min_substance_med: "Medium skills need real implementation mass.",
    min_substance_hard: "Hard/insane skills need substantial working code.",
  };

  function letterFor(pct) {
    for (const row of LETTERS) {
      if (pct >= row.min) return row.letter;
    }
    return "F";
  }

  /**
   * Rubric for a list of check ids — weights + what we grade (no source needed).
   */
  function rubric(checkIds) {
    const ids = Array.isArray(checkIds) ? checkIds : [];
    const rows = ids.map((id) => {
      const fn = CHECKS[id];
      if (!fn) {
        return { id, weight: 0, label: `Unknown check ${id}`, known: false };
      }
      // Probe weight via empty source (pass/fail ignored)
      const sample = fn("");
      return {
        id,
        weight: sample.weight,
        label: CHECK_LABELS[id] || sample.detail || id,
        why: CHECK_WHY[id] || "",
        known: true,
      };
    });
    const possible = rows.reduce((s, r) => s + r.weight, 0);
    return {
      checks: rows,
      possible,
      letters: LETTERS.slice(),
      note: "Harsh letter cutoffs: A≥94 · B≥86 · C≥76 · D≥65 · else F. Score = earned weights / possible.",
    };
  }

  function grade(source, checkIds) {
    const ids = Array.isArray(checkIds) ? checkIds : [];
    if (!ids.length) {
      return { earned: 0, possible: 0, pct: 0, letter: "N/A", checks: [], na: true };
    }
    const checks = ids.map((id) => {
      const fn = CHECKS[id];
      if (!fn) return pts(false, 0, id, `Unknown check ${id}`);
      return fn(source || "");
    });
    const earned = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
    const possible = checks.reduce((s, c) => s + c.weight, 0);
    const pct = possible ? Math.round((1000 * earned) / possible) / 10 : 0;
    return {
      earned,
      possible,
      pct,
      letter: letterFor(pct),
      checks,
      score: earned,
      maxScore: possible,
      na: false,
    };
  }

  function canAttempt(fighter, skill) {
    const reqs = skill.requires || [];
    if (!reqs.length) return true;
    const caps = (fighter && fighter.capabilities) || {};
    return reqs.every((r) => caps[r]);
  }

  /**
   * Resolve which checks grade a fighter for a skill.
   * Order: skill.checks[fighter.id] → skill.checks[fighter.checkProfile] →
   * awaiting_api if !ready → skill.checks.shared → [].
   */
  function resolveCheckIds(fighter, skill) {
    const checks = (skill && skill.checks) || {};
    const id = fighter && fighter.id;
    if (id && Array.isArray(checks[id]) && checks[id].length) return checks[id].slice();
    const profile = fighter && fighter.checkProfile;
    if (profile && Array.isArray(checks[profile]) && checks[profile].length) {
      return checks[profile].slice();
    }
    if (fighter && fighter.ready === false) return ["awaiting_api"];
    if (Array.isArray(checks.shared) && checks.shared.length) return checks.shared.slice();
    return [];
  }

  global.RumbleChecks = {
    grade,
    rubric,
    letterFor,
    canAttempt,
    resolveCheckIds,
    CHECKS,
    CHECK_LABELS,
    CHECK_WHY,
    LETTERS,
  };
})(typeof window !== "undefined" ? window : globalThis);
