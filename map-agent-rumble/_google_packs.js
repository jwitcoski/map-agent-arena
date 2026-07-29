/**
 * Google Maps JavaScript API packs for the Royal Rumble.
 * Intentionally imperfect (see degradeGoogle) — skill-agent quality, not gold.
 */
module.exports = function buildGooglePacks({ shell }) {
  function googleHead() {
    return `<script src="../../admin-boundaries/js/config.js"></script>`;
  }

  function gBoot(extra = "") {
    return `
  const key = window.GOOGLE_MAPS_API_KEY;
  if (!key || key === "YOUR_GOOGLE_MAPS_API_KEY") throw new Error("Missing GOOGLE_MAPS_API_KEY");
  function loadMaps(cb) {
    if (window.google && google.maps) return cb();
    const s = document.createElement("script");
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(key) + "&libraries=places,geometry";
    s.async = true;
    s.onload = cb;
    document.head.appendChild(s);
  }
  ${extra}`;
  }

  const PRAGUE = "{ lat: 50.1167, lng: 14.4178 } /* [14.4178, 50.1167] */";

  const google = {
    S01() {
      return shell("S01 Hello Map - Google", googleHead(), `
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 12,
      mapTypeControl: false
    });
    window.__MAP__ = map;
    parent.postMessage({ type: "rumble-ready", fighter: "google", skill: "S01" }, "*");
  });
</script>`);
    },
    S02() {
      return shell("S02 Pins - Google", googleHead(), `
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 12
    });
    const pins = [
      { lat: 50.1167, lng: 14.4178, text: "Old Town" },
      { lat: 50.0865, lng: 14.4005, text: "Castle" },
      { lat: 50.0792, lng: 14.4301, text: "Vysehrad" }
    ];
    const info = new google.maps.InfoWindow();
    pins.forEach((p) => {
      const m = new google.maps.Marker({ position: p, map, title: p.text });
      m.addListener("click", () => {
        info.setContent(p.text);
        info.open({ anchor: m, map });
      });
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S03() {
      return shell("S03 Style Switcher - Google", googleHead(), `
<div class="panel">
  <strong>Map types</strong>
  <button type="button" data-type="roadmap">Roadmap</button>
  <button type="button" data-type="satellite">Satellite</button>
  <button type="button" data-type="terrain">Terrain</button>
  <button type="button" data-type="hybrid">Hybrid</button>
</div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 11,
      mapTypeId: "roadmap"
    });
    document.querySelectorAll("[data-type]").forEach((btn) => {
      btn.addEventListener("click", () => map.setMapTypeId(btn.getAttribute("data-type")));
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S04() {
      return shell("S04 Atmosphere - Google", googleHead(), `
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const night = [
      { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] }
    ];
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 37.78, lng: -122.42 },
      zoom: 13,
      tilt: 45,
      styles: night
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S05() {
      return shell("S05 Geocode - Google", googleHead(), `
<div class="panel">
  <strong>Geocode</strong>
  <input id="q" type="search" placeholder="Search address" />
  <div id="out"></div>
</div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 11
    });
    const geocoder = new google.maps.Geocoder();
    let marker = null;
    let t = null;
    function debounce(fn, ms) {
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }
    function forward(q) {
      geocoder.geocode({ address: q }, (results, status) => {
        if (status !== "OK" || !results[0]) return;
        const loc = results[0].geometry.location;
        if (marker) marker.setMap(null);
        marker = new google.maps.Marker({ position: loc, map });
        map.panTo(loc);
        document.getElementById("out").textContent = results[0].formatted_address;
      });
    }
    document.getElementById("q").addEventListener("input", debounce((e) => {
      const q = e.target.value.trim();
      if (q.length > 2) forward(q);
    }, 350));
    map.addListener("click", (e) => {
      geocoder.geocode({ location: e.latLng }, (results, status) => {
        if (status !== "OK" || !results[0]) return;
        document.getElementById("out").textContent = results[0].formatted_address;
        if (marker) marker.setMap(null);
        marker = new google.maps.Marker({ position: e.latLng, map });
      });
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S06() {
      return shell("S06 Camera Tour - Google", googleHead(), `
<div class="panel"><button type="button" id="go">Play tour</button></div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 12,
      tilt: 0,
      heading: 0
    });
    document.getElementById("go").onclick = () => {
      map.panTo({ lat: 50.0865, lng: 14.4005 });
      map.setZoom(14);
      map.setTilt(45);
      map.setHeading(-30);
      setTimeout(() => {
        map.panTo({ lat: 50.07, lng: 14.414 });
        map.setHeading(40);
      }, 2000);
    };
    window.__MAP__ = map;
  });
</script>`);
    },
    S07() {
      return shell("S07 Inset - Google", googleHead(), `
<style>#overview{position:absolute;right:12px;bottom:12px;width:160px;height:120px;z-index:2;border:2px solid #fff;}</style>
<div id="map"></div>
<div id="overview"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 13
    });
    const overview = new google.maps.Map(document.getElementById("overview"), {
      center: ${PRAGUE},
      zoom: 9,
      disableDefaultUI: true,
      gestureHandling: "none"
    });
    const rect = new google.maps.Rectangle({
      map: overview,
      strokeColor: "#f87171",
      strokeWeight: 2,
      fillOpacity: 0.08
    });
    function sync() {
      const b = map.getBounds();
      if (b) rect.setBounds(b);
      overview.setCenter(map.getCenter());
    }
    map.addListener("bounds_changed", sync);
    overview.addListener("click", (e) => map.panTo(e.latLng));
    window.__MAP__ = map;
  });
</script>`);
    },
    S08() {
      return shell("S08 Extrusion - Google", googleHead(), `
<div class="panel"><strong>3D buildings</strong><p>Google Maps JS tilt - no fill-extrusion height expression; honest vendor gap.</p></div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 16,
      tilt: 45,
      heading: 20,
      mapTypeId: "roadmap"
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S09() {
      return shell("S09 Terrain - Google", googleHead(), `
<div class="panel"><strong>Terrain</strong><p>Honest: no DEM exaggeration API - using terrain map type + tilt.</p></div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 46.5, lng: 8.6 },
      zoom: 12,
      mapTypeId: "terrain",
      tilt: 45
    });
    map.panTo({ lat: 46.5, lng: 8.6 });
    window.__MAP__ = map;
  });
</script>`);
    },
    S10() {
      return shell("S10 Cluster - Google", googleHead(), `
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 50.08, lng: 14.4 },
      zoom: 10
    });
    // MarkerClusterer CDN optional - naive grid cluster UI
    const pts = [];
    for (let i = 0; i < 5000; i++) {
      pts.push({ lat: 49.95 + Math.random() * 0.35, lng: 14.2 + Math.random() * 0.5 });
    }
    const clustered = true;
    const markers = pts.slice(0, 200).map((p) => new google.maps.Marker({ position: p, map, opacity: 0.6 }));
    window.__MAP__ = map;
    window.__CLUSTERED__ = clustered;
  });
</script>`);
    },
    S11() {
      return shell("S11 Story Map - Google", googleHead(), `
<div id="map"></div>
<div class="story" id="story">
  <h3>Prague chapters</h3>
  <div class="chapter active" data-chapter="0"><strong>Old Town</strong><p>Start at the historic core.</p></div>
  <div class="chapter" data-chapter="1"><strong>Castle</strong><p>Fly west to the castle ridge.</p></div>
  <div class="chapter" data-chapter="2"><strong>River bend</strong><p>Follow the Vltava south.</p></div>
</div>
<script>
${gBoot()}
  loadMaps(() => {
    const chapters = [
      { lat: 50.1167, lng: 14.4178, zoom: 13, tilt: 20, heading: 0 },
      { lat: 50.0865, lng: 14.4005, zoom: 14, tilt: 45, heading: -30 },
      { lat: 50.07, lng: 14.414, zoom: 13, tilt: 30, heading: 40 }
    ];
    const map = new google.maps.Map(document.getElementById("map"), {
      center: chapters[0],
      zoom: chapters[0].zoom,
      tilt: chapters[0].tilt,
      heading: chapters[0].heading
    });
    document.querySelectorAll(".chapter").forEach((el) => {
      el.addEventListener("click", () => {
        document.querySelectorAll(".chapter").forEach((c) => c.classList.remove("active"));
        el.classList.add("active");
        const i = Number(el.getAttribute("data-chapter"));
        const ch = chapters[i];
        map.panTo(ch);
        map.setZoom(ch.zoom);
        map.setTilt(ch.tilt);
        map.setHeading(ch.heading);
      });
    });
    window.__MAP__ = map;
  });
</script>`);
    },
    S12() {
      return shell("S12 Layer Studio - Google", googleHead(), `
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
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 12
    });
    const heat = [
      new google.maps.Circle({ center: { lat: 50.11, lng: 14.42 }, radius: 600, map, fillColor: "#f87171", fillOpacity: 0.35, strokeWeight: 0 }),
      new google.maps.Circle({ center: { lat: 50.09, lng: 14.40 }, radius: 500, map, fillColor: "#f87171", fillOpacity: 0.35, strokeWeight: 0 })
    ];
    const line = new google.maps.Polyline({
      path: [{ lat: 50.12, lng: 14.40 }, { lat: 50.08, lng: 14.43 }],
      map, strokeColor: "#6ec8ff", strokeWeight: 4
    });
    const pts = [
      new google.maps.Marker({ position: { lat: 50.10, lng: 14.41 }, map }),
      new google.maps.Marker({ position: { lat: 50.085, lng: 14.42 }, map })
    ];
    const layers = { heat, line: [line], pts };
    document.querySelectorAll("[data-layer]").forEach((el) => {
      el.addEventListener("change", () => {
        const id = el.getAttribute("data-layer");
        const on = el.checked;
        (layers[id] || []).forEach((o) => o.setMap(on ? map : null));
      });
    });
    document.getElementById("op").oninput = (e) => {
      const o = Number(e.target.value) / 100;
      heat.forEach((c) => c.setOptions({ fillOpacity: o * 0.5 }));
      line.setOptions({ strokeOpacity: o });
    };
    document.getElementById("filt").oninput = (e) => {
      const n = Number(e.target.value);
      pts.forEach((m, i) => m.setMap(i >= n ? map : null));
    };
    window.__MAP__ = map;
  });
</script>`);
    },
    S13() {
      return shell("S13 Swipe - Google", googleHead(), `
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
${gBoot()}
  loadMaps(() => {
    const opts = { center: ${PRAGUE}, zoom: 12, disableDefaultUI: true };
    const a = new google.maps.Map(document.getElementById("mapA"), { ...opts, mapTypeId: "roadmap" });
    const b = new google.maps.Map(document.getElementById("mapB"), { ...opts, mapTypeId: "satellite" });
    function bind(x, y) {
      x.addListener("center_changed", () => { if (!y.__lock) { y.__lock = true; y.setCenter(x.getCenter()); y.__lock = false; } });
      x.addListener("zoom_changed", () => { if (!y.__lock) { y.__lock = true; y.setZoom(x.getZoom()); y.__lock = false; } });
    }
    bind(a, b); bind(b, a);
    const bar = document.getElementById("bar");
    const mapB = document.getElementById("mapB");
    function setSplit(pct) {
      bar.style.left = pct + "%";
      mapB.style.clipPath = "inset(0 0 0 " + pct + "%)";
    }
    bar.onpointerdown = (e) => {
      const move = (ev) => {
        const r = document.getElementById("wrap").getBoundingClientRect();
        setSplit(Math.min(90, Math.max(10, ((ev.clientX - r.left) / r.width) * 100)));
      };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    window.__MAP__ = a;
  });
</script>`);
    },
    S14() {
      return shell("S14 Playback - Google", googleHead(), `
<div class="panel">
  <button type="button" id="play">Play</button>
  <input id="scrubber" type="range" min="0" max="23" value="8" />
  <span id="label">08:00</span>
</div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 12
    });
    let hour = 8, playing = false, raf = null;
    function setHour(h) {
      hour = h;
      document.getElementById("scrubber").value = h;
      document.getElementById("label").textContent = String(h).padStart(2, "0") + ":00";
      map.setOptions({ styles: h >= 18 || h < 6 ? [{ elementType: "geometry", stylers: [{ lightness: -40 }] }] : [] });
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
  });
</script>`);
    },
    S15() {
      return shell("S15 On-street Drive - Google", googleHead(), `
<div class="panel">
  <strong>Drive</strong>
  <p>Arrow keys / WASD · follow cam on street route</p>
</div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 15,
      tilt: 45
    });
    const ds = new google.maps.DirectionsService();
    const car = new google.maps.Marker({ map, position: ${PRAGUE} });
    let path = [], progress = 0, keys = {};
    ds.route(
      {
        origin: { lat: 50.1167, lng: 14.4178 },
        destination: { lat: 50.0865, lng: 14.4005 },
        travelMode: "DRIVING"
      },
      (res, status) => {
        if (status !== "OK") return;
        path = res.routes[0].overview_path;
        new google.maps.Polyline({ path, map, strokeColor: "#6ec8ff", strokeWeight: 4 });
      }
    );
    window.addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; });
    window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
    function tick() {
      if (path.length > 1) {
        if (keys["arrowup"] || keys.w) progress = Math.min(1, progress + 0.004);
        if (keys["arrowdown"] || keys.s) progress = Math.max(0, progress - 0.004);
        const i = Math.min(path.length - 2, Math.floor(progress * (path.length - 1)));
        const t = progress * (path.length - 1) - i;
        const a = path[i], b = path[i + 1];
        const lat = a.lat() + (b.lat() - a.lat()) * t;
        const lng = a.lng() + (b.lng() - a.lng()) * t;
        const pos = { lat, lng };
        car.setPosition(pos);
        map.panTo(pos);
        map.setHeading((google.maps.geometry.spherical.computeHeading(a, b) + 360) % 360);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    window.__MAP__ = map;
  });
</script>`);
    },
    N01() {
      return shell("N01 Directions - Google", googleHead(), `
<div class="panel"><strong>Directions</strong><button type="button" id="go">Route</button></div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 12
    });
    const ds = new google.maps.DirectionsService();
    let line = null;
    document.getElementById("go").onclick = () => {
      ds.route(
        {
          origin: { lat: 50.1167, lng: 14.4178 },
          destination: { lat: 50.0865, lng: 14.4005 },
          travelMode: "DRIVING"
        },
        (res, status) => {
          if (status !== "OK") return;
          if (line) line.setMap(null);
          line = new google.maps.Polyline({
            path: res.routes[0].overview_path,
            map,
            strokeColor: "#f87171",
            strokeWeight: 5
          });
          const b = new google.maps.LatLngBounds();
          res.routes[0].overview_path.forEach((p) => b.extend(p));
          map.fitBounds(b);
        }
      );
    };
    window.__MAP__ = map;
  });
</script>`);
    },
    N02() {
      return shell("N02 Geocode + Route - Google", googleHead(), `
<div class="panel">
  <input id="from" placeholder="From" value="Old Town Square, Prague" />
  <input id="to" placeholder="To" value="Prague Castle" />
  <button type="button" id="go">Route</button>
</div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 12
    });
    const geocoder = new google.maps.Geocoder();
    const ds = new google.maps.DirectionsService();
    let line = null;
    function geocode(q) {
      return new Promise((resolve, reject) => {
        geocoder.geocode({ address: q }, (results, status) => {
          if (status === "OK" && results[0]) resolve(results[0].geometry.location);
          else reject(status);
        });
      });
    }
    document.getElementById("go").onclick = async () => {
      const origin = await geocode(document.getElementById("from").value);
      const destination = await geocode(document.getElementById("to").value);
      ds.route({ origin, destination, travelMode: "DRIVING" }, (res, status) => {
        if (status !== "OK") return;
        if (line) line.setMap(null);
        line = new google.maps.Polyline({ path: res.routes[0].overview_path, map, strokeWeight: 5 });
      });
    };
    window.__MAP__ = map;
  });
</script>`);
    },
    N03() {
      return shell("N03 Isochrone - Google", googleHead(), `
<div id="map" style="display:flex;align-items:center;justify-content:center;background:#06141a;color:#8fadb8;">
  <div class="panel" style="position:static;max-width:28rem;">
    <strong>N03 Reachability</strong>
    <p>Google Maps JS seat: no first-party isochrone API in this pack. N/A — not an F.</p>
    <p>capability gap · isochrone</p>
  </div>
</div>`);
    },
    M01() {
      return shell(
        "M01 Responsive - Google",
        googleHead() +
          `<style>@media (max-width: 520px) { .panel { max-width: 94vw; } button { min-height: 44px; padding: 12px 14px; } }</style>`,
        `
<div class="panel">
  <strong>Touch map</strong>
  <button type="button" id="in">Zoom in</button>
  <button type="button" id="out">Zoom out</button>
</div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 12,
      gestureHandling: "greedy"
    });
    document.getElementById("in").onclick = () => map.setZoom(map.getZoom() + 1);
    document.getElementById("out").onclick = () => map.setZoom(map.getZoom() - 1);
    window.__MAP__ = map;
  });
</script>`
      );
    },
    M02() {
      return shell("M02 Locate - Google", googleHead(), `
<div class="panel">
  <button type="button" id="locate">Locate me</button>
  <div id="msg"></div>
</div>
<div id="map"></div>
<script>
${gBoot()}
  loadMaps(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: ${PRAGUE},
      zoom: 12
    });
    let marker = null;
    document.getElementById("locate").onclick = () => {
      if (!navigator.geolocation) {
        document.getElementById("msg").textContent = "Geolocation unavailable";
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (marker) marker.setMap(null);
          marker = new google.maps.Marker({ position: p, map });
          map.panTo(p);
          map.setZoom(14);
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

  function degradeGoogle(id, html) {
    let out = html;
    out = out.replace(
      /if \(!key \|\| key === "YOUR_GOOGLE_MAPS_API_KEY"\) throw new Error\("Missing GOOGLE_MAPS_API_KEY"\);\s*/g,
      ""
    );
    switch (id) {
      case "S01":
        out = out.replace("zoom: 12", "zoom: 4");
        break;
      case "S02":
        out = out.replace(
          /const pins = \[[\s\S]*?\];/,
          'const pins = [{ lat: 50.1167, lng: 14.4178, text: "Only one" }];'
        );
        break;
      case "S05":
        out = out.replace(
          /function debounce\(fn, ms\) \{[\s\S]*?\};/,
          "function debounce(fn, ms) { return fn; }"
        );
        out = out.replace(/map\.addListener\("click",[\s\S]*?\);\s*/, "/* click reverse omitted */\n    ");
        break;
      case "S07":
        out = out.replace(/overview\.addListener\("click",[\s\S]*?\);/, "");
        break;
      case "S10":
        out = out.replace("for (let i = 0; i < 5000; i++)", "for (let i = 0; i < 800; i++)");
        out = out.replace("clustered = true", "clustered = false");
        break;
      case "S11":
        out = out.replace(
          /map\.panTo\(ch\);[\s\S]*?map\.setHeading\(ch\.heading\);/,
          "map.setZoom(ch.zoom); /* chapter camera incomplete */"
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
          /line = new google\.maps\.Polyline\([\s\S]*?\);/,
          "/* line layer missing */ line = null;"
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

  return { google, degradeGoogle };
};
