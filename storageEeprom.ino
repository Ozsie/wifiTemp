#include "wifitemp.h"

/** Load WLAN credentials from EEPROM */
void loadEeprom() {
  EEPROM.begin(512);
  EEPROM.get(0, conf);
  char ok[2+1];
  EEPROM.get(0+sizeof(conf), ok);
  EEPROM.end();
  if (String(ok) != String("OK")) {
    Serial.println("Recovery not OK or nothing stored yet.");
    conf.wifiSsid[0] = 0;
    conf.wifiPassword[0] = 0;
    conf.hubIp[0] = 0;
    conf.hubUser[0] = 0;
    conf.hubPassword[0] = 0;
    conf.hubSecret[0] = 0;
    conf.hubPort = NULL;
  } else {
    Serial.println("Recovered credentials");
    Serial.print("SSID: ");
    Serial.println(conf.wifiSsid);
    Serial.print("Password: ");
    Serial.println(strlen(conf.wifiPassword)>0?"********":"<no password>");
    Serial.print("Hub IP: ");
    Serial.println(conf.hubIp);
    Serial.print("Hub port: ");
    Serial.println(conf.hubPort);
    Serial.print("Hub user: ");
    Serial.println(conf.hubUser);
    Serial.print("Hub password: ");
    Serial.println(strlen(conf.hubPassword)>0?"********":"<no password>");
    Serial.print("Hub secret: ");
    Serial.println(strlen(conf.hubSecret)>0?"********":"<no password>");
  }
}

/** Store WLAN credentials to EEPROM */
void storeEeprom() {
  EEPROM.begin(512);
  EEPROM.put(0, conf);
  char ok[2+1] = "OK";
  EEPROM.put(0+sizeof(conf), ok);
  bool commited = EEPROM.commit();
  EEPROM.end();
  Serial.print("Commit result: ");
  Serial.println(commited);
}

