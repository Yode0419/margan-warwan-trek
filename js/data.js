/* 每日行程資料（Margan & Warwan Valley 替代行程） */
const DAYS = [
  {
    id: 1, type: "rest", short: "D1 抵達",
    title: "抵達斯利那加（Srinagar）",
    desc: "接機，入住豪華船屋，日落游船，晚餐。",
    stats: ["海拔 1585 m", "住宿：船屋"],
    gpx: null, center: [34.0836, 74.8090], zoom: 12
  },
  {
    id: 2, type: "drive", short: "D2 車程",
    title: "斯利那加 → Kokernag",
    desc: "沿途經過 Pampore 番紅花田及蘋果果園前往 Kokernag，參觀植物園與天然湧泉，為進入高海拔做準備。",
    stats: ["車程 3–4 小時", "行程表 85 km｜GPS 84.6 km", "海拔 2020 m", "住宿：當地民宿"],
    gpx: "gpx/alt_Day2_drive_Srinagar-Kokernag.gpx"
  },
  {
    id: 3, type: "drive", short: "D3 車程",
    title: "Kokernag → Margan 山谷",
    desc: "穿越森林一路攀升至遼闊的 Margan 高山草原，紮營並適應高度，可至附近山脊賞日落。",
    stats: ["車程 2–3 小時", "行程表 38 km｜GPS 52.8 km", "營地約 3670 m", "住宿：Margan 帳篷營地"],
    gpx: "gpx/alt_Day3_drive_Kokernag-MarganValley.gpx"
  },
  {
    id: 4, type: "hike", short: "D4 健行",
    title: "Shilsar 雙湖健行",
    desc: "由營地往東南方前往清澈見底的 Shil Sar 湖群，穿越野花盛開的高山草甸，原路折返。",
    stats: ["行程表 10–12 km｜GPS 9.0 km 來回", "5–6 小時", "海拔 3656–4182 m", "住宿：Margan 帳篷營地"],
    gpx: "gpx/alt_Day4_hike_ShilsarLakes.gpx"
  },
  {
    id: 5, type: "hike", short: "D5 健行",
    title: "Churnag（Choharnag）三湖健行",
    desc: "環線造訪 Choharnag 第一、二、三湖，穿越高山草原、岩石地形與冰川溪流。第三湖接近段為短補繪路段，現場請依地形行走。",
    stats: ["行程表 14–16 km｜GPS 9.5 km 環線", "6–7 小時", "海拔 3670–3995 m", "住宿：Churnag I 帳篷營地"],
    gpx: "gpx/alt_Day5_hike_ChoharnagLakes.gpx"
  },
  {
    id: 6, type: "hike", short: "D6 健行",
    title: "Margan 山谷探索（Zambkash Sar）",
    desc: "沿谷地北行探訪隱藏的高山草原、牧民聚落與溪流，至 Zambkash Sar（Kumhar Nag）湖畔後折返；體力允許可再延伸至 Nagputin Sar。",
    stats: ["行程表 8–10 km｜GPS 13.1 km 來回", "4–5 小時起", "海拔 3670–4117 m", "住宿：Churnag II 帳篷營地"],
    gpx: "gpx/alt_Day6_hike_ZambkashSar.gpx"
  },
  {
    id: 7, type: "drive", short: "D7 車程",
    title: "Margan 山谷 → Warwan 山谷",
    desc: "翻越 Margan Top 下降進入景色優美的 Warwan 山谷（Inshan），探索傳統村落，享受寧靜河谷風光。",
    stats: ["車程 2–3 小時", "行程表 16 km｜GPS 25.1 km", "Inshan 約 2400 m", "住宿：Warwan 帳篷營地"],
    gpx: "gpx/alt_Day7_drive_Margan-Warwan.gpx"
  },
  {
    id: 8, type: "drive", short: "D8 車程",
    title: "Warwan 山谷 → 斯利那加",
    desc: "沿風景秀麗的山路返回斯利那加，晚間入住旅館、自由活動，慶祝旅程圓滿結束。",
    stats: ["車程 7–8 小時", "行程表 180 km｜GPS 162.8 km", "住宿：旅館"],
    gpx: "gpx/alt_Day8_drive_Warwan-Srinagar.gpx"
  },
  {
    id: 9, type: "rest", short: "D9 送機",
    title: "回到溫暖的家",
    desc: "早餐後，專車送往機場，行程結束。",
    stats: ["含早餐"],
    gpx: null, center: [34.0836, 74.8090], zoom: 12
  }
];

/* 航點（湖泊、營地、村落） */
const WAYPOINTS = [
  { name: "Srinagar（達爾湖）", lat: 34.0836, lon: 74.8090 },
  { name: "Kokernag", lat: 33.5872, lon: 75.3012 },
  { name: "Margan 營地", lat: 33.7554, lon: 75.4930, star: true },
  { name: "Shil Sar 上湖", lat: 33.7361, lon: 75.5078 },
  { name: "Shil Sar 主湖", lat: 33.7305, lon: 75.5111 },
  { name: "Shil Sar 中湖", lat: 33.7228, lon: 75.5061 },
  { name: "Shil Sar 下湖", lat: 33.7145, lon: 75.5175 },
  { name: "Choharnag 第一湖", lat: 33.7539, lon: 75.4697 },
  { name: "Choharnag 第二湖", lat: 33.7586, lon: 75.4743 },
  { name: "Choharnag 第三湖", lat: 33.7684, lon: 75.4724 },
  { name: "Choharnag 第四湖", lat: 33.7495, lon: 75.4695 },
  { name: "Zambkash Sar", lat: 33.7985, lon: 75.4654 },
  { name: "Nagputin Sar", lat: 33.8110, lon: 75.4476 },
  { name: "Inshan（Warwan 山谷）", lat: 33.8123, lon: 75.5661, star: true }
];
