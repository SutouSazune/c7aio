# URL Routing Configuration

## Cách 1: Nếu dùng Apache Hosting (Khuyến nghị)

File `.htaccess` đã được tạo trong thư mục gốc. Nó sẽ tự động:
- Xóa `.html` extension từ URLs
- Redirect thư mục đến `index.html` của thư mục đó
- Cache optimization cho static files
- Gzip compression

**Các URLs hiện tại sẽ hoạt động được:**
- `https://example.com/` → `index.html`
- `https://example.com/nhiemvu/nv` → `nhiemvu/nv.html`
- `https://example.com/lich/lich` → `lich/lich.html`
- `https://example.com/thongbao/tb` → `thongbao/tb.html`
- `https://example.com/thongke/tk` → `thongke/tk.html`

---

## Cách 2: Nếu dùng Node.js + Express

Tạo file `server.js`:

```javascript
const express = require('express');
const path = require('path');
const compression = require('compression');
const app = express();

// Middleware
app.use(compression());
app.use(express.static(path.join(__dirname)));

// Route handler - Serve index.html cho tất cả requests
app.get('*', (req, res) => {
  // Nếu file tồn tại, serve nó
  const filePath = path.join(__dirname, req.path);
  
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Page not found');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
```

**Chạy với:**
```bash
npm install express compression
node server.js
```

---

## Cách 3: Nếu dùng Nginx

Thêm vào `nginx.conf`:

```nginx
server {
  listen 80;
  server_name example.com;
  root /var/www/c7aio;

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css text/javascript application/json;

  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Serve index.html for directory requests
  location / {
    try_files $uri $uri/index.html /index.html;
  }

  # Serve specific files
  location ~ \.(html|json)$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
  }
}
```

---

## Cách 4: Nếu dùng GitHub Pages

Thêm file `404.html` trong thư mục gốc và đặt nội dung của `index.html` vào:

```html
<!-- Copy nội dung từ index.html -->
```

GitHub Pages tự động redirect 404 đến `404.html`, từ đó bạn có thể redirect về `index.html` bằng JavaScript:

```javascript
// 404.html
<script>
  window.location.href = '/index.html?page=' + window.location.pathname;
</script>
```

---

## Kết quả sau khi áp dụng:

✅ URL sẽ sạch hơn mà không cần `.html`
✅ Trang sẽ load nhanh hơn với cache optimization
✅ Gzip compression giảm kích thước file
✅ Hoạt động offline nhờ Service Worker
✅ SEO-friendly URLs

**Ví dụ:**
- Cũ: `https://example.com/index.html`
- Mới: `https://example.com/`

- Cũ: `https://example.com/nhiemvu/nv.html`
- Mới: `https://example.com/nhiemvu/nv`
