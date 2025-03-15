import fs from 'fs';
import archiver from 'archiver';
import { promisify } from 'util';
import path from 'path';

const rename = promisify(fs.rename);
const copyFile = promisify(fs.copyFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const rmdir = promisify(fs.rmdir);
const unlink = promisify(fs.unlink);

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function info(message) {
  const err = new Error();
  const stack = err.stack.split('\n');
  //console.log('stack=', stack);
  // 通常，第 2 行包含了调用 logWithLocation 的信息
  const callerInfo = stack[2].trim().split(' ');
  let location = callerInfo[callerInfo.length-1];
  //if(startWith(location, '(')==true){
  //  location = location.substring(1);
  //}
  //if(endWith(location, ')')==true){
  //  location - location.substring(0, location.length-1);
  //}
  const parts = location.split(':');
  const fileName = parts[0];
  const lineNumber = parts[1];
  const methodName = parts[2];
  const logMessage = `[${fileName}:${methodName}:${lineNumber}] Info: ${message}\n`;
  console.log(logMessage);
  let logfilename = path.join(__dirname, 'log', 'app-'+dateStrNoSep()+'.log');
  fs.appendFile(logfilename, logMessage, (err) => {
      if (err) {
          console.error('Error writing to log file:', err);
      }
  });
}

export function error(message) {
  const err = new Error();
  const stack = err.stack.split('\n');
  // 通常，第 2 行包含了调用 logWithLocation 的信息
  const callerInfo = stack[2].trim().split(' ');
  let location = callerInfo[callerInfo.length-1];
  //if(startWith(location, '(')==true){
  //  location = location.substring(1);
  //}
  //if(endWith(location, ')')==true){
  //  location - location.substring(0, location.length-1);
  //}
  const parts = location.split(':');
  const fileName = parts[0];
  const lineNumber = parts[1];
  const methodName = parts[2];
  const logMessage = `[${fileName}:${methodName}:${lineNumber}] Error: ${message}\n`;
  console.error(logMessage);
  let logfilename = path.join(__dirname, 'log', 'app-'+dateStrNoSep()+'.log');
  fs.appendFile(logfilename, logMessage, (err) => {
      if (err) {
          console.error('Error writing to log file:', err);
      }
  });
}

export function startWith(str, firstStr){
  if(isValid(str)==false || isValid(firstStr)==false){
    return false;
  }
  if(str.length<firstStr.length){
    return false;
  }
  return str.indexOf(firstStr) == 0;
}

export function endWith(str, endStr){
  if(isValid(str)==false || isValid(endStr)==false){
    return false;
  }
  if(str.length<endStr.length){
    return false;
  }
  return str.substring(str.length-endStr.length) == endStr;
}

export function dateStrNoSep() {
  const now = Date.now();
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = year + month + day;
  return dateString;
}

export function timeStrNoSep() {
  const now = new Date();
  // 获取年
  const year = now.getFullYear();
  // 获取月，注意 getMonth() 返回值范围是 0 - 11，所以要加 1
  const month = String(now.getMonth() + 1).padStart(2, '0');
  // 获取日
  const day = String(now.getDate()).padStart(2, '0');
  // 获取时
  const hours = String(now.getHours()).padStart(2, '0');
  // 获取分
  const minutes = String(now.getMinutes()).padStart(2, '0');
  // 获取秒
  const seconds = String(now.getSeconds()).padStart(2, '0');
  // 获取毫秒
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
}
export function isValid(val){
  if(Object.prototype.toString.call(val) === '[object Object]'){
    //console.log('L636')
    if(Reflect.ownKeys(val).length<=0){
      return false
    }
  } else {
    if(val == '' && val.length == 0){
      //console.log('L460')
      return false
    }
    if(val == 0 || val == '0'){
      //console.log('L464')
      return true
    }
    if(val == undefined || val == 'undefined' || val == 'UNDEFINED'
        || val == null || val=='null' || val=='NULL' || val=='Null' || val==''){
      //console.log('L468')
      return false
    }
  }
  return true
}
export async function compressFiles(source, zipfilename) {
  return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipfilename);
      const archive = archiver('zip', {
          zlib: { level: 9 }
      });

      output.on('close', () => {
          console.log(archive.pointer() + ' 字节已被压缩到 '+zipfilename);
          resolve();
      });
      
      output.on('end', () => {
          console.log('数据已全部写入');
      });

      archive.on('error', (err) => {
          reject(err);
      });
      archive.pipe(output);
      //const itemsToCompress = ['folder1', 'folder2', 'file1.txt', 'file2.json'];
      source.forEach((item) => {
          if (fs.existsSync(item)) {
              const stat = fs.statSync(item);
              if (stat.isDirectory()) {
                  //archive.directory(item, item);
                  addDirectoryRecursively(archive, item);
              } else {
                  archive.file(item, { name: path.basename(item) });
              }
          } else {
              console.log(`${item} 不存在，跳过`);
          }
      });
      archive.finalize();
  });
}
// 递归添加文件夹及子内容（包含空文件夹）
function addDirectoryRecursively(archive, dirPath, basePath = '') {
    const files = fs.readdirSync(dirPath);
    if (files.length === 0) {
        // 如果是空文件夹，添加一个空的目录项到压缩包
        archive.append(null, { name: basePath + path.basename(dirPath) + '/' });
    } else {
        files.forEach((file) => {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                addDirectoryRecursively(archive, filePath, basePath + path.basename(dirPath) + '/');
            } else {
                archive.file(filePath, { name: basePath + path.basename(dirPath) + '/' + file });
            }
        });
    }
}
// 压缩文件夹到outputPath指定的zip文件
export async function doZip(sourceFolder, outputPath) {
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } //较低的压缩率能保证压缩速度
  });
  const stat = promisify(fs.stat);
  //const readdir = promisify(fs.readdir);
  //const append = promisify(archive.append.bind(archive));
  //const finalize = promisify(archive.finalize.bind(archive));
  archive.pipe(output);
  try {
    const stats = fs.statSync(sourceFolder);
    if(stats.isDirectory()){
      archive.directory(sourceFolder, path.basename(sourceFolder));
    }else{
      archive.append(fs.createReadStream(sourceFolder), { name: path.basename(sourceFolder) });
    }
    await archive.finalize();
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
  } catch (err) {
    console.error('Error during archiving:', err);
    return false;
  }
  return true;
}
function addToArchive(archive, filePath, archivePath) {
  archive.directory(filePath, path.basename(filePath));
  const items = fs.readdirSync(filePath);
  if(items.length === 0){
    archive.append(null, {name: archivePath + '/'});
    return;
  }
  /*
  items.forEach(item=>{
    const itemPath = path.join(filePath, item);
    const archiveItemPath = archivePath ? path.join(archivePath, item):item;
    if(fs.statSync(itemPath).isDirectory()){
      addToArchive(archive, itemPath, archiveItemPath);
    }else{
      archive.file(itemPath, {name: archiveItemPath});
    }
  });*/
  /*
    try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            const files = fs.readdirSync(filePath);
            files.forEach(file => {
                const subPath = path.join(filePath, file);
                const subArchivePath = path.join(archivePath, file);
                addToArchive(archive, subPath, subArchivePath);
            });
        } else if (stats.isFile()) {
            archive.append(fs.createReadStream(filePath), { name: archivePath });
        }
    } catch (err) {
        console.error('Error adding item to archive:', err);
    }*/
}
// 读取不同语言的 JSON 文件
export function readLanguageData(lang){
  const filePath = path.join(__dirname, 'lang', `${lang}.json`);
  try {
      const dataRaw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(dataRaw);
  } catch (err) {
      console.error(`Error reading ${lang}.json:`, err);
      return [];
  }
};
/**
 * 递归计算文件夹大小
 * @param {string} dirPath - 要计算大小的文件夹路径
 * @param {function} callback - 计算完成后的回调函数，接收文件夹大小（以字节为单位）作为参数
 */
export function getFolderSize(dirPath) {
  return new Promise((resolve, reject) => {
    let totalSize = 0;

    // 读取文件夹中的所有子项
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return reject(err);
      }

      let remaining = files.length;
      if (remaining === 0) {
        return resolve(totalSize);
      }

      files.forEach((file) => {
        const filePath = path.join(dirPath, file);

        // 获取文件或文件夹的信息
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error('L224 err=', err);
            return null; //reject(err);
          }

          if (stats.isDirectory()) {
            // 如果是文件夹，递归调用 getFolderSize 函数
            getFolderSize(filePath)
               .then((size) => {
                totalSize += size;
                if (--remaining === 0) {
                  resolve(totalSize);
                }
              })
               .catch(reject);
          } else {
            // 如果是文件，累加文件大小
            totalSize += stats.size;
            if (--remaining === 0) {
              resolve(totalSize);
            }
          }
        });
      });
    });
  });
}

export function isFileExist(fullpath){
 try {
    fs.statSync(fullpath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
export function getFileSize(file){
  try {
    const stats = fs.statSync(file);
    return stats.size;
    //const fileSizeInBytes = stats.size;
    //console.log(`文件大小为: ${fileSizeInBytes} 字节`);
  } catch (err) {
    console.error('获取文件信息时出错:', err);
    return null;
  }
}
function isFolder(pathToCheck) {
    try {
        const stats = fs.statSync(pathToCheck);
        return stats.isDirectory();
    } catch (error) {
        // 若路径不存在或出现其他错误，返回 false
        return false;
    }
}

// 检查文件或文件夹是否存在，若存在则返回重命名后的路径
export function getUniquePath(targetDir, fullSourcePath) {
  let baseName = path.basename(fullSourcePath);
  let ext = '';//path.extname(baseName);
  if(filename.indexOf('.')>=0){
    ext = '.'+filename.split('.')[filename.split('.').length-1];
  }
  let nameWithoutExt = baseName.slice(0, -ext.length);
  if(isFolder(fullSourcePath)==true){
    nameWithoutExt = baseName;
  }
  let counter = 1;
  let newName = baseName;
  let newPath = path.join(targetDir, newName);

  while (fs.existsSync(newPath)) {
    newName = `${nameWithoutExt} (${counter})${ext}`;
    newPath = path.join(targetDir, newName);
    counter++;
  }
  return newPath;
}

export function getUniqueFileName(targetDir, filename) {
  let baseName = path.basename(filename);
  let ext = '';//path.extname(baseName);
  if(filename.indexOf('.')>=0){
    ext = '.'+filename.split('.')[filename.split('.').length-1];
  }
  let nameWithoutExt = baseName.slice(0, -ext.length);
  let counter = 1;
  let newName = baseName;
  let newPath = path.join(targetDir, newName);
  console.log('L318 baseName='+baseName);
  console.log('L319 newPath='+newPath);
  console.log('L320 nameWithoutExt='+nameWithoutExt);
  while (fs.existsSync(newPath)) {
    //newName = `${nameWithoutExt} (${counter})${ext}`;
    newName = nameWithoutExt + '(' + counter + ')'+ext;
    console.log('L323 newName='+newName);
    newPath = path.join(targetDir, newName);
    counter++;
  }
  return newPath;
}

// 同步复制文件
function copyFileSync(sourcePath, destinationDir) {
    let uniqueDestinationPath = getUniquePath(destinationDir, sourcePath);
    try {
        fs.copyFileSync(sourcePath, uniqueDestinationPath);
        console.log(`文件 ${sourcePath} 已复制到 ${uniqueDestinationPath}`);
    } catch (err) {
        console.error(`复制文件 ${sourcePath} 时出错:`, err);
        return false;
    }
    return true;
}

// 同步递归复制文件夹
export function copyDirectorySync(sourceDir, destinationDir) {
    try {
        let uniqueDestinationDir = getUniquePath(destinationDir, sourceDir);
        if (!fs.existsSync(uniqueDestinationDir)) {
            fs.mkdirSync(uniqueDestinationDir, { recursive: true });
        }
        const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
        let tf = true;
        for (const entry of entries) {
            const sourcePath = path.join(sourceDir, entry.name);
            if (entry.isDirectory()) {
                tf = copyDirectorySync(sourcePath, uniqueDestinationDir);
            } else {
                tf = copyFileSync(sourcePath, uniqueDestinationDir);
            }
            if(tf == false){
              return tf;
            }
        }
        console.log(`文件夹 ${sourceDir} 已复制到 ${uniqueDestinationDir}`);
    } catch (err) {
        console.error(`复制文件夹 ${sourceDir} 时出错:`, err);
        return false;
    }
    return true;
}

// 复制文件或文件夹到指定目录
export function copySourceToDestinationSync(source, destination) {
    try {
        const stats = fs.statSync(source);
        let tf = true;
        if (stats.isFile()) {
            tf = copyFileSync(source, destination);
        } else if (stats.isDirectory()) {
            tf = copyDirectorySync(source, destination);
        }
        if(tf == false){
          return tf;
        }
    } catch (err) {
        console.error(`检查源路径 ${source} 时出错:`, err);
        return false;
    }
    return true;
}

// 移动文件或文件夹
export async function move(source, destination) {
    try {
        const stats = await stat(source);
        const destDir = path.dirname(destination);
        await createDirectoryIfNotExists(destDir);

        if (stats.isDirectory()) {
            //const nonConflictingDest = getNonConflictingPath(destination);
            const nonConflictingDest = getUniquePath(destination, source);
            if (!fs.existsSync(nonConflictingDest)) {
                fs.mkdirSync(nonConflictingDest, { recursive: true });
            }
            try {
              await copyDirectory(source, nonConflictingDest);
              await rmdir(source);
              //await rename(source, nonConflictingDest);
            } catch (error) {
              console.log('L375 error=', error);
              return false;
            }
        } else {
            //const nonConflictingDest = getNonConflictingPath(destination);
            const nonConflictingDest = getUniquePath(destination, source);
            try {
                //await rename(source, nonConflictingDest);
                await copyFile(source, nonConflictingDest);
                await unlink(source);
            } catch (error) {
              console.log('L386 error=', error);
              return false;
                //if (error.code === 'EXDEV') {
                //    await copyFile(source, nonConflictingDest);
                //    await unlink(source);
                //} else {
                //    throw error;
                //}
            }
        }
        console.log(`Moved ${source} to ${destination}`);
        return true;
    } catch (error) {
        console.error(`Error moving ${source}:`, error);
        return false;
    }
}

async function createDirectoryIfNotExists(dir) {
    if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
    }
}

function getNonConflictingPath(targetPath) {
    let baseName = path.basename(targetPath, path.extname(targetPath));
    let ext = path.extname(targetPath);
    let newPath = targetPath;
    let counter = 1;
    while (fs.existsSync(newPath)) {
        newPath = path.join(
            path.dirname(targetPath),
            `${baseName} (${counter})${ext}`
        );
        counter++;
    }
    return newPath;
}

async function copyDirectory(source, destination) {
    await createDirectoryIfNotExists(destination);
    const files = await readdir(source);
    for (const file of files) {
        const srcPath = path.join(source, file);
        const destPath = path.join(destination, file);
        const stats = await stat(srcPath);
        if (stats.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await copyFile(srcPath, destPath);
        }
    }
}

// 删除文件或文件夹
export async function deleteFileOrFolder(targetPath) {
    let tf = true;
    try {
        const stats = await stat(targetPath);
        if (stats.isDirectory()) {
            const files = await readdir(targetPath);
            for (const file of files) {
                const curPath = path.join(targetPath, file);
                tf = await deleteFileOrFolder(curPath);
                if(tf == false){
                  return false;
                }
            }
            await rmdir(targetPath);
            console.log(`已删除文件夹: ${targetPath}`);
        } else {
            await unlink(targetPath);
            console.log(`已删除文件: ${targetPath}`);
        }
    } catch (error) {
        console.error(`删除 ${targetPath} 时出错:`, error);
        return false;
    }
    return true;
}
