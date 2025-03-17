var currPath = '';
var listStyle = 'detail'; // detail,smallIcon, largeIcon
var dirList = [];
var fileList = [];
var currPathInfo = {};
var selectedFiles = [];
var fileListSort = {
  type: 0, //排序的列索引
  asc: true //排序的顺序是否是正序
}
var navpathArr = [];
var userInfo = JSON.parse(sessionStorage.getItem('user'));
let root = document.documentElement;
let computedStyle = getComputedStyle(root);
let backgroundColor = computedStyle.getPropertyValue('--surfacePrimary');//background
let textColor = computedStyle.getPropertyValue('--textPrimary');
let isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
let selMenuId = 'my-files';
let colIndexName = {
  0: 'name',
  1: 'size',
  2: 'modified',
  3: 'shared' 
}
// 已用，全部空间，版本及已用空间占比
let diskSpace = {
  usedDiskSpace: 0, 
  totalDiskSpace: 0, 
  filebrowserVersion: '0.1'
}
let usedDiskSpacePercent = 0;
let copyOrMove = 'copy';
let multiSelMode = false;
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
  if(window.innerWidth<737){
    if(selectedFiles.length<=0){
      hideDomObj('file-selection');
      hideDomObj('downloadBadge1');
    }else{
      showDomObj('file-selection', 'flex');
      if(selectedFiles.length > 1){
        hideDomObj('shareIcon1');
        hideDomObj('renameIcon1');
      }else{
        showDomObj('shareIcon1', '');
        showDomObj('renameIcon1', '');
      }
      showDomObj('downloadBadge1', '');
      getElById('downloadBadge1').innerHTML=selectedFiles.length;
      switchLangAndReplaceVar('fileSelNumSpan', 'fileSelNum', selectedFiles.length)
    }
    return;
  }
  if(selectedFiles.length<=0){
    hideDomObj('extendHeaderIcons');
    hideDomObj('downloadBadge');
  }else{
    showDomObj('extendHeaderIcons', 'flex');
    if(selectedFiles.length > 1){
      hideDomObj('shareIcon');
      hideDomObj('renameIcon');
    }else{
      showDomObj('shareIcon', '');
      showDomObj('renameIcon', '')
    }
    showDomObj('downloadBadge', '');
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
//console.log(isDarkMode);
//获取文件夹、文件
async function getFiles(){
  dirList = [];
  fileList = [];
  selectedFiles = [];
  selMenuId = 'my-files';
  releaseSelStatus('my-files');
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
  currPathInfo = res.data.currPathInfo;
  showFileList();
  //showSuccessInfo('获取文件夹、文件列表成功', 1);
}
// 左侧功能菜单列表中的除了 新建文件夹、新建文件、退出之外的菜单项，单击切换时，
// 要对其他菜单项进行释放选中刷新
function releaseSelStatus(excludeId){
  let ids = ['my-files', 'download-list', 'upload-list', 'share-list', 'settings']
  //console.log('L132 excludeId=',excludeId, Object.prototype.toString.call(excludeId));
  if(isString(excludeId) == true){
    selMenuId = excludeId;
  }else{
    excludeId = selMenuId;
  }
  root = document.documentElement;
  computedStyle = getComputedStyle(root);
  
  if(userInfo.theme == '0'){
    isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }else if(userInfo.theme == '1'){
    isDarkMode = false;
    window.matchMedia('(prefers-color-scheme: light)').matches;
  }else {
    window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDarkMode = true;
  }
  backgroundColor = computedStyle.getPropertyValue('--surfacePrimary');//background
  textColor = computedStyle.getPropertyValue('--textPrimary');
  if(isDarkMode == false){
    backgroundColor = '';//computedStyle.getPropertyValue('--background');//
    textColor = '';
  }else{
    backgroundColor = 'rgb(40,40,40)';
    textColor = '#b4cbd2';
  }
  //console.log('L187 isDarkMode=', isDarkMode);
  //console.log('L194 backgroundColor=', backgroundColor);
  //console.log('L137 selMenuId=', selMenuId);
  if(isValid(excludeId)==true){
    let selObj = getElById(excludeId);
    if(selObj){
      selObj.style.backgroundColor = '#1d99f3';
      selObj.style.color = '#ffffff';
      removeEvent(selObj, 'mouseover', menuMouseOverBgColor);
      removeEvent(selObj, 'mouseleave', menuMouseLeaveBgColor);
    }
  }
  
  ids.forEach(item=>{
    if(item != excludeId){
      let obj = getElById(item);
      obj.style.backgroundColor = backgroundColor;//'#fafafa';
      obj.style.color = textColor;//'#546e7a';
      addEvent(obj, 'mouseover', menuMouseOverBgColor);
      addEvent(obj, 'mouseleave', menuMouseLeaveBgColor);
    }
  })
}
// 清除文件表格再增加行
function clearAndAddRows(){
  //var fileListTable = getElById('fileListTable');
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
  showDomObj('fileListTable', '');
}
// 根据文件列表显示方式显示相应的文件列表
function showFileList(){
  let mainContent = getElById('main-content');
  let windowHeight = window.innerHeight;
  showDomObj('main-content', '');
  hideDomObj('fileListTable');
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
    hideDomObj('main-content');
    clearAndAddRows();
    switchWinOrPhone();
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
      //console.log('L174 mainContent.children[0]=', mainContent.children[0])
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
// 获取文件图标的html代码
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
// 切换文件夹、文件列表显示样式
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
// 文件表格按表头排序
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
  selectedFiles = [];
  switchWinOrPhone();
  hideDomObj('file-selection');
  selectedAfter();
}
// 切换排序图标
function switchSortIcon(n){
  hideSortIcon('fileListTable');
  let tableObj = getElById('fileListTableHeader');
  let th = tableObj.querySelectorAll('p')[n];
  let sortIcon = th.querySelector('.sort-icon');
  let ascIcon = sortIcon.querySelector('.asc');
  let descIcon = sortIcon.querySelector('.desc');
  if(fileListSort.asc == true){
    showDomObj(ascIcon, 'inline-block');
  }else{
    showDomObj(descIcon, 'inline-block');
  }
  showDomObj(sortIcon, '');
  switchWinOrPhone();
}
// 隐藏排序图标
function hideSortIcon(id){
  let tableObj = getElById('fileListTableHeader');
  let thObjs = tableObj.querySelectorAll('p');
  for(let i=0;i<thObjs.length;i++){
    hideDomObj(thObjs[i].querySelector('.sort-icon'));
    hideDomObj(thObjs[i].querySelector('.asc'));
    hideDomObj(thObjs[i].querySelector('.desc'));
  }
}
// 下载文件
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
    const contentDisposition = res.headers.get('Content-Disposition');
    console.log('L480 contentDisposition=', contentDisposition);
    let downloadFileName = 'download.zip';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match != null && match[1]) {
        downloadFileName= match[1].replace(/['"]/g, '');
      }
    }
    
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
    link.download = downloadFileName;
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
// 左侧功能菜单项的鼠标悬停事件绑定函数
function menuMouseOverBgColor(){
  this.style.backgroundColor = '#e1e1e1';
  //if(isDarkMode){
    this.style.color = computedStyle.getPropertyValue('--blue');//backgroundColor;
  //}
}
// 左侧功能菜单项的鼠标移开事件绑定函数
function menuMouseLeaveBgColor(){
  this.style.backgroundColor = backgroundColor;//'#fafafa';
  this.style.color = textColor;
}
// 页面加载完成后，自动执行操作：绑定事件
document.addEventListener('DOMContentLoaded', function () {
  //左侧功能菜单项
  const myFiles = getElById('my-files');          //我的文件
  const newFolder = getElById('new-folder');      //新建文件夹
  const newFile = getElById('new-file');          //新建文件
  const downloadList = getElById('download-list');//下载列表
  const uploadList = getElById('upload-list');    //上传列表
  const shareList = getElById('share-list');      //共享列表
  const settings = getElById('settings');         //设置
  const logout = getElById('logout');             //退出
  
  const mainContent = getElById('main-content');    //文件列表：小图标、大图标模式
  const fileListTable = getElById("fileListTable"); //文件列表：表格模式
  
  // 基本操作按钮
  const switchShowStyleDiv = getElById("switchShowStyleDiv"); //切换文件夹文件列显示模式图标
  const switchShowStyleDiv1 = getElById("switchShowStyleDiv1");
  const downloadIcon = getElById("downloadIcon");
  const downloadIcon1 = getElById("downloadIcon1");
  const uploadIcon = getElById("uploadIcon");
  const uploadIcon1 = getElById("uploadIcon1");
  const infoIcon = getElById("infoIcon");
  const infoIcon1 = getElById("infoIcon1");
  const multiselIcon = getElById("multiselIcon");
  const multiselIcon1 = getElById("multiselIcon1");
  const userIcon = getElById("userIcon");
  
  const languageSelect = getElById("languageSelect");
  const themeSelect = getElById("themeSelect");
  
  //手机模式下，左上角切换功能菜单按钮
  const switchMenuListBtn = getElById("switchMenulistBtn");
  // 手机模式下右上角图标
  const searchDiv = getElById("searchDiv");
  const moreDiv = getElById("moreDiv");
  
  // 扩展操作按钮
  const shareIcon = getElById("shareIcon");     //共享图标
  const shareIcon1 = getElById("shareIcon1");
  const renameIcon = getElById("renameIcon");   //重命名图标
  const renameIcon1 = getElById("renameIcon1");
  const copyIcon = getElById("copyIcon");       //复制图标
  const copyIcon1 = getElById("copyIcon1");
  const moveIcon = getElById("moveIcon");       //移动图标
  const moveIcon1 = getElById("moveIcon1");
  const deleteIcon = getElById("deleteIcon");   //删除图标
  const deleteIcon1 = getElById("deleteIcon1");
  
  // 设置页面，用户管理
  const newUserBtn = getElById('newUserBtn');
  
  // 弹出窗口
  const folderModal = getElById('newFolderModal');      //新建文件夹窗口
  const fileModal = getElById('newFileModal');          //新建文件窗口
  const settingsModal = getElById('settingsModal');     //设置窗口，要被设置页面替代了
  const uploadModal = getElById('uploadModal');         //上传选择文件窗口
  const infoModal = getElById('infoModal');             //文件/文件夹信息窗口
  const renameFileModal = getElById("renameFileModal"); //重命名窗口
  const copyFileModal = getElById("copyFileModal");     //复制选择目标目录窗口
  const deleteConfirmModal = getElById("deleteConfirmModal");//确认删除窗口
  
  // 主页加载时，默认查询用户根目录下的文件夹和文件，并列出来
  getFiles();
  
  // 单击左侧我的文件菜单项，刷新当前目录下的文件夹和文件列表
  myFiles.addEventListener('click', function () {
    hidePages();
    showDomObj('dirNav', 'flex');
    showDomObj('listing', '');
    showDomObj('main-content', 'flex');
    selMenuId = 'my-files';
    getFiles();
  });
  
  // 单击左侧新建文件夹菜单项，弹出要求输入新文件夹名称的窗口
  newFolder.addEventListener('click', function () {
    showDomObj(folderModal, 'block');
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
      hideDomObj(folderModal);
      // 刷新文件列表
      myFiles.click();
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
    showDomObj(fileModal, 'block');
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
      hideDomObj(fileModal);
      // 刷新文件列表
      myFiles.click();
    }else{
      alert('创建文件失败.');
    }
  });
  // 切换文件文件夹列表模式：表格，小图标，大图标
  switchShowStyleDiv.addEventListener('click', function(){
    switchShowStyle();
  })
  switchShowStyleDiv1.addEventListener('click', function(){
    switchShowStyle();
  })
  // 下载图标，单击响应，执行对选中的文件、文件夹进行下载
  downloadIcon.addEventListener('click', function(){
    downloadFiles();
  })
  downloadIcon1.addEventListener('click', function(){
    downloadFiles();
  })
  // 上传图标，单击响应，显示上传文件窗口
  uploadIcon.addEventListener('click', function(){
    showDomObj('uploadModal', 'block');
  })
  uploadIcon1.addEventListener('click', function(){
    showDomObj('uploadModal', 'block');
  })
  // 文件或文件夹的信息图标，单击响应，显示文件/文件夹信息窗口
  infoIcon.addEventListener('click', function(){
    showDomObj('infoModal', 'block');
    setShowFileInfo();
  })
  infoIcon1.addEventListener('click', function(){
    showDomObj('infoModal', 'block');
    setShowFileInfo();
  })
  // 单击单选、多选模式切换图标，暂时不用
  multiselIcon.addEventListener('click', function(){
    multiSelMode = !multiSelMode;
    if(multiSelMode == true){
      getElById('promptDiv').style.bottom = '0';
    }else{
      getElById('promptDiv').style.bottom = '-4em';
    }
  });
  multiselIcon1.addEventListener('click', function(){
    multiSelMode = !multiSelMode;
    if(multiSelMode == true){
      getElById('promptDiv').style.bottom = '0';
    }else{
      getElById('promptDiv').style.bottom = '-4em';
    }
  });
  // 单击重命名图标，弹出要求输入新名称窗口
  renameIcon.addEventListener('click', function () {
    showDomObj(renameFileModal, 'block');
    getElById('newfileName').value = selectedFiles[0].name;
  });
  renameIcon1.addEventListener('click', function () {
    showDomObj(renameFileModal, 'block');
    getElById('newfileName').value = selectedFiles[0].name;
  });
  // 上传窗口，单击确定，执行上传文件操作
  uploadModal.querySelector('form').addEventListener('submit', async function (){
    event.preventDefault();
    const fileInput = getElById('uploadfileName');
    console.log('L703 fileInput=', fileInput);
    const file = fileInput.files[0];
    if (isValid(file)==false){
      alert('请选择要上传的文件');
      return;
    }
    const formData = new FormData();
    // 模拟当前目录信息，这里只是一个示例字符串
    formData.append('currentDirectory', currPath);
    formData.append('fileName', file.name);
    formData.append('fileData', file);
    hideDomObj(uploadModal);
    showOverlay();
    fetch('upload', {
        method: 'POST',
        body: formData
      })
      .then(async response => {
        if(response == undefined || response == null){
          alert('上传失败');
          return;
        }
        let res = await response.json();
        console.log('L740 res=', res);
        if(res.code == 400 && res.msg == 'need re-login'){
          afterlogout();
          hideOverlay();
          return;
        }
        if(res.result == true){
          myFiles.click();
          await getUsedSpace();
          replaceVar();
          //alert('上传成功');
          showSuccessInfo('上传成功', 2);
        }else{
          alert('上传失败');
        }
      })
      .then(data => {
        console.log('L722 data=', data);
      })
      .catch(error => {
        console.error('上传失败:', error);
        alert('上传失败');
      });
      hideOverlay();
  });
  // 重命名文件窗口，确定按钮单击响应
  renameFileModal.querySelector('form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const fileName = getElById('newfileName').value.trim();
    //const username = sessionStorage.getItem('username');
    if(fileName == ''){
      getElById('newfileName').value = selectedFile[0].name;
      hideDomObj(renameFileModal);
      return;
    }
    if(fileName == selectedFiles[0].name){
      hideDomObj(renameFileModal);
      return;
    }
    let dir = dirList.find(x=>x.name == fileName);
    let file = fileList.find(x=>x.name == fileName);
    if(dir || file){
      alert('新名称命名的文件或文件夹已存在');
      return;
    }
    let data = {
      oldFileName: selectedFiles[0].name, 
      fileName: fileName,
      currPath: currPath
    }
    let res = await fetchDataPost('renameFile', data);
    if(checkResponse(res, '')==false){
      if(res && res.msg == 'need re-login'){
        afterlogout();
        return;
      }
      alert('创建文件失败');
      return;
    }
    if(res.result == true){
      hideDomObj(renameFileModal);
      // 刷新文件列表
      myFiles.click();
      //alert('重命名成功.');
      showSuccessInfo('重命名成功', 2);
    }else{
      alert('重命名文件失败.');
    }
  });
  
  // 单击复制图标，弹出要求选择目标目录窗口
  copyIcon.addEventListener('click', function () {
    copyOrMove = 'copy';
    copyFileModal.querySelector('.modal-title').innerHTML = '复制';
    copyFileModal.querySelector('.primaryBtn').innerHTML = '复制';
    showDomObj('copyFileModal', 'block');
    listDirForSel();
  });
  copyIcon1.addEventListener('click', function () {
    copyOrMove = 'copy';
    copyFileModal.querySelector('.modal-title').innerHTML = '复制';
    copyFileModal.querySelector('.primaryBtn').innerHTML = '复制';
    showDomObj('copyFileModal', 'block');
    listDirForSel();
  });
  
  // 单击移动图标，弹出要求选择目标目录窗口
  moveIcon.addEventListener('click', function () {
    copyOrMove = 'move';
    copyFileModal.querySelector('.modal-title').innerHTML = '移动';
    copyFileModal.querySelector('.primaryBtn').innerHTML = '移动';
    showDomObj('copyFileModal', 'block');
    listDirForSel();
  });
  moveIcon1.addEventListener('click', function () {
    copyOrMove = 'move';
    copyFileModal.querySelector('.modal-title').innerHTML = '移动';
    copyFileModal.querySelector('.primaryBtn').innerHTML = '移动';
    showDomObj('copyFileModal', 'block');
    listDirForSel();
  });
  
  // 单击删除图标，弹出确认删除对话框，确认后执行删除
  deleteIcon.addEventListener('click', function () {
    showDomObj(deleteConfirmModal, 'block');
  });
  deleteIcon1.addEventListener('click', function () {
    showDomObj(deleteConfirmModal, 'block');
  });
  
  // 重命名文件窗口，确定按钮单击响应
  copyFileModal.querySelector('form').addEventListener('submit', async function (event) {
    event.preventDefault();
    let copyFileList = getElById('copyFileList');
    let allLis = copyFileList.querySelectorAll('li');
    let selPath = '';
    for(let i=0;i<allLis.length;i++){
      if(allLis[i].getAttribute('aria-selected')=='true'){
        selPath = allLis[i].getAttribute('aria-label');
      }
    }
    let copyPathsDir = getElById('copyPathsDiv');
    let allPathSpan = copyPathsDir.querySelectorAll('span');
    let fullPath = allPathSpan[allPathSpan.length-1].getAttribute('aria-label');
    if(isValid(selPath) == true){
      fullPath += '/' + selPath;
    }
    let data = {
      selectedFiles: selectedFiles, 
      destDir: fullPath
    }
    let optApi = 'copyFiles';
    if(copyOrMove == 'move'){
      optApi = 'moveFiles';
    }
    let res = await fetchDataPost(optApi, data);
    if(checkResponse(res, '')==false){
      if(res && res.msg == 'need re-login'){
        afterlogout();
        return;
      }
      if(copyOrMove == 'copy'){
        alert('复制失败');
      }else{
        alert('移动失败');
      }
      return;
    }
    if(res.result == true){
      hideDomObj(copyFileModal);
      // 刷新文件列表
      if(copyOrMove == 'copy'){
        myFiles.click();
        await getUsedSpace();
        replaceVar();
        //alert('复制成功.');
        showSuccessInfo('复制成功', 2);
      }else{
        myFiles.click();
        //alert('移动成功.');
        showSuccessInfo('移动成功', 2);
      }
    }else{
      if(copyOrMove == 'copy'){
        alert('复制失败');
      }else{
        alert('移动失败');
      }
    }
  });
  // 删除文件或文件夹的确认窗口，提交时，执行删除动作
  deleteConfirmModal.querySelector('form').addEventListener('submit',async  function (event) {
    let data = {
      selectedFiles: selectedFiles
    };
    let res = await fetchDataPost('deleteFiles', data);
    if(checkResponse(res, '')==false){
      if(res && res.msg == 'need re-login'){
        afterlogout();
        return;
      }
      alert('删除失败');
      return;
    }
    if(res.result == true){
      hideDomObj(deleteConfirmModal);
      // 刷新文件列表
      myFiles.click();
      await getUsedSpace();
      replaceVar();
      //alert('删除成功.');
      showSuccessInfo('删除成功', 2);
    }else{
      alert('删除失败');
    }
  });
  // 删除用户确认窗口，提交时，执行删除动作
  deleteUserConfirmModal.querySelector('form').addEventListener('submit',async  function (event) {
    event.preventDefault();
    let data = {
      id: delUserid
    };
    let res = await fetchDataPost('deleteUser', data);
    if(checkResponse(res, '')==false){
      if(res && res.msg == 'need re-login'){
        afterlogout();
        return;
      }
      //alert('删除失败');
      return;
    }
    if(res.result == true){
      hideDomObj(deleteUserConfirmModal);
      await getAndShowUsers();
      showSuccessInfo('删除成功', 2);
      delUserid = ''
    }else{
      alert('删除失败');
    }
  });
  
  // 用户图标，单击响应，弹出下拉菜单
  userIcon.addEventListener('click', function () {
    let obj = getElById('dropdownUserMenu');
    if(obj){
      if(obj.style.transform == 'scale(1)'){
        obj.style.transform = 'scale(0)';
      }else{
        obj.style.transform = 'scale(1)';
        //console.log('L962 userInfo=', userInfo);
        getElById('languageSelect').value = userInfo.lang;
        getElById('themeSelect').value = userInfo.theme;
        getElById('userNameSpan').innerHTML = userInfo.username;
      }
    }
  });
  // 更多图标，单击响应，弹出下拉菜单
  moreDiv.addEventListener('click', function () {
    let obj = getElById('dropdownOptMenu');
    if(obj){
      if(obj.style.transform == 'scale(1)'){
        obj.style.transform = 'scale(0)';
        //hideOverlay();
      }else{
        obj.style.transform = 'scale(1)';
        //showOverlay();
      }
    }
  });
  // 显示功能菜单列表按钮，单击响应
  switchMenulistBtn.addEventListener('click', function(){
    let menulist = getElById('left-sidebar');
    if(menulist){
      if(menulist.style.display=='none'){
        menulist.className = 'active';
        showDomObj(menulist, '');
        menulist.style.top = '0';
        menulist.style.height= '100%';
        showOverlay();
      }else{
        menulist.className = '';
        hideDomObj(menulist);
        menulist.style.top = '4em';
        hideOverlay()
      }
    }
  })
  // 语言下拉框选择被修改后，对系统语言进行修改
  languageSelect.addEventListener('change', async function(){
    const selectedValue = this.value;
    //console.log('L1000 selectedValue='+selectedValue);
    let obj = getElById('dropdownUserMenu');
    if(obj){
      obj.style.transform = 'scale(0)';
    }
    await switchLang(selectedValue);
    replaceVar();
  });
  // 样式下拉框选择被修改后，对系统浅、暗样式进行刷新
  themeSelect.addEventListener('change', async function(){
    const selectedValue = this.value;
    //console.log('L1014 selectedValue='+selectedValue);
    let obj = getElById('dropdownUserMenu');
    if(obj){
      obj.style.transform = 'scale(0)';
    }
    //console.log('L1037 themeSelect change value');
    await applyColorScheme(selectedValue);
    window.location.reload();
    //releaseSelStatus('my-files');
  });
  
  // 设置页面，用户管理，新建按钮单击响应，弹出新建用户窗口
  newUserBtn.addEventListener('click', function(){
    console.log('L1056...');
    showDomObj('newUserModal', 'block');
  });
  
  // 新建用户窗口，单击确定，表单提交
  getElById('newUserForm').addEventListener('submit', async function(){
    event.preventDefault();
    let data = {
      username: getElById('newUsername').value, 
      rootFolderPath: newUserRootFolder.value, 
      isAdmin: newUserIsAdmin.checked? 1:0, 
      isActive: newUserIsActive.checked? 1:0
    };
    let res = await fetchDataPost('newuser', data);
    if(checkResponse(res, '')==false){
      if(res && res.msg == 'need re-login'){
        afterlogout();
        return;
      }
      //alert('新建用户失败');
      return;
    }
    if(res.result == true){
      hideDomObj('newUserModal');
      await getAndShowUsers();
      showSuccessInfo('新建用户成功', 2);
    }else{
      alert('新建用户失败.');
    }
  });
  // 编辑用户窗口，单击确定，表单提交
  getElById('editUserForm').addEventListener('submit', async function(){
    event.preventDefault();
    let oldUsername = editingUser.username;
    editingUser.oldUsername = oldUsername;
    editingUser.username = getElById('editUsername').value;
    editingUser.rootFolderPath = getElById('editUserRootFolder').value;
    editingUser.password = getElById('editUserPassword').value;
    editingUser.isAdmin = editUserIsAdmin.checked? 1:0;
    editingUser.isActive = editUserIsActive.checked? 1:0;
    if(isValid(editingUser.password)==true){
      editingUser.password = CryptoJS.AES.encrypt(editingUser.password, editingUser.id+oldUsername).toString();
    }
    let res = await fetchDataPost('updateUser', editingUser);
    if(checkResponse(res, '更新用户失败')==false){
      console.error('L1100 res=', res);
      return;
    }
    if(res.result == true){
      hideDomObj('editUserModal');
      await getAndShowUsers();
      showSuccessInfo('更新用户成功', 2);
      editingUser = {};
    }else{
      alert('更新用户失败.');
    }
  });
  // 点击页面其他地方隐藏用户下拉菜单或操作下拉菜单
  document.addEventListener('click', function (event) {
    let obj = getElById('dropdownUserMenu');
    if (obj && !userIcon.contains(event.target) && !obj.contains(event.target)) {
      obj.style.transform = 'scale(0)';
      //hideOverlay();
    }
    obj = getElById('dropdownOptMenu');
    if (obj && !moreDiv.contains(event.target)){ // && !obj.contains(event.target)) {
      obj.style.transform = 'scale(0)';
      //hideOverlay();
    }
    obj = getElById('left-sidebar');
    if(obj && !switchMenuListBtn.contains(event.target)) {
      //console.log('L660 obj.style.display='+obj.style.display);
      if(obj.style.display == '' && window.innerWidth < 737){
        hideDomObj(obj);
        obj.style.top = '4em';
        obj.className = '';
        hideOverlay();
      }
    }
  });

  // 左侧设置菜单项，单击响应：切换我的文件与设置菜单项的选择
  settings.addEventListener('click', function () {
    settings.style.backgroundColor = '#1d99f3';
    settings.style.color = '#ffffff';
    removeEvent(settings, 'mouseover', menuMouseOverBgColor);
    removeEvent(settings, 'mouseleave', menuMouseLeaveBgColor);
    //console.log('L1071 settings click');
    releaseSelStatus('settings')
    hidePages();
    showDomObj('settings-page', '');
    //console.log('L1083 userInfo=', userInfo);
    getElById('selectLanguage').value = userInfo.lang;
    getElById('selectTheme').value = userInfo.theme;
    getElById('newPwdInput').value = '';
    getElById('confirmPwdInput').value = '';
    if(userInfo && userInfo.isAdmin != 1){
      let obj = getElById('sharing-managementLi');
      if(obj){
        obj.remove();
      }
      obj = getElById('global-settingsLi');
      if(obj){
        obj.remove();
      }
      obj = getElById('user-managementLi');
      if(obj){
        obj.remove();
      }
      obj = getElById('sharing-management');
      if(obj){
        obj.remove();
      }
      obj = getElById('global-settings');
      if(obj){
        obj.remove();
      }
      obj = getElById('user-management');
      if(obj){
        obj.remove();
      }
    } else {
      console.log('L1115 userInfo = ', userInfo);
      getElById('userRootFolderInput').value = userInfo.global.userRootFolderPath;
      getElById('defaultLang').value = userInfo.global.lang;
      getElById('defaultTheme').value = userInfo.global.theme;
      getElById('sysNameInput').value = userInfo.global.instanceName;
      getElById('sysIconPreview').src = userInfo.global.systemIcon;
    }
  });
  // 下载列表菜单项，单击响应，显示已下载/正在下载列表
  downloadList.addEventListener('click', function () {
    downloadList.style.backgroundColor = '#1d99f3';
    downloadList.style.color = '#ffffff';
    removeEvent(downloadList, 'mouseover', menuMouseOverBgColor);
    removeEvent(downloadList, 'mouseleave', menuMouseLeaveBgColor);
    //console.log('L1081 downloadList click');
    releaseSelStatus('download-list')
  });
  // 上传列表菜单项，单击响应，显示已上传/正在上传列表
  uploadList.addEventListener('click', function () {
    uploadList.style.backgroundColor = '#1d99f3';
    uploadList.style.color = '#ffffff';
    removeEvent(uploadList, 'mouseover', menuMouseOverBgColor);
    removeEvent(uploadList, 'mouseleave', menuMouseLeaveBgColor);
    //console.log('L1090 uploadList click');
    releaseSelStatus('upload-list')
  });
  // 共享列表菜单项，单击响应，显示共享列表
  shareList.addEventListener('click', function () {
    shareList.style.backgroundColor = '#1d99f3';
    shareList.style.color = '#ffffff';
    removeEvent(shareList, 'mouseover', menuMouseOverBgColor);
    removeEvent(shareList, 'mouseleave', menuMouseLeaveBgColor);
    //console.log('L1090 shareList click');
    releaseSelStatus('share-list')
    hidePages();
    showDomObj('share-page', '');
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
  // 设置页面，标签单击响应，针对单击的标签做相应的初始化
  getElById('settingsTab').addEventListener('shown.bs.tab', async function (event) {
    const target = event.target.getAttribute('data-bs-target');
    const tabPane = document.querySelector(target);
    //console.log('L1186 target=', target);
    if (target === '#personal-settings') {  //个人设置
      // 设置表单值
      getElById('selectLanguage').value = userInfo.lang;
      getElById('selectTheme').value = userInfo.theme;
      getElById('newPwdInput').value = '';
      getElById('confirmPwdInput').value = '';
    } else if(target == '#sharing-management'){ //共享管理
      
    } else if(target == '#user-management'){  //用户管理
      getAndShowUsers();
    } else {
      txtFileExtInput.value = userInfo.global.txtFileExt;
      picFileExtInput.value = userInfo.global.picFileExt;
      audFileExtInput.value = userInfo.global.audFileExt;
      vidFileExtInput.value = userInfo.global.vidFileExt;
    }
  });
  itemsPerPageSelectUserTable.addEventListener('change', function(event){
    getAndShowUsers();
  });
  // 设置，个人设置表单中可同时修改语言和主题样式
  getElById('profileForm').addEventListener('submit', async function(event){
    let lang = getElById('selectLanguage').value;
    let theme = getElById('selectTheme').value;
    if(lang == userInfo.lang && theme == userInfo.theme){
      return;
    }
    if(lang != userInfo.lang){
      userInfo.lang = lang;
      await switchLang(lang);
      replaceVar();
    }
    if(theme != userInfo.theme){
      await applyColorScheme(theme);
      window.location.reload();
    }
  });
  // 设置，个人设置，修改密码后提交
  getElById('changePwdForm').addEventListener('submit', async function(event){
    event.preventDefault();
    let newpwd = getElById('newPwdInput').value;
    let confirmpwd = getElById('confirmPwdInput').value;
    if(isValid(newpwd)==false || isValid(confirmpwd)==false){
      alert('新密码或确认密码为空');
      return;
    }
    if(newpwd != confirmpwd || newpwd.length < 6){
      alert('新密码与确认密码不一致，或长度小于6个字符')
      return;
    }
    let pwd = CryptoJS.AES.encrypt(newpwd, userInfo.id+userInfo.username).toString();
    let res = await fetchDataPost('updatePwd', {'pwd': pwd});
    if(checkResponse(res, '更新密码失败')==false){
      console.error('L1574 res=', res);
      return;
    }
    alert('密码修改成功，请重新登录');
    //showSuccessInfo('密码修改成功，请重新登录', 2);
    logout.click();
  });
  // 设置，全局设置，系统相关，选择系统图标后预览显示
  getElById('sysIconInput').addEventListener('change', function(event){
    const file = this.files[0];
    let imagePreview = getElById('sysIconPreview');
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      imagePreview.src = '#';
      imagePreview.style.display = 'none';
    }
  });
  // 设置，全局设置，系统相关表单，提交，上传要更改的系统图标或系统名称
  getElById('globalSysViaForm').addEventListener('submit', async function(event){
    event.preventDefault();
    const sysNameInput = getElById('sysNameInput');
    const fileInput = getElById('sysIconInput');
    console.log('L1292 fileInput=', fileInput);
    let file = fileInput.files[0];
    if (isValid(file)==false){
      //alert('请选择要上传的图片');
      console.log('L1296 file=', file);
      file = {};
    }
    const formData = new FormData();
    // 模拟当前目录信息，这里只是一个示例字符串
    formData.append('sysName', sysNameInput.value);
    formData.append('fileName', file.name);
    formData.append('fileData', file);
    showOverlay();
    fetch('updateNameIcon', {
        method: 'POST',
        body: formData
      })
      .then(async response => {
        if(response == undefined || response == null){
          alert('上传失败');
          return;
        }
        let res = await response.json();
        console.log('L1314 res=', res);
        if(res.code == 400 && res.msg == 'need re-login'){
          afterlogout();
          hideOverlay();
          return;
        }
        if(res.result == true){
          //alert('更新成功');
          showSuccessInfo('更新成功', 2);
          if(isValid(sysNameInput.value)==true){
            userInfo.global.instanceName = sysNameInput.value;
          }
          if(isValid(file)==true){
            userInfo.global.systemIcon = 'img/' + res.data;
          }
          getElById('sysHelpLink').innerHTML = userInfo.global.instanceName;
          getElById('logoImg').src = userInfo.global.systemIcon;
          sessionStorage.setItem('user', JSON.stringify(userInfo));
        }else{
          alert('更新失败');
        }
      })
      .then(data => {
        console.log('L1327 data=', data);
      })
      .catch(error => {
        console.error('更新失败:', error);
        alert('更新失败');
      });
      hideOverlay();
  });
  // 设置，全局设置，用户相关表单，提交，更新用户主目录路径，默认语言和默认主题
  getElById('globalUserViaForm').addEventListener('submit', async function(event){
    event.preventDefault();
    let mainPath = getElById('userRootFolderInput').value;
    let defaultLang = getElById('defaultLang').value;
    let defaultTheme = getElById('defaultTheme').value;
    let data = {
      mainPath: mainPath, 
      defaultLang: defaultLang, 
      defaultTheme: defaultTheme, 
      allowUserLogup: getElById('allowUserLogupInput').checked? 1:0
    }
    let res = await fetchDataPost('updateUserViaSettings', data);
    if(checkResponse(res, '更新用户相关设置失败')==false){
      return;
    }
    userInfo.global.userRootFolderPath = mainPath;
    userInfo.global.lang = defaultLang;
    userInfo.global.theme = defaultTheme;
    sessionStorage.setItem('user', JSON.stringify(userInfo));
    showSuccessInfo('更新成功', 2);
  });
  // 设置，全局设置，文件后缀表单，提交，更新文本、图片、音视频文件后缀
  getElById('globalFileExtForm').addEventListener('submit', async function(event){
    event.preventDefault();
    let data = {
      txtFileExt: txtFileExtInput.value, 
      picFileExt: picFileExtInput.value, 
      audFileExt: audFileExtInput.value, 
      vidFileExt: vidFileExtInput.value
    }
    let res = await fetchDataPost('updateFileExtSettings', data);
    if(checkResponse(res, '更新文件后缀设置失败')==false){
      return;
    }
    userInfo.global.txtFileExt = data.txtFileExt;
    userInfo.global.picFileExt = data.picFileExt;
    userInfo.global.audFileExt = data.audFileExt;
    userInfo.global.vidFileExt = data.vidFileExt;
    sessionStorage.setItem('user', JSON.stringify(userInfo));
    showSuccessInfo('更新成功', 2);
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


  // 窗口单击，如果有弹出窗口，则关闭
  window.onclick = function (event) {
    if (event.target == folderModal) {
      hideDomObj(folderModal);
    }
    if (event.target == fileModal) {
      hideDomObj(fileModal);
    }
    if (event.target == renameFileModal) {
      hideDomObj(renameFileModal);
    }
    if (event.target == getElById('copyFileModal')) {
      hideDomObj('copyFileModal');
    }
    if (event.target == getElById('moveFileModal')) {
      hideDomObj('moveFileModal');
    }
    if (event.target == deleteConfirmModal) {
      hideDomObj(deleteConfirmModal);
    }
    if (event.target == settingsModal) {
      hideDomObj(settingsModal);
    }
    if (event.target == uploadModal) {
      hideDomObj(uploadModal);
    }
    if (event.target == infoModal) {
      hideDomObj(infoModal);
    }
    if (event.target == getElById('newUserModal')) {
      hideDomObj('newUserModal');
    }
  };
  //console.log('L1230 DOMContentLoaded ..');
  resizeOrLoad();
});
// 窗口调整大小
window.addEventListener('resize', async function() {
  //console.log('L1235 resize ...');
  resizeOrLoad();
});
// 页面加载完成后执行
window.addEventListener('load', async function() {
  //console.log('L1240 load ....');
  //resizeOrLoad();
});
let mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
// 监听媒体查询的变化
if (mediaQuery.addEventListener) {
  // 现代浏览器支持 addEventListener
  //console.log('L1244 mediaQuery event listener');
  mediaQuery.addEventListener('change', releaseSelStatus);
} else {
  // 旧版浏览器支持 addListener
  //console.log('L1248 mediaQuery event listener');
  mediaQuery.addListener(releaseSelStatus);
}
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const lightStylesheet = document.querySelector('link[href="css/home_light.css"]');
const darkStylesheet = document.querySelector('link[href="css/home_dark.css"]');
async function applyColorScheme(scheme) {
  let res = await fetchDataPost('updateSet', {'theme': scheme});
  if(checkResponse(res, '')==false){
    console.error('L1574 res=', res);
    return;
  }
  userInfo.theme = scheme;
  sessionStorage.setItem('user', JSON.stringify(userInfo));
  if (scheme == '0') { // 随系统设置
    lightStylesheet.media = '(prefers-color-scheme: light)';
    darkStylesheet.media = '(prefers-color-scheme: dark)';
  } else if (scheme == '1') { //浅色
    lightStylesheet.media = 'all';
    darkStylesheet.media = 'not all';
  } else if (scheme == '2') { //深色
    lightStylesheet.media = 'not all';
    darkStylesheet.media = 'all';
  }
  //const event = new Event('change');
  //prefersDarkScheme.dispatchEvent(event);
}
// 为移动或复制文件、文件夹，对弹出窗口中的目录列表及路径导航条进行加载
function listDirForSel(){
  let copyFileList = getElById('copyFileList');
  copyFileList.innerHTML = '';
  let copyPathsDiv = getElById('copyPathsDiv');
  copyPathsDiv.innerHTML = '';
  let subpathDiv = document.createElement('span');
  subpathDiv.setAttribute('aria-label', '');
  subpathDiv.innerHTML = '根目录/';
  //console.log('L1082 currPath='+currPath);
  subpathDiv.addEventListener('click', function(){
    //console.log(this.getAttribute('aria-label'));
    setNewFolderListByPath('');
  });
  copyPathsDiv.appendChild(subpathDiv);
  if(currPath != ''){
    let patharr = currPath.split('/');
    let result = [];
    let currentPath = '';
    for (let i = 0; i < patharr.length; i++) {
      if (i === 0) {
        currentPath = patharr[i];
      } else {
        currentPath = `${currentPath}/${patharr[i]}`;
      }
      result.push(currentPath);
    }
    for(let i=0;i<result.length;i++){
      let subpathDiv = document.createElement('span');
      subpathDiv.setAttribute('aria-label', result[i]);
      subpathDiv.innerHTML = result[i].split('/')[result[i].split('/').length-1]+'/';
      subpathDiv.addEventListener('click', function(){
        //console.log('L1105 '+this.getAttribute('aria-label'));
        setNewFolderListByPath(this.getAttribute('aria-label'));
      });
      copyPathsDiv.appendChild(subpathDiv);
    }
    
  }
  // 创建多个 li 元素
  dirList.forEach(item=>{
    const li = document.createElement('li');
    // 创建图标元素
    const icon = document.createElement('i');
    icon.classList.add('fa','fa-folder', 'folder-icon');
    icon.style.fontSize = '28px';
    //icon.style.color = '#1d99f3';
    icon.style.marginRight = '5px';
    // 将图标添加到 li 中
    li.appendChild(icon);
    const textNode = document.createTextNode(item.name);
    li.appendChild(textNode);

    li.setAttribute('aria-selected', 'false');
    li.setAttribute('aria-label', item.name);
    // 为 li 元素添加点击事件监听器
    li.addEventListener('click', function () {
      const allLis = copyFileList.querySelectorAll('li');
      // 遍历所有 li 元素，将其 aria-selected 属性设为 false
      const isSelected = this.getAttribute('aria-selected') === 'true';
      allLis.forEach(item => {
        item.setAttribute('aria-selected', 'false');
      });
      this.setAttribute('aria-selected',!isSelected);
    });
    // 为 li 元素添加双击事件监听器
    li.addEventListener('dblclick', async function () {
      //console.log(`你双击了 ${this.getAttribute('aria-label')} 项`);
      // 这里可以添加双击时要执行的其他操作
      copyFileList.innerHTML = '';
      let subpathDiv = document.createElement('span');
      subpathDiv.setAttribute('aria-label', copyPathsDiv.children[copyPathsDiv.children.length-1].getAttribute('aria-label')+'/' + this.getAttribute('aria-label'));
      subpathDiv.innerHTML = this.getAttribute('aria-label') + '/';
      subpathDiv.addEventListener('click', function(){
        //console.log(this.getAttribute('aria-label'));
        setNewFolderListByPath(this.getAttribute('aria-label'));
      });
      copyPathsDiv.appendChild(subpathDiv);
      let res = await fetchDataPost('files',{'currPath':subpathDiv.getAttribute('aria-label')});
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
      let subdirList = res.data.dirList;
      if(subdirList && subdirList.length>0){
        setNewFolderList(subdirList);
      }
    });
    // 将 li 元素添加到 ul 中
    copyFileList.appendChild(li);
  })
}
// 对文件/文件夹信息弹出窗口，设置要显示的文件文件夹信息
function setShowFileInfo(){
  let infoFileDiv = getElById('infoFileDiv');
  infoFileDiv.innerHTML = '';
  if(currPath == '' && selectedFiles.length <= 0){
    let nameDiv = document.createElement('div');
    nameDiv.innerHTML = '<b>名称：</b>filebrowser';
    infoFileDiv.appendChild(nameDiv);
    let modified = document.createElement('div');
    modified.innerHTML = '<b>最后修改：</b>' + formatDate(currPathInfo.modified);
    infoFileDiv.appendChild(modified);
    let fileNumDiv = document.createElement('div');
    fileNumDiv.innerHTML = '<b>文件数：</b>' + fileList.length;
    infoFileDiv.appendChild(fileNumDiv);
    let dirNumDiv = document.createElement('div');
    dirNumDiv.innerHTML = '<b>文件夹数：</b>' + dirList.length;
    infoFileDiv.appendChild(dirNumDiv);
    return;
  }
  if(selectedFiles.length <= 0){ // currPath 不为空
    let nameDiv = document.createElement('div');
    nameDiv.innerHTML = '<b>名称：</b>' + currPathInfo.name;
    infoFileDiv.appendChild(nameDiv);
    let modified = document.createElement('div');
    modified.innerHTML = '<b>最后修改：</b>' + formatDate(currPathInfo.modified);
    infoFileDiv.appendChild(modified);
    infoFileDiv.appendChild(descDiv);
    let sizeDiv = document.createElement('div');
    sizeDiv.innerHTML = '<b>大小：</b>' + formatFileSize(currPathInfo.size);
    infoFileDiv.appendChild(sizeDiv);
    let fileNumDiv = document.createElement('div');
    fileNumDiv.innerHTML = '<b>文件数：</b>' + fileList.length;
    infoFileDiv.appendChild(fileNumDiv);
    let dirNumDiv = document.createElement('div');
    dirNumDiv.innerHTML = '<b>文件夹数：</b>' + dirList.length;
    infoFileDiv.appendChild(dirNumDiv);
    return;
  }
  if(selectedFiles.length == 1){
    let nameDiv = document.createElement('div');
    nameDiv.innerHTML = '<b>名称：</b>' + selectedFiles[0].name;
    infoFileDiv.appendChild(nameDiv);
    let typeDiv = document.createElement('div');
    typeDiv.innerHTML = '<b>类型：</b>' + selectedFiles[0].type;
    infoFileDiv.appendChild(typeDiv);
    let modified = document.createElement('div');
    modified.innerHTML = '<b>最后修改：</b>' + formatDate(selectedFiles[0].modified);
    infoFileDiv.appendChild(modified);
    let sizeDiv = document.createElement('div');
    sizeDiv.innerHTML = '<b>大小：</b>' + formatFileSize(selectedFiles[0].size);
    infoFileDiv.appendChild(sizeDiv);
    return;
  }
  let fileNum = 0;
  let totalSize = 0;
  selectedFiles.forEach(item=>{
    if(item.type == 'file'){
      fileNum ++;
    }
    totalSize += item.size;
  })
  let descDiv = document.createElement('div');
  if(fileNum == 0){
    descDiv.innerHTML = '共选中 ' + selectedFiles.length + ' 个文件夹。';
  }else if(fileNum == selectedFiles.length){
    descDiv.innerHTML = '共选中 ' + selectedFiles.length + ' 个文件。';
  }else{
    descDiv.innerHTML = '共选中 ' + fileNum + ' 个文件，' + (selectedFiles.length-fileNum) + ' 个文件夹。';
  }
  infoFileDiv.appendChild(descDiv);
  let sizeDiv = document.createElement('div');
  sizeDiv.innerHTML = '<b>大小：</b>' + formatFileSize(totalSize);
  infoFileDiv.appendChild(sizeDiv);
}
// 复制文件或文件夹窗口中，文件夹列表，文件夹双击，根据新路径进行获取
function setNewFolderList(newFolderList){
  let copyFileList = getElById('copyFileList');
  newFolderList.forEach(item=>{
    const li = document.createElement('li');
    // 创建图标元素
    const icon = document.createElement('i');
    icon.classList.add('fa','fa-folder', 'folder-icon');
    icon.style.fontSize = '28px';
    //icon.style.color = '#1d99f3';
    icon.style.marginRight = '5px';
    // 将图标添加到 li 中
    li.appendChild(icon);
    const textNode = document.createTextNode(item.name);
    li.appendChild(textNode);

    li.setAttribute('aria-selected', 'false');
    li.setAttribute('aria-label', item.name);
    // 为 li 元素添加点击事件监听器
    li.addEventListener('click', function () {
      const allLis = copyFileList.querySelectorAll('li');
      // 遍历所有 li 元素，将其 aria-selected 属性设为 false
      const isSelected = this.getAttribute('aria-selected') === 'true';
      allLis.forEach(item => {
        item.setAttribute('aria-selected', 'false');
      });
      this.setAttribute('aria-selected',!isSelected);
    });
    // 为 li 元素添加双击事件监听器
    li.addEventListener('dblclick', async function () {
      //console.log(`你双击了 ${this.textContent.trim()} 项`);
      // 这里可以添加双击时要执行的其他操作
      let copyPathsDiv = getElById('copyPathsDiv');
      let subpathDiv = document.createElement('span');
      subpathDiv.setAttribute('aria-label', copyPathsDiv.children[copyPathsDiv.children.length-1].getAttribute('aria-label')+'/' + this.textContent.trim());
      subpathDiv.innerHTML = this.textContent.trim() + '/';
      subpathDiv.addEventListener('click', function(){
        //console.log(this.getAttribute('aria-label'))
        setNewFolderListByPath(this.getAttribute('aria-label'));
      });
      copyPathsDiv.appendChild(subpathDiv);
      copyFileList.innerHTML = '';
      let res = await fetchDataPost('files',{'currPath':subpathDiv.getAttribute('aria-label')});
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
      let subdirList = res.data.dirList;
      if(subdirList && subdirList.length>0){
        setNewFolderList(subdirList);
        //copyFileList.appendChild(li);
      }
    });

    // 将 li 元素添加到 ul 中
    copyFileList.appendChild(li);
  })
}
// 路径导航条中任一路径被单击后，将操作路径设置为被单击路径，并更新文件夹列表
async function setNewFolderListByPath(path){
  let copyPathsDiv = getElById('copyPathsDiv');
  const allSpan = copyPathsDiv.querySelectorAll('span');
  let pos = -1;
  for(let i=0;i<allSpan.length;i++){
    if(allSpan[i].getAttribute('aria-label')==path){
      pos = i;
      break;
    }
  }
  for(let i=allSpan.length-1;i>pos;i--){
    copyPathsDiv.removeChild(allSpan[i]);
  }
  let copyFileList = getElById('copyFileList');
  copyFileList.innerHTML = '';
  let res = await fetchDataPost('files',{'currPath':path});
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
  let subdirList = res.data.dirList;
  if(subdirList && subdirList.length>0){
    setNewFolderList(subdirList);
  }
}
// 页面加载完成或重设置大小时执行
async function resizeOrLoad(){
  userInfo = JSON.parse(sessionStorage.getItem('user'));
  await applyColorScheme(userInfo.theme);
  //console.log('L1548 resizeOrLoad ..');
  releaseSelStatus('my-files');
  switchWinOrPhone();
  await getUsedSpace();
  //console.log('L735 diskSpace=', diskSpace);
  await getVersion();
  await switchLang(userInfo.lang);
  replaceVar();
  selectedFiles = [];
  showFileList();
  getElById('sysHelpLink').innerHTML = userInfo.global.instanceName;
  getElById('logoImg').src = userInfo.global.systemIcon;
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
    if(selectedFiles.length>0){
      showDomObj('file-selection');
    }
    showDomObj(switchMenulistBtn, 'block');
    showDomObj(headerRight1, 'flex');
    hideDomObj(leftSidebar);
    hideDomObj(logoImg);
    hideDomObj(search);
    hideDomObj(headerRight);
    main.style.marginLeft = '0px'
    main.style.width = windowWidth + 'px'
    //console.log('L896 listStyle='+listStyle);
    if(listStyle == 'detail'){
      let sizeP = document.getElementsByClassName('size');
      for (const item of sizeP) {
        hideDomObj(item);
      }
      let shareP = document.getElementsByClassName('shared');
      for (const item of shareP) {
        hideDomObj(item);
      }
    }
    return;
  }
  //window
  hideDomObj(switchMenulistBtn);
  hideDomObj(headerRight1);
  hideDomObj('file-selection');
  showDomObj(leftSidebar, '');
  showDomObj(logoImg, '');
  showDomObj(search, '');
  showDomObj(headerRight, '');
  main.style.marginLeft = 'auto'
  // 获取父元素的字体大小
  const fontSize = parseFloat(getComputedStyle(main.parentNode).fontSize);
  // 计算 19em 对应的像素值
  const nineteenEmInPixels = 18 * fontSize;
  main.style.width = (windowWidth - nineteenEmInPixels) + 'px';
  if(listStyle == 'detail'){
    let sizeP = document.getElementsByClassName('size');
    for (const item of sizeP) {
      showDomObj(item, '');
    }
    let shareP = document.getElementsByClassName('shared');
    for (const item of shareP) {
      showDomObj(item, '');
    }
  }
}
// 切换语言
let languagePack = [];
async function switchLang(lang){
  let browserLanguage = navigator.language || navigator.userLanguage;
  let setlang = lang;
  if(isValid(lang)==false){
    lang = userInfo.lang;
    console.log('L1571 lang='+lang);
  }
  if(lang == 'browser'){
    setlang = browserLanguage;
  }
  if(lang != ''){
    let res = await fetchDataPost('updateSet', {'lang': lang});
    if(checkResponse(res, '')==false){
      console.error('L1574 res=', res);
      return;
    }
    userInfo.lang = lang;
    sessionStorage.setItem('user', JSON.stringify(userInfo));
  }
  let res = await fetchDataPost('lang',{ 'lang': setlang });
  //console.log('L778 res=',res);
  if(checkResponse(res, '')==false){
    //alert('创建文件夹失败');
    console.error('L1582 res=', res);
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
// 针对单个对象，切换内容语言并替换其中的占位符
function switchLangAndReplaceVar(objid, tempVar, value){
  if(!languagePack || languagePack.length<=0){
    return;
  }
  if(!tempVar){
    return;
  }
  let langVar = languagePack.find(x=>x.id==objid);
  if(!langVar){
    return;
  }
  let obj = getElById(objid);
  if(!obj){
    return;
  }
  let htmlTemplate = langVar.value;//obj.innerHTML;
  let replaceHtml = htmlTemplate.replace(/{([^}]+)}/g, (match, key) => {
    return value || match;
  });
  //console.log('L982 htmlTemplate='+htmlTemplate);
  //console.log('L983 replaceHtml='+replaceHtml);
  obj.innerHTML = replaceHtml;
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
        //diskSpace.usedDiskSpace = diskSpace.usedDiskSpace/1024/1024/1024;
        usedDiskSpacePercent = Math.trunc(diskSpace.usedDiskSpace/1024/1024/1024/diskSpace.totalDiskSpace*100);
      }
      diskSpace.usedDiskSpace = (diskSpace.usedDiskSpace).toFixed(0);
      if(diskSpace.usedDiskSpace == 0){
        diskSpace.usedDiskSpace = 0;
      }
      diskSpace.usedDiskSpace = formatFileSize(diskSpace.usedDiskSpace);//+= ' GB';
      diskSpace.totalDiskSpace += ' GB';
    }else{
      diskSpace.usedDiskSpace = '0 B';
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
    elObj.parentNode.title = usedDiskSpacePercent + '%';
    //console.log('L888 elObj.style.width='+elObj.style.width);
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
// 切换：文件列表（包括路径导航条），搜索页面，下载页面，上传页面，共享页面，
// 设置页面, 文本文件编辑页面, 图片预览页面
function hidePages(){
  let allPageIds = ['dirNav', 'listing', 'search-page', 'download-page', 
      'upload-page', 'share-page', 'settings-page', 'editfile-page', 'previewimage-page'];
  allPageIds.forEach(item=>{
    hideDomObj(item);
  });
  //showDomObj(excludeObjId, '');
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
async function getAndShowUsers(pageNum){
  let pageSize = getElById('itemsPerPageSelectUserTable').value;
  if(isValid(pageSize)==false || pageSize<10){
    pageSize = 10;
  }
  if(isValid(pageNum)==false || pageNum<=0){
    pageNum = 1;
  }
  console.log('L2064 pageSize=', pageSize);
  let res = await fetchDataPost('getAllUsers', {pageNum: pageNum, pageSize: pageSize})
  if(checkResponse(res, '获取全部用户失败')==false){
    return;
  }
  let userData = res.data.list;
  let totalSize = res.data.totalSize;
  pageNum = res.data.pageNum;
  let tableBody = getElById('userTableBody');
  tableBody.innerHTML = '';
  userData.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <input type="checkbox" class="row-checkbox" name="checkboxUserTable" />
      </td>
      <td>${user.username}</td>
      <td>${user.isAdmin ? '是' : '否'}</td>
      <td>${user.rootFolderPath}</td>
      <td>${user.username=='admin' ? '是' : user.isActive==undefined?'否':user.isActive}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="showUserEditModal('${user.id}')">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="showUserDelConfirmModal('${user.id}', '${user.username}')" ${user.username=='admin'?'disabled':''}>删除</button>
      </td>
    `;
    row.id = 'userTableRow-' + user.id;
    // 为每行添加点击事件
    row.addEventListener('click', function () {
        this.classList.toggle('selected');
        const checkbox = this.querySelector('.row-checkbox');
        checkbox.checked = !checkbox.checked;
    });
    // 为复选框添加点击事件，阻止事件冒泡
    const checkbox = row.querySelector('.row-checkbox');
    checkbox.addEventListener('click', function (event) {
      event.stopPropagation();
      row.classList.toggle('selected', this.checked);
    });
    tableBody.appendChild(row);
  });
  getElById('totalSizeUserTable').innerHTML = '共' + totalSize + '个';
  const totalPages = Math.ceil(totalSize / pageSize);
  createPagination(totalPages, pageNum);
}
function createPagination(totalPages, currentPage) {
  let pagination = getElById('paginationUserTable');
  pagination.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement('li');
    li.classList.add('page-item');
    if (i === currentPage) {
        li.classList.add('active');
    }
    const a = document.createElement('a');
    a.classList.add('page-link');
    a.href = '#';
    a.textContent = i;
    a.dataset.page = i;
    a.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(e.target.dataset.page);
        currentPage = page;
        //showData(page, itemsPerPage);
        getAndShowUsers(page);
    });
    li.appendChild(a);
    pagination.appendChild(li);
  }
}
let editingUser = {};
async function showUserEditModal(userid){
  //let row = getElById('userTableRow-' + userid);
  editingUser = {};
  let res = await fetchDataPost('getUserById', {id:userid});
  if(checkResponse(res, '')==false){
    return;
  }
  if(res.result != true){
    alert('获取用户信息失败');
    return;
  }
  editingUser = res.data;
  editUsername.value = editingUser.username;
  editUserRootFolder.value = editingUser.rootFolderPath;
  editUserPassword.value = '';
  editUserIsAdmin.checked = editingUser.isAdmin==1?true:false;
  editUserIsActive.checked = editingUser.isActive==1?true:false;
  showDomObj(editUserModal, 'block');
}
let delUserid = '';
function showUserDelConfirmModal(userid, username){
  delUserid = userid;
  deleteUserConfirmText.innerHTML = '用户删除后，将不可恢复。<br>你确定要删除用户 '
      + username + ' 吗？';
  showDomObj(deleteUserConfirmModal, 'block');
}