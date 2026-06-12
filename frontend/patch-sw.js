const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, 'public', 'sw.js');

if (fs.existsSync(swPath)) {
  let content = fs.readFileSync(swPath, 'utf8');
  
  const patch = `self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) {
    event.stopImmediatePropagation();
  }
});\n`;

  if (!content.includes("event.stopImmediatePropagation()")) {
    fs.writeFileSync(swPath, patch + content, 'utf8');
    console.log('✅ Service worker successfully patched to ignore non-HTTP/HTTPS requests.');
  } else {
    console.log('ℹ️ Service worker is already patched.');
  }
} else {
  console.log('⚠️ sw.js not found in public directory.');
}
