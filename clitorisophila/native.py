"""Thin adapter over Stonkfly's unchanged native simulator and memory rule."""

import numpy as np

from .core import Channel, Mapping


class NativeBackend:
    def __init__(self, brain):
        self.brain = brain
        self.ids, self.n = brain.ids, brain.n
        self.dark = np.zeros(len(brain.retina), dtype=np.float32)

    def advance(self, duration_ms, stimulation, learning):
        # No eye background current; only mapped touch/reward current enters.
        self.brain.weights_frozen = not learning
        return self.brain.step(self.dark, duration_ms, stimulation=stimulation,
                               learning=learning, lamina_bias=0.0)

    def memory(self):
        return self.brain.memory()

    def checkpoint(self, path):
        self.brain.checkpoint(path)

    def restore(self, path):
        self.brain.restore(path)


def full_backend():
    from stonkfly.data import verify
    from stonkfly.neural.brain import MemoryBrain
    verify()
    return NativeBackend(MemoryBrain())


def synthetic_gateway(backend, names=("glans", "hood", "surrounding"), cells_per_channel=32):
    """Disjoint KC groups as engineered entry ports, never claimed as afferents."""
    b = backend.brain
    if not names or len(set(names)) != len(names) or cells_per_channel < 1:
        raise ValueError("Unique channel names and positive cells_per_channel required")
    kc = np.unique(b.circuit["pre"])
    if len(kc) < len(names) * cells_per_channel:
        raise ValueError("Insufficient KCs for disjoint input populations")
    channels = tuple(Channel(name, tuple(str(b.ids[i]) for i in kc[n*cells_per_channel:(n+1)*cells_per_channel])) for n, name in enumerate(names))
    return Mapping(channels, tuple(str(b.ids[i]) for i in b.circuit["reward"]),
                   {"mushroom_body_output": tuple(str(b.ids[i]) for i in b.circuit["mb"])},
                   {"dataset": "MaleCNS v1.0", "kind": "synthetic KC gateway",
                    "anatomy": "Names are virtual stimulation regions, not traced human nerve trunks.",
                    "selection": "First disjoint KC groups among existing presynaptic inputs to the model's plastic MBON edges, in graph order; reward cells selected by upstream PAM11 annotation.",
                    "human_to_fly_homology": False})
