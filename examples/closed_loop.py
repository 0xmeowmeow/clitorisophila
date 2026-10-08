"""A host-owned action → stimulus → brain → action loop on the fixture.

The decoder and exploration are engineered here, outside the reusable module.
This demonstrates feedback wiring, not established reinforcement learning.
"""

import argparse
import json
import random
import time

from clitorisophila import Frame, Loop
from clitorisophila.fixture import fixture_backend


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--steps", type=int, default=0)
    args = p.parse_args()
    backend, mapping = fixture_backend()
    loop = Loop(backend, mapping)
    rng = random.Random(7)
    rates = {"output_a": 0.0, "output_b": 0.0}
    step = 0
    try:
        while not args.steps or step < args.steps:
            started = time.monotonic()
            # Readout-to-action wiring is deliberately visible, not biological.
            if rng.random() < 0.2 or rates["output_a"] == rates["output_b"]:
                action = rng.choice(["glans", "hood"])
            else:
                action = "glans" if rates["output_a"] > rates["output_b"] else "hood"
            row = loop.step(Frame({action: 1.0}))
            rates = row["readout_hz"]
            print(json.dumps({"host_action": action, **row}), flush=True)
            step += 1
            time.sleep(max(0, .02 - (time.monotonic() - started)))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
