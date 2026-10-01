/*
 * Exact Search Guard storefront script.
 *
 * Fail-open by design: the only time it takes over a search is when the lookup
 * returns a verified exact match inside the time budget. In every other case
 * (no match, timeout, network or parse failure) the original form is submitted
 * unchanged.
 */
(function () {
  "use strict";
  if (window.ExactSearchGuard) return;

  var TIMEOUT_MS = 150;
  var PROXY_PATH = "/apps/exact-search/lookup";
  var MAX_QUERY = 64;
  var PREVIEW_KEY = "esg_preview";
  var BYPASS = "__esgBypass";

  var config = { root: "/", text: {} };
  try {
    var node = document.getElementById("exact-search-guard-config");
    if (node) config = JSON.parse(node.textContent || "{}");
  } catch (e) {
    /* defaults */
  }
  var text = config.text || {};

  function root() {
    var r = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || config.root || "/";
    return r.charAt(r.length - 1) === "/" ? r : r + "/";
  }

  // Mirrors the server's classifier; the server re-checks everything.
  function isEligible(query) {
    var q = String(query).trim();
    if (q.length === 0 || q.length > MAX_QUERY) return false;
    if (!/^[\p{L}\p{N}\s\-_./\\#+:]+$/u.test(q)) return false;
    var tokens = q.split(/\s+/);
    if (tokens.length > 3) return false;
    if (tokens.length > 1) {
      for (var i = 0; i < tokens.length; i++) {
        if (!/\d/.test(tokens[i]) && tokens[i].length > 3) return false;
      }
    }
    return true;
  }

  // Only plain Shopify search forms: GET, action ends in /search, has a q field.
  function searchField(form) {
    if (!form || form.tagName !== "FORM") return null;
    if ((form.getAttribute("method") || "get").toLowerCase() !== "get") return null;
    var path;
    try {
      path = new URL(form.getAttribute("action") || "/search", location.href).pathname;
    } catch (e) {
      return null;
    }
    if (!/\/search\/?$/.test(path)) return null;
    return form.querySelector('input[name="q"]');
  }

  function previewEnabled() {
    try {
      if (new URL(location.href).searchParams.get(PREVIEW_KEY) === "1") {
        sessionStorage.setItem(PREVIEW_KEY, "1");
      }
      return sessionStorage.getItem(PREVIEW_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  // A redirect target must be a product path on this shop; anything else is rejected.
  function safeProductUrl(url) {
    return typeof url === "string" && /^\/products\/[^/?#]+(\?variant=\d+)?$/.test(url);
  }

  function validate(body) {
    if (!body || body.v !== 1) return null;
    if (body.status === "none") return { status: "none" };
    if ((body.status !== "match" && body.status !== "multiple") || !Array.isArray(body.matches)) return null;
    var matches = [];
    for (var i = 0; i < body.matches.length; i++) {
      var m = body.matches[i];
      if (!m || !safeProductUrl(m.url)) return null;
      matches.push({
        url: m.url,
        title: String(m.title || ""),
        variantTitle: String(m.variantTitle || ""),
        inStock: m.inStock !== false,
      });
    }
    if (matches.length === 0) return null;
    if (body.status === "match" && matches.length !== 1) return null;
    return { status: body.status, matches: matches };
  }

  function lookup(query) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, TIMEOUT_MS);

    var url = PROXY_PATH + "?q=" + encodeURIComponent(query) + (previewEnabled() ? "&preview=1" : "");
    var request = fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        return res.json();
      })
      .then(validate);

    // The race also covers environments where abort is unsupported.
    var deadline = new Promise(function (resolve) {
      setTimeout(function () {
        resolve(null);
      }, TIMEOUT_MS);
    });
    return Promise.race([request, deadline])
      .catch(function () {
        return null;
      })
      .then(function (result) {
        clearTimeout(timer);
        return result;
      });
  }

  function submitOriginal(form, submitter) {
    form[BYPASS] = true;
    try {
      if (typeof form.requestSubmit === "function") {
        if (submitter) form.requestSubmit(submitter);
        else form.requestSubmit();
      } else {
        // Older browsers: no submit event fires, so the flag is cleared here.
        form[BYPASS] = false;
        form.submit();
      }
    } catch (e) {
      form[BYPASS] = false;
      form.submit();
    }
  }

  function el(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
  }

  function showChooser(result, onAllResults) {
    var previouslyFocused = document.activeElement;
    var overlay = el("div", "esg-overlay");
    var dialog = el("div", "esg-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "esg-title");

    var title = el("h2", "", text.title || "Several products match this code");
    title.id = "esg-title";
    dialog.appendChild(title);

    var list = el("ul", "esg-list");
    result.matches.forEach(function (m) {
      var li = document.createElement("li");
      var a = el("a", "");
      a.href = root().replace(/\/$/, "") + m.url;
      a.appendChild(document.createTextNode(m.title));
      if (!m.inStock) a.appendChild(el("span", "esg-soldout", text.soldOut || "Sold out"));
      if (m.variantTitle && m.variantTitle !== "Default Title") a.appendChild(el("span", "esg-variant", m.variantTitle));
      li.appendChild(a);
      list.appendChild(li);
    });
    dialog.appendChild(list);

    var actions = el("div", "esg-actions");
    var all = el("button", "", text.allResults || "See all search results");
    all.type = "button";
    var close = el("button", "", text.close || "Close");
    close.type = "button";
    actions.appendChild(all);
    actions.appendChild(close);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);

    function dismiss() {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") dismiss();
    }
    close.addEventListener("click", dismiss);
    all.addEventListener("click", function () {
      dismiss();
      onAllResults();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) dismiss();
    });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    var first = list.querySelector("a");
    if (first) first.focus();
  }

  function onSubmit(event) {
    var form = event.target;
    if (form && form[BYPASS]) {
      form[BYPASS] = false;
      return;
    }
    if (event.defaultPrevented) return;
    var field = searchField(form);
    if (!field) return;
    var query = field.value;
    if (!isEligible(query)) return;

    var submitter = event.submitter || null;
    event.preventDefault();

    lookup(query).then(function (result) {
      if (result && result.status === "match") {
        api.navigate(root().replace(/\/$/, "") + result.matches[0].url);
      } else if (result && result.status === "multiple") {
        showChooser(result, function () {
          submitOriginal(form, submitter);
        });
      } else {
        submitOriginal(form, submitter);
      }
    });
  }

  var api = {
    isEligible: isEligible,
    navigate: function (url) {
      location.assign(url);
    },
  };
  window.ExactSearchGuard = api;

  // Capture phase so the lookup runs before theme handlers that would leave the page.
  document.addEventListener("submit", onSubmit, true);
})();
