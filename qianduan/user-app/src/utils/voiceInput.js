// 低年级语音输入：浏览器录音转成 16kHz 单声道 WAV，交给云端识别。
// 使用 ScriptProcessor 逐帧采集（各端浏览器兼容），停止时线性重采样后编码 WAV。
const TARGET_SAMPLE_RATE = 16_000;
const MAX_SECONDS = 30;
const BUFFER_SIZE = 4096;

export function createVoiceRecorder({ onAutoStop } = {}) {
  let audioContext = null;
  let mediaStream = null;
  let sourceNode = null;
  let processor = null;
  let samples = [];
  let startedAt = 0;
  let finished = false;

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("这个浏览器不能录音，用电脑 Chrome 或手机自带的浏览器打开就能说话啦");
    }
    // 关掉回声消除/降噪会让识别更稳，手机浏览器尤其需要
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const Context = window.AudioContext || window.webkitAudioContext;
    audioContext = new Context({ sampleRate: TARGET_SAMPLE_RATE });
    // 手机浏览器的自动播放策略会把音频上下文挂起，不 resume 就录不到任何声音
    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch {
        /* 部分 webview 不支持，靠下面的采样检查兜底 */
      }
    }
    if (audioContext.state !== "running") {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
      audioContext.close().catch(() => {});
      audioContext = null;
      throw new Error("麦克风没准备好，请再点一次试试");
    }
    sourceNode = audioContext.createMediaStreamSource(mediaStream);
    processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processor.onaudioprocess = (event) => {
      if (finished) return;
      const input = event.inputBuffer.getChannelData(0);
      samples.push(new Float32Array(input));
      if ((Date.now() - startedAt) / 1000 >= MAX_SECONDS) {
        finish();
        onAutoStop?.();
      }
    };
    sourceNode.connect(processor);
    // ScriptProcessor 需要连到 destination 才会触发回调；静音增益避免回声。
    const mute = audioContext.createGain();
    mute.gain.value = 0;
    processor.connect(mute);
    mute.connect(audioContext.destination);
    startedAt = Date.now();
  }

  function collect() {
    const total = samples.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of samples) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return merged;
  }

  function teardown() {
    finished = true;
    processor?.disconnect();
    sourceNode?.disconnect();
    mediaStream?.getTracks().forEach((track) => track.stop());
    audioContext?.close().catch(() => {});
    processor = null;
    sourceNode = null;
    mediaStream = null;
    audioContext = null;
  }

  function finish() {
    const merged = collect();
    const seconds = (Date.now() - startedAt) / 1000;
    const rate = audioContext?.sampleRate || TARGET_SAMPLE_RATE;
    teardown();
    return { blob: encodeWav(merged, rate), seconds };
  }

  async function stop() {
    const result = finish();
    samples = [];
    return result;
  }

  function abort() {
    finish();
    samples = [];
  }

  return { start, stop, abort };
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("录音读取失败，请再试一次"));
    reader.readAsDataURL(blob);
  });
}

function encodeWav(samples, sourceRate) {
  const ratio = (sourceRate || TARGET_SAMPLE_RATE) / TARGET_SAMPLE_RATE;
  const length = Math.max(1, Math.floor(samples.length / ratio));
  const pcm = new Int16Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, samples.length - 1);
    const value = samples[left] * (1 - (position - left)) + samples[right] * (position - left);
    pcm[i] = Math.round(Math.max(-1, Math.min(1, value)) * 32_767);
  }
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  writeText(view, 0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeText(view, 8, "WAVE");
  writeText(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(view, 36, "data");
  view.setUint32(40, pcm.length * 2, true);
  new Int16Array(buffer, 44).set(pcm);
  return new Blob([buffer], { type: "audio/wav" });
}

function writeText(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
