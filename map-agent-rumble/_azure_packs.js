/**
 * Azure Maps Web SDK packs for the Royal Rumble.
 * Intentionally imperfect (see degradeAzure) - skill-agent quality, not gold.
 */
module.exports = function buildAzurePacks({ shell }) {
  function azureHead() {
    return `<link rel="stylesheet" href="https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css" type="text/css" />
  <script src="https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js"></script>
  <script src="../../admin-boundaries/js/config.js"></script>`;
  }

  function azBoot(extra = "") {
    return `
  const key = window.AZURE_MAPS_SUBSCRIPTION_KEY;
  if (!key || key === "YOUR_AZURE_MAPS_SUBSCRIPTION_KEY") throw new Error("Missing AZURE_MAPS_SUBSCRIPTION_KEY");
  ${extra}`;
  }

  const PRAGUE = "[14.4178, 50.1167]";

  function mapOpts(extra = "") {
    return `{
    center: ${PRAGUE},
    zoom: 12,
    authOptions: { authType: "subscriptionKey", subscriptionKey: key }
    ${extra ? "," + extra : ""}
  }`;
  }

  const azure = {
    S01() {
      return shell("S01 Hello Map - Azure", azureHead(), `
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts()});
  map.events.add("ready", () => {
    window.__MAP__ = map;
    parent.postMessage({ type: "rumble-ready", fighter: "azure", skill: "S01" }, "*");
  });
</script>`);
    },
    S02() {
      return shell("S02 Pins - Azure", azureHead(), `
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts()});
  map.events.add("ready", () => {
    const pins = [
      { position: [14.4178, 50.1167], text: "Old Town" },
      { position: [14.4005, 50.0865], text: "Castle" },
      { position: [14.4301, 50.0792], text: "Vysehrad" }
    ];
    pins.forEach((p) => {
      const m = new atlas.HtmlMarker({
        position: p.position,
        popup: new atlas.Popup({ content: p.text, pixelOffset: [0, -30] })
      });
      map.markers.add(m);
      map.events.add("click", m, () => m.togglePopup());
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S03() {
      return shell("S03 Style Switcher - Azure", azureHead(), `
<div class="panel">
  <strong>Styles</strong>
  <button type="button" data-style="road">Road</button>
  <button type="button" data-style="satellite">Satellite</button>
  <button type="button" data-style="grayscale_dark">Gray dark</button>
  <button type="button" data-style="night">Night</button>
</div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts('style: "road"')});
  map.events.add("ready", () => {
    document.querySelectorAll("[data-style]").forEach((btn) => {
      btn.addEventListener("click", () => map.setStyle({ style: btn.getAttribute("data-style") }));
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S04() {
      return shell("S04 Atmosphere - Azure", azureHead(), `
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", {
    center: [-122.42, 37.78],
    zoom: 13,
    pitch: 45,
    style: "grayscale_dark",
    authOptions: { authType: "subscriptionKey", subscriptionKey: key }
  });
  map.events.add("ready", () => { window.__MAP__ = map; });
</script>`);
    },
    S05() {
      return shell("S05 Geocode - Azure", azureHead(), `
<div class="panel">
  <strong>Geocode</strong>
  <input id="q" type="search" placeholder="Search address" />
  <div id="out"></div>
</div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts()});
  let marker = null;
  let t = null;
  function debounce(fn, ms) {
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
  async function forward(q) {
    const url = "https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=" +
      encodeURIComponent(key) + "&query=" + encodeURIComponent(q) + "&limit=1";
    const data = await (await fetch(url)).json();
    const r = data.results && data.results[0];
    if (!r) return;
    const pos = [r.position.lon, r.position.lat];
    if (marker) map.markers.remove(marker);
    marker = new atlas.HtmlMarker({ position: pos });
    map.markers.add(marker);
    map.setCamera({ center: pos, zoom: 14, type: "ease" });
    document.getElementById("out").textContent = r.address.freeformAddress;
  }
  map.events.add("ready", () => {
    document.getElementById("q").addEventListener("input", debounce((e) => {
      const q = e.target.value.trim();
      if (q.length > 2) forward(q);
    }, 350));
    map.events.add("click", async (e) => {
      const [lng, lat] = e.position;
      const url = "https://atlas.microsoft.com/search/address/reverse/json?api-version=1.0&subscription-key=" +
        encodeURIComponent(key) + "&query=" + lat + "," + lng;
      const data = await (await fetch(url)).json();
      const r = data.addresses && data.addresses[0];
      if (!r) return;
      document.getElementById("out").textContent = r.address.freeformAddress;
      if (marker) map.markers.remove(marker);
      marker = new atlas.HtmlMarker({ position: e.position });
      map.markers.add(marker);
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S06() {
      return shell("S06 Camera Tour - Azure", azureHead(), `
<div class="panel"><button type="button" id="go">Play tour</button></div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts("pitch: 0, bearing: 0")});
  map.events.add("ready", () => {
    document.getElementById("go").onclick = () => {
      map.setCamera({ center: [14.4005, 50.0865], zoom: 14, pitch: 45, bearing: -30, type: "fly", duration: 2000 });
      setTimeout(() => {
        map.setCamera({ center: [14.414, 50.07], bearing: 40, type: "fly", duration: 2000 });
      }, 2100);
    };
    window.__MAP__ = map;
  });
</script>`);
    },
    S07() {
      return shell("S07 Inset - Azure", azureHead(), `
<style>#overview{position:absolute;right:12px;bottom:12px;width:160px;height:120px;z-index:2;border:2px solid #fff;}</style>
<div id="map"></div>
<div id="overview"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts("zoom: 13")});
  const overview = new atlas.Map("overview", {
    center: ${PRAGUE},
    zoom: 9,
    interactive: false,
    authOptions: { authType: "subscriptionKey", subscriptionKey: key }
  });
  let rect = null;
  map.events.add("ready", () => {
    overview.events.add("ready", () => {
      const ds = new atlas.source.DataSource();
      overview.sources.add(ds);
      overview.layers.add(new atlas.layer.PolygonLayer(ds, null, {
        strokeColor: "#60a5fa", strokeWidth: 2, fillOpacity: 0.08
      }));
      function sync() {
        const cam = map.getCamera();
        const b = map.getCamera().bounds;
        overview.setCamera({ center: cam.center });
        if (b) {
          ds.clear();
          ds.add(new atlas.Shape(new atlas.data.Polygon([[
            [b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]
          ]])));
        }
      }
      map.events.add("moveend", sync);
      overview.events.add("click", (e) => map.setCamera({ center: e.position, type: "ease" }));
      sync();
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S08() {
      return shell("S08 Extrusion - Azure", azureHead(), `
<div class="panel"><strong>3D buildings</strong><p>Azure pitch view - honest vendor gap on fill-extrusion height expr.</p></div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts("zoom: 16, pitch: 45, bearing: 20")});
  map.events.add("ready", () => { window.__MAP__ = map; });
</script>`);
    },
    S09() {
      return shell("S09 Terrain - Azure", azureHead(), `
<div class="panel"><strong>Terrain</strong><p>Honest: no DEM exaggeration in this pack - pitch fly only.</p></div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", {
    center: [8.6, 46.5],
    zoom: 12,
    pitch: 45,
    style: "road",
    authOptions: { authType: "subscriptionKey", subscriptionKey: key }
  });
  map.events.add("ready", () => {
    map.setCamera({ center: [8.6, 46.5], zoom: 12, pitch: 60, type: "fly", duration: 2500 });
    window.__MAP__ = map;
  });
</script>`);
    },
    S10() {
      return shell("S10 Cluster - Azure", azureHead(), `
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", {
    center: [14.4, 50.08],
    zoom: 10,
    authOptions: { authType: "subscriptionKey", subscriptionKey: key }
  });
  map.events.add("ready", () => {
    const ds = new atlas.source.DataSource(null, { cluster: true, clusterRadius: 45 });
    map.sources.add(ds);
    const features = [];
    for (let i = 0; i < 5000; i++) {
      features.push(new atlas.data.Feature(new atlas.data.Point([
        14.2 + Math.random() * 0.5, 49.95 + Math.random() * 0.35
      ]), { id: i }));
    }
    ds.add(features);
    map.layers.add(new atlas.layer.BubbleLayer(ds, null, {
      radius: 8, color: "#60a5fa", strokeWidth: 0
    }));
    window.__MAP__ = map;
  });
</script>`);
    },
    S11() {
      return shell("S11 Story Map - Azure", azureHead(), `
<div id="map"></div>
<div class="story" id="story">
  <h3>Prague chapters</h3>
  <div class="chapter active" data-chapter="0"><strong>Old Town</strong><p>Start at the historic core.</p></div>
  <div class="chapter" data-chapter="1"><strong>Castle</strong><p>Fly west to the castle ridge.</p></div>
  <div class="chapter" data-chapter="2"><strong>River bend</strong><p>Follow the Vltava south.</p></div>
</div>
<script>
${azBoot()}
  const chapters = [
    { center: [14.4178, 50.1167], zoom: 13, pitch: 20, bearing: 0 },
    { center: [14.4005, 50.0865], zoom: 14, pitch: 45, bearing: -30 },
    { center: [14.414, 50.07], zoom: 13, pitch: 30, bearing: 40 }
  ];
  const map = new atlas.Map("map", {
    ...chapters[0],
    authOptions: { authType: "subscriptionKey", subscriptionKey: key }
  });
  map.events.add("ready", () => {
    document.querySelectorAll(".chapter").forEach((el) => {
      el.addEventListener("click", () => {
        document.querySelectorAll(".chapter").forEach((c) => c.classList.remove("active"));
        el.classList.add("active");
        const i = Number(el.getAttribute("data-chapter"));
        map.setCamera({ ...chapters[i], type: "fly", duration: 2000 });
      });
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S12() {
      return shell("S12 Layer Studio - Azure", azureHead(), `
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
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts()});
  map.events.add("ready", () => {
    const heatDs = new atlas.source.DataSource();
    const lineDs = new atlas.source.DataSource();
    const ptsDs = new atlas.source.DataSource();
    map.sources.add([heatDs, lineDs, ptsDs]);
    heatDs.add([
      new atlas.data.Feature(new atlas.data.Point([14.42, 50.11]), { r: 600 }),
      new atlas.data.Feature(new atlas.data.Point([14.40, 50.09]), { r: 500 })
    ]);
    lineDs.add(new atlas.data.Feature(new atlas.data.LineString([[14.40, 50.12], [14.43, 50.08]])));
    ptsDs.add([
      new atlas.data.Feature(new atlas.data.Point([14.41, 50.10])),
      new atlas.data.Feature(new atlas.data.Point([14.42, 50.085]))
    ]);
    const heat = new atlas.layer.BubbleLayer(heatDs, "heat", { radius: 30, color: "#f87171", opacity: 0.35 });
    const line = new atlas.layer.LineLayer(lineDs, "line", { strokeColor: "#6ec8ff", strokeWidth: 4 });
    const pts = new atlas.layer.SymbolLayer(ptsDs, "pts", {});
    map.layers.add([heat, line, pts]);
    const layers = { heat, line, pts };
    document.querySelectorAll("[data-layer]").forEach((el) => {
      el.addEventListener("change", () => {
        layers[el.getAttribute("data-layer")].setOptions({ visible: el.checked });
      });
    });
    document.getElementById("op").oninput = (e) => {
      const o = Number(e.target.value) / 100;
      heat.setOptions({ opacity: o * 0.5 });
      line.setOptions({ strokeOpacity: o });
    };
    document.getElementById("filt").oninput = (e) => {
      const n = Number(e.target.value);
      ptsDs.clear();
      if (n < 1) ptsDs.add(new atlas.data.Feature(new atlas.data.Point([14.41, 50.10])));
      if (n < 2) ptsDs.add(new atlas.data.Feature(new atlas.data.Point([14.42, 50.085])));
    };
    window.__MAP__ = map;
  });
</script>`);
    },
    S13() {
      return shell("S13 Swipe - Azure", azureHead(), `
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
${azBoot()}
  const opts = { center: ${PRAGUE}, zoom: 12, authOptions: { authType: "subscriptionKey", subscriptionKey: key } };
  const a = new atlas.Map("mapA", { ...opts, style: "road" });
  const b = new atlas.Map("mapB", { ...opts, style: "satellite" });
  function bind(x, y) {
    x.events.add("move", () => {
      if (y.__lock) return;
      y.__lock = true;
      const c = x.getCamera();
      y.setCamera({ center: c.center, zoom: c.zoom });
      y.__lock = false;
    });
  }
  a.events.add("ready", () => {
    b.events.add("ready", () => {
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
    });
  });
</script>`);
    },
    S14() {
      return shell("S14 Playback - Azure", azureHead(), `
<div class="panel">
  <button type="button" id="play">Play</button>
  <input id="scrubber" type="range" min="0" max="23" value="8" />
  <span id="label">08:00</span>
</div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts()});
  let hour = 8, playing = false, raf = null;
  function setHour(h) {
    hour = h;
    document.getElementById("scrubber").value = h;
    document.getElementById("label").textContent = String(h).padStart(2, "0") + ":00";
    map.setStyle({ style: h >= 18 || h < 6 ? "night" : "road" });
  }
  map.events.add("ready", () => {
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
  });
</script>`);
    },
    S15() {
      return shell("S15 On-street Drive - Azure", azureHead(), `
<div class="panel">
  <strong>Drive</strong>
  <p>Arrow keys / WASD · follow cam on street route</p>
</div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts("zoom: 15, pitch: 45")});
  let path = [], progress = 0, keys = {}, car = null, lineDs = null;
  map.events.add("ready", async () => {
    lineDs = new atlas.source.DataSource();
    map.sources.add(lineDs);
    map.layers.add(new atlas.layer.LineLayer(lineDs, null, { strokeColor: "#6ec8ff", strokeWidth: 4 }));
    car = new atlas.HtmlMarker({ position: ${PRAGUE} });
    map.markers.add(car);
    const url = "https://atlas.microsoft.com/route/directions/json?api-version=1.0&subscription-key=" +
      encodeURIComponent(key) +
      "&query=50.1167,14.4178:50.0865,14.4005";
    const data = await (await fetch(url)).json();
    const pts = (((data.routes || [])[0] || {}).legs || []).flatMap((leg) =>
      (leg.points || []).map((p) => [p.longitude, p.latitude])
    );
    if (pts.length > 1) {
      path = pts;
      lineDs.add(new atlas.data.Feature(new atlas.data.LineString(path)));
    }
    window.addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; });
    window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
    function tick() {
      if (path.length > 1) {
        if (keys["arrowup"] || keys.w) progress = Math.min(1, progress + 0.004);
        if (keys["arrowdown"] || keys.s) progress = Math.max(0, progress - 0.004);
        const i = Math.min(path.length - 2, Math.floor(progress * (path.length - 1)));
        const t = progress * (path.length - 1) - i;
        const a = path[i], b = path[i + 1];
        const pos = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        car.setOptions({ position: pos });
        map.setCamera({ center: pos });
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    window.__MAP__ = map;
  });
</script>`);
    },
    N01() {
      return shell("N01 Directions - Azure", azureHead(), `
<div class="panel"><strong>Directions</strong><button type="button" id="go">Route</button></div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts()});
  map.events.add("ready", () => {
    const ds = new atlas.source.DataSource();
    map.sources.add(ds);
    map.layers.add(new atlas.layer.LineLayer(ds, "route", { strokeColor: "#60a5fa", strokeWidth: 5 }));
    document.getElementById("go").onclick = async () => {
      const url = "https://atlas.microsoft.com/route/directions/json?api-version=1.0&subscription-key=" +
        encodeURIComponent(key) +
        "&query=50.1167,14.4178:50.0865,14.4005";
      const data = await (await fetch(url)).json();
      const pts = (((data.routes || [])[0] || {}).legs || []).flatMap((leg) =>
        (leg.points || []).map((p) => [p.longitude, p.latitude])
      );
      ds.clear();
      if (pts.length > 1) {
        ds.add(new atlas.data.Feature(new atlas.data.LineString(pts)));
        map.setCamera({ bounds: atlas.data.BoundingBox.fromData(ds.toJson()), padding: 40 });
      }
    };
    window.__MAP__ = map;
  });
</script>`);
    },
    N02() {
      return shell("N02 Geocode + Route - Azure", azureHead(), `
<div class="panel">
  <input id="from" placeholder="From" value="Old Town Square, Prague" />
  <input id="to" placeholder="To" value="Prague Castle" />
  <button type="button" id="go">Route</button>
</div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts()});
  async function geocode(q) {
    const url = "https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=" +
      encodeURIComponent(key) + "&query=" + encodeURIComponent(q) + "&limit=1";
    const data = await (await fetch(url)).json();
    const r = data.results && data.results[0];
    if (!r) throw new Error("geocode miss");
    return { lat: r.position.lat, lon: r.position.lon };
  }
  map.events.add("ready", () => {
    const ds = new atlas.source.DataSource();
    map.sources.add(ds);
    map.layers.add(new atlas.layer.LineLayer(ds, null, { strokeWidth: 5, strokeColor: "#60a5fa" }));
    document.getElementById("go").onclick = async () => {
      const a = await geocode(document.getElementById("from").value);
      const b = await geocode(document.getElementById("to").value);
      const url = "https://atlas.microsoft.com/route/directions/json?api-version=1.0&subscription-key=" +
        encodeURIComponent(key) + "&query=" + a.lat + "," + a.lon + ":" + b.lat + "," + b.lon;
      const data = await (await fetch(url)).json();
      const pts = (((data.routes || [])[0] || {}).legs || []).flatMap((leg) =>
        (leg.points || []).map((p) => [p.longitude, p.latitude])
      );
      ds.clear();
      if (pts.length > 1) ds.add(new atlas.data.Feature(new atlas.data.LineString(pts)));
    };
    window.__MAP__ = map;
  });
</script>`);
    },
    N03() {
      return shell("N03 Isochrone - Azure", azureHead(), `
<div id="map" style="display:flex;align-items:center;justify-content:center;background:#06141a;color:#8fadb8;">
  <div class="panel" style="position:static;max-width:28rem;">
    <strong>N03 Reachability</strong>
    <p>Azure Maps seat: no isochrone pack wired here. N/A - not an F.</p>
    <p>capability gap · isochrone</p>
  </div>
</div>`);
    },
    M01() {
      return shell(
        "M01 Responsive - Azure",
        azureHead() +
          `<style>@media (max-width: 520px) { .panel { max-width: 94vw; } button { min-height: 44px; padding: 12px 14px; } }</style>`,
        `
<div class="panel">
  <strong>Touch map</strong>
  <button type="button" id="in">Zoom in</button>
  <button type="button" id="out">Zoom out</button>
</div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts()});
  map.events.add("ready", () => {
    document.getElementById("in").onclick = () => map.setCamera({ zoom: map.getCamera().zoom + 1 });
    document.getElementById("out").onclick = () => map.setCamera({ zoom: map.getCamera().zoom - 1 });
    window.__MAP__ = map;
  });
</script>`
      );
    },
    M02() {
      return shell("M02 Locate - Azure", azureHead(), `
<div class="panel">
  <button type="button" id="locate">Locate me</button>
  <div id="msg"></div>
</div>
<div id="map"></div>
<script>
${azBoot()}
  const map = new atlas.Map("map", ${mapOpts()});
  map.events.add("ready", () => {
    let marker = null;
    document.getElementById("locate").onclick = () => {
      if (!navigator.geolocation) {
        document.getElementById("msg").textContent = "Geolocation unavailable";
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = [pos.coords.longitude, pos.coords.latitude];
          if (marker) map.markers.remove(marker);
          marker = new atlas.HtmlMarker({ position: p });
          map.markers.add(marker);
          map.setCamera({ center: p, zoom: 14, type: "ease" });
          document.getElementById("msg").textContent = "Located";
        },
        () => { document.getElementById("msg").textContent = "Permission denied"; }
      );
    };
    window.__MAP__ = map;
  });
</script>`);
    },
  };

  function degradeAzure(id, html) {
    let out = html;
    out = out.replace(
      /if \(!key \|\| key === "YOUR_AZURE_MAPS_SUBSCRIPTION_KEY"\) throw new Error\("Missing AZURE_MAPS_SUBSCRIPTION_KEY"\);\s*/g,
      ""
    );
    switch (id) {
      case "S01":
        out = out.replace("zoom: 12", "zoom: 4");
        break;
      case "S02":
        out = out.replace(
          /const pins = \[[\s\S]*?\];/,
          'const pins = [{ position: [14.4178, 50.1167], text: "Only one" }];'
        );
        break;
      case "S05":
        out = out.replace(
          /function debounce\(fn, ms\) \{[\s\S]*?\};/,
          "function debounce(fn, ms) { return fn; }"
        );
        out = out.replace(/map\.events\.add\("click", async \(e\) => \{[\s\S]*?\}\);/, "/* click reverse omitted */");
        break;
      case "S07":
        out = out.replace(/overview\.events\.add\("click",[\s\S]*?\);/, "");
        break;
      case "S10":
        out = out.replace("for (let i = 0; i < 5000; i++)", "for (let i = 0; i < 800; i++)");
        out = out.replace("cluster: true", "cluster: false");
        break;
      case "S11":
        out = out.replace(
          /map\.setCamera\(\{ \.\.\.chapters\[i\], type: "fly", duration: 2000 \}\);/,
          'map.setCamera({ zoom: chapters[i].zoom }); /* chapter camera incomplete */'
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
          /map\.layers\.add\(new atlas\.layer\.LineLayer\(ds, "route"[\s\S]*?\)\);/,
          "/* line layer missing */"
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

  return { azure, degradeAzure };
};
