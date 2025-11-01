# Auto-Update UI Fix - Complete Analysis

## 🐛 Problem Report

User sees in update UI:
```
Downloading Update
undefined%
Downloaded: NaN undefined / NaN undefined
Downloading: undefined%
```

## 🔍 Root Cause Analysis

### Issue 1: Progress Callback Data Mismatch
**Location**: `custom-updater.js` line 112-117
```javascript
// Backend emits chunk_length per event
else if (payload.event === 'progress') {
  downloadedSize += payload.data.chunk_length; // ❌ ACCUMULATING
  const percentage = totalSize > 0 ? Math.floor((downloadedSize / totalSize) * 100) : 0;
  onProgress?.(downloadedSize, totalSize, percentage); // ❌ Passes 3 separate args
}
```

**Location**: `EnhancedUpdateChecker.svelte` line 116
```javascript
(progress) => {
  // ❌ Expects object with {downloaded, total, percent} but gets separate args
  downloadProgress.downloaded = progress.downloaded; // undefined!
  downloadProgress.total = progress.total; // undefined!
  downloadProgress.percentage = progress.percent; // undefined!
}
```

### Issue 2: Status Callback Structure Mismatch  
**Location**: `custom-updater.js` line 131-152
```javascript
onStatus?.('downloading', { message: 'Downloading update...' });
// ❌ Calls: (status, details)
```

**Location**: `EnhancedUpdateChecker.svelte` line 130-151
```javascript
(status, details) => {
  if (status === 'downloading') {
    updateState = 'downloading';
    currentStatus = details.message; // ✅ Works
  }
  // ... BUT relies on separate progress callback for numbers
}
```

### Issue 3: Progress Accumulation Logic Error
**Backend**: `updater.rs` emits `chunk_length` per event
**Frontend**: Accumulates in `custom-updater.js` BUT doesn't pass accumulated total correctly

### Issue 4: Translation Keys Not Working
UI shows raw keys: `settings.updates.title` instead of translated text

## 🎯 Required Fixes

### Priority 1: Fix Progress Callback Shape
**File**: `custom-updater.js`
- Change from: `onProgress?.(downloadedSize, totalSize, percentage)`
- Change to: `onProgress?.({ downloaded: downloadedSize, total: totalSize, percent: percentage })`

### Priority 2: Initialize Progress State Properly
**File**: `custom-updater.js`
- Reset accumulator when download starts
- Ensure totalSize is set from content_length

### Priority 3: Add Validation
**File**: `EnhancedUpdateChecker.svelte`
- Validate progress values before display
- Fallback to 0 if undefined/NaN

### Priority 4: Fix Translation Keys (FUTURE)
- Add translation system integration
- For now, use plain English text

## 📝 Implementation Plan

1. **Fix custom-updater.js progress callbacks** - Pass object instead of separate args
2. **Fix EnhancedUpdateChecker.svelte** - Add validation for undefined values
3. **Test end-to-end** - Verify all states work correctly

## ✅ Success Criteria

After fix, UI should show:
```
Downloading Update
45%
Downloaded: 23.5 MB / 52.3 MB
Speed: 2.45 MB/s
Time remaining: 12s
Downloading: 45%
```

No "undefined", no "NaN", all values numeric and formatted.
