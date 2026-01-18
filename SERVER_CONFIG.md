# 🚀 Server Configuration Guide

## ⚠️ Vấn đề: Live Server không hỗ trợ `.htaccess`

**Live Server** (và Five Server) là Node.js servers, không phải Apache, nên không thể sử dụng `.htaccess` để routing.

---

## ✅ Giải pháp 1: Dùng Server.js (Khuyến nghị)

### Bước 1: Cài đặt dependencies
```bash
npm install express compression
```

### Bước 2: Chạy server
```bash
node server.js
```

### Kết quả:
```
🚀 Server đang chạy
🌐 http://localhost:3000
💾 Compression: Bật
```

### Cách hoạt động:
- ✅ URL `/nhiemvu/nv` → tìm `nhiemvu/nv.html`
- ✅ URL `/` → tìm `index.html`
- ✅ URL không tồn tại → hiển thị `404.html`
- ✅ Lỗi server → hiển thị `500.html`

---

## ✅ Giải pháp 2: Dùng VS Code Live Server + JavaScript Redirect

Nếu bạn vẫn muốn dùng **Live Server**:

1. **Thêm file `redirect.js` vào thư mục gốc:**

```javascript
// redirect.js
(function() {
  // Kiểm tra xem URL có extension không
  const pathname = window.location.pathname;
  
  // Bỏ qua static files
  if (/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|xml)$/.test(pathname)) {
    return;
  }
  
  // Nếu pathname không kết thúc bằng / và không có .html
  if (!pathname.endsWith('/') && !pathname.includes('.html')) {
    // Thử fetch file với .html extension
    const htmlPath = pathname.includes('/')
      ? pathname
      : pathname + '/index.html';
    
    fetch(htmlPath)
      .then(response => {
        if (response.ok) {
          window.location.href = htmlPath;
        } else {
          // 404
          window.location.href = '/404.html';
        }
      })
      .catch(() => {
        window.location.href = '/404.html';
      });
  }
})();
```

2. **Thêm vào `index.html` (trước closing `</body>`):**

```html
<script src="/redirect.js"></script>
```

---

## ✅ Giải pháp 3: Dùng Nginx (Production)

Nếu host trên server Nginx:

```nginx
server {
  listen 80;
  server_name example.com;
  root /var/www/c7aio;

  # Compression
  gzip on;
  gzip_types text/plain text/css text/javascript application/json;

  # Cache
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Routing
  location / {
    try_files $uri $uri/index.html /index.html;
  }

  # HTML cache
  location ~ \.(html|json)$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
  }
}
```

---

## ✅ Giải pháp 4: Dùng Apache (Production)

File `.htaccess` đã được tạo trong thư mục gốc. Đảm bảo:
- ✅ Hosting hỗ trợ `.htaccess`
- ✅ `mod_rewrite` enabled
- ✅ `.htaccess` trong document root

---

## 📊 So Sánh các giải pháp:

| Giải pháp | Development | Production | Dễ dùng | Tốc độ |
|-----------|:-----------:|:-----------:|:-------:|:-----:|
| server.js | ✅ | ✅ | 5/5 | 5/5 |
| Live Server + JS | ✅ | ❌ | 4/5 | 3/5 |
| Apache | ❌ | ✅ | 3/5 | 5/5 |
| Nginx | ❌ | ✅ | 2/5 | 5/5 |

---

## 🎯 Khuyến nghị:

**Local development:** Dùng `server.js`
```bash
node server.js
```

**Production (cPanel/Hosting):** Dùng `.htaccess`

**Production (VPS):** Dùng Nginx hoặc Apache

---

## 🔧 Troubleshooting:

### 🔴 Service Worker lỗi
```bash
# Xóa cache
Ctrl + Shift + Delete
# hoặc
DevTools → Application → Clear storage
```

### 🔴 URL vẫn hiển thị 404 sai
Đảm bảo `404.html` tồn tại trong thư mục gốc

### 🔴 File tĩnh không load
Kiểm tra đường dẫn trong HTML có đúng không:
- ❌ Sai: `<script src="script/hub.js">`
- ✅ Đúng: `<script src="/script/hub.js">`

---

## 📝 Package.json scripts:

```json
{
  "name": "c7aio",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js --watch",
    "build": "echo 'No build needed for static site'"
  },
  "dependencies": {
    "express": "^4.18.2",
    "compression": "^1.7.4"
  }
}
```

Chạy với:
```bash
npm start
```
