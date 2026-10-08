# Integration contract

Construct a backend and a `Loop` once, then call `step(Frame(...))` repeatedly. A frame holds each specified channel's intensity for one simulation tick. Unspecified channels receive zero current. Values must be finite and within [0, 1]. Unknown channels fail before advancing any state.

The backend protocol in `clitorisophila/core.py` needs unique source `ids`, neuron count `n`, and `advance(duration_ms, stimulation, learning)`, `memory()`, `checkpoint(path)`, `restore(path)`. `advance` receives `(neuron_indices, current)` pairs and returns spike counts for every neuron plus compute seconds. Any other fly simulator can implement this protocol without adopting the Stonkfly environment.

## Mappings

`clitorisophila mapping --out mapping.json` produces explicit neuron **source IDs**, never unstable row numbers. The default gateway chooses disjoint groups of 32 Kenyon cells among presynaptic inputs to the upstream model's existing plastic edges, in graph order. These are engineered entry ports into the memory centre, not native touch afferents. PAM11 cells are the upstream reward population. MBON07/11 activity is a readout, not a validated pleasure gauge or action policy.

Edit mappings or construct `Mapping` and `Channel` objects to provide your own sensory populations and readouts. Source IDs must exist in the loaded backend; sensory populations cannot overlap the explicit reward population. Channel reward weights are within [0,1]. Population mapping and provenance are saved in a versioned document, and its hash binds checkpoints to the configuration.

For example, use a zero-weight channel as a neutral cue and pair it with a rewarded channel. A proper learning assay must compare later responses to the cue alone against matched unpaired and frozen controls. Neither this API nor a dopamine pulse guarantees a preference.

## Timing and input

Default: 20 ms simulation ticks, 100 ms reward delay, a 300 ms sensory-adaptation time constant, 50% adaptation at sustained maximal touch, currents capped by explicit configuration. Delay must be a whole number of ticks. Native neural integration remains 0.1 ms; the upstream rule bins rates at ≤10 ms.

The CLI's input reader runs separately from simulation with a one-frame mailbox. It retains the newest frame, avoiding an ever-growing backlog of old touch. Send a complete input state every ≤250 ms while held. Invalid input and EOF release stimulation. Silence also releases after the configured **wall-time** timeout, while the simulation continues. Existing delayed rewards remain queued; use `reward_delay_ms=0` if immediate release of reinforcement is required.

CLI output includes `sim_ms`, `wall_ms` and `realtime_factor` (simulation tick / processing wall time, excluding pacing). If the full graph cannot keep up, it runs slower rather than skipping integration or pretending to be real time. The API performs no sleeps: hosts can run it in a worker, use their own scheduler and pass output to a render thread.

`--steps 0` means run until Ctrl-C. The synthetic demo also accepts `--fast` for an unpaced assay. Example commands:

```sh
clitorisophila demo --steps 100 --fast
python examples/stream_input.py | clitorisophila live --backend fixture --steps 200
clitorisophila live --mapping mapping.json --checkpoint runs/session-001
clitorisophila live --mapping mapping.json --restore runs/session-001 --checkpoint runs/session-002
```

## State

Snapshots contain native voltages, delay queues, adaptation, trace/weight memory, plus the adapter's tick, sensory adaptation and queued rewards. Restore checks the mapping/configuration, native provenance and native-file checksum before continuing. Use a new snapshot directory each time; existing snapshots are not overwritten. Adapter restore with a different learning/reward setting is rejected; start a separate control run.

Each tick reports delivered reward strength, reward-cell spikes, mean readout rates, total spikes, and the upstream memory report. A change in efficacy can occur after stimulation ends because memory traces persist. `learning=False` freezes native efficacies, including passive drift. `reward_enabled=False` disables this adapter's explicit reward injection; the retained network may still activate dopamine cells endogenously.

## Physical and virtual bodies

A UI, simulator or physical sensor can produce the same frame. Sensor calibration, position-to-region assignment, pressure range and host action decoding belong in an explicit application adapter. The repository currently supplies virtual named regions; it does not include a 3D clitoral mesh, medical device interface, or the new study's segmented human nerve map. Importing those assets later requires their actual spatial data and license/provenance, rather than inferring an anatomical route from a channel name.
