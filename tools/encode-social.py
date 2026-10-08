#!/usr/bin/env python3
"""Encode the actual browser recording as a looping square GIF and H.264 MP4."""
import argparse
import json
import math
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=Path('assets/social'))
parser.add_argument('--capture', type=Path, default=Path('/tmp/clitorisophila-social-capture.json'))
args = parser.parse_args()
metadata = json.loads(args.capture.read_text())
source = metadata['source']
duration = metadata['duration']
# Chromium's first video frame can lag page creation. The recording ends with
# the protocol, so anchor the trim to the encoded stream rather than wall time.
source_duration = float(subprocess.check_output([
    'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', source,
], text=True).strip())
start = max(0, source_duration - duration)
base = args.output / 'clitorisophila-facebook'

def run(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'warning', '-y', *map(str, args)], check=True)

# A third-second dissolve joins two real portions of the recording. Beginning
# just after the opening frames makes the last dissolve frame meet the first.
# This is a film edit; no simulated signals or neuron values are generated here.
film_duration = math.floor(duration * 24) / 24
dissolve = 8 / 24
loop_filter = (
    f'fps=24,format=yuv420p,trim=duration={film_duration},setpts=PTS-STARTPTS,split[main][head];'
    f'[main]trim=start={dissolve},setpts=PTS-STARTPTS,fps=24[body];'
    f'[head]trim=duration={dissolve},setpts=PTS-STARTPTS,fps=24[lead];'
    f'[body][lead]xfade=transition=fade:duration={dissolve}:offset={film_duration-2*dissolve}[film]'
)
run('-ss', start, '-t', duration, '-i', source,
    '-filter_complex', loop_filter, '-map', '[film]', '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-crf', 17, '-movflags', '+faststart', base.with_suffix('.mp4'))
def gif(scale=960, fps=12, colors=160):
    run('-i', base.with_suffix('.mp4'),
        '-filter_complex', f'fps={fps},scale={scale}:{scale}:flags=lanczos,split[a][b];[a]palettegen=max_colors={colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
        '-an', '-loop', 0, base.with_suffix('.gif'))

gif()
if base.with_suffix('.gif').stat().st_size > 15_000_000:
    gif(scale=840, fps=10, colors=128)
for suffix in ('.gif', '.mp4'):
    file = base.with_suffix(suffix)
    print(f'{file}: {file.stat().st_size / 1_000_000:.2f} MB')
