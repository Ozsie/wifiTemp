#include "wifitemp.h"

void handleRoot() {
  server.send(200, "text/html", "<h1>Hello</h1>");
}

void handleConfig() {
  handleStringConfig("ssid").toCharArray(conf.wifiSsid, sizeof(conf.wifiSsid) - 1);
  handleStringConfig("password").toCharArray(conf.wifiPassword, sizeof(conf.wifiPassword) - 1);
  conf.hubPort = handleIntConfig("port");
  handleStringConfig("ip").toCharArray(conf.hubIp, sizeof(conf.hubIp) - 1);
  handleStringConfig("hubUser").toCharArray(conf.hubUser, sizeof(conf.hubUser) - 1);
  handleStringConfig("hubPassword").toCharArray(conf.hubPassword, sizeof(conf.hubPassword) - 1);
  handleStringConfig("hubSecret").toCharArray(conf.hubSecret, sizeof(conf.hubSecret) - 1);
  server.send(200, "text/html", "<h1>OK!</h1>");
  storeEeprom();
}

String handleStringConfig(String param) {
  if (server.arg(param) == "") {
    server.send(200, "text/html", "<h1>Missing parameter: " + param + "</h1>");
    return "";
  } else {
    return server.arg(param);
  }
}

int handleIntConfig(String param) {
  if (server.arg(param) == "") {
    server.send(200, "text/html", "<h1>Missing parameter: " + param + "</h1>");
    return NULL;
  } else {
    return server.arg("port").toInt();
  }
}

void setupServer() {
  delay(1000);
  
  Serial.println();
  
  Serial.print("Configuring access point...");

  const char *ssid = "wifi-temp";
  const char *password = "wifi-temp";
  
  WiFi.softAP(ssid, password);
  IPAddress myIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(myIP);
  Serial.print("Sensor ID: ");
  Serial.println(ESP.getChipId());
  Serial.println("HTTP server started. Configure with below HTTP request.");
  Serial.print("GET ");
  Serial.print(myIP);
  Serial.println("/?ssid=<SSID>&password=<PASSWORD>&ip=<IP>&port=<PORT>&hubUser=<HUB_USER>&hubPassword=<HUB_PASSWORD>&hubSecret=<HUB_SECRET>");
  
  server.on("/", handleConfig);
  server.begin();
}

