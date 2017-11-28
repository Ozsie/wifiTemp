var currentSensorIndex = 0;

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

function addOption(sensorId, sensor) {
  var sensorSelectBox = document.getElementById('sensors');
  var option = document.createElement('option');
  option.text = sensor.name;
  option.value = sensorId;
  sensorSelectBox.add(option);
}

function clear() {
  var sensorSelectBox = document.getElementById('sensors');
  for(var i = sensorSelectBox.options.length - 1; i >= 0; i--) {
    sensorSelectBox.remove(i);
  }
  sensorList = [];
}

function removeOption(sensorId) {
  var sensorSelectBox = document.getElementById('sensors');
  for(var i = sensorSelectBox.options.length - 1; i >= 0; i--) {
    if (sensorSelectBox.options[i].value === sensorId) {
      sensorSelectBox.remove(i);
      break;
    }
  }
}

function selectCorrectOption() {
  if (window.localStorage.getItem("currentSensorIndex")) {
    currentSensorIndex = window.localStorage.getItem("currentSensorIndex");

    if (currentSensorIndex > sensorList.length - 1) {
      currentSensorIndex = sensorList.length - 1;
    }
    var sensorSelectBox = document.getElementById('sensors');
    sensorSelectBox.value = sensorList[currentSensorIndex].id
  }
}

document.addEventListener('DOMContentLoaded', function() {
  try {
    let app = firebase.app();
    document.getElementById('load').innerHTML = '';

    firebase.database().ref('/sensors').on('value', snapshot => {
      var sensors = snapshot.val();
      clear();

      for (var sensorId in sensors) {
        addOption(sensorId, sensors[sensorId]);

        firebase.database().ref('/' + sensorId).orderByChild('time').startAt(Date.now() - 4*7*24*60*60*1000).on('value', data => {
          const sensorData = data.val()
          if (!sensorData) {
            removeOption(data.key);
          } else {
            var name = sensors[data.key].name;
            var sensor = {
              id: data.key,
              name: sensors[data.key].name,
              warnings: {},
              medianExecutionTime: sensors[data.key].medianExecutionTime,
              avgVoltageDrop: sensors[data.key].avgVoltageDrop,
              avgBatteryLife: sensors[data.key].avgBatteryLife,
              expectedLifeLeft: sensors[data.key].expectedLifeLeft
            };

            chartData = buildArrays(sensorData, data.key, sensor, (12*60*60*1000));
            var attempts = 1;
            while (chartData.t.series[0].length === 0 && attempts <= 5) {
              chartData = buildArrays(sensorData, data.key, sensor, ((12 + (attempts * 2))*60*60*1000))
              attempts++;
            }
            sensor.tempChartData = chartData.t;
            sensor.voltageChartData = chartData.v;
            sensor.signalChartData = chartData.s;
            sensor.execTimeChartData = chartData.e;
            sensorList.push(sensor);

            selectCorrectOption();
            updateDom();
          }
        });
      }
    });
  } catch (e) {
    console.error(e);
    document.getElementById('load').innerHTML = 'Error loading the Firebase SDK, check the console.';
  }
});

function buildArrays(sensorData, sensorId, sensor, timeLimit) {
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
  var maxVoltage = 0;
  var minTemp = 100;
  var maxTemp = -100;
  for (id in sensorData) {
    i++;
    var date = sensorData[id].time;
    var diff = now - date;
    var currentVoltage = sensorData[id].voltage;
    var currentSignal = sensorData[id].signal;
    var currentTemperature = sensorData[id].temperature;
    var currentExecTime = sensorData[id].runtime;

    if (currentVoltage > maxVoltage) {
      maxVoltage = currentVoltage;
    }

    if (diff > timeLimit && Object.keys(sensorData).length > 10) {
      continue;
    } else {
      var m = moment(date, "x");
      moment.locale();
      if (!m.isValid()) {
        continue;
      }
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

      sensor.warnings = checkWarningSigns(i, sensorData, sensorId, diff);
    }
  }
  sensor.approximateMeasurements = Math.round(((maxVoltage - 3) / sensor.avgVoltageDrop) * 10) / 10;
  sensor.approximateDaysOfOperation = Math.round((sensor.approximateMeasurements / 48) * 10) / 10;

  tempChartSettings.low = minTemp - 4;
  tempChartSettings.high = maxTemp + 2;
  tempChartData.series.push(temperature);
  voltageChartData.series.push(voltage);
  signalChartData.series.push(signal);
  execTimeChartData.series.push(exec);

  return {v: voltageChartData, t: tempChartData, s: signalChartData, e: execTimeChartData};
}

function checkWarningSigns(i, sensorData, sensorId, diff) {
  var warnings = {};
  if (i == Object.keys(sensorData).length - 1) {
    if (voltage < 3.0) {
      warnings.battery = true;
    }
    if (diff> 60*60*1000) {
      warnings.noReport = true;
    }
  }

  return warnings;
}

function updateDom() {
  var series = sensorList[currentSensorIndex].tempChartData.series[0];
  var current = series[series.length - 1];
  var labels = sensorList[currentSensorIndex].tempChartData.labels;
  var currentDate = labels[labels.length - 1];
  var avgBatteryLife = Math.round((sensorList[currentSensorIndex].avgBatteryLife / 3600000) * 1000) / 1000;
  var expectedLifeLeft = Math.round((sensorList[currentSensorIndex].expectedLifeLeft / 3600000) * 1000) / 1000;
  document.getElementById('latest').innerHTML = ' ' + current.value + ' °C, ' + currentDate;
  document.getElementById('execTime').innerHTML = sensorList[currentSensorIndex].medianExecutionTime + ' ms / exekvering';
  document.getElementById('batteryLife').innerHTML = expectedLifeLeft + '/' + avgBatteryLife + ' h battertid';
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