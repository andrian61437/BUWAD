// Helper to reliably extract real millisecond timestamps from Firebase Push IDs or local IDs
export function getTimestampFromPushId(id) {
  if (!id || typeof id !== 'string') return 0;
  
  // Format 1: Local ID format like "1725330000000_abc123"
  if (id.includes('_')) {
    const parsed = parseInt(id.split('_')[0], 10);
    if (!isNaN(parsed) && parsed > 1600000000000) return parsed;
  }
  
  // Format 2: Standard Firebase Push ID (starts with '-' and encodes epoch ms in first 8 chars)
  if (id.startsWith('-') && id.length >= 8) {
    const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
    let time = 0;
    for (let i = 0; i < 8; i++) {
      const c = id.charAt(i);
      const val = PUSH_CHARS.indexOf(c);
      if (val === -1) return 0;
      time = time * 64 + val;
    }
    if (time > 1600000000000) return time;
  }
  
  return 0;
}
