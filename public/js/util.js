let toastTimeoutId;
// 发送post请求，可转到util.js 里
async function fetchDataPost(url,data){
  const response = await fetch(url, { //'/create-folder'
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data) //{ folderName: folderName }
  });
  if(response == undefined || response == null){
    return {'result':false,'msg':'error'};
  }
  let res = await response.json();
  if(res.code == 400 && res.msg == 'need re-login'){
    return {'result':false,'msg':res.msg};
  }
  if(res.code != 200){
    return {'result':false,'msg':res.msg};
  }
  return {result:true,data:res.data};
}
// 获得字符串的按字节长度
function getByteLength(str) {
  var encoder = new TextEncoder();
  var encoded = encoder.encode(str);
  return encoded.length;
}
// 根据id获取dom对象
function getElById(id){
  return document.getElementById(id);
}
// 根据标签名获取匹配的第一个dom对象
function getElByTag(tagname){
  let els = document.getElementsByTagName(tagname);
  if(els){
    return els[0];
  }
  return null;
}
// 是否有效
function isValid(val){
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
// 是否是页面上的元素对象
function isDomObj(obj) {
  if(isValid(obj)==false){
    return false;
  }
  return obj instanceof HTMLElement;
}
// 给dom对象绑定事件响应函数
function addEvent(element, eventType, callback) {
  // 如果 element 是字符串，通过 ID 获取 DOM 元素
  if (typeof element === 'string') {
    element = getElById(element);
  }
  if(isDomObj(element)==false){
    console.error('传入的元素不是有效的 DOM 元素');
    return;
  }
  element.addEventListener(eventType, callback);
}
// 移除dom对象上绑定的事件响应函数
function removeEvent(element, eventType, callback){
  // 如果 element 是字符串，通过 ID 获取 DOM 元素
  if (typeof element === 'string') {
    element = getElById(element);
  }
  if(isDomObj(element)==false){
    console.error('传入的元素不是有效的 DOM 元素');
    return;
  }
  element.removeEventListener(eventType, callback);
}
// 关闭弹出窗口
function closeModal(id){
  let obj = getElById(id);
  if(isDomObj(obj) == false){
    console.error(id + ' is invalid or not a Element of Page');
    return;
  }
  obj.style.display = 'none';
}
// 检查返回的响应内容
function checkResponse(res,msg){
  let tf = true
  if(isValid(res)==false){
    tf = false
  }else if(res.result != true){
    tf = false
  }
  if(tf == false){
    let str = ''
    if(isValid(msg)==true){
      str = msg
    }
    if(isValid(res.msg)==true && res.msg != 'need re-login'){
      str += '  ' + res.msg
    }
    if(isValid(str)==true){
      alert(str)
    }
  }
  return tf
}
// 退出后要执行的操作
function afterlogout(){
  // 使用 replaceState 来替换当前历史记录，将 URL 修改为登录页面的 URL
  history.replaceState(null, null, '/login');
  // 添加 popstate 事件监听器
  window.addEventListener('popstate', function(event) {
    // 当用户点击后退按钮时，将用户重定向到登录页面
    window.location.href = '/login';
  });
  window.location.href = '/login';
}
// 格式化文件大小
function formatFileSize(size){
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
// 格式化时间
function formatDate(dateString) {
  let date = new Date(dateString);
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');
  let hours = String(date.getHours()).padStart(2, '0');
  let minutes = String(date.getMinutes()).padStart(2, '0');
  let seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}
// 判断是否是对象
function isObject(str){
  if( Object.prototype.toString.call(str)=== '[object Object]'){
    return true;
  }
  return false;
}
// 判断是否是Dom对象
function isDom(str){
  let val = Object.prototype.toString.call(str);
  if(val.length>12 && val.substring(0, 12)=== '[object HTML'){
    return true;
  }
  return false;
}
// 判断是否是字符串
function isString(str){
  if( Object.prototype.toString.call(str)=== '[object String]'){
    return true;
  }
  return false;
}
// 判断是否是文本文件
function isTextFile(filename){
  if(filename.length<3){
    return false;
  }
  if(filename.indexOf('.')<0){
    return false;
  }
  let laststr = filename.split('.')[filename.split('.').length-1];
  laststr = laststr.toLowerCase();
  if(laststr == 'txt' || laststr == 'ini' || laststr.substring(1) == 'js' || laststr == 'cfg' || laststr == 'xml' || laststr == 'yml'){
    return true;
  }
  if(isValid(userInfo.global.txtFileExt)==true){
    let arr = userInfo.global.txtFileExt.split(',');
    arr = arr.map((str) => str.trim());
    let str = arr.find(x=>x==laststr);
    return isValid(str);
  }
  return false;
}
// 判断是否是图片文件
function isPicFile(filename){
  if(filename.length<3){
    return false;
  }
  if(filename.indexOf('.')<0){
    return false;
  }
  let laststr = filename.split('.')[filename.split('.').length-1];
  laststr = laststr.toLowerCase();
  if(laststr == 'bmp' || laststr == 'jpg' || laststr.substring(1) == 'svg' || laststr == 'png' || laststr == 'gif'){
    return true;
  }
  if(isValid(userInfo.global.picFileExt)==true){
    let arr = userInfo.global.picFileExt.split(',');
    arr = arr.map((str) => str.trim());
    let str = arr.find(x=>x==laststr);
    return isValid(str);
  }
  return false;
}
// 判断是否是音频文件
function isAudFile(filename){
  if(filename.length<3){
    return false;
  }
  if(filename.indexOf('.')<0){
    return false;
  }
  let laststr = filename.split('.')[filename.split('.').length-1];
  laststr = laststr.toLowerCase();
  if(laststr == 'wav' || laststr == 'mp3'){
    return true;
  }
  if(isValid(userInfo.global.audFileExt)==true){
    let arr = userInfo.global.audFileExt.split(',');
    arr = arr.map((str) => str.trim());
    let str = arr.find(x=>x==laststr);
    return isValid(str);
  }
  return false;
}
// 判断是否是视频文件
function isVidFile(filename){
  if(filename.length<3){
    return false;
  }
  if(filename.indexOf('.')<0){
    return false;
  }
  let laststr = filename.split('.')[filename.split('.').length-1];
  if(laststr == '3gp' || laststr == 'mp4' || laststr == 'avi'){
    return true;
  }
  if(isValid(userInfo.global.vidFileExt)==true){
    let arr = userInfo.global.vidFileExt.split(',');
    arr = arr.map((str) => str.trim());
    let str = arr.find(x=>x==laststr);
    return isValid(str);
  }
  return false;
}
// base64加密
function stringToBase64(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const uint8Array = new Uint8Array(data);
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}
// base64解码
function base64Decode(base64String) {
  const binaryString = window.atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}
// 显示dom对象
function showDomObj(objid, displayValue){
  if(isDom(objid)==true){
    objid.style.display = displayValue;
    return;
  }
  let obj = getElById(objid);
  if(obj){
    obj.style.display = displayValue;
  }
}
// 隐藏dom对象
function hideDomObj(objid){
  if(isDom(objid)==true){
    objid.style.display = 'none';
    return;
  }
  let obj = getElById(objid);
  if(obj){
    obj.style.display = 'none';
  }
}
// 隐藏列表中所有对象，除了 excludeId 指定的对象
function hideDomObjsExcludeObj(excludeId, displayValue){
  let objids = ['dirNav', 'listing', 'main-content', 'editfile-page', 
      'previewimage-page', 'settings-page'];
  objids.forEach(item=>{
    if(item == displayValue){
      showDomObj(item, displayValue);
    }else{
      hideDomObj(item);
    }
  })
}
// 显示遮盖层
function showOverlay(){
  let overlay = document.getElementsByClassName('overlay')[0];
  if(overlay){
    showDomObj(overlay, '');
  }
}
// 隐藏遮盖层
function hideOverlay(){
  let overlay = document.getElementsByClassName('overlay')[0];
  if(overlay){
    hideDomObj(overlay);
  }
}
function startWith(str, firstStr){
  if(isValid(str)==false || isValid(firstStr)==false){
    return false;
  }
  if(str.length<firstStr.length){
    return false;
  }
  return str.indexOf(firstStr) == 0;
}
function showSuccessInfo(info, second){
  const showToastButton = document.getElementById('toastContainerSuccess');
  const toastContainer = document.getElementById('toastContainerSuccess');
  const toastProgressBar = document.getElementById('progressBarSuccess');
  const toastCloseButton = document.getElementById('Toast_close-buttonSuccess');
  toastCloseButton.addEventListener('click', () => {
    toastContainer.style.display = 'none';
    // 停止进度条动画
    toastProgressBar.style.animation = 'none';
    // 清除倒计时定时器
    clearTimeout(toastTimeoutId);
  });
  let countMils = second;
  if(second == undefined || second == '' || second <=0){
    second = 4;
  }
  countMils = second * 1000;
  document.getElementById('toast-success-infoSuccess').innerHTML = info;
  // 显示提示框
  toastContainer.style.display = 'flex';
  // 重置进度条动画
  toastProgressBar.style.animation = 'none';
  toastProgressBar.offsetHeight; // 触发重绘
  toastProgressBar.style.animationDuration = countMils + 'ms';
  toastProgressBar.style.animation = 'countdown '+second+'s linear forwards';
  clearTimeout(toastTimeoutId);
  // 倒计时结束后隐藏提示框
  toastTimeoutId = setTimeout(() => {
    toastContainer.style.display = 'none';
  }, countMils);
}