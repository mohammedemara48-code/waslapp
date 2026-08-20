let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let stopVibrate = false;

function context() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(freq: number, duration: number, gain = 0.22) {
  const ac = context();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function stopCallTone() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  stopVibrate = true;
}

export function startCallTone(mode: "in" | "out") {
  stopCallTone();
  stopVibrate = false;
  void context().resume();
  if (mode === "in") {
    const pulse = () => {
      beep(440, 0.4);
      beep(480, 0.4);
      if (!stopVibrate && navigator.vibrate) navigator.vibrate([400, 180, 400]);
    };
    pulse();
    timer = setInterval(pulse, 1800);
  } else {
    const pulse = () => {
      beep(425, 0.35, 0.16);
    };
    pulse();
    timer = setInterval(pulse, 900);
  }
  return stopCallTone;
}
