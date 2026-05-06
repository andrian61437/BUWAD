#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>

// ===== WiFi Credentials =====
#define WIFI_SSID "ZTE_2.4G_s2cYQh"
#define WIFI_PASSWORD "YyXUUTPS"

// ===== Firebase Configuration =====
#define API_KEY "AIzaSyDTgbj_NLixe0huyqXEiDGk3fw2Jr-Clgg"
#define DATABASE_URL "https://buwad-iot-dashboard-default-rtdb.firebaseio.com"
#define USER_EMAIL "esp32@buwad.local"
#define USER_PASSWORD "buwad-esp32-2024"

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
#define SENSOR_INTERVAL 2000
#define PUBLISH_INTERVAL 5000
#define FLIP_DANGGIT 38000
#define FLIP_BOLINAO 22000
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

String dryingMode = "danggit";
String flipMode = "timer";
bool powerOn = true;
bool isPaused = false;
bool flipState = false;
unsigned long lastPublish = 0;
unsigned long lastFlip = 0;
unsigned long lastSensorRead = 0;
unsigned long lastLCDUpdate = 0;

// LCD display pages
int lcdPage = 0;
unsigned long lastPageChange = 0;

// ===== FUNCTION DECLARATIONS =====
void connectWiFi();
void connectFirebase();
void readSensors();
void publishSensorData();
void publishSystemState();
void checkCommands();
void executeFlip();
void handleAutoFlip();
void handleRainProtection();
void sendHeartbeat();
void addLog(String action, String details);
void addAlert(String message, String priority);
String getTimestamp();
void initLCD();
void updateLCD();

// ===== SETUP =====
void setup() {
  Serial.begin(9600);
  delay(1000);
  Serial.println("\n╔════════════════════════════════════╗");
  Serial.println("║     BUWAD Solar Fish Dryer       ║");
  Serial.println("║     Full System with Debug       ║");
  Serial.println("╚════════════════════════════════════╝\n");
  
  // Initialize LCD
  initLCD();
  
  // Initialize sensors
  dht.begin();
  pinMode(RAIN_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  
  // Initialize servos
  flipServo.attach(SERVO_FLIP);
  coverServo.attach(SERVO_COVER);
  flipServo.write(0);
  coverServo.write(0);
  Serial.println("✓ Servos initialized");
  
  // Connect to WiFi
  lcd.setCursor(0, 1);
  lcd.print("WiFi...");
  connectWiFi();
  
  // Connect to Firebase
  lcd.setCursor(0, 1);
  lcd.print("Firebase...");
  connectFirebase();
  
  // Initial sensor read
  readSensors();
  
  // Show ready message
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("BUWAD Ready!");
  lcd.setCursor(0, 1);
  lcd.print("System Online");
  delay(2000);
  
  Serial.println("\n✓ System Ready!");
  Serial.println("====================================\n");
}

// ===== INITIALIZE LCD =====
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

// ===== UPDATE LCD DISPLAY =====
void updateLCD() {
  unsigned long now = millis();
  if (now - lastLCDUpdate < LCD_UPDATE_INTERVAL) return;
  lastLCDUpdate = now;
  
  if (now - lastPageChange > 3000) {
    lcdPage = (lcdPage + 1) % 4;
    lastPageChange = now;
    lcd.clear();
  }
  
  switch(lcdPage) {
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
      lcd.print("%   Rain:");
      lcd.print(rainDetected ? "WET" : "DRY");
      break;
      
    case 1:
      lcd.setCursor(0, 0);
      lcd.print("Mode:");
      lcd.print(dryingMode == "danggit" ? "DANGGIT" : "BOLINAO");
      lcd.print("    ");
      
      lcd.setCursor(0, 1);
      lcd.print("Flip:");
      lcd.print(flipMode == "timer" ? "TIMER" : "ENV");
      lcd.print("    ");
      break;
      
    case 2: {
      lcd.setCursor(0, 0);
      if (!powerOn) {
        lcd.print("POWER: OFF    ");
      } else if (isPaused) {
        lcd.print("PAUSED        ");
      } else if (rainDetected) {
        lcd.print("RAIN MODE     ");
      } else {
        lcd.print("POWER: ON     ");
      }
      
      lcd.setCursor(0, 1);
      lcd.print("Next:");
      
      unsigned long interval = (dryingMode == "danggit") ? FLIP_DANGGIT : FLIP_BOLINAO;
      unsigned long remaining = 0;
      if (millis() - lastFlip < interval) {
        remaining = (interval - (millis() - lastFlip)) / 1000;
      }
      lcd.print(remaining);
      lcd.print("s    ");
      break;
    }
      
    case 3:
      lcd.setCursor(0, 0);
      if (WiFi.status() == WL_CONNECTED) {
        lcd.print("WiFi:CONNECTED");
      } else {
        lcd.print("WiFi:OFFLINE ");
      }
      
      lcd.setCursor(0, 1);
      if (firebaseOK) {
        lcd.print("FB:ONLINE    ");
      } else {
        lcd.print("FB:OFFLINE   ");
      }
      break;
  }
}

// ===== MAIN LOOP =====
void loop() {
  unsigned long now = millis();
  
  // Read sensors every 2 seconds
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    readSensors();
    lastSensorRead = now;
  }
  
  // Update LCD display
  updateLCD();
  
  // Check for commands from dashboard (WITH DEBUG)
  checkCommands();
  
  // Publish data to Firebase
  if (firebaseOK && (now - lastPublish >= PUBLISH_INTERVAL) && powerOn) {
    publishSensorData();
    publishSystemState();
    lastPublish = now;
  }
  
  // Handle rain protection (HIGHEST PRIORITY)
  handleRainProtection();
  
  // Handle auto flipping
  handleAutoFlip();
  
  // Send heartbeat every 30 seconds
  static unsigned long lastHeartbeat = 0;
  if (firebaseOK && (now - lastHeartbeat >= 30000)) {
    sendHeartbeat();
    lastHeartbeat = now;
  }
  
  delay(50);
}

// ===== CHECK COMMANDS FROM DASHBOARD (WITH DEBUG) =====
void checkCommands() {
  if (!firebaseOK) {
    static unsigned long lastDebug = 0;
    if (millis() - lastDebug > 10000) {
      lastDebug = millis();
      Serial.println("⚠️ Firebase not ready - can't check commands");
    }
    return;
  }
  
  // Debug: Check every 5 seconds if no command
  static unsigned long lastCheckPrint = 0;
  if (millis() - lastCheckPrint > 5000) {
    lastCheckPrint = millis();
    Serial.println("🔍 Listening for commands on path: commands/manualFlip");
  }
  
  // Manual Flip Command
  if (Firebase.RTDB.getBool(&fbdo, "commands/manualFlip")) {
    bool flipCommand = fbdo.boolData();
    
    if (flipCommand) {
      Serial.println("═══════════════════════════════════════");
      Serial.println(">>> MANUAL FLIP COMMAND RECEIVED! <<<");
      Serial.println("═══════════════════════════════════════");
      
      // Reset the command immediately
      Firebase.RTDB.setBool(&fbdo, "commands/manualFlip", false);
      Serial.println("✓ Command reset to false");
      
      // Check if conditions allow flip
      Serial.print("📋 Conditions: PowerOn=");
      Serial.print(powerOn);
      Serial.print(" Paused=");
      Serial.print(isPaused);
      Serial.print(" Rain=");
      Serial.println(rainDetected);
      
      if (powerOn && !isPaused && !rainDetected) {
        Serial.println("✅ Conditions met - Executing flip!");
        executeFlip();
        addLog("MANUAL_FLIP", "Triggered from dashboard");
      } else {
        Serial.println("❌ Flip blocked - Conditions not met");
        if (!powerOn) Serial.println("   → System is OFF");
        if (isPaused) Serial.println("   → System is PAUSED");
        if (rainDetected) Serial.println("   → Rain detected");
      }
    }
  } else {
    // Firebase read error
    Serial.print("❌ Firebase read error: ");
    Serial.println(fbdo.errorReason());
  }
  
  // Power Toggle
  if (Firebase.RTDB.getBool(&fbdo, "commands/setPowerOn")) {
    bool newState = fbdo.boolData();
    if (newState != powerOn) {
      powerOn = newState;
      Firebase.RTDB.setBool(&fbdo, "commands/setPowerOn", false);
      addLog("POWER_TOGGLE", powerOn ? "ON" : "OFF");
      publishSystemState();
      Serial.print("🔌 Power toggled: ");
      Serial.println(powerOn ? "ON" : "OFF");
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(powerOn ? "POWER ON" : "POWER OFF");
      delay(1500);
    }
  }
  
  // Drying Mode
  if (Firebase.RTDB.getString(&fbdo, "commands/setDryingMode")) {
    String newMode = fbdo.stringData();
    if (newMode == "danggit" || newMode == "bolinao") {
      dryingMode = newMode;
      Firebase.RTDB.setString(&fbdo, "commands/setDryingMode", "");
      addLog("DRYING_MODE", dryingMode);
      publishSystemState();
      Serial.print("📝 Drying mode: ");
      Serial.println(dryingMode);
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Mode:");
      lcd.print(dryingMode == "danggit" ? "DANGGIT" : "BOLINAO");
      delay(1500);
    }
  }
  
  // Flip Mode
  if (Firebase.RTDB.getString(&fbdo, "commands/setFlipMode")) {
    String newMode = fbdo.stringData();
    if (newMode == "timer" || newMode == "environment") {
      flipMode = newMode;
      Firebase.RTDB.setString(&fbdo, "commands/setFlipMode", "");
      addLog("FLIP_MODE", flipMode);
      publishSystemState();
      Serial.print("📝 Flip mode: ");
      Serial.println(flipMode);
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Flip:");
      lcd.print(flipMode == "timer" ? "TIMER" : "ENV");
      delay(1500);
    }
  }
  
  // Pause/Resume
  if (Firebase.RTDB.getBool(&fbdo, "commands/setPaused")) {
    bool newPaused = fbdo.boolData();
    if (newPaused != isPaused) {
      isPaused = newPaused;
      Firebase.RTDB.setBool(&fbdo, "commands/setPaused", false);
      addLog(isPaused ? "PAUSED" : "RESUMED", "");
      publishSystemState();
      Serial.print("⏸️ Paused: ");
      Serial.println(isPaused ? "YES" : "NO");
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(isPaused ? "PAUSED" : "RESUMED");
      delay(1500);
    }
  }
}

// ===== CONNECT TO WiFi =====
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
    Serial.print("  IP Address: ");
    Serial.println(WiFi.localIP());
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi OK!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString().substring(0, 15));
    delay(1500);
  } else {
    Serial.println("✗ WiFi Failed!");
  }
}

// ===== CONNECT TO FIREBASE =====
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
    if (firebaseOK) break;
    delay(500);
    Serial.print(".");
  }
  
  if (firebaseOK) {
    Serial.println("\n✓ Firebase Connected!");
    
    // Initialize commands in Firebase
    FirebaseJson cmdJson;
    cmdJson.set("manualFlip", false);
    cmdJson.set("setPowerOn", true);
    cmdJson.set("setPaused", false);
    cmdJson.set("setDryingMode", "danggit");
    cmdJson.set("setFlipMode", "timer");
    Firebase.RTDB.setJSON(&fbdo, "commands", &cmdJson);
    
    addLog("SYSTEM_START", "ESP32 online with LCD");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Firebase OK!");
    lcd.setCursor(0, 1);
    lcd.print("System Ready");
    delay(1500);
  } else {
    Serial.println("\n✗ Firebase Failed!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Firebase FAIL!");
    delay(3000);
  }
}

// ===== READ ALL SENSORS =====
void readSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  
  if (!isnan(t) && t > 0 && t < 100) temperature = t;
  if (!isnan(h) && h > 0 && h <= 100) humidity = h;
  
  int lightRaw = analogRead(LDR_PIN);
  sunlight = map(lightRaw, 0, 4095, 0, 100);
  sunlight = constrain(sunlight, 0, 100);
  
  rainDetected = (digitalRead(RAIN_PIN) == HIGH);
  
  Serial.print("📊 Sensors: T=");
  Serial.print(temperature, 1);
  Serial.print("°C H=");
  Serial.print(humidity, 0);
  Serial.print("% ☀️=");
  Serial.print(sunlight);
  Serial.print("% 💧=");
  Serial.println(rainDetected ? "RAIN" : "DRY");
}

// ===== PUBLISH SENSOR DATA =====
void publishSensorData() {
  if (!firebaseOK) return;
  
  FirebaseJson json;
  json.set("temperature", temperature);
  json.set("humidity", humidity);
  json.set("sunlight", sunlight);
  json.set("rainDetected", rainDetected);
  json.set("timestamp", getTimestamp());
  
  if (Firebase.RTDB.setJSON(&fbdo, "sensors", &json)) {
    Serial.println("✓ Sensor data published");
  } else {
    Serial.print("✗ Publish failed: ");
    Serial.println(fbdo.errorReason());
  }
}

// ===== PUBLISH SYSTEM STATE =====
void publishSystemState() {
  if (!firebaseOK) return;
  
  unsigned long interval = (dryingMode == "danggit") ? FLIP_DANGGIT : FLIP_BOLINAO;
  unsigned long remaining = 0;
  if (millis() - lastFlip < interval) {
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
  json.set("lastUpdate", getTimestamp());
  
  Firebase.RTDB.setJSON(&fbdo, "system", &json);
}

// ===== SEND HEARTBEAT =====
void sendHeartbeat() {
  if (!firebaseOK) return;
  
  String devicePath = "devices/";
  devicePath += WiFi.macAddress();
  
  FirebaseJson json;
  json.set("ip", WiFi.localIP().toString());
  json.set("rssi", WiFi.RSSI());
  json.set("lastSeen", getTimestamp());
  json.set("status", "online");
  json.set("uptime", (int)(millis() / 1000));
  
  Firebase.RTDB.setJSON(&fbdo, devicePath, &json);
  Serial.println("💓 Heartbeat sent");
}

// ===== EXECUTE FLIP =====
void executeFlip() {
  Serial.println("🔄 FLIPPING - Moving fish tray");
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("FLIPPING...");
  
  flipState = !flipState;
  int targetPos = flipState ? 180 : 0;
  
  flipServo.write(targetPos);
  delay(800);
  lastFlip = millis();
  
  Serial.print("  → Servo moved to ");
  Serial.print(targetPos);
  Serial.println("°");
  
  addLog("FLIP_EXECUTED", "Position: " + String(targetPos) + "°");
  publishSystemState();
  
  delay(1000);
}

// ===== HANDLE AUTO FLIPPING =====
void handleAutoFlip() {
  if (!powerOn || isPaused || rainDetected) return;
  
  unsigned long interval = (dryingMode == "danggit") ? FLIP_DANGGIT : FLIP_BOLINAO;
  
  if (flipMode == "timer") {
    if (millis() - lastFlip >= interval) {
      executeFlip();
    }
  }
  else if (flipMode == "environment") {
    bool sensorTrigger = (sunlight > 60 && humidity < 75 && temperature > 26);
    bool timeGuard = (millis() - lastFlip >= 10000);
    if (sensorTrigger && timeGuard) {
      executeFlip();
      addLog("ENV_FLIP_TRIGGER", "Sunlight:" + String(sunlight) + "%");
    }
  }
}

// ===== HANDLE RAIN PROTECTION =====
void handleRainProtection() {
  if (rainDetected) {
    if (coverServo.read() != 180) {
      coverServo.write(180);
      addAlert("Rain detected - Cover closed", "HIGH");
      addLog("RAIN_PROTECTION", "Cover closed automatically");
      Serial.println("☔ RAIN DETECTED - Cover closed!");
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("RAIN DETECTED!");
      lcd.setCursor(0, 1);
      lcd.print("Cover Closed");
      delay(2000);
    }
  } else {
    if (coverServo.read() != 0) {
      coverServo.write(0);
      addLog("RAIN_CLEARED", "Cover reopened");
      Serial.println("☀️ RAIN CLEARED - Cover opened");
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Rain Cleared");
      lcd.setCursor(0, 1);
      lcd.print("Cover Opened");
      delay(2000);
    }
  }
}

// ===== ADD LOG ENTRY =====
void addLog(String action, String details) {
  if (!firebaseOK) return;
  
  FirebaseJson json;
  json.set("timestamp", getTimestamp());
  json.set("action", action);
  json.set("details", details);
  
  Firebase.RTDB.pushJSON(&fbdo, "logs", &json);
  Serial.print("📝 Log: ");
  Serial.print(action);
  Serial.print(" - ");
  Serial.println(details);
}

// ===== ADD ALERT =====
void addAlert(String message, String priority) {
  if (!firebaseOK) return;
  
  FirebaseJson json;
  json.set("timestamp", getTimestamp());
  json.set("message", message);
  json.set("priority", priority);
  json.set("status", "active");
  
  Firebase.RTDB.pushJSON(&fbdo, "alerts", &json);
  Serial.print("⚠️ ALERT: ");
  Serial.println(message);
}

// ===== GET TIMESTAMP STRING =====
String getTimestamp() {
  unsigned long seconds = millis() / 1000;
  int hours = (seconds % 86400) / 3600;
  int minutes = (seconds % 3600) / 60;
  int secs = seconds % 60;
  
  char buffer[9];
  sprintf(buffer, "%02d:%02d:%02d", hours, minutes, secs);
  return String(buffer);
}