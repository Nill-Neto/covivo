import fs from 'fs';

function getInfo() {
  try {
    const stats = fs.statSync('public/logo.png');
    console.log('Size:', stats.size);
    const buffer = fs.readFileSync('public/logo.png');
    console.log('Header:', buffer.subarray(0, 8).toString('hex'));
  } catch (e) {
    console.log('Error:', e);
  }
}
getInfo();