/* ==========================================================================
   Redline Security — Interactions
   Scroll progress, reveal-on-scroll, animated counters, nav state,
   mobile menu, form validation + submit feedback.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const sections = Array.from(document.querySelectorAll('section[id]'));
  const navAnchors = Array.from(document.querySelectorAll('[data-nav]'));

  if (sections.length && navAnchors.length && 'IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navAnchors.forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    sections.forEach(sec => navObserver.observe(sec));
  }

  /* ---------------- Reveal-on-scroll ---------------- */
  const revealEls = document.querySelectorAll('.reveal');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
          setTimeout(() => el.classList.add('is-visible'), delay);
          revealObserver.unobserve(el);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  }

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
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
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

  /* ---------------- Contact form validation + demo submit ---------------- */
  const form = document.getElementById('contact-form');
  const success = document.getElementById('form-success');

  function validateField(input){
    const field = input.closest('.field');
    if (!field) return true;
    let valid = true;

    if (input.hasAttribute('required') && !input.value.trim()) {
      valid = false;
    }
    if (input.type === 'email' && input.value.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(input.value.trim())) valid = false;
    }

    field.classList.toggle('invalid', !valid);
    return valid;
  }

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
