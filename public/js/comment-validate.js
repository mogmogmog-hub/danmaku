let lastSendTime = 0;

function canSend() {
  const now = Date.now();
  if (now - lastSendTime < 2000) return false;
  lastSendTime = now;
  return true;
}

function isTooLong(text) {
  return text.length > 256;
}
