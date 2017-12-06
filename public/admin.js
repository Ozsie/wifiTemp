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

function login() {
  var email = document.getElementById('email');
  var password = document.getElementById('password');

  firebase.auth().signInWithEmailAndPassword(email.value, password.value).then(function(u) {
    user = u;
    loadSensors();
  }).catch(function(error) {
    if (error) {
      console.log(error.code, error.message);
    }
  });
}

function clear() {
  var sensorTBody = document.getElementById('sensors');
  while (sensorTBody.hasChildNodes()) {
    sensorTBody.removeChild(sensorTBody.lastChild);
  }
}

function createCell(sensorId, id, value) {
  var td = document.createElement('td');
  var input = document.createElement('input');
  input.id = id + '-' + sensorId;
  input.value = value;
  input.onchange = () => updateSensor(sensorId, id, input);
  td.appendChild(input);
  return td;
}

const updateSensor = (sensorId, id, input) => {
  console.log('UPDATE ' + sensorId + '/' + id + ': ' + input.value);
  firebase.database().ref('/sensors/' + sensorId + '/' + id).set(input.value);
}

function loadSensors() {
  firebase.database().ref('/sensors').on('value', snapshot => {

    var sensors = snapshot.val();
    updateDom(sensors);
  });
}

function updateDom(sensors) {
  var sensorTBody = document.getElementById('sensors');

  clear();

  for (var sensorId in sensors) {
    var tr = document.createElement('tr');

    tr.appendChild(createCell(sensorId, 'id', sensorId));
    tr.appendChild(createCell(sensorId, 'name', sensors[sensorId].name));
    tr.appendChild(createCell(sensorId, 'settings/sleep', sensors[sensorId].settings.sleep));
    tr.appendChild(createCell(sensorId, 'settings/command', sensors[sensorId].settings.command));

    sensorTBody.appendChild(tr);
  }
}