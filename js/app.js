/* Margan & Warwan 替代行程 — 地圖與行程瀏覽 */
(function () {
  const BRAND = "#5b62e0", SAGE = "#7e9499";
  const HIKE_COLOR = "#d84b3f", DRIVE_COLOR = "#1a73e8";

  // ---- 地圖 ----
  const map = L.map("map", { scrollWheelZoom: true });
  const topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution: '&copy; OpenStreetMap, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  });
  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap contributors"
  });
  const sat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 18, attribution: "Tiles &copy; Esri" }
  );
  osm.addTo(map);
  L.control.layers({ "街道圖": osm, "地形圖": topo, "衛星影像": sat }).addTo(map);
  map.setView([33.75, 75.45], 9);

  // 航點
  WAYPOINTS.forEach(w => {
    const popup = `<b>${w.name}</b>`;
    // 較大的透明熱區，確保手機觸控好點中
    L.circleMarker([w.lat, w.lon], {
      radius: 16, color: "transparent", fillColor: "transparent",
      fillOpacity: 0, weight: 0
    }).addTo(map).bindPopup(popup);
    L.circleMarker([w.lat, w.lon], {
      radius: w.star ? 7 : 5,
      color: w.star ? "#d84b3f" : BRAND,
      fillColor: w.star ? "#d84b3f" : "#8ec9e8",
      fillOpacity: 0.9, weight: 2,
      interactive: false
    }).addTo(map);
  });

  // ---- GPX 解析 ----
  const cache = {};
  async function loadGpx(url) {
    if (cache[url]) return cache[url];
    const res = await fetch(url);
    const xml = new DOMParser().parseFromString(await res.text(), "application/xml");
    const pts = [...xml.querySelectorAll("trkpt")].map(p => ({
      lat: +p.getAttribute("lat"),
      lon: +p.getAttribute("lon"),
      ele: p.querySelector("ele") ? +p.querySelector("ele").textContent : null
    }));
    // 累積距離（km）
    let dist = 0;
    const R = 6371;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
      const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      dist += 2 * R * Math.asin(Math.sqrt(h));
      pts[i].d = dist;
    }
    pts[0].d = 0;
    return (cache[url] = pts);
  }

  // ---- UI ----
  const tabs = document.getElementById("day-tabs");
  DAYS.forEach((d, i) => {
    const b = document.createElement("button");
    b.className = `tab ${d.type}`;
    b.textContent = d.short;
    b.addEventListener("click", () => selectDay(i));
    tabs.appendChild(b);
  });

  let line = null, chart = null, currentPts = null;

  async function selectDay(i) {
    const d = DAYS[i];
    [...tabs.children].forEach((t, j) => t.classList.toggle("active", j === i));
    tabs.children[i].scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });

    const badge = document.getElementById("day-badge");
    badge.textContent = `DAY ${d.id}`;
    badge.className = `day-badge ${d.type}`;
    document.getElementById("day-title").textContent = d.title;
    document.getElementById("day-desc").textContent = d.desc;

    const ul = document.getElementById("day-stats");
    ul.innerHTML = "";
    d.stats.forEach((s, k) => {
      const li = document.createElement("li");
      if (d.type !== "hike" && d.type !== "drive" || k >= 2) li.className = "alt";
      li.textContent = s;
      ul.appendChild(li);
    });

    const dl = document.getElementById("day-download");
    if (d.gpx) { dl.hidden = false; dl.href = d.gpx; } else { dl.hidden = true; }

    if (line) { map.removeLayer(line); line = null; }
    currentPts = null;

    if (d.gpx) {
      const pts = await loadGpx(d.gpx);
      currentPts = pts;
      line = L.polyline(pts.map(p => [p.lat, p.lon]), {
        color: d.type === "hike" ? HIKE_COLOR : DRIVE_COLOR, weight: 4, opacity: 0.9
      }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [30, 30] });
      renderElevation(d, pts);
    } else {
      map.setView(d.center, d.zoom);
      document.getElementById("elev-card").hidden = true;
    }
  }

  document.getElementById("fit-btn").addEventListener("click", () => {
    if (line) map.fitBounds(line.getBounds(), { padding: [30, 30] });
  });

  // ---- 海拔剖面 ----
  function renderElevation(d, pts) {
    const card = document.getElementById("elev-card");
    const withEle = pts.filter(p => p.ele !== null);
    if (withEle.length < 2) { card.hidden = true; return; }
    card.hidden = false;

    const total = pts[pts.length - 1].d;
    const eles = withEle.map(p => p.ele);
    document.getElementById("elev-meta").textContent =
      `｜${total.toFixed(1)} km｜${Math.min(...eles).toFixed(0)}–${Math.max(...eles).toFixed(0)} m`;

    const data = withEle.map(p => ({ x: +p.d.toFixed(3), y: p.ele }));
    if (chart) chart.destroy();
    chart = new Chart(document.getElementById("elev-chart"), {
      type: "line",
      data: {
        datasets: [{
          data, parsing: false, borderColor: BRAND, borderWidth: 2,
          pointRadius: 0, fill: true, backgroundColor: "rgba(91,98,224,.14)", tension: .25
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: "nearest", axis: "x", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: it => `${it[0].parsed.x.toFixed(2)} km`,
              label: it => `${it.parsed.y.toFixed(0)} m`
            }
          }
        },
        scales: {
          x: { type: "linear", title: { display: true, text: "距離 (km)" }, max: +total.toFixed(1) },
          y: { title: { display: true, text: "海拔 (m)" } }
        }
      }
    });
  }

  selectDay(4); // 預設顯示 Day 5 三湖環線
})();
