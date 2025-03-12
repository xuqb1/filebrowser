const express = require('express');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bodyParser = require('body-parser');
const lodash = require('lodash');
const session = require('express-session');
const os = require('os');

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
  global: []
};
const db = new Low(adapter, defaultData); //初始化数据库对象，即从db.json中加载数据
let allRootFolder = '/opt/filebrowser'
console.log('platform=', os.platform());
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
      let adminid = Date.now().toString()
      db.data.users.push({
        id: adminid,
        username: 'admin',
        password: hash,
        rootFolderPath: rootFolderPath,
        isAdmin: 1
      });
      db.data.settings.push({
        userid: adminid, 
        lang: '中文(简体)', 
        notShowHiddenFile: false, 
        showAccurateTime: false
      })
      db.data.global = [
        {
          banOutlink: false, 
          banShowUsedDiskSpace: false, 
          theme: 0, 
          instanceName: '', 
          systemIcon: '', 
          uploadBlockSize: '10MB', 
          uploadFailRetryTimes: 5
        }
      ]
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

router.get('/lang', (req, res) => {
    // 从请求的查询参数中获取 lang 值
    const lang = req.query.lang || 'en'; 
    const languageData = utils.readLanguageData(lang);
    //res.json(languageData);
    res.status(200).json({code:200, msg: 'getlang successful.', data: languageData});
});

router.post('/lang', (req, res) => {
    // 从请求的查询参数中获取 lang 值
    //const lang = req.query.lang || 'en'; 
    const lang = req.body.lang || 'en';
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
  //console.log('L315 rootFolderPath=',rootFolderPath);
  fs.readdir(rootFolderPath, (err, files) => {
    if (err) {
      res.status(500).json({code:500, msg:'Error reading directory.'});
      return;
    }
    let fileList = [];
    let dirList = [];
    files.forEach(file => {
      const fullPath = path.join(rootFolderPath, file);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        dirList.push({
          name: file,
          type: 'directory',
          size: stats.size,
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
        fileList:fileList
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


        db.write()
.then(() => {
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
    if(fileDirArr[i].type == 'directory'){
      dirs.push(fileDirArr[i]);
    }else{
      //files.push(fileDirArr[i]);
      allfiles.push({name: fileDirArr[i].name, path: basePath})
    }
  }
  if(dirs && dirs.length>0){
    for(let i=0;i<dirs.length;i++){
      let filename = username + '_' + dirs[i].name + '.zip';
      utils.info(path.join(ziptempPath, filename));
      let output = fs.createWriteStream(path.join(ziptempPath, filename));
      let tf = await utils.doZip(path.join(basePath, dirs[i].name), path.join(ziptempPath, filename));
      if(tf == true){
        //dirs[i].zipfile = filename;
        allfiles.push({name:filename, path: ziptempPath});
      }else{
        utils.error(filename + ' compress fail');
      }
    }
  }
  utils.info('allfiles='+JSON.stringify(allfiles));
  if (Array.isArray(allfiles) && allfiles.length > 0) {
    let index = 0;
    const downloadNextFile = () => {
      if (index < allfiles.length) {
        const fileName = allfiles[index].name;
        const filePath = path.join(allfiles[index].path, fileName);
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
  } else {
    res.statusCode = 400;
    res.end('Invalid request. Please provide a valid list of files to download.');
  }
  //if(allfiles && allfiles.length>0){
    
    /*
    for(let i=0;i<allfiles.length;i++){
      if(!allfiles[i].name){
        continue;
      }
      const filePath = path.join(allfiles[i].path, allfiles[i].name);
      const fileStream = fs.createReadStream(filePath);
      res.setHeader('Content-Disposition', `attachment; filename=${allfiles[i].name}`);
      fs.stat(filePath, (err, stats)=>{
        if(err){
          res.statusCode = 500;
          res.end(`Error reading file: ${err}`);
          return;
        }
        res.setHeader('Content-Length', stats.size);
        fileStream.pipe(res);
        fileStream.on('end', () => {
          //index++;
          //if (index === fileNames.length) {
          if (i === allfiles.length-1) {
              res.end();
          }
        });
        fileStream.on('error', (err) => {
          res.statusCode = 500;
          res.end(`Error streaming file: ${err}`);
        });
      })
    }*/
  /*}else{
    res.status(400).json({code:400, msg:'not found files'});
  }*/
})
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