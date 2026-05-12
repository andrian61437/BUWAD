#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include "secrets.h"

// ===== Pin Definitions =====
#define DHTPIN 4
#define DHTTYPE DHT11
#define LDR_PIN 1
#define RAIN_PIN 5
#define SERVO_FLIP 6
#define SERVO_COVER 7

// ===== LCD Configuration =====
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ===== Timing Intervals =====
#define SENSOR_INTERVAL 1000
#define PUBLISH_INTERVAL 1000
#define SETTINGS_CHECK_INTERVAL 500
#define FLIP_DANGGIT 15000
#define FLIP_BOLINAO 10000
#define LCD_UPDATE_INTERVAL 500

// ===== Objects =====
DHT dht(DHTPIN, DHTTYPE);
Servo flipServo;
Servo coverServo;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool firebaseOK = false;

// ===== Variables =====
float temperature = 0;
float humidity = 0;
int sunlight = 0;
bool rainDetected = false;
bool lastRainState = false;

String dryingMode = "danggit";
String flipMode = "timer";
bool powerOn = true;
bool isPaused = false;
bool flipState = false;
unsigned long lastPublish = 0;
unsigned long lastFlip = 0;
unsigned long lastSensorRead = 0;
unsigned long lastLCDUpdate = 0;
unsigned long lastSettingsCheck = 0;

// LCD message override
String lcdOverrideMessage = "";
unsigned long lcdOverrideEnd = 0;
bool lcdOverrideActive = false;

// LCD display pages
int lcdPage = 0;
unsigned long lastPageChange = 0;

// ===== FUNCTION DECLARATIONS =====
void connectWiFi();
void connectFirebase();
void readSensors();
void publishSensorData();
void publishSystemState();
void checkSettings();
void executeFlip();
void handleAutoFlip();
void handleRainProtection();
void sendHeartbeat();
void addLog(String action, String details);
void addAlert(String message, String priority);
String getTimestamp();
void initLCD();
void updateLCD();
void showLCDMessage(String line1, String line2, unsigned long durationMs);

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n╔════════════════════════════════════╗");
  Serial.println("║     BUWAD Solar Fish Dryer       ║");
  Serial.println("╚════════════════════════════════════╝\n");
  
  initLCD();
  
  dht.begin();
  pinMode(RAIN_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  
  flipServo.attach(SERVO_FLIP);
  coverServo.attach(SERVO_COVER);
  flipServo.write(0);
  coverServo.write(0);
  Serial.println("✓ Servos initialized");
  
  lcd.setCursor(0, 1);
  lcd.print("WiFi...");
  connectWiFi();
  
  lcd.setCursor(0, 1);
  lcd.print("Firebase...");
  connectFirebase();
  
  readSensors();
  lastRainState = rainDetected;
  lastFlip = millis();
  
  showLCDMessage("BUWAD Ready!", "System Online", 2000);
  
  Serial.println("\n✓ System Ready!");
  Serial.print("  Danggit: "); Serial.print(FLIP_DANGGIT/1000); Serial.println("s");
  Serial.print("  Bolinao: "); Serial.print(FLIP_BOLINAO/1000); Serial.println("s");
  Serial.println("====================================\n");
}

void initLCD() {
  Wire.begin(8, 9);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("BUWAD Starting");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  Serial.println("✓ LCD initialized");
}

void showLCDMessage(String line1, String line2, unsigned long durationMs) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
  lcdOverrideActive = true;
  lcdOverrideEnd = millis() + durationMs;
}

void updateLCD() {
  unsigned long now = millis();
  
  // If override is active, check if it's expired
  if (lcdOverrideActive) {
    if (now >= lcdOverrideEnd) {
      lcdOverrideActive = false;
      lcd.clear();
      lastPageChange = 0;
    } else {
      return; // Keep showing override message
    }
  }
  
  if (now - lastLCDUpdate < LCD_UPDATE_INTERVAL) return;
  lastLCDUpdate = now;
  
  if (!powerOn) {
    lcd.setCursor(0, 0);
    lcd.print("BUWAD OFFLINE");
    lcd.setCursor(0, 1);
    lcd.print("                ");
    return;
  }
  
  if (now - lastPageChange > 3000) {
    lcdPage = (lcdPage + 1) % 4;
    lastPageChange = now;
    lcd.clear();
  }
  
  switch(lcdPage) {
    case 0:
      lcd.setCursor(0, 0);
      lcd.print("T:"); lcd.print(temperature, 1); lcd.print("C  H:"); lcd.print(humidity, 0); lcd.print("%");
      lcd.setCursor(0, 1);
      lcd.print("Sun:"); lcd.print(sunlight); lcd.print("%   Rain:"); lcd.print(rainDetected ? "WET" : "DRY");
      break;
    case 1:
      lcd.setCursor(0, 0);
      lcd.print("Mode:"); lcd.print(dryingMode == "danggit" ? "DANGGIT" : "BOLINAO");
      lcd.setCursor(0, 1);
      lcd.print("Flip:"); lcd.print(flipMode == "timer" ? "TIMER" : "ENV");
      break;
    case 2: {
      lcd.setCursor(0, 0);
      if (isPaused) lcd.print("PAUSED        ");
      else if (rainDetected) lcd.print("RAIN MODE     ");
      else lcd.print("POWER: ON     ");
      
      lcd.setCursor(0, 1);
      lcd.print("Next:");
      unsigned long interval = (dryingMode == "danggit") ? FLIP_DANGGIT : FLIP_BOLINAO;
      unsigned long remaining = 0;
      if (millis() - lastFlip < interval) remaining = (interval - (millis() - lastFlip)) / 1000;
      lcd.print(remaining); lcd.print("s    ");
      break;
    }
    case 3:
      lcd.setCursor(0, 0);
      lcd.print(WiFi.status() == WL_CONNECTED ? "WiFi:CONNECTED" : "WiFi:OFFLINE");
      lcd.setCursor(0, 1);
      lcd.print(firebaseOK ? "FB:ONLINE    " : "FB:OFFLINE   ");
      break;
  }
}

void loop() {
  unsigned long now = millis();
  
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    readSensors();
    lastSensorRead = now;
  }
  
  updateLCD();
  
  if (now - lastSettingsCheck >= SETTINGS_CHECK_INTERVAL) {
    checkSettings();
    lastSettingsCheck = now;
  }
  
  if (firebaseOK && (now - lastPublish >= PUBLISH_INTERVAL)) {
    publishSensorData();
    publishSystemState();
    lastPublish = now;
  }
  
  handleRainProtection();
  
  if (powerOn) handleAutoFlip();
  
  static unsigned long lastHeartbeat = 0;
  if (firebaseOK && (now - lastHeartbeat >= 30000)) {
    sendHeartbeat();
    lastHeartbeat = now;
  }
  
  delay(10);
}

void checkSettings() {
  if (!firebaseOK) return;
  
  // Check lcdMessage first
  if (Firebase.RTDB.getString(&fbdo, "system/lcdMessage")) {
    String msg = fbdo.stringData();
    if (msg.length() > 0) {
      // Format: "LINE1|LINE2" or just "LINE1"
      int separator = msg.indexOf('|');
      String line1, line2;
      if (separator > 0) {
        line1 = msg.substring(0, separator);
        line2 = msg.substring(separator + 1);
      } else {
        line1 = msg;
        line2 = "";
      }
      showLCDMessage(line1, line2, 2000);
      Firebase.RTDB.setString(&fbdo, "system/lcdMessage", "");
    }
  }
  
  // Check powerOn
  if (Firebase.RTDB.getBool(&fbdo, "system/powerOn")) {
    bool newPower = fbdo.boolData();
    if (newPower != powerOn) {
      powerOn = newPower;
      Serial.print("🔌 Power: "); Serial.println(powerOn ? "ON" : "OFF");
      if (!powerOn) {
        showLCDMessage("BUWAD OFFLINE", "", 0);
        lcdOverrideActive = false;
      } else {
        showLCDMessage("POWER ON", "System Active", 2000);
      }
      addLog("POWER_TOGGLE", powerOn ? "ON" : "OFF");
    }
  }
  
  // Check dryingMode
  if (Firebase.RTDB.getString(&fbdo, "system/dryingMode")) {
    String newMode = fbdo.stringData();
    if (newMode.length() > 0 && (newMode == "danggit" || newMode == "bolinao") && newMode != dryingMode) {
      dryingMode = newMode;
      lastFlip = millis();
      Serial.print("📝 Drying mode: "); Serial.println(dryingMode);
      showLCDMessage("Switching to", newMode == "danggit" ? "DANGGIT" : "BOLINAO", 2000);
      addLog("DRYING_MODE", dryingMode);
    }
  }
  
  // Check flipMode
  if (Firebase.RTDB.getString(&fbdo, "system/flipMode")) {
    String newMode = fbdo.stringData();
    if (newMode.length() > 0 && (newMode == "timer" || newMode == "environment") && newMode != flipMode) {
      flipMode = newMode;
      Serial.print("📝 Flip mode: "); Serial.println(flipMode);
      showLCDMessage("Switching to", newMode == "timer" ? "TIMER-BASED" : "ENV-BASED", 2000);
      addLog("FLIP_MODE", flipMode);
    }
  }
  
  // Check manualFlip
  if (Firebase.RTDB.getBool(&fbdo, "system/manualFlip")) {
    bool shouldFlip = fbdo.boolData();
    if (shouldFlip) {
      Serial.println(">>> MANUAL FLIP TRIGGERED! <<<");
      Firebase.RTDB.setBool(&fbdo, "system/manualFlip", false);
      
      if (powerOn && !isPaused && !rainDetected) {
        showLCDMessage("Manual Flip", "FLIPPING NOW...", 2000);
        executeFlip();
        addLog("MANUAL_FLIP", "Triggered from dashboard");
      } else {
        Serial.println("❌ Flip blocked - conditions not met");
      }
    }
  }
  
  // Check isPaused
  if (Firebase.RTDB.getBool(&fbdo, "system/isPaused")) {
    bool newPaused = fbdo.boolData();
    if (newPaused != isPaused) {
      isPaused = newPaused;
      Serial.print("⏸️ Paused: "); Serial.println(isPaused ? "YES" : "NO");
      showLCDMessage(isPaused ? "PAUSED" : "RESUMED", "", 2000);
      addLog(isPaused ? "PAUSED" : "RESUMED", "");
    }
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) { delay(500); Serial.print("."); attempts++; }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi Connected!");
    lcd.clear(); lcd.setCursor(0, 0); lcd.print("WiFi OK!"); delay(1500);
  } else {
    Serial.println("✗ WiFi Failed!");
  }
}

void connectFirebase() {
  Serial.println("\nConnecting to Firebase...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  for (int i = 0; i < 20; i++) { firebaseOK = Firebase.ready(); if (firebaseOK) break; delay(500); Serial.print("."); }
  
  if (firebaseOK) {
    Serial.println("\n✓ Firebase Connected!");
    Firebase.RTDB.setBool(&fbdo, "system/manualFlip", false);
    Firebase.RTDB.setString(&fbdo, "system/lcdMessage", "");
    publishSensorData();
    publishSystemState();
    addLog("SYSTEM_START", "ESP32 online");
    lcd.clear(); lcd.setCursor(0, 0); lcd.print("Firebase OK!"); delay(1500);
  } else {
    Serial.println("\n✗ Firebase Failed!");
  }
}

void readSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && t > 0 && t < 100) temperature = t;
  if (!isnan(h) && h > 0 && h <= 100) humidity = h;
  sunlight = constrain(map(analogRead(LDR_PIN), 0, 4095, 0, 100), 0, 100);
  rainDetected = (digitalRead(RAIN_PIN) == HIGH);
}

void publishSensorData() {
  if (!firebaseOK) return;
  FirebaseJson json;
  json.set("temperature", temperature);
  json.set("humidity", humidity);
  json.set("sunlight", sunlight);
  json.set("rainDetected", rainDetected);
  json.set("timestamp", getTimestamp());
  Firebase.RTDB.setJSON(&fbdo, "sensors", &json);
}

void publishSystemState() {
  if (!firebaseOK) return;
  
  unsigned long interval = (dryingMode == "danggit") ? FLIP_DANGGIT : FLIP_BOLINAO;
  unsigned long remaining = 0;
  if (millis() > lastFlip && (millis() - lastFlip) < interval) {
    remaining = (interval - (millis() - lastFlip)) / 1000;
  }
  
  String phase = "idle";
  if (!powerOn) phase = "offline";
  else if (isPaused) phase = "paused";
  else if (rainDetected) phase = "rain_protection";
  else if (remaining > 0) phase = "activeflipping";
  else phase = "flipping";
  
  FirebaseJson json;
  json.set("phase", phase);
  json.set("nextFlip", (int)remaining);
  json.set("isPaused", isPaused);
  json.set("dryingMode", dryingMode);
  json.set("flipMode", flipMode);
  json.set("powerOn", powerOn);
  json.set("manualFlip", false);
  json.set("lcdMessage", "");
  json.set("lastUpdate", getTimestamp());
  
  Firebase.RTDB.setJSON(&fbdo, "system", &json);
}

void sendHeartbeat() {
  if (!firebaseOK) return;
  FirebaseJson json;
  json.set("ip", WiFi.localIP().toString());
  json.set("rssi", WiFi.RSSI());
  json.set("lastSeen", getTimestamp());
  json.set("status", "online");
  json.set("uptime", (int)(millis() / 1000));
  Firebase.RTDB.setJSON(&fbdo, "devices/" + WiFi.macAddress(), &json);
}

void executeFlip() {
  Serial.println("🔄 FLIPPING!");
  flipState = !flipState;
  flipServo.write(flipState ? 180 : 0);
  delay(800);
  lastFlip = millis();
  addLog("FLIP_EXECUTED", "Position: " + String(flipState ? 180 : 0) + "°");
  publishSystemState();
}

void handleAutoFlip() {
  if (!powerOn || isPaused || rainDetected) return;
  unsigned long interval = (dryingMode == "danggit") ? FLIP_DANGGIT : FLIP_BOLINAO;
  if (flipMode == "timer" && millis() - lastFlip >= interval) executeFlip();
  else if (flipMode == "environment" && sunlight > 60 && humidity < 75 && temperature > 26 && millis() - lastFlip >= 10000) {
    executeFlip();
    addLog("ENV_FLIP", "Sun:" + String(sunlight) + "%");
  }
}

void handleRainProtection() {
  if (rainDetected && !lastRainState) {
    lastRainState = true;
    if (coverServo.read() != 180) {
      coverServo.write(180);
      addAlert("Rain detected", "HIGH");
      addLog("RAIN_PROTECTION", "Cover closed");
      showLCDMessage("RAIN DETECTED!", "Cover Closed", 2000);
    }
  } else if (!rainDetected && lastRainState) {
    lastRainState = false;
    if (coverServo.read() != 0) {
      coverServo.write(0);
      addLog("RAIN_CLEARED", "Cover open");
      showLCDMessage("Rain Cleared", "Cover Opened", 2000);
    }
  }
}

void addLog(String action, String details) {
  if (!firebaseOK) return;
  FirebaseJson json;
  json.set("timestamp", getTimestamp());
  json.set("action", action);
  json.set("details", details);
  Firebase.RTDB.pushJSON(&fbdo, "logs", &json);
}

void addAlert(String message, String priority) {
  if (!firebaseOK) return;
  FirebaseJson json;
  json.set("timestamp", getTimestamp());
  json.set("message", message);
  json.set("priority", priority);
  json.set("status", "active");
  Firebase.RTDB.pushJSON(&fbdo, "alerts", &json);
}

String getTimestamp() {
  unsigned long seconds = millis() / 1000;
  char buffer[9];
  sprintf(buffer, "%02d:%02d:%02d", (int)((seconds % 86400) / 3600), (int)((seconds % 3600) / 60), (int)(seconds % 60));
  return String(buffer);
}