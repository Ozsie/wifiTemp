#include "wifitemp.h"

String signIn() {
  WiFiClientSecure client;

  uint16_t attempts = 0;
  while(!client.connect("www.googleapis.com", 443) && attempts < 4) {
    Serial.println("connection failed");
    wifiConnect(); 
    attempts++;
  }

  if (attempts == 4) {
    Serial.println("Failed to send temperature");
  } else {
    Serial.println("Signing in");
    String signInUrl = "/identitytoolkit/v3/relyingparty/verifyPassword?key=" + String(conf.hubSecret);
    
    String payload = "{\"email\":\"" + String(conf.hubUser) + "\"," +
                      "\"password\":\"" + String(conf.hubPassword) + "\"," +
                      "\"returnSecureToken\":true}";
  
    client.println(String("POST ") + signInUrl + " HTTP/1.1");
    client.println("Content-Type: application/json");
    client.println("Host: www.googleapis.com");
    client.println("Cache-Control: no-cache");
    client.println("Content-Length: " + String(payload.length()));
    client.println();
    client.println(payload);

    int now = millis();
    while (client.available() == 0) {
      if (millis() - now > 1000) {
        Serial.println(">>> Client Timeout !");
        client.stop();
        return "error";
      }
    }
    Serial.print("Sign in response time: ");
    Serial.println(millis() - now);
    while(client.available()) {
      String line = client.readStringUntil('\r');
      line.trim();
      if (line.startsWith("{")) { // Start of JSON payload
        return findJsonKey(line, "idToken");
      }
    }
  }
  return "error";
}

void sendTemperature(float temp) {  
  String auth = signIn();
  if (auth == "error") {
    return;
  }
  
  WiFiClientSecure client;

  uint16_t attempts = 0;
   
  while(!client.connect(conf.hubIp, conf.hubPort) && attempts < 4) {
    Serial.println("connection failed");
    wifiConnect(); 
    attempts++;
  }

  if (attempts == 4) {
    Serial.println("Failed to send temperature");
  } else {
    String url = "/sensors/" + String(ESP.getChipId()) + "/data.json?auth=" + String(auth);
    //String url = "/" + String(ESP.getChipId()) + ".json?auth=" + String(auth);
    int runTime = (millis() - start) + 300;
    String payload = "{\"voltage\":" + String(ESP.getVcc()) +
                     ",\"temperature\":" + String(temp) +
                     ",\"signal\":" + String(WiFi.RSSI()) +
                     ",\"runtime\":" + String(runTime) + "}";
  
    Serial.print("Total approximate run time: ");
    Serial.println(runTime);
    Serial.print("POST data to URL: ");
    Serial.print(conf.hubIp);
    Serial.println(url);
    Serial.print("Payload: ");
    Serial.println(payload);
    Serial.print("Content length: ");
    Serial.println(payload.length());
    
    client.println(String("POST ") + url + " HTTP/1.1");
    client.println("Content-Type: application/json");
    client.println("Host: " + String(conf.hubIp));
    client.println("Cache-Control: no-cache");
    client.println("Content-Length: " + String(payload.length()));
    client.println();
    client.println(payload);
    Serial.print("Total run time: ");
    Serial.println(millis() - start);
  }
}
