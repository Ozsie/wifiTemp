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
        var sensor = {id: sensorId, name: name, warnings: {}, avgExecutionTime: 0, avgBatteryLife: 0};

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
      if (currentSensorIndex > sensorList.length - 1) {
        currentSensorIndex = sensorList.length - 1;
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
  var batteryLifeStart = 0;
  var batteryLifeEnd = 0;
  var batteryLife = [];
  var minTemp = 100;
  var maxTemp = -100;
  var sumExecTime = 0;
  var countExecTime = 0 ;
  for (id in temp[sensorId]) {
    i++;
    var date = temp[sensorId][id].time;
    var diff = now - date;
    var currentVoltage = temp[sensorId][id].voltage;
    var currentSignal = temp[sensorId][id].signal;
    var currentTemperature = temp[sensorId][id].temperature;
    if (currentVoltage > 3.85 && batteryLifeStart === 0) {
      batteryLifeStart = date;
    }
    if (currentVoltage < 3 && batteryLifeEnd === 0) {
      batteryLifeEnd = date;
    }
    if (batteryLifeStart > 0 && batteryLifeEnd > 0) {
      batteryLife.push(batteryLifeEnd - batteryLifeStart);
      batteryLifeEnd = 0;
      batteryLifeStart = 0;
    }
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
      voltage.push({meta: m.format('lll'), value: Math.round(currentVoltage * 100) / 100 });
      signal.push({meta: m.format('lll'), value: currentSignal });
      signalChartData.labels.push(stringDate);
      temperature.push({meta: m.format('lll'), value: Math.round(currentTemperature * 10) / 10 });
      if (currentTemperature > maxTemp) {
        maxTemp = currentTemperature;
      }
      if (currentTemperature < minTemp) {
        minTemp = currentTemperature;
      }
      if (i == Object.keys(temp[sensorId]).length - 1) {
        if (voltage < 3.0) {
          sensor.warnings.battery = true;
        }
        if (now - date > 60*60*1000) {
          sensor.warnings.noReport = true;
        }
      }
    }
  }
  sensor.avgExecutionTime = Math.round((sumExecTime / countExecTime) * 10) / 10;
  if (batteryLife.length > 0) {
    var sum = batteryLife.reduce(function(total, num) { return total + num; })
    var lifeMillis = sum / batteryLife.length;
    if (batteryLifeStart) {
      var lifeLeftMillis = lifeMillis - (Date.now() - batteryLifeStart);
      sensor.lifeLeft = Math.round((lifeLeftMillis / 3600000) * 10) / 10;
    }
    sensor.avgBatteryLife = Math.round(((sum / batteryLife.length) / 3600000) * 10) / 10;
  }
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
  document.getElementById('batteryLife').innerHTML = sensorList[currentSensorIndex].lifeLeft + '/' + sensorList[currentSensorIndex].avgBatteryLife + ' h';
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