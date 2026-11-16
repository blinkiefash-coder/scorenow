# ScoreNow Mobile App - Deployment & Installation Guide

**Build Date:** 2026-11-16  
**APK Version:** 1.0.0  
**APK Size:** 72.9 MB  
**Target:** Android 8.0+  
**Status:** ✅ Ready for Deployment

---

## Table of Contents

1. [APK Details](#apk-details)
2. [Installation Methods](#installation-methods)
3. [Device Testing](#device-testing)
4. [Google Play Store Deployment](#google-play-store-deployment)
5. [Beta Testing Setup](#beta-testing-setup)
6. [Troubleshooting](#troubleshooting)
7. [Monitoring & Support](#monitoring--support)

---

## APK Details

### File Information

```
Filename:              app-release.apk
Location:             build/app/outputs/flutter-apk/app-release.apk
Size:                 72.9 MB
Type:                 Android Application Package (Zip Archive)
Build Date:           2026-11-16 12:23 UTC
Architecture:         arm64-v8a (default, multi-arch)
Minimum SDK:          Android 8 (API 26)
Target SDK:           Android 14 (API 34)
Compilation:          Release (optimized, no debug symbols)
```

### Checksum Verification

```bash
# SHA-1 hash (auto-generated)
cat build/app/outputs/flutter-apk/app-release.apk.sha1

# Manual verification (if needed)
shasum -a 256 build/app/outputs/flutter-apk/app-release.apk
```

---

## Installation Methods

### Method 1: Android Studio Emulator

**Step 1: Open Android Studio**
```bash
open -a "Android Studio"
```

**Step 2: Launch Emulator**
- Click AVD Manager → Select device → Launch

**Step 3: Install APK via ADB**
```bash
adb install -r /Users/sa40091223/Desktop/ScoreNow/mobile_flutter/build/app/outputs/flutter-apk/app-release.apk
```

**Step 4: Launch App**
- Find "ScoreNow" app in launcher
- Tap to launch

---

### Method 2: Physical Android Device

**Requirements:**
- Android device (8.0 or higher)
- USB cable
- Developer mode enabled on device

**Step 1: Enable Developer Mode**
```
Settings → About Phone → Tap "Build Number" 7 times
→ Developer options will appear
```

**Step 2: Enable USB Debugging**
```
Settings → Developer options → USB Debugging → Toggle ON
```

**Step 3: Connect Device to Computer**
```bash
# Verify device is connected
adb devices

# Should output: device_id    device
```

**Step 4: Install APK**
```bash
adb install -r /Users/sa40091223/Desktop/ScoreNow/mobile_flutter/build/app/outputs/flutter-apk/app-release.apk
```

**Step 5: Verify Installation**
```bash
# Check if app is installed
adb shell pm list packages | grep scorenow
```

**Step 6: Launch App**
- Tap ScoreNow icon in launcher
- Or use: `adb shell am start -n com.scorenow.mobile/.MainActivity`

---

### Method 3: Direct File Transfer (via File Manager)

**Step 1: Copy APK to Device**
```bash
# Connect device and enable file transfer mode
adb push /Users/sa40091223/Desktop/ScoreNow/mobile_flutter/build/app/outputs/flutter-apk/app-release.apk /sdcard/Download/
```

**Step 2: Navigate on Device**
- File Manager → Download folder
- Find `app-release.apk`
- Tap to install
- Confirm permissions

---

### Method 4: Install via Cloud (Download Link)

**For distribution to users:**

1. **Upload APK to hosting service:**
   ```bash
   # Example: AWS S3
   aws s3 cp app-release.apk s3://scorenow-releases/android/v1.0.0/
   
   # Or Google Drive
   # Upload and share link
   ```

2. **Share download link with users**
3. **Users download and install** (Settings → Security → Unknown sources may need enabling)

---

## Device Testing

### QA Testing Checklist

#### Initial Launch
- [ ] App installs successfully
- [ ] App launches without crashes
- [ ] Splash screen displays
- [ ] App permissions requested (location, contacts, camera)
- [ ] Permissions granted/denied handling works

#### Authentication
- [ ] Login screen renders correctly
- [ ] All form fields visible
- [ ] Mobile number input accepts 10 digits
- [ ] OTP input field works
- [ ] Google Sign-In button visible and functional
- [ ] Error messages display properly

#### Dashboard
- [ ] Credit score displays prominently
- [ ] Score gauge animates smoothly
- [ ] Bureau selection (CIBIL, Equifax, Experian) works
- [ ] Recent reports list loads
- [ ] Report status icons display correctly
- [ ] Loading spinners appear during data fetch
- [ ] Error handling shows user-friendly messages

#### Navigation
- [ ] Bottom navigation bar visible
- [ ] All tabs clickable (Home, Dashboard, Reports, Payments, Support, Settings)
- [ ] Tab switching smooth and fast
- [ ] Active tab highlighted
- [ ] Back button navigation works

#### Reports & Downloads
- [ ] Report details page loads
- [ ] Download button functional
- [ ] PDF downloads to device storage
- [ ] Share functionality works
- [ ] Report preview displays correctly

#### Payments
- [ ] Payment options listed
- [ ] Razorpay gateway loads
- [ ] Payment flow completes
- [ ] Success/failure feedback shown
- [ ] Invoice generates and downloads

#### Support
- [ ] Support ticket form loads
- [ ] Can create new ticket
- [ ] Ticket appears in history
- [ ] File attachment works
- [ ] Message sending/receiving works

#### Settings
- [ ] Profile update functional
- [ ] Theme toggle (light/dark) works
- [ ] Notification preferences save
- [ ] Password change flow works
- [ ] Account deletion warning shows

#### Performance
- [ ] App responds within 2 seconds
- [ ] Smooth scrolling (60fps target)
- [ ] No memory leaks (check Task Manager)
- [ ] Battery drain is minimal
- [ ] Network usage is reasonable

#### Offline Mode
- [ ] Cached data displays offline
- [ ] Sync on reconnection works
- [ ] Offline message shown appropriately
- [ ] No force crashes

---

### Device Configurations to Test

| Device Type | Model | OS Version | Screen Size |
|---|---|---|---|
| Phone | Samsung Galaxy A13 | Android 12 | 6.1" |
| Phone | OnePlus 9 | Android 13 | 6.55" |
| Tablet | Samsung Tab S6 | Android 12 | 10.5" |
| Phone | Motorola G13 | Android 12 | 6.5" |
| Phone | iPhone (via wrapper) | iOS 15+ | 6.1" |

---

## Google Play Store Deployment

### Pre-Submission Checklist

#### App Information
- [ ] App name: "ScoreNow"
- [ ] Developer name: [Your Company]
- [ ] Description: Compelling, accurate
- [ ] Screenshots: 4-8 high quality (1080x1920)
- [ ] Feature graphic: 1024x500
- [ ] Icon: 512x512 (high quality)
- [ ] Privacy policy URL: Available
- [ ] Support email: Functional

#### Build Configuration
- [ ] APK signed with keystore
- [ ] Version code incremented (currently: 1)
- [ ] Version name updated (currently: 1.0.0)
- [ ] Min SDK 26+ (Android 8+)
- [ ] Target SDK 34+ (Android 14+)
- [ ] No hard-coded API keys/secrets

#### Permissions
- [ ] Reviewed requested permissions
- [ ] INTERNET permission (required)
- [ ] Camera (if needed)
- [ ] Location (if needed)
- [ ] Storage (for reports/files)
- [ ] Microphone (for support calls)
- [ ] Justification provided for each

#### Content Rating
- [ ] Submitted content rating questionnaire
- [ ] Verified rating classification

#### Target Audience
- [ ] Content Guidance appropriate
- [ ] Age restriction (13+ recommended)
- [ ] Restricted to eligible countries (India priority)

### Submission Process

**Step 1: Prepare Google Play Account**
```
Go to: https://play.google.com/console
Sign in with developer account
Create or open existing app
```

**Step 2: Upload APK**
```
Release → Production → Create new release
Upload APK: app-release.apk
```

**Step 3: Complete Store Details**
```
App information:
  - Title: "ScoreNow - Check Your Credit Score"
  - Short description (80 chars max)
  - Full description (4000 chars)
  - Screenshots (minimum 2, ideally 5-8)
  - Feature graphic
  - Icon (512x512)
```

**Step 4: Configure Pricing & Distribution**
```
Pricing & distribution:
  - Price: Free (select)
  - Countries: India (priority), others
  - Content rating: Completed
  - Target devices: Phones & Tablets
```

**Step 5: Review & Submit**
```
Review app content
Accept Play Store policies
Submit for review
```

**Step 6: Wait for Review**
```
Standard review time: 24-48 hours
Expedited review: Not available for free apps
Monitor console for approval/rejection
```

### Post-Submission

- ✅ App approved → Live on Play Store
- ❌ App rejected → Review feedback and fix issues
- 📧 Email notification sent to developer account
- 📊 Monitor app performance in Console

---

## Beta Testing Setup

### Internal Testing Track

**Step 1: Add Testers**
```
Play Console → Internal testing → Manage testers
Add email addresses of QA team
```

**Step 2: Generate Test Link**
```
Copy test link provided
Share with internal testers
```

**Step 3: Testers Install**
- Click link from Android device
- Tap "Install" or "Update"
- App installs from Play Store

**Step 4: Collect Feedback**
- Gather bug reports
- Track feature requests
- Document crash logs

### Closed Testing Track (Alpha/Beta)

**Step 1: Set Up Closed Track**
```
Play Console → Testing → Closed testing → Create track
Track name: "Alpha" or "Beta"
Add tester groups
Set max number of testers (e.g., 100 for Beta)
```

**Step 2: Upload Release**
```
Create new release in track
Upload APK
Write release notes
Set rollout percentage (e.g., 50%)
```

**Step 3: Share with Testers**
```
Generate public link
Share via email/social media
Testers opt-in to testing
Receive updates automatically
```

**Step 4: Promote to Production**
```
Once Beta testing complete:
Promote release to Production track
Release to 100% users
```

---

## Troubleshooting

### Installation Issues

#### Issue: "App not installed"
```
Solution:
1. Enable "Unknown sources" in Settings
   Settings → Security → Unknown sources → Enable
   
2. Check device storage:
   Free up at least 200MB space
   
3. Verify APK integrity:
   adb install -r app-release.apk
   
4. Clear Play Store cache:
   Settings → Apps → Google Play Store → Storage → Clear cache
```

#### Issue: "Insufficient space"
```
Solution:
1. Free up device storage (delete unused apps/files)
2. Install on microSD card:
   Settings → Apps → App permissions → Storage
```

#### Issue: "Installation failed - security error"
```
Solution:
1. Uninstall previous version:
   adb uninstall com.scorenow.mobile
   
2. Sign APK properly:
   flutter build apk --release
   
3. Verify certificate:
   keytool -list -v -keystore scorenow-key.keystore
```

### Runtime Issues

#### App Crashes on Launch
```
Debug with logs:
adb logcat | grep scorenow

Check common causes:
1. Missing backend API endpoint
2. Uncaught exception in main.dart
3. Missing required permissions
```

#### Login Fails
```
Verify:
1. Backend API is running (http://localhost:5173)
2. Firebase configuration is correct
3. Internet connectivity on device
4. API endpoint is accessible from device
```

#### API Errors (502, 503)
```
Solutions:
1. Check backend server status
2. Verify API URL in app configuration
3. Check network connectivity (3G/WiFi)
4. Monitor server logs for errors
```

#### Notification Not Received
```
Troubleshoot:
1. Verify Firebase Cloud Messaging configured
2. Check device notification settings
3. Ensure app has notification permissions
4. Monitor FCM delivery status in Firebase Console
```

---

## Monitoring & Support

### Firebase Console Setup

**Step 1: Link to Firebase Project**
```
Firebase Console → Project Settings
Copy Config → Add to Flutter app
```

**Step 2: Enable Analytics**
```
Firebase → Analytics → Data Stream settings
Verify events are being tracked
```

**Step 3: Set Up Crashlytics**
```
Firebase → Crashlytics
Configure in Flutter app
Crashes automatically reported
```

**Step 4: Remote Config (Optional)**
```
Firebase → Remote Config
Create feature flags for A/B testing
Deploy configurations to users
```

### Performance Monitoring

**Key Metrics to Track**
```
• App startup time (< 3 seconds ideal)
• Screen load time (< 2 seconds ideal)
• API response time (< 1 second ideal)
• Crash-free users (> 99% target)
• ANR (Application Not Responding) rate
• Battery impact
• Data usage
```

### User Support

**Support Channels**
```
1. In-app Help:
   Settings → Help & Support → Contact us
   
2. Email Support:
   support@scorenow.in
   
3. Chat Support:
   In-app chat widget
   
4. FAQ:
   Accessible within app
   
5. Play Store Reviews:
   Monitor and respond to reviews
```

### Update Strategy

**Version Management**
```
Current: v1.0.0
Next: v1.1.0 (minor updates)
Major: v2.0.0 (significant features)

Release Cycle:
- Bug fixes: As needed (v1.0.1, v1.0.2, etc.)
- Features: Every 2-4 weeks
- Major: Every 3-6 months
```

**Forced Update (if critical)
```
Use Firebase Remote Config:
1. Set "minimum_app_version" = 1.0.1
2. Show dialog if app version < minimum
3. Direct user to Play Store
4. Block access until updated
```

---

## Security Considerations

### API Security
```
✅ Use HTTPS only for all API calls
✅ Implement API key rotation
✅ Add request signing/HMAC
✅ Rate limiting on endpoints
✅ Input validation on all fields
```

### Data Security
```
✅ Encrypt sensitive data at rest (flutter_secure_storage)
✅ Use secure HTTP headers
✅ Implement certificate pinning
✅ Clear sensitive data on logout
✅ PAN/Mobile hashing (never store in plain text)
```

### App Security
```
✅ Obfuscate Dart code (flutter build apk --obfuscate)
✅ Remove debug symbols from release build
✅ Implement root/jailbreak detection
✅ Secure biometric authentication
✅ Session timeout (auto-logout after 15 min)
```

---

## Distribution Checklist

### Before Going Live

**App Quality**
- [ ] All features tested
- [ ] No crashes in QA
- [ ] Performance optimized
- [ ] Battery impact acceptable
- [ ] UI/UX polish complete

**Documentation**
- [ ] Privacy policy published
- [ ] Terms of service ready
- [ ] User guide available
- [ ] FAQ prepared
- [ ] Support email ready

**Marketing**
- [ ] App Store listing optimized
- [ ] Screenshots and descriptions ready
- [ ] App icon finalized
- [ ] Marketing materials prepared
- [ ] Social media posts planned

**Legal & Compliance**
- [ ] Privacy policy reviewed by legal
- [ ] Data handling compliant with regulations
- [ ] Permissions justified
- [ ] GDPR/CCPA compliance verified
- [ ] Regional regulations checked

### Going Live

1. **Final QA:** Run full test suite one last time
2. **Review Response:** Prepare responses to common Play Store feedback
3. **Monitor Launch:** Watch first 24 hours closely
4. **Support Ready:** Ensure support team briefed on app
5. **Analytics Dashboard:** Set up real-time monitoring

---

## Post-Launch Support

### Week 1
- [ ] Monitor crash rates
- [ ] Respond to user reviews
- [ ] Address critical bugs
- [ ] Gather initial feedback

### Month 1
- [ ] Analyze user behavior
- [ ] Plan v1.0.1 update
- [ ] Optimize based on feedback
- [ ] Review performance metrics

### Ongoing
- [ ] Regular security updates
- [ ] Feature enhancements
- [ ] API compatibility updates
- [ ] Device/OS compatibility testing

---

## File Location

```
APK File:  /Users/sa40091223/Desktop/ScoreNow/mobile_flutter/
           build/app/outputs/flutter-apk/app-release.apk

Source:    /Users/sa40091223/Desktop/ScoreNow/mobile_flutter/

Docs:      /Users/sa40091223/Desktop/ScoreNow/
           MOBILE_WEB_FEATURE_COMPARISON.md
           MOBILE_APP_DEPLOYMENT_GUIDE.md (this file)
```

---

## Quick Commands Reference

```bash
# Install on emulator
adb install -r build/app/outputs/flutter-apk/app-release.apk

# Uninstall app
adb uninstall com.scorenow.mobile

# View logs
adb logcat | grep scorenow

# Get package info
adb shell pm dump com.scorenow.mobile

# Clear app data
adb shell pm clear com.scorenow.mobile

# Check installed packages
adb shell pm list packages | grep scorenow

# Launch app
adb shell am start -n com.scorenow.mobile/.MainActivity

# Stop app
adb shell am force-stop com.scorenow.mobile
```

---

**Ready for Deployment!** 🚀

Your ScoreNow mobile app APK is ready for distribution. Follow the deployment steps above to install, test, and release to users.

For questions or issues, refer to the troubleshooting section or contact your Flutter development team.

---

*Last Updated: 2026-11-16*  
*APK Version: 1.0.0*  
*Status: Ready for Production*

