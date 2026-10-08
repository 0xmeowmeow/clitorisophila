# Model and evidence boundaries

Clitorisophila joins a synthetic peripheral input to an existing connectome simulation. It is an experimentally manipulable hybrid, not an anatomical translation between species.

## Human input

Lee et al., [Neuroanatomy of the clitoris](https://doi.org/10.64898/2026.03.18.712572), posted March 20, 2026, reports micron-scale synchrotron imaging and branched nerve trunks within the glans, with additional dorsal-nerve branches to the hood and mons pubis. This is peripheral nerve-bundle anatomy. It does not provide receptor transduction equations, individual afferent firing responses, a central synaptic connectome, or a map from touch to pleasure.

No paper text, figures, raw scans or segmentations are distributed here. The preprint's stated CC-BY-NC license is separate from this repository's MIT code license. Actual data accessions are linked on the preprint; no data-license compatibility is implied by citing them.

The virtual glans/hood/surrounding ports are synthetic. Intensity generates a bounded current. Each port has a decaying adaptation state; current response is intensity × (1 − adaptation_fraction × previous_adaptation). Reward is the capped sum of port responses weighted by configured reward weights, delayed by configured simulation ticks. These are declared modeling choices, not measured human physiology.

## Fly simulation

The full backend uses the upstream checksum-locked **MaleCNS v1.0** graph unchanged (166,700 neurons; 25,582,938 directed connections). `MemoryBrain` supplies native LIF dynamics, KC adaptation and its baseline-centered rate-rule candidate memory implementation. See [the original model documentation](model.md), [Stonkfly](https://github.com/nftechie/stonkfly) and [DOOMFLY](https://github.com/nftechie/doomfly). No retinal background current or trading environment is used by the new backend.

The default gateway injects synthetic sensory current into selected KCs and delayed reinforcement current into the 15 upstream-identified PAM11 cells. Plasticity acts on the existing selected KC→MBON07/11 edges; the topology is never pruned or supplemented. Full dynamics include all retained neurons and directed edges. Counts and weights are not a handcrafted preference score.

Experimental support for appetitive dopaminergic learning: [Liu et al. 2012](https://doi.org/10.1038/nature11304), [Ichinose et al. 2015](https://elifesciences.org/articles/10719). The inherited temporal memory rule is an adaptation, with its own declared assumptions, of [Huang, Luo et al. 2024](https://doi.org/10.1038/s41586-024-07819-w). These sources motivate selected mechanisms; they do not validate this hybrid or its parameter values. The native rule can depress some eligible connections under reward; positive reinforcement does not mean every weight increases.

## Interpretation

The experiment asks whether synthetic stimulation coupled to an appetitive teaching signal can influence a connectome-based agent's learned preferences. v0.1 establishes live signal delivery, persistent activity, candidate efficacy changes and reusable interfaces. It does **not** establish behavioural preference, reward-seeking, pleasure, human physiology, consciousness or organism welfare.

The host must define actions and a transparent fixed or trained readout, then measure behaviour. For a preference claim, use cue-only held-out probes, paired versus unpaired reward, dopamine-disabled and frozen-plasticity conditions, matched random/shuffled topology, and repeated seeds. Compare against the same host decoder without the fly. These controls distinguish circuit-dependent learning from a reward label or externally trained policy.

The offline six-cell fixture contains no biological connectome data. It exercises the same native kernel and candidate rule to make installation and integration testable without a gigabyte download. Its weights, neuron identities and body labels are synthetic.
