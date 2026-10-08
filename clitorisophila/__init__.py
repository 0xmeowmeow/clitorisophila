"""Persistent stimulation/reinforcement interface for connectome backends."""

from .core import Channel, Config, Frame, Loop, Mapping

__all__ = ["Channel", "Config", "Frame", "Loop", "Mapping"]
__version__ = "0.1.0"
