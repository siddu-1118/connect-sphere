require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  
  try {
    const fs = require('fs');
    const path = require('path');
    const pagePath = 'c:/connect sphere/connectsphere/frontend/src/app/(app)/meet/[id]/page.tsx';
    
    if (!fs.existsSync(pagePath)) {
      console.log('File does not exist:', pagePath);
      return;
    }
    
    const lines = fs.readFileSync(pagePath, 'utf8').split('\n');
    console.log('Searching page.tsx for MediaPipe/blur...');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      if (line.includes('Selfie') || line.includes('Segmentation') || line.includes('blur') || line.includes('canvas')) {
        if (line.trim().length > 0 && line.trim().length < 150) {
          console.log(`${lineNum}: ${line.trim()}`);
        }
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
