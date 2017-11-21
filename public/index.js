var currentSensorIndex = 0;
if (window.localStorage.getItem("currentSensorIndex")) {
  currentSensorIndex = window.localStorage.getItem("currentSensorIndex");
}
var sensorList = [];

document.addEventListener('DOMContentLoaded', function() {
  try {
    let app = firebase.app();
    document.getElementById('load').innerHTML = '';

    firebase.database().ref('/').on('value', snapshot => {
      var tempChartData = { labels: [], series: [] };
      var voltageChartData = { labels: [], series: [] };
      var temp = snapshot.val();
      var sensorSelectBox = document.getElementById('sensors');
      var i;
      for(i = sensorSelectBox.options.length - 1; i >= 0; i--) {
          sensorSelectBox.remove(i);
      }
      sensorList = [];

      for (var sensorId in temp) {
        if (sensorId === 'names') {
          continue;
        }
        var name = sensorId;
        if (temp.names[sensorId] && temp.names[sensorId].name) {
          name = temp.names[sensorId].name;
        }
        var sensor = {id: sensorId, name: name, warnings: {}};

        var option = document.createElement('option');
        option.text = sensor.name;
        option.value = sensorId;
        sensorSelectBox.add(option);

        chartData = buildArrays(temp, sensorId, sensor, (12*60*60*1000));
        var attempts = 1;
        while (chartData.t.series[0].length === 0 && attempts <= 5) {
          chartData = buildArrays(temp, sensorId, sensor, ((12 + (attempts * 2))*60*60*1000))
          attempts++;
        }
        sensor.tempChartData = chartData.t;
        sensor.voltageChartData = chartData.v;
        sensor.signalChartData = chartData.s;
        sensorList.push(sensor);
      }
      sensorSelectBox.value = sensorList[currentSensorIndex].id
      updateDom();
    });
  } catch (e) {
    console.error(e);
    document.getElementById('load').innerHTML = 'Error loading the Firebase SDK, check the console.';
  }
});

function buildArrays(temp, sensorId, sensor, timeLimit) {
  var now = Date.now();
  tempChartData = { labels: [], series: [] };
  voltageChartData = { labels: [], series: [] };
  signalChartData = { labels: [], series: [] };
  var temperature = [];
  var voltage = [];
  var signal = [];
  var i = -1;
  for (id in temp[sensorId]) {
    i++;
    var date = temp[sensorId][id].time;
    var diff = now - date;
    if (diff > timeLimit && Object.keys(temp[sensorId]).length > 10) {
      continue;
    } else {
      var m = moment(date, "x");
      moment.locale();
      if (!m.isValid()) {
        continue;
      }
      var stringDate;
      if (m.isBetween(moment().startOf('day'), moment().startOf('day').minute(30))) {
        stringDate = m.format('lll');
      } else {
        stringDate = m.format('LT');
      }
      tempChartData.labels.push(stringDate);
      voltageChartData.labels.push(stringDate);
      voltage.push(Math.round(temp[sensorId][id].voltage * 100) / 100);
      if (temp[sensorId][id].signal) {
        signal.push(temp[sensorId][id].signal);
        signalChartData.labels.push(stringDate);
      }
      temperature.push(Math.round(temp[sensorId][id].temperature * 10) / 10);
      if (i == Object.keys(temp[sensorId]).length - 1) {
        if (temp[sensorId][id].voltage < 3.0) {
          sensor.warnings.battery = true;
        }
        if (now - date > 60*60*1000) {
          sensor.warnings.noReport = true;
        }
      }
    }
  }
  tempChartData.series.push(temperature);
  voltageChartData.series.push(voltage);
  signalChartData.series.push(signal);

  return {v: voltageChartData, t: tempChartData, s: signalChartData};
}

function updateDom() {
  var series = sensorList[currentSensorIndex].tempChartData.series[0];
  var current = series[series.length - 1];
  var labels = sensorList[currentSensorIndex].tempChartData.labels;
  var currentDate = labels[labels.length - 1];
  document.getElementById('latest').innerHTML = ' ' + current + ' °C (' + currentDate + ')';
  if (sensorList[currentSensorIndex].warnings.battery) {
    document.getElementById('batteryWarning').innerHTML = sensorList[currentSensorIndex].name + ' behöver laddas.';
  } else {
    document.getElementById('batteryWarning').innerHTML = '';
  }
  if (sensorList[currentSensorIndex].warnings.noReport) {
    document.getElementById('reportWarning').innerHTML = sensorList[currentSensorIndex].name + ' har inte rapporterat i tid.';
  } else {
    document.getElementById('reportWarning').innerHTML = '';
  }
  document.getElementById('temp').innerHTML = 'Temperatur';
  document.getElementById('volt').innerHTML = 'Spänning';
  document.getElementById('sig').innerHTML = 'Signalstyrka';
  new Chartist.Line('#temperature', sensorList[currentSensorIndex].tempChartData);
  new Chartist.Line('#voltage', sensorList[currentSensorIndex].voltageChartData);
  new Chartist.Line('#signal', sensorList[currentSensorIndex].signalChartData);
}

function changeSensor() {
  for (var index in sensorList) {
    var selected = document.getElementById('sensors').value;
    if (sensorList[index].id === selected) {
      currentSensorIndex = index;
      window.localStorage.setItem("currentSensorIndex", currentSensorIndex);
      updateDom();
      break;
    }
  }
};