"""Render five original, seamless dinosaur-rescue loops with free local tools.

Requires numpy and FFmpeg (or imageio-ffmpeg). Example:
    python tools/make_bgm.py --ffmpeg C:/path/to/ffmpeg.exe
"""

from __future__ import annotations

import argparse
import math
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np


RATE = 24_000
BARS = 12
BEATS = BARS * 4
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "games" / "dinosaur-rescue" / "assets" / "audio"
MODES = {
    "major": (0, 2, 4, 5, 7, 9, 11),
    "dorian": (0, 2, 3, 5, 7, 9, 10),
    "minor": (0, 2, 3, 5, 7, 8, 10),
}
STAGES = (
    dict(name="햇살 초원", slug="01-meadow", bpm=120, root=60, mode="major", lead="flute", arp="pluck", pad="strings", drums="light", progression=(0, 5, 3, 4, 0, 5, 3, 4, 3, 0, 1, 4), seed=101),
    dict(name="버섯 숲", slug="02-mushroom", bpm=112, root=62, mode="dorian", lead="bell", arp="pluck", pad="air", drums="soft", progression=(0, 3, 4, 0, 0, 5, 3, 4, 3, 0, 5, 4), seed=202),
    dict(name="화산 계곡", slug="03-canyon", bpm=136, root=57, mode="minor", lead="brass", arp="pulse", pad="strings", drums="driving", progression=(0, 5, 3, 4, 0, 5, 3, 4, 5, 3, 4, 4), seed=303),
    dict(name="수정 동굴", slug="04-cave", bpm=106, root=64, mode="minor", lead="bell", arp="glass", pad="air", drums="soft", progression=(0, 5, 2, 4, 0, 5, 2, 4, 3, 2, 5, 4), seed=404),
    dict(name="달빛 둥지", slug="05-moonlight", bpm=144, root=60, mode="minor", lead="brass", arp="pulse", pad="strings", drums="driving", progression=(0, 5, 3, 4, 0, 5, 3, 4, 5, 3, 4, 4), seed=505),
)


def midi(degree: int, root: int, mode: tuple[int, ...]) -> int:
    octave, index = divmod(degree, 7)
    return root + octave * 12 + mode[index]


def frequency(note: int) -> float:
    return 440.0 * 2.0 ** ((note - 69) / 12.0)


def mix_circular(buffer: np.ndarray, start: float, signal: np.ndarray, pan: float = 0.0) -> None:
    total = len(buffer)
    offset = round(start * RATE) % total
    left = math.sqrt((1.0 - pan) / 2.0)
    right = math.sqrt((1.0 + pan) / 2.0)
    signal = signal[:total]
    end = min(total - offset, len(signal))
    buffer[offset:offset + end, 0] += signal[:end] * left
    buffer[offset:offset + end, 1] += signal[:end] * right
    if end < len(signal):
        buffer[:len(signal) - end, 0] += signal[end:] * left
        buffer[:len(signal) - end, 1] += signal[end:] * right


def note(buffer: np.ndarray, start: float, duration: float, pitch: int, voice: str, level: float, pan: float = 0.0) -> None:
    count = max(1, round(duration * RATE))
    t = np.arange(count, dtype=np.float32) / RATE
    hz = frequency(pitch)
    phase = 2 * np.pi * hz * t
    if voice == "bell":
        sound = np.sin(phase) + 0.40 * np.sin(2.01 * phase) + 0.17 * np.sin(3.92 * phase)
        envelope = (1 - np.exp(-t / 0.008)) * np.exp(-3.4 * t / max(duration, 0.25))
    elif voice == "flute":
        wobble = 0.012 * np.sin(2 * np.pi * 5.1 * t)
        sound = np.sin(phase + wobble) + 0.12 * np.sin(2 * phase)
        envelope = np.minimum(1, t / 0.045)
    elif voice == "brass":
        sound = np.sin(phase) + 0.48 * np.sin(2 * phase) + 0.24 * np.sin(3 * phase) + 0.09 * np.sin(4 * phase)
        envelope = np.minimum(1, t / 0.025)
    elif voice == "strings":
        sound = 0.65 * np.sin(phase) + 0.26 * np.sin(1.004 * phase) + 0.22 * np.sin(2 * phase) + 0.08 * np.sin(3 * phase)
        envelope = np.minimum(1, t / 0.18)
    elif voice == "air":
        sound = np.sin(phase) + 0.28 * np.sin(1.006 * phase) + 0.10 * np.sin(2 * phase)
        envelope = np.minimum(1, t / 0.3)
    elif voice == "pulse":
        sound = np.sin(phase) + 0.33 * np.sin(2 * phase) + 0.15 * np.sin(3 * phase)
        envelope = (1 - np.exp(-t / 0.006)) * np.exp(-2.3 * t / max(duration, 0.1))
    elif voice == "glass":
        sound = np.sin(phase) + 0.23 * np.sin(2.7 * phase) + 0.10 * np.sin(4.1 * phase)
        envelope = (1 - np.exp(-t / 0.006)) * np.exp(-2.8 * t / max(duration, 0.1))
    elif voice == "bass":
        sound = np.sin(phase) + 0.26 * np.sin(2 * phase)
        envelope = (1 - np.exp(-t / 0.012)) * np.exp(-1.6 * t / max(duration, 0.1))
    else:  # warm pluck
        sound = np.sin(phase) + 0.32 * np.sin(2 * phase) + 0.12 * np.sin(3 * phase)
        envelope = (1 - np.exp(-t / 0.005)) * np.exp(-3.2 * t / max(duration, 0.1))
    release = np.minimum(1, np.maximum(0, (duration - t) / min(0.16, duration / 3)))
    mix_circular(buffer, start, (sound * envelope * release * level).astype(np.float32), pan)


def drum(buffer: np.ndarray, start: float, kind: str, level: float, rng: np.random.Generator) -> None:
    duration = {"kick": 0.28, "snare": 0.18, "hat": 0.075, "tom": 0.24}[kind]
    t = np.arange(round(duration * RATE), dtype=np.float32) / RATE
    noise = rng.standard_normal(len(t)).astype(np.float32)
    if kind == "kick":
        phase = 2 * np.pi * (54 * t + 57 * (1 - np.exp(-t / 0.028)) * 0.028)
        sound = np.sin(phase) * np.exp(-t * 16) + noise * np.exp(-t * 45) * 0.12
    elif kind == "snare":
        sound = (noise - np.convolve(noise, np.ones(9, dtype=np.float32) / 9, mode="same")) * np.exp(-t * 24) * 0.55
        sound += np.sin(2 * np.pi * 190 * t) * np.exp(-t * 32) * 0.25
    elif kind == "tom":
        sound = np.sin(2 * np.pi * (135 - 55 * t) * t) * np.exp(-t * 13)
    else:
        sound = (noise - np.convolve(noise, np.ones(7, dtype=np.float32) / 7, mode="same")) * np.exp(-t * 55) * 0.22
    mix_circular(buffer, start, (sound * level).astype(np.float32), 0.1 if kind == "hat" else 0)


def render(stage: dict) -> np.ndarray:
    beat = 60.0 / stage["bpm"]
    length = BEATS * beat
    buffer = np.zeros((round(length * RATE), 2), dtype=np.float32)
    mode = MODES[stage["mode"]]
    rng = np.random.default_rng(stage["seed"])
    motif_rhythm = (0, 0.5, 1.5, 2, 2.75, 3.5)
    motif_degrees = (0, 2, 4, 5, 4, 2)
    for bar, degree in enumerate(stage["progression"]):
        bar_start = bar * 4 * beat
        chord = (degree, degree + 2, degree + 4)
        for index, chord_degree in enumerate(chord):
            note(buffer, bar_start, 4.06 * beat, midi(chord_degree, stage["root"] - 12, mode), stage["pad"], 0.040, (-0.55, 0, 0.55)[index])
        note(buffer, bar_start, 1.35 * beat, midi(degree, stage["root"] - 24, mode), "bass", 0.105)
        note(buffer, bar_start + 2 * beat, 1.25 * beat, midi(degree + 4, stage["root"] - 24, mode), "bass", 0.075)
        for eighth in range(8):
            arp_degree = chord[(0, 1, 2, 1, 0, 1, 2, 1)[eighth]]
            arp_level = 0.028 if stage["drums"] == "soft" else 0.036
            note(buffer, bar_start + eighth * 0.5 * beat, 0.45 * beat, midi(arp_degree, stage["root"], mode), stage["arp"], arp_level, -0.35 if eighth % 2 else 0.35)
        if bar % 4 != 3:
            for pos, melodic_degree in zip(motif_rhythm, motif_degrees):
                if stage["drums"] == "soft" and pos == 2.75 and bar % 2:
                    continue
                note(buffer, bar_start + pos * beat, (0.45 if pos != 3.5 else 0.5) * beat,
                     midi(degree + melodic_degree, stage["root"] + 12, mode), stage["lead"],
                     0.075 if stage["lead"] != "brass" else 0.052, 0.10)
        else:
            for pos, offset in ((0, 4), (1.5, 2), (3, 1)):
                note(buffer, bar_start + pos * beat, 0.8 * beat,
                     midi(degree + offset, stage["root"] + 12, mode), stage["lead"], 0.063, 0.10)
        for beat_index in range(4):
            time = bar_start + beat_index * beat
            if stage["drums"] == "driving":
                drum(buffer, time, "kick" if beat_index % 2 == 0 else "snare", 0.10, rng)
                drum(buffer, time, "hat", 0.055, rng)
                drum(buffer, time + 0.5 * beat, "hat", 0.043, rng)
            elif stage["drums"] == "light":
                if beat_index in (0, 2):
                    drum(buffer, time, "kick", 0.072, rng)
                if beat_index == 3:
                    drum(buffer, time, "snare", 0.045, rng)
                drum(buffer, time + 0.5 * beat, "hat", 0.025, rng)
            elif beat_index in (0, 2):
                drum(buffer, time, "tom" if beat_index == 0 else "hat", 0.035, rng)

    # Circular echoes keep the very first and last samples compatible when looping.
    dry = buffer.copy()
    buffer += 0.14 * np.roll(dry[:, ::-1], round(0.19 * RATE), axis=0)
    buffer += 0.075 * np.roll(dry, round(0.33 * RATE), axis=0)
    buffer = np.tanh(buffer * 1.4) / 1.4
    peak = float(np.max(np.abs(buffer)))
    rms = float(np.sqrt(np.mean(buffer ** 2)))
    buffer *= min(0.87 / peak, 0.105 / rms)
    return buffer


def find_ffmpeg(explicit: str | None) -> str:
    if explicit:
        return explicit
    binary = shutil.which("ffmpeg")
    if binary:
        return binary
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError as exc:
        raise SystemExit("FFmpeg is required: pass --ffmpeg or install free imageio-ffmpeg") from exc


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", help="Path to an FFmpeg executable")
    args = parser.parse_args()
    ffmpeg = find_ffmpeg(args.ffmpeg)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="dino-bgm-") as scratch:
        for stage in STAGES:
            samples = render(stage)
            wav_path = Path(scratch) / (stage["slug"] + ".wav")
            mp3_path = OUTPUT / (stage["slug"] + ".mp3")
            with wave.open(str(wav_path), "wb") as wav:
                wav.setnchannels(2)
                wav.setsampwidth(2)
                wav.setframerate(RATE)
                wav.writeframes((samples * 32767).astype("<i2").tobytes())
            subprocess.run((ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
                            "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", str(RATE), "-ac", "2",
                            "-metadata", f"title={stage['name']}", "-metadata", "artist=usesang",
                            str(mp3_path)), check=True)
            print(f"{stage['slug']}: {len(samples) / RATE:.1f}s, {mp3_path.stat().st_size / 1024:.0f} KiB")


if __name__ == "__main__":
    main()
