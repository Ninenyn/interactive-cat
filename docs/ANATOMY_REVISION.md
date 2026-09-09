# M1 anatomy correction — 8 September 2026

The user rejected the floating Jew nose/mouth and the angular Bo leg anatomy. New full-body images supersede the earlier body proportions: standing cat `4506533e-61b3-4a79-8ffd-74c9718bf058.png` and seated golden `e2f28ba6-cf77-4a20-875b-6c6a173c3481.png`. Both originals are staged byte-for-byte and SHA-256 checked. Earlier character sheets remain identity/color references, not constraints that force the rejected chibi body back into this revision.

## Actual correction and review contract

- Jew: horizontal ribcage, shoulder and hip placement, four branches into paws, bent hind joints, rising tail; neck, skull, muzzle and nose share connected surface topology. Mouth geometry must embed in actual realized facial triangles, with no unsupported air gap in side view.
- Bo: upright seated retriever proportions with smaller head, continuous chest/shoulders, descending forearms, gentle wrists and compact paws. Haunches fold behind; forepaws must not join a flat ground bridge to the pelvis.
- Neutral clay only. Body plane arrangement, head/body proportions and visible anatomy still require human visual feedback. Rigging and final color remain future work.
- Save hero/front/side/back and side-wire images, reimported GLB views, mobile views and exact asset hashes to `review/M1-anatomy/`. Old M1 evidence remains historical and cannot approve changed assets.
- Test actual triangle contact for face details, shared component connectivity and paw contact separation, alongside existing nondegenerate/closed/winding checks. Closed separate objects alone do not prove connected anatomy.

## Ownership

Jew source: jew_anatomy. Bo source: bo_anatomy. Read-only geometry and visual QA: anatomy_qa. Renderer, cameras, export, reference integration and deployment: root. New shared-nose material groups must cover every triangle exactly once and survive GLB export.

## Review state

M1-revise. No new art approval. Full-body reference ratios in ANATOMY_QA_NOTES.md are approximate image projections, not exact orthographic reconstruction. Side/back views are explicitly inspected before publication of this draft.

## Additional render-driven corrections

Actual side closeups revealed skull piercing the initial Jew eye fan between projected outline vertices. The revised eye shell is tessellated along the actual skull triangle boundaries, preserving the thin surface offset and embedded back. Bo front views revealed a dangling pelvic/abdominal bulb and harsh sternum depression; the pelvis was tucked backward/upward and the torso transition reshaped. These corrections require refreshed evidence; a geometry test pass is not likeness approval.
