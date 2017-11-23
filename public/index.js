var currentSensorIndex = 0;
if (window.localStorage.getItem("currentSensorIndex")) {
  currentSensorIndex = window.localStorage.getItem("currentSensorIndex");
}
var sensorList = [];

var voltageChartSettings = {
  axisX: {
    labelInterpolationFnc: function skipLabels(value, index) {
      return index % 3  === 0 ? value : null;
    }
  },
  low: 0,
  high: 4,
  plugins: [
    Chartist.plugins.tooltip({anchorToPoint: true})
  ]
};

var signalChartSettings = {
  axisX: {
    labelInterpolationFnc: function skipLabels(value, index) {
      return index % 3  === 0 ? value : null;
    }
  },
  low: -90,
  high: -20,
  plugins: [
    Chartist.plugins.tooltip({anchorToPoint: true})
  ]
};

var tempChartSettings = {
  axisX: {
    labelInterpolationFnc: function skipLabels(value, index) {
      return index % 3  === 0 ? value : null;
    }
  },
  plugins: [
    Chartist.plugins.tooltip({anchorToPoint: true})
  ]
};

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
        var sensor = {id: sensorId, name: name, warnings: {}, avgExecutionTime: 0};

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
  var minTemp = 100;
  var maxTemp = -100;
  var sumExecTime = 0;
  var countExecTime = 0 ;
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
      sumExecTime += temp[sensorId][id].runtime;
      countExecTime++;
      var stringDate;
      if (m.isBetween(moment().startOf('day'), moment().startOf('day').minute(30))) {
        stringDate = m.format('lll');
      } else {
        stringDate = m.format('LT');
      }
      tempChartData.labels.push(stringDate);
      voltageChartData.labels.push(stringDate);
      voltage.push({meta: m.format('lll'), value: Math.round(temp[sensorId][id].voltage * 100) / 100 });
      if (temp[sensorId][id].signal) {
        signal.push({meta: m.format('lll'), value: temp[sensorId][id].signal });
        signalChartData.labels.push(stringDate);
      }
      temperature.push({meta: m.format('lll'), value: Math.round(temp[sensorId][id].temperature * 10) / 10 });
      if (temp[sensorId][id].temperature > maxTemp) {
        maxTemp = temp[sensorId][id].temperature;
      }
      if (temp[sensorId][id].temperature < minTemp) {
        minTemp = temp[sensorId][id].temperature;
      }
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
  sensor.avgExecutionTime = (sumExecTime / countExecTime);
  tempChartSettings.low = minTemp - 5;
  tempChartSettings.high = maxTemp + 4;
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
  document.getElementById('latest').innerHTML = ' ' + current.value + ' °C, ' + currentDate;
  document.getElementById('execTime').innerHTML = sensorList[currentSensorIndex].avgExecutionTime + ' ms';
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
  new Chartist.Line('#temperature', sensorList[currentSensorIndex].tempChartData, tempChartSettings);
  new Chartist.Line('#voltage', sensorList[currentSensorIndex].voltageChartData, voltageChartSettings);
  new Chartist.Line('#signal', sensorList[currentSensorIndex].signalChartData, signalChartSettings);
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