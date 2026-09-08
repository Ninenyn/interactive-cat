# Review and evidence contract

## Stage state

Use `planned`, `in_progress`, `ready_for_review`, `revise`, `approved`, or `blocked`. Planning a stage does not approve it. The original concept references are authorized targets; the new 3D reconstruction is still unreviewed.

Review separately for Jew and Bo. Shape, face, and material submissions should be substantial review packages, not repeated questions about minor edits. A change to an approved feature requires renewed evidence for that changed scope.

## Required review package

- Editable source file and its SHA-256.
- Stage, pet, revision, owner, timestamp and previous approved revision if one exists.
- Reference image hash and selected anchor panel.
- Actual hero render, front/side/back/three-quarter views; turntable for shape changes.
- Face closeups for eyelids, eyes, cheeks, muzzle and ears.
- Tool version, renderer, camera, resolution, pose/frame, background, light and color-management settings.
- Render file hashes and, when applicable, the exact exported GLB hash and viewer revision.
- A short findings list separating technical checks, visual findings, inferred unseen anatomy, and unresolved issues.
- Actual owner feedback and decision scope when supplied; otherwise leave approval pending.

Use the same visible character height, comparable pose and matched camera for reference comparisons. A silhouette overlay and selected face landmarks help diagnosis. No invented percentage likeness score is required. Do not promise pixel-identical Blender/browser output or deterministic GPU image bytes across machines.

## Stage acceptance

| Stage | Must show | Reject / revise when |
| --- | --- | --- |
| M0 | Exact references staged, reliable save/render/export/viewer proof | Tool availability is assumed; references or generated outputs cannot be identified |
| M1 | Coherent clay silhouette, correct large forms, multiple views | Wrong head/body balance, long muzzle/neck, weak paws, disconnected primitive appearance |
| M2 | Approved facial identity, deliberate planes, early lid deformation | Jew is round-eyed, Bo's ears/muzzle depart from reference, eyelids intersect or eyes bulge |
| M3 | Black Jew and golden/cream Bo in neutral and product light | Gray coat patches on Jew, uncontrolled markings, metallic/plastic body, lighting hides shape errors |
| M4 | Stable joint poses and minimal GLB blink/step proof | Skinning collapses, facets break, floor contact fails, exported face/material differs materially |
| M5 | Main clips and risky transitions from one mesh/rig | Foot sliding, clipping, abrupt pose snaps, drift in identity |
| M6 | Actual web asset, theme/interaction/mobile checks | Wrong companion shown, carry/drag failure, target-device performance unverified |
| M7 | Exact release assets plus final visual and behavior evidence | Old renders reused for changed assets, missing release evidence |

## Product behavior carried forward

- Night/dark shows Jew; day/light shows Bo.
- Jew can nibble and release after prolonged carrying. Bo can remain carried.
- Neither companion proactively attacks the cursor.
- Touch/mouse/pen interactions handle cancellation, edge release and theme changes.
- Digging reveals heart notes with encouraging messages.
- Support reduced motion and background pause; report physical-device tests separately from emulation.

Do not use an old rejected mesh as fallback, test fixture or modeling aid. Later WebGL fallback art must be derived from the newly approved design.
