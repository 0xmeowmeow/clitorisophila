"""Replace this producer with a UI/sensor. Refresh while touch is held."""

import json
import time

try:
    while True:
        intensity = 1.0 if time.monotonic() % 2 < .4 else 0.0
        print(json.dumps({"schema": "clitorisophila.input.v1", "channels": {"glans": intensity}}), flush=True)
        time.sleep(.02)
except (KeyboardInterrupt, BrokenPipeError):
    pass
