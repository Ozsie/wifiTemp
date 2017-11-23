const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.dataConverter = functions.database.ref('/{sensorId}/{pushId}').onWrite(event => {
  if (event.data.previous.exists()) {
    return null;
  }

  return event.data.ref.parent.child(event.params.pushId).child('time').set(Date.now()).then(function() {
    return event.data.ref.child('voltage').once('value').then(function(snapshot) {
      var voltage = snapshot.val();
      if (voltage >= 1024) {
        voltage = voltage / 1024;
      }
      return event.data.ref.child('voltage').set(voltage);
    });
  });
});