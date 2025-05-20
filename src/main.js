(function () {
  window.addEventListener('shipwait:init', initializeForm);

  function getQueryParams(url) {
    const queryString = url.split("?")[1] || "";
    return Object.fromEntries(new URLSearchParams(queryString));
  }

  const currentScript = document.currentScript;
  const params = getQueryParams(currentScript?.src || "");
  const projectId = params.id

  if (!projectId) {
    console.warn("[Shipwait] Missing projectId in script!");
    return;
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  async function fetchBehavior() {
    try {
      const response = await fetch(
        `${baseUrl}/api/submission-behaviors?projectId=${projectId}`
      );

      if (!response.ok) {
        return null;
      }

      const result = await response.json();

      return result.data;
    } catch (error) {
      return null;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const input = document.querySelector("input[data-shipwait]");
    if (!input) {
      return;
    }

    const form = input.closest("form");
    if (!form) {
      return;
    }

    const messageEl = document.querySelector("[data-shipwait-message]");
    const submitButton = form.querySelector("button[type='submit']");
    const originalButtonText = submitButton ? submitButton.textContent : "Submit";

    function showMessage(msg) {
      if (messageEl) {
        messageEl.textContent = msg;
      } else {
        alert(msg);
      }
    }

    function setLoading(isLoading) {
      input.disabled = isLoading;
      
      if (submitButton) {
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? `${originalButtonText}...` : originalButtonText;
      }
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = input.value.trim();
      if (!email) {
        showMessage("Please enter your email.");
        return;
      }

      setLoading(true);

      try {
        const behavior = await fetchBehavior();

        const behaviorType = behavior?.behavior_type || "do_nothing";
        const behaviorPayload = behaviorType === 'redirect' ? behavior?.redirect : (behavior?.message || null);

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
          const errorText = errorData.message + "." || "Server error";
          throw new Error(errorText);
        }

        await response.text();

        if (behaviorType === "redirect" && behaviorPayload) {
          window.location.href = behaviorPayload;
          return;
        }

        if (behaviorType === "show_message" && behaviorPayload) {
          showMessage(behaviorPayload);
        }

        input.value = "";
      } catch (err) {
        showMessage(err.message || "Server error");
      } finally {
        setLoading(false);
      }
    });
  });
})();
