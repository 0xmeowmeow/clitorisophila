"""Live latest-frame JSON input with bounded buffering and stale-input release."""

import argparse
import json
import queue
import sys
import threading
import time
from pathlib import Path

from .core import Config, Frame, Loop, Mapping, bounded


class LatestInput:
    """A single-frame mailbox: slow consumers cannot build a replay backlog."""

    def __init__(self, stream, names):
        self.stream, self.names = stream, set(names)
        self.mailbox = queue.Queue(maxsize=1)

    def run(self):
        for line in self.stream:
            try:
                raw = json.loads(line)
                if set(raw) != {"schema", "channels"} or raw["schema"] != "clitorisophila.input.v1":
                    raise ValueError("Expected schema clitorisophila.input.v1 and channels")
                frame = Frame(raw["channels"])
                if set(frame.channels) - self.names:
                    raise ValueError("Unknown stimulation channel")
            except (ValueError, TypeError, AttributeError):
                print("Rejected input; releasing stimulation.", file=sys.stderr, flush=True)
                frame = Frame()
            self.put(frame)
        self.put(Frame())  # EOF releases input; the brain keeps running.

    def put(self, frame):
        try:
            self.mailbox.get_nowait()
        except queue.Empty:
            pass
        self.mailbox.put_nowait((time.monotonic(), frame))

    def poll(self):
        try:
            return self.mailbox.get_nowait()
        except queue.Empty:
            return None


def main(argv=None):
    parser = argparse.ArgumentParser(prog="clitorisophila")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("prepare", help="Download and verify full MaleCNS (~1.1 GB sources)")
    generate = sub.add_parser("mapping", help="Generate editable synthetic KC input ports")
    generate.add_argument("--out", type=Path, default=Path("mapping.json"))
    generate.add_argument("--channels", nargs="+", default=["glans", "hood", "surrounding"])
    generate.add_argument("--cells-per-channel", type=int, default=32)
    for name in ["live", "demo"]:
        p = sub.add_parser(name, help="Continuous stdin input" if name == "live" else "Offline synthetic native-kernel fixture")
        p.add_argument("--backend", choices=["fixture", "malecns"], default="fixture" if name == "demo" else "malecns")
        p.add_argument("--mapping", type=Path)
        p.add_argument("--steps", type=int, default=0, help="0 runs until Ctrl-C")
        p.add_argument("--tick-ms", type=float, default=20)
        p.add_argument("--reward-delay-ms", type=float, default=100)
        p.add_argument("--no-reward", action="store_true")
        p.add_argument("--frozen", action="store_true")
        p.add_argument("--timeout-ms", type=float, default=250)
        p.add_argument("--checkpoint", type=Path, help="New snapshot directory written on exit")
        p.add_argument("--restore", type=Path)
        if name == "demo":
            p.add_argument("--fast", action="store_true", help="Unpaced fixture assay")
    args = parser.parse_args(argv)
    if args.command == "prepare":
        from stonkfly.data import prepare
        prepare()
        return
    if args.command == "mapping":
        from .native import full_backend, synthetic_gateway
        synthetic_gateway(full_backend(), args.channels, args.cells_per_channel).save(args.out)
        print(f"Wrote synthetic gateway: {args.out}")
        return
    try:
        if args.steps < 0:
            raise ValueError("steps must be nonnegative")
        bounded(args.timeout_ms, 1, 60000, "timeout_ms")
        cfg = Config(tick_ms=args.tick_ms, reward_delay_ms=args.reward_delay_ms,
                     learning=not args.frozen, reward_enabled=not args.no_reward)
        if args.backend == "fixture":
            from .fixture import fixture_backend
            backend, mapping = fixture_backend()
        else:
            from .native import full_backend, synthetic_gateway
            backend = full_backend()
            mapping = synthetic_gateway(backend)
        if args.mapping:
            mapping = Mapping.load(args.mapping)
        loop = Loop(backend, mapping, cfg)
        if args.restore:
            loop.restore(args.restore)
        if args.checkpoint and args.checkpoint.exists():
            raise ValueError("Checkpoint destination already exists; choose a new directory")
    except (ValueError, FileNotFoundError, RuntimeError) as e:
        parser.error(str(e))
    metadata = {"backend": args.backend, "mapping": mapping.document(),
                "timing": "fixed simulation steps; wall speed reported separately",
                "pleasure_modeled": False, "learning_validated": False}
    print(json.dumps(metadata), file=sys.stderr, flush=True)
    reader = None
    current, received = Frame(), -float("inf")
    if args.command == "live":
        reader = LatestInput(sys.stdin, loop.sensory)
        threading.Thread(target=reader.run, daemon=True).start()
    step = 0
    try:
        while not args.steps or step < args.steps:
            started = time.monotonic()
            if reader:
                incoming = reader.poll()
                if incoming:
                    received, current = incoming
                stale = (started - received) * 1000 >= args.timeout_ms
                frame = Frame() if stale else current
            else:
                # Alternating cue/quiet phases. A protocol, not autonomous behaviour.
                names = list(loop.sensory)
                period = int(loop.tick * cfg.tick_ms) % 1200
                frame = Frame({names[(int(loop.tick * cfg.tick_ms) // 1200) % len(names)]: 1.0}) if period < 200 else Frame()
                stale = False
            row = loop.step(frame)
            row["input_stale"] = stale
            row["wall_ms"] = (time.monotonic() - started) * 1000
            row["realtime_factor"] = cfg.tick_ms / max(row["wall_ms"], 1e-9)
            print(json.dumps(row, allow_nan=False), flush=True)
            step += 1
            if not getattr(args, "fast", False):
                time.sleep(max(0.0, cfg.tick_ms / 1000 - (time.monotonic() - started)))
    except KeyboardInterrupt:
        pass
    finally:
        if args.checkpoint:
            loop.checkpoint(args.checkpoint)
            print(f"Saved checkpoint: {args.checkpoint}", file=sys.stderr)


if __name__ == "__main__":
    main()
