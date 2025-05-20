(function () {
  // Configuration
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  /**
   * Parse query parameters from a URL
   * @param {string} url
   * @returns {Object}
   */
  function getQueryParams(url) {
    const query = url.split('?')[1] || '';
    return Object.fromEntries(new URLSearchParams(query));
  }

  const currentScript = document.currentScript;
  const { id: projectId } = getQueryParams(currentScript?.src || '');

  if (!projectId) {
    console.warn('[Shipwait] Missing projectId in script!');
    return;
  }

  /**
   * Utility to dispatch custom events for external communication
   * @param {string} name - event name
   * @param {Object} detail - payload data
   */
  function dispatchShipwaitEvent(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  /**
   * Fetch project submission behaviors
   * @returns {Promise<Object|null>}
   */
  async function fetchBehavior() {
    try {
      const res = await fetch(`${baseUrl}/api/submission-behaviors?projectId=${projectId}`);
      if (!res.ok) return null;
      const { data } = await res.json();
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Initialize form behavior on a matched input
   * @param {HTMLInputElement} input
   */
  function attachHandler(input) {
    const form = input.closest('form');
    if (!form) return;

    const messageEl = document.querySelector('[data-shipwait-message]');
    const submitBtn = form.querySelector("button[type='submit']");
    const originalText = submitBtn?.textContent || 'Submit';

    function showMessage(msg) {
      if (messageEl) messageEl.textContent = msg;
      else alert(msg);
      dispatchShipwaitEvent('shipwait:message', { projectId, message: msg });
    }

    function setLoading(loading) {
      input.disabled = loading;
      if (submitBtn) {
        submitBtn.disabled = loading;
        submitBtn.textContent = loading ? `${originalText}...` : originalText;
      }
      dispatchShipwaitEvent('shipwait:loading', { projectId, loading });
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = input.value.trim();
      dispatchShipwaitEvent('shipwait:submit', { projectId, email });

      if (!email) {
        showMessage('Please enter your email.');
        dispatchShipwaitEvent('shipwait:error', { projectId, error: 'ValidationError', message: 'Email required' });
        return;
      }

      setLoading(true);
      try {
        const behavior = await fetchBehavior();
        const type = behavior?.behavior_type || 'do_nothing';
        const payload = type === 'redirect' ? behavior.redirect : behavior.message;

        // Submit lead
        const res = await fetch(`${baseUrl}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, projectId }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(async _ => ({ message: await res.text() }));
          throw new Error(errData.message || 'Server error');
        }

        dispatchShipwaitEvent('shipwait:success', { projectId, email, behaviorType: type, payload });

        // Handle behavior
        if (type === 'redirect' && payload) {
          dispatchShipwaitEvent('shipwait:redirect', { projectId, url: payload });
          return void (window.location.href = payload);
        }
        if (type === 'show_message' && payload) {
          showMessage(payload);
        }

        input.value = '';
      } catch (err) {
        const message = err.message || 'Server error';
        showMessage(message);
        dispatchShipwaitEvent('shipwait:error', { projectId, error: err.constructor.name, message });
      } finally {
        setLoading(false);
      }
    });
  }

  /**
   * Observe DOM for dynamic addition of input[data-shipwait]
   */
  const observer = new MutationObserver((mutations, obs) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        const input = node.matches("input[data-shipwait]")
          ? node
          : node.querySelector("input[data-shipwait]");
        if (input) {
          attachHandler(input);
          obs.disconnect();
          return;
        }
      }
    }
  });

  // Start observing and initialize on DOMContentLoaded
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => {
    const input = document.querySelector("input[data-shipwait]");
    if (input) attachHandler(input);
  });
})();
