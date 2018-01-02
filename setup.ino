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

  if (server.arg("hubUser") == "") {
    server.send(200, "text/html", "<h1>Hub user missing</h1>");
    return;
  } else {
    server.arg("hubUser").toCharArray(hubUser, sizeof(hubUser) - 1);
  }

  if (server.arg("hubPassword") == "") {
    server.send(200, "text/html", "<h1>Hub password missing</h1>");
    return;
  } else {
    server.arg("hubPassword").toCharArray(hubPassword, sizeof(hubPassword) - 1);
  }

  if (server.arg("hubSecret") == "") {
    server.send(200, "text/html", "<h1>Hub secret missing</h1>");
    return;
  } else {
    server.arg("hubSecret").toCharArray(hubSecret, sizeof(hubSecret) - 1);
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
  Serial.print("Sensor ID: ");
  Serial.println(ESP.getChipId());
  Serial.println("HTTP server started. Configure with below HTTP request.");
  Serial.print("GET ");
  Serial.print(myIP);
  Serial.println("/?ssid=<SSID>&password=<PASSWORD>&ip=<IP>&port=<PORT>&hubUser=<HUB_USER>&hubPassword=<HUB_PASSWORD>&hubSecret=<HUB_SECRET>");
  server.on("/", handleRoot);
  server.begin();
}

