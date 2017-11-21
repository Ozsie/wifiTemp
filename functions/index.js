const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.addTimeStamp = functions.database.ref('/{sensorId}/{pushId}').onWrite(event => {
  if (event.data.previous.exists()) {
    return null;
  }
  return event.data.ref.parent.child(event.params.pushId).child('time').set(Date.now());
});