document.addEventListener('DOMContentLoaded', function() {
  try {
    let app = firebase.app();
    let features = ['auth', 'database', 'messaging', 'storage'].filter(feature => typeof app[feature] === 'function');
    document.getElementById('load').innerHTML = ``;

    firebase.database().ref('/').on('value', snapshot => {
      var data = { labels: [], series: [] };
      var temp = snapshot.val();
      var now = Date.now();
      for (var sensor in temp) {
        var temperature = [];
        var voltage = [];
        for (var date in temp[sensor]) {
          if (now - date > (12*60*60*1000) && temp[sensor].length > 24) {
            continue;
          } else {
            var d = new Date(0);
            d.setUTCMilliseconds(date);
            data.labels.push(d);
            voltage.push(temp[sensor][date].voltage);
            temperature.push(temp[sensor][date].temperature);
            document.getElementById('latest').innerHTML = temp[sensor][date].temperature + ' (' + d + ')';
          }
        }
      }
      data.series.push(temperature);
      data.series.push(voltage);
      console.log(data);
      new Chartist.Line('.ct-chart', data);
    });
  } catch (e) {
    console.error(e);
    document.getElementById('load').innerHTML = 'Error loading the Firebase SDK, check the console.';
  }
});