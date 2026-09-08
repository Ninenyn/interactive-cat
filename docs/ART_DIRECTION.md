# Jew and Bo — reference-based art direction for a clean rebuild

Intermediate art-direction notes from direct inspection of the two user attachments. These are proposals for the new modeling plan, not an assertion that an unseen 3D form or numeric tolerance has already been approved. No current project models or code were used.

## 1. Reference authority and anchor views

| Character / decision | Authoritative attachment and view | What it establishes |
| --- | --- | --- |
| Jew: identity, coat, face, attitude | `042d83c2-3c1c-4165-99aa-f37c31fa50e2.png`, JEW — MISCHIEF STUDY | Black coat; amber eyes; triangular upright ears; compact face; mischievous, restrained attitude. |
| Jew: face geometry and default squint | Top-right SQUINT portrait | Best near-frontal face anchor; cheek width, central forehead plane, lid angles, nose and mouth proportions. It is a perspective portrait, not a certified orthographic front. |
| Jew: whole-body silhouette | Lower-left SIT (SQUINT) | Large head over compact seated body; small neck gap; stable broad paws; tail curled beside the body. |
| Jew: alternate expression / locomotion | Top-center SIDE-EYE, top-left CHEEKY, lower-right WALK | How eye aim and lid asymmetry change the mood; walking silhouette and raised tail. These should become poses of the same approved mesh. |
| Bo: identity and body | `bdf4310f-fcdc-4e2e-bd86-7de37229f673.png`, JEW & BO — CONCEPT 01, lower-center STAND | Best relatively unposed whole-body anchor: golden puppy, large head, floppy ears, short sturdy limbs, cream muzzle/chest/paw accents, lifted curved tail. |
| Bo: face and ear detail | Lower-left SIT | Soft round skull, low muzzle, large dark eyes, dark nose, ears framing the cheeks; seated haunches and curled tail. |
| Bo: gait cross-check | Lower-right WALK | Body length and foreleg reach; continuity of head, ears and cream chest during a pose. |

The cat in CONCEPT 01 is visibly grayer and has much rounder, more open eyes than MISCHIEF STUDY. Do not blend those competing features back into Jew. Use the later Jew sheet for Jew. “All black” describes Jew's fur: the approved reference still includes amber eyes, a muted pink nose and salmon inner ears; these are facial anatomy accents, not gray fur patches.

## 2. Shared visual language

- Small, charming collectible-animal proportions with recognizable cat/dog anatomy. Soft volumes first, deliberately visible polygon planes second.
- Low-poly in the sense of an intentionally faceted sculptural surface. Avoid a mesh assembled from visibly intersecting spheres, cones, cylinders or boxes. Temporary construction pieces are acceptable during rough blockout only; the approved silhouette and render must read as a coherent animal.
- Keep the face readable and the silhouette gently curved despite faceting. Face planes are smaller near eyes, muzzle and mouth; larger on forehead, flanks and limbs.
- Facets follow the volume: forehead to brow, brow to cheek, muzzle to jaw, shoulder to foreleg, rump to hock. Random face sizes or random flat face colors create noise without improving likeness.
- No individual fur strands, fur cards, clothing, accessories, oversized teeth, exaggerated grin or invented eyebrows in the first model pass. These are absent from the approved targets.
- Use a plain neutral backdrop and simple soft studio lighting for review. Preserve a fixed camera, pose, framing and light setup in every like-for-like comparison. Pretty lighting must not conceal a silhouette discrepancy.

## 3. Jew — shape construction and comparison landmarks

### Head

Build one broad, rounded wedge/oval skull with a relatively flattened cheek line. The cranium is large; the lower jaw is compact. The forehead has a visible central vertical-to-tapering plane which leads to the small nose. Cheek planes widen around the eye/outer-cheek region and turn inward toward the chin; avoid a long dog-like muzzle.

The ears are two large upright triangular wedges, with thickness, a dark rim, inset inner-ear planes and slightly different projected widths in a three-quarter view. They emerge organically from the skull. Avoid long thin spikes or little cones perched on top. Ear tips are pointed without becoming needle-like.

The muzzle is short and integrated with the cheeks: two restrained rounded pads, a small low triangular muted-pink nose, a short philtrum and a subtle closed mouth. No protruding human lips. No long whisker rods are needed to match the supplied image.

Eyes must sit within the facial surface. Build a continuous lid/eye-socket region that overlaps the eyeball sufficiently to prevent a pasted-on or bulging effect. Amber iris, broad dark pupil and small restrained highlights; do not substitute glowing yellow discs. The reference can show a narrow light wedge at the eye's side, but does not justify a large white human sclera ring.

### Body and paws

Compact chest and torso with a hidden/short-looking neck, narrow enough below the head for the large-head silhouette to remain obvious. The seated form has a rounded haunch and stable bottom mass. Forelegs taper only moderately, ending in broad little paws with restrained toe divisions. Avoid spindly stems, detached round balls as feet or a very thin waist.

The tail has thickness throughout, tapering gently to its tip. The seated tail curves across the ground outside the left haunch in the reference projection; the walking tail rises in a hooked arc. A single pose should not be baked into a separate disconnected tail object with a visible root seam.

### Projected measurement estimates

These are coarse starting bands from visually inspecting the supplied 1536 × 1024 image. They are not measured orthographic anatomy. Confirm with a traced overlay before using them as constraints. Use the same view for both numerator and denominator.

| Reference / ratio | Initial projected estimate | How to use |
| --- | --- | --- |
| Near-front SQUINT: skull/cheek width divided by crown-to-chin height, excluding ears | About 1.3–1.4 | Preserve the broad face instead of making it a tall narrow oval. |
| Near-front SQUINT: eye-center separation divided by max cheek width | About 0.45–0.48 | Check eye spacing before iris detail. |
| Near-front SQUINT: visible eye width divided by max cheek width | About 0.20–0.23 per eye | Prevent huge circular toy eyes from replacing the reference's restrained almond apertures. |
| Near-front SQUINT: nose width divided by max cheek width | About 0.12–0.15 | Keep the nose small. |
| SIT: max projected head width divided by ground-to-ear-tip height | About 0.50–0.55 | First whole-body large-head proportion check. |
| SIT: crown-to-chin head height excluding ears divided by ground-to-ear-tip height | About 0.36–0.40 | Cross-check head mass independently of tall ears. |
| SIT: one near front paw's projected width divided by max head width | About 0.25–0.30 | Preserve the broad, grounded little paws. |

Primary overlay landmarks: both ear tips; four ear-root corners; crown; widest left/right cheek; inner/outer eye corners; eye centers; nose tip; nose-to-mouth junction; chin; chest base; outer haunch; front-paw contact points; tail root, widest bend and tip.

These ratios are directional. Do not distort a plausible three-dimensional animal solely to force every perspective illustration pose into one exact measurement set. Resolve inconsistencies with the approved anchor view and an explicit proposal.

## 4. Bo — shape construction and comparison landmarks

### Head, ears and expression

Build a broad domed puppy skull with a short, broad muzzle. The muzzle is two soft cream volumes ending in a small-to-medium dark triangular nose; the cheeks connect smoothly to the jaw. Avoid a pointed adult-dog snout, a human smile or a heavy wrinkled bulldog muzzle.

The large drooping ears are a major identity feature. They attach high on the head, fall down outside the cheek and taper to a rounded pointed end around the lower cheek/jaw level. Give each ear thickness, a convex outer surface and a mild inward fold. In the reference the near ear forms a broad golden sheet beside the face; it is not a long tube, tiny triangle or nearly horizontal wing.

Eyes are round-to-soft-oval and dark brown/near-black, with warm reflections and small highlights. They are embedded beneath a gentle forehead transition. The expression comes from big attentive eyes, a broad puppy head and relaxed ear carriage. Keep the closed mouth subtle. Do not make the nose huge to compensate for an undersized muzzle.

### Body, paws and tail

Body is a small sturdy puppy with a compact, rounded ribcage and short substantial limbs. Chest drops between the forelegs. The belly is softly tucked only a little; avoid the lean adult retriever silhouette. Hindquarters are rounded, with an anatomical hock shape and planted paws.

Paws are broad, slightly flattened on the ground, with small geometric toe indications. Lower forelegs and feet have cream accents. The tail is relatively thick, curves upward in stand/walk, and narrows toward a soft point. Seated tail curves on the ground. No fluffy particle fur is necessary to communicate the reference.

### Projected measurement estimates

Use the lower-center STAND as the body anchor. The viewpoint shortens the torso and makes the near ear/paws larger, so front and side orthographic numbers cannot be reliably recovered from this sheet alone.

| Reference / ratio | Initial projected estimate | How to use |
| --- | --- | --- |
| STAND: ear-to-ear head width divided by ground-to-crown height | About 0.57–0.63 | Check the generous puppy head/ear silhouette. This includes ears, unlike Jew's skull width. |
| STAND: crown-to-chin height divided by ground-to-crown height | About 0.40–0.44 | Head remains a large fraction of total character height. |
| STAND: max skull width excluding floppy ears divided by ground-to-crown height | Roughly 0.43–0.48 | Treat as lower-confidence until a traced overlay separates skull from ear boundary. |
| STAND: one near front paw width divided by full head width including ears | Roughly 0.23–0.28 | Prevent tiny paws relative to the puppy head. |
| Face: muzzle width relative to the bony face | Visibly broad and short; establish with overlay instead of a guessed single ratio | Muzzle depth is not supplied by a profile. Propose and review it. |

Primary overlay landmarks: crown; ear attachment points; maximum near/far ear extent and ear tips; cheek outline; eye centers and corners; muzzle corners; nose tip; chin; top shoulder; chest bottom; highest rump; belly low point; elbow/hock; each planted paw corner; tail base, bend and tip.

## 5. Geometry and faceting workflow

1. Establish ground plane, scale, camera and rough volumes using an untextured neutral clay material. Use only a diffuse neutral light. For Jew also prepare a solid dark silhouette pass; for Bo a silhouette pass in the same camera.
2. Solve overall head/body ratio, skull and cheek contour, ear silhouette, limb thickness, muzzle projection and paw scale. No coat colors or eye sparkle can count as evidence of correct geometry at this stage.
3. Merge or retopologize the visible construction so neck, cheeks, shoulders, legs and tail roots do not look like intersecting primitives. Connected deformation regions should deform continuously. Separate eye surfaces and carefully attached ears are technically acceptable if joints remain visually continuous.
4. Add enough edge flow around lids, mouth corners, cheek bulge, shoulder, elbow, hip and hock to support expressions and movement. Design deformation topology first; use final triangulation/flat shading to achieve the faceted surface. Do not prematurely reduce the eyes/lids to a handful of rigid triangles.
5. Design large and small planes deliberately. Retain readable angular edges around the ears and facet rhythm over the forehead and muzzle; retain larger calmer planes on the body. Verify normal orientation, cracks, intersections and harsh accidental shadow seams before paint.
6. Keep a source mesh with editable topology and an export mesh. Decide an actual polygon budget after the silhouette and face are approved and benchmarked on the target device. “Low-poly” is a style requirement here, not permission to ruin the face to hit an arbitrary tiny triangle count.

## 6. Color/material pass — after geometry approval

### Jew

- Coat is uniformly black, including chest, muzzle, legs and tail. Facet/light variation may range from near-black shadow to subtly lit black; do not add broad gray/beige coat regions or paint every polygon a random gray.
- Use a matte-to-soft-satin fur-like surface without literal strand fur. A large soft key plus restrained fill/rim should reveal black volume without turning the albedo gray.
- Amber irises; very dark pupils; small coherent reflections. Nose and inner ears retain muted salmon/pink from the reference, as shown in the authoritative attachment; the black-coat requirement does not remove those visible anatomy accents.
- Review on both the neutral studio background and the actual dark-mode background. If contrast is weak, adjust scene light/background separation first, rather than recoloring Jew gray.

### Bo

- Main coat warm honey/golden yellow. Ears and shaded fur can read richer ochre. Cream accents on muzzle, chin/chest and paw ends are clearly present in the reference; the seated tail tip has a clear cream area, while standing/walking tail highlights are not enough to prove the same marking. Resolve that continuity in a proposed marking map.
- Use the reference's specific boundaries; do not invent a large white forehead blaze or body patch. Light planes on the forehead must be distinguished from actual paint markings during a separate color-map review.
- Dark brown nose and eyes; warm small highlights. Fur surface matte/soft satin, eye surface smoother. Avoid metallic gold or plastic gloss across the whole animal.

Do not publish exact hex colors sampled from the reference as definitive albedo: the sheet bakes in warm studio lighting. Create a small swatch/material test under the fixed review light and choose the approved appearance there.

## 7. Expressions and rig acceptance

Build one base mesh per character. Expressions and sit/stand/walk must be derived from that mesh/rig so face proportions remain stable.

Jew expression controls:

- SQUINT: both upper lids descend to narrow the aperture; slight inner-corner angle gives a watchful/fierce mood. No added bushy eyebrows, angry V-shaped forehead ridge or exposed fangs.
- SIDE-EYE: move iris/eye aim laterally while retaining squinted lids. Avoid eye aim so far off-axis that pupils disappear or the eyes become crossed.
- CHEEKY: controlled upper-lid asymmetry and slight head attitude. Preserve short muzzle, cheek shape and nose location; the reference is restrained rather than a broad smile.
- Blink and later playful bite can be added after the three reference expressions pass. Bite belongs to the interaction behavior, not the neutral face shape. Test that lid closure covers the cornea and never clips through it.

Bo expression controls:

- Default attentive gentle face from the sheet: large dark eyes, relaxed closed mouth and drooping ears.
- Blink, small head tilt and mild ear follow-through can be proposed after likeness passes. No new tongue-out grin is implicitly approved by these attachments.

Rig/pose tests: neutral stand, reference sit, one reference-like walk contact, head yaw/pitch, tail bend, then eyelid range. Check paw contact and foot sliding; mouth/eye intersections; sharp collapses at elbows/hocks; ear/skull separation; tail root continuity. If M4 rigging requires topology changes, reopen the affected M2/M3 geometry or material review and regenerate its evidence before export approval.

## 8. Review order

The canonical production order and stage IDs are in `PRODUCTION_PLAN.md` and `ACCEPTANCE.md`: M0 reference/tool proof, M1 clay, M2 face/topology and expression feasibility, M3 color/material, M4 full rig plus early GLB proof, M5 production motion, M6 mobile integration, M7 release review.

The expression checks above are split deliberately: test lid range and topology feasibility before final color, then finish the full deformation rig and production clips afterward. If later rigging changes an approved silhouette or face, return that changed scope for review.

For image comparison, align camera and character scale first. Show reference and render at the same visible height; provide a silhouette overlay and selected face landmarks. A model judged only from a prettier unrelated angle has not passed likeness review.

Do not claim “100% identical from every angle” from two perspective concept sheets. Match the supplied anchor views closely and show inferred new views for review. The user has already specified which references to use; do not ask to reconfirm that choice before preparing reviewable 3D work.

## 9. Specific ambiguities that must remain explicit

- No true orthographic side or rear view of either character. Muzzle depth, skull depth, ear thickness and attachment depth, chest cross-section, back anatomy, rear coat markings and tail underside are not fully specified.
- Bo has no direct front-face portrait. Eye spacing and far-ear size are affected by perspective in every supplied Bo image.
- Jew has a near-front squint portrait but no neutral front-facing full body. Do not infer that neutral must have the wide-open eyes of the older Concept 01 cat.
- Different art panels can differ subtly in proportions and facet layout. Choose one anchor per decision, then use one coherent model; do not build an independent mesh for every panel.
- Exact render lens, light intensity, exposure and material roughness are unknown. Lock a reproducible studio setup and evaluate camera errors separately from geometry errors.
- Lower-confidence numbers above are starting estimates only. The decisive criterion is a traced, aligned visual comparison and owner approval of the new blockout.
