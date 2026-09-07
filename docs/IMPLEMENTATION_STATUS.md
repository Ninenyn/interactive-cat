# Validation record

Validated on 7 September 2026 against a local production build.

- Lint and strict TypeScript: pass.
- Behavior, gesture, cooldown, scheduling, rotation, and storage tests: 15 passed.
- Production build: pass (Next.js static prerendered home route).
- Chrome and WebKit: 11 browser tests passed across the core suite and Bo acceptance suite.
- The native Chromium CDP touch test is intentionally skipped in WebKit; WebKit has its own pointer/keyboard/visual acceptance coverage.
- Layouts checked at 320, 375, 390, 430, and 1280 pixels.
- Original 3D pets and note layouts inspected visually in both modes.
- Real Chromium touch events verified tap, stroke, and pointer cancellation.
- Jew's occasional bite, release, and cooldown verified through browser state transitions.
- Bo's nose-boop, long press, and independent Heart Note discovery verified in both browser engines.
- Found-note opening, saving, persistence, and keyboard dismissal verified.
- OS theme, manual override, sound toggle, and reduced-motion preference verified.
- No application console errors in the Bo acceptance checks; no unhandled page errors in layout checks.

The procedural models, sounds, and messages are original. No external asset, font, quote, audio, or analytics service is required.

Screenshots and traces are generated under ignored test-results/. Use scripts/verify-live.mjs with the production URL for anonymous HTTPS, canvas rendering, petting, theme switching, mobile overflow, console-error, and resource-host verification after deployment.

Physical iPhone/Android hardware and device-specific vibration were not available for testing. WebKit is Safari-engine coverage, not a physical iPhone claim.
