import fs from 'fs';
import path from 'path';

const mediaDir = '.dyad/media';
const files = fs.readdirSync(mediaDir).filter(f => f.endsWith('.png'));

let latestFile = null;
let latestTime = 0;

for (const file of files) {
  const stat = fs.statSync(path.join(mediaDir, file));
  if (stat.mtimeMs > latestTime) {
    latestTime = stat.mtimeMs;
    latestFile = file;
  }
}

if (latestFile) {
  fs.copyFileSync(path.join(mediaDir, latestFile), 'public/logo.png');
  console.log('Copied ' + latestFile + ' to public/logo.png');
}
