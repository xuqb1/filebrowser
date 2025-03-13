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
function getElById(id){
  return document.getElementById(id);
}
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
function formatFileSize(size){
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
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
function isObject(str){
  if( Object.prototype.toString.call(str)=== '[object Object]'){
    return true;
  }
  return false;
}
function isString(str){
  if( Object.prototype.toString.call(str)=== '[object String]'){
    return true;
  }
  return false;
}