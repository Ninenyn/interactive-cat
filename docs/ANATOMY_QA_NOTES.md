# Anatomy revision: independent reference and QA notes

Reference observations are made from the four user-uploaded images. Ratios below are approximate projected image measurements, not veterinary anatomy measurements or exact hidden 3D dimensions.

## Jew: standing full-body reference

Source: `4506533e-61b3-4a79-8ffd-74c9718bf058.png`.

- Pose is a quadruped stand. Long nearly level back, ribcage behind the shoulder, belly clear of the ground, four distinct limbs, articulated hind hocks, and a raised tapering tail.
- Forelegs descend beneath the shoulder. The elbow does not form a shelf projecting far in front of the chest. Paws are short, broad planted ends rather than shoes.
- Hindquarters require a thigh and lower-leg change of direction. A rear leg should not be another straight foreleg displaced backwards.
- Neck joins the back of the jaw to the shoulders. Nose and mouth should sit on a continuous muzzle volume, with no daylight between feature and supporting face in profile.
- Approximate ratios, normalized to ground-to-withers height: nose-to-rump length 1.5; shoulder-to-rump length 0.95; underside-to-ground clearance 0.48–0.56; ear-tip height about 1.35. Perspective and the partly hidden far limbs limit precision.

## Bo: seated golden retriever reference

Source: `e2f28ba6-cf77-4a20-875b-6c6a173c3481.png`.

- Pose is an upright seated golden, with a substantial neck/chest, long forelegs descending towards two forward paws, and broad folded haunches behind the forelegs.
- Forelegs taper through elbow and wrist; the shoulders flow into the upper limbs. Keep a readable gap between the lower forelegs. Folded hind paws sit outside and behind the forepaws.
- The nose is supported by a broad muzzle; long floppy ears flank the skull. The reference has an open mouth, but body/anatomy approval should not be claimed merely because a mouth detail is present.
- Approximate ratios, normalized to crown-to-ground seated height: crown-to-chin 0.28; ear-to-ear width 0.41; shoulder width 0.35; front paw centre spacing 0.21; individual front paw width 0.10–0.12. These are projected proportions of this image.

## Defects the previous structural tests missed

The closed-edge and winding checks validate each mesh part internally. They do not establish attachment between independent parts, anatomically plausible proportions, limb separation, or a faithful silhouette. The supplied screenshots demonstrate both a detached facial feature cluster and a sharply stepped foreleg despite such tests passing.

## Targeted acceptance checks

1. Test attachment against the actual triangulated face, not only a smooth analytic head formula: inward rays from nose rear anchors and samples along mouth/philtrum should hit the supporting skull/muzzle at the intended surface. A small buried overlap is preferable to unsupported separation. Suggested diagnostic tolerance is 0.005 of character height, pending mesh scale; nose should have buried rear vertices.
2. Test the connected components of any body/limb surface that is described as continuous. Watertight independent parts alone do not prove welded limb roots.
3. At several heights below the chest, check that front-leg cross-sections are separated by a positive central clearance, while each limb remains connected to its own root and paw. A bounding box alone is insufficient to evaluate the gap.
4. Check each intended planted paw separately against the ground plane. The minimum Y of the whole model can hide one floating paw.
5. Inspect fresh front, left/right side, rear and three-quarter renders in both clay and silhouette. Side views must show integrated facial features and sensible shoulder/elbow/wrist transitions. Front views must show leg separation and paw scale. Reimported GLB must preserve the same appearance.

These checks provide geometric and visual evidence. Final reference resemblance remains a review decision; passing structural tests must not mark M1 approved automatically.

## Independent regression implementation

`tests/anatomy-regression.test.mjs` checks realized source coordinates and triangle indices without trusting author metadata claims. It uses Moller–Trumbore rays for supporting-face intersections, shared-edge membership for the nose/muzzle boundary, graph traversal for body continuity and individual sole contact patches, and foreground depth clearance at three lower-foreleg heights. The foreground clearance test proves a visible recess between the forelegs; it does not prove free space behind the full depth of each leg.

The original Bo tetrahedral surface failed the existing triangle-area gate with 94 very small triangles (smallest squared cross-product magnitude about 4.4e-20). The artist's subsequent simplification fixed that issue without reducing the test threshold. Jew passes facial attachment, shared skin, and four individual paw contact checks. Bo's first simplified revision still had one connected ground-contact patch across the body rather than separated paw sole patches; this was returned to its author for correction before acceptance.
