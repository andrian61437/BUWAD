# BUWAD: Automated Solar Fish Drying System with IoT Monitoring and Protective Mechanism

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Production](https://img.shields.io/badge/Production-Live%20Dashboard-blue)](https://buwad-iot-dashboard.web.app)
[![Hardware](https://img.shields.io/badge/Hardware-ESP32--S3-green)](https://www.espressif.com/en/products/socs/esp32-s3)

**Academic Institution:** University of Southern Philippines Foundation (USPF) — College of Computer Studies, Cebu City, Philippines  
**Capstone Thesis Researchers:** Jonathan II T. Jumao-as & Andrian Jay J. Dimpas  
**Research Adviser:** Boi Archievald Ranay  
**Live Production URL:** [https://buwad-iot-dashboard.web.app](https://buwad-iot-dashboard.web.app)  

---

## 📚 System Documentation Hub

All thesis deliverables and operator guides have been consolidated into structured documentation files:

| Document | File Link | Purpose & Description |
| :--- | :--- | :--- |
| 📖 **User Manual** | [USER_MANUAL.md](USER_MANUAL.md) | **Step-by-step Operator's Manual:** Hardware setup, power switch wiring, batch setup wizard, automated operations, manual overrides, reports export, and troubleshooting. |
| 🏛️ **Master System Documentation** | [BUWAD_SYSTEM_DOCUMENTATION.md](BUWAD_SYSTEM_DOCUMENTATION.md) | **Complete Technical Deliverable:** Combines System Analysis (Use cases UC-01 to UC-12, DFDs), System Design (Tokens, UI modules, ERD, Class diagrams), System Architecture (4-tier topology, FreeRTOS dual-core, pinouts, tech stack), and Defense KPIs & Fail-safes. |

---

## ⚡ Quick System Overview

```
                        +---------------------------------------+
                        |          BUWAD SYSTEM TOPOLOGY        |
                        +---------------------------------------+
                                            |
      +-------------------------------------+-------------------------------------+
      |                                     |                                     |
+---------------+                     +---------------+                     +---------------+
| TIER 1: EDGE  |                     | TIER 2 & 3:   |                     | TIER 4: WEB   |
+---------------+                     +---------------+                     +---------------+
| • ESP32-S3    |                     | • FreeRTOS    |                     | • React 18    |
| • Dual SG90   |--Telemetry / PWM--->|   Dual-Core   |<==WebSocket WSS====>| • Vite 4.5    |
|   Servos      |                     | • Google      |   (Port 443)        | • Tailwind    |
| • Sensors     |                     |   Firebase    |                     | • Live Gauges |
|   (DHT11/LDR/ |                     |   Realtime DB |                     | • PDF / CSV   |
|    Rain)      |                     | • CDN Hosting |                     |   Certificates|
+---------------+                     +---------------+                     +---------------+
```

### Core Capabilities:
1. **Automated 180° Bilateral Tray Inversion:** Precision TowerPro SG90 micro-servo motor inverts the fish tray at scheduled or solar-adaptive intervals, ensuring uniform two-sided curing without manual labor.
2. **Emergency Rain Ingress Protection (<600ms):** Capacitive rain sensor immediately triggers canopy closure within 600ms, sounds an audible siren, and pauses the drying clock.
3. **Solar Window Scheduler (7:00 AM – 4:00 PM):** Automatically pauses batch countdown and servo motion outside daylight hours to prevent evening moisture reabsorption and conserve power.
4. **Cloud-Synchronized Telemetry:** Live temperature, humidity, sunlight, and rain data updated in under 1.5 seconds across mobile and desktop.
5. **Economic Valuation & Quality Certification:** Calculates gross market value, protected harvest loss (₱), labor savings (₱), and exports official PNS/BAFPS 68:2008 compliant PDF certificates.

---

## 🛠️ Technology Stack Summary

* **Microcontroller:** ESP32-S3 DevKitC-1 (Xtensa Dual-Core 240MHz, 2.4GHz Wi-Fi)
* **Actuators:** Dual TowerPro SG90 (9g micro-servos for tray flipping on GPIO 6 and canopy closure on GPIO 7)
* **Sensors:** DHT11 (Temp/Hum on GPIO 4), LDR (Sunlight on GPIO 1), Capacitive Rain Board (GPIO 5)
* **Display:** 1602 I2C Character LCD with PCF8574 backpack (SDA 8, SCL 9)
* **Firmware:** C++ / Arduino Framework / FreeRTOS (Dual-Core tasks on Core 0 and Core 1)
* **Cloud Broker:** Google Firebase Realtime Database (RTDB) & Firebase Hosting
* **Web Frontend:** React 18, Vite 4.5, Tailwind CSS, Framer Motion, jsPDF