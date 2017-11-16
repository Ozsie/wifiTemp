/** Load WLAN credentials from EEPROM */
void loadCredentials() {
  EEPROM.begin(512);
  EEPROM.get(0, wifiSsid);
  EEPROM.get(0+sizeof(wifiSsid), wifiPassword);
  EEPROM.get(0+sizeof(wifiSsid)+sizeof(wifiPassword), hubIp);
  EEPROM.get(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp), hubPort);
  char ok[2+1];
  EEPROM.get(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort), ok);
  EEPROM.end();
  if (String(ok) != String("OK")) {
    Serial.println("Recovery not OK or nothing stored yet.");
    wifiSsid[0] = 0;
    wifiPassword[0] = 0;
    hubIp[0] = 0;
    hubPort = NULL;
  } else {
    Serial.println("Recovered credentials");
    Serial.print("SSID: ");
    Serial.println(wifiSsid);
    Serial.print("Password: ");
    Serial.println(strlen(wifiPassword)>0?"********":"<no password>");
    Serial.print("Hub IP: ");
    Serial.println(hubIp);
    Serial.print("Hub port: ");
    Serial.println(hubPort);
  }
}

/** Store WLAN credentials to EEPROM */
void saveCredentials() {
  EEPROM.begin(512);
  EEPROM.put(0, wifiSsid);
  EEPROM.put(0+sizeof(wifiSsid), wifiPassword);
  EEPROM.put(0+sizeof(wifiSsid)+sizeof(wifiPassword), hubIp);
  EEPROM.put(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp), hubPort);
  char ok[2+1] = "OK";
  EEPROM.put(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort), ok);
  EEPROM.commit();
  EEPROM.end();
}
