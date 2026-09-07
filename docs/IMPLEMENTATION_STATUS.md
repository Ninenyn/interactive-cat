# Validation record

Validated on 7 September 2026 for the minimal shared-room update.

- Lint, strict TypeScript, and optimized production build: pass.
- Unit tests: 20 passed, including walking bounds, pet separation, distance-driven gait, reduced motion, camera projection, first-touch response, behavior, cooldown, scheduling, and storage.
- Chrome and WebKit: 13 browser cases passed across the targeted acceptance runs.
- Native Chromium touch injection is intentionally skipped in WebKit; both engines have their own pointer, keyboard, and visual coverage.
- Both pets remain visible in day and night appearances.
- Layouts checked at 320, 390, 430, 844, and 1280 pixels, including landscape.
- Both pets wander independently, stay separated, and respond to petting at their moved positions.
- Native touch verified tapping, gentle strokes, and cancellation.
- Jew's nibble, release, and cooldown and Bo's boop and long press: pass.
- Each companion's Heart Note discovery, unfolding, saving, persistence, and Escape dismissal: pass.
- OS appearance, manual override, sound, keyboard paws, breathing, and reduced motion: pass.
- Updated low-poly models inspected in phone and desktop views; both light and dark views checked without application console errors.
- WebGL-disabled Chrome check: the visible vector fallback renders both pets and responds to petting.
- Fallback motion only runs when its container is displayed; hidden canvas fallback content cannot update the 3D pets' positions or touch regions.

The characters, faceted geometry, synthesized sounds, and messages are original. Soft shadows use a small generated texture. There are no external model, image, font, quote, audio, or analytics requests.

Ignored test-results/ contains temporary screenshots and traces. scripts/verify-live.mjs checks anonymous HTTPS, both rendered companions, wandering, petting, theme switching, viewport overflow, console errors, and resource hosts after deployment.

Physical iPhone/Android hardware and device-specific vibration were not available. WebKit coverage is engine testing.
