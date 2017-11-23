#include <WiFiClient.h><
#ifndef WIFI_TEMP
#define WIFI_TEMP

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

const int sleepTimeS = 1800;
const int retrySleepTimeS = 60;

unsigned long start;

char wifiSsid[32] = "";
char wifiPassword[32] = "";
char hubIp[32] = "";
uint16_t hubPort;
#endif
