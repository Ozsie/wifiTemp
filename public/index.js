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
  low: 2.5,
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
  high: -40,
  plugins: [
    Chartist.plugins.tooltip({anchorToPoint: true})
  ]
};

var execTimeChartSettings = {
  axisX: {
    labelInterpolationFnc: function skipLabels(value, index) {
      return index % 3  === 0 ? value : null;
    }
  },
  low: 3000,
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

var summarize = function(total, num) { return total + num; };

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
        sensor.execTimeChartData = chartData.e;
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
  execTimeChartData = { labels: [], series: [] };
  var temperature = [];
  var voltage = [];
  var signal = [];
  var exec = [];
  var i = -1;
  var previousVoltage = 0;
  var voltageDrops = [];
  var maxVoltage = 0;
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
    var currentExecTime = temp[sensorId][id].runtime;

    if (currentVoltage > 3.85 && batteryLifeStart === 0) {
      maxVoltage = currentVoltage;
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
    if (batteryLifeStart > 0 && batteryLifeEnd === 0) {
      if (previousVoltage > 0) {
        voltageDrops.push(previousVoltage - currentVoltage);
      }
      previousVoltage = currentVoltage;
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
      var stringDate = getStringDate(m);

      if (currentTemperature > maxTemp) {
        maxTemp = currentTemperature;
      }
      if (currentTemperature < minTemp) {
        minTemp = currentTemperature;
      }

      tempChartData.labels.push(stringDate);
      temperature.push({meta: m.format('lll'), value: Math.round(currentTemperature * 10) / 10 });

      voltageChartData.labels.push(stringDate);
      voltage.push({meta: m.format('lll'), value: Math.round(currentVoltage * 100) / 100 });

      signalChartData.labels.push(stringDate);
      signal.push({meta: m.format('lll'), value: currentSignal });

      execTimeChartData.labels.push(stringDate);
      exec.push({meta: m.format('lll'), value: currentExecTime });

      sensor.warnings = checkWarningSigns(i, temp, sensorId, diff);
    }
  }
  sensor.avgExecutionTime = Math.round((sumExecTime / countExecTime) * 10) / 10;
  sensor.avgVoltageDrop = Math.round((voltageDrops.reduce(summarize) / voltageDrops.length) * 10000) / 10000;
  sensor.approximateMeasurements = Math.round(((maxVoltage - 3) / sensor.avgVoltageDrop) * 10) / 10;
  sensor.approximateDaysOfOperation = Math.round((sensor.approximateMeasurements / 48) * 10) / 10;
  if (batteryLife.length > 0) {
    if (batteryLifeStart) {
      sensor.lifeLeft = calculateLifeLeft(batteryLife, batteryLifeStart);
    }
    sensor.avgBatteryLife = calculateAverageBatteryLife(batteryLife);
  }
  tempChartSettings.low = minTemp - 4;
  tempChartSettings.high = maxTemp + 2;
  tempChartData.series.push(temperature);
  voltageChartData.series.push(voltage);
  signalChartData.series.push(signal);
  execTimeChartData.series.push(exec);

  return {v: voltageChartData, t: tempChartData, s: signalChartData, e: execTimeChartData};
}

function checkWarningSigns(i, temp, sensorId, diff) {
  var warnings = {};
  if (i == Object.keys(temp[sensorId]).length - 1) {
    if (voltage < 3.0) {
      warnings.battery = true;
    }
    if (diff> 60*60*1000) {
      warnings.noReport = true;
    }
  }

  return warnings;
}

function calculateLifeLeft(batteryLife, batteryLifeStart) {
  var sum = batteryLife.reduce(summarize);
  var lifeMillis = sum / batteryLife.length;
  var lifeLeftMillis = lifeMillis - (Date.now() - batteryLifeStart);
  return Math.round((lifeLeftMillis / 3600000) * 10) / 10;
}

function calculateAverageBatteryLife(batteryLife) {
  var sum = batteryLife.reduce(summarize);
  var lifeMillis = sum / batteryLife.length;
  return Math.round(((sum / batteryLife.length) / 3600000) * 10) / 10;
}

function updateDom() {
  var series = sensorList[currentSensorIndex].tempChartData.series[0];
  var current = series[series.length - 1];
  var labels = sensorList[currentSensorIndex].tempChartData.labels;
  var currentDate = labels[labels.length - 1];
  document.getElementById('latest').innerHTML = ' ' + current.value + ' °C, ' + currentDate;
  document.getElementById('execTime').innerHTML = sensorList[currentSensorIndex].avgExecutionTime + ' ms / exekvering';
  document.getElementById('batteryLife').innerHTML = sensorList[currentSensorIndex].lifeLeft + '/' +
                                                     sensorList[currentSensorIndex].avgBatteryLife + ' h battertid';
  document.getElementById('voltageChange').innerHTML = sensorList[currentSensorIndex].avgVoltageDrop + ' V/mätning > ' +
                                                       sensorList[currentSensorIndex].approximateMeasurements +
                                                       ' mätningar > ' + sensorList[currentSensorIndex].approximateDaysOfOperation +
                                                       ' dagar';
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
  document.getElementById('exec').innerHTML = 'Exekveringstid';
  new Chartist.Line('#temperature', sensorList[currentSensorIndex].tempChartData, tempChartSettings);
  new Chartist.Line('#voltage', sensorList[currentSensorIndex].voltageChartData, voltageChartSettings);
  new Chartist.Line('#signal', sensorList[currentSensorIndex].signalChartData, signalChartSettings);
  new Chartist.Line('#execTimeChart', sensorList[currentSensorIndex].execTimeChartData, execTimeChartSettings);
}

function getStringDate(m) {
  if (m.isBetween(moment().startOf('day'), moment().startOf('day').minute(30))) {
    return m.format('lll');
  } else {
    return m.format('LT');
  }
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

function showExecTimeGraph() {
  var newStyle;
  var element = document.getElementById('execBox');
  element.style.visibility === ('hidden' || '') ? newStyle = 'hidden' : newStyle = 'visible';
  element.style.visibility = newStyle;
}