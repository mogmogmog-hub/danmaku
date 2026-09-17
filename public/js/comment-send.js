async function send(btn) {
  if (!canSend()) return;

  const text = textInput.value.trim();
  if (isTooLong(text)) return;

  const payload = buildPayload(text);

  await postComment(payload, btn);
}

async function sendNumber(textValue, btn) {
  if (!canSend()) return;
  if (isTooLong(textValue)) return;

  const payload = buildPayload(textValue);

  await postComment(payload, btn);
}

function buildPayload(text) {
  return {
    text,
    color: document.querySelector('input[name="color"]:checked').value,
    size: document.querySelector('input[name="size"]:checked').value,
    speed: Number(document.querySelector('input[name="speed"]:checked').value),
    fixed: document.querySelector('input[name="fixed"]:checked').value === "true",
    studentId
  };
}

async function postComment(payload, btn) {
  const status = document.getElementById("status");

  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "送信…";

  try {
    await fetch('/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    status.textContent = "送信しました";
    setTimeout(() => status.textContent = "", 2000);

    textInput.value = "";
    sendBtn.disabled = true;

  } catch {
    status.textContent = "通信エラーが発生しました";
  }

  btn.disabled = false;
  btn.textContent = original;
}
