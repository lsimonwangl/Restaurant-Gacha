# HTTPS Nginx 設定範例 (For gateway-nginx)

## 步驟 1: 修改 Nginx 設定
將以下內容新增至你的 `/etc/nginx/conf.d/gacha.conf` (或其他設定檔中)。
請將 `your-domain.com` 替換成你的實際網域名稱。

```nginx
# 1. HTTP -> HTTPS 轉發
server {
    listen 80;
    server_name your-domain.com; # <--- 請修改這裡
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# 2. HTTPS 主要服務
server {
    listen 443 ssl;
    server_name your-domain.com; # <--- 請修改這裡

    # SSL 憑證 (Certbot 會幫你產生這些檔案，路徑僅供參考)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 轉發請求給前端容器 (前端容器會再透過內網轉發給後端)
    # 注意: 如果 gateway-nginx 跟 gacha-frontend 不在同一個 Docker Network，請改用 http://127.0.0.1:8080
    location / {
        proxy_pass http://localhost:8080; # 假設前端對外開放 8080
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # 傳遞真實 IP 給後端 (重要！)
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 步驟 2: 申請免費 SSL 憑證 (使用 Certbot)
如果你的 gateway-nginx 容器內有裝 certbot，可以執行：

```bash
sudo certbot --nginx -d your-domain.com
```

如果沒有，你需要先在 Ubuntu 主機上安裝 Certbot，然後設定「Webroot 驗證」或暫時停用 Nginx 來申請。

**最強大的做法 (使用 Nginx Proxy Manager)**:
如果覺得手動改 Nginx 設定檔太麻煩，強烈建議改用 [Nginx Proxy Manager](https://nginxproxymanager.com/) 的 Docker Image 來當作你的 gateway。它有圖形化介面，點幾下就能申請 SSL 憑證並設定轉發，非常適合 Docker 環境！
