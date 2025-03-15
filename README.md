# filebrowser

基于 Nodejs 的文件浏览管理系统

**要求**

nodejs v22.13.1+

npm 10.9.2

**安装**

下载，解压或克隆到 filebrowser 文件夹，打开命令行或终端，执行：
```
npm install express multer bcrypt body-parser express-session lowdb lodash-id express-session multer
```
创建文件夹 ssl，将自己生成的ssl或网络授权得到的ssl的相关文件放到该文件夹里

根据ssl的 key 和 crt 文件名，修改 app.js 中对应的文件名，保持一致

**运行**

filebrowser 文件夹，打开命令行或终端，执行：
```
node app.js
```
**测试**

chrome 浏览器，地址栏中输入以下网址，回车
```
https://localhost/login
```
初始用户名密码为： admin/admin
