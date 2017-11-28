const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

var summarize = function(total, num) {
  if (isNaN(num)) {
    return total;
  }
  return total + num;
};

var calculateLifeLeft = function(batteryLife, maxDate) {
  var sum = batteryLife.reduce(summarize);
  var lifeMillis = sum / batteryLife.length;
  return lifeMillis - Math.round((Date.now() - maxDate) * 10) / 10;
};

var calculateAverageBatteryLife = function(batteryLife) {
  var sum = batteryLife.reduce(summarize);
  return Math.round((sum / batteryLife.length) * 10) / 10;
};

var convertVoltage = function(event) {
  return event.data.ref.child('voltage').once('value').then(function(snapshot) {
    var voltage = snapshot.val();
    return event.data.ref.child('voltage').set(voltage / 1024);
  });
};

var addTimeStamp = function(event) {
  return event.data.ref.parent.child(event.params.pushId).child('time').set(Date.now());
};

var calculateMedianExecutionTime = function(sensorId) {
  return admin.database().ref('/' + sensorId).orderByChild('time').startAt(Date.now() - 1*7*24*60*60*1000).once('value').then(function(snapshot) {
    var execTimes = [];
    const sensorData = snapshot.val();
    for (var id in sensorData) {
      execTimes.push(sensorData[id].runtime);
    }
    execTimes.sort((a, b) => a - b);
    var lowMiddle = Math.floor((execTimes.length - 1) / 2);
    var highMiddle = Math.ceil((execTimes.length - 1) / 2);
    var medianExecutionTime = (execTimes[lowMiddle] + execTimes[highMiddle]) / 2;
    return admin.database().ref('/sensors/' + sensorId).child('medianExecutionTime').set(medianExecutionTime).then(function() {
      return admin.database().ref('/sensors/' + sensorId).child('medianExecutionTimeDataPoints').set(execTimes.length);
    });
  });
};

var calculateAverageVoltageDrop = function(sensorId) {
  return admin.database().ref('/' + sensorId).orderByChild('time').startAt(Date.now() - 4*24*60*60*1000).once('value').then(function(snapshot) {
    var previousVoltage = 0;
    var voltageDrops = [];
    const sensorData = snapshot.val();
    for (id in sensorData) {
      var currentVoltage = sensorData[id].voltage;
      if (previousVoltage > 0 && Math.abs(previousVoltage - currentVoltage) < 0.1) {
        voltageDrops.push(previousVoltage - currentVoltage);
      }
      previousVoltage = currentVoltage;
    }
    var avgVoltageDrop = 0;
    if (voltageDrops.length > 0) {
      avgVoltageDrop = Math.round((voltageDrops.reduce(summarize) / voltageDrops.length) * 10000) / 10000;
    }
    return admin.database().ref('/sensors/' + sensorId).child('avgVoltageDrop').set(avgVoltageDrop).then(function() {
      return admin.database().ref('/sensors/' + sensorId).child('avgVoltageDropDataPoints').set(voltageDrops.length);
    });
  });
};

var calculateBatteryLife = function(sensorId) {

  return admin.database().ref('/' + sensorId).orderByChild('time').once('value').then(function(snapshot) {
    const sensorData = snapshot.val();
    var maxVoltage = 0;
    var maxDate;
    var minVoltage = 2.9;
    var minDate
    var batteryLife = [];

    for (id in sensorData) {
      if (sensorData[id].voltage > maxVoltage) {
        maxVoltage = sensorData[id].voltage;
        maxDate = sensorData[id].time;
        minVoltage = 2.9;
      }
      if (sensorData[id].voltage <= minVoltage) {
        minVoltage = sensorData[id].voltage;
        minDate = sensorData[id].time;
      }

      if (maxVoltage !== 0 && minVoltage !== 2.9) {
        if (minDate && maxDate) {
          batteryLife.push(minDate - maxDate);
        }
        maxVoltage = 0;
      }
    }

    var lifeLeft = 0;
    var avgBatteryLife = 0;

    if (batteryLife.length > 0) {
      if (minVoltage === 2.9) { // Current charge still has life left
        lifeLeft = calculateLifeLeft(batteryLife, maxDate);
      }
      avgBatteryLife = calculateAverageBatteryLife(batteryLife);
    }
    if (isNaN(lifeLeft)) { lifeLeft = 0; }
    if (isNaN(avgBatteryLife)) { avgBatteryLife = 0; }

    return admin.database().ref('/sensors/' + sensorId).child('expectedLifeLeft').set(lifeLeft).then(function() {
      return admin.database().ref('/sensors/' + sensorId).child('avgBatteryLife').set(avgBatteryLife).then(function() {
        return admin.database().ref('/sensors/' + sensorId).child('batteryLifeDataPoints').set(batteryLife.length);
      });
    });
  });
};

exports.addMoreData = functions.database.ref('/{sensorId}/{pushId}').onWrite(event => {
  if (event.data.previous.exists()) {
    return null;
  }
  return addTimeStamp(event).then(function() {
    convertVoltage(event);
  }).then(function() {
    calculateMedianExecutionTime(event.params.sensorId);
  }).then(function() {
    calculateAverageVoltageDrop(event.params.sensorId);
  }).then(function() {
    calculateBatteryLife(event.params.sensorId);
  });
});