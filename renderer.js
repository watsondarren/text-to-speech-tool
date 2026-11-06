const textEl = document.getElementById('text');
const voiceEl = document.getElementById('voice');
const rateEl = document.getElementById('rate');
const rateValueEl = document.getElementById('rate-value');
const speakBtn = document.getElementById('speak');
const pauseBtn = document.getElementById('pause');
const stopBtn = document.getElementById('stop');
const statusEl = document.getElementById('status');

const STORAGE = {
  text: 'speech-reader-text',
  voice: 'speech-reader-voice',
  rate: 'speech-reader-rate',
};

let keepAlive = null;
let session = 0;

function loadSettings() {
  const text = localStorage.getItem(STORAGE.text);
  if (text != null) {
    textEl.value = text;
  }

  const rate = localStorage.getItem(STORAGE.rate);
  if (rate != null) {
    rateEl.value = rate;
    rateValueEl.textContent = Number(rate).toFixed(1);
  }
}

function populateVoices() {
  const voices = speechSynthesis.getVoices();
  const selected = voiceEl.value || localStorage.getItem(STORAGE.voice) || '';

  voiceEl.replaceChildren();

  if (voices.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Default voice';
    voiceEl.append(option);
    return;
  }

  for (const voice of voices) {
    const option = document.createElement('option');
    option.value = voice.voiceURI;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceEl.append(option);
  }

  if ([...voiceEl.options].some((option) => option.value === selected)) {
    voiceEl.value = selected;
  }
}

function selectedVoice() {
  const uri = voiceEl.value;
  return speechSynthesis.getVoices().find((voice) => voice.voiceURI === uri) || null;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function clearKeepAlive() {
  if (keepAlive != null) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
}

function resetPlayback() {
  clearKeepAlive();
  pauseBtn.textContent = 'Pause';
  pauseBtn.disabled = true;
  speakBtn.disabled = false;
}

function speak() {
  const text = textEl.value.trim();
  if (!text) {
    setStatus('Paste some text first.');
    return;
  }

  const id = ++session;
  speechSynthesis.cancel();
  clearKeepAlive();
  pauseBtn.textContent = 'Pause';

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = selectedVoice();
  if (voice) {
    utterance.voice = voice;
  }
  utterance.rate = Number(rateEl.value);

  utterance.onstart = () => {
    speakBtn.disabled = true;
    pauseBtn.disabled = false;
    setStatus('Speaking');
    // Chromium stalls long utterances unless resume is nudged while speaking.
    keepAlive = setInterval(() => {
      if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.resume();
      }
    }, 10000);
  };

  utterance.onend = () => {
    if (id !== session) return;
    resetPlayback();
    setStatus('');
  };

  utterance.onerror = (event) => {
    if (id !== session) return;
    resetPlayback();
    if (event.error === 'interrupted' || event.error === 'canceled') {
      setStatus('');
      return;
    }
    setStatus('Could not speak that text.');
  };

  // cancel() and speak() in the same turn can drop the new utterance.
  setTimeout(() => {
    if (id !== session) return;
    speechSynthesis.speak(utterance);
  }, 0);
}

function togglePause() {
  if (!speechSynthesis.speaking && !speechSynthesis.paused) {
    return;
  }

  if (speechSynthesis.paused) {
    speechSynthesis.resume();
    pauseBtn.textContent = 'Pause';
    setStatus('Speaking');
    return;
  }

  speechSynthesis.pause();
  pauseBtn.textContent = 'Resume';
  setStatus('Paused');
}

function stop() {
  session += 1;
  speechSynthesis.cancel();
  resetPlayback();
  setStatus('');
}

textEl.addEventListener('input', () => {
  localStorage.setItem(STORAGE.text, textEl.value);
});

voiceEl.addEventListener('change', () => {
  localStorage.setItem(STORAGE.voice, voiceEl.value);
});

rateEl.addEventListener('input', () => {
  rateValueEl.textContent = Number(rateEl.value).toFixed(1);
  localStorage.setItem(STORAGE.rate, rateEl.value);
});

speakBtn.addEventListener('click', speak);
pauseBtn.addEventListener('click', togglePause);
stopBtn.addEventListener('click', stop);

speechSynthesis.addEventListener('voiceschanged', populateVoices);

loadSettings();
populateVoices();
