/**
 * CARTO packs (MapLibre GL JS + cartocdn basemaps + LDS API).
 * Intentionally imperfect (see degradeCarto).
 */
module.exports = function buildCartoPacks({ shell }) {
  function cartoHead() {
    return `<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script src="../../admin-boundaries/js/config.js"></script>`;
  }

  function cartoBoot(extra = "") {
    return `
  const token = window.CARTO_API_ACCESS_TOKEN;
  const base = (window.CARTO_API_BASE_URL || "https://gcp-us-east1.api.carto.com").replace(/\/$/, "");
  if (!token || token === "YOUR_CARTO_API_ACCESS_TOKEN") throw new Error("Missing CARTO_API_ACCESS_TOKEN");
  function styleUrl(name) {
    return "https://basemaps.cartocdn.com/gl/" + name + "/style.json";
  }
  function authHeaders() {
    return { Authorization: "Bearer " + token };
  }
  function lds(path, params) {
    const q = new URLSearchParams(params || {});
    return base + "/v3/lds/" + path + (q.toString() ? "?" + q.toString() : "");
  }
  function pickCoords(data) {
    return (
      (data && data.geojson && data.geojson.geometry && data.geojson.geometry.coordinates) ||
      (data && data.geojson && data.geojson.coordinates) ||
      (data && data.geometry && data.geometry.coordinates) ||
      (data && data.result && data.result.geometry && data.result.geometry.coordinates) ||
      (data && data.coordinates) ||
      (data && data.lng != null ? [data.lng, data.lat] : null) ||
      (data && data.lon != null ? [data.lon, data.lat] : null)
    );
  }
  function pickGeom(data) {
    return (
      (data && data.geojson && data.geojson.geometry) ||
      (data && data.geometry) ||
      (data && data.result && data.result.geometry) ||
      (data && data.geojson && data.geojson.type ? data.geojson : null)
    );
  }
  function pickLabel(data) {
    return (
      (data && data.geojson && data.geojson.properties && (data.geojson.properties.label || data.geojson.properties.address)) ||
      (data && data.formatted_address) ||
      (data && data.address) ||
      (data && data.label) ||
      (data && data.result && (data.result.label || data.result.address)) ||
      ""
    );
  }
  ${extra}`;
  }

  const PRAGUE = "[14.4178, 50.1167]";

  const carto = {
    S01() {
      return shell("S01 Hello Map - CARTO", cartoHead(), `
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map",
    style: styleUrl("positron-gl-style"),
    center: ${PRAGUE},
    zoom: 12
  });
  window.__MAP__ = map;
  map.on("load", () => parent.postMessage({ type: "rumble-ready", fighter: "carto", skill: "S01" }, "*"));
</script>`);
    },
    S02() {
      return shell("S02 Pins - CARTO", cartoHead(), `
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 12
  });
  const pins = [
    { lngLat: [14.4178, 50.1167], text: "Old Town" },
    { lngLat: [14.4005, 50.0865], text: "Castle" },
    { lngLat: [14.4301, 50.0792], text: "Vysehrad" }
  ];
  pins.forEach((p) => {
    new maplibregl.Marker().setLngLat(p.lngLat).setPopup(new maplibregl.Popup().setText(p.text)).addTo(map);
  });
  window.__MAP__ = map;
</script>`);
    },
    S03() {
      return shell("S03 Style Switcher - CARTO", cartoHead(), `
<div class="panel">
  <strong>Styles</strong>
  <button type="button" data-style="positron-gl-style">Positron</button>
  <button type="button" data-style="dark-matter-gl-style">Dark Matter</button>
  <button type="button" data-style="voyager-gl-style">Voyager</button>
</div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 11
  });
  document.querySelectorAll("[data-style]").forEach((btn) => {
    btn.addEventListener("click", () => map.setStyle(styleUrl(btn.getAttribute("data-style"))));
  });
  window.__MAP__ = map;
</script>`);
    },
    S04() {
      return shell("S04 Atmosphere - CARTO", cartoHead(), `
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map",
    style: styleUrl("dark-matter-gl-style"),
    center: [-122.42, 37.78],
    zoom: 13,
    pitch: 45
  });
  window.__MAP__ = map;
</script>`);
    },
    S05() {
      return shell("S05 Geocode - CARTO", cartoHead(), `
<div class="panel">
  <strong>Geocode</strong>
  <input id="q" type="search" placeholder="Search address" />
  <div id="out"></div>
</div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 11
  });
  let marker = null, t = null;
  function debounce(fn, ms) {
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
  async function forward(q) {
    const data = await (await fetch(lds("geocoding/geocode", { address: q }), { headers: authHeaders() })).json();
    const c = pickCoords(data);
    if (!c) return;
    if (marker) marker.remove();
    marker = new maplibregl.Marker().setLngLat(c).addTo(map);
    map.flyTo({ center: c, zoom: 14 });
    document.getElementById("out").textContent = pickLabel(data) || q;
  }
  document.getElementById("q").addEventListener("input", debounce((e) => {
    const q = e.target.value.trim();
    if (q.length > 2) forward(q);
  }, 350));
  map.on("click", async (e) => {
    const data = await (await fetch(lds("geocoding/reverse", {
      lon: String(e.lngLat.lng), lat: String(e.lngLat.lat)
    }), { headers: authHeaders() })).json();
    document.getElementById("out").textContent = pickLabel(data) || e.lngLat.toString();
    if (marker) marker.remove();
    marker = new maplibregl.Marker().setLngLat(e.lngLat).addTo(map);
  });
  window.__MAP__ = map;
</script>`);
    },
    S06() {
      return shell("S06 Camera Tour - CARTO", cartoHead(), `
<div class="panel"><button type="button" id="go">Play tour</button></div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 12
  });
  document.getElementById("go").onclick = () => {
    map.flyTo({ center: [14.4005, 50.0865], zoom: 14, pitch: 45, bearing: -30, duration: 2000 });
    setTimeout(() => map.flyTo({ center: [14.414, 50.07], bearing: 40, duration: 2000 }), 2100);
  };
  window.__MAP__ = map;
</script>`);
    },
    S07() {
      return shell("S07 Inset - CARTO", cartoHead(), `
<style>#overview{position:absolute;right:12px;bottom:12px;width:160px;height:120px;z-index:2;border:2px solid #fff;}</style>
<div id="map"></div>
<div id="overview"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 13
  });
  const overview = new maplibregl.Map({
    container: "overview", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 9,
    interactive: false, attributionControl: false
  });
  function sync() {
    const b = map.getBounds();
    if (overview.getSource("extent")) {
      overview.removeLayer("extent-fill");
      overview.removeSource("extent");
    }
    overview.addSource("extent", { type: "geojson", data: {
      type: "Feature", geometry: { type: "Polygon", coordinates: [[
        [b.getWest(), b.getSouth()], [b.getEast(), b.getSouth()],
        [b.getEast(), b.getNorth()], [b.getWest(), b.getNorth()],
        [b.getWest(), b.getSouth()]
      ]] }
    }});
    overview.addLayer({ id: "extent-fill", type: "fill", source: "extent",
      paint: { "fill-color": "#2fb67c", "fill-opacity": 0.25 } });
    overview.setCenter(map.getCenter());
  }
  map.on("moveend", sync);
  overview.on("click", (e) => map.easeTo({ center: e.lngLat }));
  map.on("load", sync);
  window.__MAP__ = map;
</script>`);
    },
    S08() {
      return shell("S08 Extrusion - CARTO", cartoHead(), `
<div class="panel"><strong>3D buildings</strong><p>Pitch view - honest gap on fill-extrusion height expression.</p></div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"),
    center: ${PRAGUE}, zoom: 16, pitch: 45, bearing: 20
  });
  window.__MAP__ = map;
</script>`);
    },
    S09() {
      return shell("S09 Terrain - CARTO", cartoHead(), `
<div class="panel"><strong>Terrain</strong><p>Honest: no DEM exaggeration - Hybrid + pitch fly.</p></div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("voyager-gl-style"),
    center: [8.6, 46.5], zoom: 12, pitch: 45
  });
  map.flyTo({ center: [8.6, 46.5], zoom: 12, pitch: 60, duration: 2500 });
  window.__MAP__ = map;
</script>`);
    },
    S10() {
      return shell("S10 Cluster - CARTO", cartoHead(), `
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("dark-matter-gl-style"),
    center: [14.4, 50.08], zoom: 10
  });
  const features = [];
  for (let i = 0; i < 5000; i++) {
    features.push({ type: "Feature", properties: { id: i },
      geometry: { type: "Point", coordinates: [14.2 + Math.random() * 0.5, 49.95 + Math.random() * 0.35] } });
  }
  map.on("load", () => {
    map.addSource("storm", { type: "geojson", data: { type: "FeatureCollection", features },
      cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });
    map.addLayer({ id: "clusters", type: "circle", source: "storm", filter: ["has", "point_count"],
      paint: { "circle-color": "#2fb67c", "circle-radius": 18 } });
    map.addLayer({ id: "unclustered", type: "circle", source: "storm", filter: ["!", ["has", "point_count"]],
      paint: { "circle-color": "#7dd3a7", "circle-radius": 4 } });
  });
  window.__MAP__ = map;
</script>`);
    },
    S11() {
      return shell("S11 Story Map - CARTO", cartoHead(), `
<div id="map"></div>
<div class="story" id="story">
  <h3>Prague chapters</h3>
  <div class="chapter active" data-chapter="0"><strong>Old Town</strong><p>Start at the historic core.</p></div>
  <div class="chapter" data-chapter="1"><strong>Castle</strong><p>Fly west to the castle ridge.</p></div>
  <div class="chapter" data-chapter="2"><strong>River bend</strong><p>Follow the Vltava south.</p></div>
</div>
<script>
${cartoBoot()}
  const chapters = [
    { center: [14.4178, 50.1167], zoom: 13, pitch: 20, bearing: 0 },
    { center: [14.4005, 50.0865], zoom: 14, pitch: 45, bearing: -30 },
    { center: [14.414, 50.07], zoom: 13, pitch: 30, bearing: 40 }
  ];
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), ...chapters[0]
  });
  document.querySelectorAll(".chapter").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".chapter").forEach((c) => c.classList.remove("active"));
      el.classList.add("active");
      const i = Number(el.getAttribute("data-chapter"));
      map.flyTo({ ...chapters[i], duration: 2000 });
    });
  });
  window.__MAP__ = map;
</script>`);
    },
    S12() {
      return shell("S12 Layer Studio - CARTO", cartoHead(), `
<div class="panel">
  <strong>Layer studio</strong>
  <label><input type="checkbox" data-layer="heat" checked /> Heat circles</label>
  <label><input type="checkbox" data-layer="line" checked /> Corridor</label>
  <label><input type="checkbox" data-layer="pts" checked /> Sites</label>
  <label>Opacity <input id="op" type="range" min="0" max="100" value="70" /></label>
  <label>Filter <input id="filt" type="range" min="0" max="10" value="0" /></label>
  <div class="legend">Legend: heat · corridor · sites</div>
</div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 12
  });
  map.on("load", () => {
    map.addSource("heat", { type: "geojson", data: { type: "FeatureCollection", features: [
      { type: "Feature", geometry: { type: "Point", coordinates: [14.42, 50.11] } },
      { type: "Feature", geometry: { type: "Point", coordinates: [14.40, 50.09] } }
    ]}});
    map.addSource("line", { type: "geojson", data: { type: "Feature", geometry: {
      type: "LineString", coordinates: [[14.40, 50.12], [14.43, 50.08]]
    }}});
    map.addSource("pts", { type: "geojson", data: { type: "FeatureCollection", features: [
      { type: "Feature", properties: { id: 0 }, geometry: { type: "Point", coordinates: [14.41, 50.10] } },
      { type: "Feature", properties: { id: 1 }, geometry: { type: "Point", coordinates: [14.42, 50.085] } }
    ]}});
    map.addLayer({ id: "heat", type: "circle", source: "heat",
      paint: { "circle-radius": 40, "circle-color": "#f87171", "circle-opacity": 0.35 } });
    map.addLayer({ id: "line", type: "line", source: "line",
      paint: { "line-color": "#2fb67c", "line-width": 4 } });
    map.addLayer({ id: "pts", type: "circle", source: "pts",
      paint: { "circle-radius": 6, "circle-color": "#7dd3a7" } });
    document.querySelectorAll("[data-layer]").forEach((el) => {
      el.addEventListener("change", () => {
        map.setLayoutProperty(el.getAttribute("data-layer"), "visibility", el.checked ? "visible" : "none");
      });
    });
    document.getElementById("op").oninput = (e) => {
      const o = Number(e.target.value) / 100;
      map.setPaintProperty("heat", "circle-opacity", o * 0.5);
      map.setPaintProperty("line", "line-opacity", o);
    };
    document.getElementById("filt").oninput = (e) => {
      map.setFilter("pts", [">=", ["get", "id"], Number(e.target.value)]);
    };
  });
  window.__MAP__ = map;
</script>`);
    },
    S13() {
      return shell("S13 Swipe - CARTO", cartoHead(), `
<style>
  #wrap{position:relative;height:100%;}
  #mapA,#mapB{position:absolute;inset:0;}
  #mapB{clip-path: inset(0 0 0 50%);}
  #bar{position:absolute;top:0;bottom:0;left:50%;width:4px;background:#fff;z-index:3;cursor:ew-resize;}
</style>
<div id="wrap">
  <div id="mapA"></div>
  <div id="mapB"></div>
  <div id="bar"></div>
</div>
<script>
${cartoBoot()}
  const a = new maplibregl.Map({
    container: "mapA", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 12
  });
  const b = new maplibregl.Map({
    container: "mapB", style: styleUrl("voyager-gl-style"), center: ${PRAGUE}, zoom: 12
  });
  function bind(x, y) {
    x.on("move", () => {
      if (y.__lock) return;
      y.__lock = true;
      y.jumpTo({ center: x.getCenter(), zoom: x.getZoom() });
      y.__lock = false;
    });
  }
  bind(a, b); bind(b, a);
  const bar = document.getElementById("bar");
  const mapB = document.getElementById("mapB");
  bar.onpointerdown = () => {
    const move = (ev) => {
      const r = document.getElementById("wrap").getBoundingClientRect();
      const pct = Math.min(90, Math.max(10, ((ev.clientX - r.left) / r.width) * 100));
      bar.style.left = pct + "%";
      mapB.style.clipPath = "inset(0 0 0 " + pct + "%)";
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  window.__MAP__ = a;
</script>`);
    },
    S14() {
      return shell("S14 Playback - CARTO", cartoHead(), `
<div class="panel">
  <button type="button" id="play">Play</button>
  <input id="scrubber" type="range" min="0" max="23" value="8" />
  <span id="label">08:00</span>
</div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 12
  });
  let hour = 8, playing = false, raf = null;
  function setHour(h) {
    hour = h;
    document.getElementById("scrubber").value = h;
    document.getElementById("label").textContent = String(h).padStart(2, "0") + ":00";
    map.setStyle(styleUrl(h >= 18 || h < 6 ? "dark-matter-gl-style" : "positron-gl-style"));
  }
  document.getElementById("scrubber").oninput = (e) => setHour(Number(e.target.value));
  document.getElementById("play").onclick = () => {
    playing = !playing;
    if (!playing) { cancelAnimationFrame(raf); return; }
    let last = 0;
    function tick(ts) {
      if (!playing) return;
      if (ts - last > 400) { last = ts; setHour((hour + 1) % 24); }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  };
  setHour(8);
  window.__MAP__ = map;
</script>`);
    },
    S15() {
      return shell("S15 On-street Drive - CARTO", cartoHead(), `
<div class="panel">
  <strong>Drive</strong>
  <p>Arrow keys / WASD · follow cam on street route</p>
</div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"),
    center: ${PRAGUE}, zoom: 15, pitch: 45
  });
  let path = [], progress = 0, keys = {}, car = null;
  map.on("load", async () => {
    car = new maplibregl.Marker().setLngLat(${PRAGUE}).addTo(map);
    const data = await (await fetch(lds("routing", {
      waypoints: "14.4178,50.1167;14.4005,50.0865",
      mode: "car"
    }), { headers: authHeaders() })).json();
    const g = pickGeom(data);
    path = (g && g.coordinates) || (g && g.geometry && g.geometry.coordinates) || [];
    if (path.length > 1) {
      map.addSource("track", { type: "geojson", data: {
        type: "Feature", geometry: { type: "LineString", coordinates: path }
      }});
      map.addLayer({ id: "track", type: "line", source: "track",
        paint: { "line-color": "#2fb67c", "line-width": 4 } });
    }
  });
  window.addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
  function tick() {
    if (path.length > 1 && car) {
      if (keys["arrowup"] || keys.w) progress = Math.min(1, progress + 0.004);
      if (keys["arrowdown"] || keys.s) progress = Math.max(0, progress - 0.004);
      const i = Math.min(path.length - 2, Math.floor(progress * (path.length - 1)));
      const t = progress * (path.length - 1) - i;
      const a = path[i], b = path[i + 1];
      const pos = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      car.setLngLat(pos);
      map.setCenter(pos);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.__MAP__ = map;
</script>`);
    },
    N01() {
      return shell("N01 Directions - CARTO", cartoHead(), `
<div class="panel"><strong>Directions</strong><button type="button" id="go">Route</button></div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 12
  });
  document.getElementById("go").onclick = async () => {
    const data = await (await fetch(lds("routing", {
      waypoints: "14.4178,50.1167;14.4005,50.0865",
      mode: "car"
    }), { headers: authHeaders() })).json();
    const g = pickGeom(data);
    const coords = (g && g.coordinates) || (g && g.geometry && g.geometry.coordinates) || [];
    if (map.getSource("route")) { map.removeLayer("route"); map.removeSource("route"); }
    map.addSource("route", { type: "geojson", data: {
      type: "Feature", geometry: { type: "LineString", coordinates: coords }
    }});
    map.addLayer({ id: "route", type: "line", source: "route",
      paint: { "line-color": "#2fb67c", "line-width": 5 } });
  };
  window.__MAP__ = map;
</script>`);
    },
    N02() {
      return shell("N02 Geocode + Route - CARTO", cartoHead(), `
<div class="panel">
  <input id="from" placeholder="From" value="Old Town Square, Prague" />
  <input id="to" placeholder="To" value="Prague Castle" />
  <button type="button" id="go">Route</button>
</div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 12
  });
  async function geocode(q) {
    const data = await (await fetch(lds("geocoding/geocode", { address: q }), { headers: authHeaders() })).json();
    const c = pickCoords(data);
    if (!c) throw new Error("geocode miss");
    return c;
  }
  document.getElementById("go").onclick = async () => {
    const data = await (await fetch(lds("routing", {
      waypoints: "14.4178,50.1167;14.4005,50.0865",
      mode: "car"
    }), { headers: authHeaders() })).json();
    const g = pickGeom(data);
    const coords = (g && g.coordinates) || (g && g.geometry && g.geometry.coordinates) || [];
    if (map.getSource("route")) { map.removeLayer("route"); map.removeSource("route"); }
    map.addSource("route", { type: "geojson", data: {
      type: "Feature", geometry: { type: "LineString", coordinates: coords }
    }});
    map.addLayer({ id: "route", type: "line", source: "route",
      paint: { "line-width": 5, "line-color": "#2fb67c" } });
  };
  window.__MAP__ = map;
</script>`);
    },
    N03() {
      return shell("N03 Isochrone - CARTO", cartoHead(), `
<div class="panel"><strong>Reachability</strong><button type="button" id="go">15 min isoline</button></div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 11
  });
  document.getElementById("go").onclick = async () => {
    const data = await (await fetch(lds("isolines", {
      geom: "POINT(14.4178 50.1167)",
      mode: "car",
      range_value_seconds: "900"
    }), { headers: authHeaders() })).json();
    const g = pickGeom(data);
    const coords = (g && g.coordinates) || (g && g.geometry && g.geometry.coordinates) || [];
    if (map.getSource("iso")) { map.removeLayer("iso"); map.removeSource("iso"); }
    map.addSource("iso", { type: "geojson", data: {
      type: "Feature", geometry: { type: g && g.type === "MultiPolygon" ? "MultiPolygon" : "Polygon", coordinates: coords }
    }});
    map.addLayer({ id: "iso", type: "fill", source: "iso",
      paint: { "fill-color": "#2fb67c", "fill-opacity": 0.35 } });
  };
  window.__MAP__ = map;
</script>`);
    },
    M01() {
      return shell(
        "M01 Responsive - CARTO",
        cartoHead() +
          `<style>@media (max-width: 520px) { .panel { max-width: 94vw; } button { min-height: 44px; padding: 12px 14px; } }</style>`,
        `
<div class="panel">
  <strong>Touch map</strong>
  <button type="button" id="in">Zoom in</button>
  <button type="button" id="out">Zoom out</button>
</div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 12
  });
  document.getElementById("in").onclick = () => map.zoomIn();
  document.getElementById("out").onclick = () => map.zoomOut();
  window.__MAP__ = map;
</script>`
      );
    },
    M02() {
      return shell("M02 Locate - CARTO", cartoHead(), `
<div class="panel">
  <button type="button" id="locate">Locate me</button>
  <div id="msg"></div>
</div>
<div id="map"></div>
<script>
${cartoBoot()}
  const map = new maplibregl.Map({
    container: "map", style: styleUrl("positron-gl-style"), center: ${PRAGUE}, zoom: 12
  });
  let marker = null;
  document.getElementById("locate").onclick = () => {
    if (!navigator.geolocation) {
      document.getElementById("msg").textContent = "Geolocation unavailable";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = [pos.coords.longitude, pos.coords.latitude];
        if (marker) marker.remove();
        marker = new maplibregl.Marker().setLngLat(p).addTo(map);
        map.flyTo({ center: p, zoom: 14 });
        document.getElementById("msg").textContent = "Located";
      },
      () => { document.getElementById("msg").textContent = "Permission denied"; }
    );
  };
  window.__MAP__ = map;
</script>`);
    },
  };

  function degradeCarto(id, html) {
    let out = html;
    out = out.replace(
      /if \(!token \|\| token === "YOUR_CARTO_API_ACCESS_TOKEN"\) throw new Error\("Missing CARTO_API_ACCESS_TOKEN"\);\s*/g,
      ""
    );
    switch (id) {
      case "S01":
        out = out.replace("zoom: 12", "zoom: 4");
        break;
      case "S02":
        out = out.replace(
          /const pins = \[[\s\S]*?\];/,
          'const pins = [{ lngLat: [14.4178, 50.1167], text: "Only one" }];'
        );
        break;
      case "S05":
        out = out.replace(
          /function debounce\(fn, ms\) \{[\s\S]*?\};/,
          "function debounce(fn, ms) { return fn; }"
        );
        out = out.replace(/map\.on\("click", async \(e\) => \{[\s\S]*?\}\);/, "/* click reverse omitted */");
        break;
      case "S07":
        out = out.replace(/overview\.on\("click",[\s\S]*?\);/, "");
        break;
      case "S10":
        out = out.replace("for (let i = 0; i < 5000; i++)", "for (let i = 0; i < 800; i++)");
        break;
      case "S11":
        out = out.replace(
          /map\.flyTo\(\{ \.\.\.chapters\[i\], duration: 2000 \}\);/,
          "map.setZoom(chapters[i].zoom); /* chapter camera incomplete */"
        );
        break;
      case "S12":
        out = out.replace(/document\.getElementById\("filt"\)\.oninput =[\s\S]*?;/, "");
        break;
      case "S14":
        out = out.replace(
          /document\.getElementById\("scrubber"\)\.oninput = \(e\) => setHour\(Number\(e\.target\.value\)\);/,
          ""
        );
        break;
      case "N01":
        out = out.replace(
          /map\.addLayer\(\{ id: "route"[\s\S]*?\}\);/,
          "/* line layer missing */"
        );
        break;
      case "N03":
        out = out.replace(
          /map\.addLayer\(\{ id: "iso"[\s\S]*?\}\);/,
          "/* isochrone fill omitted */"
        );
        break;
      case "M01":
        out = out.replace(/@media \(max-width: 520px\) \{[\s\S]*?\}/, "");
        out = out.replace(/min-height: 44px;/g, "min-height: 24px;");
        break;
      case "M02":
        out = out.replace(
          /navigator\.geolocation\.getCurrentPosition\([\s\S]*?\);/,
          'document.getElementById("msg").textContent = "permission UX incomplete"; /* geolocation call omitted */'
        );
        break;
      default:
        break;
    }
    return out;
  }

  return { carto, degradeCarto };
};
