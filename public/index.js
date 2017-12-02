var currentSensorIndex = 0;

var sensorList = [];

var settings = {
  axisX: {
    labelInterpolationFnc: function skipLabels(value, index) {
      return index % 3  === 0 ? value : null;
    }
  },
  plugins: [
    Chartist.plugins.tooltip({anchorToPoint: true})
  ]
}

var voltageChartSettings = {
  axisX: settings.axisX,
  low: 2.5,
  high: 4,
  plugins: settings.plugins
};

var signalChartSettings = {
  axisX: settings.axisX,
  low: -90,
  high: -40,
  plugins: settings.plugins
};

var execTimeChartSettings = {
  axisX: settings.axisX,
  low: 3000,
  plugins: settings.plugins
};

var summarize = function(total, num) { return total + num; };

function addOption(sensorId, sensor) {
  var sensorMenu = document.getElementById('sensors');
  var li = document.createElement('li');
  li.classList.add('pure-menu-item');
  li.value = sensorId;
  var a = document.createElement('a');
  a.href = '#';
  a.classList.add('pure-menu-link');
  var optionText = sensor.name;
  if (sensor.currentTemperature) {
    optionText += ', ' + (Math.round(sensor.currentTemperature * 10) / 10) + ' °C';
  }
  a.innerHTML = optionText;
  a.onclick = function() { changeSensor(sensorId); };
  li.appendChild(a);
  sensorMenu.appendChild(li);
}

function clear() {
  var sensorMenu = document.getElementById('sensors');
  while (sensorMenu.hasChildNodes()) {
    sensorMenu.removeChild(sensorMenu.lastChild);
  }
  sensorList = [];
}

function removeOption(sensorId) {
  var sensorMenu = document.getElementById('sensors');
  for(var nodeIndex in sensorMenu.childNodes) {
    var node = sensorMenu.childNodes[nodeIndex];
    if (node.value == sensorId) {
      sensorMenu.removeChild(node);
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
  var mc = new Hammer(document.getElementById('content'));

  mc.on("swipeleft swiperight", function(ev) {
    if (ev.type === 'swipeleft' && currentSensorIndex < sensorList.length - 1) {
      currentSensorIndex++;
      window.localStorage.setItem("currentSensorIndex", currentSensorIndex);
      updateDom();
    }
    if (ev.type === 'swiperight' && currentSensorIndex > 0) {
      currentSensorIndex--;
      window.localStorage.setItem("currentSensorIndex", currentSensorIndex);
      updateDom();
    }
  });
  try {
    let app = firebase.app();
    document.getElementById('load').innerHTML = '';

    firebase.database().ref('/sensors').on('value', snapshot => {
      var sensors = snapshot.val();
      clear();

      for (var sensorId in sensors) {
        addOption(sensorId, sensors[sensorId]);

        firebase.database().ref('/' + sensorId).orderByChild('time').startAt(Date.now() - 4*7*24*60*60*1000).once('value', data => {
          const sensorData = data.val()
          if (!sensorData) {
            removeOption(data.key);
          } else {
            var name = sensors[data.key].name;
            var sensor = {
              id: data.key,
              name: sensors[data.key].name,
              warnings: {},
              medianExecutionTime: sensors[data.key].medianExecutionTime ? sensors[data.key].medianExecutionTime : 0,
              avgVoltageDrop: sensors[data.key].avgVoltageDrop ? sensors[data.key].avgVoltageDrop : 0,
              expectedLifeLeft: sensors[data.key].expectedLifeLeft ? sensors[data.key].expectedLifeLeft : 0,
              measurementsLeft: sensors[data.key].measurementsLeft ? sensors[data.key].measurementsLeft : 0,
              hoursLeft: sensors[data.key].hoursLeft ? sensors[data.key].hoursLeft : 0,
              maxLife: sensors[data.key].maxLife ? sensors[data.key].maxLife : 0
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
  var diff = 0;
  for (id in sensorData) {
    i++;
    var date = sensorData[id].time;
    diff = now - date;
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
    }
  }


  sensor.warnings = checkWarningSigns(i, sensorData, sensorId, currentVoltage, diff);
  settings.low = minTemp - 4;
  settings.high = maxTemp + 2;
  tempChartData.series.push(temperature);
  voltageChartData.series.push(voltage);
  signalChartData.series.push(signal);
  execTimeChartData.series.push(exec);

  return {v: voltageChartData, t: tempChartData, s: signalChartData, e: execTimeChartData};
}

function checkWarningSigns(i, sensorData, sensorId, voltage, diff) {
  var warnings = {};
  // Is this the last data point?
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
  if (current) {
    document.getElementById('latest').innerHTML = current.value + ' °C, ' + currentDate;
  } else {
    document.getElementById('latest').innerHTML = ' n/a';
  }
  document.getElementById('currentSensor').innerHTML = sensorList[currentSensorIndex].name;
  document.getElementById('execTime').innerHTML = sensorList[currentSensorIndex].medianExecutionTime + ' ms / exekvering';
  document.getElementById('voltageChange').innerHTML = sensorList[currentSensorIndex].measurementsLeft + ' mätningar kvar | ' +
                                                       sensorList[currentSensorIndex].hoursLeft + ' h kvar av ' +
                                                       sensorList[currentSensorIndex].maxLife + ' h';
  var batteryWarning = document.getElementById('batteryWarning');
  var reportWarning = document.getElementById('reportWarning');
  if (sensorList[currentSensorIndex].warnings.battery) {
    batteryWarning.classList.remove("hidden");
    batteryWarning.classList.add("visible");
  } else {
    batteryWarning.classList.remove("visible");
    batteryWarning.classList.add("hidden");
  }
  if (sensorList[currentSensorIndex].warnings.noReport) {
    reportWarning.classList.remove("hidden");
    reportWarning.classList.add("visible");
  } else {
    reportWarning.classList.remove("visible");
    reportWarning.classList.add("hidden");
  }
  document.getElementById('temp').innerHTML = 'Temperatur';
  new Chartist.Line('#temperature', sensorList[currentSensorIndex].tempChartData, settings);

  var voltSeries = sensorList[currentSensorIndex].voltageChartData.series[0];
  var currentVoltage = voltSeries[series.length - 1];
  var vPh = sensorList[currentSensorIndex].avgVoltageDrop * 2;
  if (currentVoltage) {
    document.getElementById('volt').innerHTML = 'Spänning: ' + currentVoltage.value + ' V, ' + vPh + ' V/h';
  } else {
    document.getElementById('volt').innerHTML = 'Spänning: n/a, ' + vPh + ' V/h';
  }
  new Chartist.Line('#voltage', sensorList[currentSensorIndex].voltageChartData, voltageChartSettings);

  var signalSeries = sensorList[currentSensorIndex].signalChartData.series[0];
  var currentSignal = signalSeries[series.length - 1];
  if (currentSignal) {
    document.getElementById('sig').innerHTML = 'Signalstyrka: ' + currentSignal.value + ' dBm';
  } else {
    document.getElementById('sig').innerHTML = 'Signalstyrka: n/a';
  }
  new Chartist.Line('#signal', sensorList[currentSensorIndex].signalChartData, signalChartSettings);
}

function getStringDate(m) {
  if (m.isBetween(moment().startOf('day'), moment().startOf('day').minute(30))) {
    return m.format('lll');
  } else {
    return m.format('LT');
  }
}

function changeSensor(selected) {
  for (var index in sensorList) {
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
  if (element.classList.contains('hidden')) {
    element.classList.remove('hidden');
    element.classList.add('visible');
    document.getElementById('exec').innerHTML = 'Exekveringstid';
    new Chartist.Line('#execTimeChart', sensorList[currentSensorIndex].execTimeChartData, execTimeChartSettings);
  } else {
    element.classList.remove('visible');
    element.classList.add('hidden');
  }
}