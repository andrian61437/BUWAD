# BUWAD ANALYSIS PHASE — PRESENTATION SPEAKER SCRIPT
**Week 3 Deliverable Presentation**  
**Date:** September 1, 2026  

---

### **Slide 1: Title Slide**
> *"Good day, respected members of the panel and our thesis adviser. Today, we present the **System Analysis Phase** for our project: **BUWAD: Automated Solar-Powered Fish Drying System with IoT Monitoring and Protective Mechanism**. This presentation details our formal software engineering models, including our Use Case specifications, Data Flow Architecture (DFD), and UML Class design based on our actual dual-core ESP32-S3 and React-Firebase implementation."*

---

### **Slide 2: Analysis Phase Scope**
> *"Our analysis is divided into three core software engineering pillars:*
> 1. *First, **Use Case Modeling**, which defines how human operators interact with the dashboard and how autonomous firmware agents respond to environmental events.*
> 2. *Second, **Data Flow Diagrams**, which map the continuous flow of sensor data across physical pins, FreeRTOS processes, and our Firebase Realtime Database.*
> 3. *Third, **UML Class Architecture**, which models our object-oriented hardware controllers, FreeRTOS background tasks, and cloud gateway."*

---

### **Slide 3 & 4: Use Case Diagram & Specifications**
> *"In our Use Case model, we identify four interacting entities: the **Fish Processor**, the **ESP32-S3 IoT Node**, the **Firebase Cloud Database**, and the **Physical Environment**.*
> 
> *Key use cases include:*
> * **UC-01 & UC-02:** Operator power management and fish profile selection (Danggit vs. Bolinao).
> * **UC-03:** Smart Solar-Adaptive Flipping, where the system dynamically calculates flipping frequency: accelerating to $0.7\times$ interval during peak solar noon ($\ge 70\%$ sunlight, $\ge 32^\circ\text{C}$) to prevent surface case hardening, and stretching to $1.4\times$ during cloud cover.
> * **UC-09:** Automated Rain Ingress Protection, sealing the canopy within 200ms of capacitive rain detection.
> * **UC-10:** Off-Hours Sun Window Hold, which halts tray movement outside the effective 7:00 AM – 4:00 PM solar drying window to prevent night dew reabsorption."*

---

### **Slide 5 & 6: Data Flow Diagrams (Context Level 0 & Level 1)**
> *"In our **Context Level 0 DFD**, the BUWAD system operates as a central IoT hub taking environmental inputs and operator commands, outputting live telemetry and PWM actuation signals.*
> 
> *Decomposing this into **Level 1 DFD**, we have 5 core processes:*
> * **Process 1.0 (Data Acquisition):** Samples DHT11, LDR, and Rain sensors and populates data store `D1: /sensors`.
> * **Process 2.0 (Adaptive Flip Control):** Determines servo angles based on `D3: /settings` and writes logs to `D4`.
> * **Process 3.0 (Weather Protection):** Actuates the canopy servo and fires high-priority alerts.
> * **Process 4.0 (Batch Solar Accounting):** Calculates effective solar elapsed hours and multi-day completion ETA.
> * **Process 5.0 (Web Dashboard Sync):** Manages real-time bi-directional WebSocket communication between the browser and Firebase."*

---

### **Slide 7: UML Class Diagram**
> *"Our **UML Class Diagram** reflects the modular architecture of our actual codebase:*
> * `ESP32Controller` handles pin configurations and the core control loop.
> * `FreeRTOS_LCDTask` runs pinned to **Core 0** in a dedicated FreeRTOS thread, ensuring that 150ms I2C LCD refreshes are never delayed by network traffic.
> * `FirebaseGateway` manages stream callbacks on **Core 1**.
> * `BatchAnalyticsEngine` implements the solar time integration algorithms in the web layer."*

---

### **Slide 8: Summary Table & Compliance**
> *"In conclusion, all diagrams presented strictly adhere to standard UML and DFD notations, accurately represent our operational prototype, and satisfy all criteria required for the Week 3 Analysis Phase deliverable. Thank you, and we are ready for your questions."*
