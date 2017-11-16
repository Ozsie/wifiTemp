#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <Base64.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <EEPROM.h>

ESP8266WebServer server(80);

#define ONE_WIRE_BUS 2  // DS18B20 pin
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature DS18B20(&oneWire);

ADC_MODE(ADC_VCC);

const int sleepTimeS = 1800;
const int retrySleepTimeS = 60;

char wifiSsid[32] = "";
char wifiPassword[32] = "";
char hubIp[32] = "";
uint16_t hubPort;

void setup() {
  Serial.begin(115200);

  Serial.print("EEPROM size required: ");
  Serial.println(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort)+sizeof("OK"));

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
  } else if (WiFi.status() != WL_CONNECTED){
    wifiConnect();
  } else {
    uint16_t attempts = 0;
    float temp;
    do {
      DS18B20.requestTemperatures(); 
      temp = DS18B20.getTempCByIndex(0);
      Serial.print("Temperature: ");
      Serial.println(temp);
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
  Serial.println("Restarting"):
  ESP.restart();
}

void sendTemperature(float temp) {  
  WiFiClient client;

  uint16_t attempts = 0;
   
  while(!client.connect(hubIp, hubPort) && attempts < 4) {
    Serial.println("connection failed");
    wifiConnect(); 
    attempts++;
  }

  if (attempts == 4) {
    Serial.println("Failed to send temperature");
  } else {
    String url = "/?id=" + String(ESP.getChipId()) + "&v=" + String(ESP.getVcc()) + "&t=" + String(temp);
  
    Serial.print("POST data to URL: ");
    Serial.println(url);
    
    client.println(String("GET ") + url + " HTTP/1.1");
    client.println();
    unsigned long timeout = millis();
    
    while (client.available() == 0) {
      if (millis() - timeout > 5000) {
        Serial.println(">>> Client Timeout !");
        client.stop();
        return;
      }
    }
    
    // Read all the lines of the reply from server and print them to Serial
    while(client.available()){
      String line = client.readStringUntil('\r');
      if (line == "reset") {
        Serial.print("Reset received");
        //reset();
      }
    }
  }
}
