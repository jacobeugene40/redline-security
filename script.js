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
      tag: 'PHONE HACkING',
      icon: 'icon-network',
      title: 'Phone Hacking Service',
      desc: 'Remote cell phone hacking via the mobile operator – no physical access, no virus, 100% discreet.',
      image: '/assets/syp.png',
      detailedDesc: `
        <p><strong>How do we do it?</strong></p>
        <p>There are many ways to hack a cell phone, although most of them require physical access to the phone. However, the method that we use can be done remotely, that is: only with the phone number and without physical access, as well as with total security and discretion.</p>
        <p>All cell phones, without exception, constantly connect to the nearest 📡 communication antenna and, thanks to this, they get 📶 signal, which is necessary to make calls or browse the internet. Probably, if you have ever traveled by road or visited a place very far from any city, you have noticed that your phone had no signal. This occurs when there is no antenna nearby to provide coverage, however, in the year 2026, it is normal to have coverage everywhere, even in the world’s larger deserts.</p>
        <p>Our method is to hack the connection. As long as the phone has battery, even if it is switched off, it will be in constant connection with the nearest antenna. What we’ll do is, through the phone number, hack the mobile operator: the company that provides voice and data services to the phone (for example: AT&T). By doing this, we’ll have access to all the antennas so we only have to locate the one with which the phone is currently connected and use it as a backdoor to gain access and total control over the device, and all this without the need to install or send no virus, which means that the cell phone’s performance will never be affected, and that no antivirus will be able to detect the intervention, since everything will be executed from the cell phone’s own network, which is considered “trusted” and it is impossible to detect that it is intervened.</p>
        <p>If by chance, at the time of hacking, the target cell phone is out of coverage or without battery, the work can still be done, but you will have to wait until it has coverage or battery again to be able to access its data. Furthermore, if a person moves or travels and the cell phone connects to different antennas, our service will not be affected, since by attacking the network operator itself, we will be able to follow the cell phone through all the antennas to which it connects.</p>

        <p><strong>What will be obtained?</strong></p>
        <p>Once the requested cell phone has been hacked, all the information within it can be accessed, and when we say everything, we mean literally everything. Below we’ll show you a list with some things are included in this service:</p>
        <ul>
          <li><strong>📞 Calls.</strong> See the calls history. If you are connected to the dashboard when a call occurs, you can hear it in real time. Otherwise, you can listen to the recording at any time.</li> <br>
          <li><strong>💬 SMS and MMS.</strong> Read all the SMS and/or MMS sent and received.</li><br>
          <li><strong>🖼️ Gallery.</strong> Access all the content of the photo and video gallery.</li><br>
          <li><strong>📱 Conversations.</strong> Spy on all conversations from all messaging apps such as: WhatsApp, Messenger, Telegram, Viber, Snapchat, WeChat, Line, Kakao, etc.</li><br>
          <li><strong>🗺️ GPS.</strong> Access the GPS to see the current and historical location on a map.</li><br>
          <li><strong>📱 Social Networks.</strong> Spy on and/or access social network apps such as Facebook, Instagram, TikTok, Twitter, etc.</li><br>
          <li><strong>📧 Email.</strong> Spy on and/or access email apps like Gmail, Outlook, Yahoo, ProtonMail, etc.</li><br>
          <li><strong>❣️ Dating.</strong> Spy on and/or access dating apps like Tinder, Happn, Badoo, OkCupid, etc.</li><br>
          <li><strong>☁️ Cloud.</strong> Access content saved in cloud services such as iCloud, Google Drive, OneDrive, Dropbox, etc.</li><br>
          <li><strong>📷 Camera.</strong> Hiddenly activate the front or back camera and spy on or take photos or videos.</li><br>
          <li><strong>🎤 Microphone.</strong> Hiddenly activate the microphone and listen and/or record any sound in the surroundings.</li><br>
          <li><strong>🛜 Browsers.</strong> View the browsing history in any browser such as Chrome, Firefox, Safari, Opera, etc.</li><br>
          <li><strong>🔑 Keychain.</strong> Access all the saved passwords of all the apps and all the websites used in the cell phone.</li><br>
        </ul>
        <p>You will be able not only to spy, but also to intervene. This means that if you want to send a message from the hacked cell phone, make a call, delete images or information, install or uninstall apps, restore the cell phone to factory mode, or anything else, you can do it.</p>

        <p><strong>Access to information</strong></p>
        <p>To access all the information and spy or do anything you want on the target cell phone, you must log in to your dashboard, which is available 24 hours a day through the following URL: <a href="#">https://dashboard.redline.example</a></p>
        <p>🔑 To log in to the dashboard, you only have to write the target cell phone number and a password that we’ll provide you when delivering the service and that you can change if you wish.</p>
        <p>📅 For period of 6 months, starting to count from the first login, you’ll be able to use the dashboard, without restriction and at any time. If you want to continue using it for longer, you can renew the service for an additional fee. You can renew your service at any time before the expiration date.</p>
        <p>The dashboard is compatible with all type of devices. You can access it from your cell phone, tablet or computer. You only need an internet connection and a browser (Google Chrome, Mozilla Firefox, Safari or any other that you prefer).</p>

        <p><strong>Deleted information</strong></p>
        <p>Many people ask us what happens to data that has been deleted. At this point, it is important to differentiate between before and after our service.</p>
        <ul>
          <li><strong>Before our service</strong> – All data deleted from the cell phone within the last 180 days, may be recovered for an additional fee of 50 US Dollars. If the service were done today, we would be able to recover everything deleted from November 13, 2025 onwards.</li>
          <li><strong>After our service</strong> – All data that is going to be deleted from the cell phone in the future, after our service has been done, won’t affect you at all, since we always keep a copy of all the data, therefore, even if something is deleted on the device, we’ll keep a copy in our system.</li>
        </ul>

        <p><strong>Time of delay</strong></p>
        <p>As soon as your order is received, we’ll reply to you to confirm that we’ve already started working on it, and we’ll give you an order number with which you can track the status of your order in real time through this link: <a href="#">My Order</a>. From that moment on, we’ll delay up to 5 hours (usually less, but this is the worse case scenario) to hack the requested cell phone.</p>

        <p><strong>Payment method</strong></p>
        <p>The one and only payment method we accept is <strong>Bitcoin</strong>. If you have never used bitcoin before or don’t know how it works, you can read a guide where we explain the whole process step by step. To read it, click on the following link: <a href="#">How to pay with Bitcoin</a></p>
        <p><strong>⚠️ Don’t say we didn’t warn you:</strong> If this is your first time using bitcoin, you must have the bitcoins prepared before requesting our service, in order to avoid making us work and then generate problems with the payment. This isn’t just about preventing uncomfortable situations but also out of respect for our time and work: prepare yourself before requesting a service.</p>
        <p><strong>⛔ There are no more payment methods:</strong> If there were, we’d be glad to tell you, but there aren’t. Insistence or questions about it are considered an insult to us and our work.</p>

        <p><strong>Cancel an order</strong></p>
        <p>Once an order has been placed, it won’t be possible to cancel it. If you’re not sure if you really want the service, then don’t order anything yet. Don’t act impulsively and irresponsibly. Relax and think if you really want it. No one is forcing you to place an order. If you do, it will be of your own free will, and you can’t repent later.</p>
        <p>⏱️ There is no deadline for regret: There have been people who write to us after a few minutes of placing an order and consider that the short time that has elapsed is a valid reason to cancel it. It doesn’t matter if you placed your order just a second ago, you can’t cancel it anyway. Instead of placing an order and regret after a few minutes, better take those minutes to think before acting.</p>
        <p>🗒️ This rule also applies to modifications: Double check the cell phone’s number and make sure you send us the correct one. If you make a mistake, that is going to be your problem, and you’ll have to pay for it anyway.</p>

        <p><strong>Last details</strong></p>
        <ul>
          <li>The service is 100% safe and effective. No failure possible.</li>
          <li>It is not possible to customize the service. By hacking the cell phone, everything will be accessed, you can’t reduce the price in exchange for a reduced access.</li>
          <li>If you want to hack two or more cell phones, ask us for discounts.</li>
          <li>If you have any questions, ask them before placing an order, not after.</li>
          <li>If you want to place an order as an intermediary, that is, on behalf of another person, please ask us for special conditions.</li>
          <li>Everything we say here is right and updated. We checked this page for the last time on: March 2026. You don’t need to ask us again or reconfirm anything you have read here.</li>
        </ul>

        <p><strong>✍️ I want to place an order!</strong></p>
        <p><strong>⚠️ Please, make sure you have read everything before requesting a hacking service.</strong> If you have questions or don’t understand something, ask all your questions before placing an order.</p>
        <p>✅ If you have read, understood, and accept our service agreement completely and want to place an order, <a href="../contact/">Contact Us</a> containing all the following 4 points that we mention below:</p>
        <ol>
          <li>Tell us that you want to hire a Hacker for Smartphones Hacking service, whose code is: <strong>03675</strong>.</li>
          <li>Confirm that you read the Service Agreement and that you agree with everything and have no doubts.</li>
          <li>The phone number of the cell phone that you want to hack. You must also tell us which country is the number from.</li>
          <li>Then wait for us to complete the service and get back to you</li>
        </ol>
        <p>📲 After receiving your message, we’ll reply to confirm the start of your order. Remember that once an order has been placed, there is no way to cancel or modify it.</p>
      `,
      list: [
        'Remote hacking via mobile operator (no physical access)',
        'Access to calls, messages, gallery, GPS, social media, emails, and more',
        'Real-time spying and intervention capabilities',
        '6-month dashboard access with renewal option',
        'Deleted data recovery (additional fee)',
        '100% safe and effective'
      ],
      whyChoose: 'Over 21,300+ clients trust us. We are the most reliable and discreet phone hacking service on the internet.'
    },

   training: {
  tag: 'INVESTIGATE CHEATING PARTNER',
  icon: 'icon-compass',               // or icon-flag, icon-chat – your choice
  title: 'Investigate Cheating Partner',
  desc: 'Remote cell phone hacking via the mobile operator – no physical access, no virus, 100% discreet. Ideal for uncovering infidelity and monitoring suspicious activity.',
  image: '/assets/rest.png',         // or '../assets/cheat.png' depending on your path setup
  detailedDesc: `
    <p><strong>💼 How do we do it?</strong></p>
    <p>There are many ways to hack a cell phone, although most of them require physical access to the phone. However, the method that we use can be done remotely, that is: only with the phone number and without physical access, as well as with total security and discretion.</p>
    <p>All cell phones, without exception, constantly connect to the nearest 📡 communication antenna and, thanks to this, they get 📶 signal, which is necessary to make calls or browse the internet.</p>
    <p>Probably, if you have ever traveled by road or visited a place very far from any city, you have noticed that your phone had no signal. This occurs when there is no antenna nearby to provide coverage, however, in the year 2026, it is normal to have coverage everywhere, even in the world’s larger deserts.</p>
    <p>Our method is to hack the connection. As long as the phone has battery, even if it is switched off, it will be in constant connection with the nearest antenna. What we’ll do is, through the phone number, hack the mobile operator: the company that provides voice and data services to the phone (for example: AT&T).</p>
    <p>By doing this, we’ll have access to all the antennas so we only have to locate the one with which the phone is currently connected and use it as a backdoor to gain access and total control over the device, and all this without the need to install or send no virus, which means that the cell phone’s performance will never be affected, and that no antivirus will be able to detect the intervention, since everything will be executed from the cell phone’s own network, which is considered “trusted” and it is impossible to detect that it is intervened.</p>

    <p>If by chance, at the time of hacking, the target cell phone is out of coverage or without battery, the work can still be done, but you’ll have to wait until it has coverage or battery again to be able to access its data. Furthermore, if a person moves or travels and the cell phone connects to different antennas, our service won’t be affected, since by attacking the network operator itself, we’ll be able to follow the cell phone through all the antennas to which it connects.</p>

    <p><strong>📝 What will be obtained?</strong></p>
    <p>Once the requested cell phone has been hacked, all the information within it can be accessed, and when we say everything, we mean literally everything. Below we’ll show you a list with some things are included in this service:</p>
    <ul>
      <li><strong>📞 Calls.</strong> See the calls history. If you are connected to the dashboard when a call occurs, you can hear it in real time. Otherwise, you can listen to the recording at any time.</li>
      <li><strong>💬 SMS and MMS.</strong> Read all the SMS and/or MMS sent and received.</li><br>
      <li><strong>🖼️ Gallery.</strong> Access all the content of the photo and video gallery.</li><br>
      <li><strong>📱 Conversations.</strong> Spy on all conversations from all messaging apps such as: WhatsApp, Messenger, Telegram, Viber, Snapchat, WeChat, Line, Kakao, etc.</li><br>
      <li><strong>🗺️ GPS.</strong> Access the GPS to see the current and historical location on a map.</li><br>
      <li><strong>📱 Social Networks.</strong> Spy on and/or access social network apps such as Facebook, Instagram, TikTok, Twitter, etc.</li><br>
      <li><strong>📧 Email.</strong> Spy on and/or access email apps like Gmail, Outlook, Yahoo, ProtonMail, etc.</li><br>
      <li><strong>❣️ Dating.</strong> Spy on and/or access dating apps like Tinder, Happn, Badoo, OkCupid, etc.</li><br>
      <li><strong>☁️ Cloud.</strong> Access content saved in cloud services such as iCloud, Google Drive, OneDrive, Dropbox, etc.</li><br>
      <li><strong>📷 Camera.</strong> Hiddenly activate the front or back camera and spy on or take photos or videos.</li><br>
      <li><strong>🎤 Microphone.</strong> Hiddenly activate the microphone and listen and/or record any sound in the surroundings.</li><br>
      <li><strong>🛜 Browsers.</strong> View the browsing history in any browser such as Chrome, Firefox, Safari, Opera, etc.</li><br>
      <li><strong>🔑 Keychain.</strong> Access all the saved passwords of all the apps and all the websites used in the cell phone.</li><br>
    </ul>
    <p>You will be able not only to spy, but also to intervene. This means that if you want to send a message from the hacked cell phone, make a call, delete images or information, install or uninstall apps, restore the cell phone to factory mode, or anything else, you can do it.</p>

    <p><strong>🚪 Access to information</strong></p>
    <p>To access all the information and spy or do anything you want on the target cell phone, you must log in to your dashboard, which is available 24 hours a day through the following URL:</p>
    <p>🔑 To log in to the dashboard, you only have to write the target cell phone number and a password that we’ll provide you when delivering the service and that you can change if you wish.</p>
    <p>📅 For period of 6 months, starting to count from the first login, you’ll be able to use the dashboard, without restriction and at any time. If you want to continue using it for longer, you can renew the service for an additional fee. You can renew your service at any time before the expiration date.</p>
    <p>The dashboard is compatible with all type of devices. You can access it from your cell phone, tablet or computer. You only need an internet connection and a browser (Google Chrome, Mozilla Firefox, Safari or any other that you prefer).</p>

    <p><strong>🗑️ Deleted information</strong></p>
    <p>Many people ask us what happens to data that has been deleted. At this point, it is important to differentiate between before and after our service.</p>
    <ul>
      <li><strong>📅 Before our service</strong> – All data deleted from the cell phone within the last 180 days, may be recovered for an additional fee of 50 US Dollars. If the service were done today, we would be able to recover everything deleted from November 13, 2025 onwards.</li>
      <li><strong>💼 After our service</strong> – All data that is going to be deleted from the cell phone in the future, after our service has been done, won’t affect you at all, since we always keep a copy of all the data, therefore, even if something is deleted on the device, we’ll keep a copy in our system.</li>
    </ul>

    <p><strong>⏱️ Time of delay</strong></p>
    <p>As soon as your order is received, we’ll reply to you to confirm that we’ve already started working on it, and we’ll give you an order number with which you can track the status of your order in real time through this link: <a href="#">My Order</a>. From that moment on, we’ll delay up to 5 hours (usually less, but this is the worse case scenario) to hack the requested cell phone.</p>

    <p><strong>💵 Payment method</strong></p>
    <p>The one and only payment method we accept is <strong>Bitcoin</strong>. If you have never used bitcoin before or don’t know how it works, you can read a guide where we explain the whole process step by step. To read it, click on the following link: <a href="#">How to pay with Bitcoin</a></p>
    <p><strong>⚠️ Don’t say we didn’t warn you:</strong> If this is your first time using bitcoin, you must have the bitcoins prepared before requesting our service, in order to avoid making us work and then generate problems with the payment. This isn’t just about preventing uncomfortable situations but also out of respect for our time and work: prepare yourself before requesting a service.</p>
    <p><strong>⛔ There are no more payment methods:</strong> If there were, we’d be glad to tell you, but there aren’t. Insistence or questions about it are considered an insult to us and our work.</p>

    <p><strong>❌ Cancel an order</strong></p>
    <p>Once an order has been placed, it won’t be possible to cancel it. If you’re not sure if you really want the service, then don’t order anything yet. Don’t act impulsively and irresponsibly. Relax and think if you really want it. No one is forcing you to place an order. If you do, it will be of your own free will, and you can’t repent later.</p>
    <p>⏱️ There is no deadline for regret: There have been people who write to us after a few minutes of placing an order and consider that the short time that has elapsed is a valid reason to cancel it. It doesn’t matter if you placed your order just a second ago, you can’t cancel it anyway. Instead of placing an order and regret after a few minutes, better take those minutes to think before acting.</p>
    <p>🗒️ This rule also applies to modifications: Double check the cell phone’s number and make sure you send us the correct one. If you make a mistake, that is going to be your problem, and you’ll have to pay for it anyway.</p>

    <p><strong>➕ Last details</strong></p>
    <ul>
      <li>The service is 100% safe and effective. No failure possible.</li>
      <li>It is not possible to customize the service. By hacking the cell phone, everything will be accessed, you can’t reduce the price in exchange for a reduced access.</li>
      <li>If you want to hack two or more cell phones, ask us for discounts.</li>
      <li>If you have any questions, ask them before placing an order, not after.</li>
      <li>If you want to place an order as an intermediary, that is, on behalf of another person, please ask us for special conditions.</li>
      <li>Everything we say here is right and updated. We checked this page for the last time on: March 2026. You don’t need to ask us again or reconfirm anything you have read here.</li>
    </ul>

    <p><strong>✍️ I want to place an order!</strong></p>
    <p><strong>⚠️ Please, make sure you have read everything before requesting a hacking service.</strong> If you have questions or don’t understand something, ask all your questions before placing an order.</p>
    <p>✅ If you have read, understood, and accept our service agreement completely and want to place an order, <a href="../contact/">Contact Us</a> containing all the following 4 points that we mention below:</p>
    <ol>
      <li>Tell us that you want to hire a Hacker for Smartphones Hacking service, whose code is: <strong>03675</strong>.</li>
      <li>Confirm that you read the Service Agreement and that you agree with everything and have no doubts.</li>
      <li>The phone number of the cell phone that you want to hack. You must also tell us which country is the number from.</li>
      <li>Then wait for us to complete the service and get back to you</li>
    </ol>
    <p>📲 After receiving your message, we’ll reply to confirm the start of your order. Remember that once an order has been placed, there is no way to cancel or modify it.</p>
  `,
  list: [
    'Remote hacking via mobile operator (no physical access)',
    'Access to calls, messages, gallery, GPS, social media, emails, and more',
    'Real-time spying and intervention capabilities',
    '6-month dashboard access with renewal option',
    'Deleted data recovery (additional fee)',
    '100% safe and effective'
  ],
  whyChoose: 'We are trusted by over 21,300 clients worldwide for our discretion, reliability, and unmatched success rate in exposing infidelity and securing digital evidence.'
},
incident: {
  tag: 'SOCIAL MEDIA HACKING',
  icon: 'icon-compass',
  title: 'Social Media Hacking',
  desc: 'Recover your social media accounts, spy on someone else, or enhance your digital security. Facebook, WhatsApp, Instagram, Snapchat hacking services available.',
  image: '/assets/media.png',
  detailedDesc: `
    <p><strong>Looking to recover your social media accounts or connect to the dark web safely?</strong> TrinityCEH is a black hat hacker service that specializes in resolving social media challenges and enhancing online security. Our team excels in identifying digital vulnerabilities and provides premium services to help individuals regain control of their accounts and strengthen their digital safety.</p>
    
    <p>We also offer security consultations for businesses and individuals, featuring intrusion detection systems and ethical penetration testing, all performed with your full consent.</p>

    <p><strong>📱 Facebook Hacking</strong></p>
    <p>Hack into any Facebook account. It can be done only with the username or profile link. Recover your own account or spy on someone else.</p>

    <p><strong>💬 WhatsApp Hacking</strong></p>
    <p>Hack a WhatsApp remotely, just with its number and spy on all conversations, voice, images, etc. with discretion and/or take control of the number.</p>

    <p><strong>📸 Instagram Hacking</strong></p>
    <p>Hack into any Instagram account. Get that username that you want so hard. Spy on someone else. Recover your lost or hacked Instagram.</p>

    <p><strong>👻 Snapchat Hacking</strong></p>
    <p>Hack a Snapchat account remotely, just with its username and spy on all conversations, voice, images, etc. with discretion and/or take control of the snapchat account.</p>

    <p><strong>🔒 What we offer:</strong></p>
    <ul>
      <li>Facebook account recovery and monitoring</li>
      <li>WhatsApp conversation spying and number takeover</li>
      <li>Instagram account recovery and monitoring</li>
      <li>Snapchat spying and account takeover</li>
      <li>Digital security consultations and penetration testing</li>
      <li>Intrusion detection systems</li>
      <li>Full consent and confidentiality guaranteed</li>
    </ul>
  `,
  list: [
    'Facebook account recovery and monitoring',
    'WhatsApp conversation spying and number takeover',
    'Instagram account recovery and monitoring',
    'Snapchat spying and account takeover',
    'Digital security consultations and penetration testing'
  ],
  whyChoose: 'We are trusted by over 21,300 clients worldwide for our discretion, reliability, and unmatched success rate in social media recovery and hacking services.'
},
   compliance: {
  tag: 'WEBSITES HACKING',
  icon: 'icon-code',
  title: 'Websites Hacking',
  desc: 'Full server-level website hacking via SSH – complete administration access, not just a login form. Requires technical knowledge.',
  image: '/assets/pen.png',
  detailedDesc: `
    <p><strong>🌐 Websites Hacking</strong></p>
    <p>Below you can read complete and detailed information about our service to hack a website. Please read everything carefully and contact us if you have any questions. Don't order any of our hacking services without read and understand everything about such service in the very first place.</p>

    <p><strong>🧠 Knowledge</strong></p>
    <p>This is not a hacking service intended for novices or amateurs. After we hack a website and get its administration credentials, the access and administration of the web server is made through console, by executing SSH commands. If you don’t have technical knowledge, you’ll receive the administration data from the website but you won’t know what to do with it or how to login. Many people expect to find a nice control panel with options and menus to click on. If this is what you expect, then you are wrong. The service we offer is to hack a web server completely, not a specific login form from a random page but the server itself. Knowledge of SSH is required.</p>

    <p><strong>⏱️ Time of delay</strong></p>
    <p>As soon as your order is received, we’ll reply to you to confirm that we’ve already started working on it, and we’ll give you an order number with which you can track the status of your order in real time through this link: <a href="#">My Order</a>. From that moment on, we’ll delay up to 5 hours (usually less, but this is the worse case scenario) to hack the requested website.</p>

    <p><strong>💵 Payment method</strong></p>
    <p>The one and only payment method we accept is <strong>Bitcoin</strong>. If you have never used bitcoin before or don’t know how it works, you can read a guide where we explain the whole process step by step. To read it, click on the following link: <a href="#">How to pay with Bitcoin</a></p>
    <p><strong>⚠️ Don’t say we didn’t warn you:</strong> If this is your first time using bitcoin, you must have the bitcoins prepared before requesting our service, in order to avoid making us work and then generate problems with the payment. This isn’t just about preventing uncomfortable situations but also out of respect for our time and work: prepare yourself before requesting a service.</p>
    <p><strong>⛔ There are no more payment methods:</strong> If there were, we’d be glad to tell you, but there aren’t. Insistence or questions about it are considered an insult to us and our work.</p>

    <p><strong>❌ Cancel an order</strong></p>
    <p>Once an order has been placed, it won’t be possible to cancel it. If you’re not sure if you really want the service, then don’t order anything yet. Don’t act impulsively and irresponsibly. Relax and think if you really want it. No one is forcing you to place an order. If you do, it will be of your own free will, and you can’t repent later.</p>
    <p>⏱️ There is no deadline for regret: There have been people who write to us after a few minutes of placing an order and consider that the short time that has elapsed is a valid reason to cancel it. It doesn’t matter if you placed your order just a second ago, you can’t cancel it anyway. Instead of placing an order and regret after a few minutes, better take those minutes to think before acting.</p>
    <p>🗒️ This rule also applies to modifications: Double check the website’s url and make sure you send us the correct one. If you make a mistake, that is going to be your problem, and you’ll have to pay for it anyway.</p>

    <p><strong>➕ Last details</strong></p>
    <ul>
      <li>The service is 100% safe and effective. No failure possible.</li>
      <li>It is not possible to customize the service. By hacking the website, everything will be accessed, you can’t reduce the price in exchange for a reduced access.</li>
      <li>If you want to hack two or more websites, ask us for discounts.</li>
      <li>If you have any questions, ask them before placing an order, not after.</li>
      <li>If you want to place an order as an intermediary, that is, on behalf of another person, please ask us for special conditions.</li>
      <li>Everything we say here is right and updated. We checked this page for the last time on: March 2026. You don’t need to ask us again or reconfirm anything you have read here.</li>
    </ul>

    <p><strong>✍️ I want to place an order!</strong></p>
    <p><strong>⚠️ Please, make sure you have read everything before requesting a hacking service.</strong> If you have questions or don’t understand something, ask all your questions before placing an order.</p>
    <p>✅ If you have read, understood, and accept our service agreement completely and want to place an order, <a href="../contact/">Contact Us</a> containing all the following 4 points that we mention below:</p>
    <ol>
      <li>Tell us that you want to hire a Hacker for Websites Hacking service, whose code is: <strong>03675</strong>.</li>
      <li>Confirm that you read the Service Agreement and that you agree with everything and have no doubts.</li>
      <li>The url of the website that you want to hack.</li>
      <li>Then wait for us to complete the service and get back to you</li>
    </ol>
    <p>📲 After receiving your message, we’ll reply to confirm the start of your order. Remember that once an order has been placed, there is no way to cancel or modify it.</p>
  `,
  list: [
    'Full server-level website hacking via SSH',
    'Complete administration access (not just a login form)',
    'Requires technical knowledge (SSH)',
    '5-hour delivery (usually less)',
    'Bitcoin payment only',
    'No cancellations or modifications after order placement'
  ],
  whyChoose: 'Over 21,300+ clients trust us for our professionalism, discretion, and proven track record in website hacking – including high-profile targets and complex infrastructures.'
},
   cloud: {
  tag: 'RECOVER LOST CRYPTO',
  icon: 'icon-compass',
  title: 'Recover Lost Crypto',
  desc: 'Recover stolen or lost crypto assets using advanced blockchain attack methods. Bitcoin recovery service via Alternative History and Majority Attack.',
  image: '/assets/crpto.png',
  detailedDesc: `
    <p><strong>₿ Recover Lost Crypto</strong></p>
    <p>Below you can read complete and detailed information about our service for recovering lost or stolen crypto assets. Please read everything carefully and contact us if you have any questions. Don't order any of our hacking services without reading and understanding everything about such service in the very first place.</p>

    <p><strong>💼 Method</strong></p>
    <p>After a lot of time and work and research, we have developed a private method to recover stolen or lost bitcoins that is based on 2 types of blockchain attacks that already exists and are widely known by the bitcoin community. These methods are called: <strong>"Alternative History Attack"</strong> and <strong>"Majority Attack"</strong>. We have taken the best of both attack methods to combine them and generate a new one that is more efficient and, of course, adapted to the needs of our clients.</p>
    <p>We have managed, either through direct agreements with the owners or by other means, to control more than 6,000 nodes of the 'bitcoin distribution network' that you can check by clicking here, and we also have a large number of devices from many people who have voluntarily installed a mining app, in exchange for receiving a part of our remuneration, which gives us a great capacity of 'hash power'.</p>
    <p>Simply stated so that everyone can understand what we're talking about without using so many technical words, the <strong>"Alternative History Attack"</strong>, consists of, as its name says, generating an alternative history for those bitcoins. A story that will say that they were sent to a different address under our control. This alternative history attack is achieved in conjunction with another attack called <strong>"Majority attack"</strong>, which is the most difficult part of our job, because you need to control at least 51% of the current bitcoin nodes in order to execute it successfully, something that, fortunately, we have achieved by controlling, as we previously said, more than 6,000 nodes. Thanks to controlling a large number of nodes and counting a large number of miners that provide us with hashing power, we're able to make them all write the story we want for a certain transaction.</p>

    <p><strong>📋 Requirements</strong></p>
    <p>The method we have developed is a method to recover your own crypto assets, stolen from your own account or that you sent by mistake. This is not to steal someone else's bitcoins.</p>
    <p>In order to perform this service, we need 2 things:</p>
    <ul>
      <li><strong>(1) The Private Key</strong> of your own bitcoin wallet from which the bitcoins you want to retrieve were sent. You need to know this to be able to rewrite the alternative history based on your wallet, by generating the corresponding outputs. If you don't have your Private Key and can't obtain it, it won't be possible to execute this service.</li>
      <li><strong>(2) An amount of bitcoins exactly equal to the amount you want to recover.</strong> As we have explained before, our method is to write an "alternative history" for those bitcoins, for which we'll need to have at our disposal an equal number of bitcoins to generate a new history equal to the previous one and then replace it with the new one.</li>
    </ul>
    <p><strong>Private Key:</strong> As we have explained previously, we'll need the Private Key of the wallet from where the bitcoins that you want to recover were sent to execute the service. For your safety, and to avoid possible problems or claims, we recommend that this Private Key is empty. If you have funds, you should transfer them to another wallet under your control and leave it empty before sending us the Private Key.</p>
    <p><strong>Equal amount of bitcoins:</strong> To create the "alternative history", we'll need an equal amount of bitcoins as those stolen or sent by mistake. For example, if 0.5162 bitcoins were stolen from you, we'll need exactly the same amount. This won't be a payment for our work and you won't lose this money. At the end of the process, when the alternative history has been written, you'll recover the lost or stolen bitcoins and you'll also recover these bitcoins.</p>

    <p><strong>❌ Cancel an order</strong></p>
    <p>Once an order has been placed, it won't be possible to cancel it. If you're not sure if you really want the service, then don't order anything yet. Don't act impulsively and irresponsibly. Relax and think if you really want it. No one is forcing you to place an order. If you do, it will be of your own free will, and you can't repent later.</p>
    <p>⏱️ There is no deadline for regret: There have been people who write to us after a few minutes of placing an order and consider that the short time that has elapsed is a valid reason to cancel it. It doesn't matter if you placed your order just a second ago, you can't cancel it anyway. Instead of placing an order and regret after a few minutes, better take those minutes to think before acting.</p>
    <p>🗒️ This rule also applies to modifications: Double check the wallet and make sure you send us the correct one. If you make a mistake, that is going to be your problem, and you'll have to pay for it anyway.</p>

    <p><strong>✍️ I want to place an order!</strong></p>
    <p><strong>⚠️ Please, make sure you have read everything before requesting a hacking service.</strong> If you have questions or don't understand something, ask all your questions before placing an order.</p>
    <p>✅ If you have read, understood, and accept our service agreement completely and want to place an order, <a href="../contact/">Contact Us</a> containing all the following 4 points that we mention below:</p>
    <ol>
      <li>Tell us that you want to hire an Expert for Crypto Recovery service, whose code is: <strong>03675</strong>.</li>
      <li>Confirm that you read the Service Agreement and that you agree with everything and have no doubts.</li>
      <li>The Details of the wallet you want to recover the funds from. You must also tell us which Network the crypto was lost from.</li>
      <li>Then wait for us to complete the service and get back to you</li>
    </ol>
    <p>📲 After receiving your message, we'll reply to confirm the start of your order. Remember that once an order has been placed, there is no way to cancel or modify it.</p>
  `,
  list: [
    'Alternative History Attack and Majority Attack methods',
    'Control over 6,000+ bitcoin nodes',
    'Requires Private Key from the original wallet',
    'Requires equal amount of bitcoins to recover',
    '100% safe and effective',
    'Bitcoin payment only'
  ],
  whyChoose: 'We are trusted by over 21,300 clients worldwide for our professionalism, discretion, and proven track record in crypto recovery – including high-value assets and complex blockchain cases.'
},

    vciso: {
      tag: 'ADVISORY',
      icon: 'icon-users',
      title: 'vCISO Advisory',
      desc: 'Fractional security leadership for teams that need direction — board reporting, roadmap prioritization, and vendor oversight — without a full-time hire.',
      image: '../assets/adv.png',
      detailedDesc: `
        <p><strong>Strategic guidance:</strong> We act as your virtual Chief Information Security Officer, providing leadership on security strategy, risk management, and compliance – on a flexible, part‑time basis.</p>
        <p><strong>Board-ready communications:</strong> We help you translate technical risk into business language that executives and board members understand, with clear metrics and actionable recommendations.</p>
        <p><strong>What you get:</strong></p>
        <ul>
          <li>Security roadmap & prioritization (90-day and 12-month)</li>
          <li>Board & investor reporting support (risk registers, metrics)</li>
          <li>Vendor & tooling review (selection, procurement, integration)</li>
          <li>On-call advisory hours for urgent decisions</li>
          <li>Incident response plan review and tabletop exercises</li>
        </ul>
      `,
      list: [
        'Security roadmap & prioritization',
        'Board & investor reporting support',
        'Vendor & tooling review',
        'On-call advisory hours'
      ],
      whyChoose: 'You get senior security experience without the overhead of a full-time executive – we plug into your existing team and provide clarity, not complexity.'
    },

    room: {
      tag: 'SPACE FOR HIRE',
      icon: 'icon-building',
      title: 'Cyber Range — Room Hire',
      desc: 'Our fitted training room is available to hire for private workshops, CTFs, and vendor-led sessions, with an isolated lab network and a briefing screen ready to go.',
      image: '../assets/room-modal.jpg',
      detailedDesc: `
        <p><strong>Fully equipped:</strong> Our room seats up to 12 participants and comes with a dedicated lab network isolated from the internet, so you can run hands-on exercises safely. The room is equipped with a large briefing screen, whiteboards, and charging stations.</p>
        <p><strong>Flexible booking:</strong> Hire by the half-day, full-day, or multi-day – we also offer optional facilitation by our trainers if you need an expert to run the session.</p>
        <p><strong>What’s included:</strong></p>
        <ul>
          <li>Up to 12 seats, isolated lab network (no internet exposure)</li>
          <li>Half-day, full-day, and multi-day rates</li>
          <li>Optional Redline facilitator on request</li>
          <li>Central location with easy transit access</li>
          <li>On-site catering options available</li>
        </ul>
      `,
      list: [
        'Up to 12 seats, isolated lab network',
        'Half-day, full-day, and multi-day rates',
        'Optional Redline facilitator on request',
        'Central location, easy transit access'
      ],
      whyChoose: 'A professional space purpose-built for security training – you can focus on the content while we handle the logistics.'
    }
  };

  const modal = document.getElementById('serviceModal');
  const modalIcon = document.getElementById('modalIcon');
  const modalTag = document.getElementById('modalTag');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalList = document.getElementById('modalList');
  const modalImage = document.getElementById('modalImage');          // NEW: image element
  const modalDetailedContent = document.getElementById('modalDetailedContent'); // NEW: container for detailed desc
  const modalClose = document.getElementById('modalClose');
  let lastFocused = null;

  function openModal(key, triggerEl){
    const data = SERVICES[key];
    if (!modal || !data) return;
    
    // Set basic fields
    modalIcon.querySelector('use').setAttribute('href', '#' + data.icon);
    modalTag.textContent = data.tag;
    modalTitle.textContent = data.title;
    modalDesc.textContent = data.desc;
    modalList.innerHTML = data.list.map(item => `<li>${item}</li>`).join('');
    
    // ---- NEW: Display image if exists ----
    if (modalImage) {
      if (data.image) {
        modalImage.src = data.image;
        modalImage.style.display = 'block';
        modalImage.alt = data.title + ' image';
      } else {
        modalImage.style.display = 'none';
      }
    }
    
    // ---- NEW: Display detailed description and "why choose" ----
    if (modalDetailedContent) {
      let html = '';
      if (data.detailedDesc) {
        html += data.detailedDesc;
      }
      if (data.whyChoose) {
        html += `<div class="why-choose"><strong>Why choose this:</strong> ${data.whyChoose}</div>`;
      }
      modalDetailedContent.innerHTML = html;
    }
    
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