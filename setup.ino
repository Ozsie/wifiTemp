void handleRoot() {
  server.send(200, "text/html", "<h1>You are connected</h1>");
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
