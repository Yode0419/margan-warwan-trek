# Margan & Warwan Valley Trek 行程網站

喀什米爾替代行程（Margan 山谷 & Warwan 山谷）的每日行程與 GPX 路線瀏覽網站。

## 結構

```
index.html        主頁
css/style.css     樣式（仿行程 PDF 品牌配色）
js/data.js        每日行程資料與航點
js/app.js         地圖（Leaflet）、海拔剖面（Chart.js）、GPX 解析
gpx/              各日 GPX 檔（alt_FULL 為合併版）
```

## 部署到 GitHub Pages

1. 將整個資料夾推上 GitHub repo（檔案放在 repo 根目錄或 `/docs`）。
2. Repo → Settings → Pages → Source 選擇分支（與 `/` 或 `/docs`）。
3. 完成後以 `https://<帳號>.github.io/<repo>/` 開啟。

注意：GPX 以 `fetch()` 載入，需經 HTTP 伺服器（GitHub Pages 即可）；
直接雙擊 `index.html`（`file://`）瀏覽器會擋住讀取。本機預覽可用：
`python3 -m http.server`，再開 `http://localhost:8000`。

## 資料來源

- 徒步段：OpenStreetMap 使用者實測路徑（ODbL）
- 車程段：OSRM 沿實際道路產生
- 海拔：Open-Meteo 90 m DEM
- 底圖：OpenTopoMap / OSM / Esri World Imagery（需網路連線）
