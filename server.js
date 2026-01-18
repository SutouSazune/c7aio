const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();

// Middleware
app.use(compression());
app.use(express.static(path.join(__dirname), {
  extensions: ['html', 'htm']
}));

// Serve index.html for folder requests
app.get('*', (req, res, next) => {
  // Skip static files and API routes
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return next();
  }

  // Try to serve the file as-is first
  const filePath = path.join(__dirname, req.path);
  
  // Check if file exists
  const fs = require('fs');
  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isDirectory()) {
      // It's a directory, serve index.html
      res.sendFile(path.join(filePath, 'index.html'), (err) => {
        if (err) {
          res.status(404).sendFile(path.join(__dirname, '404.html'));
        }
      });
    } else {
      // It's a file, serve it
      res.sendFile(filePath);
    }
  } else {
    // File doesn't exist, try with .html extension
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      // Not found, serve 404 page
      res.status(404).sendFile(path.join(__dirname, '404.html'));
    }
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).sendFile(path.join(__dirname, '500.html'));
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 Server đang chạy                   ║
║  🌐 http://${HOST}:${PORT}${' '.repeat(Math.max(0, 35 - HOST.length - PORT.toString().length))}║
║  📁 Thư mục: ${path.basename(__dirname)}${' '.repeat(Math.max(0, 27 - path.basename(__dirname).length))}║
║  💾 Compression: Bật                    ║
╚════════════════════════════════════════╝
  `);
});
