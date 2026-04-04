import fs from 'fs';
import path from 'path';

const dir = '.dyad/media';
const files = fs.readdirSync(dir);
const stats = files.map(f => ({ file: f, stat: fs.statSync(path.join(dir, f)) }));
stats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
console.log(stats.map(s => s.file).join('\n'));
