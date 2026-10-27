/* COCOWIDE v5 – small script. No tracking, no external calls
   (the optional YouTube embed is only requested after the visitor presses play). */
(function () {
  "use strict";
  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canModal = typeof HTMLDialogElement === "function";

  /* nav: scrolled state, mobile toggle, solutions dropdown */
  var nav = $("[data-nav]");
  var onScroll = function () { if (nav) nav.classList.toggle("scrolled", window.scrollY > 20); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var toggle = $("[data-nav-toggle]");
  var links = $("[data-nav-links]");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$("a", links).forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); });
    });
  }
  $$(".has-dd").forEach(function (li) {
    var b = $(".dd-btn", li);
    b.addEventListener("click", function () {
      var o = li.classList.toggle("open");
      b.setAttribute("aria-expanded", String(o));
    });
  });
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    $$(".has-dd.open").forEach(function (li) { li.classList.remove("open"); $(".dd-btn", li).setAttribute("aria-expanded", "false"); });
  });
  doc.addEventListener("click", function (e) {
    $$(".has-dd.open").forEach(function (li) { if (!li.contains(e.target)) li.classList.remove("open"); });
  });

  /* reveal on scroll */
  var rv = $$(".reveal");
  if (rv.length) {
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
      rv.forEach(function (el) { io.observe(el); });
    } else {
      rv.forEach(function (el) { el.classList.add("in"); });
    }
  }

  /* home hero: titles + fallback photos cycle automatically */
  var hero = $("[data-hero]");
  if (hero) {
    var slides = $$(".hero-slide", hero);
    var steps = $$("[data-step]", hero);
    var tagline = $("[data-tagline]", hero);
    var cur = 0, timer = null;
    var go = function (i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle("on", n === cur); });
      steps.forEach(function (s, n) { s.classList.toggle("on", n === cur); s.setAttribute("aria-pressed", String(n === cur)); });
      if (tagline) tagline.textContent = steps[cur].getAttribute("data-title");
    };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    var start = function () { stop(); timer = setInterval(function () { go(cur + 1); }, 6000); };
    steps.forEach(function (s, n) { s.addEventListener("click", function () { go(n); start(); }); });
    /* hero background video: muted, looping, no controls. It is revealed only once YouTube reports
       that it is playing; until then (and if it errors or is blocked) the photos stay visible. */
    var vlayer = $(".hero-video", hero);
    if (vlayer) {
      var vf = null;
      window.cwVideo = { state: "idle" };
      var fit = function () {
        if (!vf) return;
        var w = hero.clientWidth, h = hero.clientHeight, vw = Math.max(w, h * 16 / 9) * 1.18;
        vf.style.width = vw + "px"; vf.style.height = (vw * 9 / 16) + "px";
      };
      var drop = function (why) {
        window.cwVideo.state = why;
        vlayer.classList.remove("on");
        if (vf) { vf.remove(); vf = null; }
      };
      var onMsg = function (e) {
        if (!vf || e.source !== vf.contentWindow) return;
        var d = e.data;
        if (typeof d === "string") { try { d = JSON.parse(d); } catch (x) { return; } }
        if (!d) return;
        if (d.event === "onReady") {
          vf.contentWindow.postMessage(JSON.stringify({ event: "command", func: "mute", args: [] }), "*");
          vf.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
        } else if (d.event === "onError") {
          drop("error " + (d.info !== undefined ? d.info : ""));
        } else if (d.event === "onStateChange" || (d.event === "infoDelivery" && d.info && d.info.playerState !== undefined)) {
          var st = d.event === "onStateChange" ? d.info : d.info.playerState;
          window.cwVideo.state = "ytstate " + st;
          if (st === 1) vlayer.classList.add("on");
        }
      };
      var mount = function () {
        var id = vlayer.getAttribute("data-yt");
        var f = doc.createElement("iframe");
        f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&mute=1&loop=1&playlist=" + id +
          "&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&enablejsapi=1" +
          "&origin=" + encodeURIComponent(location.origin);
        f.title = "";
        f.setAttribute("aria-hidden", "true");
        f.tabIndex = -1;
        f.allow = "autoplay; encrypted-media";
        f.referrerPolicy = "strict-origin-when-cross-origin";
        vf = f; fit();
        f.addEventListener("load", function () {
          window.cwVideo.state = "loaded";
          var hello = function () { if (vf) vf.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); };
          hello(); setTimeout(hello, 600); setTimeout(hello, 1800);
          // nothing reported within 12 s -> keep the photos
          setTimeout(function () { if (vf && !vlayer.classList.contains("on")) drop("timeout"); }, 12000);
        });
        vlayer.appendChild(f);
        window.addEventListener("resize", fit);
      };
      window.addEventListener("message", onMsg);
      if (doc.readyState === "complete") mount(); else window.addEventListener("load", mount);
    }
    doc.addEventListener("visibilitychange", function () { if (doc.hidden) stop(); else start(); });
    go(0);
    start();
  }

  /* lightbox */
  var lb = $("#lightbox");
  if (lb && canModal) {
    var stage = $(".lb-stage", lb), count = $(".lb-count", lb);
    var group = [], pos = 0;
    var show = function () {
      var a = group[pos]; if (!a) return;
      var img = doc.createElement("img");
      img.alt = a.getAttribute("data-alt") || "";
      img.src = a.getAttribute("href");
      stage.textContent = ""; stage.appendChild(img);
      count.textContent = group.length > 1 ? (pos + 1) + " / " + group.length : "";
      $$(".lb-prev, .lb-next", lb).forEach(function (b) { b.hidden = group.length < 2; });
    };
    var step = function (d) { pos = (pos + d + group.length) % group.length; show(); };
    var close = function () { stage.textContent = ""; if (lb.open) lb.close(); };
    $$("a[data-lightbox]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var g = a.getAttribute("data-lightbox");
        group = $$('a[data-lightbox="' + g + '"]').filter(function (x) { return !x.closest("li[hidden]"); });
        pos = group.indexOf(a); show(); lb.showModal();
      });
    });
    $(".lb-close", lb).addEventListener("click", close);
    $(".lb-prev", lb).addEventListener("click", function () { step(-1); });
    $(".lb-next", lb).addEventListener("click", function () { step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target === stage) close(); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" && group.length > 1) step(-1);
      if (e.key === "ArrowRight" && group.length > 1) step(1);
    });
    lb.addEventListener("close", function () { stage.textContent = ""; });
  }

  /* gallery filter + load more */
  var grid = $("[data-gallery]");
  if (grid) {
    var items = $$("li", grid), pills = $$(".pill[data-filter]"), more = $(".more");
    var PAGE = 12, limit = PAGE, cur2 = "*";
    var render = function () {
      var shown = 0, total = 0;
      items.forEach(function (li) {
        var m = cur2 === "*" || li.getAttribute("data-cat") === cur2;
        if (m) total++;
        var v = m && shown < limit; if (v) shown++;
        li.hidden = !v;
      });
      if (more) more.hidden = shown >= total;
    };
    pills.forEach(function (p) {
      p.addEventListener("click", function () {
        cur2 = p.getAttribute("data-filter"); limit = PAGE;
        pills.forEach(function (x) { x.setAttribute("aria-pressed", String(x === p)); });
        render();
      });
    });
    if (more) $("button", more).addEventListener("click", function () { limit += PAGE; render(); });
    render();
  }

  /* reviews: the line moves by CSS and stops while the mouse is on a card; dialog for the form */
  var marquee = $("[data-marquee]");
  if (marquee) {
    // the moving line stops only while the mouse is on a review card
    marquee.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(".rev-card")) marquee.classList.add("hold");
    });
    marquee.addEventListener("mouseout", function (e) {
      var to = e.relatedTarget;
      if (!to || !to.closest || !to.closest(".rev-card")) marquee.classList.remove("hold");
    });
    marquee.addEventListener("mouseleave", function () { marquee.classList.remove("hold"); });
  }
  var revDialog = $("#review-dialog");
  var openRev = function () {
    if (!revDialog) return;
    if (canModal && typeof revDialog.showModal === "function") { if (!revDialog.open) revDialog.showModal(); }
    else revDialog.setAttribute("open", "");
  };
  if (revDialog) {
    $$("[data-review-open]").forEach(function (b) { b.addEventListener("click", openRev); });
    $$("[data-review-close]", revDialog).forEach(function (b) {
      b.addEventListener("click", function () { if (revDialog.close) revDialog.close(); else revDialog.removeAttribute("open"); });
    });
    revDialog.addEventListener("click", function (e) { if (e.target === revDialog && revDialog.close) revDialog.close(); });
  }

  /* reviews: submit form (stored as pending until approved in the admin) */
  var rform = $("[data-review-form]");
  if (rform) {
    var rnote = $("[data-review-note]", rform);
    var say = function (msg, ok) {
      if (!rnote) return;
      rnote.hidden = false;
      rnote.textContent = msg;
      rnote.style.background = ok ? "rgba(123,179,26,.18)" : "rgba(220,80,60,.18)";
      rnote.style.borderColor = ok ? "var(--lime)" : "#dc503c";
      rnote.focus();
    };
    var q = /[?&]review=(ok|err)/.exec(location.search);
    if (q) { openRev(); say(q[1] === "ok" ? "Thank you! Your review was received and will appear once it has been approved." : "Sorry, your review could not be sent. Please check the form and try again.", q[1] === "ok"); }
    rform.addEventListener("submit", function (e) {
      if (document.documentElement.hasAttribute("data-static-preview")) {
        e.preventDefault();
        if (!rform.reportValidity()) return;
        say("Preview only: reviews are not collected in this preview, so nothing has been sent.", true);
        return;
      }
      if (!window.fetch || !window.FormData) return;
      e.preventDefault();
      if (!rform.reportValidity()) return;
      var btn = $("button[type=submit]", rform);
      if (btn) btn.disabled = true;
      fetch(rform.action, { method: "POST", body: new FormData(rform), headers: { Accept: "application/json", "X-Requested-With": "fetch" } })
        .then(function (r) { return r.json().catch(function () { return { ok: false, message: "Sorry, something went wrong. Please try again." }; }); })
        .then(function (d) { say(d.message, !!d.ok); if (d.ok) { rform.reset(); } })
        .catch(function () { say("Sorry, we could not reach the server. Please try again.", false); })
        .then(function () { if (btn) btn.disabled = false; });
    });
  }

  /* contact form: never submits anywhere */
  var form = $("[data-contact-form]");
  if (form) {
    var note = $(".form-note", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (note) { note.hidden = false; note.focus(); }
    });
  }
})();
