/* ==========================================================================
   Redline Security — Interactions
   Scroll progress, reveal-on-scroll, animated counters, nav state,
   mobile menu, light/dark theme toggle, service modal, demo scan simulator,
   review submission + star rating, video intro player, and form handling.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Theme toggle (light <-> dark) ---------------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  function currentTheme(){
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function reflectToggleState(theme){
    if (!themeToggle) return;
    const isDark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  reflectToggleState(currentTheme());

  function applyTheme(theme, originEvent){
    const next = theme === 'dark' ? 'dark' : 'light';

    const doSwap = () => {
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('redline-theme', next); } catch(e) {}
      reflectToggleState(next);
    };

    const canAnimate = !prefersReducedMotion
      && typeof document.startViewTransition === 'function'
      && originEvent;

    if (canAnimate) {
      const x = originEvent.clientX;
      const y = originEvent.clientY;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(() => doSwap());
      transition.ready.then(() => {
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`
            ]
          },
          {
            duration: 620,
            easing: 'cubic-bezier(.22,.85,.32,1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      }).catch(() => {});
    } else {
      doSwap();
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', e);
    });
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener?.('change', (e) => {
    let saved = null;
    try { saved = localStorage.getItem('redline-theme'); } catch(err) {}
    if (!saved) applyTheme(e.matches ? 'dark' : 'light');
  });

  /* ---------------- Scroll progress bar ---------------- */
  const progressBar = document.getElementById('scrollProgress');
  const header = document.getElementById('siteHeader');

  function updateOnScroll(){
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
    if (header) header.classList.toggle('scrolled', scrollTop > 8);
    const backToTop = document.getElementById('backToTop');
    if (backToTop) backToTop.classList.toggle('visible', scrollTop > 480);
  }
  window.addEventListener('scroll', updateOnScroll, { passive: true });
  updateOnScroll();

  /* ---------------- Mobile menu ---------------- */
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');

  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(isOpen));
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Active nav link on scroll ---------------- */
  // NOTE: Removed the IntersectionObserver that automatically toggled active classes.
  // Each page now sets the active link statically in its HTML, so the observer is no longer needed.

  /* ---------------- Reveal-on-scroll (also covers dynamically-added nodes) ---------------- */
  let revealObserver = null;
  function observeReveals(nodeList){
    const els = Array.from(nodeList);
    if (!els.length) return;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
            setTimeout(() => el.classList.add('is-visible'), delay);
            revealObserver.unobserve(el);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    }
    els.forEach(el => revealObserver.observe(el));
  }
  observeReveals(document.querySelectorAll('.reveal'));

  /* ---------------- Animated stat counters ---------------- */
  const statEls = document.querySelectorAll('.stat-num[data-count]');

  function animateCount(el){
    const target = parseFloat(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const decimals = parseInt(el.getAttribute('data-decimal') || '0', 10);
    const duration = 1400;
    const start = performance.now();

    function tick(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(tick);
  }

  if (statEls.length) {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      statEls.forEach(el => {
        const target = parseFloat(el.getAttribute('data-count'));
        const decimals = parseInt(el.getAttribute('data-decimal') || '0', 10);
        el.textContent = target.toFixed(decimals) + (el.getAttribute('data-suffix') || '');
      });
    } else {
      const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      statEls.forEach(el => statObserver.observe(el));
    }
  }

  /* ---------------- Back to top ---------------- */
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------------- Shared field validator (used by contact + review forms) ---------------- */
  function validateField(input){
    const field = input.closest('.field');
    if (!field) return true;
    let valid = true;
    if (input.hasAttribute('required') && !input.value.trim()) valid = false;
    if (input.type === 'email' && input.value.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) valid = false;
    }
    field.classList.toggle('invalid', !valid);
    return valid;
  }

  /* ---------------- Service info modal ---------------- */
  const SERVICES = {
    pentest: {
      tag: 'ASSESSMENT TRACK', icon: 'icon-network',
      title: 'Penetration Testing',
      desc: 'Manual, adversary-style testing against the systems your business actually depends on — networks, web apps, APIs, and cloud config, tested the way a real attacker would approach them.',
      list: ['Network & infrastructure pentest', 'Web & API application testing', 'Cloud configuration review', 'Authorized social engineering', 'Red team simulation']
    },
    training: {
      tag: 'TRAINING TRACK', icon: 'icon-users',
      title: 'Offensive Security Training',
      desc: 'Cohort-based and in-house training that turns your engineers into the first line of defense, taught by people who test in production, not just in slides.',
      list: ['Ethical hacking bootcamp', 'OSCP / CEH exam preparation', 'Corporate security awareness', 'Live-fire lab environments', 'Secure code review workshops']
    },
    incident: {
      tag: 'INCIDENT RESPONSE', icon: 'icon-flag',
      title: 'Incident Response',
      desc: 'When something has already gone wrong, we help you contain it, understand it, and close the door it came through — with a clear timeline for stakeholders and regulators.',
      list: ['24/7 rapid-response triage', 'Forensic timeline reconstruction', 'Containment & eradication support', 'Post-incident hardening plan']
    },
    compliance: {
      tag: 'COMPLIANCE & AUDIT', icon: 'icon-doc',
      title: 'Compliance & Audit',
      desc: 'Evidence-ready testing mapped directly to the controls your auditor will ask about, so the same engagement covers your security and your paperwork.',
      list: ['SOC 2 Type I & II readiness', 'ISO 27001 control testing', 'PCI-DSS scoped assessments', 'Audit-ready evidence packages']
    },
    cloud: {
      tag: 'CLOUD SECURITY', icon: 'icon-cloud',
      title: 'Cloud Security Review',
      desc: 'A structured review of identity, network, and workload configuration across your cloud estate, focused on the misconfigurations that actually get exploited.',
      list: ['IAM & privilege review', 'Network segmentation & exposure', 'Workload & container hardening', 'AWS, Azure, and GCP support']
    },
    vciso: {
      tag: 'ADVISORY', icon: 'icon-users',
      title: 'vCISO Advisory',
      desc: 'Fractional security leadership for teams that need direction — board reporting, roadmap prioritization, and vendor oversight — without a full-time hire.',
      list: ['Security roadmap & prioritization', 'Board & investor reporting support', 'Vendor & tooling review', 'On-call advisory hours']
    },
    room: {
      tag: 'SPACE FOR HIRE', icon: 'icon-building',
      title: 'Cyber Range — Room Hire',
      desc: 'Our fitted training room is available to hire for private workshops, CTFs, and vendor-led sessions, with an isolated lab network and a briefing screen ready to go.',
      list: ['Up to 12 seats, isolated lab network', 'Half-day, full-day, and multi-day rates', 'Optional Redline facilitator on request', 'Central location, easy transit access']
    }
  };

  const modal = document.getElementById('serviceModal');
  const modalIcon = document.getElementById('modalIcon');
  const modalTag = document.getElementById('modalTag');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalList = document.getElementById('modalList');
  const modalClose = document.getElementById('modalClose');
  let lastFocused = null;

  function openModal(key, triggerEl){
    const data = SERVICES[key];
    if (!modal || !data) return;
    modalIcon.querySelector('use').setAttribute('href', '#' + data.icon);
    modalTag.textContent = data.tag;
    modalTitle.textContent = data.title;
    modalDesc.textContent = data.desc;
    modalList.innerHTML = data.list.map(item => `<li>${item}</li>`).join('');
    lastFocused = triggerEl || document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => modalClose?.focus(), 50);
  }

  function closeModal(){
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('[data-modal-trigger]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.getAttribute('data-service'), btn));
  });
  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) closeModal();
  });

  /* ---------------- Demo scan simulator ---------------- */
  const demoRunBtn = document.getElementById('demoRunBtn');
  const demoTerminal = document.getElementById('demoTerminal');
  const demoStatus = document.getElementById('demoStatus');
  const demoProgressFill = document.getElementById('demoProgressFill');

  const DEMO_FINDINGS = [
    { sev: 'INFO', cls: 'sev-info', text: 'Enumerating open services on staging.demo-env…' },
    { sev: 'SEARCHING..', cls: 'sev-med', text: 'TLS config allows a deprecated cipher suite on port 443.' },
    { sev: 'HIGH', cls: 'sev-high', text: 'Exposed internal API endpoint returns verbose stack traces.' },
    { sev: 'INFO-FETCHED', cls: 'sev-crit', text: 'Auth token does not expire — session replay possible.' },
    { sev: 'HACKED', cls: 'sev-info', text: 'Scan complete. 4 findings ready and Hacked.' }
  ];

  let demoRunning = false;
  function runDemoScan(){
    if (demoRunning || !demoTerminal) return;
    demoRunning = true;
    demoRunBtn.disabled = true;
    demoStatus.textContent = 'RUNNING';
    demoStatus.className = 'demo-status running';
    demoTerminal.innerHTML = '';
    demoProgressFill.style.width = '0%';

    DEMO_FINDINGS.forEach((f, i) => {
      setTimeout(() => {
        const line = document.createElement('p');
        line.className = 'demo-line';
        line.innerHTML = `<span class="sev ${f.cls}">${f.sev}</span><span>${f.text}</span>`;
        demoTerminal.appendChild(line);
        demoProgressFill.style.width = Math.round(((i + 1) / DEMO_FINDINGS.length) * 100) + '%';

        if (i === DEMO_FINDINGS.length - 1) {
          demoStatus.textContent = 'COMPLETE';
          demoStatus.className = 'demo-status done';
          demoRunning = false;
          demoRunBtn.disabled = false;
        }
      }, i * (prefersReducedMotion ? 0 : 900));
    });
  }
  demoRunBtn?.addEventListener('click', runDemoScan);

  /* ---------------- Intro video play button ---------------- */
  const introVideo = document.getElementById('introVideo');
  const videoPlayBtn = document.getElementById('videoPlayBtn');
  if (introVideo && videoPlayBtn) {
    videoPlayBtn.addEventListener('click', () => {
      introVideo.setAttribute('controls', '');
      introVideo.play().catch(() => {});
    });
    introVideo.addEventListener('play', () => videoPlayBtn.classList.add('playing'));
    introVideo.addEventListener('pause', () => videoPlayBtn.classList.remove('playing'));
    introVideo.addEventListener('ended', () => videoPlayBtn.classList.remove('playing'));
  }

  /* ---------------- Reviews: star rating + submission + list ---------------- */
  const REVIEWS_KEY = 'redline-reviews';
  const reviewForm = document.getElementById('review-form');
  const reviewList = document.getElementById('reviewList');
  const reviewCount = document.getElementById('reviewCount');
  const starRatingWrap = document.getElementById('starRating');
  const ratingError = document.getElementById('ratingError');
  const reviewSuccess = document.getElementById('review-success');

  const SEED_REVIEWS = [
    { name: 'Priya N.', email: 'priya.nair@gmail.com', rating: 5, date: '2026-06-18', text: 'The re-test came back clean and the whole process felt genuinely collaborative, not adversarial.' },
    { name: 'Marcus T.', email: 'marcus.t@gmail.com', rating: 5, date: '2026-05-02', text: 'Our engineers still reference the bootcamp material months later. Excellent trainers.' },
    { name: 'Alina K.', email: 'alina.k@gmail.com', rating: 4, date: '2026-03-27', text: 'Thorough report, clear remediation steps. Scheduling took a little longer than expected.' }
  ];

  function maskEmail(email){
    const parts = String(email).split('@');
    if (parts.length !== 2) return '****@gmail.com';
    const local = parts[0];
    const domain = parts[1];
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${'*'.repeat(4)}@${domain}`;
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function loadReviews(){
    try {
      const raw = localStorage.getItem(REVIEWS_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return SEED_REVIEWS;
  }

  function saveReviews(reviews){
    try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); } catch(e) {}
  }

  function formatDate(iso){
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function starsMarkup(rating){
    let out = '';
    for (let i = 1; i <= 5; i++) {
      out += `<svg class="${i <= rating ? 'filled' : ''}"><use href="#icon-star"/></svg>`;
    }
    return out;
  }

  function renderReviews(){
    if (!reviewList) return;
    const reviews = loadReviews().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (reviewCount) reviewCount.textContent = reviews.length + (reviews.length === 1 ? ' review' : ' reviews');
    if (!reviews.length) {
      reviewList.innerHTML = '<p class="review-empty">No reviews yet — be the first to rate your engagement.</p>';
      return;
    }
    reviewList.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="review-card-top">
          <div class="review-card-stars">${starsMarkup(r.rating)}</div>
          <span class="review-card-date">${formatDate(r.date)}</span>
        </div>
        <p class="review-text">${escapeHtml(r.text)}</p>
        <div class="review-card-meta"><strong>${escapeHtml(r.name)}</strong><span>${maskEmail(r.email)}</span></div>
      </div>
    `).join('');
  }

  renderReviews();

  if (reviewForm) {
    reviewForm.addEventListener('submit', function(e){
      e.preventDefault();

      const nameInput = document.getElementById('reviewer-name');
      const emailInput = document.getElementById('reviewer-email');
      const commentInput = document.getElementById('reviewer-comment');
      const ratingInput = reviewForm.querySelector('input[name="rating"]:checked');

      let valid = true;
      [nameInput, emailInput, commentInput].forEach(input => {
        if (!validateField(input)) valid = false;
      });
      if (!ratingInput) {
        starRatingWrap.classList.add('invalid');
        if (ratingError) ratingError.style.display = 'block';
        valid = false;
      } else {
        starRatingWrap.classList.remove('invalid');
        if (ratingError) ratingError.style.display = 'none';
      }

      if (!valid) return;

      const reviews = loadReviews();
      reviews.push({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        rating: parseInt(ratingInput.value, 10),
        date: new Date().toISOString().slice(0, 10),
        text: commentInput.value.trim()
      });
      saveReviews(reviews);
      renderReviews();

      const submitBtn = reviewForm.querySelector('.submit-btn');
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        reviewForm.reset();
        starRatingWrap.classList.remove('invalid');
        if (reviewSuccess) {
          reviewSuccess.classList.add('show');
          setTimeout(() => reviewSuccess.classList.remove('show'), 3500);
        }
      }, 600);
    });
  }

  /* ---------------- Contact form validation + demo submit ---------------- */
  const form = document.getElementById('contact-form');
  const success = document.getElementById('form-success');

  if (form) {
    form.querySelectorAll('input[required], input[type="email"]').forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.closest('.field')?.classList.contains('invalid')) validateField(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const requiredInputs = form.querySelectorAll('input[required], input[type="email"]');
      let allValid = true;
      requiredInputs.forEach(input => {
        if (!validateField(input)) allValid = false;
      });

      if (!allValid) {
        const firstInvalid = form.querySelector('.field.invalid input');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const submitBtn = form.querySelector('.submit-btn');
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      // Simulated network delay for a demo submit. Replace with a real
      // fetch() call to your backend or form service.
      setTimeout(() => {
        submitBtn.classList.remove('loading');
        form.querySelectorAll('input, textarea, select, button').forEach(el => el.disabled = true);
        if (success) success.classList.add('show');
      }, 900);
    });
  }

});