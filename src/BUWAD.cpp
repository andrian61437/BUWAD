#include "secrets.h"
#include <DHT.h>
#include <ESP32Servo.h>
#include <Firebase_ESP_Client.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <addons/TokenHelper.h>


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

// ===== Fallback & Reliability Thresholds =====
#define SENSOR_FAULT_THRESHOLD 5      // consecutive NaN reads before fault
#define FALLBACK_FLIP_INTERVAL 60000  // 60s fixed timer when sensor is faulty
#define MOTOR_STALL_TIMEOUT 3000      // ms - max time to wait for servo move
#define WIFI_RECONNECT_BASE_DELAY 5000 // ms - initial WiFi reconnect delay
#define WIFI_RECONNECT_MAX_DELAY 120000 // ms - max backoff (2 minutes)

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
float lastGoodTemp = 25.0;
float lastGoodHumidity = 50.0;

String dryingMode = "danggit";
String flipMode = "timer";
bool powerOn = true;
bool isPaused = false;
bool flipState = false;
bool coverClosed = false;
unsigned long lastPublish = 0;
unsigned long lastFlip = 0;
unsigned long lastSensorRead = 0;
unsigned long lastLCDUpdate = 0;
unsigned long lastSettingsCheck = 0;

// ===== Fallback & Reliability State =====
bool sensorFault = false;           // true when DHT sensor is unreliable
int sensorNaNCount = 0;             // consecutive NaN reading counter
bool motorStalled = false;          // true if last flip timed out
bool wifiOffline = false;           // true when WiFi is disconnected
unsigned long lastWiFiReconnect = 0; // last WiFi reconnect attempt time
unsigned long wifiReconnectDelay = WIFI_RECONNECT_BASE_DELAY; // current backoff delay

// Note: Power is supplied via USB power bank (solar → power bank → ESP32).
// The power bank provides a steady 5V output, so battery voltage monitoring
// is not applicable. The ESP32 will simply lose power when the bank is depleted.

// LCD message override
bool lcdOverrideActive = false;
unsigned long lcdOverrideEnd = 0;

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
void closeCover();
void openCover();
void handleWiFiReconnect();

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
  coverClosed = false;
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
  Serial.print("  Danggit: ");
  Serial.print(FLIP_DANGGIT / 1000);
  Serial.println("s");
  Serial.print("  Bolinao: ");
  Serial.print(FLIP_BOLINAO / 1000);
  Serial.println("s");
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

void closeCover() {
  coverServo.write(180);
  coverClosed = true;
  Serial.println("🛡️ Cover CLOSED");
}

void openCover() {
  coverServo.write(0);
  coverClosed = false;
  Serial.println("🛡️ Cover OPENED");
}

void updateLCD() {
  unsigned long now = millis();

  if (lcdOverrideActive) {
    if (now >= lcdOverrideEnd) {
      lcdOverrideActive = false;
      lcd.clear();
      lastPageChange = 0;
    } else {
      return;
    }
  }

  if (now - lastLCDUpdate < LCD_UPDATE_INTERVAL)
    return;
  lastLCDUpdate = now;

  if (!powerOn) {
    lcd.setCursor(0, 0);
    lcd.print("BUWAD OFFLINE");
    lcd.setCursor(0, 1);
    lcd.print("                ");
    return;
  }

  if (now - lastPageChange > 3000) {
    lcdPage = (lcdPage + 1) % 5;
    lastPageChange = now;
    lcd.clear();
  }

  switch (lcdPage) {
  case 0:
    lcd.setCursor(0, 0);
    lcd.print("T:");
    lcd.print(temperature, 1);
    lcd.print("C  H:");
    lcd.print(humidity, 0);
    lcd.print("%");
    lcd.setCursor(0, 1);
    lcd.print("Sun:");
    lcd.print(sunlight);
    lcd.print("%   NPM Rain:");
    lcd.print(rainDetected ? "W" : "D");
    break;
  case 1:
    lcd.setCursor(0, 0);
    lcd.print("Mode:");
    lcd.print(dryingMode == "danggit" ? "DANGGIT" : "BOLINAO");
    lcd.setCursor(0, 1);
    lcd.print("Flip:");
    lcd.print(flipMode == "timer" ? "TIMER" : "ENV");
    break;
  case 2: {
    lcd.setCursor(0, 0);
    if (isPaused)
      lcd.print("PAUSED        ");
    else if (rainDetected)
      lcd.print("RAIN MODE     ");
    else if (coverClosed)
      lcd.print("COVER CLOSED  ");
    else
      lcd.print("POWER: ON     ");

    lcd.setCursor(0, 1);
    lcd.print("Next:");
    unsigned long interval =
        (dryingMode == "danggit") ? FLIP_DANGGIT : FLIP_BOLINAO;
    unsigned long remaining = 0;
    if (millis() - lastFlip < interval)
      remaining = (interval - (millis() - lastFlip)) / 1000;
    lcd.print(remaining);
    lcd.print("s    ");
    break;
  }
  case 3:
    lcd.setCursor(0, 0);
    lcd.print(WiFi.status() == WL_CONNECTED ? "WiFi:CONNECTED"
                                            : "WiFi:OFFLINE");
    lcd.setCursor(0, 1);
    lcd.print(firebaseOK ? "FB:ONLINE    " : "FB:OFFLINE   ");
    break;
  case 4: {
    // Fallback & Health Status Page
    lcd.setCursor(0, 0);
    if (sensorFault)
      lcd.print("SENSOR FAULT!   ");
    else if (motorStalled)
      lcd.print("MOTOR JAM!      ");
    else
      lcd.print("Health: OK      ");

    lcd.setCursor(0, 1);
    lcd.print("PWR:USB ");
    lcd.print(sensorFault ? "TMR" : "NRM");
    break;
  }
  }
}

void loop() {
  unsigned long now = millis();

  // --- WiFi Auto-Reconnect with Exponential Backoff ---
  handleWiFiReconnect();

  if (now - lastPublish > 30000 && firebaseOK) {
    Serial.println("⚠️ Watchdog: No publish for 30s - reconnecting Firebase...");
    firebaseOK = false;
    connectFirebase();
    lastPublish = millis();
  }

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

  if (powerOn)
    handleAutoFlip();

  static unsigned long lastHeartbeat = 0;
  if (firebaseOK && (now - lastHeartbeat >= 30000)) {
    sendHeartbeat();
    lastHeartbeat = now;
  }

  delay(10);
}

void checkSettings() {
  if (!firebaseOK)
    return;

  if (Firebase.RTDB.getJSON(&fbdo, "system")) {
    FirebaseJson& json = fbdo.jsonObject();
    FirebaseJsonData jsonData;

    if (json.get(jsonData, "lcdMessage") && jsonData.success && jsonData.stringValue.length() > 0) {
      String msg = jsonData.stringValue;
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

    if (json.get(jsonData, "powerOn") && jsonData.success) {
      bool newPower = jsonData.boolValue;
      if (newPower != powerOn) {
        powerOn = newPower;
        Serial.print("🔌 Power: ");
        Serial.println(powerOn ? "ON" : "OFF");
        if (!powerOn) {
          showLCDMessage("BUWAD OFFLINE", "", 0);
          lcdOverrideActive = false;
        } else {
          showLCDMessage("POWER ON", "System Active", 2000);
        }
        addLog("POWER_TOGGLE", powerOn ? "ON" : "OFF");
      }
    }

    if (json.get(jsonData, "dryingMode") && jsonData.success) {
      String newMode = jsonData.stringValue;
      if (newMode.length() > 0 &&
          (newMode == "danggit" || newMode == "bolinao") &&
          newMode != dryingMode) {
        dryingMode = newMode;
        lastFlip = millis();
        Serial.print("📝 Drying mode: ");
        Serial.println(dryingMode);
        showLCDMessage("Switching to",
                       newMode == "danggit" ? "DANGGIT" : "BOLINAO", 2000);
        addLog("DRYING_MODE", dryingMode);
      }
    }

    if (json.get(jsonData, "flipMode") && jsonData.success) {
      String newMode = jsonData.stringValue;
      if (newMode.length() > 0 &&
          (newMode == "timer" || newMode == "environment") &&
          newMode != flipMode) {
        flipMode = newMode;
        Serial.print("📝 Flip mode: ");
        Serial.println(flipMode);
        showLCDMessage("Switching to",
                       newMode == "timer" ? "TIMER-BASED" : "ENV-BASED", 2000);
        addLog("FLIP_MODE", flipMode);
      }
    }

    if (json.get(jsonData, "manualFlip") && jsonData.success && jsonData.boolValue) {
      Serial.println(">>> MANUAL FLIP REQUESTED! <<<");
      Firebase.RTDB.setBool(&fbdo, "system/manualFlip", false);

      if (coverClosed) {
        Serial.println("❌ Flip blocked - Cover is closed (safety)");
        showLCDMessage("Flip Blocked", "Cover is Closed", 2000);
        addLog("FLIP_BLOCKED", "Cover closed - safety lock");
      } else if (!powerOn) {
        Serial.println("❌ Flip blocked - Power OFF");
        showLCDMessage("Flip Blocked", "System is OFF", 2000);
      } else if (isPaused) {
        Serial.println("❌ Flip blocked - Paused");
        showLCDMessage("Flip Blocked", "System Paused", 2000);
      } else if (rainDetected) {
        Serial.println("❌ Flip blocked - Rain detected");
        showLCDMessage("Flip Blocked", "Rain Detected", 2000);
      } else {
        showLCDMessage("Manual Flip", "FLIPPING NOW...", 2000);
        executeFlip();
        addLog("MANUAL_FLIP", "Triggered from dashboard");
      }
    }

    if (json.get(jsonData, "manualCover") && jsonData.success && jsonData.boolValue) {
      Serial.println(">>> MANUAL COVER TOGGLE! <<<");
      Firebase.RTDB.setBool(&fbdo, "system/manualCover", false);

      if (coverClosed) {
        openCover();
        showLCDMessage("Cover Now", "COVER OPENED", 2000);
        addLog("COVER_MANUAL", "Opened from dashboard");
      } else {
        closeCover();
        showLCDMessage("Cover Now", "COVER CLOSED", 2000);
        addLog("COVER_MANUAL", "Closed from dashboard");
      }
    }

    if (json.get(jsonData, "isPaused") && jsonData.success) {
      bool newPaused = jsonData.boolValue;
      if (newPaused != isPaused) {
        isPaused = newPaused;
        Serial.print("⏸️ Paused: ");
        Serial.println(isPaused ? "YES" : "NO");
        showLCDMessage(isPaused ? "PAUSED" : "RESUMED", "", 2000);
        addLog(isPaused ? "PAUSED" : "RESUMED", "");
      }
    }
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi Connected!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi OK!");
    delay(1500);
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

  for (int i = 0; i < 20; i++) {
    firebaseOK = Firebase.ready();
    if (firebaseOK)
      break;
    delay(500);
    Serial.print(".");
  }

  if (firebaseOK) {
    Serial.println("\n✓ Firebase Connected!");
    Firebase.RTDB.setBool(&fbdo, "system/manualFlip", false);
    Firebase.RTDB.setBool(&fbdo, "system/manualCover", false);
    Firebase.RTDB.setString(&fbdo, "system/lcdMessage", "");
    checkSettings();
    publishSensorData();
    publishSystemState();
    addLog("SYSTEM_START", "ESP32 online");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Firebase OK!");
    delay(1500);
  } else {
    Serial.println("\n✗ Firebase Failed!");
  }
}

void readSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  bool tempValid = !isnan(t) && t > 0 && t < 70;
  bool humValid = !isnan(h) && h >= 5 && h <= 99;

  if (tempValid && humValid) {
    temperature = t;
    humidity = h;
    lastGoodTemp = t;
    lastGoodHumidity = h;
    sensorNaNCount = 0;

    // Clear sensor fault if readings are good again
    if (sensorFault) {
      sensorFault = false;
      Serial.println("✓ Sensor recovered - resuming normal mode");
      showLCDMessage("Sensor OK!", "Normal Mode", 2000);
      addLog("SENSOR_RECOVERED", "DHT readings normal");
      addAlert("Sensor recovered - normal operation resumed", "LOW");
    }
  } else {
    // Use last known good values
    temperature = lastGoodTemp;
    humidity = lastGoodHumidity;
    sensorNaNCount++;

    // Trigger sensor fault after threshold consecutive failures
    if (sensorNaNCount >= SENSOR_FAULT_THRESHOLD && !sensorFault) {
      sensorFault = true;
      Serial.println("⚠️ SENSOR FAULT: DHT failed " + String(SENSOR_FAULT_THRESHOLD) + " consecutive reads");
      Serial.println("   Fallback: Switching to fixed " + String(FALLBACK_FLIP_INTERVAL / 1000) + "s timer mode");
      showLCDMessage("SENSOR FAULT!", "TIMER MODE ON", 3000);
      addLog("SENSOR_FAULT", "DHT failed - fallback to " + String(FALLBACK_FLIP_INTERVAL / 1000) + "s timer");
      addAlert("Sensor fault detected - system running on fallback timer mode", "HIGH");
    }
  }

  sunlight = constrain(map(analogRead(LDR_PIN), 0, 4095, 0, 100), 0, 100);
  rainDetected = (digitalRead(RAIN_PIN) == HIGH);
}


void handleWiFiReconnect() {
  bool currentlyConnected = (WiFi.status() == WL_CONNECTED);

  if (currentlyConnected) {
    if (wifiOffline) {
      // Just reconnected
      wifiOffline = false;
      wifiReconnectDelay = WIFI_RECONNECT_BASE_DELAY; // reset backoff
      Serial.println("✓ WiFi reconnected!");
      showLCDMessage("WiFi Back!", "Reconnected", 2000);
      addLog("WIFI_RECONNECTED", "Signal: " + String(WiFi.RSSI()) + "dBm");

      // Re-establish Firebase
      if (!firebaseOK) {
        connectFirebase();
      }
    }
    return;
  }

  // WiFi is disconnected
  if (!wifiOffline) {
    wifiOffline = true;
    Serial.println("⚠️ WiFi disconnected - local mode active");
    showLCDMessage("WiFi LOST!", "Local Mode", 2000);
    addLog("WIFI_LOST", "Switching to local mode");
  }

  // Attempt reconnect with exponential backoff
  unsigned long now = millis();
  if (now - lastWiFiReconnect >= wifiReconnectDelay) {
    lastWiFiReconnect = now;
    Serial.println("📡 WiFi reconnect attempt (backoff: " + String(wifiReconnectDelay / 1000) + "s)...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    // Brief blocking wait (max 5s)
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 10) {
      delay(500);
      attempts++;
    }

    if (WiFi.status() != WL_CONNECTED) {
      // Increase backoff (exponential, capped)
      wifiReconnectDelay = min(wifiReconnectDelay * 2, (unsigned long)WIFI_RECONNECT_MAX_DELAY);
      Serial.println("   WiFi still offline. Next attempt in " + String(wifiReconnectDelay / 1000) + "s");
    }
  }
}

void publishSensorData() {
  if (!firebaseOK)
    return;
  FirebaseJson json;
  json.set("temperature", temperature > 0 ? temperature : 25.0);
  json.set("humidity", humidity > 0 ? humidity : 50.0);
  json.set("sunlight", sunlight);
  json.set("rainDetected", rainDetected);
  json.set("sensorFault", sensorFault);
  json.set("motorStalled", motorStalled);
  json.set("timestamp", getTimestamp());
  Firebase.RTDB.setJSON(&fbdo, "sensors", &json);
}

void publishSystemState() {
  if (!firebaseOK)
    return;

  unsigned long interval =
      (dryingMode == "danggit") ? FLIP_DANGGIT : FLIP_BOLINAO;
  unsigned long remaining = 0;
  if (millis() > lastFlip && (millis() - lastFlip) < interval) {
    remaining = (interval - (millis() - lastFlip)) / 1000;
  }

  String phase = "idle";
  if (!powerOn)
    phase = "offline";
  else if (isPaused)
    phase = "paused";
  else if (coverClosed)
    phase = "cover_closed";
  else if (rainDetected)
    phase = "rain_protection";
  else if (remaining > 0)
    phase = "activeflipping";
  else
    phase = "flipping";

  FirebaseJson json;
  json.set("phase", phase);
  json.set("nextFlip", (int)remaining);
  json.set("isPaused", isPaused);
  json.set("coverClosed", coverClosed);
  json.set("sensorFault", sensorFault);
  json.set("motorStalled", motorStalled);
  json.set("wifiOffline", wifiOffline);
  json.set("lastUpdate", getTimestamp());

  Firebase.RTDB.updateNode(&fbdo, "system", &json);
}

void sendHeartbeat() {
  if (!firebaseOK)
    return;
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
  int targetAngle = flipState ? 180 : 0;

  // Motor stall protection: write command and monitor with timeout
  unsigned long flipStart = millis();
  flipServo.write(targetAngle);

  // Wait for servo to complete movement (typical ~600-800ms for 180°)
  // but cap at MOTOR_STALL_TIMEOUT to prevent overheating if jammed
  delay(min((unsigned long)800, (unsigned long)MOTOR_STALL_TIMEOUT));

  unsigned long flipDuration = millis() - flipStart;

  if (flipDuration >= MOTOR_STALL_TIMEOUT) {
    // Potential stall detected
    if (!motorStalled) {
      motorStalled = true;
      Serial.println("⚠️ MOTOR STALL: Flip exceeded " + String(MOTOR_STALL_TIMEOUT) + "ms timeout");
      showLCDMessage("ERR: MOTOR JAM", "Check mechanism", 3000);
      addLog("MOTOR_STALL", "Flip timeout at " + String(targetAngle) + "°");
      addAlert("Motor stall detected - check flipping mechanism", "HIGH");
    }
  } else {
    // Flip succeeded - clear stall flag if it was set
    if (motorStalled) {
      motorStalled = false;
      Serial.println("✓ Motor recovered - flip successful");
      addLog("MOTOR_RECOVERED", "Flip OK at " + String(targetAngle) + "°");
    }
  }

  lastFlip = millis();
  addLog("FLIP_EXECUTED", "Position: " + String(targetAngle) + "°");
  publishSystemState();
}

void handleAutoFlip() {
  if (!powerOn || isPaused || rainDetected || coverClosed)
    return;

  // If sensor is faulty, override to fixed fallback timer regardless of flipMode
  if (sensorFault) {
    if (millis() - lastFlip >= FALLBACK_FLIP_INTERVAL) {
      Serial.println("⏱️ Fallback timer flip (sensor fault active)");
      executeFlip();
      addLog("FALLBACK_FLIP", "Sensor fault - fixed " + String(FALLBACK_FLIP_INTERVAL / 1000) + "s interval");
    }
    return;
  }

  unsigned long interval =
      (dryingMode == "danggit") ? FLIP_DANGGIT : FLIP_BOLINAO;
  if (flipMode == "timer" && millis() - lastFlip >= interval)
    executeFlip();
  else if (flipMode == "environment" && sunlight > 60 && humidity < 75 &&
           temperature > 26 && millis() - lastFlip >= 10000) {
    executeFlip();
    addLog("ENV_FLIP", "Sun:" + String(sunlight) + "%");
  }
}

void handleRainProtection() {
  if (rainDetected && !lastRainState) {
    lastRainState = true;
    closeCover();
    addAlert("Rain detected", "HIGH");
    addLog("RAIN_PROTECTION", "Cover closed");
    showLCDMessage("RAIN DETECTED!", "Cover Closed", 2000);
  } else if (!rainDetected && lastRainState) {
    lastRainState = false;
    openCover();
    addLog("RAIN_CLEARED", "Cover open");
    showLCDMessage("Rain Cleared", "Cover Opened", 2000);
  }
}

void addLog(String action, String details) {
  if (!firebaseOK)
    return;
  FirebaseJson json;
  json.set("timestamp", getTimestamp());
  json.set("action", action);
  json.set("details", details);
  Firebase.RTDB.pushJSON(&fbdo, "logs", &json);
}

void addAlert(String message, String priority) {
  if (!firebaseOK)
    return;
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
  sprintf(buffer, "%02d:%02d:%02d", (int)((seconds % 86400) / 3600),
          (int)((seconds % 3600) / 60), (int)(seconds % 60));
  return String(buffer);
}