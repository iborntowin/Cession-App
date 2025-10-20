# Quick Auto-Update Setup Script
# Run this to set up auto-updates for your Tauri app

Write-Host "🚀 Setting up Auto-Updates for Cession Management App" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install required packages
Write-Host "📦 Step 1: Installing Tauri plugins..." -ForegroundColor Yellow
cd frontend
npm install @tauri-apps/plugin-updater @tauri-apps/plugin-process
Write-Host "✅ Plugins installed!" -ForegroundColor Green
Write-Host ""

# Step 2: Generate signing keys
Write-Host "🔐 Step 2: Generating signing keys..." -ForegroundColor Yellow
Write-Host "⚠️  IMPORTANT: Save the output in a secure location!" -ForegroundColor Red
Write-Host ""

$keyPath = "$env:USERPROFILE\.tauri\cession-app.key"
npx tauri signer generate -w $keyPath

Write-Host ""
Write-Host "✅ Keys generated at: $keyPath" -ForegroundColor Green
Write-Host ""

# Step 3: Instructions
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Copy the PUBLIC KEY from above" -ForegroundColor White
Write-Host "2. Add it to frontend/src-tauri/tauri.conf.json in the 'plugins' section" -ForegroundColor White
Write-Host ""
Write-Host "3. Create a .env file in the project root with:" -ForegroundColor White
Write-Host "   TAURI_SIGNING_PRIVATE_KEY='your_private_key_here'" -ForegroundColor Gray
Write-Host "   TAURI_SIGNING_PRIVATE_KEY_PASSWORD=''" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Add .env to .gitignore (NEVER commit the private key!)" -ForegroundColor White
Write-Host ""
Write-Host "5. Update tauri.conf.json with updater config:" -ForegroundColor White
Write-Host @"
   "plugins": {
     "updater": {
       "active": true,
       "endpoints": [
         "https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json"
       ],
       "dialog": true,
       "pubkey": "YOUR_PUBLIC_KEY_HERE"
     }
   }
"@ -ForegroundColor Gray
Write-Host ""
Write-Host "6. Build with signing:" -ForegroundColor White
Write-Host "   npm run tauri build -- --sign" -ForegroundColor Gray
Write-Host ""
Write-Host "7. Upload to GitHub Releases:" -ForegroundColor White
Write-Host "   - .msi.zip file" -ForegroundColor Gray
Write-Host "   - .msi.zip.sig file" -ForegroundColor Gray
Write-Host "   - latest.json file" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Done! See AUTO_UPDATE_SETUP.md for detailed instructions." -ForegroundColor Green
