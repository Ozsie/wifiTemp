var {email, password, config} = require('./settings.js');

var express = require('express');
var bodyParser = require('body-parser');
var firebase = require('firebase');

firebase.initializeApp(config);
var database;

firebase.auth().signInWithEmailAndPassword(email, password).then(function() {
  console.log('Signed in as ' + email);
  database = firebase.database();

  var app = express();
  app.use(bodyParser.json());

  app.get('/', function(req, res) {
    var id = req.query.id;
    var voltage = req.query.v/1024;
    var temperature = req.query.t;
    var signal = req.query.s;
    console.log('Got data from ' + id + ': ' + voltage + ' V, ' + temperature + ' C, ' + signal + 'dB');
    storeMeasurement(id, voltage, temperature, signal, function(error) {
      if (!error) {
        console.log('Measurement stored');
      } else {
        console.error(error.code + ': ' + error.message);
      }
    });
    res.status(200).send('blipp');
  });


  app.listen(8080);

  console.log('Listening on port 8080');
}).catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  console.error(errorCode + ': ' + errorMessage);
  process.exit(errorCode);
});

var storeMeasurement = function(id, voltage, temperature, signal, callback) {
  var date = Date.now();
  database.ref(id + '/' + date).set({
    voltage: voltage,
    temperature: temperature,
    signal: signal
  }).then(callback).catch(callback);
};