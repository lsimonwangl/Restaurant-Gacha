# EC2 Docker 部署指南 (Deployment Guide)

本指南將引導你如何將「餐廳抽卡」應用程式使用 Docker 部署到 AWS EC2 實例。

## 核心流程總覽

1.  **本機**：`docker compose build` -> `docker compose push`
2.  **EC2**：`docker compose pull` -> `docker compose up -d`
3.  **資料庫更新**：`docker exec ... node migrate_local.js`

---

## 前置準備
1.  **EC2 實例**：
    - 作業系統：Ubuntu 22.04 LTS (推薦)
    - Security Group 開放：
        - **SSH (22)**: 遠端連線用
        - **HTTP (80)**: 網頁瀏覽用
        - **TCP (8080)**: 如果前端部署在 8080
2.  **安裝 Docker (EC2 端)**
    ```bash
    # 一鍵安裝腳本 (Ubuntu)
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    
    # 設定當前使用者免 sudo 執行 docker
    sudo usermod -aG docker $USER
    newgrp docker
    ```

---

## 詳細部署步驟

### 步驟 1: 設定環境變數
在 EC2 上建立一個資料夾放設定檔：
```bash
mkdir restaurant-gacha
cd restaurant-gacha
nano .env  # 填入你的 DB 密碼和其他設定
```
同時也需要把 **`docker-compose.hub.yml`** 上傳到這個目錄。

### 步驟 2: 拉取並啟動服務
使用 `docker compose` (注意：V2版指令中間沒有連字號) 來啟動：

```bash
# 1. 設定 Docker Hub 帳號變數
export DOCKER_USERNAME="你的帳號"

# 2. 拉取最新映像檔
docker compose -f docker-compose.hub.yml pull

# 3. 啟動服務
docker compose -f docker-compose.hub.yml up -d
```

### 步驟 3: [重要] 資料庫結構更新 (Migration)
因為我們**不刪除**資料庫檔案 (保留舊資料)，所以必須手動執行腳本來更新資料庫結構 (例如新增 `is_public` 欄位)。

執行以下指令，直接命令後端容器執行更新腳本：
```bash
# 注意：gacha-backend 是容器名稱
docker exec -it gacha-backend node migrate_local.js
```
如果看到 `Migration completed successfully!` 即代表成功。

---

## 常見問題排除 (Troubleshooting)

### Q1: `docker-compose: command not found`
新版 Docker 已將 Compose 整合為 `docker compose` (無連字號)。
請改用 `docker compose` 指令。

### Q2: 容器一直 Restarting (Port Conflict)
如果 `docker ps` 顯示容器一直在重啟，可能是 Port 被佔用 (例如 EC2 上已經有其他服務佔用 3000)。
**解決方法**：修改 `docker-compose.hub.yml` 的 Ports 對映。
```yaml
services:
  backend:
    ports:
      - "3001:3000"  # 將主機的 3001 對映到容器的 3000
```
修改後，記得強制重建容器：
```bash
docker compose -f docker-compose.hub.yml up -d --force-recreate
```

### Q3: `failed to open stdin fifo`
執行 `docker exec` 時出現此錯誤，通常是因為容器正在重啟中 (還沒 Ready)。請先用 `docker ps` 確認容器狀態為 `Up` 再執行。

---

## 本地開發與打包流程 (Local Workflow)

當你有程式碼更新時：

1.  **建置映像檔**：
    ```powershell
    docker compose -f docker-compose.hub.yml build
    ```
2.  **推送到 Docker Hub**：
    ```powershell
    docker compose -f docker-compose.hub.yml push
    ```
3.  **回到 EC2 重複上述「步驟 2」即可。**
