const http = require('http');
const handler = require('serve-handler');
const clients = new Set();

// Start HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/esbuild') {
    return handleSSE(req, res);
  }
  return handler(req, res, { public: '.' });
});

server.listen(8080);
console.log('Development server running at http://localhost:8080');

// Handle Server-Sent Events
function handleSSE(req, res) {
  clients.add(res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  req.on('close', () => clients.delete(res));
}

// Watch for file changes
require('chokidar').watch([
  '*.html',
  '*.js',
  'js/**/*.js',
  'img/**/*'
], {
  ignored: ['node_modules', 'dev-server.js']
}).on('all', () => {
  clients.forEach(client => client.write('data: update\n\n'));
});
