const { ipcRenderer } = require('electron');
let selected = '';
const popupAlert = new bootstrap.Modal(document.getElementById('popupAlert'), { toggle: false });

window.onload = function () {
  document.getElementById('dark-mode-switch').checked = (localStorage.getItem('theme') === 'dark' ? true : false);
  tryLoginItem();
};


function openItem() {
  const worker = new WorkerHandler();

  version = ipcRenderer.sendSync('getVersion');
  worker.work(['checkItemCache', version], openMain);

  function openMain() {
    ipcRenderer.send('loading', 'finished');
  }
}

function tryLoginItem() {
  selected = 'openItem';

  const worker = new WorkerHandler();
  worker.work(['checkUser'], checkLogin);
}


function checkLogin(status) {
  document.getElementById('failedLogin').classList.remove('d-flex');
  document.getElementById('failedLogin').classList.add('d-none');
  document.getElementById('spinner').classList.remove('d-flex');
  document.getElementById('spinner').classList.add('d-none');
  if (status[0] === 0) {
    localStorage.setItem('userSite', status[2])
    popupAlert.hide();
    postMessage(['debug', `Successfully logged in to Maximo`]);
    switch (selected) {
      case 'openItem':
        openItem();
        break;
      default:
        console.log('no default action set');
    }
  } else {
    popupAlert.show();
    document.getElementById('failedLogin').classList.remove('d-none');
    document.getElementById('failedLogin').classList.add('d-flex');
  }
}

function tryLoginAgain() {
  document.getElementById('spinner').classList.remove('d-none');
  document.getElementById('spinner').classList.add('d-flex');
  document.getElementById('failedLogin').classList.remove('d-flex');
  document.getElementById('failedLogin').classList.add('d-none');
  const worker = new WorkerHandler();
  worker.work(['checkUser', {
    userid: document.getElementById('userid').value,
    password: '',
  }], checkLogin);
}

function noMaximo() {
  popupAlert.hide();
  switch (selected) {
    case 'openItem':
      openItem();
      break;
    default:
      console.log('no default action set');
  }
}

// document.getElementById("openObserveTemp").addEventListener("click", openObserveTemp);
document.getElementById('openItem').addEventListener('click', tryLoginItem);
// document.getElementById("openItemTranslation").addEventListener("click", openItemTranslation);
// document.getElementById("openAssetDescription").addEventListener("click", openAssetDescription);
document.getElementById('continue').addEventListener('click', noMaximo);
document.getElementById('tryLogin').addEventListener('click', tryLoginAgain);
document.getElementById('dark-mode-switch').addEventListener('click', toggleTheme);
