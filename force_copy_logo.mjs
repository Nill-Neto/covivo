import fs from 'fs';
import path from 'path';

try {
  const sourcePath = path.join('.dyad/media', 'a5d088272e57908568998ab7e049a992.png');
  const destPath = 'public/logo.png';
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log('Logo copied successfully!');
  } else {
    console.log('Source file not found:', sourcePath);
  }
} catch (e) {
  console.error('Error copying logo:', e);
}