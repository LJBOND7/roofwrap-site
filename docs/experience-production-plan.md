# RoofWrap Cinematic Experience, Production Plan

Page: `/experience/` on roofwrap.com. One continuous scroll-driven scene. Scrolling controls time, forward and backward. The hero is one real building: the multifamily fire loss we wrapped (the ServPro project), reconstructed in real-time 3D and anchored to the two real drone photographs.

Real anchors already in the repo:

- `assets/img/story-damage-real.jpg` (cropped from `multifamily-before.jpg`): aerial of the fire-damaged building, center roof burned away, rafters exposed.
- `assets/img/multifamily-after.jpg`: same building fully wrapped in the white RoofWrap membrane, skirted over the roof perimeter, windows boarded.

## 1. Storyboard

| Act | What the viewer sees | Text |
|---|---|---|
| 1. Before | High golden-hour drone shot of the intact building. Palms sway, cars parked, a quiet street. Camera pushes toward the roof. | "Everything can change in minutes." |
| 2. Fire | Smoke curls from the center roof, then flame. The burn spreads outward from the ridge, shingles char, the glow intensifies. Sky dims to a smoky amber. | "Fire doesn't wait." |
| 3. Suppression | Two apparatus arrive on the street side. Water arcs pound the roof. Flames die, smoke turns to white steam, the sky goes gray. | "And putting out the fire is only the beginning." |
| 4. Exposed | Steam clears into clean daylight. The camera settles into the exact angle of the real "before" photo and the frame dissolves into the actual photograph. Back to 3D, a slow orbit shows the scale of the cavity: charred rafters, open units, everything vulnerable to the next rain. Pacing slows here. | "The structure survived." / "Now protect what's left." |
| 5. RoofWrap | A single white membrane materializes suspended above the roof, billowing. It lowers, conforms to every hip and ridge, extends past the eaves, then the skirt wraps down around the roof perimeter and tensions drum-tight. Seams and perimeter attachment read as engineered, not a tarp. | "Cover it." / "Secure it." / "Protect it." |
| 6. Protected | Camera rises. The frame dissolves into the real "after" photograph, which slowly breathes wider like a climbing drone. Title card: ROOFWRAP, tagline, CTA. | "From exposed…" / "…to protected." / ROOFWRAP, "Temporary protection. Engineered for catastrophic damage.", CTA "See How RoofWrap Works" |

## 2. Scroll map (progress p, 0 to 1)

Scroll height about 1300vh desktop, 950vh mobile. Native scroll, exponentially smoothed. Every visual state is a pure function of p, so reverse scrolling reverses the story exactly.

| p | State |
|---|---|
| 0.00 to 0.15 | Pristine building, golden daylight, camera push-in |
| 0.15 to 0.32 | Fire develops: smoke, flames, roof char mask grows, hole opens, sky turns smoky |
| 0.32 to 0.45 | Apparatus and water arcs, steam, flames extinguish, burn completes |
| 0.45 to 0.58 | Clean daylight returns, camera matches REF1, dissolve to real damage photo (0.47 to 0.53), slow orbit around the cavity |
| 0.58 to 0.82 | Membrane deploys: suspended (0.58 to 0.64), lowering and conforming (0.64 to 0.73), skirt wrap (0.73 to 0.79), tension and attachment (0.79 to 0.82) |
| 0.82 to 1.00 | Camera rises, dissolve to real after photo (0.88 to 0.92) which holds to the end, title card and CTA from 0.94 |

## 3. Camera

Keyframed position and look-at, interpolated with smoothstep, plus a subtle idle drift that is suppressed during the two photo matches.

- p 0.00: (26, 34, 58) looking at (0, 4, 0). High 3/4 front-right drone.
- p 0.15: (8, 22, 34). Pushed toward the roof.
- p 0.24: (-14, 18, 30). Arc left, close to the growing fire.
- p 0.32: (-24, 26, 40). Wide, full smoke column.
- p 0.40: (18, 30, 44). Arc right past the water arcs.
- p 0.47: (2, 30, 39) looking at (0, 3.4, -1). REF1 photo match, held to 0.53.
- p 0.58 to 0.82: slow left-to-right orbit watching the deployment, with one low swoop to the front-right eave (about p 0.74) to see the skirt wrap and perimeter attachment.
- p 0.86: (1, 26, 36). REF2 approach.
- p 0.88+: rise, then the real after photo takes the frame and slowly zooms out (Ken Burns) to finish the "climb".

## 4. Asset list

- Real photos: `story-damage-real.jpg` (REF1), `multifamily-after.jpg` (REF2).
- Procedural (generated in-code, no downloads): shingle texture, stucco, ground with roads and lawn, palm fronds, flame sprite, smoke sprite, membrane seam texture, SVG grain overlay.
- Fonts: Bricolage Grotesque + Inter (already the brand set).
- three.js 0.161 from jsdelivr, pinned.

## 5. Real-time 3D (three.js) elements

Everything in v1 is real-time: building massing matched to the photos (H footprint, two stories, hip roofs, three portico bays, boarded-tan windows, AC condensers), site (roads on two sides, sidewalk bollards, power pole and lines, palms, scrub brush, parked cars), sky dome shader, fire and ember and smoke and water particle systems, a roof shader whose burn mask grows char and opens the cavity (exposed truss instances beneath), and the membrane mesh with a four-phase deployment morph. Quality tiers: desktop gets shadows, higher particle counts, DPR up to 1.75; mobile drops shadows, cuts particles about 60 percent, caps DPR at 1.25. No-WebGL and reduced-motion visitors get a photo-driven scroll story with the same copy.

## 6. Where Seedance (via Higgsfield) beats real-time 3D, v2 upgrade

The fire, suppression, and membrane-deployment acts are the shots where photoreal generated video will out-render any real-time approach. The v2 plan swaps the middle acts for scroll-scrubbed frame sequences generated with Seedance, conditioned on the real photos. The 3D build remains the fallback and the mobile path.

Shots to generate (all 1080p or better, 24 fps, 5 to 10 s, exported to WebP frame sequences of 120 to 240 frames):

1. S1 Pristine orbit: restored-building aerial drift (start frame: restored master still, see section 8).
2. S2 Ignition to full fire: same angle, smoke then flame growth from center ridge.
3. S3 Suppression: water streams and steam, ending near the REF1 angle.
4. S4 Smoke-clear reveal: dissolve ending exactly on REF1 (use REF1 as the last frame).
5. S5 Membrane deployment: REF1 as first frame, REF2 as last frame.
6. S6 Hero climb: REF2 as first frame, drone climbs and pulls back.

## 7. Exact Seedance prompts

Common settings: image-to-video with start frame (and end frame where noted), 5 or 10 s, fixed seed reused across regenerations, motion strength low-medium, no people visible, no text or logos in frame.

Common negative prompt for all shots: "different building, altered architecture, extra floors, warped geometry, text, watermark, people, cartoon, CGI look, oversaturated, lens distortion".

- S0 Restored master still (image edit or first-frame generation, used as the anchor for S1 and S2): "Aerial drone photo of the same two-story light-gray apartment building, identical architecture and camera angle as the reference, but with a fully intact dark-gray asphalt shingle hip roof, no fire damage, clean roof ridge and vents, quiet street with palm trees, bright morning sunlight, photorealistic."
- S1 Pristine orbit (start frame: S0): "Slow cinematic drone orbit around a two-story gray apartment building with an intact dark shingle hip roof, palm trees swaying gently, quiet residential street, golden morning light, gentle parallax, steady aerial camera, photorealistic, calm."
- S2 Fire growth (start frame: S0): "Same aerial view of the two-story apartment building. Thin gray smoke begins rising from the center of the shingle roof, growing into heavy dark smoke, then orange flames breaking through the center roof section, fire spreading along the ridge, embers, the surrounding shingles charring black, dusk-like smoky light, camera slowly pushing in, dramatic but realistic structure fire, news-footage realism."
- S3 Suppression (start frame: final frame of S2): "Aerial view of the burning apartment roof as two firefighting water streams arc onto the flames from the street side, heavy white steam bursting up, flames shrinking and dying out, smoke thinning from black to white, wet charred roof emerging, overcast gray light, slow drone drift toward a three-quarter aerial angle, photorealistic."
- S4 Reveal (start frame: final frame of S3, end frame: REF1 `story-damage-real.jpg`): "Steam and smoke clear from the fire-damaged apartment building, revealing the burned-out center roof with exposed charred rafters and open attic cavity, bright clean morning sunlight returning, drone settling into a steady elevated front aerial view, photorealistic."
- S5 Deployment (start frame: REF1, end frame: `multifamily-after.jpg`): "Timelapse-style aerial of a large continuous white protective membrane deploying across the entire fire-damaged roof of the apartment building, the white material stretching over the burned cavity and intact shingles, extending past the roof edges and wrapping down around the roof perimeter, tensioning smooth and taut until the whole roof is a clean white envelope, workers not visible, bright daylight, engineered and precise, photorealistic."
- S6 Hero climb (start frame: `multifamily-after.jpg`): "Drone slowly climbs and pulls back from the apartment building whose entire roof is covered in a taut bright-white protective membrane, clean daylight, calm street with palm trees, the white roof glowing in the sun, cinematic aerial hero shot, photorealistic."

## 8. Building consistency strategy across generated shots

- One master anchor: generate S0 (the restored still) by editing REF1 only where the damage is, never regenerating the whole building. Every pre-damage shot starts from S0; every post-damage shot starts or ends on REF1 or REF2. The model is never asked to invent the building.
- Chain frames: each shot's start frame is the previous shot's final frame, so identity drifts have nowhere to enter.
- Reuse one seed per shot family, keep motion strength low, and keep camera descriptions consistent ("elevated front aerial, about 35 degrees").
- Grade everything to one LUT (warm daylight to match the photos) so cuts and dissolves sit in the same world.

## 9. Transitioning between real photos, generated video, and 3D

- Camera-matched dissolves at near-zero-motion moments: the 3D (or generated) camera settles into the photo's exact angle and focal length, holds, and the photo crossfades over about 0.4 of scroll travel with a slow Ken Burns move so nothing is ever static.
- A single film-grain overlay and vignette sit above everything (canvas, video, photos), which unifies the media so the eye reads one continuous world.
- Luminance and white-balance of the 3D lighting at the two match points are tuned to the photos (both photos are bright warm sunlight, so the aftermath state returns to clean daylight before each dissolve).

## 10. Performance strategy

- Desktop: DPR capped at 1.75, one 1024 shadow map, about 900 fire particles, 300 smoke sprites, ACES tone mapping. Frame budget well under 16 ms on integrated GPUs because all geometry is merged or instanced and all textures are small procedural canvases.
- Mobile: DPR 1.25, shadows off, particle counts cut about 60 percent, shorter scroll height, same narrative and copy.
- v2 frame sequences: WebP at 1600w desktop and 960w mobile, 12 to 16 scrub frames per second of source, chunk-lazy-loaded around the current scroll position, drawn to a 2D canvas; the 3D scene remains the fallback.
- Reduced motion or no WebGL: static photo story with the same beats.
