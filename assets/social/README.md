# Social loop

Square, approximately ten-second recordings of the running Clitorisophila artwork:

- `clitorisophila-facebook.gif`: looping 960 × 960 GIF.
- `clitorisophila-facebook.mp4`: matching H.264 MP4.
- `clitorisophila-facebook-preview.png`: still from live operation.

Three direct contacts use different patch sizes. Neural light and hearts come from the live model; a short dissolve joins two recorded sections at the loop boundary. There is no finger or metric overlay.

Rebuild with a running local preview and Playwright browser:

```sh
CHROMIUM_EXECUTABLE=/path/to/chrome node web/render-social.mjs
python3 tools/encode-social.py
```

Requires FFmpeg. Attribution and data/software licence separation are recorded in the repository's `THIRD_PARTY.md` and `web/public/sculpture/README.md`.
