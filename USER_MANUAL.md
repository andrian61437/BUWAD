# BUWAD: Automated Solar Fish Drying System with IoT Monitoring and Protective Mechanism
## Official System Operator & User Manual
**Document Version:** 1.0.0 • **Target Hardware:** ESP32-S3 IoT Node • **Firmware:** FreeRTOS Dual-Core  
**Authors:** Jonathan II T. Jumao-as & Andrian Jay J. Dimpas  
**Research Adviser:** Boi Archievald Ranay  
**Institution:** University of Southern Philippines Foundation (USPF) — College of Computer Studies  
**Live Web Dashboard:** [https://buwad-iot-dashboard.web.app](https://buwad-iot-dashboard.web.app)  

---

## 📖 Quick-Reference Operator Card

```
========================================================================================
                               BUWAD QUICK OPERATING CARD
========================================================================================
1. POWER ON:          Flip the physical rocker switch ON. Check LCD: "BUWAD INITIALIZING".
2. WEB DASHBOARD:     Open https://buwad-iot-dashboard.web.app on phone or PC.
3. VERIFY ONLINE:     Confirm green "ESP32 ONLINE" badge appears in header.
4. LOAD FISH:         Spread fish evenly on lower mesh tray; fasten the locking mesh latch.
5. START BATCH:       Click "+ START NEW DRYING BATCH" -> Select Danggit (12h) or Bolinao (7h).
6. CONFIRM LATCH:     Click "✓ DONE PUTTING THE FISH (CONFIRMED)" -> Click "START DRYING".
7. AUTOMATIC DRYING:  System flips tray automatically and closes canopy in <600ms if rain falls.
8. OFF-HOURS:         System automatically holds timer and flipping from 4:00 PM to 7:00 AM.
9. BATCH END:         Click "+ SAVE" -> Click "PDF" for Quality Certificate or "CSV" for data.
========================================================================================
```

---

## 1. What is BUWAD?

**BUWAD** is an automated solar fish drying system designed to modernize artisanal and commercial dried fish processing in coastal communities. Traditional open-air sun drying exposes fish to sudden rainfall, dust, insect pests, and uneven solar exposure, resulting in a **30%–40% post-harvest loss rate** (Bureau of Fisheries and Aquatic Resources, BFAR) and requiring tedious manual turning labor every 30 to 60 minutes.

### Key Capabilities of the System:
* **Automated 180° Bilateral Tray Inversion:** Uses a precision TowerPro SG90 servo motor to rotate the fish tray upside-down and back, ensuring even moisture removal on both sides without manual labor.
* **Instant Rain Ingress Protection (<600ms):** A capacitive rain sensor detects the very first raindrop and immediately seals a protective clear acrylic canopy over the fish in under 600 milliseconds, sounding an audible alarm and voice announcement.
* **Real-Time Climate Telemetry:** Continuously tracks temperature (°C), relative humidity (%), sunlight intensity (%), and rain state, synchronizing live with the cloud every 2 seconds.
* **Solar Operating Window Scheduler (7:00 AM – 4:00 PM):** Automatically suspends the drying timer and motor flips during night hours (4:00 PM to 7:00 AM) to conserve battery power and prevent evening moisture reabsorption.
* **Dual Local & Cloud Displays:** View real-time status right at the dryer using the physical 1602 LCD screen, or from anywhere in the world on a mobile phone or computer via the web dashboard.
* **One-Click Audit & Certification:** Generates official Philippine National Standard (PNS/BAFPS 68:2008) compliant PDF quality certificates and raw CSV spreadsheets upon batch completion.

---

## 2. System Hardware Anatomy & Components

The BUWAD hardware consists of an edge microcontroller, two servo motor actuators, environmental sensors, a local display screen, and a power delivery unit.

```
                           +-------------------------------------+
                           |      BUWAD PHYSICAL MACHINE         |
                           +-------------------------------------+
                                              |
        +-------------------------------------+-------------------------------------+
        |                                     |                                     |
+---------------+                     +---------------+                     +---------------+
|  SENSORS (In) |                     |  CONTROLLER   |                     | ACTUATORS(Out)|
+---------------+                     +---------------+                     +---------------+
| DHT11: Temp & |                     | ESP32-S3      |                     | Inversion     |
|   Humidity    |--GPIO 4------------>| DevKitC-1     |--GPIO 6 (PWM)------>| Servo (SG90)  |
|               |                     | Dual-Core     |                     | (180° Tray)   |
| LDR: Sunlight |--GPIO 1 (ADC)------>| 240MHz        |--GPIO 7 (PWM)------>| Canopy Cover  |
|   Irradiance  |                     | FreeRTOS      |                     | Servo (SG90)  |
|               |                     | 2.4GHz WiFi   |                     | (0°-180°)     |
| Rain Sensor:  |--GPIO 5 (Digital)-->|               |--GPIO 8/9 (I2C)---->| 1602 LCD      |
|   Capacitive  |                     +---------------+                     | Local Display |
+---------------+                             |                             +---------------+
                                              |
                                      +---------------+
                                      | POWER SYSTEM  |
                                      +---------------+
                                      | 5V / 3A DC    |
                                      | Power Supply  |
                                      | Rocker Switch |
                                      +---------------+
```

### Component Details

| Component | Pin / Port | Function in the System |
| :--- | :--- | :--- |
| **ESP32-S3 DevKitC-1** | Master MCU | Dual-core brain running FreeRTOS. Core 0 runs the LCD display; Core 1 runs the sensors, flip logic, and cloud sync. |
| **Inversion Servo (TowerPro SG90)** | GPIO 6 (PWM) | 9g micro-servo motor that rotates the bilateral mesh fish tray a full 180° for two-sided curing. |
| **Canopy Servo (TowerPro SG90)** | GPIO 7 (PWM) | 9g micro-servo motor that sweeps the protective acrylic canopy from 0° (open/solar mode) to 180° (sealed/rain mode). |
| **DHT11 Sensor** | GPIO 4 | Samples chamber temperature (0°C to 50°C) and relative humidity (20% to 90% RH) every second. |
| **LDR Sensor** | GPIO 1 (ADC) | Senses outdoor sunlight brightness, converted into a 0% to 100% solar index. |
| **Capacitive Rain Sensor** | GPIO 5 | Detects water droplets. Digital output goes HIGH instantly upon raindrop contact. |
| **1602 LCD Display (I2C)** | SDA: GPIO 8<br>SCL: GPIO 9 | Dual-line local display (0x27 address) showing temperature, humidity, active batch, and next-flip countdown. |
| **Power Switch (SPST)** | +5V Rail | Cuts or delivers 5V DC power to the entire system. |

### How the Power Switch is Wired

The power switch is wired on the **+5V positive wire** between the 5V/3A DC power adapter and the components:

```
  5V/3A Adapter (+) ──[ ROCKER SWITCH ]──┬──► ESP32-S3 "5V" Pin
                                         ├──► SG90 Servo #1 Red Wire (Flip)
                                         ├──► SG90 Servo #2 Red Wire (Canopy)
                                         └──► 1602 LCD & Sensors VCC

  5V/3A Adapter (−) ──────────────────────┴──► COMMON GND (ESP32 GND, Servos, Sensors, LCD)
```

> ⚠️ **Important Safety Rule:** Always switch the **positive (+5V)** wire, never the ground wire. All components (ESP32, servos, sensors, and LCD) must share a **common ground (GND)**.

---

## 3. Step-by-Step Operating Instructions

### Step 1: Pre-Drying Inspection & Loading Fish
1. Verify the drying machine is placed outdoors on a flat, stable surface exposed to full sunlight, away from tall walls or shadows.
2. Check that the bilateral mesh tray is clean, dry, and free of previous batch residue.
3. Inspect the rain sensor board located on top of the canopy: ensure the surface is clean, dry, and free of dirt or salt crust.
4. **Load the Fish:**
   * Open the top mesh locking frame.
   * Spread fish fillets (**Danggit** or **Bolinao**) evenly across the lower mesh in a single layer. Do not overlap fillets.
   * Close the top mesh frame and **fasten the mechanical latch tightly**.
   * *Why?* The top mesh secures the fish firmly in place so that when the servo inverts the tray 180°, the fish remain securely sandwiched between the two wire meshes without shifting or falling.

```
       [ Top Wire Mesh Screen ]   <-- Keeps fish secure during 180° flip
       ========================
          🐟  🐟  🐟  🐟  🐟      <-- Fish arranged in a single layer
       ========================
       [ Lower Wire Mesh Screen]
```

---

### Step 2: Powering On the Machine
1. Plug the 5V/3A DC power adapter into a wall outlet (or connect your charged 5V battery/solar pack).
2. Flip the physical **rocker switch to the ON position**.
3. **Observe the LCD 1602 Display:**
   * Line 1: `BUWAD INITIALIZING`
   * Line 2: `Connecting WiFi...`
4. Once connected to WiFi, the screen displays:
   * Line 1: `ONLINE | T:32C H:55%`
   * Line 2: `READY: Start Batch`
5. **Servo Zero-Point Check:**
   * The tray servo should align horizontally at 0°.
   * The protective canopy servo should move to the fully open position (0°).

---

### Step 3: Accessing the Web Dashboard
You can monitor and control BUWAD from any smartphone, tablet, or laptop:

1. Open your device's web browser (Google Chrome, Safari, or Microsoft Edge).
2. Navigate to: **[https://buwad-iot-dashboard.web.app](https://buwad-iot-dashboard.web.app)**
3. Look at the top navigation bar:
   * A **green glowing badge** stating **"ESP32 ONLINE"** confirms your physical dryer is communicating with the cloud.
   * The **Solar Window Indicator** displays either **"☀️ ACTIVE SOLAR (7AM-4PM)"** or **"🌙 OFF-HOURS (NIGHT HOLD)"**.
4. **Change Language (Optional):** Click the language toggle button in the header to switch between **English** and **Cebuano-Visayan** (*"Binisaya"*).

---

### Step 4: Starting a Drying Batch (Batch Wizard)

1. On the web dashboard or controls page, click the highlighted **`+ START NEW DRYING BATCH`** button.
2. The **Batch Setup Wizard** modal opens:

```
+--------------------------------------------------------------+
|                START NEW FISH DRYING BATCH                   |
+--------------------------------------------------------------+
| 1. SELECT FISH SPECIES PROFILE:                              |
|    ( ) Danggit (Rabbitfish) - 12 Hours Target Sun Drying     |
|    ( ) Bolinao (Anchovy)    - 7 Hours Target Sun Drying      |
|                                                              |
| 2. VERIFY TRAY LATCH:                                        |
|    [✓] DONE PUTTING THE FISH (CONFIRMED)                     |
|                                                              |
| 3. BATCH WEIGHT & PRICE (Optional for ROI calculation):      |
|    Batch Weight: [ 5.0 ] kg    Market Price: ₱ [ 450 ] / kg  |
|                                                              |
| [ CANCEL ]               [ START DRYING BATCH (VIEW ANALYTICS) ]
+--------------------------------------------------------------+
```

3. **Select Species Profile:**
   * **Danggit (Rabbitfish):** Thicker, split butterflied fish. Sets a target drying period of **12.0 hours of active sunlight** (typically 1.5 to 2 solar days).
   * **Bolinao (Anchovy):** Small, thin whole fish. Sets a target drying period of **7.0 hours of active sunlight** (typically 1 solar day).
4. **Confirm Tray Lock:** You must click the checkbox **`DONE PUTTING THE FISH (CONFIRMED)`**. This safety check prevents accidental automated flipping before fish are properly secured.
5. Click **`START DRYING BATCH`**.
6. The dashboard unlocks:
   * The **Batch Countdown Timer** begins ticking.
   * The **Elapsed Time** starts accumulating.
   * The physical LCD display updates: `DAN: 12h00m / FLIP IN 15m`.

---

## 4. How Automated Operations Work

Once a batch is started, BUWAD manages the drying run autonomously without requiring continuous human presence.

### 4.1 Automated 180° Bilateral Tray Flipping
* **What happens:** At scheduled intervals, the Inversion Servo rotates the mesh tray smoothly from 0° to 180°. On the next flip, it rotates back from 180° to 0°.
* **Why it matters:** Ensures both sides of each fish receive balanced UV radiation and airflow, eliminating labor and preventing moist underside spoilage.
* **Alerts:** 3 seconds before flipping, the web dashboard flashes `"FLIPPING FISH"`, plays a gentle audio chime tone, and increments the batch flip counter by +1.

#### Flipping Modes (Configurable in Controls tab):
* **Timer Mode (Default):** Flips at fixed intervals (e.g., every 30 minutes for Danggit; 15 seconds in presentation demo mode).
* **Smart Solar-Adaptive Mode:** Uses the LDR and DHT11 sensors:
  * **Peak Sunlight ($\ge 70\%$ Sun, $\ge 32^\circ\text{C}$):** Flips more frequently to prevent surface *case-hardening* (where the outer fish skin dries into a hard crust while the inside stays raw).
  * **Low Sunlight / Overcast ($<40\%$ Sun):** Lengthens the interval to conserve battery power.
  * *Safety feature:* Enforces a mandatory 1-hour cooldown between flips so fish are not turned unnecessarily.

---

### 4.2 Automated Emergency Rain Protection
Rain is the single greatest hazard in sun drying—a sudden shower can spoil an entire harvest in minutes.

```
1. Raindrop strikes sensor board (GPIO 5)
                     │
                     ▼
2. ESP32 detects signal in <10ms
                     │
                     ▼
3. Canopy Servo sweeps to 180° (CLOSED) in <600ms
                     │
                     ▼
4. Audible rain siren sound + Voice alert:
   "Warning: Rain detected. Protective canopy is closing."
                     │
                     ▼
5. Batch countdown & flipping are PAUSED
                     │
                     ▼
6. Once sensor dries -> Canopy reopens (0°) -> Drying resumes
```

* **Reaction Time:** Less than **600 milliseconds** from the first droplet contact until the canopy seals shut.
* **Auto-Recovery:** When rain ceases and solar heat dries the sensor surface, the canopy automatically sweeps back to 0° (open), and the drying countdown resumes automatically.

---

### 4.3 Solar Drying Window & Night Hold (7:00 AM – 4:00 PM)
* Traditional dried fish should only be cured under active daylight ($07:00$ to $16:00$). Leaving fish uncovered at night causes them to reabsorb evening humidity, marine mist, and dew.
* **At 4:00 PM:** BUWAD automatically enters **`OFF-HOURS (NIGHT HOLD)`**.
  * The countdown timer halts.
  * The inversion servo is disabled to prevent unnecessary night-time battery drain.
  * The web dashboard and physical LCD show: `[NIGHT HOLD] Resumes 7:00 AM`.
* **At 7:00 AM the next morning:** The system automatically wakes up, resumes the batch countdown, and restores scheduled flipping.

---

## 5. Manual Controls & Emergency Overrides

If you ever need to manually inspect the fish or intervene, the **Controls** tab provides immediate physical overrides:

| Control Button | Action Triggered | When to Use |
| :--- | :--- | :--- |
| **`MANUAL FLIP FISH TRAY`** | Rotates the tray 180° immediately. | When you visually inspect the fish and want to turn them right away without waiting for the timer. |
| **`CLOSE CANOPY (MANUAL)`** | Rotates canopy servo to 180° (sealed). | To close the cover manually if you see dark rain clouds approaching or to protect against flies/birds. |
| **`OPEN CANOPY (MANUAL)`** | Rotates canopy servo to 0° (open). | To reopen the cover after manual closure once the sky clears. |
| **`RUN 5-STEP SELF-TEST`** | Performs a full hardware diagnosis: flips tray, cycles canopy, reads sensors, tests LCD. | Before every morning drying run to verify servos and sensors are operating correctly. |
| **`PAUSE / RESUME BATCH`** | Temporarily pauses or restarts the countdown. | While temporarily adding or removing samples for weight inspection. |

---

## 6. Batch Completion, Reports & Quality Records

### 6.1 Ending the Batch
When the target drying duration is reached (e.g., 12 hours for Danggit), the system notifies you:
* Web Dashboard displays: **`BATCH COMPLETE: Target Drying Time Achieved`**.
* The audio synthesizer plays a completion chime.
* The physical LCD display reads: `BATCH COMPLETE / Remove Fish`.

### 6.2 Saving to Batch History
1. Navigate to the **Analytics** view.
2. Click the compact **`+ SAVE`** button on the toolbar.
3. The completed run is permanently archived into your local batch history ledger.

### 6.3 Exporting Official Documents
From the Analytics toolbar, you can download two export formats:

#### 1. Official PDF Batch Certificate (`PDF` button)
Generates a printable, formal batch audit certificate complete with:
* University of Southern Philippines Foundation header.
* Batch metadata (Species, start/end dates, total solar drying hours, total flips).
* Microclimate summary (Average temperature, humidity, peak sunlight).
* PNS/BAFPS 68:2008 Philippine National Standards compliance evaluation checklist.
* Sign-off signature blocks for the Quality Inspector and Plant Manager.

#### 2. Raw CSV Telemetry Spreadsheet (`CSV` button)
Downloads a 17-column `.csv` spreadsheet formatted with UTF-8 BOM, fully compatible with **Microsoft Excel**, **Google Sheets**, and **SPSS**, containing timestamped environmental and economic data points for research or commercial inventory tracking.

---

## 7. Cleaning, Maintenance & Safety Guidelines

To maintain hygiene and ensure long hardware life, follow these practices:

### Daily Care:
* **Cleaning the Mesh Trays:** After removing dried fish, wipe the stainless wire mesh with warm water and a food-grade sponge. Allow trays to dry completely before the next batch.
* **Cleaning the Rain Sensor:** Use a dry, lint-free cloth to gently wipe salt dust, marine residue, or water droplets off the gold/silver traces on the rain sensor board. Salt buildup can cause false rain detections.
* **Keeping Electronics Dry:** The ESP32 microcontroller, breadboard/PCB, and servo motors are housed in an electronics enclosure. **Never spray pressurized water directly at the electronics box or servo motors.**

### Weekly Maintenance:
* **Servo Horn Inspection:** Check the small screws holding the white plastic servo horns to the SG90 gear shafts. Tighten gently if loose.
* **Wire Check:** Ensure the 5V and GND power cables are securely seated in their terminals.

---

## 8. Troubleshooting Guide

| Problem / Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **Web Dashboard shows "ESP32 OFFLINE"** | 1. Power adapter is unplugged.<br>2. Rocker switch is OFF.<br>3. WiFi name/password changed. | 1. Check that the 5V adapter is firmly plugged in.<br>2. Confirm the physical rocker switch is flipped ON.<br>3. Verify the WiFi hotspot has internet access. |
| **LCD screen is blank or shows garbled text** | Motor electrical noise (back-EMF) temporarily interfered with the I2C bus. | The ESP32 firmware includes an **Auto-Healing Routine** that resets the LCD automatically every 15 seconds. If it remains blank, power cycle the rocker switch. |
| **Servo motor chatters or does not flip the tray** | 1. Tray latch is physically obstructed.<br>2. Power adapter current is below 3A.<br>3. Loose servo signal wire. | 1. Check that the mesh tray rotates freely without catching on the frame.<br>2. Ensure the power supply is rated at **5V / 3A** (servos require up to 1A during movement).<br>3. Check yellow/orange signal wire on GPIO 6. |
| **Canopy closes when it is not raining (False alarm)** | Salt residue, sea spray, or moisture droplets on the rain sensor board. | Wipe the capacitive rain sensor board dry with a clean cloth. Clean off any white salt crust. |
| **Batch countdown timer is not moving** | Current time is outside 7:00 AM – 4:00 PM (Off-hours night hold). | Normal system behavior. The timer automatically resumes at 7:00 AM the following morning. |
| **Temperature/Humidity shows 0°C or Error** | DHT11 sensor loose or disconnected on GPIO 4. | Power off the switch, press the DHT11 firmly into its socket/pins, and power back on. |

---

## 9. Technical Specifications Reference

```
========================================================================================
                               TECHNICAL SPECIFICATIONS
========================================================================================
Microcontroller:          ESP32-S3 DevKitC-1 (Xtensa Dual-Core 32-bit LX7 @ 240MHz)
Wireless Connectivity:    2.4 GHz Wi-Fi (802.11 b/g/n)
Operating System:         FreeRTOS (Dual-Core Real-Time Scheduling)
Power Input:              Regulated 5.0V DC / 3.0A (via external adapter or 2S buck)
Inversion Actuator:       TowerPro SG90 9g Micro Servo (GPIO 6, 50Hz PWM, 180° sweep)
Canopy Actuator:          TowerPro SG90 9g Micro Servo (GPIO 7, 50Hz PWM, 180° sweep)
Temperature & Humidity:   DHT11 Sensor (GPIO 4, Single-Bus Digital, 0-50°C, 20-90% RH)
Sunlight Sensor:          LDR Light Dependent Resistor (GPIO 1, ADC 12-bit, 0-100% Index)
Rain Sensor:              Capacitive Rain Detection Board (GPIO 5, Digital Interrupt)
Local Hardware Display:   1602 I2C Character LCD with PCF8574 Backpack (0x27, GPIO 8/9)
Cloud Backend:            Google Firebase Realtime Database (RTDB) via WebSocket (WSS)
Frontend Web Stack:       React 18, Vite 4.5, Tailwind CSS, Framer Motion
Supported Fish Profiles:  Danggit (12h Target) | Bolinao (7h Target)
Solar Drying Window:      7:00 AM to 4:00 PM Philippine Standard Time (UTC+8)
Emergency Rain Latency:   <600 milliseconds from droplet contact to sealed closure
========================================================================================
```
