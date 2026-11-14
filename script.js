(() => {
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ============ ЗАГЛУШКИ ============
     Пока ты не добавил свои файлы, вместо них показываются
     красивые цветные картинки-заглушки. Как только положишь
     настоящий файл — он появится сам. */
  const palettes = [
    ['#ff5e3a', '#ffb36b'], ['#b79cff', '#6d5bff'], ['#d7ff3f', '#2fd18b'],
    ['#ff7ac8', '#ffb36b'], ['#4dd2ff', '#6d5bff'], ['#ffd23f', '#ff5e3a']
  ];

  function placeholder(w, h, label, i) {
    const [a, b] = palettes[i % palettes.length];
    const fs = Math.round(Math.min(w, h) / 11);
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs>` +
      `<rect width='100%' height='100%' fill='url(#g)'/>` +
      `<circle cx='${w * 0.78}' cy='${h * 0.22}' r='${Math.min(w, h) * 0.14}' fill='rgba(255,255,255,.28)'/>` +
      `<path d='M0 ${h} L${w * 0.35} ${h * 0.6} L${w * 0.58} ${h * 0.82} L${w * 0.78} ${h * 0.55} L${w} ${h * 0.85} V${h} Z' fill='rgba(15,11,20,.35)'/>` +
      `<text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-weight='700' font-size='${fs}' fill='#15101b'>${label}</text>` +
      `</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function applyFallback(img) {
    if (img.dataset.fb) return;
    img.dataset.fb = '1';
    const [w, h] = (img.dataset.ph || '800x800').split('x').map(Number);
    img.src = placeholder(w, h, img.dataset.label || 'твоё фото', Number(img.dataset.i || 0));
  }

  $$('img[data-ph]').forEach((img, i) => {
    img.dataset.i = i;
    img.addEventListener('error', () => applyFallback(img));
    if (img.complete && img.naturalWidth === 0) applyFallback(img);
  });

  /* ============ ТОСТ (маленькое уведомление) ============ */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  /* ============ ВКЛАДКИ ============ */
  const tabs = $$('.tab');
  const panels = $$('.panel');

  function openTab(name) {
    tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
    });
    panels.forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
    if (name !== 'video') pauseAllVideos();
  }
  tabs.forEach(t => t.addEventListener('click', () => openTab(t.dataset.tab)));

  /* ============ ПОЯВЛЕНИЕ ПРИ ПРОКРУТКЕ ============ */
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12 })
    : null;
  $$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  /* ============ ФОТО НА ВЕСЬ ЭКРАН ============ */
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  const photos = $$('.photo');
  let cur = 0;

  function showPhoto(i) {
    cur = (i + photos.length) % photos.length;
    const fig = photos[cur];
    lbImg.src = $('img', fig).src;
    lbImg.alt = $('img', fig).alt;
    lbCap.textContent = $('figcaption', fig)?.textContent || '';
  }
  function openLb(i) {
    showPhoto(i);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeLb() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  photos.forEach((fig, i) => fig.addEventListener('click', () => openLb(i)));
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', e => { e.stopPropagation(); showPhoto(cur - 1); });
  $('#lbNext').addEventListener('click', e => { e.stopPropagation(); showPhoto(cur + 1); });
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') showPhoto(cur - 1);
    if (e.key === 'ArrowRight') showPhoto(cur + 1);
  });

  // свайп пальцем на телефоне
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showPhoto(cur + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ============ ВИДЕО: нажал — играет со звуком ============ */
  const cards = $$('.video-card');

  function pauseAllVideos(except) {
    cards.forEach(c => {
      const v = $('video', c);
      if (v !== except && !v.paused) v.pause();
    });
  }

  cards.forEach(card => {
    const v = $('video', card);

    // если файла нет — помечаем карточку
    v.addEventListener('error', () => card.classList.add('empty'));

    v.addEventListener('play',  () => card.classList.add('playing'));
    v.addEventListener('pause', () => card.classList.remove('playing'));
    v.addEventListener('ended', () => { card.classList.remove('playing'); v.currentTime = 0; });

    card.addEventListener('click', () => {
      if (card.classList.contains('playing')) return;   // управление — родными кнопками плеера

      if (card.classList.contains('empty') || v.error) {
        const file = (v.getAttribute('src') || '').split('#')[0];
        toast('Добавь свой файл: ' + file);
        return;
      }
      pauseAllVideos(v);
      v.muted = false;        // со звуком
      v.volume = 1;
      v.controls = true;      // пауза, перемотка, полный экран
      v.play().catch(() => toast('Не получилось запустить видео'));
    });
  });

  /* ============ СВЕЧЕНИЕ ЗА КУРСОРОМ + НАКЛОН ФОТО (только на ПК) ============ */
  const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hasMouse) {
    const glow = $('#cursorGlow');
    let tx = 0, ty = 0, x = 0, y = 0;
    window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; glow.classList.add('on'); });
    (function loop() {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      glow.style.transform = `translate(${x - 190}px, ${y - 190}px)`;
      requestAnimationFrame(loop);
    })();

    const portrait = $('#portrait');
    if (portrait) {
      portrait.addEventListener('mousemove', e => {
        const r = portrait.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        portrait.style.transform = `perspective(900px) rotateY(${px * 14}deg) rotateX(${-py * 14}deg)`;
      });
      portrait.addEventListener('mouseleave', () => { portrait.style.transform = ''; });
    }
  }

  /* ============ ГОД В ПОДВАЛЕ ============ */
  $('#year').textContent = new Date().getFullYear();
})();
