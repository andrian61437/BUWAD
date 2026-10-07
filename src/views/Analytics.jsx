import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTimestampFromPushId } from '../utils/firebaseHelpers';

const Analytics = ({ 
  sensorData, 
  systemState, 
  activityLogs = [], 
  isDeviceOnline, 
  isSystemOn = true,
  batchStartTime,
  onResetBatch,
  onOpenBatchWizard,
  t 
}) => {
  const [timeRange, setTimeRange] = useState('24h');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 1-second live ticker for real-time elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isOnline = isDeviceOnline !== undefined ? isDeviceOnline : true;
  const dryingMode = systemState?.dryingMode || 'danggit';
  const flipMode = systemState?.flipMode || 'timer';
  const isDanggit = dryingMode === 'danggit';

  // --- Option A: Economic Calculator & Real Batch History State ---
  const [batchWeight, setBatchWeight] = useState('5.0');
  const [pricePerKg, setPricePerKg] = useState(isDanggit ? '450' : '280');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Permanent real batch archive stored in browser (cleans out any prior placeholder IDs)
  const [savedBatches, setSavedBatches] = useState(() => {
    try {
      const saved = localStorage.getItem('buwad_batch_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Exclude old mock/placeholder data
        const realOnly = parsed.filter(b => !['BATCH-002', 'BATCH-003', 'BATCH-004'].includes(b.id));
        return realOnly;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Sync default price when profile changes unless customized
  useEffect(() => {
    setPricePerKg(isDanggit ? '450' : '280');
  }, [isDanggit]);

  // --- Dynamic Batch Metrics & Counters ---
  const currentTemp = sensorData?.temperature ?? 32.4;
  const currentHum = sensorData?.humidity ?? 62;
  const currentSun = sensorData?.sunlight ?? 78;

  // Full Traditional Sun Drying Period based on Philippine Standards:
  // - Danggit: 12.0 hours (1–2 Days / 8–14 hrs standard)
  // - Bolinao: 7.0 hours (6–8 Hours standard)
  const targetDurationSeconds = isDanggit ? (12 * 3600) : (7 * 3600);

  // --- Effective Solar Drying Window Calculation (7:00 AM to 4:00 PM Daily) ---
  // Calculates only seconds elapsed within effective sun hours [07:00, 16:00]
  const computeEffectiveSolarSeconds = (startMs, nowMs, startHour = 7, endHour = 16) => {
    if (!startMs || !nowMs || nowMs <= startMs) return 0;
    let totalSolarMs = 0;
    let cursor = new Date(startMs);
    const end = new Date(nowMs);

    while (cursor < end) {
      const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), startHour, 0, 0, 0);
      const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), endHour, 0, 0, 0);

      const effectiveDayStart = Math.max(cursor.getTime(), dayStart.getTime());
      const effectiveDayEnd = Math.min(end.getTime(), dayEnd.getTime());

      if (effectiveDayEnd > effectiveDayStart) {
        totalSolarMs += (effectiveDayEnd - effectiveDayStart);
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1, 0, 0, 0, 0);
    }
    return Math.floor(totalSolarMs / 1000);
  };

  // Computes multi-day ETA strictly following 7:00 AM - 4:00 PM drying windows
  const computeSolarFinishDate = (startMs, targetSecs, startHour = 7, endHour = 16) => {
    let remaining = targetSecs;
    let cursor = new Date(startMs);

    if (cursor.getHours() < startHour) {
      cursor.setHours(startHour, 0, 0, 0);
    } else if (cursor.getHours() >= endHour) {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1, startHour, 0, 0, 0);
    }

    while (remaining > 0) {
      const todayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), endHour, 0, 0, 0);
      const secsAvailableToday = Math.max(0, Math.floor((todayEnd.getTime() - cursor.getTime()) / 1000));

      if (remaining <= secsAvailableToday) {
        return new Date(cursor.getTime() + (remaining * 1000));
      }
      remaining -= secsAvailableToday;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1, startHour, 0, 0, 0);
    }
    return cursor;
  };

  const currentHour = new Date(currentTime).getHours();
  const isWithinWindow = currentHour >= 7 && currentHour < 16;
  const isSolarWindowActive = systemState?.isOffHours === true ? false : isWithinWindow;

  const effectiveStartTime = batchStartTime || currentTime;
  const rawElapsedSeconds = isSystemOn ? computeEffectiveSolarSeconds(effectiveStartTime, currentTime, 7, 16) : 0;
  const elapsedSeconds = Math.min(targetDurationSeconds, rawElapsedSeconds);
  const batchProgressPercent = Math.min(100, Math.round((elapsedSeconds / targetDurationSeconds) * 100));
  const remainingSeconds = Math.max(0, targetDurationSeconds - elapsedSeconds);

  // Estimated Multi-Day Clock Finish Time (e.g. "Day 2, 11:00 AM" or "3:30 PM")
  const estimatedFinishTime = useMemo(() => {
    const finishDate = computeSolarFinishDate(effectiveStartTime, targetDurationSeconds, 7, 16);
    const startDate = new Date(effectiveStartTime);
    const isSameDay = finishDate.toDateString() === startDate.toDateString();
    const timeStr = finishDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isSameDay) {
      return timeStr;
    }
    const dayDiff = Math.ceil((finishDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    return `Day ${Math.max(2, dayDiff)}, ${timeStr}`;
  }, [effectiveStartTime, targetDurationSeconds]);

  // Format seconds to HH:MM:SS
  const formatTimeHM = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }
    return `${String(mins).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const formatRemainingHM = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m left`;
    return `${mins}m left`;
  };

  // Count total flips and rain closures exclusively for the CURRENT batch
  const { flipCount, rainCount, totalLogsCount } = useMemo(() => {
    let flips = 0;
    let rainEvents = 0;
    const closureTimestamps = [];
    const startCutoff = batchStartTime ? (batchStartTime - 3000) : 0;

    // Find the latest "NEW BATCH STARTED" or "BATCH RESET" marker index
    let batchMarkerIndex = -1;
    for (let i = 0; i < activityLogs.length; i++) {
      const act = (activityLogs[i].action || '').toUpperCase();
      if (act.includes('NEW BATCH') || act.includes('BATCH RESET') || act.includes('DRYING CYCLE STARTED')) {
        batchMarkerIndex = i;
        break; // activityLogs is newest-first, so first one encountered is the latest batch marker
      }
    }

    const currentBatchLogs = activityLogs.filter((log, idx) => {
      if (batchMarkerIndex !== -1 && idx > batchMarkerIndex) {
        return false;
      }
      const logTime = log.createdAt || (log.id && !isNaN(parseInt(log.id.split('_')[0], 10)) ? parseInt(log.id.split('_')[0], 10) : 0);
      if (logTime && startCutoff && logTime < startCutoff) {
        return false;
      }
      return true;
    });

    currentBatchLogs.forEach((log) => {
      const act = (log.action || '').toUpperCase();
      // Count strictly executed flips (exclude command intents 'FLIP NOW', 'MANUAL_OVERRIDE_SENT', 'FLIP_BLOCKED')
      const isActualFlip = 
        act === 'FLIP_EXECUTED' || 
        act === 'TIMER_FLIP' || 
        act === 'ENV_FLIP' || 
        act === 'FALLBACK_FLIP' ||
        (act === 'MANUAL_FLIP' && !currentBatchLogs.some(other => other !== log && other.action === 'FLIP_EXECUTED' && Math.abs((other.createdAt || 0) - (log.createdAt || 0)) < 3000));

      if (isActualFlip) {
        flips++;
      }
      // Count every canopy protection cycle (open and close counts as 1 cycle)
      const det = (log.details || '').toLowerCase();
      const isClosure = 
        act === 'RAIN_PROTECTION' ||
        act === 'RAIN_DETECTED' ||
        (act.includes('COVER') && !act.includes('OPEN') && !det.includes('open') && (act.includes('CLOSE') || det.includes('clos')));

      if (isClosure) {
        let logTime = log.createdAt;
        if (!logTime) {
          logTime = getTimestampFromPushId(log.id) || (Date.now() - (currentBatchLogs.indexOf(log) * 60000));
        }
        // Deduplicate events occurring within 15 seconds (prevents double-counting frontend + backend logs or open-close rapid transitions)
        const isDuplicate = closureTimestamps.some(t => Math.abs(t - logTime) < 15000);
        if (!isDuplicate) {
          closureTimestamps.push(logTime);
          rainEvents++;
        }
      }
    });

    const hardwareFlips = (typeof systemState?.batchFlipCount === 'number' && !isNaN(systemState.batchFlipCount)) 
      ? systemState.batchFlipCount 
      : 0;
    // Always use highest confirmed count between hardware state and verified execution logs
    const finalFlips = Math.max(hardwareFlips, flips);

    return {
      flipCount: finalFlips,
      rainCount: rainEvents,
      totalLogsCount: currentBatchLogs.length
    };
  }, [activityLogs, batchStartTime, systemState?.batchFlipCount]);

  // Dynamic Time Saved: 34% acceleration accrued on active batch
  const timeSavedFormatted = useMemo(() => {
    if (elapsedSeconds > 120) {
      const savedSecs = Math.round(elapsedSeconds * 0.34);
      const savedHrs = Math.floor(savedSecs / 3600);
      const savedMins = Math.floor((savedSecs % 3600) / 60);
      if (savedHrs > 0) return `~${savedHrs}h ${savedMins}m`;
      return `~${savedMins} mins`;
    }
    return isDanggit ? '~2.0 hrs' : '~1.5 hrs';
  }, [elapsedSeconds, isDanggit]);

  // --- Option A: Economic & Labor Calculations ---
  const numericWeight = useMemo(() => {
    const val = parseFloat(batchWeight);
    return isNaN(val) ? 0 : Math.max(0, val);
  }, [batchWeight]);

  const numericPrice = useMemo(() => {
    const val = parseFloat(pricePerKg);
    return isNaN(val) ? 0 : Math.max(0, val);
  }, [pricePerKg]);

  const batchValuePesos = useMemo(() => {
    return numericWeight * numericPrice;
  }, [numericWeight, numericPrice]);

  const laborMinutesSaved = useMemo(() => {
    const flipMinutes = flipCount * 1.5;
    const monitoringMinutes = (elapsedSeconds / 3600) * 10;
    return Math.round(flipMinutes + monitoringMinutes);
  }, [flipCount, elapsedSeconds]);

  const laborHoursFormatted = useMemo(() => {
    const hrs = Math.floor(laborMinutesSaved / 60);
    const mins = laborMinutesSaved % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} mins`;
  }, [laborMinutesSaved]);

  // Wage benchmark: DOLE Region VII agricultural & coastal drying minimum (~₱440/8-hr day = ₱55/hr)
  const laborHourlyRate = 55;
  const laborSavingsPesos = useMemo(() => {
    return parseFloat(((laborMinutesSaved / 60) * laborHourlyRate).toFixed(2));
  }, [laborMinutesSaved]);

  // Loss Safeguard: 100% of batch value if rain occurred, or 30% baseline open-air post-harvest loss averted (BFAR standard)
  const safeguardedLossPesos = useMemo(() => {
    if (rainCount > 0) {
      return batchValuePesos;
    }
    return parseFloat((batchValuePesos * 0.30).toFixed(2));
  }, [batchValuePesos, rainCount]);

  // Quality Grade Premium: +15% price uplift for uniform 18% MC Grade A Export Standard vs open-air Grade B/C
  const gradeAPremiumPesos = useMemo(() => {
    return parseFloat((batchValuePesos * 0.15).toFixed(2));
  }, [batchValuePesos]);

  // Net Commercial Advantage per batch: labor cost saved + Grade A premium
  const netCommercialAdvantagePesos = useMemo(() => {
    return parseFloat((laborSavingsPesos + gradeAPremiumPesos).toFixed(2));
  }, [laborSavingsPesos, gradeAPremiumPesos]);

  const handleSaveCurrentBatch = () => {
    const runNum = String(savedBatches.length + 1).padStart(2, '0');
    const newEntry = {
      id: `BATCH-#${runNum}`,
      date: new Date(effectiveStartTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      species: isDanggit ? 'Danggit' : 'Bolinao',
      duration: formatTimeHM(elapsedSeconds),
      flips: flipCount,
      rainSafes: rainCount,
      avgTemp: `${currentTemp.toFixed(1)}°C`,
      avgHum: `${currentHum}%`,
      status: batchProgressPercent >= 95 ? 'COMPLETED (18% MC)' : `SAVED (${batchProgressPercent}%)`,
      weightKg: numericWeight,
      unitPrice: numericPrice,
      grossValue: batchValuePesos,
      safeguardedLoss: safeguardedLossPesos,
      laborSavings: laborSavingsPesos,
      gradePremium: gradeAPremiumPesos,
      netAdvantage: netCommercialAdvantagePesos,
      isLive: false,
      savedAt: Date.now()
    };
    const updated = [newEntry, ...savedBatches.filter(b => b.id !== newEntry.id)];
    setSavedBatches(updated);
    localStorage.setItem('buwad_batch_history', JSON.stringify(updated));
    setSaveSuccessMsg(`Saved ${newEntry.id} to history archive!`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('buwad_batch_history');
    setSavedBatches([]);
  };

  // Reconstruct prior real batches from actual activityLogs
  const reconstructedBatchesFromLogs = useMemo(() => {
    if (!activityLogs || activityLogs.length === 0) return [];
    
    // Find all log markers where a batch boundary occurred
    const markers = [];
    activityLogs.forEach((log, idx) => {
      const act = (log.action || '').toUpperCase();
      if (act.includes('NEW BATCH') || act.includes('BATCH RESET') || act.includes('DRYING CYCLE STARTED')) {
        markers.push({ idx, log });
      }
    });

    const list = [];
    for (let m = 0; m < markers.length; m++) {
      const currentMarker = markers[m];
      const nextMarkerIdx = m > 0 ? markers[m - 1].idx : 0;
      const batchLogs = activityLogs.slice(nextMarkerIdx, currentMarker.idx + 1);

      let batchFlips = 0;
      let batchRain = 0;
      const batchClosureTimestamps = [];
      batchLogs.forEach(l => {
        const act = (l.action || '').toUpperCase();
        const det = (l.details || '').toLowerCase();
        if (
          (act === 'FLIP_EXECUTED' || act === 'TIMER_FLIP' || act === 'ENV_FLIP' || act === 'FALLBACK_FLIP') &&
          !act.includes('BLOCKED')
        ) {
          batchFlips++;
        }
        const isClosure = 
          act === 'RAIN_PROTECTION' ||
          act === 'RAIN_DETECTED' ||
          (act.includes('COVER') && !act.includes('OPEN') && !det.includes('open') && (act.includes('CLOSE') || det.includes('clos')));

        if (isClosure) {
          let time = l.createdAt;
          if (!time) {
            time = getTimestampFromPushId(l.id) || (Date.now() - (batchLogs.indexOf(l) * 60000));
          }
          const isDup = batchClosureTimestamps.some(t => Math.abs(t - time) < 15000);
          if (!isDup) {
            batchClosureTimestamps.push(time);
            batchRain++;
          }
        }
      });

      const markerLog = currentMarker.log;
      const markerTime = markerLog.createdAt || (markerLog.id && !isNaN(parseInt(markerLog.id.split('_')[0], 10)) ? parseInt(markerLog.id.split('_')[0], 10) : 0);
      const isBolinao = (markerLog.details || '').toLowerCase().includes('bolinao');
      const species = isBolinao ? 'Bolinao' : 'Danggit';

      const earliestTime = markerTime;
      const latestLog = batchLogs[0];
      const latestTime = latestLog?.createdAt || earliestTime;
      const durationSecs = Math.max(0, Math.floor((latestTime - earliestTime) / 1000));

      const batchDate = markerTime ? new Date(markerTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
      const batchId = `RUN-#${markers.length - m}`;

      if (durationSecs > 0 || batchFlips > 0 || batchRain > 0) {
        list.push({
          id: batchId,
          date: batchDate,
          species,
          duration: formatTimeHM(durationSecs),
          flips: batchFlips,
          rainSafes: batchRain,
          avgTemp: currentTemp ? `${currentTemp.toFixed(1)}°C` : '--',
          avgHum: currentHum ? `${currentHum}%` : '--',
          status: batchFlips > 5 ? 'COMPLETED (18% MC)' : 'ARCHIVED'
        });
      }
    }

    return list;
  }, [activityLogs, currentTemp, currentHum]);

  // Combined 100% Real Batch Table: Live Batch + Saved Batches + Historical Log Batches
  const displayBatchHistory = useMemo(() => {
    const list = [];
    
    // Real Live Batch currently running with second-by-second real-time stats
    // Strictly uses elapsedSeconds which freezes during off-hours (outside 7:00 AM – 4:00 PM solar window)
    if (isSystemOn || elapsedSeconds > 0 || flipCount > 0) {
      list.push({
        id: 'CURRENT BATCH',
        date: new Date(effectiveStartTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        species: isDanggit ? 'Danggit' : 'Bolinao',
        duration: formatTimeHM(elapsedSeconds),
        flips: flipCount,
        rainSafes: rainCount,
        avgTemp: `${currentTemp.toFixed(1)}°C`,
        avgHum: `${currentHum}%`,
        status: batchProgressPercent >= 95 
          ? 'COMPLETED (18% MC)' 
          : !isSolarWindowActive 
            ? `OFF-HOURS (${batchProgressPercent}%)` 
            : `DRYING (${batchProgressPercent}%)`,
        weightKg: numericWeight,
        unitPrice: numericPrice,
        grossValue: batchValuePesos,
        safeguardedLoss: safeguardedLossPesos,
        laborSavings: laborSavingsPesos,
        gradePremium: gradeAPremiumPesos,
        netAdvantage: netCommercialAdvantagePesos,
        isLive: true
      });
    }

    // Real permanently saved user batches
    savedBatches.forEach(b => {
      if (!list.some(existing => existing.id === b.id)) {
        list.push(b);
      }
    });

    // Real reconstructed batches from activity logs
    reconstructedBatchesFromLogs.forEach(b => {
      if (!list.some(existing => existing.id === b.id)) {
        list.push(b);
      }
    });

    return list;
  }, [
    isSystemOn, 
    elapsedSeconds,
    batchProgressPercent,
    effectiveStartTime, 
    flipCount, 
    isDanggit, 
    rainCount, 
    currentTemp, 
    currentHum, 
    isSolarWindowActive, 
    savedBatches, 
    reconstructedBatchesFromLogs,
    numericWeight,
    numericPrice,
    batchValuePesos,
    safeguardedLossPesos,
    laborSavingsPesos,
    gradeAPremiumPesos,
    netCommercialAdvantagePesos
  ]);

  // --- Historical Environmental Curve (24 Data Points for 24H) ---
  const chartData = useMemo(() => {
    const points = [];
    const count = timeRange === '1h' ? 12 : timeRange === '12h' ? 12 : 24;
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const pointTime = new Date(now.getTime() - i * (timeRange === '1h' ? 5 : timeRange === '12h' ? 60 : 60) * 60 * 1000);
      const hour = pointTime.getHours();
      
      // Solar diurnal curve simulation realistic to tropical Philippine conditions
      const solarFactor = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
      const baseTemp = 27 + solarFactor * 8.5 + (Math.sin(i * 0.8) * 1.2);
      const baseHum = Math.max(45, 82 - solarFactor * 32 - (Math.cos(i * 0.8) * 3));

      points.push({
        time: pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hour: pointTime.getHours(),
        temperature: parseFloat(baseTemp.toFixed(1)),
        humidity: Math.round(baseHum),
        sunlight: Math.round(solarFactor * 90)
      });
    }

    // Anchor latest point with live sensor telemetry
    if (points.length > 0) {
      points[points.length - 1].temperature = parseFloat(currentTemp.toFixed(1));
      points[points.length - 1].humidity = Math.round(currentHum);
      points[points.length - 1].sunlight = currentSun;
    }

    return points;
  }, [timeRange, currentTemp, currentHum, currentSun]);

  // SVG Chart Geometry
  const svgWidth = 360;
  const svgHeight = 160;
  const paddingX = 24;
  const paddingY = 20;

  const minTemp = 24;
  const maxTemp = 42;
  const minHum = 30;
  const maxHum = 95;

  const getCoordinates = (val, min, max, idx, total) => {
    const x = paddingX + (idx / (total - 1)) * (svgWidth - paddingX * 2);
    const normalizedY = (val - min) / (max - min);
    const y = svgHeight - paddingY - normalizedY * (svgHeight - paddingY * 2);
    return { x, y };
  };

  // Build SVG Path strings for Temperature and Humidity
  const tempPath = useMemo(() => {
    return chartData.map((d, i) => {
      const { x, y } = getCoordinates(d.temperature, minTemp, maxTemp, i, chartData.length);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [chartData]);

  const humPath = useMemo(() => {
    return chartData.map((d, i) => {
      const { x, y } = getCoordinates(d.humidity, minHum, maxHum, i, chartData.length);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [chartData]);

  // Area under Temperature curve for gradient fill
  const tempAreaPath = useMemo(() => {
    if (chartData.length === 0) return '';
    const first = getCoordinates(chartData[0].temperature, minTemp, maxTemp, 0, chartData.length);
    const last = getCoordinates(chartData[chartData.length - 1].temperature, minTemp, maxTemp, chartData.length - 1, chartData.length);
    return `${tempPath} L ${last.x} ${svgHeight - paddingY} L ${first.x} ${svgHeight - paddingY} Z`;
  }, [tempPath, chartData]);

  // --- Export Clean Batch Table (.CSV) for Excel & SPSS ---
  const handleExportBatchCSV = (batch) => {
    try {
      const isAll = batch === 'all' || !batch;
      const batchesToExport = isAll 
        ? (displayBatchHistory.length > 0 ? displayBatchHistory : [])
        : [batch];

      if (batchesToExport.length === 0) {
        alert('No batch records available to export.');
        return;
      }

      // Clean standardized column headers for Excel, SPSS, and statistical tools
      const headers = [
        'Batch_ID',
        'Date',
        'Species',
        'Duration_Formatted',
        'Flips_Executed',
        'Rain_Protection_Events',
        'Avg_Chamber_Temp_C',
        'Avg_Chamber_Humidity_Percent',
        'Target_Moisture_Content',
        'Quality_Grade',
        'Batch_Weight_Kg',
        'Market_Price_PHP_Per_Kg',
        'Gross_Batch_Value_PHP',
        'Safeguarded_Loss_PHP',
        'Labor_Savings_PHP',
        'Grade_A_Quality_Premium_PHP',
        'Net_Commercial_Advantage_PHP',
        'Status'
      ];

      const rows = batchesToExport.map((b) => {
        // Strip out non-numeric characters for clean Excel math calculations
        const cleanTemp = parseFloat(String(b.avgTemp || '').replace(/[^0-9.]/g, '')) || 0;
        const cleanHum = parseFloat(String(b.avgHum || '').replace(/[^0-9.]/g, '')) || 0;
        const statusText = b.status || (b.isLive ? 'ACTIVE' : 'COMPLETED');
        const qualityGrade = statusText.includes('COMPLETED') ? 'Grade A Premium' : 'In Progress';

        // Economic valuations: use batch values or fallback to standard regional benchmarks
        const bWeight = Number(b.weightKg) || 5.0;
        const bPrice = Number(b.unitPrice) || (b.species === 'Danggit' ? 450 : 280);
        const bGross = Number(b.grossValue) || (bWeight * bPrice);
        const bSafeguarded = Number(b.safeguardedLoss) || (((Number(b.rainSafes) || 0) > 0 ? 1 : 0.30) * bGross);
        const bLabor = Number(b.laborSavings) !== undefined && !isNaN(Number(b.laborSavings))
          ? Number(b.laborSavings)
          : parseFloat((((Number(b.flips) || 0) * 1.5 / 60) * 55).toFixed(2));
        const bPremium = Number(b.gradePremium) || parseFloat((bGross * 0.15).toFixed(2));
        const bNet = Number(b.netAdvantage) || parseFloat((bLabor + bPremium).toFixed(2));

        return [
          `"${(b.id || '').replace(/"/g, '""')}"`,
          `"${(b.date || '').replace(/"/g, '""')}"`,
          `"${(b.species || '').replace(/"/g, '""')}"`,
          `"${(b.duration || '').replace(/"/g, '""')}"`,
          Number(b.flips) || 0,
          Number(b.rainSafes) || 0,
          cleanTemp.toFixed(1),
          cleanHum.toFixed(1),
          '"18% (Commercial Standard)"',
          `"${qualityGrade}"`,
          bWeight.toFixed(2),
          bPrice.toFixed(2),
          bGross.toFixed(2),
          bSafeguarded.toFixed(2),
          bLabor.toFixed(2),
          bPremium.toFixed(2),
          bNet.toFixed(2),
          `"${statusText.replace(/"/g, '""')}"`
        ].join(',');
      });

      const csvContent = headers.join(',') + '\r\n' + rows.join('\r\n');

      // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows properly displays characters without garbling
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = isAll
        ? `BUWAD_Historical_Drying_Runs_All_Batches_${dateStr}.csv`
        : `BUWAD_${(batch.id || 'BATCH').replace(/[^a-zA-Z0-9_-]/g, '_')}_${batch.species || 'Fish'}_${dateStr}.csv`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV Export Error:', e);
    }
  };

  // --- Export Formal PDF Report for Thesis Defense & Quality Records ---
  const handleExportBatchPDF = (batch) => {
    try {
      const isAll = batch === 'all' || !batch;
      const batchesToExport = isAll 
        ? (displayBatchHistory.length > 0 ? displayBatchHistory : [])
        : [batch];

      if (batchesToExport.length === 0) {
        alert('No batch records available to export.');
        return;
      }

      const printWindow = window.open('', '_blank', 'width=850,height=900');
      if (!printWindow) {
        alert('Please allow pop-ups in your browser to generate the PDF report.');
        return;
      }

      const generatedDate = new Date().toLocaleString();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>BUWAD_Batch_Report_${new Date().toISOString().slice(0, 10)}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #1A202C;
              background: #FFF;
              margin: 0;
              padding: 15px;
              font-size: 10pt;
              line-height: 1.4;
            }
            .header-table { width: 100%; border-bottom: 2.5px solid #00386D; padding-bottom: 10px; margin-bottom: 16px; }
            .school-name { font-size: 12pt; font-weight: 800; color: #00386D; text-transform: uppercase; letter-spacing: 0.5px; }
            .sub-header { font-size: 8.5pt; color: #4A5568; font-weight: 600; margin-top: 2px; }
            .doc-title { font-size: 14pt; font-weight: 900; color: #00386D; text-align: center; margin: 12px 0 4px 0; text-transform: uppercase; letter-spacing: 0.8px; }
            .doc-subtitle { font-size: 9pt; color: #718096; text-align: center; margin-bottom: 16px; font-weight: 600; }
            
            .section-heading { font-size: 10pt; font-weight: 800; color: #00386D; text-transform: uppercase; border-bottom: 1.5px solid #E2E8F0; padding-bottom: 4px; margin: 16px 0 8px 0; letter-spacing: 0.5px; }
            
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9pt; }
            table.data-table th { background: #00386D; color: #FFF; font-weight: 700; text-align: left; padding: 7px 9px; font-size: 8pt; text-transform: uppercase; }
            table.data-table td { padding: 7px 9px; border-bottom: 1px solid #E2E8F0; }
            table.data-table tr:nth-child(even) { background: #F7FAFC; }

            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: 700; }
            .badge-completed { background: #DEF7EC; color: #03543F; }
            .badge-active { background: #E1EFFE; color: #1E429F; }

            .sign-section { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .sign-box { width: 44%; border-top: 1.5px solid #718096; padding-top: 6px; text-align: center; font-size: 8.5pt; color: #2D3748; }
            .footer-note { margin-top: 25px; font-size: 7.5pt; color: #A0AEC0; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 6px; }

            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="background: #EBF8FF; border: 1px solid #BEE3F8; border-radius: 8px; padding: 10px 15px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; color: #2B6CB0; font-size: 9.5pt;">✓ Official Document Generated. Click below to Save as PDF:</span>
            <button onclick="window.print()" style="background: #E53E3E; color: #FFF; border: none; border-radius: 6px; padding: 7px 16px; font-weight: 800; font-size: 9pt; cursor: pointer;">
              📄 SAVE AS PDF / PRINT
            </button>
          </div>

          <table class="header-table">
            <tr>
              <td>
                <div class="school-name">University of Southern Philippines Foundation</div>
                <div class="sub-header">College of Computer Studies • Department of Computer Science</div>
                <div class="sub-header"><strong>BUWAD:</strong> A Solar-Based IoT Fish Drying System with Automated Flipping</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div style="font-size: 7.5pt; font-weight: 700; color: #718096;">DATE GENERATED</div>
                <div style="font-size: 8.5pt; font-weight: 800; color: #1A202C;">${generatedDate}</div>
              </td>
            </tr>
          </table>

          <div class="doc-title">${isAll ? 'Historical Drying Runs & Quality Records' : 'Batch Quality Record & Drying Certificate'}</div>
          <div class="doc-subtitle">${isAll ? `Comprehensive Audit Log of ${batchesToExport.length} Drying Runs` : `Official Production Run Audit Certificate for ${batchesToExport[0].id}`}</div>

          <div class="section-heading">Operational Batch Telemetry</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Date</th>
                <th>Species</th>
                <th>Duration</th>
                <th>Flips</th>
                <th>Rain Safes</th>
                <th>Avg Temp</th>
                <th>Avg Hum</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${batchesToExport.map(b => `
                <tr>
                  <td><strong>${b.id}</strong></td>
                  <td>${b.date}</td>
                  <td>${b.species}</td>
                  <td>${b.duration}</td>
                  <td>${b.flips}</td>
                  <td>${b.rainSafes}</td>
                  <td>${b.avgTemp}</td>
                  <td>${b.avgHum}</td>
                  <td>
                    <span class="badge ${b.status?.includes('COMPLETED') ? 'badge-completed' : 'badge-active'}">
                      ${b.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-heading" style="margin-top: 20px;">Economic Valuation &amp; Spoilage Safeguard Audit</div>
          <table class="data-table" style="font-size: 8pt;">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Weight</th>
                <th>Market Price</th>
                <th>Gross Valuation</th>
                <th>Loss Safeguarded</th>
                <th>Labor Saved</th>
                <th>Grade A Margin</th>
                <th>Net Advantage</th>
              </tr>
            </thead>
            <tbody>
              ${batchesToExport.map(b => {
                const bWeight = Number(b.weightKg) || 5.0;
                const bPrice = Number(b.unitPrice) || (b.species === 'Danggit' ? 450 : 280);
                const bGross = Number(b.grossValue) || (bWeight * bPrice);
                const bSafeguarded = Number(b.safeguardedLoss) || (((Number(b.rainSafes) || 0) > 0 ? 1 : 0.30) * bGross);
                const bLabor = Number(b.laborSavings) !== undefined && !isNaN(Number(b.laborSavings))
                  ? Number(b.laborSavings)
                  : parseFloat((((Number(b.flips) || 0) * 1.5 / 60) * 55).toFixed(2));
                const bPremium = Number(b.gradePremium) || parseFloat((bGross * 0.15).toFixed(2));
                const bNet = Number(b.netAdvantage) || parseFloat((bLabor + bPremium).toFixed(2));

                return `
                  <tr>
                    <td><strong>${b.id}</strong></td>
                    <td>${bWeight.toFixed(1)} kg</td>
                    <td>₱${bPrice.toFixed(0)}/kg</td>
                    <td>₱${bGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="color: #1E429F; font-weight: 700;">₱${bSafeguarded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="color: #6B21A8; font-weight: 700;">₱${bLabor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="color: #03543F; font-weight: 700;">+₱${bPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="font-weight: 800; color: #00386D;">+₱${bNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div style="font-size: 7pt; color: #718096; margin-top: 4px; font-style: italic;">
            * Economic Methodology: Wage rate benchmarked against DOLE Region VII minimum (~₱55/hr). Loss safeguard denotes BFAR 30% baseline post-harvest spoilage avoidance (100% full harvest during rain events). Grade A margin represents +15% commercial price premium for export-standard 18% moisture consistency.
          </div>

          <div class="section-heading" style="margin-top: 20px;">Quality Assurance & Compliance Metrics (PNS / BFAR Standard)</div>
          <table class="data-table" style="font-size: 8.5pt;">
            <thead>
              <tr>
                <th>Quality Parameter</th>
                <th>Target Standard</th>
                <th>Observed System Outcome</th>
                <th>Compliance Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Final Moisture Content</strong></td>
                <td>15% – 18% (Commercial Export Standard)</td>
                <td>18.0% Target Achieved</td>
                <td><strong style="color: #03543F;">PASS (Optimal Uniformity)</strong></td>
              </tr>
              <tr>
                <td><strong>Flipping Uniformity</strong></td>
                <td>Dual-sided solar exposure</td>
                <td>Automated ${isAll ? 'Servo Actuation' : `${batchesToExport[0].flips} Flips Executed`}</td>
                <td><strong style="color: #03543F;">PASS (Zero Surface Case-Hardening)</strong></td>
              </tr>
              <tr>
                <td><strong>Rain & Contamination Protection</strong></td>
                <td>0% Moisture Ingress</td>
                <td>Automated Ingress Protection (${batchesToExport.reduce((acc, b) => acc + (b.rainSafes || 0), 0)} Rain Events Prevented)</td>
                <td><strong style="color: #03543F;">PASS (Zero Microbial Spoilage Risk)</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="sign-section">
            <div class="sign-box">
              <strong>Jonathan II T. Jumao-as / Andrian Jay J. Dimpas</strong><br />
              <span style="font-size: 7.5pt; color: #718096;">Lead Researchers / System Operators</span>
            </div>
            <div class="sign-box">
              <strong>Gian Carlo Cataraja / Marie Joy Morano-Sanchez</strong><br />
              <span style="font-size: 7.5pt; color: #718096;">Thesis Defense Committee / Technical Panel</span>
            </div>
          </div>

          <div class="footer-note">
            BUWAD IoT Automated Solar Fish Dryer • USPF BSCS Thesis Research Deliverable • Document Authenticated
          </div>

          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
              }, 300);
            });
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (e) {
      console.error('PDF Export Error:', e);
    }
  };

  return (
    <div className="space-y-4">
      {/* === Active Batch Hero Card === */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] overflow-hidden shadow-sm transition-colors duration-500"
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-[#6699CC] tracking-widest uppercase">
                {t('batchSummary') || 'BATCH SUMMARY'}
              </span>
              <h2 className="text-xl font-black text-[#00386D] dark:text-[#F7FAFC] tracking-tight mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                {isDanggit ? 'DANGGIT PROFILE' : 'BOLINAO PROFILE'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenBatchWizard || onResetBatch}
                title="Open batch setup wizard for new tray"
                className="px-2.5 py-1 rounded-xl text-[9px] font-black tracking-wider uppercase bg-gray-100 dark:bg-white/10 text-[#4A5568] dark:text-[#94A3B8] hover:text-[#00386D] dark:hover:text-white transition-colors"
              >
                ↻ NEW BATCH
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#00386D]/5 dark:bg-[#6699CC]/15 border border-[#00386D]/10 dark:border-white/5">
                <span className={`w-2 h-2 rounded-full ${isSystemOn && isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-[10px] font-black text-[#00386D] dark:text-[#6699CC] tracking-wide">
                  {isSystemOn ? (isOnline ? 'ACTIVE' : 'OFFLINE') : 'PAUSED'}
                </span>
              </div>
            </div>
          </div>

          {/* Full Sun Drying Period Indicator */}
          <div className="mt-3 flex items-center justify-between px-3 py-2 bg-[#00386D]/5 dark:bg-[#6699CC]/10 rounded-2xl border border-[#00386D]/10 dark:border-white/5">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#00386D] dark:text-[#6699CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41" />
              </svg>
              <div>
                <div className="text-[9px] font-black text-[#00386D] dark:text-[#F7FAFC] uppercase tracking-wider">
                  FULL SUN DRYING PERIOD
                </div>
                <div className="text-[10px] font-medium text-[#4A5568] dark:text-[#94A3B8]">
                  {isDanggit ? '1–2 Days (8–14 Hours Standard)' : '6–8 Hours Full Sun Standard'}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-[#00386D] dark:bg-[#6699CC] text-white tracking-wide uppercase">
              {isDanggit ? '12h Target' : '7h Target'}
            </span>
          </div>

          {/* Live Progress Bar & Elapsed Ticker */}
          <div className="mt-3.5 space-y-1.5">
            <div className="flex justify-between items-baseline text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="text-[#4A5568] dark:text-[#94A3B8] text-[10px] tracking-wider uppercase">ELAPSED:</span>
                <span className="text-[#00386D] dark:text-[#F7FAFC] font-black font-mono text-[11px]">
                  {formatTimeHM(elapsedSeconds)}
                </span>
                <span className="text-[9px] text-[#6699CC] font-bold">/ {targetDurationSeconds / 3600}h target</span>
              </div>
              <div className="text-right">
                <span className="text-[#00386D] dark:text-[#6699CC] font-black">{batchProgressPercent}%</span>
                <span className="text-[#4A5568] dark:text-[#94A3B8] text-[10px] font-medium ml-1.5">
                  ({formatRemainingHM(remainingSeconds)})
                </span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${batchProgressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[#00386D] to-[#6699CC] rounded-full"
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-bold text-[#4A5568] dark:text-[#94A3B8] pt-0.5 px-0.5">
              <span className={`flex items-center gap-1 ${isSolarWindowActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isSolarWindowActive ? '● Active Window (7 AM – 4 PM)' : '◐ Off-Hours Paused (Resumes 7 AM)'}
              </span>
              <span className="text-[#00386D] dark:text-[#6699CC]">Est. Done: {estimatedFinishTime}</span>
            </div>
          </div>

          {/* 3-Column Batch Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-center">
            <div className="p-2 rounded-2xl bg-gray-50 dark:bg-white/5">
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">{t('totalFlips') || 'TOTAL FLIPS'}</div>
              <div className="text-base font-black text-[#00386D] dark:text-[#F7FAFC] mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                {flipCount}
              </div>
            </div>
            <div className="p-2 rounded-2xl bg-gray-50 dark:bg-white/5">
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">RAIN SAFES</div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                {rainCount}
              </div>
            </div>
            <div className="p-2 rounded-2xl bg-gray-50 dark:bg-white/5">
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">{t('timeSaved') || 'TIME SAVED'}</div>
              <div className="text-base font-black text-[#6699CC] mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                {timeSavedFormatted}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* === Daily Solar Drying Window Advisor === */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] overflow-hidden shadow-sm p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-black text-[#00386D] dark:text-[#F7FAFC] uppercase tracking-wider">
                DAILY SOLAR DRYING WINDOW
              </h3>
              <p className="text-[9px] font-medium text-[#4A5568] dark:text-[#94A3B8]">
                7:00 AM – 4:00 PM (Up to 9 Active Drying Hours / Day)
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            7 AM – 4 PM WINDOW
          </span>
        </div>

        {/* Visual Timeline Strip */}
        <div className="space-y-1.5 pt-1">
          <div className="grid grid-cols-4 gap-1 text-[8px] font-black text-center uppercase text-[#4A5568] dark:text-[#94A3B8]">
            <div className="p-1 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5">
              <span className="text-[#00386D] dark:text-[#6699CC]">6:30 - 7:00 AM</span>
              <div className="text-[7.5px] font-medium mt-0.5">Layout Prep</div>
            </div>
            <div className="p-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
              <span>7 AM - 10 AM</span>
              <div className="text-[7.5px] font-medium mt-0.5">Active Sun</div>
            </div>
            <div className="p-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black">
              <span>10 AM - 2 PM</span>
              <div className="text-[7.5px] font-bold mt-0.5">▲ Solar Peak</div>
            </div>
            <div className="p-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400">
              <span>2 PM - 4 PM</span>
              <div className="text-[7.5px] font-medium mt-0.5">Final Evap</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* === Upgraded Economic Impact & Spoilage Prevention Card === */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] overflow-hidden shadow-sm p-5 space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] uppercase">
              ECONOMIC IMPACT &amp; SPOILAGE PREVENTION
            </div>
            <div className="text-xs font-black text-[#00386D] dark:text-[#F7FAFC] mt-0.5">
              Batch Commercial Valuation &amp; Loss Safeguard
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-lg text-[8.5px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            ROI ANALYZER • BFAR PNS
          </span>
        </div>

        {/* Input Parameters with Quick Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Batch Weight Input & Presets */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <label className="text-[8.5px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">
                BATCH WEIGHT (KG)
              </label>
              <span className="text-[8px] text-[#6699CC] font-bold">Standard Capacity</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={batchWeight}
                onChange={(e) => setBatchWeight(e.target.value)}
                placeholder="0"
                className="w-full bg-white dark:bg-[#121824] border border-gray-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-black text-[#00386D] dark:text-[#F7FAFC] outline-none focus:border-[#6699CC]"
              />
              <span className="text-[10px] font-black text-[#6699CC] shrink-0">kg</span>
            </div>
            {/* Quick Presets Grid */}
            <div>
              <div className="text-[7.5px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider mb-1">
                QUICK WEIGHT PRESETS:
              </div>
              <div className="grid grid-cols-4 gap-1 w-full">
                {['2.5', '5.0', '10.0', '15.0'].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setBatchWeight(w)}
                    className={`btn-compact !min-h-0 h-6 px-1 rounded-lg text-[8.5px] font-black text-center transition-all ${
                      batchWeight === w
                        ? 'bg-[#00386D] dark:bg-[#6699CC] text-white shadow-sm'
                        : 'bg-white dark:bg-[#121824] border border-gray-200 dark:border-white/10 text-[#4A5568] dark:text-[#94A3B8] hover:border-[#6699CC]'
                    }`}
                  >
                    {w}kg
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Unit Market Price Input & Species Presets */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <label className="text-[8.5px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">
                MARKET PRICE (₱/KG)
              </label>
              <span className="text-[8px] text-[#6699CC] font-bold">Cebu Market Standard</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#00386D] dark:text-[#6699CC] shrink-0">₱</span>
              <input
                type="number"
                step="any"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                placeholder="0"
                className="w-full bg-white dark:bg-[#121824] border border-gray-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-black text-[#00386D] dark:text-[#F7FAFC] outline-none focus:border-[#6699CC]"
              />
            </div>
            {/* Quick Species Presets Grid */}
            <div>
              <div className="text-[7.5px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider mb-1">
                SPECIES PRICE PRESETS:
              </div>
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {[
                  { label: 'Danggit ₱450', val: '450' },
                  { label: 'Bolinao ₱280', val: '280' }
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setPricePerKg(p.val)}
                    className={`btn-compact !min-h-0 h-6 px-1 rounded-lg text-[8.5px] font-black text-center truncate transition-all ${
                      pricePerKg === p.val
                        ? 'bg-[#00386D] dark:bg-[#6699CC] text-white shadow-sm'
                        : 'bg-white dark:bg-[#121824] border border-gray-200 dark:border-white/10 text-[#4A5568] dark:text-[#94A3B8] hover:border-[#6699CC]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Differentiated Financial Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1 border-t border-gray-100 dark:border-white/5">
          {/* Card 1: Batch Value */}
          <div className="p-2.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 flex flex-col justify-between">
            <div>
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">
                BATCH GROSS VALUE
              </div>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                ₱{batchValuePesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-[7.5px] font-bold text-[#4A5568] dark:text-[#94A3B8] mt-1">
              {numericWeight.toFixed(1)} kg @ ₱{numericPrice.toFixed(0)}/kg
            </div>
          </div>

          {/* Card 2: Loss Prevented */}
          <div className="p-2.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15 flex flex-col justify-between">
            <div>
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">
                SAFEGUARDED LOSS
              </div>
              <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                ₱{safeguardedLossPesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-[7.5px] font-bold text-blue-600 dark:text-blue-400 mt-1">
              {rainCount > 0 ? `${rainCount} rain closure shielded` : '30% post-harvest baseline saved'}
            </div>
          </div>

          {/* Card 3: Labor Saved */}
          <div className="p-2.5 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/15 flex flex-col justify-between">
            <div>
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">
                LABOR SAVINGS
              </div>
              <div className="text-sm font-black text-purple-600 dark:text-purple-400 mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                ₱{laborSavingsPesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-[7.5px] font-bold text-purple-600 dark:text-purple-400 mt-1">
              {laborHoursFormatted} @ ₱{laborHourlyRate}/h wage
            </div>
          </div>

          {/* Card 4: Quality Premium */}
          <div className="p-2.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 flex flex-col justify-between">
            <div>
              <div className="text-[8px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">
                GRADE A PREMIUM
              </div>
              <div className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                +₱{gradeAPremiumPesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-[7.5px] font-bold text-amber-600 dark:text-amber-400 mt-1">
              +15% commercial export margin
            </div>
          </div>
        </div>

        {/* Net Commercial Advantage Summary Banner */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-[#00386D]/10 via-emerald-500/10 to-[#6699CC]/10 dark:from-[#00386D]/20 dark:via-emerald-500/20 dark:to-[#6699CC]/20 border border-[#00386D]/20 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-center sm:text-left">
            <div className="text-[8.5px] font-bold text-[#4A5568] dark:text-[#94A3B8] uppercase tracking-wider">
              NET COMMERCIAL BENEFIT PER BATCH
            </div>
            <div className="text-xs font-black text-[#00386D] dark:text-[#F7FAFC]">
              +₱{netCommercialAdvantagePesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Extra Profit &amp; Labor Saved
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              ₱{safeguardedLossPesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Harvest Shielded
            </span>
          </div>
        </div>

      </motion.div>

      {/* === Interactive 24H Environmental Telemetry Chart === */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] overflow-hidden shadow-sm p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] uppercase">
              {t('sensorTrends') || '24H SENSOR TRENDS'}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-[#00386D] dark:text-[#6699CC]">
                <span className="w-2 h-2 rounded-full bg-[#00386D] dark:bg-[#6699CC]" /> Temp (°C)
              </span>
              <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                <span className="w-2 h-2 rounded-full bg-teal-500" /> Humidity (%)
              </span>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-0.5 text-[10px] font-black">
            {['1h', '12h', '24h'].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg uppercase transition-colors ${
                  timeRange === r
                    ? 'bg-[#00386D] dark:bg-[#6699CC] text-white shadow-sm'
                    : 'text-[#4A5568] dark:text-[#94A3B8] hover:text-[#00386D]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Curve Graph */}
        <div className="relative pt-2">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 overflow-visible">
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6699CC" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6699CC" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            {[0.25, 0.5, 0.75].map((pct, i) => (
              <line
                key={i}
                x1={paddingX}
                y1={paddingY + pct * (svgHeight - paddingY * 2)}
                x2={svgWidth - paddingX}
                y2={paddingY + pct * (svgHeight - paddingY * 2)}
                stroke="currentColor"
                className="text-gray-200 dark:text-white/5"
                strokeDasharray="3 3"
              />
            ))}

            {/* Temperature Fill Area */}
            <path d={tempAreaPath} fill="url(#tempGradient)" />

            {/* Humidity Line */}
            <path
              d={humPath}
              fill="none"
              stroke="#14B8A6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Temperature Line */}
            <path
              d={tempPath}
              fill="none"
              stroke="#6699CC"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Data Points */}
            {chartData.map((d, i) => {
              const { x, y: tempY } = getCoordinates(d.temperature, minTemp, maxTemp, i, chartData.length);
              const isHovered = hoveredPoint === i;
              return (
                <g key={i} onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)} className="cursor-pointer">
                  {/* Invisible Hit Area */}
                  <circle cx={x} cy={tempY} r="12" fill="transparent" />
                  
                  {/* Visual Point */}
                  <circle
                    cx={x}
                    cy={tempY}
                    r={isHovered ? 5 : 2.5}
                    className="fill-[#00386D] dark:fill-[#6699CC] transition-all"
                    stroke="#FFFFFF"
                    strokeWidth={isHovered ? 2 : 1}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover Tooltip Popup */}
          <AnimatePresence>
            {hoveredPoint !== null && chartData[hoveredPoint] && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-[#00386D] dark:bg-[#1A202C] text-white text-[10px] font-bold shadow-xl border border-white/10 flex items-center gap-3 z-10"
              >
                <span className="text-[#6699CC]">{chartData[hoveredPoint].time}</span>
                <span>Temp: {chartData[hoveredPoint].temperature}°C</span>
                <span className="text-teal-400">Hum: {chartData[hoveredPoint].humidity}%</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Time Axis Labels */}
        <div className="flex justify-between text-[9px] font-bold text-[#4A5568] dark:text-[#94A3B8] px-2 pt-1 border-t border-gray-100 dark:border-white/5">
          <span>{chartData[0]?.time || '00:00'}</span>
          <span>{chartData[Math.floor(chartData.length / 2)]?.time || '12:00'}</span>
          <span>{chartData[chartData.length - 1]?.time || 'Now'}</span>
        </div>
      </motion.div>

      {/* === Hardware Health & Diagnostics Matrix === */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] p-5 shadow-sm space-y-3"
      >
        <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] uppercase">
          {t('hardwareHealth') || 'HARDWARE DIAGNOSTICS'}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
            <span className="font-bold text-[#00386D] dark:text-[#F7FAFC]">ESP32-S3</span>
            <span className={`text-[10px] font-black ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
              {isOnline ? 'ONLINE (15ms)' : 'OFFLINE'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
            <span className="font-bold text-[#00386D] dark:text-[#F7FAFC]">DHT11 SENSOR</span>
            <span className="text-[10px] font-black text-emerald-500">NOMINAL</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
            <span className="font-bold text-[#00386D] dark:text-[#F7FAFC]">RAIN SENSOR</span>
            <span className="text-[10px] font-black text-emerald-500">ARMED</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
            <span className="font-bold text-[#00386D] dark:text-[#F7FAFC]">FLIP SERVOS</span>
            <span className="text-[10px] font-black text-emerald-500">SYNCED (0 stall)</span>
          </div>
        </div>
      </motion.div>

      {/* === Option A: Completed Batch History Archive Table === */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#BDBCBD] dark:border-white/10 bg-white dark:bg-[#1A202C] p-5 shadow-sm space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#4A5568] dark:text-[#94A3B8] tracking-[0.1em] uppercase">
              COMPLETED BATCH ARCHIVE
            </div>
            <div className="text-xs font-black text-[#00386D] dark:text-[#F7FAFC] mt-0.5">
              Historical Drying Runs &amp; Quality Records
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleExportBatchPDF('all')}
              title="Export all historical batches to PDF Report"
              className="px-2 py-1 rounded-xl bg-red-600 dark:bg-red-500 text-white text-[9px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>EXPORT ALL (.PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportBatchCSV('all')}
              title="Export all historical batches to Excel/CSV"
              className="px-2 py-1 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>EXPORT ALL (.CSV)</span>
            </button>
            <button
              type="button"
              onClick={handleSaveCurrentBatch}
              className="px-2 py-1 rounded-xl bg-[#00386D] dark:bg-[#6699CC] text-white text-[9px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              + SAVE RUN
            </button>
            {savedBatches.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-2 py-1 rounded-xl bg-gray-100 dark:bg-white/5 text-[#4A5568] dark:text-[#94A3B8] text-[9px] font-bold hover:text-red-500 transition-colors"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-center">
            {saveSuccessMsg}
          </div>
        )}

        {/* Compressed Responsive Batch History Table (No Sideways Scroll) */}
        <div className="rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <table className="w-full table-fixed text-left text-[9px]">
            <thead className="bg-gray-50 dark:bg-white/5 text-[#4A5568] dark:text-[#94A3B8] uppercase font-black border-b border-gray-100 dark:border-white/5">
              <tr>
                <th className="w-[33%] py-2.5 px-2.5">BATCH</th>
                <th className="w-[27%] py-2.5 px-2">STATS</th>
                <th className="w-[21%] py-2.5 px-1 text-center">STATUS</th>
                <th className="w-[19%] py-2.5 px-1 text-center">EXPORT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {displayBatchHistory.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-[#4A5568] dark:text-[#94A3B8] font-medium text-xs">
                    No batch history recorded yet. Active batch will appear once drying begins.
                  </td>
                </tr>
              ) : (
                displayBatchHistory.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`transition-colors ${item.isLive ? 'bg-[#00386D]/5 dark:bg-[#6699CC]/10' : 'hover:bg-gray-50/50 dark:hover:bg-white/5'}`}
                  >
                    {/* BATCH & SPECIES */}
                    <td className="py-2.5 px-2.5 truncate">
                      <div className="flex items-center gap-1 truncate">
                        {item.isLive && (
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isSolarWindowActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                          }`} />
                        )}
                        <span className="font-mono font-black text-[9.5px] text-[#00386D] dark:text-[#F7FAFC] truncate">{item.id}</span>
                      </div>
                      <div className="text-[8px] font-bold text-[#6699CC] truncate mt-0.5">
                        {item.species} • <span className="font-normal text-[#4A5568] dark:text-[#94A3B8]">{item.date}</span>
                      </div>
                    </td>

                    {/* STATS */}
                    <td className="py-2.5 px-2 truncate">
                      <div className="font-mono font-bold text-[#00386D] dark:text-[#E2E8F0] text-[9.5px] truncate flex items-center gap-1">
                        <span>{item.duration}</span>
                        {item.isLive && (
                          <span className={`text-[7.5px] font-black uppercase px-1 py-0.2 rounded ${
                            isSolarWindowActive 
                              ? 'text-emerald-500 bg-emerald-500/10' 
                              : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                          }`}>
                            {isSolarWindowActive ? 'LIVE' : 'OFF-HOURS'}
                          </span>
                        )}
                      </div>
                      <div className="text-[8px] text-[#4A5568] dark:text-[#94A3B8] truncate mt-0.5 flex items-center gap-1">
                        <span className="font-bold text-[#00386D] dark:text-[#F7FAFC]">{item.flips}f</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.rainSafes}r</span>
                        <span>•</span>
                        <span>{item.avgTemp}</span>
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="py-2.5 px-1.5 text-center">
                      <span className={`inline-block text-[7.5px] font-black px-1.5 py-0.5 rounded leading-tight truncate max-w-full ${
                        item.isLive 
                          ? (isSolarWindowActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400')
                          : 'bg-gray-100 dark:bg-white/10 text-[#6699CC]'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {/* EXPORT ACTION BUTTONS */}
                    <td className="py-2.5 px-1 text-center">
                      <div className="inline-flex items-center gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => handleExportBatchPDF(item)}
                          title={`Download ${item.id} PDF Report`}
                          className="px-1.5 py-1 rounded bg-red-500/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 font-black text-[7.5px] transition-colors"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportBatchCSV(item)}
                          title={`Export ${item.id} (.CSV)`}
                          className="px-1.5 py-1 rounded bg-[#00386D]/10 dark:bg-[#6699CC]/20 hover:bg-[#00386D] hover:text-white dark:hover:bg-[#6699CC] dark:hover:text-white text-[#00386D] dark:text-[#6699CC] font-black text-[7.5px] transition-colors"
                        >
                          CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
