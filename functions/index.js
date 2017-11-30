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
  return admin.database().ref('/' + sensorId).orderByChild('time').once('value').then(function(snapshot) {
    var previousVoltage = 0;
    var voltageDrops = [];
    var currentVoltage = 0;
    var maxVoltage = 0;
    var minVoltage = 5;
    var chargeDate = 0;
    var currentTemperature = 0;
    const sensorData = snapshot.val();
    for (id in sensorData) {
      currentVoltage = sensorData[id].voltage;
      currentTemperature = sensorData[id].temperature;
      if (currentVoltage > 5) {
        continue;
      }
      var diff = previousVoltage - currentVoltage;
      // After charge this should happen
      if (diff < -0.5) {
         chargeDate = sensorData[id].time;
      }
      if (previousVoltage > 0 && diff > 0 && diff < 1) {
        voltageDrops.push(diff);
      }
      if (currentVoltage > maxVoltage) {
        maxVoltage = currentVoltage;
      }
      if (currentVoltage < minVoltage) {
        minVoltage = currentVoltage;
      }
      previousVoltage = currentVoltage;
    }
    return admin.database().ref('/sensors/' + sensorId).child('maxVoltage').set(maxVoltage).then(function() {
      if (voltageDrops.length > 2) {
        voltageDrops.sort((a, b) => a - b);
        var avgVoltageDrop = Math.round((voltageDrops.reduce(summarize) / voltageDrops.length) * 10000) / 10000;
        var voltsLeft = currentVoltage - minVoltage;
        var measurementsLeft = 0;
        var hoursLeft = 0;
        if (voltsLeft > 0) {
          measurementsLeft = Math.floor(voltsLeft / avgVoltageDrop);
          hoursLeft = Math.round((measurementsLeft / 2) * 10) / 10;
        }
        var maxLife = Math.round((((Date.now() - chargeDate) / 3600000) + hoursLeft) * 10) / 10;

        return admin.database().ref('/sensors/' + sensorId).child('avgVoltageDrop').set(avgVoltageDrop).then(function() {
          admin.database().ref('/sensors/' + sensorId).child('currentVoltage').set(currentVoltage);
        }).then(function() {
          admin.database().ref('/sensors/' + sensorId).child('voltsLeft').set(voltsLeft);
        }).then(function() {
          admin.database().ref('/sensors/' + sensorId).child('measurementsLeft').set(measurementsLeft);
        }).then(function() {
          admin.database().ref('/sensors/' + sensorId).child('hoursLeft').set(hoursLeft);
        }).then(function() {
          admin.database().ref('/sensors/' + sensorId).child('minVoltage').set(minVoltage);
        }).then(function() {
          admin.database().ref('/sensors/' + sensorId).child('chargeDate').set(chargeDate);
        }).then(function() {
          admin.database().ref('/sensors/' + sensorId).child('maxLife').set(maxLife);
        }).then(function() {
          admin.database().ref('/sensors/' + sensorId).child('currentTemperature').set(currentTemperature);
        });
      }
    });
  });
};

exports.addMoreData = functions.database.ref('/{sensorId}/{pushId}').onWrite(event => {
  if (event.data.previous.exists()) {
    return null;
  }
  return addTimeStamp(event).then(function() {
    return convertVoltage(event).then(function() {
      calculateMedianExecutionTime(event.params.sensorId);
      calculateAverageVoltageDrop(event.params.sensorId);
    });
  });
});