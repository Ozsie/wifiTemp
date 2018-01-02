#include "wifitemp.h"

ADC_MODE(ADC_VCC);

void setup() {
  start = millis();
  Serial.begin(115200);

  Serial.println("");
  Serial.print("EEPROM size required: ");
  Serial.println(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort)+sizeof(hubUser)+sizeof(hubPassword)+sizeof(hubSecret)+sizeof("OK"));

  //saveCredentials();
  loadCredentials();
  if (strlen(wifiPassword) == 0 || strlen(wifiSsid) == 0 ||
      strlen(hubIp) == 0 || hubPort == NULL) {
    setupServer();
  }
}

void loop() {
  if (strlen(wifiPassword) == 0 || strlen(wifiSsid) == 0 ||
      strlen(hubIp) == 0 || hubPort == NULL) {
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
  Serial.print("Connecting to AP");
  WiFi.disconnect();
  WiFi.begin(wifiSsid, wifiPassword);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected");  
}

void reset() {
  Serial.println("Resetting credentials");
  char wifiSsid[32] = "";
  char wifiPassword[32] = "";
  char hubIp[32] = "";
  uint16_t hubPort = NULL;
  saveCredentials();
  Serial.println("Restarting");
  ESP.restart();
}

