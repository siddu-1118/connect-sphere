const http = require('http');
const httpProxy = require('http-proxy');

// Create proxy server instances
const proxy = httpProxy.createProxyServer({});

// Target ports
const FRONTEND_TARGET = 'http://localhost:3001';
const BACKEND_TARGET = 'http://localhost:4000';

const server = http.createServer((req, res) => {
  // Determine target based on URL path
  const target = (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) 
    ? BACKEND_TARGET 
    : FRONTEND_TARGET;

  proxy.web(req, res, { target }, (err) => {
    console.error(`Proxy error for ${req.url}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway');
    }
  });
});

// Upgrade WebSocket connections
server.on('upgrade', (req, socket, head) => {
  const target = (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) 
    ? BACKEND_TARGET 
    : FRONTEND_TARGET;

  console.log(`Upgrading WS request for ${req.url} to ${target}`);
  proxy.ws(req, socket, head, { target }, (err) => {
    console.error(`WS Proxy error for ${req.url}:`, err.message);
    socket.destroy();
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Reverse proxy running on port ${PORT}`);
  console.log(`   Routing /api and /socket.io -> ${BACKEND_TARGET}`);
  console.log(`   Routing others              -> ${FRONTEND_TARGET}`);
});
