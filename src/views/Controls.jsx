const handleManualFlip = useCallback(() => {
  const now = Date.now();
  
  if (now - lastClickTimeRef.current < 2000) {
    triggerToast('Please wait before flipping again');
    return;
  }
  
  lastClickTimeRef.current = now;
  setIsManualFliping(true);
  
  // IMPORTANT: Write to Firebase to trigger ESP32
  import { getDatabase, ref, set } from 'firebase/database';
  const db = getDatabase();
  const manualFlipRef = ref(db, 'commands/manualFlip');
  
  console.log('📤 Sending flip command to Firebase...');
  
  set(manualFlipRef, true)
    .then(() => {
      console.log('✅ Flip command sent successfully');
      // Reset the command after 1 second
      setTimeout(() => {
        set(manualFlipRef, false).catch(console.error);
        console.log('🔄 Command reset to false');
      }, 1000);
    })
    .catch((error) => {
      console.error('❌ Failed to send flip command:', error);
      triggerToast('Failed to send command');
    });
  
  onManualOverride?.();
  
  setTimeout(() => {
    setIsManualFliping(false);
    triggerToast('Flip command sent to ESP32');
  }, 800);
}, [onManualOverride, triggerToast]);