/** Play a remote WebRTC stream louder than the default element volume. */
export function boostPlayback(el: HTMLMediaElement, stream: MediaStream | null, enabled: boolean) {
  el.volume = 1;
  if (!enabled || !stream || typeof window === "undefined") {
    el.muted = !enabled;
    return () => {};
  }
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) {
    el.muted = false;
    return () => {};
  }
  let ac: AudioContext | null = null;
  let src: MediaStreamAudioSourceNode | null = null;
  let gain: GainNode | null = null;
  try {
    ac = new AC();
    src = ac.createMediaStreamSource(stream);
    gain = ac.createGain();
    gain.gain.value = 2.8;
    src.connect(gain);
    gain.connect(ac.destination);
    el.muted = true;
    void ac.resume();
  } catch {
    el.muted = false;
    return () => {};
  }
  return () => {
    try {
      src?.disconnect();
      gain?.disconnect();
      void ac?.close();
    } catch {
      /* ignore */
    }
    el.muted = false;
  };
}
