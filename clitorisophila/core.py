"""Backend-independent interface. Time is explicit; step never resets the brain."""

from dataclasses import asdict, dataclass, field
import hashlib
import json
import math
from pathlib import Path
from typing import Protocol

import numpy as np


def bounded(value, low, high, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number")
    if not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f"{name} must be finite and between {low} and {high}")
    return float(value)


@dataclass(frozen=True)
class Config:
    tick_ms: float = 20.0
    sensory_current: float = 30.0
    reward_current: float = 30.0
    adaptation_tau_ms: float = 300.0
    adaptation_fraction: float = 0.5
    reward_delay_ms: float = 100.0
    learning: bool = True
    reward_enabled: bool = True

    def __post_init__(self):
        for name, low, high in [
            ("tick_ms", 0.1, 100), ("sensory_current", 0, 100),
            ("reward_current", 0, 100), ("adaptation_tau_ms", 0.1, 1e6),
            ("adaptation_fraction", 0, 1), ("reward_delay_ms", 0, 10000),
        ]:
            bounded(getattr(self, name), low, high, name)
        for name in ("learning", "reward_enabled"):
            if not isinstance(getattr(self, name), bool):
                raise ValueError(f"{name} must be boolean")
        if not math.isclose(self.tick_ms / 0.1, round(self.tick_ms / 0.1), abs_tol=1e-8):
            raise ValueError("tick_ms must be a multiple of the native 0.1 ms timestep")
        ratio = self.reward_delay_ms / self.tick_ms
        if not math.isclose(ratio, round(ratio), abs_tol=1e-8):
            raise ValueError("reward_delay_ms must be a multiple of tick_ms")


@dataclass(frozen=True)
class Channel:
    name: str
    source_ids: tuple[str, ...]
    reward_weight: float = 1.0

    def __post_init__(self):
        if not isinstance(self.name, str) or not self.name.strip():
            raise ValueError("Channel name required")
        ids = tuple(str(i) for i in self.source_ids)
        if not ids or len(set(ids)) != len(ids):
            raise ValueError("Each channel requires unique neuron source IDs")
        object.__setattr__(self, "source_ids", ids)
        bounded(self.reward_weight, 0, 1, "reward_weight")


@dataclass(frozen=True)
class Mapping:
    channels: tuple[Channel, ...]
    reward_ids: tuple[str, ...]
    readouts: dict[str, tuple[str, ...]]
    provenance: dict = field(default_factory=dict)

    def __post_init__(self):
        object.__setattr__(self, "channels", tuple(self.channels))
        object.__setattr__(self, "reward_ids", tuple(str(i) for i in self.reward_ids))
        object.__setattr__(self, "readouts", {k: tuple(str(i) for i in v) for k, v in self.readouts.items()})
        names = [c.name for c in self.channels]
        if not names or len(set(names)) != len(names):
            raise ValueError("Channel names must be nonempty and unique")
        if not self.reward_ids or len(set(self.reward_ids)) != len(self.reward_ids):
            raise ValueError("Unique reward IDs required")
        if any(not k or not v or len(set(v)) != len(v) for k, v in self.readouts.items()):
            raise ValueError("Readouts require names and unique, nonempty IDs")
        sensory = {i for c in self.channels for i in c.source_ids}
        if sensory.intersection(self.reward_ids):
            raise ValueError("Sensory and reward populations must be separate")

    def document(self):
        return {"schema": "clitorisophila.mapping.v1", **asdict(self)}

    def signature(self):
        return hashlib.sha256(json.dumps(self.document(), sort_keys=True, allow_nan=False).encode()).hexdigest()

    def save(self, path):
        Path(path).write_text(json.dumps(self.document(), indent=2, allow_nan=False) + "\n")

    @classmethod
    def load(cls, path):
        raw = json.loads(Path(path).read_text())
        if raw.pop("schema", None) != "clitorisophila.mapping.v1":
            raise ValueError("Unsupported mapping schema")
        raw["channels"] = tuple(Channel(**c) for c in raw["channels"])
        return cls(**raw)


@dataclass(frozen=True)
class Frame:
    """Intensities held for one tick. Omitted channels have zero stimulation."""

    channels: dict[str, float] = field(default_factory=dict)

    def __post_init__(self):
        object.__setattr__(self, "channels", {
            name: bounded(value, 0, 1, f"intensity[{name}]")
            for name, value in self.channels.items()
        })


class Backend(Protocol):
    ids: np.ndarray
    n: int

    def advance(self, duration_ms: float, stimulation: list, learning: bool): ...
    def memory(self) -> dict: ...
    def checkpoint(self, path): ...
    def restore(self, path): ...


class Loop:
    """Synthetic transduction → sensory current + delayed appetitive current.

    Model choices live here. Actual spike propagation/plasticity live in backend.
    No output selection, pleasure score or hand-coded preference is provided.
    """

    def __init__(self, backend: Backend, mapping: Mapping, config: Config | None = None):
        self.backend, self.mapping, self.config = backend, mapping, config or Config()
        lookup = {str(i): n for n, i in enumerate(backend.ids)}
        if len(lookup) != backend.n:
            raise ValueError("Backend IDs must be unique and match neuron count")

        def indices(ids):
            try:
                return np.array([lookup[i] for i in ids], dtype=np.int32)
            except KeyError as e:
                raise ValueError(f"Mapping neuron {e.args[0]} is absent from backend") from None

        self.sensory = {c.name: indices(c.source_ids) for c in mapping.channels}
        self.reward = indices(mapping.reward_ids)
        self.readouts = {name: indices(ids) for name, ids in mapping.readouts.items()}
        self.adaptation = {c.name: 0.0 for c in mapping.channels}
        self.delay_ticks = round(self.config.reward_delay_ms / self.config.tick_ms)
        self.reward_queue = [0.0] * self.delay_ticks
        self.tick = 0

    def step(self, frame: Frame | None = None):
        frame = frame or Frame()
        unknown = set(frame.channels) - self.sensory.keys()
        if unknown:
            raise ValueError(f"Unknown channels: {sorted(unknown)}")
        cfg = self.config
        decay = math.exp(-cfg.tick_ms / cfg.adaptation_tau_ms)
        response, stimulation = {}, []
        for c in self.mapping.channels:
            raw = frame.channels.get(c.name, 0.0)
            response[c.name] = raw * (1 - cfg.adaptation_fraction * self.adaptation[c.name])
            self.adaptation[c.name] = decay * self.adaptation[c.name] + (1 - decay) * raw
            stimulation.append((self.sensory[c.name], response[c.name] * cfg.sensory_current))
        reward_input = min(1.0, sum(response[c.name] * c.reward_weight for c in self.mapping.channels))
        if not cfg.reward_enabled:
            reward_input = 0.0
        self.reward_queue.append(reward_input)
        delivered = self.reward_queue.pop(0)
        stimulation.append((self.reward, delivered * cfg.reward_current))
        counts, compute_seconds = self.backend.advance(cfg.tick_ms, stimulation, cfg.learning)
        counts = np.asarray(counts)
        if counts.shape != (self.backend.n,) or not np.isfinite(counts).all():
            raise RuntimeError("Backend returned invalid spike counts")
        self.tick += 1
        return {
            "schema": "clitorisophila.tick.v1", "tick": self.tick,
            "sim_ms": self.tick * cfg.tick_ms,
            "compute_seconds": float(compute_seconds),
            "input": dict(frame.channels), "sensory_response": response,
            "sensory_spikes": {k: int(counts[ix].sum()) for k, ix in self.sensory.items()},
            "reward_input": reward_input, "reward_delivered": delivered,
            "reward_spikes": int(counts[self.reward].sum()),
            "readout_hz": {k: float(counts[ix].mean() * 1000 / cfg.tick_ms) for k, ix in self.readouts.items()},
            "total_spikes": int(counts.sum()), "memory": self.backend.memory(),
        }

    def checkpoint(self, directory):
        """Store native state and adapter state as an atomic snapshot directory."""
        import os
        import tempfile
        target = Path(directory)
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            raise FileExistsError("Choose a new checkpoint directory")
        temp = Path(tempfile.mkdtemp(prefix=f".{target.name}-", dir=target.parent))
        try:
            self.backend.checkpoint(temp / "brain.npz")
            record = {
                "schema": "clitorisophila.state.v1", "config": asdict(self.config),
                "mapping_sha256": self.mapping.signature(), "tick": self.tick,
                "adaptation": self.adaptation, "reward_queue": self.reward_queue,
                "brain_sha256": hashlib.sha256((temp / "brain.npz").read_bytes()).hexdigest(),
            }
            (temp / "loop.json").write_text(json.dumps(record, allow_nan=False) + "\n")
            os.rename(temp, target)
        except BaseException:
            import shutil
            shutil.rmtree(temp)
            raise

    def restore(self, directory):
        path = Path(directory)
        raw = json.loads((path / "loop.json").read_text())
        if raw.get("schema") != "clitorisophila.state.v1" or raw.get("config") != asdict(self.config) or raw.get("mapping_sha256") != self.mapping.signature():
            raise ValueError("Checkpoint configuration/mapping mismatch")
        if hashlib.sha256((path / "brain.npz").read_bytes()).hexdigest() != raw["brain_sha256"]:
            raise ValueError("Checkpoint brain checksum mismatch")
        if type(raw["tick"]) is not int or raw["tick"] < 0:
            raise ValueError("Invalid checkpoint clock")
        if set(raw["adaptation"]) != set(self.adaptation) or len(raw["reward_queue"]) != self.delay_ticks:
            raise ValueError("Invalid checkpoint adapter state")
        for value in [*raw["adaptation"].values(), *raw["reward_queue"]]:
            bounded(value, 0, 1, "checkpoint value")
        self.backend.restore(path / "brain.npz")
        self.tick = raw["tick"]
        self.adaptation = raw["adaptation"]
        self.reward_queue = raw["reward_queue"]
