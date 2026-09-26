(() => {
  'use strict';

  const FILES = [
    'assets/audio/01-meadow.mp3',
    'assets/audio/02-mushroom.mp3',
    'assets/audio/03-canyon.mp3',
    'assets/audio/04-cave.mp3',
    'assets/audio/05-moonlight.mp3'
  ];
  const BEATS = 48;
  const BPM = [120, 112, 136, 106, 144];
  const VOLUME = 0.16;
  const FADE_SECONDS = 0.65;

  window.createDinosaurRescueMusic = getContext => {
    const buffers = new Map();
    let current = null;
    let wantedStage = null;
    let playing = false;
    let muted = false;
    let revision = 0;

    function preload(stage) {
      if (stage < 0 || stage >= FILES.length) return Promise.resolve(null);
      if (!buffers.has(stage)) {
        const pending = fetch(FILES[stage])
          .then(response => {
            if (!response.ok) throw new Error(`Music ${stage + 1}: HTTP ${response.status}`);
            return response.arrayBuffer();
          })
          .then(bytes => getContext().decodeAudioData(bytes))
          .catch(error => {
            buffers.delete(stage);
            console.warn('Background music unavailable; the game will continue silently.', error);
            return null;
          });
        buffers.set(stage, pending);
      }
      return buffers.get(stage);
    }

    function fadeOut(entry, seconds = FADE_SECONDS) {
      if (!entry) return;
      const context = getContext();
      const now = context.currentTime;
      entry.gain.gain.cancelScheduledValues(now);
      entry.gain.gain.setValueAtTime(entry.gain.gain.value, now);
      entry.gain.gain.linearRampToValueAtTime(0, now + seconds);
      entry.source.stop(now + seconds + 0.03);
      entry.source.addEventListener('ended', () => entry.gain.disconnect(), { once: true });
    }

    function start(stage) {
      wantedStage = stage;
      playing = true;
      const request = ++revision;
      const context = getContext();
      for (const cachedStage of buffers.keys()) {
        if (cachedStage !== stage && cachedStage !== stage + 1) buffers.delete(cachedStage);
      }
      void context.resume().catch(() => {});
      void preload(stage).then(buffer => {
        if (!buffer || !playing || wantedStage !== stage || revision !== request) return;
        const now = context.currentTime;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = Math.min(buffer.duration, BEATS * 60 / BPM[stage]);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(muted ? 0 : VOLUME, now + FADE_SECONDS);
        source.connect(gain).connect(context.destination);
        source.start(now);
        fadeOut(current);
        current = { source, gain, stage };
      });
      void preload(stage + 1);
    }

    function pause() {
      playing = false;
      if (current) void getContext().suspend().catch(() => {});
    }

    function resume() {
      if (wantedStage === null) return;
      playing = true;
      if (current?.stage === wantedStage) {
        void getContext().resume().catch(() => {});
      } else {
        start(wantedStage);
      }
    }

    function stop() {
      ++revision;
      playing = false;
      wantedStage = null;
      if (current) {
        const previous = current;
        current = null;
        void getContext().resume().then(() => fadeOut(previous, 0.35)).catch(() => {
          try { previous.source.stop(); } catch {}
        });
      }
    }

    function setMuted(value) {
      muted = value;
      if (!current) return;
      const context = getContext();
      const now = context.currentTime;
      current.gain.gain.cancelScheduledValues(now);
      current.gain.gain.setTargetAtTime(muted ? 0 : VOLUME, now, 0.08);
    }

    return { preload, start, pause, resume, stop, setMuted };
  };
})();
