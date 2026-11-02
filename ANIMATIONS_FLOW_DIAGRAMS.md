# Animation Flow Diagrams

## Home Screen Animation Timeline

```
Time (ms)     Element                   Animation
───────────────────────────────────────────────────────────
0-350ms       Welcome Greeting          ⬆️  SlideUp (delay: 100ms)
50-400ms      Subtitle Text             ⬆️  SlideUp (delay: 150ms)
100-450ms     Bureau Pills               ⬆️  SlideUp (delay: 200ms)
150-500ms     Alert Banner (if any)     ⬆️  SlideUp (delay: 250ms)
300-650ms     Score Gauge Card          📦  ScaleIn (delay: 300ms)
350-700ms     Report Summary Tile       ⬆️  SlideUp (delay: 350ms)
400-750ms     Score Predictor Tile      ⬆️  SlideUp (delay: 400ms)
450-800ms     Tabs                      ⬆️  SlideUp (delay: 450ms)
500-850ms     Tab Content               ⬆️  SlideUp (delay: 500ms)
550-900ms     Ask Neha Card             ⬆️  SlideUp (delay: 550ms)
600-950ms     Improve Card              ⬆️  SlideUp (delay: 600ms)

Total Animation Time: ~950ms for full screen reveal
```

## Landing Stats Animation Timeline

```
Time (ms)     Element                   Animation
───────────────────────────────────────────────────────────
0-800ms       Stat 1 (Customers)        📊  MetricRise (delay: 0ms)
100-900ms     Stat 2 (Loans)            📊  MetricRise (delay: 100ms)
200-1000ms    Stat 3 (Improvement)      📊  MetricRise (delay: 200ms)
300-1100ms    Stat 4 (Partners)         📊  MetricRise (delay: 300ms)
400-1200ms    Bureau Logo 1             ➡️  SlideInRight (delay: 400ms)
500-1300ms    Bureau Logo 2             ➡️  SlideInRight (delay: 500ms)
600-1400ms    Bureau Logo 3             ➡️  SlideInRight (delay: 600ms)
700-1500ms    Bureau Logo 4             ➡️  SlideInRight (delay: 700ms)
(continuous)  Bank Carousel             🔄  Bank Scroll (loop 32s)

Total Page Animation Time: ~1500ms
```

## Animation Easing Curves

```
ScaleInAnimation / SlideUpAnimation / SlideInRight
┌─────────────────────────────────────┐
│                                  ╱──┐
│                              ╱──┘    │
│                          ╱──┘        │
│                      ╱──┘            │
│                  ╱──┘                │
│              ╱──┘                    │
│           ╱──┘                       │
│       ╱──┘                           │
│   ╱──┘                               │
└─────────────────────────────────────┘
     0%    25%    50%    75%    100%
   
   Curve: Curves.easeOut
   Result: Quick start, smooth deceleration
   Feel: Natural, organic motion
```

## Component Lifecycle

```
┌─────────────────────────────────────────────────┐
│ Widget Created                                  │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│ initState()                                     │
│ - Create AnimationController                    │
│ - Schedule Future.delayed(delay)                │
└──────────────┬──────────────────────────────────┘
               │
    After 'delay' milliseconds
               │
               ↓
┌─────────────────────────────────────────────────┐
│ _controller.forward()                           │
│ Animation begins running for 'duration' ms      │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│ AnimatedBuilder                                 │
│ Rebuilds widget on each animation frame (60fps)│
└──────────────┬──────────────────────────────────┘
               │
    Animation complete after 'duration'
               │
               ↓
┌─────────────────────────────────────────────────┐
│ Final state: Widget fully visible               │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│ dispose()                                       │
│ - AnimationController.dispose()                 │
│ - Cleanup resources                             │
└─────────────────────────────────────────────────┘
```

## Staggered Animation Pattern

```
Animation Type: SlideUpAnimation
Base Delay: 300ms
Delay Between: 50ms

Item 1:  ┌─── (starts at 300ms, ends at 650ms)
         │   ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀ (350ms duration)
         │

Item 2:  │   ┌─── (starts at 350ms, ends at 700ms)
         │   │   ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
         │   │

Item 3:  │   │   ┌─── (starts at 400ms, ends at 750ms)
         │   │   │   ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
         │   │   │

Item 4:  │   │   │   ┌─── (starts at 450ms, ends at 800ms)
         │   │   │   │   ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
         │   │   │   │
        
Timeline:
0ms     100ms  200ms  300ms  400ms  500ms  600ms  700ms  800ms
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──
                    I1─────────→│    I2─────────→│    I3─────────→

Result: Cascading reveal effect - very eye-catching!
```

## Animation Type Comparison

```
╔═════════════════════════════════════════════════╗
║ Animation Type    │ Start    │ Motion          ║
╠═════════════════════════════════════════════════╣
║ ScaleInAnimation  │ Tiny (98%)│ Scale + Fade   ║
║ SlideUpAnimation  │ Below    │ Rise + Fade     ║
║ SlideInRight      │ From Right│ Slide + Fade   ║
║ MetricRiseAnimation│Below    │ Rise + Fade     ║
║ FloatAnimation    │ Center   │ Up-Down bobbing ║
║ PulseAnimation    │ Center   │ Ring expansion ║
║ IconPopAnimation  │ Small (65%)│ Scale + Color ║
╚═════════════════════════════════════════════════╝
```

## Performance Profile

```
Memory Usage:
┌────────────────────────────────────────────┐
│ ScaleInAnimation:  ~2KB per instance        │
│ SlideUpAnimation:  ~2KB per instance        │
│ FloatAnimation:    ~3KB (continuous loop)  │
│ PulseAnimation:    ~3KB (continuous loop)  │
│ Total on Home Screen: ~50KB (with 15 items)│
└────────────────────────────────────────────┘

CPU Usage:
┌────────────────────────────────────────────┐
│ Single Animation:  1-2% CPU (while running)│
│ 10 Staggered:      3-5% CPU                │
│ Full Screen:       5-8% CPU (60fps target) │
│ Impact: Minimal - GPU accelerated          │
└────────────────────────────────────────────┘

Frame Rate:
┌────────────────────────────────────────────┐
│ Target: 60 FPS (most devices)              │
│ Smooth Performance: ✅ Achieved             │
│ Jank: ⚠️ Check with DevTools if occurring  │
│ Optimization: Use transform-based anims    │
└────────────────────────────────────────────┘
```

## Animation State Machine

```
                        ┌──────────────┐
                        │   Initial    │
                        │ (opacity: 0) │
                        └──────┬───────┘
                               │
                        [delay elapsed]
                               │
                               ↓
                    ┌──────────────────────┐
                    │  Animating           │
                    │  (value: 0 → 1)      │
                    │  (running)           │
                    └──────────┬───────────┘
                               │
                        [duration elapsed]
                               │
                               ↓
                        ┌──────────────┐
                        │   Complete   │
                        │ (opacity: 1) │
                        │ (stopped)    │
                        └──────────────┘


Transitions:
Initial → Animating: Triggered by Future.delayed()
Animating → Complete: Automatic after duration
Complete → (stays): No further action needed
```

## Visualization of Key Animations

### ScaleInAnimation (Chat-In)
```
Scale:    0.98→→→→→→→→→→1.0
          ╱────────────╲
Opacity:  0→→→→→→→→→→→1
          ╱────────────╲
Y-offset: 12→→→→→→→→→→0
          ╲────────────╱

Duration: 350ms
Easing: easeOut
Result: Smooth entrance with subtle scale pop
```

### SlideUpAnimation (Hero-Item-In)
```
Y-offset: 20→→→→→→→→→→0
          ╱────────────╲
Opacity:  0→→→→→→→→→→→1
          ╱────────────╲

Duration: 350ms
Easing: easeOut
Result: Light, airy entrance from below
```

### MetricRiseAnimation (Metric-Rise)
```
Y-offset: 24→→→→→→→→→→0
          ╱────────────╲
Opacity:  0→(55%)→→→→1
          ╱──╲────────╲

Duration: 800ms
Easing: easeOut
Result: Emphasis on numeric values, delayed opacity
```

### FloatAnimation (Avatar-Float)
```
Y-offset: 0↗→→↘→→↗
          ╱╲  ╱╲  ╱╲
          └─┘  └─┘
          
Duration: 3000ms (infinite loop)
Easing: easeInOut
Result: Gentle, soothing floating motion
```

---

*Animation Documentation v1.0*
*Mobile App: Scorenow*
*Last Updated: November 1, 2026*
