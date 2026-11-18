// Simple Node.js web app (no external packages needed)
const http = require('http');

const APP_VERSION = '1.0.0';
const MESSAGE = 'Hello from the CI/CD pipeline!';

function handler(req, res) {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(
    `<h1>${MESSAGE}</h1>` +
    `<p>Version: ${APP_VERSION}</p>` +
    `<p>Served by pod: ${process.env.HOSTNAME || 'local'}</p>`
  );
}

const server = http.createServer(handler);

// Start the server only when this file is run directly (not during tests)
if (require.main === module) {
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`App v${APP_VERSION} listening on port ${port}`));
}

module.exports = { server, APP_VERSION, MESSAGE };
