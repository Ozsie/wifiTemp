const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

var summarize = function(total, num) { return total + num; };

var convertVoltage = function(event) {
  return event.data.ref.child('voltage').once('value').then(function(snapshot) {
    var voltage = snapshot.val();
    return event.data.ref.child('voltage').set(voltage / 1024);
  });
};

var addTimeStamp = function(event) {
  return event.data.ref.parent.child(event.params.pushId).child('time').set(Date.now());
};

var calculateAverageExecutionTime = function(sensorId) {
  return admin.database().ref('/' + sensorId).orderByChild('time').startAt(Date.now() - 1*7*24*60*60*1000).once('value').then(function(snapshot) {
    var execTimes = [];
    const sensorData = snapshot.val();
    for (var id in sensorData) {
      execTimes.push(sensorData[id].runtime);
    }
    var avgExecutionTime = Math.round((execTimes.reduce(summarize) / execTimes.length) * 10) / 10;
    return admin.database().ref('/sensors/' + sensorId).child('avgExecutionTime').set(avgExecutionTime).then(function() {
      return admin.database().ref('/sensors/' + sensorId).child('avgExecutionTimeDataPoints').set(execTimes.length);
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
    console.log("Voltage drop", voltageDrops.length, voltageDrops);
    var avgVoltageDrop = 0;
    if (voltageDrops.length > 0) {
      avgVoltageDrop = Math.round((voltageDrops.reduce(summarize) / voltageDrops.length) * 10000) / 10000;
    }
    return admin.database().ref('/sensors/' + sensorId).child('avgVoltageDrop').set(avgVoltageDrop).then(function() {
      return admin.database().ref('/sensors/' + sensorId).child('avgVoltageDropDataPoints').set(voltageDrops.length);
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
    calculateAverageExecutionTime(event.params.sensorId);
  }).then(function() {
    calculateAverageVoltageDrop(event.params.sensorId);
  });
});