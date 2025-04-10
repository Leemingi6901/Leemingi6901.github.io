// assets/js/custom-visits.js

document.addEventListener("DOMContentLoaded", () => {
  fetch("https://YOUR_NETLIFY_SITE.netlify.app/.netlify/functions/visitCount")
    .then(res => res.json())
    .then(data => {
      const container = document.createElement("div");
      container.style.marginTop = "1em";
      container.style.textAlign = "center";
      container.innerHTML = `
        <strong>오늘 방문자 수:</strong> ${data.today}명 /
        <strong>총합:</strong> ${data.total}명
      `;
      document.querySelector("footer").appendChild(container);
    })
    .catch(err => console.error("방문자 수 표시 실패:", err));
});
