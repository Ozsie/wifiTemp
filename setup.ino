#include "wifitemp.h"

void handleRoot() {
  if (server.arg("ssid") == "") {
    server.send(200, "text/html", "<h1>SSID missing</h1>");
    return;
  } else {
    server.arg("ssid").toCharArray(wifiSsid, sizeof(wifiSsid) - 1);
  }

  if (server.arg("password") == "") {
    server.send(200, "text/html", "<h1>Password missing</h1>");
    return;
  } else {
    server.arg("password").toCharArray(wifiPassword, sizeof(wifiPassword) - 1);
  }

  if (server.arg("ip") == "") {
    server.send(200, "text/html", "<h1>IP missing</h1>");
    return;
  } else {
    server.arg("ip").toCharArray(hubIp, sizeof(hubIp) - 1);
  }

  if (server.arg("port") == "") {
    server.send(200, "text/html", "<h1>Port missing</h1>");
    return;
  } else {
    hubPort = server.arg("port").toInt();
  }
  server.send(200, "text/html", "<h1>OK!</h1>");
  saveCredentials();
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
  server.on("/", handleRoot);
  server.begin();
  Serial.println("HTTP server started");
}
