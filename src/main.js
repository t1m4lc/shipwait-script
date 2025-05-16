(function () {
  const scriptTag =
    document.currentScript ||
    Array.from(document.querySelectorAll("script")).find(
      (s) =>
        s.src?.includes("shipwait-script-dist") &&
        s.hasAttribute("data-shipwait-id")
    );

  const projectId = scriptTag?.getAttribute("data-shipwait-id");

  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  if (!projectId) {
    console.warn("[Shipwait] Missing projectId in script.");
    return;
  }

  async function fetchBehavior() {
    try {
      const response = await fetch(
        `${baseUrl}/api/submission-behaviors?projectId=${projectId}`
      );

      if (!response.ok) {
        console.warn(
          `[Shipwait] Failed to fetch behaviors: ${response.status}`
        );
        return null;
      }

      const result = await response.json();

      return result.data;
    } catch (error) {
      console.warn("[Shipwait] Error fetching behaviors:", error);
      return null;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const input = document.querySelector("input[data-shipwait]");
    if (!input) {
      console.warn("[Shipwait] No input with [data-shipwait] attribute found.");
      return;
    }

    const form = input.closest("form");
    if (!form) {
      console.warn(
        "[Shipwait] The input with [data-shipwait] is not inside a <form>."
      );
      return;
    }

    const messageEl = document.querySelector("[data-shipwait-message]");

    function showMessage(msg) {
      if (messageEl) {
        messageEl.textContent = msg;
      } else {
        alert(msg);
      }
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = input.value.trim();
      if (!email) {
        showMessage("Please enter your email.");
        return;
      }

      const behavior = await fetchBehavior();

      const behaviorType = behavior?.type || "do_nothing";
      const behaviorPayload = behavior?.payload || null;

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
          const errorText = errorData.message + "." || "Server error";
          throw new Error(errorText);
        }

        const data = await response.text();
        console.log("[Shipwait] Lead added:", data);

        if (behaviorType === "redirect" && behaviorPayload) {
          window.location.href = behaviorPayload;
          return;
        }

        if (behaviorType === "show_message" && behaviorPayload) {
          showMessage(behaviorPayload);
        }

        input.value = "";
      } catch (err) {
        console.error("[Shipwait] Submission error:", err);
        showMessage(err.message || "Server error");
      }
    });
  });
})();
