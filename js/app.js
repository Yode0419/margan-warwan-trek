/* Margan & Warwan 替代行程 — 地圖與行程瀏覽 */
(function () {
  const BRAND = "#4c5fd8", SAGE = "#7e9499";
  const HIKE_COLOR = "#d84b3f", DRIVE_COLOR = "#1a73e8";

  function syncHeaderHeight() {
    const h = document.querySelector(".site-header").offsetHeight;
    document.documentElement.style.setProperty("--header-h", h + "px");
  }
  syncHeaderHeight();

  // ---- Header info tooltip ----
  const infoBtn = document.getElementById("info-btn");
  const infoTooltip = document.getElementById("info-tooltip");
  infoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = infoBtn.getAttribute("aria-expanded") === "true";
    infoBtn.setAttribute("aria-expanded", String(!open));
    infoTooltip.hidden = open;
  });
  document.addEventListener("click", (e) => {
    if (!infoTooltip.hidden && !infoTooltip.contains(e.target) && e.target !== infoBtn) {
      infoBtn.setAttribute("aria-expanded", "false");
      infoTooltip.hidden = true;
    }
  });

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
  let layerControlPosition = window.innerWidth < 860 ? "topright" : "bottomleft";
  const layerControl = L.control.layers(
    { "街道圖": osm, "地形圖": topo, "衛星影像": sat },
    null,
    { position: layerControlPosition }
  ).addTo(map);
  map.setView([33.75, 75.45], 9);

  function syncLayerControlPosition() {
    const nextPosition = window.innerWidth < 860 ? "topright" : "bottomleft";
    if (layerControlPosition === nextPosition) return;
    layerControlPosition = nextPosition;
    layerControl.setPosition(nextPosition);
  }

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

  // 滑鼠拖曳橫向捲動（觸控本身已原生支援）
  let tabsDragging = false, tabsDragged = false, tabsStartX = 0, tabsStartScroll = 0;
  let tabsPointerId = null;

  DAYS.forEach((d, i) => {
    const b = document.createElement("button");
    b.className = `tab ${d.type}`;
    b.textContent = d.short;
    b.addEventListener("click", (e) => { if (tabsDragged) { e.preventDefault(); return; } selectDay(i); });
    tabs.appendChild(b);
  });

  tabs.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    tabsDragging = true; tabsDragged = false;
    tabsPointerId = e.pointerId;
    tabsStartX = e.clientX;
    tabsStartScroll = tabs.scrollLeft;
  });
  tabs.addEventListener("pointermove", (e) => {
    if (!tabsDragging) return;
    const dx = e.clientX - tabsStartX;
    if (!tabsDragged && Math.abs(dx) > 4) {
      tabsDragged = true;
      tabs.setPointerCapture(e.pointerId);
    }
    tabs.scrollLeft = tabsStartScroll - dx;
  });
  function endTabsDrag() {
    tabsDragging = false;
    if (tabsPointerId !== null && tabs.hasPointerCapture(tabsPointerId)) {
      tabs.releasePointerCapture(tabsPointerId);
    }
    tabsPointerId = null;
  }
  tabs.addEventListener("pointerup", endTabsDrag);
  tabs.addEventListener("pointercancel", endTabsDrag);

  let line = null, chart = null, currentPts = null;
  const elevCursor = L.circleMarker([0, 0], {
    radius: 7, color: "#fff", weight: 2, fillColor: "#d84b3f", fillOpacity: 1
  });

  function fitRouteBounds() {
    if (!line) return;
    const padding = 30;

    if (window.innerWidth >= 860) {
      const panelWidth = tabs.parentElement.parentElement.getBoundingClientRect().width;
      map.fitBounds(line.getBounds(), {
        paddingTopLeft: [padding, padding],
        paddingBottomRight: [panelWidth + padding, padding]
      });
      return;
    }

    // 手機版：避開底部面板，往上偏移半個面板高度
    const panelEl = document.getElementById("panel");
    const panelHeight = panelEl ? panelEl.getBoundingClientRect().height : 0;
    map.fitBounds(line.getBounds(), {
      paddingTopLeft: [padding, padding],
      paddingBottomRight: [padding, panelHeight / 2 + padding]
    });
  }

  async function selectDay(i) {
    const d = DAYS[i];
    [...tabs.children].forEach((t, j) => t.classList.toggle("active", j === i));
    tabs.children[i].scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });

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

    if (sheet) sheet.syncCollapsedHeight();

    if (line) { map.removeLayer(line); line = null; }
    currentPts = null;
    if (map.hasLayer(elevCursor)) map.removeLayer(elevCursor);

    if (d.gpx) {
      const pts = await loadGpx(d.gpx);
      currentPts = pts;
      line = L.polyline(pts.map(p => [p.lat, p.lon]), {
        color: d.type === "hike" ? HIKE_COLOR : DRIVE_COLOR, weight: 4, opacity: 0.9
      }).addTo(map);
      fitRouteBounds();
      renderElevation(d, pts);
    } else {
      map.setView(d.center, d.zoom);
      document.getElementById("elev-card").hidden = true;
      if (chart) { chart.destroy(); chart = null; }
      syncCarouselDots();
    }

    if (sheet) sheet.syncHalfHeight();
  }

  document.getElementById("fit-btn").addEventListener("click", () => {
    fitRouteBounds();
  });

  // ---- 海拔剖面（常駐展開） ----
  function renderElevation(d, pts) {
    const card = document.getElementById("elev-card");
    const withEle = pts.filter(p => p.ele !== null);
    if (withEle.length < 2) { card.hidden = true; syncCarouselDots(); return; }
    card.hidden = false;
    syncCarouselDots();

    const total = pts[pts.length - 1].d;
    const eles = withEle.map(p => p.ele);
    document.getElementById("elev-meta").textContent =
      `｜${Math.min(...eles).toFixed(0)}–${Math.max(...eles).toFixed(0)} m｜${total.toFixed(1)} km`;

    if (chart) { chart.destroy(); chart = null; }
    buildChart({ withEle, total });
  }

  function buildChart({ withEle, total }) {
    const data = withEle.map(p => ({ x: +p.d.toFixed(3), y: p.ele }));
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
        onHover: (evt, els) => showElevCursor(els, withEle),
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
          x: { type: "linear", max: +total.toFixed(1) },
          y: {}
        }
      }
    });
  }

  function showElevCursor(activeEls, withEle) {
    if (!activeEls.length) return;
    const p = withEle[activeEls[0].index];
    if (!p) return;
    elevCursor.setLatLng([p.lat, p.lon]);
    if (!map.hasLayer(elevCursor)) elevCursor.addTo(map);
  }

  // ---- 行程細節/海拔 輪播分頁指示 ----
  const carousel = document.getElementById("day-detail-carousel");
  const carouselDots = document.getElementById("carousel-dots");

  function syncCarouselDots() {
    const hasElev = !document.getElementById("elev-card").hidden;
    carouselDots.hidden = !hasElev;
    carousel.scrollTo({ left: 0 });
    [...carouselDots.children].forEach((dot, i) => dot.classList.toggle("active", i === 0));
  }

  carousel.addEventListener("scroll", () => {
    if (carouselDots.hidden) return;
    const page = Math.round(carousel.scrollLeft / carousel.clientWidth);
    [...carouselDots.children].forEach((dot, i) => dot.classList.toggle("active", i === page));
  });

  // ---- 手機 Bottom Sheet 拖曳（高度驅動，非 translateY） ----
  const sheet = (function initBottomSheet() {
    const panel = document.getElementById("panel");
    const handle = document.getElementById("panel-handle");
    const fixed = document.getElementById("panel-fixed");
    const actions = document.querySelector(".panel-actions");
    const STATES = ["collapsed", "half", "full"];
    let state = "collapsed";

    function isMobile() { return window.matchMedia("(max-width: 859px)").matches; }

    // collapsed 高度 = 把手 + 日期列/標題 + 底部按鈕 的實際內容高度（避免寫死 px 造成裁切/留白）
    function collapsedHeight() {
      return handle.offsetHeight + fixed.offsetHeight + actions.offsetHeight;
    }

    function syncCollapsedHeight() {
      document.documentElement.style.setProperty("--sheet-collapsed", collapsedHeight() + "px");
    }

    // half 高度 = 貼合 carousel 實際內容高度（行程細節/海拔中較高者），上限螢幕 80%
    function halfHeight() {
      const shellH = document.getElementById("map-shell").clientHeight;
      const carouselEl = document.getElementById("day-detail-carousel");
      const dotsEl = document.getElementById("carousel-dots");

      // panel-scroll 在 collapsed 狀態下是 display:none，量測前需暫時強制顯示
      const wasCollapsed = panel.dataset.state === "collapsed";
      if (wasCollapsed) panel.classList.add("sheet-peek");
      const contentH = collapsedHeight() + carouselEl.scrollHeight +
        (dotsEl.hidden ? 0 : dotsEl.offsetHeight) + 12 /* panel-scroll 上下 padding 差額 */;
      if (wasCollapsed) panel.classList.remove("sheet-peek");

      return Math.min(contentH, shellH * 0.8);
    }

    function syncHalfHeight() {
      document.documentElement.style.setProperty("--sheet-half", halfHeight() + "px");
    }

    function heightFor(stateName) {
      const shellH = document.getElementById("map-shell").clientHeight;
      if (stateName === "collapsed") return collapsedHeight();
      if (stateName === "full") return shellH - 12;
      return halfHeight();
    }

    // 面板展開/收合時，地圖跟著平移，避免路線被遮擋
    let lastPanelHeight = null;
    function panMapForHeightChange(newHeight) {
      if (!isMobile()) return;
      if (lastPanelHeight === null) { lastPanelHeight = newHeight; return; }
      const delta = newHeight - lastPanelHeight;
      lastPanelHeight = newHeight;
      if (Math.abs(delta) < 1) return;
      map.panBy([0, delta / 2], { animate: true, duration: 0.28 });
    }

    function setState(next, opts) {
      const silent = opts && opts.silent;
      const wasCollapsed = state === "collapsed";
      state = next;
      panel.dataset.state = next;
      panel.classList.remove("dragging");
      panel.style.height = "";
      if (silent) lastPanelHeight = heightFor(next);
      else panMapForHeightChange(heightFor(next));
      // 從 collapsed 展開時，圖表容器才第一次真正可見，需要 resize 校正寬度
      if (wasCollapsed && next !== "collapsed" && chart) {
        setTimeout(() => chart.resize(), 300);
      }
    }

    let dragStartY = 0, dragStartH = 0, dragging = false;

    handle.addEventListener("pointerdown", (e) => {
      if (!isMobile()) return;
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      panel.classList.add("dragging");
      dragStartY = e.clientY;
      dragStartH = panel.getBoundingClientRect().height;
      // 拖曳過程需要 panel-scroll 內容可見，暫時取消 collapsed 的隱藏規則
      panel.classList.add("sheet-peek");
    });

    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      let next = dragStartH - (e.clientY - dragStartY);
      next = Math.max(heightFor("collapsed"), Math.min(heightFor("full"), next));
      panel.style.height = next + "px";
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove("sheet-peek");
      const currentH = dragStartH - (e.clientY - dragStartY);
      const candidates = STATES.map(s => ({ s, h: heightFor(s) }));
      candidates.sort((a, b) => Math.abs(a.h - currentH) - Math.abs(b.h - currentH));
      setState(candidates[0].s);
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);

    handle.addEventListener("click", () => {
      if (dragging) return;
      setState(state === "collapsed" ? "half" : "collapsed");
    });

    syncCollapsedHeight();
    syncHalfHeight();
    lastPanelHeight = heightFor("collapsed");
    return { setState, isMobile, syncCollapsedHeight, syncHalfHeight, get state() { return state; } };
  })();

  window.addEventListener("resize", () => {
    syncHeaderHeight();
    syncLayerControlPosition();
    map.invalidateSize();
    if (chart) chart.resize();
    if (sheet.isMobile()) { sheet.syncCollapsedHeight(); sheet.syncHalfHeight(); }
  });

  selectDay(4); // 預設顯示 Day 5 三湖環線

  if (sheet.isMobile()) sheet.setState("half", { silent: true });
})();
