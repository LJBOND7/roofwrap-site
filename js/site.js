(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Sticky nav state ---- */
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (window.scrollY > 30) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Mobile menu ---- */
  const burger = document.getElementById("burger");
  const menu = document.getElementById("mobileMenu");
  const toggleMenu = (open) => {
    const isOpen = open ?? !menu.classList.contains("is-open");
    menu.classList.toggle("is-open", isOpen);
    burger.setAttribute("aria-expanded", String(isOpen));
    menu.setAttribute("aria-hidden", String(!isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  };
  burger.addEventListener("click", () => toggleMenu());
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

  /* ---- Duplicate ticker content for a seamless loop ---- */
  const tickerTrack = document.getElementById("tickerTrack");
  if (tickerTrack) tickerTrack.innerHTML += tickerTrack.innerHTML;

  /* ==============================================================
     Comparison slider core: an invisible range input drives --p
     ============================================================== */
  function wireCompare(root, range, onInput) {
    const setP = (val) => {
      const p = Math.min(100, Math.max(0, val));
      root.style.setProperty("--p", p + "%");
      if (onInput) onInput(p);
      return p;
    };
    range.addEventListener("input", () => setP(parseFloat(range.value)));
    const fromEvent = (e) => {
      const rect = root.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const p = setP((x / rect.width) * 100);
      range.value = p;
    };
    let dragging = false;
    root.addEventListener("pointerdown", (e) => { dragging = true; root.setPointerCapture(e.pointerId); fromEvent(e); });
    root.addEventListener("pointermove", (e) => { if (dragging) fromEvent(e); });
    root.addEventListener("pointerup", () => { dragging = false; });
    root.addEventListener("pointercancel", () => { dragging = false; });
    return setP;
  }

  /* ---- Gallery before/after sliders ---- */
  document.querySelectorAll("[data-ba]").forEach((ba) => {
    const range = ba.querySelector(".ba__range");
    const setP = wireCompare(ba, range, null);
    setP(parseFloat(range.value));
  });

  /* ==============================================================
     Hero "seal" sequence
     ============================================================== */
  const seal = document.getElementById("heroSeal");
  if (seal) {
    const frame = document.getElementById("sealFrame");
    const range = document.getElementById("sealRange");
    const hint = document.getElementById("sealHint");
    const replay = document.getElementById("sealReplay");
    const tagBefore = document.getElementById("tagBefore");
    const tagAfter = document.getElementById("tagAfter");

    const setTags = (p) => {
      tagAfter.classList.toggle("is-active", p <= 45);
      tagAfter.classList.toggle("is-dim", p >= 92);
      tagBefore.classList.toggle("is-dim", p <= 8);
    };
    const setP = wireCompare(frame, range, setTags);

    let animating = false;
    let rafId = 0;

    const animateTo = (from, to, dur, done) => {
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const p = from + (to - from) * eased;
        range.value = p;
        setP(p);
        if (t < 1) rafId = requestAnimationFrame(step);
        else if (done) done();
      };
      rafId = requestAnimationFrame(step);
    };

    const finish = () => {
      seal.classList.remove("is-wiping", "is-dropping");
      seal.classList.add("is-ready");
      animating = false;
      hint.textContent = "Drag to compare before and after";
    };

    const runSequence = () => {
      if (animating) return;
      animating = true;
      cancelAnimationFrame(rafId);
      seal.classList.remove("is-ready");
      hint.textContent = "Wrapping the roof…";
      setP(100);
      range.value = 100;
      if (reducedMotion) { setP(50); range.value = 50; finish(); return; }
      seal.classList.add("is-dropping");
      setTimeout(() => {
        seal.classList.add("is-wiping");
        animateTo(100, 0, 2100, () => {
          setTimeout(() => {
            seal.classList.remove("is-wiping", "is-dropping");
            animateTo(0, 38, 750, finish);
          }, 600);
        });
      }, 1250);
    };

    const afterImg = seal.querySelector(".seal__after");
    const armed = () => {
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) { io.disconnect(); setTimeout(runSequence, 500); }
          });
        }, { threshold: 0.4 });
        io.observe(seal);
      } else { setTimeout(runSequence, 800); }
    };
    if (afterImg.complete) armed();
    else afterImg.addEventListener("load", armed, { once: true });

    replay.addEventListener("click", runSequence);
    frame.addEventListener("pointerdown", () => {
      if (!animating) return;
      cancelAnimationFrame(rafId);
      finish();
    });
  }

  /* ---- Scroll reveal ---- */
  const revealTargets = document.querySelectorAll(
    ".problem__sticky, .vs, .step, .pcard, .stat, .tile__visual, .tile__copy, .ba-item, .gal, .insurance__points li, .qa, .contact__copy, .contact__form"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-in"));
  }

  /* ---- Count-up stats ---- */
  const counters = document.querySelectorAll(".stat__num[data-count]");
  const runCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const dur = 1100;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toString();
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toString();
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => co.observe(el));
  }

  /* ---- FAQ: close the others when one opens ---- */
  const qas = document.querySelectorAll(".qa");
  qas.forEach((qa) => {
    qa.addEventListener("toggle", () => {
      if (qa.open) qas.forEach((other) => { if (other !== qa) other.open = false; });
    });
  });

  /* ---- Contact form: mailto fallback so it works on any static host ---- */
  const form = document.getElementById("assessmentForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = (id) => (document.getElementById(id)?.value || "").trim();
      const subject = `RoofWrap request: ${v("project") || "new residential roof"}`;
      const body =
        `Name: ${v("name")}\n` +
        `Address / property: ${v("project")}\n` +
        `Roof type: ${v("role")}\n` +
        `Phone: ${v("phone")}\n` +
        `Email: ${v("email")}\n\n` +
        `Damage & timeline:\n${v("message")}\n`;
      const note = form.querySelector(".form-note");
      if (note) {
        note.textContent = "Opening your email to send. If nothing opens, email office@roofwrap.com.";
        note.classList.add("is-ok");
      }
      window.location.href =
        `mailto:office@roofwrap.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
})();
