/**
 * Apple Theme - Main JavaScript
 * 纯原生 JS,零依赖
 */

document.addEventListener('DOMContentLoaded', function () {

  /* ==========================================
     1. 显示模式循环:light → dark → rain(圆形扩散动画)
     暗色为默认态(无 data-theme 属性);rain = 暗色 + data-rain
     ========================================== */
  var themeToggle = document.getElementById('themeToggle');
  var THEME_BG = { dark: '#0d0d0f', light: '#f0f0f2', rain: '#0b0c10' };
  var THEME_NEXT = { light: 'dark', dark: 'rain', rain: 'light' };

  function getCurrentTheme() {
    if (document.documentElement.hasAttribute('data-rain')) return 'rain';
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      root.removeAttribute('data-rain');
    } else if (theme === 'rain') {
      root.removeAttribute('data-theme');
      root.setAttribute('data-rain', '');
    } else {
      root.removeAttribute('data-theme');
      root.removeAttribute('data-rain');
    }
    localStorage.setItem('theme', theme);
    Rain.setEnabled(theme === 'rain');
  }

  function toggleTheme(x, y) {
    var next = THEME_NEXT[getCurrentTheme()];
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      applyTheme(next);
      return;
    }

    // 以点击点为圆心、覆盖全屏的扩散半径
    var radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    if (document.startViewTransition) {
      var transition = document.startViewTransition(function () {
        applyTheme(next);
      });
      transition.ready.then(function () {
        document.documentElement.animate(
          {
            clipPath: [
              'circle(0px at ' + x + 'px ' + y + 'px)',
              'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'
            ]
          },
          {
            duration: 500,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      });
      return;
    }

    // 降级(Firefox 等):新颜色的圆形 overlay 扩散铺满后再切换
    var ripple = document.createElement('div');
    ripple.className = 'theme-ripple';
    var size = radius * 2;
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.background = THEME_BG[next];
    document.body.appendChild(ripple);

    var anim = ripple.animate(
      { transform: ['translate(-50%, -50%) scale(0)', 'translate(-50%, -50%) scale(1)'] },
      { duration: 500, easing: 'ease-in-out', fill: 'forwards' }
    );
    anim.onfinish = function () {
      applyTheme(next);
      ripple.animate(
        { opacity: [1, 0] },
        { duration: 200, easing: 'ease-out', fill: 'forwards' }
      ).onfinish = function () {
        ripple.remove();
      };
    };
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var rect = themeToggle.getBoundingClientRect();
      toggleTheme(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  }

  /* ==========================================
     2. 滚动入场动画 (IntersectionObserver)
     ========================================== */
  var animatedElements = document.querySelectorAll('.animate-on-scroll');

  if ('IntersectionObserver' in window && animatedElements.length > 0) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var parent = entry.target.parentElement;
          if (parent) {
            var siblings = parent.querySelectorAll('.animate-on-scroll');
            var index = Array.prototype.indexOf.call(siblings, entry.target);
            entry.target.style.transitionDelay = (Math.min(index, 6) * 0.06) + 's';
          }
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    animatedElements.forEach(function (el) { observer.observe(el); });
  } else {
    animatedElements.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ==========================================
     3. 回到顶部 / 顶栏阴影 / 阅读进度条
     ========================================== */
  var scrollToTopBtn = document.getElementById('scrollToTop');
  var siteHeader = document.getElementById('siteHeader');
  var progressBar = document.getElementById('readingProgress');
  var isPost = document.querySelector('.post-body') !== null;

  if (progressBar && !isPost) {
    progressBar.style.display = 'none';
  }

  function onScroll() {
    var y = window.scrollY;
    if (scrollToTopBtn) {
      scrollToTopBtn.classList.toggle('is-visible', y > 300);
    }
    if (siteHeader) {
      siteHeader.classList.toggle('is-scrolled', y > 10);
    }
    if (progressBar && isPost) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(Math.max(y / max * 100, 0), 100) : 0;
      progressBar.style.width = progress + '%';
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ==========================================
     4. 移动端菜单
     ========================================== */
  var mobileMenuToggle = document.getElementById('mobileMenuToggle');
  var mobileNav = document.getElementById('mobileNav');

  if (mobileMenuToggle && mobileNav) {
    mobileMenuToggle.addEventListener('click', function () {
      mobileMenuToggle.classList.toggle('is-active');
      mobileNav.classList.toggle('is-active');
    });
    mobileNav.querySelectorAll('.mobile-nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenuToggle.classList.remove('is-active');
        mobileNav.classList.remove('is-active');
      });
    });
  }

  /* ==========================================
     5. 文章页:外链新窗口打开
     ========================================== */
  var postBody = document.querySelector('.post-body');
  if (postBody) {
    postBody.querySelectorAll('a[href^="http"]').forEach(function (link) {
      if (!link.getAttribute('target')) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  /* ==========================================
     6. 代码块:复制按钮 + 语言标签
     ========================================== */
  if (postBody) {
    postBody.querySelectorAll('pre').forEach(function (pre) {
      var code = pre.querySelector('code');
      if (!code) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'code-block';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      var lang = '';
      code.classList.forEach(function (cls) {
        if (cls !== 'hljs' && cls !== 'highlight' && !lang) lang = cls;
      });

      var bar = document.createElement('div');
      bar.className = 'code-block-bar';
      bar.innerHTML = '<span class="code-lang">' + (lang || 'code') + '</span>';

      var btn = document.createElement('button');
      btn.className = 'code-copy';
      btn.type = 'button';
      btn.textContent = '复制';
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(code.innerText).then(function () {
          btn.textContent = '已复制';
          btn.classList.add('is-copied');
          setTimeout(function () {
            btn.textContent = '复制';
            btn.classList.remove('is-copied');
          }, 1500);
        });
      });
      bar.appendChild(btn);
      wrapper.insertBefore(bar, pre);
    });
  }

  /* ==========================================
     7. 文章页:目录滚动高亮 (Scroll Spy)
     ========================================== */
  var tocLinks = document.querySelectorAll('.toc-list-link');
  if (postBody && tocLinks.length > 0 && 'IntersectionObserver' in window) {
    var headings = postBody.querySelectorAll('h2[id], h3[id], h4[id]');
    var linkMap = {};
    tocLinks.forEach(function (link) {
      var id = decodeURIComponent((link.getAttribute('href') || '').replace('#', ''));
      if (id) linkMap[id] = link;
    });

    var activeLink = null;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var link = linkMap[entry.target.id];
          if (link) {
            if (activeLink) activeLink.classList.remove('active');
            link.classList.add('active');
            activeLink = link;
          }
        }
      });
    }, { rootMargin: '-64px 0px -70% 0px' });

    headings.forEach(function (h) { spy.observe(h); });
  }

  /* ==========================================
     8. 站内搜索
     ========================================== */
  var searchOverlay = document.getElementById('searchOverlay');
  var searchToggle = document.getElementById('searchToggle');
  var searchInput = document.getElementById('searchInput');
  var searchResults = document.getElementById('searchResults');
  var searchClose = document.getElementById('searchClose');
  var searchBackdrop = document.getElementById('searchBackdrop');
  var searchData = null;

  function openSearch() {
    if (!searchOverlay) return;
    searchOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    searchInput.focus();
    if (!searchData) {
      fetch('/search.json')
        .then(function (res) { return res.json(); })
        .then(function (data) { searchData = data; })
        .catch(function () {
          searchResults.innerHTML = '<p class="search-hint">搜索数据加载失败</p>';
        });
    }
  }

  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderResults(keyword) {
    if (!searchData) return;
    var kw = keyword.trim().toLowerCase();
    if (!kw) {
      searchResults.innerHTML = '<p class="search-hint">输入关键词搜索标题、标签与正文</p>';
      return;
    }

    var matches = searchData.filter(function (post) {
      return post.title.toLowerCase().indexOf(kw) !== -1 ||
        post.text.toLowerCase().indexOf(kw) !== -1 ||
        post.tags.some(function (t) { return t.toLowerCase().indexOf(kw) !== -1; }) ||
        post.categories.some(function (c) { return c.toLowerCase().indexOf(kw) !== -1; });
    }).slice(0, 10);

    if (matches.length === 0) {
      searchResults.innerHTML = '<p class="search-hint">没有找到与「' + escapeHtml(keyword) + '」相关的文章</p>';
      return;
    }

    searchResults.innerHTML = matches.map(function (post) {
      var idx = post.text.toLowerCase().indexOf(kw);
      var snippet = '';
      if (idx !== -1) {
        var start = Math.max(0, idx - 40);
        snippet = (start > 0 ? '…' : '') + post.text.slice(start, idx + 80) + '…';
      } else {
        snippet = post.text.slice(0, 100) + '…';
      }
      return '<a class="search-result-item" href="' + post.url + '">' +
        '<span class="search-result-title">' + escapeHtml(post.title) + '</span>' +
        '<span class="search-result-snippet">' + escapeHtml(snippet) + '</span>' +
        '<span class="search-result-meta">' + post.date +
        (post.tags.length ? ' · ' + escapeHtml(post.tags.slice(0, 3).join(' / ')) : '') + '</span>' +
        '</a>';
    }).join('');
  }

  if (searchToggle) searchToggle.addEventListener('click', openSearch);
  if (searchClose) searchClose.addEventListener('click', closeSearch);
  if (searchBackdrop) searchBackdrop.addEventListener('click', closeSearch);
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      renderResults(searchInput.value);
    });
  }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (searchOverlay && searchOverlay.hidden) { openSearch(); } else { closeSearch(); }
    }
    if (e.key === 'Escape' && searchOverlay && !searchOverlay.hidden) {
      closeSearch();
    }
  });

  /* ==========================================
     9. 封面页(PRESS ANY KEY)
     ========================================== */
  var cover = document.getElementById('siteCover');
  if (cover && cover.style.display !== 'none') {
    var entered = false;
    var enterSite = function () {
      if (entered) return;
      entered = true;
      try { sessionStorage.setItem('bv-entered', '1'); } catch (e) {}
      document.documentElement.classList.remove('cover-lock');
      cover.classList.add('is-leaving');
      Rain.resumeAudio(); // 点击即用户手势,雨声可在此启动
      document.removeEventListener('keydown', enterSite);
      setTimeout(function () { cover.remove(); }, 700);
    };
    cover.addEventListener('click', enterSite);
    document.addEventListener('keydown', enterSite);
  }

  /* ==========================================
     10. 雨天模式:载入时恢复
     ========================================== */
  if (getCurrentTheme() === 'rain') {
    Rain.setEnabled(true);
  }

});

/* ==============================================================
   Rain Engine — Canvas 雨景 + Web Audio 白噪声雨声
   视觉密度与音量共用同一条强度曲线(intensity 0~1 缓慢漂移)
   ============================================================== */
var Rain = (function () {
  var canvas = null, ctx = null;
  var running = false, rafId = null;
  var W = 0, H = 0;
  var drops = [], ripples = [], splashes = [], puddles = [];
  var spawnCarry = 0, lastTime = 0, elapsed = 0;
  var audioCtx = null, masterGain = null, bedGain = null, bedLowpass = null, bedModDepth = null, noiseBuffer = null;
  var plinkCarry = 0, activePlinks = 0, lastDingAt = 0, nextThunderAt = 0, flashAlpha = 0;
  var gestureBound = false;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAX_DROPS = 240;

  /* ---------- 场景 ---------- */

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makePuddles();
  }

  function makePuddles() {
    puddles = [];
    var n = Math.max(3, Math.round(W / 300));
    for (var i = 0; i < n; i++) {
      var rx = 55 + Math.random() * 130;
      puddles.push({
        cx: (i + 0.5) * (W / n) + (Math.random() - 0.5) * 90,
        cy: H * (0.9 + Math.random() * 0.07),
        rx: rx,
        ry: rx * 0.15
      });
    }
  }

  /* 强度曲线:多条低频正弦叠加,缓慢起伏(阵雨感) */
  function intensityAt(t) {
    var v = 0.55 +
      0.28 * Math.sin(t * 0.05) +
      0.12 * Math.sin(t * 0.17 + 2) +
      0.05 * Math.sin(t * 0.43 + 5);
    return Math.min(1, Math.max(0.15, v));
  }

  function spawnDrop() {
    if (drops.length >= MAX_DROPS) return;
    var z = 0.25 + Math.random() * 0.75; // 景深:越大越近
    drops.push({
      x: Math.random() * (W + 120) - 60,
      y: -30 - Math.random() * 60,
      z: z,
      gy: H * (0.72 + z * 0.24) + Math.random() * 14 // 近处的雨落得更低,形成纵深
    });
  }

  function land(d) {
    // 水坑内 → 涟漪;水坑外 → 小水花
    var inPuddle = false;
    for (var i = 0; i < puddles.length; i++) {
      var p = puddles[i];
      var dx = (d.x - p.cx) / p.rx, dy = (d.gy - p.cy) / p.ry;
      if (dx * dx + dy * dy < 1) { inPuddle = true; break; }
    }
    ripples.push({
      x: d.x, y: d.gy, r: 1,
      max: (inPuddle ? 16 : 7) + 22 * d.z,
      z: d.z
    });
    // 音画同步:落进水坑的雨滴按概率触发一声带谐振的"plip",克制点缀
    if (inPuddle && Math.random() < 0.1 && elapsed - lastDingAt > 0.15) {
      lastDingAt = elapsed;
      playPlink(
        1100 + Math.random() * 1400,
        0.012 + Math.random() * 0.01,
        0.09 + Math.random() * 0.07,
        Math.max(-0.7, Math.min(0.7, (d.x / W) * 1.4 - 0.7)),
        9
      );
    }
    var n = inPuddle ? 2 : 3;
    for (var j = 0; j < n; j++) {
      splashes.push({
        x: d.x, y: d.gy,
        vx: (Math.random() - 0.5) * 90 * d.z,
        vy: -(50 + Math.random() * 110) * d.z,
        life: 0.32
      });
    }
  }

  function draw(dt, intensity) {
    ctx.clearRect(0, 0, W, H);

    // 地面湿润带
    var g = ctx.createLinearGradient(0, H * 0.7, 0, H);
    g.addColorStop(0, 'rgba(150, 170, 200, 0)');
    g.addColorStop(1, 'rgba(150, 170, 200, 0.055)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.7, W, H * 0.3);

    // 水坑(路灯般的微弱黄色倒影给第一个水坑)
    for (var i = 0; i < puddles.length; i++) {
      var p = puddles[i];
      ctx.beginPath();
      ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(130, 155, 190, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 220, 245, 0.05)';
      ctx.stroke();
      if (i === 0) {
        ctx.beginPath();
        ctx.ellipse(p.cx, p.cy, p.rx * 0.45, p.ry * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 216, 2, 0.03)';
        ctx.fill();
      }
    }

    // 雨滴(带风向斜落,远近不同粗细/透明度)
    var windX = 26;
    ctx.lineCap = 'round';
    for (var di = drops.length - 1; di >= 0; di--) {
      var d = drops[di];
      var speed = 680 + 720 * d.z;
      d.y += speed * dt;
      d.x += windX * d.z * dt;
      if (d.y >= d.gy) {
        land(d);
        drops.splice(di, 1);
        continue;
      }
      var len = 10 + 20 * d.z;
      ctx.strokeStyle = 'rgba(178, 200, 224, ' + (0.09 + 0.22 * d.z * intensity).toFixed(3) + ')';
      ctx.lineWidth = 0.7 + d.z;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - windX * d.z * (len / speed), d.y - len);
      ctx.stroke();
    }

    // 涟漪(扁椭圆扩散)
    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      var r = ripples[ri];
      r.r += (r.max / 0.55) * dt;
      if (r.r >= r.max) { ripples.splice(ri, 1); continue; }
      var alpha = (1 - r.r / r.max) * 0.32 * r.z;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(190, 212, 238, ' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 溅起的水花
    for (var si = splashes.length - 1; si >= 0; si--) {
      var s = splashes[si];
      s.life -= dt;
      if (s.life <= 0) { splashes.splice(si, 1); continue; }
      s.vy += 620 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      ctx.fillStyle = 'rgba(190, 210, 235, ' + (s.life * 1.1).toFixed(3) + ')';
      ctx.fillRect(s.x, s.y, 1.4, 1.4);
    }

    // 雷声伴随的极淡闪光,数帧内衰减
    if (flashAlpha > 0.002) {
      ctx.fillStyle = 'rgba(215, 225, 255, ' + flashAlpha.toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      flashAlpha *= 0.8;
    } else if (flashAlpha !== 0) {
      flashAlpha = 0;
    }
  }

  function loop(now) {
    if (!running) return;
    var dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsed += dt;
    var intensity = intensityAt(elapsed);

    // 同一条强度曲线同时驱动视觉密度与音量/音色
    spawnCarry += intensity * dt * (W / 8.5);
    while (spawnCarry >= 1) { spawnDrop(); spawnCarry -= 1; }

    // 离散雨点"嗒"声:密度随雨强 10~40 次/秒,低 Q 融入雨幕
    plinkCarry += (10 + 30 * intensity) * dt;
    while (plinkCarry >= 1) {
      plinkCarry -= 1;
      playPlink(
        2800 + Math.random() * 3700,
        0.004 + Math.random() * 0.009,
        0.02 + Math.random() * 0.05,
        (Math.random() * 2 - 1) * 0.8,
        1.2
      );
    }

    // 随机远雷:25~90 秒一次,雨越大越容易触发
    if (nextThunderAt === 0) nextThunderAt = elapsed + 18 + Math.random() * 40;
    if (elapsed >= nextThunderAt) {
      if (Math.random() < 0.3 + 0.6 * intensity) playThunder(intensity);
      nextThunderAt = elapsed + 25 + Math.random() * 65;
    }

    draw(dt, intensity);
    updateAudio(intensity);

    rafId = requestAnimationFrame(loop);
  }

  /* ---------- 音频:雨幕底噪 + 离散雨滴 + 远雷 ----------
     底噪只保留低频(去掉电视雪花般的宽频嘶声);
     "清脆感"来自随机调度的短促高频瞬态(滴答声);
     远雷为低通噪声长衰减突发,音量刻意压低。 */

  function initAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();

    // 粉红噪声(Paul Kellet 滤波法):比白噪声柔和,是"助眠雨声"的频谱基础
    var len = audioCtx.sampleRate * 2;
    noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < len; i++) {
      var white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioCtx.destination);

    // 雨幕:粉噪声保留到 ~4kHz 的"沙"声空气感,去掉低频轰隆
    var bedSrc = audioCtx.createBufferSource();
    bedSrc.buffer = noiseBuffer;
    bedSrc.loop = true;
    var bedHP = audioCtx.createBiquadFilter();
    bedHP.type = 'highpass';
    bedHP.frequency.value = 220; // 低频段留给雷声
    bedLowpass = audioCtx.createBiquadFilter();
    bedLowpass.type = 'lowpass';
    bedLowpass.frequency.value = 4200;
    bedLowpass.Q.value = 0.4;
    bedGain = audioCtx.createGain();
    bedGain.gain.value = 0;
    bedSrc.connect(bedHP);
    bedHP.connect(bedLowpass);
    bedLowpass.connect(bedGain);
    bedGain.connect(masterGain);
    bedSrc.start();

    // 淅沥质感:用 ~14Hz 以下的随机低频信号轻微抖动雨幕音量,
    // 让它听起来是"落着的雨"而不是平直的嘶声
    var modSrc = audioCtx.createBufferSource();
    modSrc.buffer = noiseBuffer;
    modSrc.loop = true;
    var modLP = audioCtx.createBiquadFilter();
    modLP.type = 'lowpass';
    modLP.frequency.value = 14;
    bedModDepth = audioCtx.createGain();
    bedModDepth.gain.value = 0;
    modSrc.connect(modLP);
    modLP.connect(bedModDepth);
    bedModDepth.connect(bedGain.gain);
    modSrc.start(0, 0.73); // 错开相位,避免与主源同步
  }

  function updateAudio(intensity) {
    if (!audioCtx || audioCtx.state !== 'running' || !bedGain) return;
    var t = audioCtx.currentTime;
    // 雨越大:雨幕稍强、稍亮;抖动深度跟随底噪基准
    var base = running ? 0.035 + 0.075 * intensity : 0;
    bedGain.gain.setTargetAtTime(base, t, 0.45);
    bedLowpass.frequency.setTargetAtTime(3000 + 2200 * intensity, t, 0.45);
    if (bedModDepth) bedModDepth.gain.setTargetAtTime(base * 2.2, t, 0.45);
  }

  /* 单个雨滴:带通滤波的噪声短突发——听感是雨点打在物面上的"嗒",
     而不是音乐性的"叮咚"。q 越高谐振越明显(水坑滴落用高 q 的"plip")。 */
  function playPlink(freq, peak, decaySec, pan, q) {
    if (!audioCtx || audioCtx.state !== 'running' || !noiseBuffer || activePlinks > 24) return;
    activePlinks++;
    var t = audioCtx.currentTime;
    var src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    var bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q || 1.2;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decaySec);
    var out = g;
    if (audioCtx.createStereoPanner) {
      var p = audioCtx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    out.connect(masterGain);
    src.connect(bp);
    bp.connect(g);
    src.start(t, Math.random() * 1.5, decaySec + 0.05);
    src.onended = function () { activePlinks--; };
  }

  /* 远雷:低通噪声,慢起音 + 长衰减,滤波频率缓慢下扫出"滚雷"感 */
  function playThunder(intensity) {
    if (!audioCtx || audioCtx.state !== 'running' || !noiseBuffer) return;
    var t = audioCtx.currentTime;
    var dur = 3 + Math.random() * 3;
    var src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    var lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(150 + Math.random() * 60, t);
    lp.frequency.exponentialRampToValueAtTime(55, t + dur);
    lp.Q.value = 0.5;
    var g = audioCtx.createGain();
    var peak = 0.02 + 0.02 * intensity; // 刻意压低,不喧宾夺主
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.35 + Math.random() * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(masterGain);
    src.start(t);
    src.stop(t + dur + 0.1);
    // 极淡的一帧画面闪光,与雷声呼应
    flashAlpha = 0.04;
  }

  function resumeAudio() {
    if (!running) return;
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function () {});
    }
  }

  /* 自动播放被拦截时,等首个用户手势再启动雨声 */
  function bindGestureResume() {
    if (gestureBound) return;
    gestureBound = true;
    var handler = function () {
      resumeAudio();
      if (!audioCtx || audioCtx.state === 'running') {
        document.removeEventListener('pointerdown', handler);
        document.removeEventListener('keydown', handler);
        gestureBound = false;
      }
    };
    document.addEventListener('pointerdown', handler);
    document.addEventListener('keydown', handler);
  }

  /* ---------- 开关 ---------- */

  function setEnabled(on) {
    if (on === running) return;
    running = on;

    if (on) {
      if (!canvas) {
        canvas = document.getElementById('rainCanvas');
        if (!canvas) { running = false; return; }
        ctx = canvas.getContext('2d');
        window.addEventListener('resize', resize);
      }
      resize();
      resumeAudio();
      bindGestureResume();
      if (audioCtx && masterGain) {
        masterGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.2);
      }
      if (!reduceMotion) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
      } else if (audioCtx) {
        // 减弱动效:只保留雨声,固定中等强度
        updateAudio(0.5);
      }
    } else {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      drops = []; ripples = []; splashes = [];
      plinkCarry = 0; nextThunderAt = 0; flashAlpha = 0;
      if (ctx) ctx.clearRect(0, 0, W, H);
      if (audioCtx && masterGain) {
        masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
        setTimeout(function () {
          if (!running && audioCtx && audioCtx.state === 'running') audioCtx.suspend();
        }, 900);
      }
    }
  }

  /* 页签隐藏时暂停,可见时恢复 */
  document.addEventListener('visibilitychange', function () {
    if (!running) return;
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
    } else {
      resumeAudio();
      if (!reduceMotion && !rafId) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    }
  });

  return { setEnabled: setEnabled, resumeAudio: resumeAudio };
})();
