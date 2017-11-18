var currentSensorIndex = 0;
var sensorList = [];

document.addEventListener('DOMContentLoaded', function() {
  try {
    let app = firebase.app();
    document.getElementById('load').innerHTML = '';

    firebase.database().ref('/').on('value', snapshot => {
      var tempChartData = { labels: [], series: [] };
      var voltageChartData = { labels: [], series: [] };
      var temp = snapshot.val();
      var now = Date.now();
      var sensorSelectBox = document.getElementById('sensors');
      for (i = 0; i < sensorSelectBox.options.length; i++) {
        sensorSelectBox.options[i] = null;
      }

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

        tempChartData = { labels: [], series: [] };
        voltageChartData = { labels: [], series: [] };
        var temperature = [];
        var voltage = [];
        var i = -1;
        for (date in temp[sensorId]) {
          i++;
          if (now - date > (12*60*60*1000) && temp[sensorId].length > 24) {
            continue;
          } else {
            var m = moment(date, "x");
            moment.locale();
            var stringDate;
            if (m.isBetween(moment().startOf('day'), moment().startOf('day').minute(30))) {
              stringDate = m.format('lll');
            } else {
              stringDate = m.format('LT');
            }
            tempChartData.labels.push(stringDate);
            voltageChartData.labels.push(stringDate);
            voltage.push(temp[sensorId][date].voltage);
            temperature.push(temp[sensorId][date].temperature);
            if (i == Object.keys(temp[sensorId]).length - 1) {
              if (temp[sensorId][date].voltage < 3.0) {
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
        sensor.tempChartData = tempChartData;
        sensor.voltageChartData = voltageChartData;
        sensorList.push(sensor);
      }
      updateDom();
    });
  } catch (e) {
    console.error(e);
    document.getElementById('load').innerHTML = 'Error loading the Firebase SDK, check the console.';
  }
});

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
  new Chartist.Line('#temperature', sensorList[currentSensorIndex].tempChartData);
  new Chartist.Line('#voltage', sensorList[currentSensorIndex].voltageChartData);
}

function changeSensor() {
  for (var index in sensorList) {
    var selected = document.getElementById('sensors').value;
    if (sensorList[index].id === selected) {
      currentSensorIndex = index;
      updateDom();
      break;
    }
  }
};