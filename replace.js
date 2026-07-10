const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const filesToUpdate = [];
const dirsToScan = ['./app', './prisma'];

dirsToScan.forEach(dir => {
    walkDir(dir, function(filePath) {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        filesToUpdate.push(filePath);
      }
    });
});

filesToUpdate.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/Psikoest/g, 'Seleksia');
  newContent = newContent.replace(/psikoest/g, 'seleksia');
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log(`Updated ${file}`);
  }
});
