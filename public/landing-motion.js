(() => {
  'use strict';
  if (document.documentElement.dataset.vynEnhancements) return;
  document.documentElement.dataset.vynEnhancements = 'ready';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const directions = {
    website: {
      title: 'A website that moves your business forward.', service: 'Website Development', label: 'Business website',
      summary: 'Give people a clear way to discover your business, understand your offer, and contact you.',
      steps: [['Define the journey', 'Choose the audience, pages, and main action.'], ['Shape the experience', 'Plan content and responsive page layouts.'], ['Build the essentials', 'Develop the website and agreed inquiry features.'], ['Launch with confidence', 'Check devices, performance, and the handover.']]
    },
    webapp: {
      title: 'A web app built around your workflow.', service: 'Full-Stack Web Application', label: 'Web application',
      summary: 'Bring a useful workflow into one place, with the right access for each person.',
      steps: [['Map the workflow', 'Identify users, roles, and the work they need to do.'], ['Design the key screens', 'Make the main tasks straightforward to complete.'], ['Connect the system', 'Build agreed data, permissions, and integrations.'], ['Test real journeys', 'Check access, reliability, and deployment.']]
    },
    mobile: {
      title: 'A mobile experience with a clear purpose.', service: 'Mobile Application', label: 'Mobile app',
      summary: 'Focus on the actions people need on the go, then shape an achievable first release.',
      steps: [['Choose the first release', 'Define target devices, users, and essential features.'], ['Prototype the experience', 'Review the navigation and important interactions.'], ['Build and connect', 'Develop the agreed app and supporting services.'], ['Prepare for release', 'Test devices and plan distribution and support.']]
    },
    ai: {
      title: 'Practical AI, starting with a real task.', service: 'AI & Machine Learning', label: 'AI & automation',
      summary: 'Start with one useful problem and check whether AI or a simpler automation is the right fit.',
      steps: [['Choose the task', 'Define the current workflow and a useful outcome.'], ['Check the inputs', 'Review available data, privacy, and constraints.'], ['Build a small proof', 'Try a focused prototype with human review.'], ['Evaluate before scaling', 'Check quality, cost, and failure handling.']]
    },
    mvp: {
      title: 'A smaller first launch. A clearer next step.', service: 'Startup MVP', label: 'Startup MVP',
      summary: 'Give your core idea a testable first version, shaped around the people who will use it.',
      steps: [['Find the core promise', 'Identify a target user and the problem worth testing.'], ['Set the first scope', 'Separate essential features from later additions.'], ['Build the first version', 'Develop one coherent end-to-end user journey.'], ['Learn from the launch', 'Collect feedback and agree what to improve next.']]
    },
    student: {
      title: 'Build a project you can understand.', service: 'College Project Support', label: 'Student project',
      summary: 'Work through the idea, implementation, and explanation with a focus on your own learning.',
      steps: [['Understand the brief', 'Review learning goals, requirements, and constraints.'], ['Plan the approach', 'Choose a practical scope and explain the architecture.'], ['Develop with guidance', 'Work through the prototype, debugging, and review.'], ['Prepare the handover', 'Understand the code, documentation, and demo.']]
    }
  };
  const stages = {
    idea: {label: 'I have an idea', next: 'Start with a short discovery conversation to clarify the problem and the first scope.'},
    design: {label: 'I have a design or requirements', next: 'Start with a review of your designs and requirements, then agree an implementation plan.'},
    improve: {label: 'I have something to improve', next: 'Start by reviewing the current product and choosing the most useful improvement.'}
  };
  function buildCompass() {
    const services = $('#services');
    if (!services || $('#project-compass')) return;
    const section = document.createElement('section');
    section.id = 'project-compass';
    section.className = 'vyn-compass';
    section.setAttribute('aria-labelledby', 'vyn-compass-title');
    const options = [
      ['website', 'Website', 'Your business, online'], ['webapp', 'Web app', 'Portals & useful tools'],
      ['mobile', 'Mobile app', 'A product on the go'], ['ai', 'AI & automation', 'A smarter workflow'],
      ['mvp', 'Startup MVP', 'Test your core idea'], ['student', 'Student project', 'Learn & prototype']
    ];
    section.innerHTML = `<div class="vyn-compass-inner">
      <div class="vyn-compass-intro"><span class="vyn-compass-eyebrow">Project Compass</span>
        <h2 id="vyn-compass-title">Find your starting point.</h2>
        <p>Choose a direction. See a practical path forward. Bring it into your project inquiry when you’re ready.</p></div>
      <div class="vyn-compass-layout">
        <div class="vyn-compass-controls">
          <fieldset><legend><span class="vyn-compass-step" aria-hidden="true">01</span>What would you like to build?</legend>
            <div class="vyn-goals">${options.map(([value, name, detail], i) => `<label class="vyn-goal"><input type="radio" name="vyn-project-goal" value="${value}" ${i === 0 ? 'checked' : ''}><span class="vyn-goal-content"><strong>${name}</strong><small>${detail}</small></span></label>`).join('')}</div>
          </fieldset>
          <label class="vyn-stage-label" for="vyn-project-stage"><span class="vyn-compass-step" aria-hidden="true">02</span>Where are you starting?</label>
          <select id="vyn-project-stage">${Object.entries(stages).map(([value, stage]) => `<option value="${value}">${stage.label}</option>`).join('')}</select>
          <p class="vyn-compass-privacy"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Your choices stay on this page. Details are sent only when you submit an inquiry.</p>
        </div>
        <aside class="vyn-compass-result" aria-labelledby="vyn-roadmap-title">
          <p class="vyn-roadmap-kicker">Your starting roadmap</p><h3 id="vyn-roadmap-title"></h3>
          <p class="vyn-roadmap-summary"></p><ol class="vyn-roadmap"></ol>
          <div class="vyn-roadmap-actions"><a class="vyn-use-roadmap" href="#contact">Use this roadmap <span aria-hidden="true">→</span></a><button class="vyn-copy-roadmap" type="button">Copy my brief</button></div>
          <p class="vyn-compass-note">A starting guide, not a quotation. Scope, pricing, and timing are agreed after we understand your project.</p>
        </aside>
      </div><p class="vyn-compass-status" role="status" aria-live="polite"></p>
    </div>`;
    services.after(section);
    const status = $('.vyn-compass-status', section);
    let previousBrief = '';
    let animation;
    function choice() {
      return {direction: directions[$('input[name="vyn-project-goal"]:checked', section).value], stage: stages[$('#vyn-project-stage', section).value]};
    }
    function brief() {
      const {direction, stage} = choice();
      return `Project Compass\nDirection: ${direction.label}\nStarting point: ${stage.label}\nPriorities: ${direction.steps.map(([title]) => title).join(' → ')}\nNext step: ${stage.next}`;
    }
    function update(announce = true) {
      const {direction, stage} = choice();
      $('#vyn-roadmap-title', section).textContent = direction.title;
      $('.vyn-roadmap-summary', section).textContent = direction.summary;
      const list = $('.vyn-roadmap', section);
      list.replaceChildren(...direction.steps.map(([title, detail], i) => {
        const li = document.createElement('li');
        const number = document.createElement('span'); number.className = 'vyn-roadmap-number'; number.textContent = `0${i + 1}`; number.setAttribute('aria-hidden', 'true');
        const text = document.createElement('div'), strong = document.createElement('strong'), small = document.createElement('small');
        strong.textContent = title; small.textContent = i === 0 ? `${detail} ${stage.next}` : detail;
        text.append(strong, small); li.append(number, text); return li;
      }));
      if (announce) {
        status.textContent = `${direction.label} roadmap updated. ${stage.next}`;
        if (!reduced.matches && list.animate) {
          if (animation) animation.cancel();
          animation = list.animate([{opacity: .35, transform: 'translateY(6px)'}, {opacity: 1, transform: 'none'}], {duration: 240, easing: 'ease-out'});
        }
      }
    }
    section.addEventListener('change', () => update());
    $('.vyn-use-roadmap', section).addEventListener('click', event => {
      const form = $('#inquiryForm'), details = $('#projectDetails', form || document), select = $('#projectType', form || document);
      if (!form || !details || !select) return;
      event.preventDefault();
      const summary = brief();
      let notes = details.value;
      if (previousBrief && notes.includes(previousBrief)) notes = notes.replace(previousBrief, '').trimEnd();
      const combined = notes ? `${notes}\n\n${summary}` : summary;
      const limit = details.maxLength > 0 ? details.maxLength : 5000;
      if (combined.length > limit) {
        status.textContent = 'Your existing notes were kept. Use Copy my brief to choose which details to add.';
        return;
      }
      details.value = combined; previousBrief = summary;
      const service = choice().direction.service;
      const option = [...select.options].find(item => item.value === service || item.textContent === service);
      if (option) select.value = option.value;
      details.dispatchEvent(new Event('input', {bubbles: true}));
      select.dispatchEvent(new Event('change', {bubbles: true}));
      status.textContent = 'Your roadmap is in the inquiry form. Any notes you already wrote were kept.';
      $('#contact').scrollIntoView({behavior: reduced.matches ? 'auto' : 'smooth', block: 'start'});
    });
    $('.vyn-copy-roadmap', section).addEventListener('click', async () => {
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(brief());
        status.textContent = 'Project brief copied. Keep it for your next conversation with VYNTRIO.';
      } catch {
        status.textContent = 'Copy is unavailable in this browser. Choose Use this roadmap to add it to the inquiry form.';
      }
    });
    update(false);
    // A direct route from the hero makes the new tool discoverable.
    const explore = $$('a[href="#services"]', $('#home') || document).find(a => a.textContent.includes('Explore'));
    if (explore) {
      const link = document.createElement('a'); link.href = '#project-compass'; link.className = 'vyn-compass-entry';
      link.textContent = 'Not sure where to start? Try Project Compass →';
      link.style.cssText = 'display:block;margin-top:20px;color:#1554de;font-size:14px;line-height:1.6;text-decoration:underline;text-underline-offset:4px;';
      explore.parentElement.after(link);
    }
  }

  function motion() {
    if (!('IntersectionObserver' in window) || reduced.matches) return;
    const sections = ['about', 'services', 'project-compass', 'audience', 'why-us', 'process', 'portfolio', 'contact', 'reviews', 'faq'].map(id => document.getElementById(id)).filter(Boolean);
    const selector = '.service-card,.review-card,.center-intro,.vyn-compass-intro,.vyn-compass-controls,.vyn-compass-result,[data-name^="Heading"],[data-name*="Card"],[data-name^="Details"],h2';
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.replace('vyn-pending', 'vyn-visible');
        observer.unobserve(entry.target);
      }
    }, {threshold: .06, rootMargin: '0px 0px -32px 0px'});
    const pending = [];
    try {
      for (const section of sections) {
        const candidates = $$(selector, section).filter(el => {
          const parent = el.parentElement.closest(selector);
          return !parent || !section.contains(parent);
        });
        candidates.forEach((el, index) => {
          if (el.getBoundingClientRect().top < window.innerHeight * .92) return;
          el.classList.add('vyn-reveal', 'vyn-pending');
          el.style.setProperty('--vyn-delay', `${Math.min(index % 3 * 75, 150)}ms`);
          pending.push(el); observer.observe(el);
        });
      }
      document.addEventListener('focusin', event => {
        const target = event.target.closest('.vyn-pending');
        if (target) {target.classList.replace('vyn-pending', 'vyn-visible'); observer.unobserve(target);}
      });
      reduced.addEventListener('change', event => {
        if (event.matches) {observer.disconnect(); pending.forEach(el => el.classList.replace('vyn-pending', 'vyn-visible'));}
      });
      window.addEventListener('beforeprint', () => pending.forEach(el => el.classList.replace('vyn-pending', 'vyn-visible')));
    } catch {
      observer.disconnect(); pending.forEach(el => el.classList.remove('vyn-pending'));
    }
  }

  function navigation() {
    const links = $$('a[href^="#"]').filter(link => link.closest('#mobileMenu') || link.dataset.nodeId?.startsWith('1:103') || ['1:1041', '1:1043', '1:1045', '1:1047'].includes(link.dataset.nodeId));
    links.forEach(link => link.dataset.vynNav = '');
    const ids = [...new Set(links.map(link => link.hash).filter(Boolean))];
    const active = id => links.forEach(link => {if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');});
    active('home');
    if ('IntersectionObserver' in window) {
      const visible = new Set();
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);});
        const current = [...visible].sort((a, b) => Math.abs(a.getBoundingClientRect().top - 110) - Math.abs(b.getBoundingClientRect().top - 110))[0];
        if (current) active(current.id);
      }, {rootMargin: '-90px 0px -55% 0px', threshold: 0});
      ids.forEach(id => {const section = $(id); if (section) observer.observe(section);});
    }
    if (reduced.matches) return;
    const line = document.createElement('div'); line.className = 'vyn-scroll-progress'; line.setAttribute('aria-hidden', 'true'); document.body.append(line);
    let queued = false;
    const update = () => {
      const span = document.documentElement.scrollHeight - window.innerHeight;
      line.style.transform = `scaleX(${span > 0 ? Math.max(0, Math.min(1, window.scrollY / span)) : 0})`;
      queued = false;
    };
    const schedule = () => {if (!queued) {queued = true; window.requestAnimationFrame(update);}};
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule, {passive: true});
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
    update();
  }
  try {buildCompass(); motion(); navigation();} catch (error) {
    $$('.vyn-pending').forEach(el => el.classList.remove('vyn-pending'));
    console.warn('VYNTRIO page enhancements could not finish.', error);
  }
})();
