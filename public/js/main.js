var currPath = '';
var listStyle = 'detail'; // detail,smallIcon, largeIcon
var dirList = [];
var fileList = [];
var selectedFiles = [];
var fileListSort = {
  type: 0, //排序的列索引
  asc: true //排序的顺序是否是正序
}
var navpathArr = [];
var userInfo = JSON.parse(sessionStorage.getItem('user'));
//切换文件，文件夹的选择与不选
function toggleSelect(id){
  let type = id.substring(0,id.indexOf('_'))
  let name = id.substring(id.indexOf('_')+1)
  let obj = getElById(id);
  let obj_i = obj.querySelector('i');
  if(!obj_i){
    obj_i = obj.querySelector('img');
  }
  let obj_div = obj.querySelector('.smallIconText');
  let oldclassName = obj.className;
  let optObj = {}
  if(type=='folder'){
    optObj = dirList.find(x=>x.name == name)
  }else{
    optObj = fileList.find(x=>x.name == name)
  }
  if(listStyle != 'detail'){
    if(oldclassName.substring(0,8) == 'selected'){
      obj.className = oldclassName.substring(8)
      obj_i.style.color = '#6f6f6f';
      if(type == 'folder'){
        obj_i.style.color = '#2196f3';
      }
      if(obj_div){
        obj_div.style.color = '#6f6f6f';
      }
      for(let i=0;i<selectedFiles.length;i++){
        if(name == selectedFiles[i].name){
          selectedFiles.splice(i,1)
          break;
        }
      }
    }else{
      //console.log('L206 optObj=', optObj);
      obj.className = 'selected' + oldclassName
      obj_i.style.color = '#ffffff';
      if(obj_div){
        obj_div.style.color = '#ffffff';
      }
      selectedFiles.push(optObj)
    }
  }
  //console.log('L213 selectedFiles=', selectedFiles);
  selectedAfter();
}
//切换文件，文件夹的选择与不选后调整扩展操作按钮是否显示及下载文件角标
function selectedAfter(){
  if(selectedFiles.length<=0){
    getElById('extendHeaderIcons').style.display='none';
    getElById('downloadBadge').style.display='none';
  }else{
    getElById('extendHeaderIcons').style.display='flex';
    if(selectedFiles.length > 1){
      getElById('shareIcon').style.display = 'none';
      getElById('renameIcon').style.display = 'none';
    }else{
      getElById('shareIcon').style.display = '';
      getElById('renameIcon').style.display = '';
    }
    getElById('downloadBadge').style.display='';
    getElById('downloadBadge').innerHTML=selectedFiles.length;
  }
}
//打开文件夹：更新路径导航条内容，然后获取子文件夹或文件
function openDir(dirname){
  currPath = dirname;
  let pathsNav = getElById('paths');
  let pathArr = currPath.split('/');
  navpathArr = [];
  for(let i=0;i<pathArr.length;i++){
    let str1 = '';
    for(let j=0;j<i;j++){
      str1 += pathArr[j] + '/';
    }
    navpathArr.push(str1+pathArr[i]);
  }
  let divStr = ''
  for(let i=0;i<navpathArr.length;i++){
    let arr = navpathArr[i].split('/');
    divStr += '<div style="margin-right:5px;"><i class="fa fa-angle-right"></i></div>';
    divStr += '<div onclick="openDir(\''+navpathArr[i]+'\')" class="pathtxt" style="cursor:pointer;margin-right:5px;">' 
      + arr[arr.length-1] + '</div>';
    //console.log('L383 arr=',arr);
  }
  pathsNav.innerHTML = divStr;
  getFiles();        	
}
const root = document.documentElement;
const computedStyle = getComputedStyle(root);
const backgroundColor = computedStyle.getPropertyValue('--surfacePrimary');//background
const textColor = computedStyle.getPropertyValue('--textSecondary');
const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
//console.log(isDarkMode);
//获取文件夹、文件
async function getFiles(){
  dirList = [];
  fileList = [];
  selectedFiles = [];
  let myFiles = getElById('my-files');
  myFiles.style.backgroundColor = '#1d99f3';
  myFiles.style.color = '#ffffff';
  let settings = getElById('settings');
  settings.style.backgroundColor = backgroundColor;//'#fafafa';
  settings.style.color = textColor;//'#546e7a';
  addEvent(settings, 'mouseover', menuMouseOverBgColor);
  addEvent(settings, 'mouseleave', menuMouseLeaveBgColor);
  removeEvent(myFiles, 'mouseover', menuMouseOverBgColor);
  removeEvent(myFiles, 'mouseleave', menuMouseLeaveBgColor);
  let res = await fetchDataPost('files',{'currPath':currPath});
  if(checkResponse(res, '')==false){
    if(res && res.msg == 'need re-login'){
      afterlogout();
      return;
    }
    alert('获取子文件夹、文件失败');
    return;
  }
  if(currPath == ''){
    getElById('paths').innerHTML = '';
  }
  dirList = res.data.dirList;
  fileList = res.data.fileList;
  showFileList();
}
//清除文件表格再增加行
function clearAndAddRows(){
  var fileListTable = getElById('fileListTable');
  //var tableBody = fileListTable.querySelector('tbody');//getElById('tableBody');
  var tableBody = getElById('tablebody');
  tableBody.innerHTML = ''; // 清除现有行
  // 添加新行
  if(dirList.length>0){
    for(let i=0;i<dirList.length;i++){
      let newRow = '<div class="item" ondblclick="openDir(\''+(currPath==''?dirList[i].name:currPath+'/'+dirList[i].name)+'\')"><div><i class="fa fa-folder" style="font-size:16px;color:#1d99f3;margin-right:5px" ></i></div><div><p class="name">' + dirList[i].name + '</p><p class="size">-</p><p class="modified">' 
        + formatDate(dirList[i].modified) + '</p><p class="shared">' + (dirList[i].shared==true?'Y':'N') + '</p></div></div>';
       tableBody.innerHTML += newRow;
    }
  }
  if(fileList.length>0){
    for(let i=0;i<fileList.length;i++){
      let newRow = '<div class="item" ondblclick="openFile(\''+(currPath==''?fileList[i].name:currPath+'/'+fileList[i].name)+'\')"><div>' + getFileIconHtml(fileList[i],16) 
        + '</div><div><p class="name">'+ fileList[i].name
        + '</p><p class="size">'+formatFileSize(fileList[i].size)+'</p><p class="modified">' 
        + formatDate(fileList[i].modified) + '</p><p class="shared">' + (fileList[i].shared==true?'Y':'N') + '</p></div></div>';
       tableBody.innerHTML += newRow;
    }
  }
  fileListTable.style.display = '';
}
//根据文件列表显示方式显示相应的文件列表
function showFileList(){
  let mainContent = getElById('main-content');
  let fileListTable = getElById('fileListTable');
  let windowHeight = window.innerHeight;
  mainContent.style.display = '';
  fileListTable.style.display = 'none';
  selectedFiles = [];
  selectedAfter();
  
  if(dirList.length <=0 && fileList.length<=0){
    let noneDiv = '<div style="color:#6f6f6f;width:100%;text-align:center;margin-top:50px;"><div style="margin-bottom:20px;height:80px;">'
      +'<i class="far fa-frown" style="font-size:80px"></i></div>'
      +'<div style="font-size:32px;" id="NothingDiv">这里没有任何文件...</div></div>';
    mainContent.innerHTML = noneDiv;
    return;
  }
  //console.log('L341 listStyle='+listStyle);
  if(listStyle == 'detail'){
    mainContent.style.display = 'none';
    clearAndAddRows();
    return;
  }
  let filelistHtml = '<div style="margin-left:10px;width:100%;">';
  if(listStyle == 'smallIcon'){
    if(dirList.length>0){
      filelistHtml += '<div style="height:40px;line-height:40px;color:#6f6f6f;font-size:16px;" id="folderDiv">文件夹</div>';
      filelistHtml += '<div style="display:flex;width:100%;flex-wrap: wrap;">';
      for(let i=0;i<dirList.length;i++){
        filelistHtml += '<div class="smallIconDiv" id="folder_'+dirList[i].name
          +'" onclick="toggleSelect(\'folder_'+dirList[i].name+'\')" '
          +'ondblclick="openDir(\''+(currPath==''?dirList[i].name:currPath+'/'+dirList[i].name)+'\')">';
        filelistHtml += '<div class="smallIconDivI"><i class="fa fa-folder" style="font-size:64px;color:#1d99f3;" ></i></div>';
        filelistHtml += '<div class="smallIconText">'
          +'<div style="text-overflow:ellipsis;overflow:hidden;font-size:16px;white-space: nowrap;" title="'
          +(getByteLength(dirList[i].name)>20?dirList[i].name:'')+'">' + dirList[i].name +'</div>'
          +'<div style="font-size:14px;">-</div>'
          +'<div style="text-overflow:ellipsis;overflow:hidden;font-size:14px;">'+formatDate(dirList[i].modified)+'</div>'
          +'</div>';
        filelistHtml += '</div>';
      }
      filelistHtml += '</div>';
    }
    if(fileList.length>0){
      filelistHtml += '<div style="height:40px;line-height:40px;color:#6f6f6f;font-size:16px;" id="fileDiv">文件</div>';
      filelistHtml += '<div style="display:flex;width:100%;flex-wrap: wrap;">';
      for(let i=0;i<fileList.length;i++){
        filelistHtml += '<div class="smallIconDiv" id="file_'+fileList[i].name
          +'" onclick="toggleSelect(\'file_'+fileList[i].name+'\')" '
          +'ondblclick="openFile(\''+(currPath==''?fileList[i].name:currPath+'/'+fileList[i].name)+'\')">';
        filelistHtml += '<div class="smallIconDivI">'+getFileIconHtml(fileList[i],64)+'</div>';
        filelistHtml += '<div class="smallIconText">'
          +'<div style="text-overflow:ellipsis;overflow:hidden;font-size:16px;white-space: nowrap;" title="'
          +(getByteLength(fileList[i].name)>20?fileList[i].name:'')+'">' + fileList[i].name +'</div>'
          +'<div style="font-size:14px;">'+formatFileSize(fileList[i].size)+'</div>'
          +'<div style="text-overflow:ellipsis;overflow:hidden;font-size:14px;">'+formatDate(fileList[i].modified)+'</div>'
          +'</div>';
        filelistHtml += '</div>';
      }
      filelistHtml += '</div>';
    }
  }else if(listStyle == 'largeIcon'){
    if(dirList.length>0){
      filelistHtml += '<div style="height:40px;line-height:40px;color:#6f6f6f;font-size:16px;" id="folderDiv">文件夹</div>';
      filelistHtml += '<div style="display:flex;width:100%;flex-wrap: wrap;">';
      for(let i=0;i<dirList.length;i++){
        filelistHtml += '<div class="largeIconDiv" id="folder_'+dirList[i].name
          +'" onclick="toggleSelect(\'folder_'+dirList[i].name+'\')" '
          +'ondblclick="openDir(\''+(currPath==''?dirList[i].name:currPath+'/'+dirList[i].name)+'\')">';
        filelistHtml += '<div class="largeIconDivI"><i class="fa fa-folder" style="margin-top:20px;font-size:128px;color:#1d99f3;" ></i></div>';
        filelistHtml += '<div class="largeIconDivText" title="'
          +(getByteLength(dirList[i].name)>40?dirList[i].name:'')+'">' + dirList[i].name +'</div>';
        filelistHtml += '</div>';
      }
      filelistHtml += '</div>';
    }
    if(fileList.length>0){
      filelistHtml += '<div style="height:40px;line-height:40px;color:#6f6f6f;font-size:16px;" id="fileDiv">文件</div>';
      filelistHtml += '<div style="display:flex;width:100%;flex-wrap: wrap;">';
      for(let i=0;i<fileList.length;i++){
        filelistHtml += '<div class="largeIconDiv" id="file_'+fileList[i].name
          +'" onclick="toggleSelect(\'file_'+fileList[i].name+'\')" '
          +'ondblclick="openFile(\''+(currPath==''?fileList[i].name:currPath+'/'+fileList[i].name)+'\')">';
        filelistHtml += '<div class="largeIconDivI">'+getFileIconHtml(fileList[i],128)+'</div>';
        filelistHtml += '<div id="largeIconDivText" title="'
          +(getByteLength(fileList[i].name)>40?fileList[i].name:'')+'">' + fileList[i].name +'</div>';
        filelistHtml += '</div>';
      }
      filelistHtml += '</div>';
    }
  }
  
  filelistHtml += '</div>';
  //console.log('L358 filelistHtml=',filelistHtml);
  mainContent.innerHTML = filelistHtml;
  if(mainContent && mainContent.children){
    if(mainContent.children.length>0){
      mainContent.children[0].style.maxHeight = (windowHeight - 200) + 'px';
      mainContent.children[0].style.overflowY = 'auto';
      console.log('L174 mainContent.children[0]=', mainContent.children[0])
    }
  }
  if(languagePack){
    let obj = languagePack.find(x=>x.id=='folderDiv');
    if(obj){
      let el = getElById(obj.id)
      if(el){
        el['textContent'] = obj.value;
      }
    }
    obj = languagePack.find(x=>x.id=='fileDiv');
    if(obj){
      let el = getElById(obj.id)
      if(el){
        el['textContent'] = obj.value;
      }
    }
  }
}
//获取文件图标的html代码
function getFileIconHtml(file,size){
  if(isTextFile(file.name)==true){
    if(size==128){
      return '<i class="fa fa-file-alt" style="margin-top:20px;font-size:'+size+'px;"></i>'
    }
    if(size == 16){
      return '<i class="fa fa-file-alt" style="margin-right:5px;font-size:'+size+'px;"></i>'
    }
    return '<i class="fa fa-file-alt" style="font-size:'+size+'px;"></i>'
  }
  if(isPicFile(file.name)==true){
    if(size==128){
      return '<img src="./images/'+userInfo.username+'/'+size+'/'+file.name+'" style="width:305px;height:208px;z-index:2;"></img>'
    }
    if(size == 16){
      return '<img src="./images/'+userInfo.username+'/'+size+'/'+file.name+'" style="margin-right:5px;width:'+size+'px;height:'+size+'px;"></img>'
    }
    return '<img src="./images/'+userInfo.username+'/'+size+'/'+file.name+'" style="width:'+size+'px;height:'+size+'px;"></img>'
  }
  if(size==128){
    return '<i class="fa fa-file" style="font-size:'+size+'px;margin-top:20px;"></i>'
  }
  if(size==16){
    return '<i class="fa fa-file" style="margin-right:5px;font-size:'+size+'px;"></i>'
  }
  return '<i class="fa fa-file" style="font-size:'+size+'px;"></i>'
}
//判断是否是文本文件
function isTextFile(filename){
  if(filename.length<4){
    return false;
  }
  let laststr = filename.substring(filename.length-4);
  if(laststr == '.txt' || laststr == '.ini' || laststr.substring(1) == '.js' || laststr == '.cfg' || laststr == '.xml' || laststr == '.yml'){
    return true;
  }
  return false;
}
//判断是否是图片文件
function isPicFile(filename){
  if(filename.length<4){
    return false;
  }
  let laststr = filename.substring(filename.length-4);
  if(laststr == '.bmp' || laststr == '.jpg' || laststr.substring(1) == '.svg' || laststr == '.png' || laststr == '.gif'){
    return true;
  }
  return false;
}
// 切换文件夹、文件列表显示样式
let colIndexName = {
  0: 'name',
  1: 'size',
  2: 'modified',
  3: 'shared' 
}
function switchShowStyle(){
  let divObj = getElById('switchShowStyleDiv');
  selectedFiles = [];
  let div_i = divObj.querySelector('i');
  if(div_i.className == 'fas fa-th-list'){
    listStyle = 'detail';
    div_i.className = 'fas fa-th';
    div_i.parentNode.title = '切换到小图标模式';
  }else if(div_i.className == 'fas fa-th'){
    listStyle = 'smallIcon';
    div_i.className = 'fas fa-th-large';
    div_i.parentNode.title = '切换到大图标模式';
  }else if(div_i.className == 'fas fa-th-large'){
    listStyle = 'largeIcon';
    div_i.className = 'fas fa-th-list';
    div_i.parentNode.title = '切换到列表模式';
  }
  showFileList();
}
//文件表格表头
function sortTable(n){
  if(n==fileListSort.type){
    fileListSort.asc = !fileListSort.asc;
  }else{
    fileListSort.type = n;
    fileListSort.asc = true;
  }
  if(dirList){
    dirList.sort((a, b)=>{
      if(a[colIndexName[n]] < b[colIndexName[n]]){
        return fileListSort.asc==true?-1:1;
      }
      if(a[colIndexName[n]] > b[colIndexName[n]]){
        return fileListSort.asc==true?1:-1;
      }
      return 0;
    })
  }
  if(fileList){
    fileList.sort((a, b)=>{
      if(a[colIndexName[n]] < b[colIndexName[n]]){
        return fileListSort.asc==true?-1:1;
      }
      if(a[colIndexName[n]] > b[colIndexName[n]]){
        return fileListSort.asc==true?1:-1;
      }
      return 0;
    })
  }
  switchSortIcon(n);
  clearAndAddRows();
}
//切换排序图标
function switchSortIcon(n){
  hideSortIcon('fileListTable');
  let tableObj = getElById('fileListTableHeader');
  let th = tableObj.querySelectorAll('p')[n];
  let sortIcon = th.querySelector('.sort-icon');
  let ascIcon = sortIcon.querySelector('.asc');
  let descIcon = sortIcon.querySelector('.desc');
  //console.log('L608 fileListSort=', fileListSort);
  if(fileListSort.asc == true){
    ascIcon.style.display = 'inline-block';
  }else{
    descIcon.style.display = 'inline-block';
  }
  sortIcon.style.display = '';
}
//隐藏排序图标
function hideSortIcon(id){
  let tableObj = getElById('fileListTableHeader');
  let thObjs = tableObj.querySelectorAll('p');
  for(let i=0;i<thObjs.length;i++){
    thObjs[i].querySelector('.sort-icon').style.display = 'none';
    thObjs[i].querySelector('.asc').style.display = 'none';
    thObjs[i].querySelector('.desc').style.display = 'none';
  }
}
//下载文件
async function downloadFiles(){
  if(!selectedFiles || selectedFiles.length<=0){
    alert('请先选择要下载的文件或文件夹');
    return;
  }
  let data = {
    currPath: currPath, 
    data: selectedFiles
  }
  try{
    let res = await fetch('download', { //'/create-folder'
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data) //{ folderName: folderName }
    });
    if(!res.ok){
      res = res.body.json();
      if(res.code == 400 && res.msg == 'need re-login'){
        afterlogout();
        return;
      }
    }
    const reader = res.body.getReader();
    const contentLength = res.headers.get('Content-Length');
    let receivedLength = 0;
    let chunks = [];

    while(true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;
      console.log(`Received ${receivedLength} of ${contentLength}`);
    }

    const blob = new Blob(chunks);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'download.zip';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }catch(e){
    console.error(e);
  }
  /*
  if(res.json() && res.json().code == 400 && res.json().msg == 'need re-install'){
    afterlogout();
    return;
  }*/
}

function menuMouseOverBgColor(){
  this.style.backgroundColor = '#e1e1e1';
  if(isDarkMode){
    this.style.color = backgroundColor;
  }
}
function menuMouseLeaveBgColor(){
  this.style.backgroundColor = backgroundColor;//'#fafafa';
  this.style.color = textColor;
}
// 页面加载完成后，自动执行操作：绑定事件
document.addEventListener('DOMContentLoaded', function () {
  const myFiles = getElById('my-files');
  const newFolder = getElById('new-folder');
  const newFile = getElById('new-file');
  const settings = getElById('settings');
  const logout = getElById('logout');
  const mainContent = getElById('main-content');
  const folderModal = getElById('newFolderModal');
  const fileModal = getElById('newFileModal');
  const settingsModal = getElById('settingsModal');
  const folderSpan = document.getElementsByClassName("close")[0];
  const fileSpan = document.getElementsByClassName("close")[1];
  const settingsSpan = document.getElementsByClassName("close")[2];
  const fileListTable = getElById("fileListTable");
  
  // 主页加载时，默认查询用户根目录下的文件夹和文件，并列出来
  getFiles();
  
  // 单击左侧我的文件菜单项，刷新当前目录下的文件夹和文件列表
  myFiles.addEventListener('click', function () {
    getElById('dirNav').style.display = 'flex';
    getElById('listing').style.display = '';
    getElById('main-content').style.display = 'flex';
    getElById('editfile-page').style.display = 'none';
    getElById('previewimage-page').style.display = 'none';
    getElById('settings-page').style.display = 'none';
    getFiles();
  });
  
  // 单击左侧新建文件夹菜单项，弹出要求输入新文件夹名称的窗口
  newFolder.addEventListener('click', function () {
    folderModal.style.display = "block";
  });

  // 新建文件夹窗口，确定按钮单击响应
  folderModal.querySelector('form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const folderName = getElById('folderName').value.trim();
    //const username = sessionStorage.getItem('username');
    if(folderName == ''){
      getElById('folderName').value = '';
      return;
    }
    let res = await fetchDataPost('createFolder',{ 'folderName': folderName.trim(), 'currPath': currPath });
    //console.log('L597 res=',res);
    if(checkResponse(res, '')==false){
      if(res && res.msg == 'need re-login'){
        afterlogout();
        return;
      }
      alert('创建文件夹失败');
      return;
    }
    if(res.result == true){
      folderModal.style.display = "none";
      // 刷新文件列表
      //myFiles.click();
      let fullPath = folderName;
      if(currPath != ''){
        fullPath = currPath + '/' + fullPath;
      }
      openDir(fullPath);
    }else{
      alert('Failed to create folder.');
    }
  });

  // 单击左侧新建文件菜单项，弹出要求输入新文件名称的窗口
  newFile.addEventListener('click', function () {
    fileModal.style.display = "block";
  });

  // 新建文件窗口，确定按钮单击响应
  newFileModal.querySelector('form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const fileName = getElById('fileName').value.trim();
    //const username = sessionStorage.getItem('username');
    if(fileName == ''){
      getElById('fileName').value = ''
      return;
    }
    let data = {
      fileName: fileName,
      currPath: currPath
    }
    let res = await fetchDataPost('createFile', data);
    if(checkResponse(res, '')==false){
      if(res && res.msg == 'need re-login'){
        afterlogout();
        return;
      }
      alert('创建文件失败');
      return;
    }
    if(res.result == true){
      fileModal.style.display = "none";
      // 刷新文件列表
      myFiles.click();
    }else{
      alert('创建文件失败.');
    }
  });
  // 左侧设置菜单项，单击响应：切换我的文件与设置菜单项的选择
  settings.addEventListener('click', function () {
    myFiles.style.backgroundColor = backgroundColor;//'#fafafa';
    myFiles.style.color = textColor;//'#546e7a';
    settings.style.backgroundColor = '#1d99f3';
    settings.style.color = '#ffffff';
    addEvent(myFiles, 'mouseover', menuMouseOverBgColor);
    addEvent(myFiles, 'mouseleave', menuMouseLeaveBgColor);
    removeEvent(settings, 'mouseover', menuMouseOverBgColor);
    removeEvent(settings, 'mouseleave', menuMouseLeaveBgColor);
    getElById('dirNav').style.display = 'none';
    getElById('listing').style.display = 'none';
    getElById('main-content').style.display = 'none';
    getElById('editfile-page').style.display = 'none';
    getElById('previewimage-page').style.display = 'none';
    getElById('settings-page').style.display = '';
  });

  // 退出菜单项单击，退出系统
  logout.addEventListener('click', async function(){
    let res = await fetchDataPost('logout')
    if(checkResponse(res, '退出失败')==false){
      return;
    }
    afterlogout();
  });
  
  // 文件列表表格，单元格单击，则选中/不选：根据情况显示或不显示扩展操作图标
  fileListTable.addEventListener('click', function(event) {
    //console.log('L682 event.target.parentNode=', event.target.parentNode);
    //if (event.target.tagName != 'TD') {
    //console.log('className='+event.target.className)
    let ppnode = event.target.parentNode.parentNode
    let pnode = event.target.parentNode
    let node = event.target
    if (node.className != 'item' && node.className != 'item selected' 
        && pnode.className !='item' && pnode.className != 'item selected'
        && ppnode.className !='item' && ppnode.className != 'item selected') {
      return;
    }
    if(!selectedFiles){
      selectedFiles = []
      return;
    }
    let tr = event.target;//.parentNode;
    if(pnode.className == 'item' || pnode.className == 'item selected'){
      tr = pnode
    }
    if(ppnode.className == 'item' || ppnode.className == 'item selected'){
      tr = ppnode
    }
    tr.classList.toggle('selected');
    let selected = tr.classList == 'item selected';
    //console.log('L688 tr=', tr);
    let nameTd = tr.children[0];
    let isFolder = nameTd.querySelector('i')?
        (nameTd.querySelector('i').className=='fa fa-folder'?true:false):false;
    let text = tr.querySelector('.name').textContent;
    let obj = {};
    if(isFolder == true){
      obj = dirList.find(x=>x.name == text);
    } else {
      obj = fileList.find(x=>x.name == text);
    }
    tr.children[0].style.color = '#1d99f3';
    let iconObj = nameTd.querySelector('i');
    //console.log('selected=', selected)
    if(iconObj){
      iconObj.style.color = '#1d99f3';
    }
    if(selected == true){
      selectedFiles.push(obj);
      tr.children[0].style.color = '#ffffff';
      if(iconObj){
        iconObj.style.color = '#ffffff';
      }
    }else{
      for(let i=0;i<selectedFiles.length;i++){
        if(selectedFiles[i].name == text){
          selectedFiles.splice(i, 1);
          break;
        }
      }
    }
    selectedAfter();
    //console.log('L714 selectedFiles=', selectedFiles);
  });
  
  settingsModal.querySelector('form').addEventListener('submit', function (event) {
    event.preventDefault();
    const language = getElById('language').value;
    const currentPassword = getElById('currentPassword').value;
    const newPassword = getElById('newPassword').value;
    const username = sessionStorage.getItem('username');
    fetch('/update-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language: language,
        currentPassword: currentPassword,
        newPassword: newPassword
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Settings updated successfully') {
        settingsModal.style.display = "none";
      } else {
        alert('Failed to update settings.');
      }
    })
    .catch(error => console.error('Error:', error));
  });

  // 新建文件夹窗口的右上角关闭图标单击
  folderSpan.onclick = function () {
    folderModal.style.display = "none";
  };

  // 新建文件窗口的右上角关闭图标单击
  fileSpan.onclick = function () {
    fileModal.style.display = "none";
  };


  settingsSpan.onclick = function () {
    settingsModal.style.display = "none";
  };

  // 窗口单击，如果有弹出窗口，则关闭
  window.onclick = function (event) {
    if (event.target == folderModal) {
      folderModal.style.display = "none";
    }
    if (event.target == fileModal) {
      fileModal.style.display = "none";
    }
    if (event.target == settingsModal) {
      settingsModal.style.display = "none";
    }
  };
});

// 几个全局变量
let diskSpace = {
  usedDiskSpace: 0, 
  totalDiskSpace: 0, 
  filebrowserVersion: '0.1'
}
let usedDiskSpacePercent = 0;
// 调整大小
window.addEventListener('resize', async function() {
  //console.log('网页大小被调整了');
  // 在这里可以添加你需要执行的操作
  resizeOrLoad();
});
// 页面加载完成后执行
window.addEventListener('load', async function() {
  //console.log('整个页面已加载完成');
  // 在这里添加初始加载后要执行的操作
  resizeOrLoad();
});
// 页面加载完成或重设置大小时执行
async function resizeOrLoad(){
  switchWinOrPhone()
  await getUsedSpace();
  //console.log('L735 diskSpace=', diskSpace);
  await getVersion();
  await switchLang();
  replaceVar();
}
// 切换电脑浏览器还是手机显示模式
function switchWinOrPhone(){
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  let switchMenulistBtn = getElById('switchMenulistBtn')
  let leftSidebar = getElById('left-sidebar')
  let logoImg = getElById('logoImg')
  let search = getElById('search')
  let headerRight = getElById('header-right')
  let headerRight1 = getElById('header-right1')
  let main = getElByTag('main')
  let tablebody = getElById('tablebody')
  if(tablebody){
    tablebody.style.maxHeight = (windowHeight - 200) + 'px';
  }
  if(windowWidth < 737){ //phone
    switchMenulistBtn.style.display = 'block'
    leftSidebar.style.display = 'none'
    logoImg.style.display = 'none'
    search.style.display = 'none'
    headerRight.style.display = 'none'
    headerRight1.style.display = 'flex'
    main.style.marginLeft = '0px'
    main.style.width = windowWidth + 'px'
    if(listStyle == 'detail'){
      let sizeP = document.getElementsByClassName('size');
      for (const item of sizeP) {
        item.style.display = 'none';
      }
      let shareP = document.getElementsByClassName('shared');
      for (const item of shareP) {
        item.style.display = 'none';
      }
    }
    return
  }
  //window
  switchMenulistBtn.style.display = 'none'
  leftSidebar.style.display = ''
  logoImg.style.display = ''
  search.style.display = ''
  headerRight.style.display = ''
  headerRight1.style.display = 'none'
  main.style.marginLeft = 'auto'
  // 获取父元素的宽度
  const parentWidth = main.parentNode.offsetWidth;
  // 获取父元素的字体大小
  const fontSize = parseFloat(getComputedStyle(main.parentNode).fontSize);
  // 计算 19em 对应的像素值
  const nineteenEmInPixels = 19 * fontSize;
  main.style.width = (windowWidth - nineteenEmInPixels) + 'px';
  if(listStyle == 'detail'){
    let sizeP = document.getElementsByClassName('size');
    for (const item of sizeP) {
      item.style.display = '';
    }
    let shareP = document.getElementsByClassName('shared');
    for (const item of shareP) {
      item.style.display = '';
    }
  }
}
// 切换语言
let languagePack = [];
async function switchLang(){
  let browserLanguage = navigator.language || navigator.userLanguage;
  let res = await fetchDataPost('lang',{ 'lang': browserLanguage });
  //console.log('L778 res=',res);
  if(checkResponse(res, '')==false){
    //alert('创建文件夹失败');
    console.error('L779 res=', res);
    return;
  }
  if(res.result == true){
    languagePack = res.data;
    for(let langobj of languagePack){
      let el = getElById(langobj.id);
      //console.log('L788 langobj=', langobj);
      //console.log('L788 el=', el);
      if(el){
        if(langobj.attr == 'text'){
          el['textContent'] = langobj.value
        }else{
          el[langobj.attr] = langobj.value
        }
      }
    }
  }else{
    console.error('L785 res=', res);
  }
}
// 获取用户已用及全部空间大小
async function getUsedSpace(){
  let res = await fetchDataPost('getDiskSpace',{});
  //console.log('L778 res=',res);
  if(checkResponse(res, '')==false){
    console.error('L823 res=', res);
    diskSpace.usedDiskSpace = 0;
    diskSpace.totalDiskSpace = 1;
    return;
  }
  if(res.result == true){
    diskSpace = res.data
    if(diskSpace){
      if(diskSpace.totalDiskSpace == 0){
        diskSpace.totalDiskSpace = 1;
      }
      if(diskSpace.usedDiskSpace == 0){
        diskSpace.usedDiskSpacePercent = 0;
      }else{
        usedDiskSpacePercent = (diskSpace.usedDiskSpace/diskSpace.totalDiskSpace*100).fixed(0);
      }
      diskSpace.usedDiskSpace += ' GB';
      diskSpace.totalDiskSpace += ' GB';
    }else{
      diskSpace.usedDiskSpace = '0 GB';
      diskSpace.totalDiskSpace = '1 GB';
      usedDiskSpacePercent = 0;
    }
    return res.data;
  }
}
// 获取本系统版本
async function getVersion(){
  let res = await fetchDataPost('getVersion',{});
  //console.log('L778 res=',res);
  if(checkResponse(res, '')==false){
    diskSpace.filebrowserVersion = '0.1';
    return;
  }
  diskSpace.filebrowserVersion = res.data;
  return res.data;
}
// 替换页面元素中的已有、全部空间大小占位符，计算并设置已用空间百分比
// 替换页面元素中的系统版本占位符
function replaceVar(){
  // 替换已用，总空间
  let elObj = getElById('used-space');
  if(elObj){
    // HTML 字符串模板
    let htmlTemplate = elObj.innerHTML;
    // 使用正则表达式进行替换
    let replacedHtml = htmlTemplate.replace(/{([^}]+)}/g, (match, key) => {
        return diskSpace[key] || match;
    });
    elObj.innerHTML = replacedHtml;
  }
  // 替换已有空间占比
  elObj = getElById('usedDiskSpacePercent');
  if(elObj){
    if(usedDiskSpacePercent < 5){
      usedDiskSpacePercent = 5;
    }
    elObj.style.width = usedDiskSpacePercent + '%';
    console.log('L888 elObj.style.width='+elObj.style.width);
  }
  //替换版本
  elObj = getElById('filebrowserVersion');
  if(elObj){
    // HTML 字符串模板
    let htmlTemplate = elObj.innerHTML;
    // 使用正则表达式进行替换
    let replacedHtml = htmlTemplate.replace(/{([^}]+)}/g, (match, key) => {
        return diskSpace[key] || match;
    });
    elObj.innerHTML = replacedHtml;
  }
  // 更新页面内容
  //document.getElementById('output').innerHTML = replacedHtml;
}
/*
//完全加载后，图片加载前
document.addEventListener('DOMContentLoaded', function() {
  console.log('HTML 文档已加载并解析完成');
  // 在这里添加初始加载后要执行的操作
});
//重载
window.addEventListener('beforeunload', function(event) {
  console.log('网页即将被刷新或关闭');
  // 可以在这里添加你需要执行的操作
  // 如果你想阻止默认的刷新或关闭行为，可以这样做：
  // event.preventDefault();
  // event.returnValue = '';
});*/