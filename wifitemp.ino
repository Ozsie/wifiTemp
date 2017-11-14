#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <Base64.h>
#include <OneWire.h>
#include <DallasTemperature.h>

ESP8266WebServer server(80);

//AP definitions
#define AP_SSID "Hastur"
#define AP_PASSWORD "metalhammer"

#define ONE_WIRE_BUS 2  // DS18B20 pin
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature DS18B20(&oneWire);

const int sleepTimeS = 1800;

String wifiSsid;
String wifiPassword;
String hubIp;
uint16_t hubPort;

void setup() {
  Serial.begin(115200);

  setupServer();
}

void loop() {

  if (wifiSsid == NULL || wifiPassword == NULL ||
      hubIp == NULL || hubPort == NULL) {
    server.handleClient();
  } else if (WiFi.status() != WL_CONNECTED){
    wifiConnect();
  } else {
    float temp;
    do {
      DS18B20.requestTemperatures(); 
      temp = DS18B20.getTempCByIndex(0);
      Serial.print("Temperature: ");
      Serial.println(temp);
    } while (temp == 85.0 || temp == (-127.0));
    
    sendTemperature(temp);
    Serial.println("ESP8266 in sleep mode");
    ESP.deepSleep(sleepTimeS * 1000000);
  }
}

void wifiConnect() {
  Serial.print("Connecting to AP");
  WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected");  
}

void sendTemperature(float temp) {  
  WiFiClient client;
   
  while(!client.connect(hubIp.c_str(), hubPort)) {
    Serial.println("connection failed");
    wifiConnect(); 
  }
 
  String url = "/?id=" + String(ESP.getChipId()) + "&v=" + String(ESP.getVcc()) + "&t=" + String(temp);

  Serial.print("POST data to URL: ");
  Serial.println(url);
  
  client.println(String("GET ") + url + " HTTP/1.1");
  client.println();
}
