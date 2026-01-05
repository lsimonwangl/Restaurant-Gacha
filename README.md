# 今日餐點抽卡系統 (Restaurant Gacha) 🍱

一個結合 **「地圖探索」**、**「社交分享」** 與 **「抽卡機制」** 的現代化 Web 應用。
解決每天中午「要吃什麼？」的千古難題，讓你不僅能建立自己的美食清單，還能探索並收藏別人的口袋名單！

---

## 🚀 核心功能 (Key Features)

### 1. 抽卡系統 (Gacha & Collection) 🎰
打破選擇困難症，讓命運決定你的下一餐！
- **隨機權重算法**：依照稀有度 (Common/Rare/Epic/Legend) 進行加權抽籤。
- **每日任務與連擊**：每日登入與抽卡可累積 `User Stats` (連續天數、總抽卡數)，解鎖成就感。
- **自定義卡池**：使用者可針對特定情境（如：公司午餐、約會餐廳）建立不同的群組 (Groups) 作為抽卡池。

### 2. 極致的地圖探索 (Deep Search & Radar Scan) 🗺️
我們不只是呼叫 Google API，更實作了獨家的搜尋演算法：
- **雷達掃描 (Radar Scan)**：突破 Google API 單次搜尋範圍限制。系統會以使用者為中心，自動計算 **東西南北各 600m** 的偏移座標，同時發送 20~60 個並行請求進行「地毯式搜索」。
- **智慧過濾**：
  - **RankBy.DISTANCE**：挖掘巷弄小店，而非只顯示廣告名店。
  - **自動化資料清洗**：自動過濾重複餐廳，並將 Google 評分 (1~5) 轉換為遊戲稀有度 (N/R/SR/SSR)。
- **一鍵匯入**：點擊餐廳即可將 `Name`、`Phone`、`Opening Hours` 自動存入資料庫，並將 Google 照片轉存至 **AWS S3** 永久保存。

### 3. 社交與社群 (Social Network) 🤝
- **公開群組 (Public Groups)**：使用者可將得意的美食清單設為公開。
- **訂閱機制 (Subscriptions)**：在「探索頁面」發現他人的優質清單（例如「台大周邊美食」）後，可直接 `Save` 到自己的帳號，並將其作為抽卡選項之一。
- **資料庫關聯**：透過 `saved_groups` 中間表實現多對多 (M:M) 的訂閱關係管理。

---

## 🏗 系統架構 (System Architecture)

採用經典的 **三層式架構 (3-Tier Architecture)** 配合現代化雲端設施：

### 1. Client Tier (客戶端層)
- **Frontend**: Vue 3 (Composition API) + Vite
- **State Management**: Pinia
- **Features**: SPA (單頁應用), Google Maps JS API 深度整合

### 2. Server Tier (後端服務層)
- **Runtime**: Node.js + Express
- **API Design**: RESTful API
- **Layered Arch**: Controller -> Service -> Model (Data Access)
- **Security**: JWT Auth, Bcrypt 加密, Express-Validator 參數驗證

### 3. Infrastructure Tier (基礎設施層)
- **Reverse Proxy**: **Caddy** (擔任 Gateway，負責自動化 HTTPS 憑證簽發與流量轉發)
- **Cloud & Network**: **AWS EC2** (運算), **Cloudflare** (DNS & DDoS 防護), **AWS S3** (圖片儲存)
- **Database**: **MySQL 8.0** (關聯式資料庫)
- **DevOps**: GitHub Actions CI/CD (自動化測試與部署), Docker Containerization

---

## 🛠 技術棧總覽 (Tech Stack)

| 領域 | 技術/工具 | 用途 |
| :--- | :--- | :--- |
| **Frontend** | Vue 3, Vite, Axios | 快速響應的 UI 開發 |
| **Backend** | Node.js, Express | 高效能非阻塞 I/O 服務 |
| **Database** | MySQL, UUIDv7 | 強一致性數據存儲 |
| **Proxy** | Caddy Server | 自動 HTTPS, API Gateway |
| **DevOps** | Docker, GitHub Actions | 容器化與 CI/CD 流水線 |
| **Integration** | Google Places/Maps API | LBS (Location Based Service) |
| **Storage** | AWS S3, Multer | 媒體檔案處理與雲端存儲 |

---

## 🐳 快速部署 (Deployment)

本專案支援完整的 Docker 化部署。

### 1. 環境變數設定 (.env)
請確保專案根目錄有 `.env` 檔案，包含：
```env
DB_HOST=mysql_db
DB_USER=root
DB_PASSWORD=your_password
AWS_ACCESS_KEY_ID=your_key
VITE_GOOGLE_MAPS_API_KEY=your_api_key
```

### 2. 啟動服務 (Docker Compose)
```bash
# 啟動所有服務 (Frontend, Backend, Database)
docker compose -f docker-compose.prod.yml up -d
```

### 3. 資料庫初始化
若為首次部署，需執行 Migration 腳本建立 Schema：
```bash
docker exec -it gacha-backend node scripts/init_db.js
```

詳細部署流程請參考 **[Deployment Guide (部署指南)](./deployment_guide.md)**。

---

## 📂 資料庫結構 (Schema Snapshot)

- **users**: 核心用戶 (1:1 對應 `user_stats`)
- **dishes**: 餐廳資料 (透過 `dish_groups` 與 `groups` 形成 M:M 多對多關係)
- **groups**: 餐點群組 (分為 Owned 與 Saved 兩類)
- **draws**: 抽卡歷史紀錄 (關聯 User, Group, Dish)

---

## 📝 License
Copyright © 2025 Restaurant Gacha Team.
