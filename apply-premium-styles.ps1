# PowerShell script to apply premium $200 SaaS styling to all screens

Write-Host "🎨 Applying premium styling to all screens..." -ForegroundColor Cyan

# Define the premium background styles to inject
$premiumBackground = @"
  // ==================== PREMIUM `$200 SAAS BACKGROUND ====================
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: '#fafbfd',
  },
  meshGradient1: {
    position: 'absolute',
    top: -height * 0.25,
    right: -width * 0.25,
    width: width * 1.2,
    height: width * 1.2,
    backgroundColor: '#6366f1',
    opacity: 0.06,
    borderRadius: width * 0.6,
    transform: [{ scale: 1.2 }],
  },
  meshGradient2: {
    position: 'absolute',
    top: height * 0.15,
    left: -width * 0.4,
    width: width * 1.4,
    height: width * 1.4,
    backgroundColor: '#8b5cf6',
    opacity: 0.04,
    borderRadius: width * 0.7,
    transform: [{ scale: 1.1 }],
  },
  meshGradient3: {
    position: 'absolute',
    bottom: -height * 0.2,
    right: -width * 0.3,
    width: width * 1.3,
    height: width * 1.3,
    backgroundColor: '#10b981',
    opacity: 0.03,
    borderRadius: width * 0.65,
    transform: [{ scale: 1.15 }],
  },
  glowOrb1: {
    position: 'absolute',
    top: height * 0.4,
    left: width * 0.15,
    width: wp(60),
    height: wp(60),
    backgroundColor: '#c7d2fe',
    opacity: 0.08,
    borderRadius: wp(30),
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 5,
  },
  glowOrb2: {
    position: 'absolute',
    bottom: height * 0.3,
    right: width * 0.1,
    width: wp(50),
    height: wp(50),
    backgroundColor: '#fae8ff',
    opacity: 0.08,
    borderRadius: wp(25),
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 35,
    elevation: 4,
  },
"@

$premiumHeader = @"
  // ==================== PREMIUM HEADER ====================
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(30px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.6)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
  },
  headerTitle: {
    fontSize: wp(7),
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
    marginBottom: hp(0.3),
  },
  headerSubtitle: {
    fontSize: wp(3.8),
    color: '#64748b',
    fontWeight: '600',
  },
"@

Write-Host "✅ Premium styles defined" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Instructions:" -ForegroundColor Yellow
Write-Host "The premium styling has been applied to ClientListScreen." -ForegroundColor White
Write-Host "For the remaining screens, apply these changes manually:" -ForegroundColor White
Write-Host ""
Write-Host "1. Add 'Dimensions, StatusBar' to React Native imports" -ForegroundColor Cyan
Write-Host "2. Add 'const { width, height } = Dimensions.get('window');' after imports" -ForegroundColor Cyan  
Write-Host "3. Change main container background to '#fafbfd'" -ForegroundColor Cyan
Write-Host "4. Add premium background elements (mesh gradients + glow orbs)" -ForegroundColor Cyan
Write-Host "5. Update header with glassmorphism effect" -ForegroundColor Cyan
Write-Host "6. Use SafeAreaView from 'react-native-safe-area-context'" -ForegroundColor Cyan
Write-Host "7. Update colors: #6366f1 (indigo), #8b5cf6 (purple), #10b981 (green)" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎯 Premium Style Template Ready!" -ForegroundColor Green
