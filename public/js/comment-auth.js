const studentId = localStorage.getItem("studentId");
if (!studentId) {
  window.location.href = "/login.html";
}
