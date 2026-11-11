// Tiny static server for testing the built game in a browser (file:// pages cannot run the game's scripts).
// Usage: node tools/serve.js [folder=app] [port=8080]   then open http://localhost:8080/index.html?test
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || 'app'), port = +process.argv[3] || 8080;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
