# 今日餐點抽卡系統 (Restaurant Gacha) 🍱

一個結合 **「餐廳推薦」**、**「社交分享」** 與 **「抽卡機制」** 的趣味 Web 應用。
解決每天中午「要吃什麼？」的千古難題，讓你不僅能建立自己的美食清單，還能探索並收藏別人的口袋名單！

## 🚀 核心功能

### 1. 抽卡系統 (Gacha)
- **隨機推薦**：依照機率 (Common/Rare/Epic) 抽出餐廳。
- **每日任務**：每日有限定抽卡次數，增加趣味性。
- **群組篩選**：可針對特定情境抽卡（例如：學校附近、公司周邊、家裡附近）。
- **收藏機制**：抽到喜歡的餐廳可加入「我的最愛」。

### 2. 社交與探索 (Social & Explore) ✨(New)
- **公開群組**：使用者可將自己的美食群組設為「公開」。
- **探索社群**：在「探索頁面」瀏覽其他人建立的公開群組。
- **收藏訂閱**：看到喜歡的群組（例如「台大美食地圖」），可以一鍵收藏到自己的列表中，直接拿來抽！
- **群組管理**：完整 CRUD 功能，可編輯名稱、描述或刪除不再需要的群組。

---

## 🛠 技術架構 (Tech Stack)

*   **Frontend**: Vue 3 + Vite + Axios
*   **Backend**: Node.js + Express
*   **Database**: MySQL 8.0
*   **Auth**: JWT (JSON Web Token)
*   **Deployment**: Docker + Docker Compose + Nginx Reverse Proxy
*   **Infrastructure**: AWS EC2

---

## 🐳 快速開始 (Docker 部署)

本專案已完整 Docker 化，支援一鍵啟動。

### 1. 本地開發 (Local)
確保已安裝 Docker Desktop，然後執行：

```bash
# 啟動所有服務 (Frontend, Backend, Database)
docker compose up -d --build
```
啟動後訪問：
- **Frontend**: `http://localhost:8080` (or 9080, port used to avoid conflict)
- **Backend API**: `http://localhost:3000`

### 2. 部署至 EC2 (Production)
本專案支援 Docker Hub 部署流程，免去在 Server 上編譯的時間。
詳情請參考 **[Deployment Guide (部署指南)](./deployment_guide.md)**。

基本指令：
```bash
# 在 EC2 上拉取並更新
export DOCKER_USERNAME="your-user"
docker compose -f docker-compose.hub.yml pull
docker compose -f docker-compose.hub.yml up -d
```

### 3. 資料庫更新 (Migration)
當有 schema 變更時（如新增欄位），不需重置資料庫，只需執行：
```bash
docker exec -it gacha-backend node migrate_local.js
```

---

## 📂 資料庫設計 (Database Schema)

主要包含以下資料表：
- **users**: 使用者帳號資料
- **dishes**: 餐廳資訊 (含 rarity, image)
- **groups**: 美食群組 (新增 `is_public` 欄位支援社交功能)
- **saved_groups**: 紀錄使用者收藏了哪些別人的群組 (多對多)
- **dish_groups**: 餐廳與群組關聯表
- **draws/favorites**: 抽卡紀錄與收藏

---

## 📝 開發者筆記

- **Docker Port Mapping**: 
  - 為了避免與本機 MySQL 衝突，Docker 內的 MySQL 對外映射至 `3308`。
  - 後端 API 使用 `3000`。
  - 前端使用 Nginx 代理，預設映射至 `8080`。
- **HTTPS**: 
  - 生產環境建議搭配 `gateway-nginx` 或 `Nginx Proxy Manager` 處理 SSL 加密。

---

Copyright © 2025 Restaurant Gacha Team.
