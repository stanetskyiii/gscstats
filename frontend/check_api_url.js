const fs = require('fs');
const path = require('path');

const targetDirectory = "C:\\Users\\Андрей\\Desktop\\GSCSTATS\\frontend";
const searchString = "http://localhost:8000";

function searchFiles(directory) {
  let filesWithString = [];
  const items = fs.readdirSync(directory);
  
  items.forEach(item => {
    const fullPath = path.join(directory, item);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      filesWithString = filesWithString.concat(searchFiles(fullPath));
    } else if (stats.isFile()) {
      // Проверяем только текстовые файлы (расширения можно расширить по необходимости)
      const ext = path.extname(fullPath);
      const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css'];
      if (allowedExtensions.includes(ext)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes(searchString)) {
            filesWithString.push(fullPath);
          }
        } catch (err) {
          console.error("Ошибка чтения файла", fullPath, err);
        }
      }
    }
  });
  
  return filesWithString;
}

const results = searchFiles(targetDirectory);
if (results.length > 0) {
  console.log("Найдены файлы, содержащие строку:", searchString);
  results.forEach(file => console.log(file));
} else {
  console.log(`Строка "${searchString}" не найдена в файлах проекта.`);
}
