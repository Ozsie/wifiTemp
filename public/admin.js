var signedIn;
var user;

document.addEventListener('DOMContentLoaded', function() {
  firebase.auth().onAuthStateChanged(function(u) {
    if (u) {
      user = u;
      signedIn = true;
      console.log('user logged in');
      loadSensors();
    } else {
      user = undefined;
      signedIn = false;
      updateDom([]);
      console.log('user logged out');
    }
  });
});

window.onunload = () => {
  firebase.auth().signOut().then(function() {
    console.log('User signed out');
  }).catch(function(error) {
    console.error(error);
  });
};

const login = () => {
  var email = document.getElementById('email');
  var password = document.getElementById('password');

  firebase.auth().signInWithEmailAndPassword(email.value, password.value).then(function(u) {
    user = u;
    hideLoginForm();
    showSensorTable();
    loadSensors();
  }).catch(function(error) {
    if (error) {
      console.log(error.code, error.message);
    }
  });
};

const hideLoginForm = () => {
  var loginForm = document.getElementById('loginForm');
  loginForm.classList.add('hidden');
};

const showSensorTable = () => {
  var sensorList = document.getElementById('sensorList');
  sensorList.classList.remove('hidden');
  sensorList.classList.add('visible');
};

const clear = () => {
  var sensorTBody = document.getElementById('sensors');
  while (sensorTBody.hasChildNodes()) {
    sensorTBody.removeChild(sensorTBody.lastChild);
  }
};

const createCell = (sensorId, id, value, type, c, readonly, noOnChange) => {
  var td = document.createElement('td');
  var input = document.createElement('input');
  input.id = id + '-' + sensorId;
  input.type = type;
  input.value = value;
  input.readOnly = readonly;
  if (!noOnChange) {
    input.onchange = () => updateSensor(sensorId, id, input);
  }
  input.classList.add(c);
  td.appendChild(input);
  return td;
};

const updateSensor = (sensorId, id, input) => {
  console.log('UPDATE ' + sensorId + '/' + id + ': ' + input.value);
  firebase.database().ref('/sensors/' + sensorId + '/' + id).set(input.value);
};

const updateSensorAll = sensorId => {
  console.log('UPDATE ' + sensorId);
  const update = {
    name: document.getElementById('name-' + sensorId).value,
    settings: {
      sleep: document.getElementById('settings/sleep-' + sensorId).value,
      command: document.getElementById('settings/command-' + sensorId).value
    }
  }
  console.log(update)
  firebase.database().ref('/sensors/' + sensorId + '/').once('value', snapshot => {
    var current = snapshot.val();
    console.log(current);
    current.name = document.getElementById('name-' + sensorId).value;
    current.settings = {
      sleep: document.getElementById('settings/sleep-' + sensorId).value,
      command: document.getElementById('settings/command-' + sensorId).value
    };
    console.log(current);
  });
};

const loadSensors = () => {
  firebase.database().ref('/sensors').on('value', snapshot => {
    console.log('Sensors changed');
    var sensors = snapshot.val();
    updateDom(sensors);
  });
};

const add = () => {
  console.log('add');
  var sensorTBody = document.getElementById('sensors');
  var tr = document.createElement('tr');

  tr.appendChild(createCell('new', 'id', '', 'number', 'input-left', false, true));
  tr.appendChild(createCell('new', 'name', '', 'text', 'input-middle', false, true));
  tr.appendChild(createCell('new', 'settings/sleep', 30, 'number', 'input-middle', false, true));
  tr.appendChild(createCell('new', 'settings/command', 'measure', 'text', 'input-right', false, true));
  var td = document.createElement('td');
  var input = document.createElement('input');
  input.id = 'submit-' + 'new';
  input.onclick = () => addSensor();
  input.type = 'button';
  input.value = '\u2713';
  input.classList.add('pure-button');
  input.classList.add('button-success');
  td.appendChild(input);
  tr.appendChild(td);

  sensorTBody.appendChild(tr);
};

const addSensor = (sensorId, value) => {
  var idCell = document.getElementById('id-new');
  var nameCell = document.getElementById('name-new');
  var sleepCell = document.getElementById('settings/sleep-new');
  var commandCell = document.getElementById('settings/command-new');

  var value = {
    id: idCell.value,
    name: nameCell.value,
    settings: {
      sleep: sleepCell.value,
      command: commandCell.value
    }
  }
  firebase.database().ref('/sensors/' + idCell.value).set(value, function(error) {
    if (error) {
      console.log(error);
    }
  });
};

const updateDom = sensors => {
  var sensorTBody = document.getElementById('sensors');

  clear();

  for (var sensorId in sensors) {
    var tr = document.createElement('tr');

    tr.appendChild(createCell(sensorId, 'id', sensorId, 'number', 'input-left', true));
    tr.appendChild(createCell(sensorId, 'name', sensors[sensorId].name, 'text', 'input-middle'));
    tr.appendChild(createCell(sensorId, 'settings/sleep', sensors[sensorId].settings.sleep, 'number', 'input-middle'));
    tr.appendChild(createCell(sensorId, 'settings/command', sensors[sensorId].settings.command, 'text', 'input-right'));
    var td = document.createElement('td');
    var input = document.createElement('input');
    input.id = 'submit-' + sensorId;
    input.onclick = () => updateSensorAll(sensorId);
    input.type = 'button';
    input.value = '\u2713';
    input.classList.add('pure-button');
    input.classList.add('button-success');
    td.appendChild(input);
    tr.appendChild(td);

    sensorTBody.appendChild(tr);
  }
};