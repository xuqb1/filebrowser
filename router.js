const express = require('express');
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bodyParser = require('body-parser');
const lodash = require('lodash');
const session = require('express-session');
const os = require('os');
const multer = require('multer');

const utils = require('./utils');
//import { loginfo, logerror } from './utils.js'

// 创建一个新的路由器对象
const router = express.Router();

// 初始化数据库
const adapter = new JSONFile('db.json');
const defaultData = {
  users: [], 
  settings: [], 
  shared: [], 
  global: [], 
  upload: [], 
  download: []
};
const db = new Low(adapter, defaultData); //初始化数据库对象，即从db.json中加载数据
let allRootFolder = '/opt/filebrowser'
//console.log('L29 platform=', os.platform());
if(os.platform()=='win32'){
  allRootFolder = 'D:\\files';
}

db.read()
.then(() => {
  //console.log('db.data=', db.data)
  if (utils.isValid(db.data) == false) { // 数据库为空，则初始化基本对象
    db.data = defaultData;
  }
  db.chain = lodash.chain(db.data); // 加载db的链式调用
  const adminUser = db.data.users.find(user => user.username === 'admin'); // 获取管理员账户
  if (!adminUser) { // 没获取到，则初始化一个管理员账户
    const rootFolderPath = ''; // 管理员的根目录就是全局根目录 allRootFolder
    fs.mkdirSync(allRootFolder, { recursive: true }); // rootFolderPath 创建管理员根目录文件夹
    bcrypt.hash('admin', 10, (err, hash) => { //使用Blowfish算法，根据原密码admin和盐轮数生成哈希值
      if (err) {
        console.error('L38 Error hashing admin password:', err);
        return;
      }
      let adminid = Date.now().toString(); // 管理员ID设置为日期
      db.data.users.push({
        id: adminid,
        username: 'admin',
        password: hash,
        rootFolderPath: rootFolderPath,
        isAdmin: 1
      });
      db.data.settings.push({
        userid: adminid, 
        lang: 'zh-CN', 
        notShowHiddenFile: false, 
        showAccurateTime: false
      })
      db.data.global = [
        {
          banOutlink: false, 
          banShowUsedDiskSpace: false, 
          lang: 'browser', 
          theme: 0, 
          instanceName: 'File Browser', 
          systemIcon: 'img/logo.svg', 
          uploadBlockSize: '10MB', 
          uploadFailRetryTimes: 5, 
          version: '1.0.0', 
          userRootPath: allRootFolder
        }
      ]
      console.log('L81 db.data.global=', db.data.global);
      db.write()
      .then(() => {
        utils.info('Admin user added successfully.');
      })
      .catch(err => {
        utils.error('Error adding admin user:', err);
      });
    });
  }
  return db.write();
})
.catch(err => {
  utils.error('Error reading from database:', err);
});

// 使用中间件解析请求体和会话管理
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(session({
  secret: 'myfileBrowser..',//'123456',
  resave: false,
  saveUninitialized: true
}));

// 根路径的路由
router.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/home');
  } else {
    res.redirect('/login');
  }
});

// 获取不同语言数组
router.post('/lang', (req, res) => {
  // 从请求的查询参数中获取 lang 值
  //const lang = req.query.lang || 'en'; 
  const lang = req.body.lang || 'en-US';
  const languageData = utils.readLanguageData(lang);
  //res.json(languageData);
  res.status(200).json({code:200, msg: 'getlang successful.', data: languageData});
});

// 注册用户
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  let isAdmin = 0;
  if (username === 'admin') {
    isAdmin = 1;
  }
  if (!username || !password) {
    res.status(400).json({code:400, msg:'Username and password are required.'});
    return;
  }
  const rootFolderPath = path.join(__dirname, 'userFolders', username);
  fs.mkdirSync(rootFolderPath, { recursive: true });
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      //res.status(500).send('Error hashing password.');
      res.status(500).json({code:500, msg:'Error hashing password..'});
      return;
    }
    db.data.users.push({ id: Date.now().toString(), username, password: hash, rootFolderPath, isAdmin });
    db.write()
    .then(() => {
      res.status(200).json({code: 200, msg: 'User registered successfully.'});
    })
    .catch(err => {
      res.status(500).json({code: 500,msg:'Error registering user.'});
    });
  });
});

// 登录用户
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username ||!password) {
    utils.error('Username or password are invalid:' + username + '/' + password);
    res.status(400).json({code:400,msg:'Username and password are required.'});
    return;
  }
  let user = db.data.users.find(user => user.username === username);
  if (!user) {
    utils.error('User not found:' + user);
    res.status(400).json({code:400,msg:'User not found.'});
    return;
  }
  let settings = db.data.settings.find(user => user.username == username);
  utils.info(JSON.stringify(user));
  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      res.status(500).json({code:500,msg:'Error comparing passwords.'});
      utils.error(err+' ,'+password+'/'+user.password);
      return;
    }
    if (result) {
      req.session.user = { username: username, isAdmin: user.isAdmin };
      let rsuser = JSON.parse(JSON.stringify(user));
      delete rsuser.password;
      if(settings){
        rsuser.settings = JSON.parse(JSON.stringify(settings));
      }
      if(user.isAdmin == 1){
        rsuser.global = db.data.global[0];
      }else{
        rsuser.global = {
          instanceName: db.data.global[0].instanceName, 
          systemIcon: db.data.global[0].systemIcon, 
          txtFileExt: db.data.global[0].txtFileExt, 
          picFileExt: db.data.global[0].picFileExt, 
          audFileExt: db.data.global[0].audFileExt, 
          vidFileExt: db.data.global[0].vidFileExt
        }
      }
      utils.info(username + ' Login successful.');
      res.status(200).json({code:200, msg: 'Login successful.', data: rsuser});
      //res.redirect('/home');
    } else {
      // 确保这里发送的是 JSON 响应
      res.status(401).json({code:401, msg: 'Invalid password.' });
    }
  });
});

// 修改用户密码
router.post('/user/password', (req, res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username, oldPassword, newPassword } = req.body;
  if (!username ||!oldPassword ||!newPassword) {
    res.status(400).json({code:400,msg:'Username, old password and new password are required.'});
    return;
  }
  const user = db.data.users.find(user => user.username === username);
  if (!user) {
    res.status(400).json({code:400,msg:'User not found.'});
    return;
  }
  bcrypt.compare(oldPassword, user.password, (err, result) => {
    if (err) {
      res.status(500).json({code:500,msg:'Error comparing passwords.'});
      return;
    }
    if (result) {
      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) {
          res.status(500).json({code:500,msg:'Error hashing new password.'});
          return;
        }
        user.password = hash;
        db.write()
        .then(() => {
          res.status(200).json({code:200,msg:'Password updated successfully.'});
        })
        .catch(err => {
          res.status(500).json({code:500,msg:'Error updating password.'});
        });
      });
    } else {
      res.status(401).json({code:401,msg:'Invalid old password.'});
    }
  });
});

// 退出登录
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.status(200).json({code:200,msg:'退出成功'});
});

// 主页路由
router.get('/home', (req, res) => {
  if(checkSession(req)==false){
    //res.status(400).json({code:400, msg:'need re-login'});
    res.redirect('/login');
    return;
  }
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// 登录页路由
router.get('/login', (req, res) => {
  if(checkSession(req)==true){
    //res.status(400).json({code:400, msg:'need re-login'});
    res.redirect('/home');
    return;
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 获取指定目录下的文件夹和文件
router.post('/files', (req, res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  let rootFolderPath = path.join(allRootFolder,user.rootFolderPath,req.body.currPath); // currPath 是相对路径
  //console.log('L270 rootFolderPath=',rootFolderPath);
  let currPathStats = fs.statSync(rootFolderPath);
  
  fs.readdir(rootFolderPath, async (err, files) => {
    if (err) {
      res.status(500).json({code:500, msg:'Error reading directory.'});
      return;
    }
    let fileList = [];
    let dirList = [];
    files.forEach(async file => {
      const fullPath = path.join(rootFolderPath, file);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        dirList.push({
          name: file,
          type: 'directory',
          size: await utils.getFolderSize(fullPath), //stats.size,
          modified: stats.mtime,
          path: fullPath
        });
      } else {
        fileList.push({
          name: file,
          type: 'file',
          size: stats.size,
          modified: stats.mtime,
          path: fullPath
        });
      }
    });
    let data = {
      code: 200,
      data: {
        dirList:dirList,
        fileList:fileList, 
        currPathInfo: {
          name: req.body.currPath, 
          type: 'directory', 
          size: await utils.getFolderSize(rootFolderPath), //currPathStats.size, 
          modified: currPathStats.mtime, 
          path: rootFolderPath
        }
      }
    }
    res.status(200).json(data);
  });
});

// 获取用户已用空间
router.post('/getDiskSpace', async (req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  let fullPath = path.join(allRootFolder,user.rootFolderPath)
  let usedSize = await utils.getFolderSize(fullPath);
  res.status(200).json({code:200,msg:'获取已有空间大小成功', data:{'usedDiskSpace': usedSize, 'totalDiskSpace': user.totalDiskSpace}});
  return;
});

// 获取程序版本
router.post('/getVersion', async (req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  let version = db.data.global[0].version;
  res.status(200).json({code:200,msg:'获取版本成功', data: version});
  return;
});

// 创建文件夹
router.post('/createFolder', (req,res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  let data = req.body;
  console.log('L335 data=',data);
  let folderName = data.folderName;
  let currPath = data.currPath;
  if(currPath == undefined || currPath == null || currPath == ''){
    currPath = user.rootFolderPath;
  }
  let fullPath = path.join(allRootFolder,currPath,folderName);
  fs.mkdir(fullPath, (err) => {
    if (err) {
      if (err.code === 'EXIST') {
        console.error('文件夹已存在:'+fullPath);
        res.status(200).json({code:200,msg:'文件夹已存在'});
        return;
      } else {
        console.error('创建文件夹 '+fullPath+' 时出错: ', err);
        res.status(400).json({code:400,msg:'创建文件夹出错'});
        return;
      }
    } else {
      console.log('文件夹创建成功');
      res.status(200).json({code:200,msg:'文件夹创建成功'});
      return;
    }
  });
});

// 创建文件
router.post('/createFile', (req,res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  let data = req.body;
  let fileName = data.fileName;
  let currPath = data.currPath;
  if(currPath == undefined || currPath == null || currPath == ''){
    currPath = user.rootFolderPath;
  }
  let fullPath = path.join(allRootFolder,currPath,fileName);
  if(utils.isFileExist(fullPath)){
    res.status(400).json({code:400,msg:'该文件或文件夹已存在'});
    return;
  }
  fs.writeFile(fullPath, '', (err) => {
  if (err) {
    console.error('创建文件时出错: ', err);
    res.status(400).json({code:400,msg:'创建文件出错'});
  } else {
    console.log('文件创建成功');
    res.status(200).json({code:200,msg:'文件创建成功'});
  }
  });
});

// 重命名文件
router.post('/renameFile', (req,res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  let data = req.body;
  let fileName = data.fileName;
  let oldFileName = data.oldFileName;
  let currPath = data.currPath;
  if(currPath == undefined || currPath == null || currPath == ''){
    currPath = user.rootFolderPath;
  }
  let oldPath = path.join(allRootFolder,currPath,oldFileName);
  let newPath = path.join(allRootFolder,currPath,fileName);
  if(utils.isFileExist(newPath)){
    res.status(400).json({code:400,msg:'新名称的文件或文件夹已存在'});
    return;
  }
  try {
    fs.renameSync(oldPath, newPath);
    console.log('文件重命名成功');
    res.status(200).json({code:200,msg:'文件重命名成功'});
  } catch (err) {
    console.error('重命名文件时出错:', err);
    res.status(400).json({code:400,msg:'创建文件出错'});
  }
});

// 复制文件
router.post('/copyFiles', async (req,res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  let data = req.body;
  let selectedFiles = data.selectedFiles;
  let destDir = data.destDir;
  let fullDestPath = path.join(allRootFolder,user.rootFolderPath,destDir);
  //console.log('L443 fullDeskPath=', fullDestPath);
  //console.log('L444 selectedFiles=', selectedFiles);
  // 路径嵌套检查
  for(item of selectedFiles){
    if(utils.startWith(fullDestPath, item.path)==true){
      //console.log('item.path='+item.path);
      //console.log('fullDestPath='+fullDestPath);
      //console.log('item.path.indexOf(fullDestPath)='+item.path.indexOf(fullDestPath));
      res.status(400).json({code:400,msg:'复制出错: 不能复制到包含了自身的路径中'});
      return;
    }
  }
  // 复制后磁盘空间检查
  let fullPath = path.join(allRootFolder,user.rootFolderPath)
  let usedSize = await utils.getFolderSize(fullPath);
  let addSize = 0;
  for(item of selectedFiles){
    if(item.type == 'directory'){
      addSize += await utils.getFolderSize(item.path);
    }else{
      addSize += utils.getFileSize(item.path);
    }
  }
  if((usedSize+addSize)/1024/1024/1024 > user.totalDiskSpace){
    res.status(400).json({code:400,msg:'复制出错:复制后已用空间将比总空间要大'});
    return;
  }
  for(item of selectedFiles){
    let tf = utils.copySourceToDestinationSync(item.path, fullDestPath);
    if(tf == false){
      res.status(400).json({code:400,msg:'复制出错'});
      return;
    }
  }
  res.status(200).json({code:200,msg:'复制成功'});
});

// 移动文件
router.post('/moveFiles', async (req,res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  let data = req.body;
  let selectedFiles = data.selectedFiles;
  let destDir = data.destDir;
  let fullDestPath = path.join(allRootFolder,user.rootFolderPath,destDir);
  //console.log('L443 fullDeskPath=', fullDestPath);
  //console.log('L444 selectedFiles=', selectedFiles);
  // 路径嵌套检查
  for(item of selectedFiles){
    if(utils.startWith(fullDestPath, item.path)==true){
      //console.log('item.path='+item.path);
      //console.log('fullDestPath='+fullDestPath);
      //console.log('item.path.indexOf(fullDestPath)='+item.path.indexOf(fullDestPath));
      res.status(400).json({code:400,msg:'移动出错: 不能移动到包含了自身的路径中'});
      return;
    }
  }
  for(item of selectedFiles){
    let tf = await utils.move(item.path, fullDestPath);
    if(tf == false){
      res.status(400).json({code:400,msg:'移动出错'});
      return;
    }
  }
  res.status(200).json({code:200,msg:'移动成功'});
});

// 删除文件、文件夹
router.post('/deleteFiles', async (req,res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  let data = req.body;
  let selectedFiles = data.selectedFiles;
  //console.log('L444 selectedFiles=', selectedFiles);
  for(item of selectedFiles){
    let tf = await utils.deleteFileOrFolder(item.path);
    if(tf == false){
      res.status(400).json({code:400,msg:'删除出错'});
      return;
    }
  }
  res.status(200).json({code:200,msg:'删除成功'});
});

// 共享文件
router.post('/share', (req, res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  const { filePath, sharedWithUser } = req.body;
  const item = findItemByPath(user.rootFolderPath, filePath);
  if (!item) {
    res.status(404).send('File or folder not found.');
    return;
  }
  if (!item.sharedWith) {
    item.sharedWith = [];
  }
  const sharedUser = db.data.users.find(u => u.username === sharedWithUser);
  if (!sharedUser) {
    res.status(404).send('Shared user not found.');
    return;
  }
  if (item.sharedWith.includes(sharedWithUser)) {
    res.status(400).send('File or folder already shared with this user.');
    return;
  }
  item.sharedWith.push(sharedWithUser);
  db.write()
  .then(() => {
    res.send('File or folder shared successfully.');
  })
  .catch(err => {
    res.status(500).send('Error sharing file or folder.');
  });
});

// 撤销共享
router.post('/unshare', (req, res) => {
    const { username } = req.session.user;
    if (!username) {
        res.status(403).send('You must be logged in to unshare files.');
        return;
    }
    const user = db.data.users.find(user => user.username === username);
    if (!user) {
        res.status(400).send('User not found.');
        return;
    }
    const { filePath, sharedWithUser } = req.body;
    const item = findItemByPath(user.rootFolderPath, filePath);
    if (!item) {
        res.status(404).send('File or folder not found.');
        return;
    }
    if (!item.sharedWith) {
        res.status(400).send('File or folder is not shared.');
        return;
    }
    const index = item.sharedWith.indexOf(sharedWithUser);
    if (index > -1) {
      item.sharedWith.splice(index, 1);
      db.write().then(() => {
          res.send('File or folder unshared successfully.');
        })
        .catch(err => {
          res.status(500).send('Error unsharing file or folder.');
        });
    } else {
        res.status(400).send('File or folder is not shared with this user.');
    }
});

// 下载文件
router.post('/download', async (req, res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  let currPath = req.body.currPath;
  let fileDirArr = req.body.data;
  let basePath = path.join(allRootFolder,user.rootFolderPath, currPath);
  let ziptempPath = path.join(allRootFolder, 'ziptemp');
  utils.info('basePath='+basePath);
  let dirs = [];
  let files = []
  let allfiles = [];
  for(let i=0;i<fileDirArr.length;i++){
    if(fileDirArr[i].type == 'directory'){ //分开要下载的文件夹和文件
      dirs.push(fileDirArr[i]);
    }else{
      allfiles.push({name: fileDirArr[i].name, path: fileDirArr[i].path});
    }
  }
  // 要分两种情况：如果只有一个，且是文件，则下载；否则要打包在一起下载
  if(allfiles.length == fileDirArr.length && fileDirArr.length == 1){
    let index = 0;
    const downloadNextFile = () => {
      if (index < allfiles.length) {
        const fileName = allfiles[index].name;
        const filePath = allfiles[index].path;//path.join(allfiles[index].path, fileName);
        // 直接使用 res.download 方法进行下载
        res.download(filePath, fileName, (err) => {
          if (err) {
            res.statusCode = 500;
            res.end(`Error downloading file: ${err}`);
            return;
          }
          index++;
          downloadNextFile();
        });
      } else {
        res.end();
      }
    };
    downloadNextFile();
    return;
  }
  // 要下载的列表中包含了目录，则要进行压缩
  let zipFilename = username + '-' + utils.timeStrNoSep() + '.zip'; //设置压缩文件名
  let zipfileFullPath = path.join(ziptempPath, zipFilename);
  let sourcepaths = [];
  fileDirArr.forEach(item=>{
    sourcepaths.push(item.path);
  });
  await utils.compressFiles(sourcepaths, zipfileFullPath);
  let ziparr = [{name:zipFilename, path:zipfileFullPath}];
  if(ziparr.length>0){
    let index = 0;
    const downloadNextFile = () => {
      if (index < ziparr.length) {
        res.download(ziparr[index].path, ziparr[index].name, (err)=>{
          if(err){
            res.statusCode = 500;
            res.end(`Error downloading file: ${err}`);
            return;
          }
          index++;
          downloadNextFile();
        });
      } else {
        res.end();
      }
    };
    downloadNextFile();
    return;
  }
});

// 更新用户设置
router.post('/updateSet', async (req, res) => {
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const users = db.data.users;
  const user = db.data.users.find(user => user.username === username);
  const userIndex = db.data.users.findIndex(user => user.username === username);
  if (userIndex === -1) {
    return res.status(404).json({ error: '用户未找到' });
  }
  // 更新用户的语言设置
  if(utils.isValid(req.body.lang)==true){
    users[userIndex].lang = req.body.lang;
  }
  // 更新用户的样式设置
  if(utils.isValid(req.body.theme)==true){
    users[userIndex].theme = req.body.theme;
  }
  await db.write();
  res.status(200).json({code:200,msg:'设置成功'});
});

// 上传文件
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
router.post('/upload', upload.single('fileData'), (req, res) => {
  const currentDirectory = req.body.currentDirectory;
  const fileName = req.body.fileName;
  const fileData = req.file.buffer; // 获取文件数据

  console.log('当前目录:', currentDirectory);
  console.log('文件名:', fileName);
  console.log('文件数据大小:', fileData.length);
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const user = db.data.users.find(user => user.username === username);
  // 构建完整的文件保存路径
  let filePath = path.join(allRootFolder,user.rootFolderPath,currentDirectory, fileName);
  filePath = utils.getUniqueFileName(path.join(allRootFolder,user.rootFolderPath,currentDirectory), fileName);
  // 将文件数据写入指定路径
  fs.writeFile(filePath, fileData, (err) => {
    if (err) {
      console.error('保存文件时出错:', err);
      res.status(400).json({code:400,msg:'保存出错'});
      return;
    }
    console.log('文件保存成功:', filePath);
    //res.status(400).json({code:400,msg:'删除出错'});
  });
  res.status(200).json({code:200,result:true, msg:'文件上传成功'});
  //res.send('文件上传成功');
});
// 更新系统名称与图标
router.post('/updateNameIcon', upload.single('fileData'), async (req, res) => {
  const currentDirectory = path.join(__dirname, 'public', 'img');//req.body.currentDirectory;
  const fileName = req.body.fileName;
  let fileData = '';
  if(utils.isValid(req.file)){
    fileData = req.file.buffer; // 获取文件数据
  }
  const sysName = req.body.sysName;
  let needUpdate = false;
  let newFilename = '';
  if(utils.isValid(fileName)==true && utils.isValid(fileData)==true && fileData.length>0){
    let filePath = utils.getUniqueFileName(currentDirectory, fileName);
    newFilename = path.basename(filePath);
    console.log('完整文件名:', filePath);
    console.log('文件数据大小:', fileData.length);
    if(checkSession(req)==false){
      res.status(400).json({code:400, msg:'need re-login'});
      return;
    }
    const { username } = req.session.user;
    const user = db.data.users.find(user => user.username === username);
    // 将文件数据写入指定路径
    fs.writeFile(filePath, fileData, (err) => {
      if (err) {
        console.error('保存文件时出错:', err);
        res.status(400).json({code:400,msg:'保存出错'});
        return;
      }
      console.log('文件保存成功:', filePath);
      //res.status(400).json({code:400,msg:'删除出错'});
      db.data.global[0].systemIcon = 'img/' + newFilename;
      needUpdate = true;
    });
  }
  
  if(utils.isValid(sysName)==true){
    db.data.global[0].instanceName;
    needUpdate = true;
  }
  if(needUpdate == true){
    await db.write();
    res.status(200).json({code:200,result:true, msg:'更新成功', data: newFilename});
  } else {
    res.status(400).json({code:400,msg:'更新出错，没有需要更新的'});
  }
});
// 修改密码
router.post('/updatePwd', async (req, res) => {
  const { username } = req.session.user;
  const users = db.data.users;
  const user = db.data.users.find(user => user.username === username);
  const encryptedPassword = req.body.pwd;
  const userIndex = db.data.users.findIndex(user => user.username === username);
  if (userIndex === -1) {
    return res.status(404).json({ error: '用户未找到' });
  }
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, user.id+user.username);
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
    console.log('Decrypted Password:', decryptedPassword);
    const hash = bcrypt.hashSync(decryptedPassword, 10);
    console.log('加密后的密码:', hash);
    user.password = hash;
    users[userIndex].password = hash;
    await db.write();
    res.status(200).json({code:200,msg:'密码修改成功'});
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({ error: '密码修改失败' });
  }
});
// 更新用户全局设置
router.post('/updateUserViaSettings', async(req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const users = db.data.users;
  const user = db.data.users.find(user => user.username === username);
  if(user.isAdmin != 1){
    return res.status(400).json({ code: 400, msg: '非管理员不能更新全局设置' });
  }
  let needUpdate = false;
  if(utils.isValid(req.body.mainPath)==true){
    db.data.global[0].userRootFolderPath = req.body.mainPath;
    needUpdate = true;
  }
  if(utils.isValid(req.body.defaultLang)==true){
    db.data.global[0].lang = req.body.defaultLang;
    needUpdate = true;
  }
  if(utils.isValid(req.body.defaultTheme)==true){
    db.data.global[0].theme = req.body.defaultTheme;
    needUpdate = true;
  }
  if(utils.isValid(req.body.allowUserLogup)==true){
    db.data.global[0].allowUserLogup = req.body.allowUserLogup;
    needUpdate = true;
  }
  if(needUpdate == false){
    return res.status(400).json({ code: 400, msg: '不需要更新用户全局设置' });
  }
  await db.write();
  res.status(200).json({ code: 200, msg: '更新用户全局设置成功' });
})
// 更新文件后缀全局设置
router.post('/updateFileExtSettings', async(req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const users = db.data.users;
  const user = db.data.users.find(user => user.username === username);
  if(user.isAdmin != 1){
    return res.status(400).json({ code: 400, msg: '非管理员不能更新全局设置' });
  }
  let needUpdate = false;
  if(utils.isValid(req.body.txtFileExt)==true){
    db.data.global[0].txtFileExt = req.body.txtFileExt;
    needUpdate = true;
  }
  if(utils.isValid(req.body.picFileExt)==true){
    db.data.global[0].picFileExt = req.body.picFileExt;
    needUpdate = true;
  }
  if(utils.isValid(req.body.audFileExt)==true){
    db.data.global[0].audFileExt = req.body.audFileExt;
    needUpdate = true;
  }
  if(utils.isValid(req.body.vidFileExt)==true){
    db.data.global[0].vidFileExt = req.body.vidFileExt;
    needUpdate = true;
  }
  if(needUpdate == false){
    return res.status(400).json({ code: 400, msg: '不需要更新文件后缀全局设置' });
  }
  await db.write();
  res.status(200).json({ code: 200, msg: '更新文件后缀全局设置成功' });
})

// 获取所有用户
router.post('/getAllUsers', async(req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const users = db.data.users;
  const user = db.data.users.find(user => user.username === username);
  if(user.isAdmin != 1){
    return res.status(400).json({ code: 400, msg: '非管理员不能获取全部用户' });
  }
  let pageNum = req.body.pageNum; //当前第几页
  let pageSize = req.body.pageSize;//每页显示的记录数
  if(utils.isValid(pageNum)==false || pageNum < 1){
    pageNum = 1;
  }
  if(utils.isValid(pageSize)==false || pageSize < 10){
    pageSize = 10;
  }
  if(users.length <= pageSize){
    pageNum = 1;
  }
  let list = [];
  while((pageNum-1)*pageSize>user.length){
    pageNum --;
  }
  for(let i=(pageNum-1)*pageSize;i<pageNum*pageSize;i++){
    if(i == users.length){
      break;
    }
    list.push(JSON.parse(JSON.stringify(users[i])));
  }
  list.forEach(item=>{
    delete item.password;
  });
  res.status(200).json({ code: 200, msg: '获取全部用户成功', data: {list:list, totalSize: users.length, pageNum: pageNum} });
})
// 查询用户
router.post('/queryUsers', async(req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const users = db.data.users;
  const user = db.data.users.find(user => user.username === username);
  let queryStr = req.body.queryStr;
  if(utils.isValid(queryStr)==false){
    res.status(400).json({code:400, msg:'不允许查询全部用户'});
    return;
  }
  let rsdata = users.filter(item => item.username === queryStr);
  res.status(200).json({ code: 200, msg: '查询用户成功', data: rsdata });
})
// 新建用户
router.post('/newuser', async(req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const users = db.data.users;
  const user = db.data.users.find(user => user.username === username);
  if(user.isAdmin != 1){
    return res.status(400).json({ code: 400, msg: '非管理员不能新建用户' });
  }
  let newUsername = req.body.username;
  if(utils.isValid(newUsername)==false){
    return res.status(400).json({ code: 400, msg: '不能新建用户名为空的用户' });
  }
  let newUser = users.find(user => user.username == newUsername);
  if(utils.isValid(newUser)==true){
    return res.status(400).json({ code: 400, msg: '已经存在该用户' });
  }
  try{
    newUser = {
      id: Date.now().toString(), 
      username: newUsername, 
      password: bcrypt.hashSync('123456', 10), 
      rootFolderPath: req.body.rootFolderPath, 
      isAdmin: req.body.isAdmin, 
      isActive: req.body.isActive, 
      totalDiskSpace: 1, 
      lang: db.data.global[0].lang, 
      theme: db.data.global[0].theme, 
    };
    users.push(newUser);
    await db.write();
    if(utils.isValid(newUser.rootFolderPath)==true){
      let fullPath = path.join(db.data.global[0].userRootFolderPath, newUser.rootFolderPath);
      if(fs.existsSync(fullPath)==false){
        fs.mkdirSync(fullPath);
      }
    }
    res.status(200).json({ code: 200, msg: '新建用户成功'});
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({ error: '新建用户失败' });
  }
});
// 根据id获取用户信息
router.post('/getUserById', async(req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const users = db.data.users;
  const user = db.data.users.find(user => user.username === username);
  let userid = req.body.id;
  let userdetail = users.find(user => user.id == userid);
  
  if(utils.isValid(userdetail)==false){
    return res.status(400).json({ code: 400, msg: '未找到用户' });
  }
  res.status(200).json({ code: 200, msg: '查找用户成功', data: userdetail});
});
// 更新用户信息
router.post('/updateUser', async (req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  const users = db.data.users;
  const user = db.data.users.find(user => user.username === username);
  if(user.isAdmin != 1){
    return res.status(400).json({ code: 400, msg: '非管理员不能新建用户' });
  }
  let editUser = req.body;
  const dbUser = users.find(user=>user.id == editUser.id);
  if(utils.isValid(dbUser)==false){
    return res.status(400).json({ code: 400, msg: '未找到用户' });
  }
  if(utils.isValid(editUser.password)==true){
    const bytes = CryptoJS.AES.decrypt(editUser.password, editUser.id+editUser.oldUsername);
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
    console.log('Decrypted Password:', decryptedPassword);
    const hash = bcrypt.hashSync(decryptedPassword, 10);
    dbUser.password = hash;
  }
  //检查修改后的用户名是不是与其他用户名重复
  if(utils.isValid(editUser.username)==true){
        const checkUser = users.find(user=>user.username == editUser.username && user.id != editUser.id);
    if(utils.isValid(checkUser)==true){
      return res.status(400).json({ code: 400, msg: '改后的用户名已被其他用户使用' });
    }
    dbUser.username = editUser.username;
  }
  if(utils.isValid(editUser.rootFolderPath)==true){
    dbUser.rootFolderPath = editUser.rootFolderPath;
    let fullPath = path.join(db.data.global[0].userRootFolderPath, editUser.rootFolderPath);
    if(fs.existsSync(fullPath)==false){
      fs.mkdirSync(fullPath);
    }
  }
  dbUser.isAdmin = editUser.isAdmin;
  dbUser.isActive = editUser.isActive;
  await db.write();
  res.status(200).json({ code: 200, msg: '更新用户成功' });
})
// 删除用户
router.post('/deleteUser',  async (req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  const { username } = req.session.user;
  let users = db.data.users;
  const user = db.data.users.find(user => user.username === username);
  if(user.isAdmin != 1){
    return res.status(400).json({ code: 400, msg: '非管理员不能删除用户' });
  }
  let userid = req.body.id;
  if(utils.isValid(userid)==false){
    return res.status(400).json({ code: 400, msg: '删除用户失败' });
  }
  const userIndex = db.data.users.findIndex(user => user.id === userid);
  if (userIndex === -1) {
    return res.status(404).json({ error: '用户未找到' });
  }
  users = users.splice(userIndex, 1);
  await db.write();
  res.status(200).json({code:200, result: true, msg:'删除用户成功'});
});
// 获取文件内容，以base64返回
router.post('/getFileContent', (req, res)=>{
  if(checkSession(req)==false){
    res.status(400).json({code:400, msg:'need re-login'});
    return;
  }
  let fullPath = req.body.path;
  try{
    if(fs.existsSync(fullPath)==false){
      return res.status(400).json({ code: 400, msg: '文件不存在' });
    }
    const absolutePath = path.resolve(fullPath);
    const fileContent = fs.readFileSync(absolutePath);
    const base64Content = fileContent.toString('base64');
    res.status(200).json({code:200, result: true, msg:'获取内容成功', data: base64Content});
  }catch(error){
    console.log('L1110 error=', error);
    return res.status(400).json({ code: 400, msg: '获取文件内容出错' });
  }
});
// 保存文件
router.post('/saveFile', (req, res)=>{
  let fullPath = req.body.path;
  try{
    if(fs.existsSync(fullPath)==false){
      return res.status(400).json({ code: 400, msg: '文件不存在' });
    }
    // 对 Base64 字符串进行解码
    const decodedBuffer = Buffer.from(req.body.content, 'base64');
    
    // 定义要写入的文件路径
    const filePath = path.resolve(fullPath);
    //console.log('L1126 decodeBuffer='+decodedBuffer);
    // 同步写入文件
    fs.writeFileSync(filePath, decodedBuffer);
    console.log('文件写入成功！');
    res.status(200).json({code:200, result: true, msg:'保存文件成功', data: req.body.name});
  }catch(error){
    console.log('L1110 error=', error);
    return res.status(400).json({ code: 400, msg: '保存文件出错' });
  }
});
router.post('/video', (req, res) => {
    const videoPath = req.body.path; //path.join(__dirname, 'your_video.mp4');
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4'
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4'
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});
router.get('/download/:filename', (req, res) => {
  const { username } = req.session.user;
  if (!username) {
    res.status(403).send('You must be logged in to download files.');
    return;
  }
  const user = db.data.users.find(user => user.username === username);
  if (!user) {
    res.status(400).send('User not found.');
    return;
  }
  const rootFolderPath = user.rootFolderPath;
  const filename = req.params.filename;
  const filePath = path.join(rootFolderPath, filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, filename, (err) => {
      if (err) {
        res.status(500).send('Error downloading file.');
      }
    });
  } else {
    res.status(404).send('File not found.');
  }
});

// 渲染注册页面
router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// 辅助函数：根据路径查找文件或文件夹
function findItemByPath(rootFolderPath, filePath) {
  const users = db.data.users;
  for (const user of users) {
    const fullPath = path.join(user.rootFolderPath, filePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      return {
        name: path.basename(filePath),
        type: stats.isDirectory()? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime,
        path: fullPath,
        sharedWith: user.sharedWith || []
      };
    }
  }
  return null;
}

// 检查用户登录情况
function checkSession(req){
  if(req.session.user == undefined){
    //res.redirect('/login');
    return false;
  }
  const { username } = req.session.user;
  if (!username) {
    //res.status(403).json({code:403, msg:'You must be logged in to view the home page.'});
    return false;
  }
  const user = db.data.users.find(user => user.username === username);
  if (!user) {
    //res.status(400).json({code:403, msg:'User not found.'});
    return false;
  }
  return true;
}
module.exports = router;