#include "wifitemp.h"

/** Load WLAN credentials from EEPROM */
void loadCredentials() {
  EEPROM.begin(512);
  EEPROM.get(0, wifiSsid);
  EEPROM.get(0+sizeof(wifiSsid), wifiPassword);
  EEPROM.get(0+sizeof(wifiSsid)+sizeof(wifiPassword), hubIp);
  EEPROM.get(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp), hubPort);
  EEPROM.get(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort), hubUser);
  EEPROM.get(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort)+sizeof(hubUser), hubPassword);
  EEPROM.get(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort)+sizeof(hubUser)+sizeof(hubPassword), hubSecret);
  char ok[2+1];
  EEPROM.get(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort)+sizeof(hubUser)+sizeof(hubPassword)+sizeof(hubSecret), ok);
  EEPROM.end();
  if (String(ok) != String("OK")) {
    Serial.println("Recovery not OK or nothing stored yet.");
    wifiSsid[0] = 0;
    wifiPassword[0] = 0;
    hubIp[0] = 0;
    hubUser[0] = 0;
    hubPassword[0] = 0;
    hubSecret[0] = 0;
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
    Serial.print("Hub user: ");
    Serial.println(hubUser);
    Serial.print("Hub password: ");
    Serial.println(strlen(hubPassword)>0?"********":"<no password>");
    Serial.print("Hub secret: ");
    Serial.println(strlen(hubSecret)>0?"********":"<no password>");
  }
}

/** Store WLAN credentials to EEPROM */
void saveCredentials() {
  EEPROM.begin(512);
  EEPROM.put(0, wifiSsid);
  EEPROM.put(0+sizeof(wifiSsid), wifiPassword);
  EEPROM.put(0+sizeof(wifiSsid)+sizeof(wifiPassword), hubIp);
  EEPROM.put(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp), hubPort);
  EEPROM.put(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort), hubUser);
  EEPROM.put(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort)+sizeof(hubUser), hubPassword);
  EEPROM.put(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort)+sizeof(hubUser)+sizeof(hubPassword), hubSecret);
  char ok[2+1] = "OK";
  EEPROM.put(0+sizeof(wifiSsid)+sizeof(wifiPassword)+sizeof(hubIp)+sizeof(hubPort)+sizeof(hubUser)+sizeof(hubPassword)+sizeof(hubSecret), ok);
  bool commited = EEPROM.commit();
  EEPROM.end();
  Serial.print("Commit result: ");
  Serial.println(commited);
}

