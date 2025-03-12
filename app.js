const express = require('express');
const router = require('./router');
const utils = require('./utils');
const https = require('https');
const fs = require('fs');
const options = {
  key: fs.readFileSync('./ssl/server.key'), 
  cert: fs.readFileSync('./ssl/server.crt')
}

const app = express();
const port = 443; //3000;

app.use(express.static('public'));
// 引入路由
app.use('/', router);
//app.listen(port, () => {
//  utils.info(`Server is running on port ${port}`);
//});
https.createServer(options, app)
  .listen(port, ()=>console.log(`Server is running on port ${port}`));