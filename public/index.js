document.addEventListener('DOMContentLoaded', function() {
  try {
    let app = firebase.app();
    let features = ['auth', 'database', 'messaging', 'storage'].filter(feature => typeof app[feature] === 'function');
    document.getElementById('load').innerHTML = ``;

    firebase.database().ref('/').on('value', snapshot => {
      var tempChartData = { labels: [], series: [] };
      var voltageChartData = { labels: [], series: [] };
      var temp = snapshot.val();
      var now = Date.now();
      var sensorList = [];
      for (var sensorId in temp) {
        if (sensorId === 'names') {
          continue;
        }
        var sensor = {id: sensorId, name: temp.names[sensorId].name, warnings: {}};
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
            var d = new Date(0);
            d.setUTCMilliseconds(date);
            tempChartData.labels.push(d);
            voltageChartData.labels.push(d);
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
      var series = sensorList[0].tempChartData.series[0];
      var current = series[series.length - 1];
      var labels = sensorList[0].tempChartData.labels;
      var currentDate = labels[labels.length - 1];
      document.getElementById('latest').innerHTML = sensorList[0].name + ': ' + current + ' °C (' + d + ')';
      if (sensorList[0].warnings.battery) {
        document.getElementById('batteryWarning').innerHTML = sensorList[0].name + ' behöver laddas.';
      } else {
        document.getElementById('batteryWarning').innerHTML = '';
      }
      if (sensorList[0].warnings.noReport) {
        document.getElementById('reportWarning').innerHTML = sensorList[0].name + ' har inte rapporterat i tid.';
      } else {
        document.getElementById('reportWarning').innerHTML = '';
      }
      document.getElementById('temp').innerHTML = 'Temperatur';
      document.getElementById('volt').innerHTML = 'Spänning';
      new Chartist.Line('#temperature', sensorList[0].tempChartData);
      new Chartist.Line('#voltage', sensorList[0].voltageChartData);
    });
  } catch (e) {
    console.error(e);
    document.getElementById('load').innerHTML = 'Error loading the Firebase SDK, check the console.';
  }
});