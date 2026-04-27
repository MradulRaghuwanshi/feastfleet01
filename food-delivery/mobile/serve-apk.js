const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const APK_PATH = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    // Serve download page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FeastFleet APK Download</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #aaa; margin-bottom: 24px; line-height: 1.5; }
    .apk-info {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .apk-info div { margin: 4px 0; }
    .apk-info span { color: #ff6b35; font-weight: 600; }
    .btn {
      display: inline-block;
      background: #ff6b35;
      color: #fff;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 50px;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(255,107,53,0.4); }
    .url-box {
      background: rgba(0,0,0,0.3);
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
      color: #4ade80;
      margin-top: 16px;
    }
    .steps {
      text-align: left;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 16px;
      margin-top: 24px;
      font-size: 14px;
    }
    .steps h3 { margin-bottom: 12px; color: #ff6b35; }
    .steps ol { padding-left: 20px; }
    .steps li { margin: 8px 0; color: #ccc; }
    .warning {
      background: rgba(255,193,7,0.15);
      border-left: 3px solid #ffc107;
      padding: 12px;
      border-radius: 0 8px 8px 0;
      margin-top: 16px;
      font-size: 13px;
      color: #ffc107;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🍔</div>
    <h1>FeastFleet</h1>
    <p>Download the Android app directly to your phone</p>
    
    <div class="apk-info">
      <div>📦 <span>app-debug.apk</span></div>
      <div>📏 <span>4.04 MB</span></div>
      <div>🔒 <span>Debug Build</span></div>
    
    <a class="btn" href="/download" download="feastfleet.apk">⬇️ Download APK</a>
    
    <div class="url-box">
      http://${LOCAL_IP}:${PORT}/download
    </div>
    
    <div class="steps">
      <h3>📱 How to Install</h3>
      <ol>
        <li>Make sure your phone is on the <strong>same WiFi</strong> as this computer</li>
        <li>Open this URL in your phone's browser</li>
        <li>Tap the Download button</li>
        <li>When downloaded, open the APK file</li>
        <li>Allow "Install unknown apps" if prompted</li>
        <li>Tap Install</li>
      </ol>
    </div>
    
    <div class="warning">
      ⚠️ If Chrome blocks the download, use Firefox or Samsung Internet browser, or enable "Install unknown apps" in Settings first.
    </div>
</body>
</html>`);
  } else if (req.url === '/download') {
    // Serve the APK file
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('APK not found. Please build it first with: ./gradlew assembleDebug');
      return;
    }

    const stat = fs.statSync(APK_PATH);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="feastfleet.apk"',
      'Content-Length': stat.size
    });

    const readStream = fs.createReadStream(APK_PATH);
    readStream.pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('  🍔 FeastFleet APK Download Server');
  console.log('='.repeat(60));
  console.log('\n📦 APK: app-debug.apk (4.04 MB)');
  console.log('\n🌐 Open one of these URLs on your phone:');
  console.log('   \x1b[32mhttp://' + LOCAL_IP + ':' + PORT + '\x1b[0m');
  console.log('   \x1b[32mhttp://' + LOCAL_IP + ':' + PORT + '/download\x1b[0m');
  console.log('\n📱 Make sure your phone is on the SAME WiFi network!');
  console.log('\n⏹️  Press Ctrl+C to stop the server');
  console.log('='.repeat(60) + '\n');
});
