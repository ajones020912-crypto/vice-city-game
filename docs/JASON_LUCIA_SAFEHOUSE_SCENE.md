# Jason and Lucia: Stay a While

Status: scene script and storyboard draft only. Not a playable cutscene.
Branch: feature/jason-lucia-safehouse-scene
Do not merge into main or deploy until the owner explicitly requests it.

## Content
Original, non-explicit implied-after-intimacy scene. Both adult characters remain in casual clothes. No nudity or sexual activity is shown. This is not dialogue or animation copied from GTA VI.

## Storyboard
Fade in at the safehouse. Jason and Lucia sit close on the edge of the bed. Lucia rests her head against his shoulder while the camera slowly moves closer.

Lucia: You ever think about staying somewhere for once?
Jason: Somewhere, or with someone?

She smiles and takes his hand.

Lucia: Don't ruin the moment.
Jason: Wasn't planning on it.

They share a brief kiss. The camera turns toward the window, then fades out. In the future playable implementation, restore gameplay after the fade.

## Future integration requirements
- Add an explicit safehouse interaction; exact location and trigger are not yet approved.
- Implement seated poses, head lean, hand-holding, and brief kiss animation.
- Implement cinematic camera, subtitles, fades, and a skip option.
- Pause movement, weapons, and ambient damage during playback.
- Restore camera, controls, actors, and pause state on completion, skip, or error.
- Prevent duplicate triggers and avoid advancing missions or changing saves.
- Preserve the current tan, crop top, body contours, and latest character rig.
- Test both player characters, skip handling, and repeated playback.
- Obtain explicit permission before any main-branch merge or deployment.

The companion JSON is a data-only storyboard; no runtime code loads it.
