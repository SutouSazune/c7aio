# Deployment Configuration Guide

## 📋 Nếu Commit Lên GitHub

Bạn không cần server riêng vì GitHub Pages sẽ tự xử lý. Tôi đã tạo các file config cho các platform khác nhau:

---

## 🚀 **Cách 1: GitHub Pages (Khuyến nghị)**

### Bước 1: Đẩy code lên GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Bước 2: Enable GitHub Pages
1. Vào **Settings** → **Pages**
2. Chọn **Main branch** làm source
3. Chọn **/(root)** folder
4. Click **Save**

### Bước 3: Chờ deployment
GitHub sẽ tự động deploy trong vài phút. Truy cập:
```
https://yourusername.github.io/c7aio
```

**Cách hoạt động:**
- ✅ File `_config.yml` sẽ hỗ trợ `.htaccess`
- ✅ URL `/nhiemvu/nv` → sẽ tìm `nhiemvu/nv.html`
- ✅ 404 page sẽ hiển thị đúng

---

## 🚀 **Cách 2: Vercel (Nhanh hơn, Pro hơn)**

### Bước 1: Deploy lần đầu
1. Vào https://vercel.com
2. Click **New Project**
3. Chọn GitHub repository
4. Click **Deploy**

### Kết quả tự động:
- ✅ URL routing hoạt động (vercel.json sẽ xử lý)
- ✅ Tự động HTTPS
- ✅ CDN toàn cầu
- ✅ Analytics miễn phí

**Truy cập:**
```
https://c7aio.vercel.app
```

---

## 🚀 **Cách 3: Netlify (Dễ nhất)**

### Bước 1: Deploy lần đầu
1. Vào https://netlify.com
2. Click **Add new site** → **Import an existing project**
3. Chọn GitHub
4. Chọn repository
5. Click **Deploy**

### Kết quả tự động:
- ✅ URL routing hoạt động (netlify.toml sẽ xử lý)
- ✅ Tự động HTTPS & HTTP/2
- ✅ CDN + DDoS protection
- ✅ Serverless functions (nếu cần)

**Truy cập:**
```
https://c7aio.netlify.app
```

---

## 📊 So Sánh:

| Feature | GitHub Pages | Vercel | Netlify |
|---------|:---:|:---:|:---:|
| Miễn phí | ✅ | ✅ | ✅ |
| Setup dễ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Tốc độ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Analytics | ❌ | ✅ | ✅ |
| Custom domain | ✅ | ✅ | ✅ |
| Environment vars | ❌ | ✅ | ✅ |
| Preview deploys | ❌ | ✅ | ✅ |

---

## 🎯 Khuyến nghị:

### **Cho lớp học (GitHub Pages)**
```bash
git push origin main
# Xong! Tự động deploy
```

### **Cho production (Vercel)**
- Deploy tự động mỗi khi push
- Preview URL cho PRs
- Analytics & monitoring

### **Cho flexibility (Netlify)**
- Build hooks
- Form submissions
- Serverless functions

---

## 📝 .gitignore

Đảm bảo file này tồn tại để không commit những file không cần thiết:

```
# Dependencies
node_modules/
package-lock.json

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Local
.env
.env.local

# Build
dist/
build/
.cache/

# Logs
npm-debug.log
*.log
```

---

## 🔒 Security Tips

1. **Không commit sensitive data:**
   - API keys
   - Firebase config (hoặc public key là OK)
   - Passwords

2. **Sử dụng environment variables** (nếu cần):
   - GitHub Pages: Không hỗ trợ
   - Vercel/Netlify: Hỗ trợ qua Settings

3. **Enable GitHub security features:**
   - Settings → Security & analysis
   - Enable Dependabot alerts

---

## ✅ Checklist trước push:

- [ ] Xóa `server.js` (không cần cho GitHub)
- [ ] Xóa `package.json` (không cần cho GitHub)
- [ ] Kiểm tra 404.html hoạt động locally
- [ ] Service Worker được cache đúng
- [ ] Không có hardcoded URLs (dùng relative paths)
- [ ] `manifest.json` cập nhật
- [ ] `.gitignore` có cả `node_modules`

---

## 🚀 Deploy Commands:

### GitHub
```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```

---

## 💡 Mẹo:

**Custom domain:**
- GitHub Pages: Settings → Pages → Custom domain
- Vercel: Settings → Domains
- Netlify: Site settings → Domain management

Ví dụ: `class.example.com` thay vì `yourusername.github.io/c7aio`
