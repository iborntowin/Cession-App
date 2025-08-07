# Troubleshooting Mobile App on Android

## Issue: "No usable data" when scanning QR code

This usually happens when:
1. The Metro server isn't running properly
2. Your phone and computer aren't on the same network
3. The QR code is corrupted or not displaying correctly

## Solutions to Try:

### Solution 1: Clear Cache and Restart
```powershell
cd mobile-client
npm start -- --clear-cache
```

### Solution 2: Use Tunnel Mode
```powershell
cd mobile-client
npm start -- --tunnel
```

### Solution 3: Manual Connection
1. Start the server: `npm start`
2. Note the IP address shown (e.g., 192.168.1.100:8081)
3. In Expo Go app, tap "Enter URL manually"
4. Enter: `exp://YOUR_IP_ADDRESS:8081`

### Solution 4: Use Android Studio (Direct Install)
```powershell
cd mobile-client
npm run android
```

### Solution 5: Build APK for Testing
```powershell
cd mobile-client
npx eas build --platform android --profile preview
```

## Network Requirements:
- Both devices must be on the same WiFi network
- Firewall should allow connections on port 8081
- Some corporate networks block these connections

## Alternative: Web Version
You can also test the responsive design in a web browser:
```powershell
cd mobile-client
npm run web
```
Then open your browser and resize the window to mobile dimensions.

## Check Your Setup:
1. **Node.js**: `node --version` (should be 16+)
2. **npm**: `npm --version`
3. **Expo CLI**: `npx expo --version`
4. **Network**: Both devices on same WiFi
5. **Expo Go**: Latest version from Play Store