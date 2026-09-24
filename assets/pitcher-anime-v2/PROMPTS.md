# Pitcher anime v2 — exact generation prompts

Tool: built-in image_gen. No CLI fallback. 2026-09-24.

## Teal: initial

```text
Use case: stylized-concept.
Asset type: a new original premium 2D anime PIXEL-ART character portrait for a baseball pitcher roster, waist-up cutout on genuine transparent alpha.
Art-direction target: exquisitely beautiful anime face, luminous elaborate eyes, silky glossy hair made from carefully stepped pixel clusters, delicate facial proportions, rich warm/cool lighting, extremely polished high-density pixel illustration. It should have the face appeal and beautiful finish of a premium Japanese 2D character-collection game portrait while being visibly authored in pixels. Do not copy any existing franchise character. Create a completely new original adult woman baseball pitcher.
Subject: about 25 years old, refined adult feminine facial proportions, extremely beautiful, subtly rounded almond-shaped bright CORAL-ROSE eyes with detailed faceted iris pixels and tiny ivory highlights, delicately arched eyebrows, soft closed-mouth confident smile, subtle warm cheek color, small understated nose. Soft luminous warm fair skin with pink-violet shadow ramps.
Entirely original design: deep petrol-TEAL hair in a layered shoulder-length lob with irregular feathered outward tips; clean off-center part, long asymmetric fringe opening the face, one small side section woven and tucked behind her right ear, TWO small parallel matte-copper bar hairclips close to the temple. Hair uses large elegant shiny ribbons of teal, turquoise, cool slate and pale aqua highlights. No twin tails, no giant bow, no ornate fantasy hat, no lace bonnet, no recognizable borrowed hairstyle/costume combination.
Baseball identity: she wears a beautifully tailored IVORY baseball jersey, dark petrol-teal stand collar and short sleeves over charcoal compression undersleeves, restrained COPPER edge piping, a short button placket, a subtle geometric copper stitch motif at one sleeve, dark belt visible at bottom. On her head a low-profile fitted dark teal baseball cap worn slightly back so the beautiful fringe and eyes remain fully visible, NO logo or lettering. Her left hand carries a well-crafted chestnut leather pitcher's glove loosely at her lower chest, her right fingertips naturally resting at the glove opening. Clothing is practical fully buttoned athletic wear with elegant detailing. No weapon, no skirt, no cape, no gothic dress, no jewelry copied from a reference.
Pose/composition: upper-body portrait from complete cap/hair to upper hips, shoulders turned subtly three-quarter toward screen LEFT, eyes looking gently toward the viewer. Graceful relaxed poised athlete. Face is the visual focus and roughly 35% of the image height. Portrait 4:5 framing. All hair, cap, shoulders, glove and elbows fully inside the canvas with 8–10% empty transparent margin. Balanced silhouette, not a cut-off zoomed photo.
Pixel technique: sophisticated HIGH-DENSITY hand-authored pixel illustration, effective grid around 320x400 with discrete 2–4px clusters on a 1024-wide output; extremely crisp pixel stair-steps on silhouettes and hair strand contours, selective dark colored outlines, flat organized color clusters and controlled sparse dithering. Beautiful glossy hair highlight shapes, large sparkling anime irises, ultra-refined tiny lip and lash pixels. 5-to-7-step hue-shifted ramps produce rich volume without airbrushing. Faces softly modeled WITH PIXELS, not smooth vectors. Enough facial pixels for fine expression; not low-detail retro sprite, not chibi, not miniature sprite with a huge empty canvas. No thick black cartoon outline, no oil painting, no 3D render, no smeared gradient, no blurry pixel filter, no halftone dots, no random noisy texture.
Lighting: luminous soft warm front-left key and cool pale-cyan rim limited to the hair edge, bold but refined cel-shaped shadows.
Background: truly transparent alpha with clean character contour and opaque character interior. NO colored backdrop, checkerboard graphic, glow, haze, vignette, shadow or scenery.
Output: only this one new original adult female baseball pitcher portrait. No other figures, panels, letters, numbers, text, title, watermark, UI, borders.
```

## Teal: final style refinement

```text
Use case: style-transfer.
Input roles: the most recent generated image of a TEAL-HAIRED adult woman BASEBALL PITCHER is the EDIT TARGET. The preceding user-supplied gray-haired fantasy/gothic character portrait, if visible, is a RENDERING TECHNIQUE REFERENCE ONLY. Never copy the reference character's face identity, hairstyle, costume, accessories, colors or pose.

Re-render ONLY the original teal-haired pitcher with a much more stylized 2D ANIME PIXEL-ART face and much more decisive chunky stepped shading. Preserve her own independent design: shoulder-length teal feathered lob with small side braid, two parallel copper bar hairclips, coral-rose eyes, plain dark teal baseball cap, ivory/teal/copper baseball uniform, chestnut pitching glove and the same upper-body three-quarter composition. Exactly one character.

Critical changes to the rendering:
- Beautiful large 2D anime eyes with broad faceted irises, strong clean graphic upper eyelashes and two clearly defined white sparkle pixels. Their overall shapes remain unique to this original character.
- A clean flat ivory face with just two or three rose/lilac shadow planes and tiny blush pixel clusters. A tiny nose represented by a light pixel. Very small understated line mouth, NO shaded lips, lipstick, realistic lip volume or photographic facial modeling.
- Hair formed from large smooth-shaped COLOR CLUSTERS with angular pixel stair-step boundaries and broad sharply stepped pale-aqua highlight bands; not hundreds of fine realistic strands. Beautiful elegant anime hair volume.
- Uniform and glove are shaded in decisive graphic pixel clusters with 4 or 5 values, elegant clearly visible square-pixel edges, NO soft airbrushed gray transitions or random pixel noise.
- Overall feel is luscious polished illustrated 2D anime pixel art, with wide beautiful eyes and clean small facial features, never photorealistic, never 3D and never thick cartoon outlines. Adult woman with athletic shoulders and mature proportions, not a child or chibi.
- Effective art grid around 256x320, enlarged cleanly without smoothing. The discrete pixels must be evident.

Keep full cap and hair inside image, adding clear empty transparent padding above the cap. Portrait crop may end at upper hips. Preserve all fingers and glove, with believable hands.
Genuine clean transparent alpha outside her silhouette. No background, no glow, no checkerboard, no reference character, no fantasy costume, no text or branding.
```

## Amber: generation

```text
Use case: stylized-concept.
Asset type: one original adult woman baseball pitcher roster PORTRAIT, waist-up 2D ANIME PIXEL ART, genuine transparent alpha, high-density premium game character illustration.
The finish MUST be exquisite crisp anime pixel art. Effective design grid around 256x320 enlarged clearly with nearest-neighbor: decisive solid square pixels and stepped edges, organized beautiful color clusters, 4–6 step cel-shaped hue-shifted shading, no airbrush, no realistic painted texture, no blur, no antialiasing, no noisy thin strands. Faces must be captivating, polished and unmistakably stylized 2D anime: large expressive faceted eyes with strong clean dark upper eyelashes, sparkling iris highlights, small understated line mouth with NO shaded lips or lipstick, tiny nose represented by a dot of light, clean softly colored face with a few rose/lilac shadow planes and sparse cheek pixels. Hair composed of large graceful clusters with sharply stepped lustrous highlight bands. Adult athletic woman, age about 25, mature shoulders and body proportions, not a child and not chibi. Beautiful refined design worthy of a premium original character-collection baseball game.
Create a completely original character with no borrowed franchise likeness, costume, accessories or distinctive character-specific combination. Practical buttoned baseball sportswear; no fantasy outfit, no huge ribbons, no lace hat, no gothic dress, no revealing clothing.
One character only. No names, logos, text, numbers, letters, panels, watermarks, background, glow, haze, floor or checkerboard. Genuine transparent alpha outside the silhouette and opaque character interior.
Portrait 4:5 canvas with entire head, cap, hair, shoulders, glove and elbows visible inside the canvas. Leave visible empty transparent margin above the cap and at both sides. Lower edge may intentionally crop at upper hips. Warm soft stadium key light and a subtle cool rim fully inside the silhouette.
Character design: elegant confident pitcher with warm golden-tan skin, large rich honey-AMBER eyes, a subtly mischievous little smile and finely arched eyebrows. Deep ESPRESSO-BROWN hair, long and thick, parted asymmetrically with a graceful curved forelock; one substantial single FISHTAIL BRAID drapes over her left shoulder. Caramel-gold hair highlight bands, one small plain ivory elastic at braid end, NO bows. One small ivory rectangular hair clip above the opposite ear. Plain burnt-SAFFRON baseball cap with dark navy underside, no insignia. Muted ochre baseball jersey with clean ivory shoulder panels and dark navy piping, deep navy fitted sports undersleeves, ivory trousers and navy belt. Burgundy-brown leather baseball glove on her LEFT hand held near lower chest; bare right fingertips rest lightly along its laces with anatomical clarity.
View: slightly turned toward screen RIGHT but face gazing back to viewer, comfortably squared athletic shoulders, confident calm set pose. Face is large enough for beautiful detailed eyes. Elegant hair braid and strong ochre/navy/ivory palette create a silhouette and personality distinct from a teal-haired player. No extra accessories or other characters.
```

## Rose: generation

```text
Use case: stylized-concept.
Asset type: one original adult woman baseball pitcher roster PORTRAIT, waist-up 2D ANIME PIXEL ART, genuine transparent alpha, high-density premium game character illustration.
The finish MUST be exquisite crisp anime pixel art. Effective design grid around 256x320 enlarged clearly with nearest-neighbor: decisive solid square pixels and stepped edges, organized beautiful color clusters, 4–6 step cel-shaped hue-shifted shading, no airbrush, no realistic painted texture, no blur, no antialiasing, no noisy thin strands. Faces must be captivating, polished and unmistakably stylized 2D anime: large expressive faceted eyes with strong clean dark upper eyelashes, sparkling iris highlights, small understated line mouth with NO shaded lips or lipstick, tiny nose represented by a dot of light, clean softly colored face with a few rose/lilac shadow planes and sparse cheek pixels. Hair composed of large graceful clusters with sharply stepped lustrous highlight bands. Adult athletic woman, age about 25, mature shoulders and body proportions, not a child and not chibi. Beautiful refined design worthy of a premium original character-collection baseball game.
Create a completely original character with no borrowed franchise likeness, costume, accessories or distinctive character-specific combination. Practical buttoned baseball sportswear; no fantasy outfit, no huge ribbons, no lace hat, no gothic dress, no revealing clothing.
One character only. No names, logos, text, numbers, letters, panels, watermarks, background, glow, haze, floor or checkerboard. Genuine transparent alpha outside the silhouette and opaque character interior.
Portrait 4:5 canvas with entire head, cap, hair, shoulders, glove and elbows visible inside the canvas. Leave visible empty transparent margin above the cap and at both sides. Lower edge may intentionally crop at upper hips. Warm soft stadium key light and a subtle cool rim fully inside the silhouette.
Character design: exceptionally beautiful composed pitcher with soft peach skin, large striking mint-EMERALD eyes, a gentle focused closed-mouth smile. A short layered dusty-ROSE / dark-mauve bob, cut slightly shorter at the back, one longer swept lock curving near her cheek, visibly asymmetrical side part, two short subtle feathered ends at jawline; glossy pale pink and warm rose highlight bands. NO twin tails, braid, giant ribbon or side buns. A tiny dark-navy triangular hair clip with a single mint inset holds one side. Plain NAVY baseball cap tipped back enough to show her unique fringe, no logo. Navy baseball jersey with restrained MINT shoulder piping and ivory sleeve cuffs, a high ivory sports undershirt collar, short sleeves, practical uniform buttoned normally. One ivory wrist band and warm umber leather glove on her LEFT hand, held lightly near her waist with bare right hand tucked at glove opening. Dark belt and ivory trousers visible at lower edge.
View: nearly front-facing with shoulders subtly turned screen LEFT, slight confident head tilt, lovely large eyes glancing toward viewer. Strong clean hair silhouette, serene precise personality, broad graphic rose/navy/mint/ivory color shapes. Face is the star of the portrait, delicately drawn entirely with pixels. No extra accessories or other characters.
```

## Amber: final framing correction

```text
Use case: precise-object-edit.
Among the recent images, edit ONLY the AMBER/SAFFRON-UNIFORM original adult woman baseball pitcher with warm tan skin, honey-gold eyes and a long single espresso-brown fishtail braid. The rose-haired navy-uniform woman is context only and must not appear.
Make ONE small layout correction: the top button of the saffron baseball cap touches and clips the top image border. Reframe the entire original portrait slightly smaller so the COMPLETE cap including its top button and all hair is fully inside the image, with about 8% empty transparent padding above it and 5% empty transparent padding at left and right. Upper-hip crop at the bottom is intentional and may remain. Do not change the image aspect ratio.
Preserve her EXACT beautiful original face, amber eyes, warm skin, confident smile, braid, plain ivory hairclip, saffron/ivory/navy baseball uniform, glove, hands and exquisite 2D anime pixel-art rendering. Do not redesign, beautify differently, smooth pixels or add decorations.
Genuine transparent alpha around the portrait, no background color, halo, glow, scenery, checkerboard, lettering, logo, caption or second character.
```