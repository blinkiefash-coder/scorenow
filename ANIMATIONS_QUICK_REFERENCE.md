# Mobile App Animations - Quick Reference Guide

## Animation Components At a Glance

### **ScaleInAnimation** 🎬
```dart
ScaleInAnimation(
  delay: Duration(milliseconds: 100),
  duration: Duration(milliseconds: 350),
  child: YourWidget(),
)
```
**Usage**: Card reveals, modal entries, prominent content
**Feel**: Smooth scale from 0.98 → 1.0 with fade-in

---

### **SlideUpAnimation** ⬆️
```dart
SlideUpAnimation(
  delay: Duration(milliseconds: 200),
  distance: 20.0,
  child: YourWidget(),
)
```
**Usage**: List items, staggered reveals, content flow
**Feel**: Smooth rise from bottom with fade-in

---

### **SlideInFromRightAnimation** ➡️
```dart
SlideInFromRightAnimation(
  delay: Duration(milliseconds: 100),
  distance: 15.0,
  child: YourWidget(),
)
```
**Usage**: Side panel content, horizontal reveals
**Feel**: Slide in from right with fade

---

### **FloatAnimation** 🌊
```dart
FloatAnimation(
  distance: 7.0,
  duration: Duration(milliseconds: 3000),
  child: YourWidget(),
)
```
**Usage**: Avatars, decorative elements, emphasis
**Feel**: Gentle up-down bobbing motion

---

### **PulseAnimation** 📍
```dart
PulseAnimation(
  duration: Duration(milliseconds: 2200),
  child: YourWidget(),
)
```
**Usage**: Badges, highlights, attention-drawing
**Feel**: Expanding ring effect with opacity pulse

---

### **IconPopAnimation** ✨
```dart
IconPopAnimation(
  delay: Duration(milliseconds: 150),
  child: Icon(Icons.star),
)
```
**Usage**: Icon reveals, emphasis
**Feel**: Scales 0.65 → 1.16 → 1.0, desaturates → saturates

---

### **MetricRiseAnimation** 📊
```dart
MetricRiseAnimation(
  delay: Duration(milliseconds: 200),
  child: Text("42"),
)
```
**Usage**: Numbers, stats, metrics
**Feel**: Rise from bottom with fade-in

---

### **StaggeredListAnimation** 📋
```dart
StaggeredListAnimation(
  baseDelay: Duration(milliseconds: 350),
  delayBetween: Duration(milliseconds: 50),
  animationType: AnimationType.slideUp,
  children: [
    ItemOne(),
    ItemTwo(),
    ItemThree(),
  ],
)
```
**Usage**: Lists, cascading reveals
**Feel**: Cascading entrance with consistent timing

---

## Where Animations Are Applied

### 🏠 Home Screen (`home_screen.dart`)
- Welcome greeting: SlideUpAnimation (100ms)
- Subtitle: SlideUpAnimation (150ms)
- Bureau pills: SlideUpAnimation (200ms)
- Score gauge: ScaleInAnimation (300ms)
- Quick tiles: StaggeredListAnimation (350-500ms)

### 📊 Landing Page (`landing_stats.dart`)
- Stats cards: MetricRiseAnimation with stagger (100ms × index)
- Bureau logos: SlideInFromRightAnimation with stagger (100ms × index)
- Bank carousel: Continuous scroll animation

### 📖 Guides Screen (`guides_screen.dart`)
- Each guide card: SlideUpAnimation (80ms × index)
- Creates smooth cascading reveal

### 📄 Reports Screen (`reports_screen.dart`)
- Each bureau card: ScaleInAnimation (100ms × index)
- Professional card entrance

### 🔘 Button Press (`app_button.dart`)
- All buttons: ButtonPressAnimation
- Scales and dims on tap (150ms feedback)

---

## Animation Timings Summary

```
Short Duration:     220ms
Standard Duration:  350ms (default)
Medium Duration:    550ms
Long Duration:      800ms

Stagger Patterns:
- Landing Stats:    100ms between items
- Home Screen:      50-100ms between items  
- Guides List:      80ms between items
- Reports List:     100ms between items
```

---

## How to Add Animations to New Screens

### Step 1: Import animations
```dart
import 'package:scorenow_mobile/widgets/animations.dart';
```

### Step 2: Wrap widgets
```dart
// Simple animation
SlideUpAnimation(
  child: MyWidget(),
)

// With delay
SlideUpAnimation(
  delay: Duration(milliseconds: 100),
  child: MyWidget(),
)

// For lists
StaggeredListAnimation(
  baseDelay: Duration(milliseconds: 300),
  delayBetween: Duration(milliseconds: 50),
  animationType: AnimationType.slideUp,
  children: myWidgetsList,
)
```

### Step 3: Test
- Run the app on device/emulator
- Observe smooth animations
- Adjust delays if needed

---

## Performance Tips

✅ **Good Practices**
- Use transform-based animations (GPU accelerated)
- Combine multiple animations with staggered delays
- Keep delays under 500ms total for best UX
- Dispose controllers properly (already handled in widgets)

❌ **Avoid**
- Animating opacity alone (use transform + opacity)
- Too many simultaneous animations (causes jank)
- Very long animation durations (feels sluggish)
- Forgetting to dispose AnimationControllers

---

## Testing Animations

### Verify smooth performance:
```bash
flutter run --profile
# Use DevTools Performance tab to monitor frame rate
# Target: 60 FPS (or 120 FPS on high-refresh displays)
```

### Visual testing on real device:
```bash
flutter run -v
```

---

## Future Enhancement Ideas

1. **Page transitions** - Hero animations between routes
2. **Interaction feedback** - Swipe, drag, scroll animations
3. **Parallax effects** - Depth-based scrolling
4. **Haptic feedback** - Vibration with animations
5. **Motion detection** - Accessibility options

---

## Common Issues & Solutions

**Q: Animation feels too fast/slow?**
A: Adjust `duration` parameter (in milliseconds)

**Q: Elements appearing without animation?**
A: Ensure widget is wrapped in animation component

**Q: Animation stuttering?**
A: Check device performance, reduce simultaneous animations

**Q: Animation not triggering?**
A: Verify `Future.delayed()` and `mounted` check in `initState`

---

*Last Updated: November 1, 2026*
*Mobile Animations v1.0*
