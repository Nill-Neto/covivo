import fs from "fs";
import path from "path";

const dir = ".dyad/media";
const files = fs.readdirSync(dir);

let newest = null;
let newestTime = 0;

for (const file of files) {
  const stat = fs.statSync(path.join(dir, file));
  if (stat.mtimeMs > newestTime) {
    newestTime = stat.mtimeMs;
    newest = file;
  }
}

if (newest) {
  fs.copyFileSync(path.join(dir, newest), "public/logo.png");
  console.log("Copied", newest, "to public/logo.png");
} else {
  console.log("No files found");
}