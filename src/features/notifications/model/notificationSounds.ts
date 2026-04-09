type SoundLabel = "success" | "error" | "test";

type AudioContextConstructor = new () => AudioContext;

let audioContext: AudioContext | null = null;

function resolveAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: AudioContextConstructor;
      }
    ).webkitAudioContext ??
    null
  );
}

function getAudioContext(): AudioContext {
  if (audioContext && audioContext.state !== "closed") {
    return audioContext;
  }

  const AudioContextImpl = resolveAudioContextConstructor();
  if (!AudioContextImpl) {
    throw new Error("Web Audio API is not available in this environment");
  }

  audioContext = new AudioContextImpl();
  return audioContext;
}

export function resetNotificationAudioContextForTests(): void {
  if (audioContext && audioContext.state !== "closed") {
    void audioContext.close();
  }
  audioContext = null;
}

export function playNotificationSound(url: string, label: SoundLabel): void {
  try {
    const context = getAudioContext();

    if (context.state === "suspended") {
      void context.resume();
    }

    void fetch(url)
      .then((response) => response.arrayBuffer())
      .then((audioFileBuffer) => context.decodeAudioData(audioFileBuffer))
      .then((audioBuffer) => {
        const source = context.createBufferSource();
        const gainNode = context.createGain();

        gainNode.gain.value = 0.05;
        source.buffer = audioBuffer;
        source.connect(gainNode);
        gainNode.connect(context.destination);
        source.start();
      })
      .catch((error) => {
        console.error(`Failed to play ${label} notification sound`, error);
      });
  } catch (error) {
    console.error(`Failed to initialize ${label} notification sound`, error);
  }
}
