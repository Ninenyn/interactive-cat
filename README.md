# Jew & Bo

A quiet, mobile-first companion room with two little friends: Jew, a mischievous black cat, and Bo, a warm golden retriever. Jew appears in Moonlight; Bo appears in Daylight.

Original low-poly characters have oversized heads, continuous sculpted muzzles, integrated legs and paws, evenly arranged triangular facets, and soft contact shadows. Coat colors stay consistent while lighting reveals the geometry. They walk on four legs, turn toward their destinations, and settle down between short strolls. The opening screen contains only the pets and a small corner menu.

## Play

- Tap a head to greet your companion, wherever they have wandered.
- Tap the empty floor to invite the nearest pet to walk over.
- Slowly stroke the head, cheek, back, or chin. Small back-and-forth strokes become scratches.
- Touch a paw. Jew gently taps; Bo offers his paw.
- Drag a companion to carry them around. Jew nibbles free after a long drag; Bo is happy to stay carried. Moving the pointer nearby does not trigger an attack.
- Hold a finger still for a moment to breathe together.
- Stay a little. Your companion may dig up a folded heart paper. Tap it to unfold, and keep a favorite.

The room follows your device appearance until you choose Daylight or Moonlight from the corner menu. Switching appearance switches the visible companion. The small room-settings control contains sound, Heart Notes, breathing, and About. About can restore automatic theme selection.

Keyboard: Tab to focus the visible pet and use Space/Enter to pet, P for paw, H to invite play, B to breathe, and arrows to guide their attention. All visible controls work without a mouse.

## Development

Requires Node.js 20.9 or newer (Node.js 22 LTS recommended).

```sh
npm ci
npm run dev
```

Production validation:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

The browser suite starts the production server on port 3210, or reuses it. For an installed Chrome browser, use `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. Set `TEST_URL` to exercise a deployed URL.

## Architecture

Next.js App Router, TypeScript, React, Three.js, and React Three Fiber. There is no backend, login, analytics, external model, texture or font request, or quote API.

- `src/interactions`: explicit behavior ownership, gesture classification, pointer capture/cancellation, and mutable animation runtime.
- `src/components/PetGeometry.tsx`: continuous cross-section meshes with symmetric silhouettes and integrated coat markings.
- `src/components/CompanionScene.tsx`: articulated 3D characters, camera, lighting, frame scheduling, and original 2D fallback.
- `src/heart-notes`: 72 original messages, discovery scheduling, rotation, and validated local preferences.
- `src/audio`: subtle original synthesized sounds, enabled only after interaction.
- `src/hooks`: device preferences and visibility.
- `tests`: behavior/cooldown/storage unit tests and production browser tests.

Each pet has an independent state machine for major behavior. A shared runtime coordinates note discovery and pointer routing. Locomotion uses bounded ground positions, steering, separation checks, distance-driven leg animation, and randomized rests; touching a pet pauses its walk. Screen hit regions are projected from the moving models through the same camera used by the renderer. Drag handling distinguishes carrying from petting and releases pointer capture on cancellation. The system cursor is never hidden, trapped, or repositioned.

First-session note discoveries require at least two meaningful interactions and 14–24 seconds of active time. Returning sessions wait 22–38 seconds. Later discoveries wait 45–75 seconds. At most five notes appear per session. A busy companion, an open collection or note, or a hidden page cannot start a discovery. Notes do not repeat within each companion's 36-message collection until exhausted; repeats then favor the oldest third.

Only theme override, sound preference, first-visit completion, found IDs, and favorites persist in localStorage. Invalid storage is repaired in memory. If storage is unavailable, the room continues for the current visit and About explains the limitation.

## Performance and accessibility

Original faceted geometry; no shadow maps, texture downloads, or external audio. Soft shadows use a small, locally generated alpha texture. Device pixel ratio is capped at 1.5. The renderer schedules frames on demand, targets 60 fps, falls back to 30 fps on limited devices or slow frames, and uses 12 fps for reduced motion. Rendering and behavioral time pause while hidden. Reduced motion removes roaming, decorative animation, and breathing expansion while retaining screen-reader announcements and contact feedback.

Pointer Events support touch, mouse, and pen, including cancellation and capture. The full-screen companion canvas handles touch gestures. Native dialogs handle focus and keyboard dismissal for settings content. Primary controls are at least 44 × 44 CSS pixels. Audio is off initially; haptics are optional and feature-detected. Without WebGL, an original faceted vector version of the visible companion preserves wandering, interaction controls, and state feedback. Its animation runs only when the fallback is actually displayed.

## Deployment

Repository: https://github.com/Ninenyn/interactive-cat

Vercel project: `jew-and-bo`. Public app: https://jew-and-bo.vercel.app

Production is deployed with the Vercel CLI. Automatic GitHub redeploys require authorizing the repository in the project's Git settings; the previous account connection had no accessible GitHub namespace.

## Scope

Jew & Bo offers gentle encouragement and companionship. It is not a substitute for professional mental health care.

Notes are deliberately general encouragement, written for this project. They do not diagnose or promise recovery. Collections stay in the current browser and are removed when its site data is cleared.

The procedural pets are stylized, not realistic fur simulations. Audio is synthesized, not an animal recording. The vector fallback uses simpler animation. Vibration availability depends on the browser and device. Browser-emulated viewports are not a claim of physical-device testing.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency licenses.
