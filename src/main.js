(function () {
  function getQueryParams(url) {
    const queryString = url.split("?")[1] || "";
    return Object.fromEntries(new URLSearchParams(queryString));
  }

  const currentScript = document.currentScript;
  const params = getQueryParams(currentScript?.src || "");

  const projectId = params.projectId;
  const ty = params.ty;       // "redirect" or "message"
  const payload = params.payload;
  
  // Define the baseUrl from environment variables with a fallback
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  if (!projectId) {
    console.warn("[Waitly] Missing projectId in script src query params.");
    return;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const input = document.querySelector('input[data-waitly]');
    if (!input) {
      console.warn('[Waitly] No input with [data-waitly] attribute found.');
      return;
    }

    const form = input.closest('form');
    if (!form) {
      console.warn('[Waitly] The input with [data-waitly] is not inside a <form>.');
      return;
    }

    const messageEl = document.querySelector('p[data-waitly-message], div[data-waitly-message]');

    function showMessage(msg) {
      if (messageEl) {
        messageEl.textContent = msg;
        messageEl.style.display = "block";
      } else {
        alert(msg);
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = input.value.trim();
      if (!email) {
        showMessage("Please enter your email.");
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, projectId }),
        });

        if (!response.ok) {
            let errorData;
            try {
            errorData = await response.json();
            } catch (e) {
            errorData = { message: await response.text() };
            }
            const errorText = (errorData.message + '.') || "Server error";
          throw new Error(errorText);
        }

        const data = await response.text();
        console.log("[Waitly] Lead added:", data);

        if (ty === "redirect" && payload) {
          window.location.href = payload;
          return;
        }

        if (ty === "message" && payload) {
          showMessage(payload);
        } 
        
        input.value = "";

      } catch (err) {
        console.error("[Waitly] Submission error:", err);
        showMessage(err.message || 'Server error');
      }
    });
  });
})();
