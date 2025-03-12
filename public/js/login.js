addEvent('loginForm', 'submit', handleLogin);
async function handleLogin(event) {
  event.preventDefault();
  const username = getElById('username').value;
  const password = getElById('password').value;
  let res = await fetchDataPost('/login',{username, password});
  console.log('L30 res=',res);
  if(checkResponse(res,'登录失败')==false){
    return;
  }
  //console.log('res=', res);
  sessionStorage.setItem('user', JSON.stringify(res.data));
  window.location.href = '/home';
};