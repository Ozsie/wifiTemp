#include "wifitemp.h"

ADC_MODE(ADC_VCC);

bool isConfigured() {
  return (strlen(conf.wifiPassword) != 0 && strlen(conf.wifiSsid) != 0 &&
          strlen(conf.hubIp) != 0 && conf.hubPort != NULL &&
          strlen(conf.hubUser) != 0 && strlen(conf.hubPassword) != 0 &&
          strlen(conf.hubSecret) != 0);
}

void setup() {
  start = millis();
  Serial.begin(115200);

  Serial.println("");
  Serial.print("EEPROM size required: ");
  Serial.println(0+sizeof(conf)+sizeof("OK"));

  pinMode(14, INPUT);
  int buttonState = digitalRead(14);
  if (buttonState == LOW) {
    Serial.print("Pin 14 is LOW, resetting EEPROM");
    storeEeprom();
  }

  loadEeprom();
  if (!isConfigured()) {
    setupServer();
  }
}

void loop() {
  if (!isConfigured()) {
    server.handleClient();
  } else if (WiFi.status() != WL_CONNECTED) {
    wifiConnect();
  } else {
    uint16_t attempts = 0;
    float temp;
    do {
      DS18B20.requestTemperatures(); 
      temp = DS18B20.getTempCByIndex(0);
      Serial.print("Temperature: ");
      Serial.println(temp);
      delay(100);
      attempts++;
    } while ((temp > 80.0 || temp == (-127.0)) && attempts < 4);

    if (attempts == 4 && (temp > 80.0 || temp == (-127.0))) {
      Serial.println("Could not read temperature");
      if (temp == (-127.0)) {
        Serial.println("Could not communicate with sensor");
      }
      Serial.println("Sleeping for one minute before retrying");
      ESP.deepSleep(retrySleepTimeS * 1000000);
    } else {
      sendTemperature(temp);
      Serial.println("ESP8266 in sleep mode");
      ESP.deepSleep(sleepTimeS * 1000000);
    }
  }
}

void wifiConnect() {
  Serial.print("Connecting to AP ");
  Serial.print(conf.wifiSsid);
  WiFi.disconnect();
  WiFi.begin(conf.wifiSsid, conf.wifiPassword);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected");  
}
