const textInput = document.getElementById("text");
const sendBtn = document.getElementById("sendBtn");

textInput.addEventListener("input", () => {
  sendBtn.disabled = textInput.value.trim() === "";
});

document.querySelectorAll(".number-buttons button").forEach(btn => {
  btn.addEventListener("click", () => {
    sendNumber(btn.dataset.num, btn);
  });
});

document.querySelectorAll(".understanding-buttons button").forEach(btn => {
  btn.addEventListener("click", () => {
    sendNumber(btn.dataset.num, btn);
  });
});
