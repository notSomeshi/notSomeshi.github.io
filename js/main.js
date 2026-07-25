/**
 * Apple Theme - Main JavaScript
 * 纯原生 JS,零依赖
 * 站内跳转使用 PJAX(fetch + 替换正文),页面不整体重载,
 * 因此雨夜模式的音频与 Canvas 跨页面连续不中断。
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
     2. 回到顶部 / 顶栏阴影 / 阅读进度条
     isPostPage 由 initPage() 按当前页内容刷新
     ========================================== */
  var scrollToTopBtn = document.getElementById('scrollToTop');
  var siteHeader = document.getElementById('siteHeader');
  var progressBar = document.getElementById('readingProgress');
  var isPostPage = false;

  function onScroll() {
    var y = window.scrollY;
    if (scrollToTopBtn) {
      scrollToTopBtn.classList.toggle('is-visible', y > 300);
    }
    if (siteHeader) {
      siteHeader.classList.toggle('is-scrolled', y > 10);
    }
    if (progressBar && isPostPage) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(Math.max(y / max * 100, 0), 100) : 0;
      progressBar.style.width = progress + '%';
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ==========================================
     3. 移动端菜单(事件委托,PJAX 换菜单内容后依然有效)
     ========================================== */
  var mobileMenuToggle = document.getElementById('mobileMenuToggle');
  var mobileNav = document.getElementById('mobileNav');

  function closeMobileNav() {
    if (mobileMenuToggle) mobileMenuToggle.classList.remove('is-active');
    if (mobileNav) mobileNav.classList.remove('is-active');
  }

  if (mobileMenuToggle && mobileNav) {
    mobileMenuToggle.addEventListener('click', function () {
      mobileMenuToggle.classList.toggle('is-active');
      mobileNav.classList.toggle('is-active');
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('.mobile-nav-link')) closeMobileNav();
    });
  }

  /* ==========================================
     4. 站内搜索
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
     5. 封面页(PRESS ANY KEY)
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
     6. 每页初始化(首次载入与每次 PJAX 换页后都会执行)
     ========================================== */
  var pageObservers = [];

  function initPage() {
    // 断开上一页遗留的观察器
    pageObservers.forEach(function (o) { o.disconnect(); });
    pageObservers = [];

    // --- 滚动入场动画 ---
    var animatedElements = document.querySelectorAll('.animate-on-scroll:not(.is-visible)');
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
      pageObservers.push(observer);
    } else {
      animatedElements.forEach(function (el) { el.classList.add('is-visible'); });
    }

    var postBody = document.querySelector('.post-body');
    isPostPage = postBody !== null;
    if (progressBar) {
      progressBar.style.display = isPostPage ? '' : 'none';
      progressBar.style.width = '0';
    }

    if (postBody) {
      // --- 外链新窗口打开 ---
      postBody.querySelectorAll('a[href^="http"]').forEach(function (link) {
        if (!link.getAttribute('target')) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
      });

      // --- 代码块:复制按钮 + 语言标签 ---
      postBody.querySelectorAll('pre').forEach(function (pre) {
        if (pre.parentElement && pre.parentElement.classList.contains('code-block')) return;
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

      // --- 目录滚动高亮 (Scroll Spy) ---
      var tocLinks = document.querySelectorAll('.toc-list-link');
      if (tocLinks.length > 0 && 'IntersectionObserver' in window) {
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
        pageObservers.push(spy);
      }
    }

    initRankings();
    initAdvisor();
    onScroll();
  }

  /* ==========================================
     6.6 选购助手(/advisor/)
     五步问卷 → 规则过滤 + 加权匹配 → 结果卡
     ========================================== */
  function initAdvisor() {
    var app = document.getElementById('advApp');
    if (!app || app.dataset.ready) return;
    app.dataset.ready = '1';

    var DATA;
    try {
      DATA = JSON.parse(document.getElementById('advisorData').textContent);
    } catch (e) { return; }

    var PLANS = DATA.plans;

    // 用途 → 能力维度键
    var QUESTIONS = [
      {
        id: 'use', multi: true, title: '你主要拿 AI 做什么?', hint: '可多选,决定看重哪方面能力',
        options: [
          { v: 'coding', label: '写代码 / 做网站或 App', desc: '编程、调试、重构' },
          { v: 'writing', label: '写文章、报告、邮件', desc: '内容创作与润色' },
          { v: 'research', label: '查资料、读论文或长文档', desc: '检索、总结、理解长文' },
          { v: 'data', label: '做表格、分析数据、画图表', desc: '数据处理与可视化' },
          { v: 'daily', label: '日常问答、学习、翻译', desc: '通用助手' }
        ]
      },
      {
        id: 'usage', title: '你大概每天用多久?', hint: '这一问最关键——它决定你需要多大的额度',
        options: [
          { v: 'light', label: '偶尔用一下', desc: '每周几次,每次几个问题' },
          { v: 'medium', label: '每天用一会儿', desc: '半小时以内' },
          { v: 'heavy', label: '每天离不开', desc: '几个小时,是主力工具' },
          { v: 'extreme', label: '挂着让它自动干活', desc: '长任务代理,一跑几小时' }
        ]
      },
      {
        id: 'rhythm', title: '你的使用节奏是哪种?', hint: '这决定「包月」还是「按量」更划算',
        options: [
          { v: 'steady', label: '每天都用,比较平均', desc: '天天要干活,用量稳定' },
          { v: 'burst', label: '阶段性集中猛用', desc: '几天赶一个大项目,之后闲很久' },
          { v: 'occasional', label: '想起来才用', desc: '没有规律,偶尔一次' }
        ]
      },
      {
        id: 'region', title: '你主要在哪用?', hint: '影响是否需要代理',
        options: [
          { v: 'cn', label: '国内网络为主', desc: '希望直连、不折腾' },
          { v: 'global', label: '海外 / 有稳定代理', desc: '不受限制' },
          { v: 'any', label: '都行', desc: '不作为筛选条件' }
        ]
      },
      {
        id: 'prefs', multi: true, optional: true, title: '有什么特别在意的?', hint: '可多选,也可以跳过',
        options: [
          { v: 'chinese', label: '中文表现要好' },
          { v: 'openweight', label: '要能自己部署 / 数据不外传' },
          { v: 'ide', label: '要有编辑器插件(写代码用)' },
          { v: 'multimodal', label: '要能处理图片、视频' },
          { v: 'longdoc', label: '要能读超长文档' }
        ]
      }
    ];

    // 用量档 → 月 token 量级
    var USAGE_TOKENS = { light: 8000000, medium: 30000000, heavy: 120000000, extreme: 350000000 };
    var USAGE_LABEL = { light: '轻度', medium: '中度', heavy: '重度', extreme: '极重度' };

    var state = { step: 0, answers: {}, calcTokens: null };

    var quizEl = document.getElementById('advQuiz');
    var resultEl = document.getElementById('advResult');
    var calcEl = document.getElementById('advCalc');
    var barEl = document.getElementById('advProgressBar');
    var textEl = document.getElementById('advProgressText');

    // 恢复上次作答
    try {
      var saved = sessionStorage.getItem('bv-advisor');
      if (saved) state.answers = JSON.parse(saved) || {};
    } catch (e) {}

    function save() {
      try { sessionStorage.setItem('bv-advisor', JSON.stringify(state.answers)); } catch (e) {}
    }

    function updateProgress() {
      var pct = Math.min(100, (state.step / QUESTIONS.length) * 100);
      barEl.style.width = pct + '%';
      textEl.textContent = state.step >= QUESTIONS.length
        ? '完成'
        : ('0' + (state.step + 1)).slice(-2) + ' / 0' + QUESTIONS.length;
    }

    function renderQuestion() {
      updateProgress();
      if (state.step >= QUESTIONS.length) {
        quizEl.innerHTML = '';
        calcEl.hidden = false;
        renderResult();
        return;
      }
      calcEl.hidden = true;
      resultEl.hidden = true;

      var q = QUESTIONS[state.step];
      var cur = state.answers[q.id];
      var html = '<div class="adv-q">' +
        '<p class="adv-q-index">Q' + (state.step + 1) + '</p>' +
        '<h2 class="adv-q-title">' + q.title + '</h2>' +
        '<p class="adv-q-hint">' + q.hint + '</p>' +
        '<div class="adv-opts">';

      q.options.forEach(function (o) {
        var active = q.multi
          ? (cur || []).indexOf(o.v) !== -1
          : cur === o.v;
        html += '<button type="button" class="adv-opt' + (active ? ' is-on' : '') + '" data-v="' + o.v + '">' +
          '<span class="adv-opt-label">' + o.label + '</span>' +
          (o.desc ? '<span class="adv-opt-desc">' + o.desc + '</span>' : '') +
          '</button>';
      });

      html += '</div><div class="adv-nav">' +
        (state.step > 0 ? '<button type="button" class="adv-btn adv-back">← 上一题</button>' : '') +
        (q.multi || q.optional ? '<button type="button" class="adv-btn adv-next">' + (q.optional ? '跳过 / 下一步 →' : '下一步 →') + '</button>' : '') +
        '</div></div>';

      quizEl.innerHTML = html;

      quizEl.querySelectorAll('.adv-opt').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var raw = btn.dataset.v;
          var val = /^\d+$/.test(raw) ? +raw : raw;
          if (q.multi) {
            var arr = state.answers[q.id] || [];
            var i = arr.indexOf(val);
            if (i === -1) { arr.push(val); } else { arr.splice(i, 1); }
            state.answers[q.id] = arr;
            btn.classList.toggle('is-on');
            save();
          } else {
            state.answers[q.id] = val;
            save();
            state.step++;
            renderQuestion();
          }
        });
      });

      var backBtn = quizEl.querySelector('.adv-back');
      if (backBtn) backBtn.addEventListener('click', function () { state.step--; renderQuestion(); });
      var nextBtn = quizEl.querySelector('.adv-next');
      if (nextBtn) nextBtn.addEventListener('click', function () { state.step++; renderQuestion(); });
    }

    /* ---------- 费用计算 ----------
       按量付费:按输入 70% / 输出 30% 的典型比例估算实际月账单
       订阅制:固定月费 */
    function monthlyCost(plan, need) {
      if (!plan.payg) return plan.price;
      var mTok = need / 1000000;
      return mTok * (plan.priceIn * 0.7 + plan.priceOut * 0.3);
    }

    function fmtCost(c) {
      if (c === 0) return '免费';
      if (c < 1) return '< $1';
      return '$' + (c < 10 ? c.toFixed(1) : Math.round(c));
    }

    /* ---------- 推荐算法 ---------- */
    function score(plan) {
      var a = state.answers;
      var reasons = [], why = [];

      // 硬性过滤(不再按预算过滤——费用在结果里如实列出,由用户自己权衡)
      if (a.region === 'cn' && plan.tags.indexOf('cn-direct') === -1) return null;
      var prefs = a.prefs || [];
      if (prefs.indexOf('openweight') !== -1 && plan.tags.indexOf('openweight') === -1) return null;

      var need = state.calcTokens || USAGE_TOKENS[a.usage] || 30000000;
      var rhythm = a.rhythm || 'steady';
      var cost = monthlyCost(plan, need);

      // 1) 用量与节奏匹配 40 分
      var quotaScore, ratio = need / plan.tokens;
      if (plan.payg) {
        // 按量付费:没有窗口限制,爆发期不会被卡;闲置期不花钱
        if (rhythm === 'burst') {
          quotaScore = 40;
          why.push('没有额度窗口限制,爆发期可以连续猛跑不被卡');
        } else if (rhythm === 'occasional') {
          quotaScore = 38;
          why.push('不用时一分钱不花,偶尔用最划算');
        } else {
          quotaScore = 30;
          reasons.push('每天稳定使用的话,包月订阅通常比按量更省');
        }
      } else if (ratio > 1.15) {
        quotaScore = Math.max(4, 40 - (ratio - 1) * 45);
        reasons.push('额度可能不够用,月中容易撞墙');
      } else if (ratio >= 0.55) {
        quotaScore = 40;
        why.push('额度与你的用量高度匹配,几乎不浪费');
      } else if (ratio >= 0.2) {
        // 额度充裕本身不是缺点(是否"买贵了"由下面的单位成本项判断)
        quotaScore = 38;
        why.push('额度充裕,还有很大余量');
      } else {
        quotaScore = 30;
        reasons.push('额度远超你的需要,如果不打算加量,买小一档更划算');
      }

      // 节奏修正:订阅制在爆发/偶尔使用场景下有结构性缺陷
      if (!plan.payg && plan.price > 0) {
        if (rhythm === 'burst') {
          // 小额度订阅在爆发期会被 5 小时窗口卡住;大额度订阅反而是爆发期的稳妥选择
          if (plan.tokens < 100000000) {
            quotaScore -= 10;
            reasons.push('爆发期集中猛用时,额度窗口容易把你卡住');
          } else {
            quotaScore += 6;
            why.push('额度大,爆发期扛得住,且月费固定不会超支');
          }
        } else if (rhythm === 'occasional') {
          quotaScore -= 8;
          reasons.push('不用的月份月费照扣');
        }
      }

      // 2) 能力匹配 30 分
      var uses = (a.use && a.use.length) ? a.use : ['daily'];
      var capSum = 0;
      uses.forEach(function (u) { capSum += (plan.caps[u] || 60); });
      var capAvg = capSum / uses.length;
      var capScore = (capAvg / 100) * 30;
      if (capAvg >= 85) why.push('在你选的用途上是第一梯队水平');
      else if (capAvg < 65) reasons.push('在你选的用途上只能算够用');

      // 3) 花得值不值 20 分:实际月费 ÷ 你的用量
      var effPrice = cost > 0 ? cost / (need / 1000000) : 0;
      var costScore;
      if (cost === 0) { costScore = 20; why.push('完全免费'); }
      else if (effPrice <= 0.2) { costScore = 20; why.push('单位成本极低,同等花费下用量最大'); }
      else if (effPrice <= 0.6) costScore = 16;
      else if (effPrice <= 1.5) costScore = 11;
      else if (effPrice <= 4) costScore = 6;
      else { costScore = 2; reasons.push('单位成本偏高,预算敏感的话要算清楚'); }

      // 4) 偏好加成 10 分
      var prefHit = 0;
      prefs.forEach(function (p) { if (plan.tags.indexOf(p) !== -1) prefHit++; });
      var prefScore = prefs.length ? (prefHit / prefs.length) * 10 : 7;
      if (prefs.length && prefHit === prefs.length) why.push('满足你提出的全部特殊要求');

      return {
        plan: plan,
        total: Math.round(Math.max(0, quotaScore) + capScore + costScore + prefScore),
        why: why,
        cons: reasons.concat([plan.cons]),
        need: need,
        cost: cost,
        effPrice: effPrice
      };
    }

    function fmtTok(n) {
      if (n >= 100000000) return (n / 100000000).toFixed(1) + ' 亿';
      return Math.round(n / 10000) + ' 万';
    }

    function brandIco(b) { return '<span class="rk-ico b-' + b + '"></span>'; }

    function renderResult() {
      var ranked = PLANS.map(score).filter(Boolean).sort(function (x, y) { return y.total - x.total; });
      resultEl.hidden = false;

      if (!ranked.length) {
        resultEl.innerHTML = '<div class="adv-empty">// 没有完全符合条件的方案——通常是「预算太低 + 要求太多」。试试放宽预算,或取消「必须自己部署」这类硬性要求。</div>';
        return;
      }

      var top = ranked[0], alts = ranked.slice(1, 4);
      var a = state.answers;
      var RHYTHM_LABEL = { steady: '每天稳定使用', burst: '阶段性集中猛用', occasional: '想起来才用' };

      function priceTag(r) {
        if (r.plan.payg) return '按量付费 · 预估 ' + fmtCost(r.cost) + '/月';
        if (r.plan.price === 0) return '免费';
        return '$' + r.plan.price + ' / 月';
      }

      var html = '<div class="adv-card adv-card-top">' +
        '<div class="adv-card-badge">⭐ 最推荐</div>' +
        '<div class="adv-card-head">' + brandIco(top.plan.brand) +
          '<div><a class="adv-card-name" href="' + top.plan.url + '" target="_blank" rel="noopener">' +
          top.plan.platform + ' ' + top.plan.tier + '</a>' +
          '<span class="adv-card-price">' + priceTag(top) + '</span></div>' +
          '<div class="adv-match"><svg viewBox="0 0 36 36" class="adv-ring"><path class="adv-ring-bg" d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31"/>' +
          '<path class="adv-ring-fg" style="stroke-dasharray:' + top.total + ',100" d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31"/></svg>' +
          '<span class="adv-match-num">' + top.total + '</span><span class="adv-match-label">匹配</span></div>' +
        '</div>' +
        '<div class="adv-card-body">' +
          '<div class="adv-block"><p class="adv-block-title">// 为什么是它</p><ul>' +
            top.why.map(function (w) { return '<li>' + w + '</li>'; }).join('') +
            '<li>额度:' + top.plan.quota + '</li>' +
            '<li>可用模型:' + top.plan.models + '</li>' +
          '</ul></div>' +
          '<div class="adv-block adv-block-warn"><p class="adv-block-title">// 你可能牺牲了</p><ul>' +
            top.cons.slice(0, 3).map(function (c) { return '<li>' + c + '</li>'; }).join('') +
          '</ul></div>' +
        '</div></div>';

      if (alts.length) {
        html += '<p class="adv-alts-title">// 其他值得考虑的方案</p><div class="adv-alts">';
        alts.forEach(function (r) {
          html += '<div class="adv-card adv-card-alt">' +
            '<div class="adv-card-head">' + brandIco(r.plan.brand) +
              '<div><a class="adv-card-name" href="' + r.plan.url + '" target="_blank" rel="noopener">' +
              r.plan.platform + ' ' + r.plan.tier + '</a>' +
              '<span class="adv-card-price">' + priceTag(r) + '</span></div>' +
              '<span class="adv-alt-match">' + r.total + '</span>' +
            '</div>' +
            '<p class="adv-alt-note">' + (r.why[0] || r.plan.quota) + '</p>' +
            '<p class="adv-alt-con">但:' + r.cons[0] + '</p>' +
          '</div>';
        });
        html += '</div>';
      }

      /* ---- 花费一览表(用户要求:费用集中列在最后) ---- */
      var listed = ranked.slice(0, 6);
      var cheapest = listed.reduce(function (m, r) { return r.cost < m.cost ? r : m; }, listed[0]);

      html += '<div class="adv-costs">' +
        '<p class="adv-costs-title">// 大约要花多少钱</p>' +
        '<p class="adv-costs-sub">按你的用量(<strong>' + fmtTok(top.need) + ' token/月</strong>,' +
          (state.calcTokens ? '按自测估算' : USAGE_LABEL[a.usage] + '档') + ' · ' + (RHYTHM_LABEL[a.rhythm] || '') +
          ')估算。<strong>订阅制</strong>是固定月费,用不完不退、用超了要等额度重置;<strong>按量付费</strong>没有月费,账单随实际用量浮动——下面按你的用量算出的是预估值。</p>' +
        '<table class="adv-costs-table"><thead><tr>' +
          '<th>方案</th><th>计费方式</th><th>预估月花费</th><th>说明</th>' +
        '</tr></thead><tbody>';

      listed.forEach(function (r) {
        var isTop = r === top;
        var isCheap = r === cheapest && r.cost > 0;
        html += '<tr' + (isTop ? ' class="is-top"' : '') + '>' +
          '<td class="adv-ct-name">' + brandIco(r.plan.brand) +
            '<a href="' + r.plan.url + '" target="_blank" rel="noopener">' + r.plan.platform + ' ' + r.plan.tier + '</a>' +
            (isTop ? '<em class="adv-ct-flag">最推荐</em>' : '') +
            (isCheap && !isTop ? '<em class="adv-ct-flag adv-ct-cheap">最省</em>' : '') +
          '</td>' +
          '<td>' + (r.plan.payg ? '按量付费' : (r.plan.price === 0 ? '免费' : '订阅制')) + '</td>' +
          '<td class="adv-ct-cost">' + fmtCost(r.cost) +
            (r.plan.payg ? '<em>用多少付多少</em>' : (r.plan.price > 0 ? '<em>固定月费</em>' : '')) + '</td>' +
          '<td class="adv-ct-note">' + (r.plan.payg
            ? '按 $' + r.plan.priceIn + ' 输入 / $' + r.plan.priceOut + ' 输出每百万 token,以 7:3 混合比估算'
            : r.plan.quota) + '</td>' +
        '</tr>';
      });

      html += '</tbody></table>';

      // 订阅 vs 按量 的直接对比提示(只比较额度真能覆盖用量的订阅,避免推荐会撞墙的方案)
      var subs = listed.filter(function (r) {
        return !r.plan.payg && r.plan.price > 0 && r.plan.tokens >= r.need;
      });
      var paygs = listed.filter(function (r) { return r.plan.payg; });
      if (subs.length && paygs.length) {
        var cheapSub = subs.reduce(function (m, r) { return r.cost < m.cost ? r : m; }, subs[0]);
        var cheapPayg = paygs.reduce(function (m, r) { return r.cost < m.cost ? r : m; }, paygs[0]);
        var diff = Math.abs(cheapSub.cost - cheapPayg.cost);
        if (cheapPayg.cost < cheapSub.cost * 0.75) {
          html += '<p class="adv-save">💡 你的用量下,<strong>' + cheapPayg.plan.platform +
            ' 按量付费(约 ' + fmtCost(cheapPayg.cost) + ')比最便宜的订阅(' + cheapSub.plan.platform + ' ' +
            fmtCost(cheapSub.cost) + ')还省约 $' + Math.round(diff) + '/月</strong>——用量不大或不规律时,不必买会员。</p>';
        } else if (cheapSub.cost < cheapPayg.cost * 0.75) {
          html += '<p class="adv-save">💡 你的用量下,<strong>' + cheapSub.plan.platform + ' ' + cheapSub.plan.tier +
            '(' + fmtCost(cheapSub.cost) + '/月)比按量付费省约 $' + Math.round(diff) +
            '/月</strong>——用量够大时,包月把成本封顶更划算。</p>';
        }
      } else if (top.cost === 0) {
        html += '<p class="adv-save">💡 你的用量完全在免费额度内,<strong>不必付费</strong>。</p>';
      }

      html += '<p class="adv-warn">⚠ 花费为按公开定价的估算,实际账单受输入/输出比例、缓存命中、错峰折扣影响,可能有较大出入。' +
        'Claude Sonnet 5 现为促销价($2/$10),2026-08-31 后涨至 $3/$15;新发布的 Claude Opus 5 为 $5/$25。各家价格随时变动,请以官网为准。</p>' +
        '</div>';

      // 用量 vs 额度对比图
      html += '<div class="adv-chart"><p class="adv-chart-title">// 你的用量 vs 各方案额度</p>' +
        '<p class="adv-chart-sub">你的预估用量:<strong>' + fmtTok(top.need) + ' token/月</strong>(' +
        (state.calcTokens ? '按自测估算' : USAGE_LABEL[a.usage] + '档') + ')。柱子越长额度越大,黄色虚线是你的用量位置——' +
        '<strong>柱子没到线(标红)就会撞墙</strong>,远超线则是花钱买了用不上的额度;<strong>灰底柱</strong>为按量付费方案(无额度上限,右侧为预估账单)。</p>';

      var maxTok = 500000000;
      var needPct = Math.min(100, (top.need / maxTok) * 100);
      html += '<div class="adv-chart-body" style="--need:' + needPct + '%">';
      ranked.slice(0, 8).forEach(function (r) {
        var isPayg = r.plan.payg;
        var w = isPayg ? 100 : Math.min(100, (r.plan.tokens / maxTok) * 100);
        var enough = isPayg || r.plan.tokens >= r.need;
        html += '<div class="adv-crow">' + brandIco(r.plan.brand) +
          '<span class="adv-cname">' + r.plan.platform + ' ' + r.plan.tier + '</span>' +
          '<div class="adv-cbar"><i class="' + (enough ? '' : 'is-short') + (isPayg ? ' is-payg' : '') + '" style="--w:' + w + '%"></i></div>' +
          '<span class="adv-cprice">' + fmtCost(r.cost) + '</span>' +
          '</div>';
      });
      html += '<div class="adv-needline"><span>你的用量</span></div></div></div>';

      html += '<div class="adv-actions">' +
        '<button type="button" class="adv-btn adv-restart">↺ 重新测一次</button>' +
        '<a class="adv-btn adv-tolist" href="/rankings/">查看完整对照表 →</a>' +
        '</div>';

      resultEl.innerHTML = html;

      var rs = resultEl.querySelector('.adv-restart');
      if (rs) rs.addEventListener('click', function () {
        state.step = 0; state.answers = {}; state.calcTokens = null;
        try { sessionStorage.removeItem('bv-advisor'); } catch (e) {}
        renderQuestion();
        app.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    /* ---------- 用量自测(第二期) ---------- */
    var CALC_ROWS = [
      { id: 'chat', label: '每天问答/对话', unit: '条', per: 3000, def: 0, hint: '一问一答约 3 千 token' },
      { id: 'code', label: '每周让 AI 改代码', unit: '次', per: 120000, def: 0, hint: '一次多文件修改约 12 万' },
      { id: 'agent', label: '每周长任务(挂着自动干)', unit: '次', per: 900000, def: 0, hint: '一次长任务约 90 万' },
      { id: 'doc', label: '每周读长文档/论文', unit: '篇', per: 60000, def: 0, hint: '一篇长文约 6 万' },
      { id: 'write', label: '每周写长文/报告', unit: '篇', per: 25000, def: 0, hint: '一篇含多轮修改约 2.5 万' }
    ];

    var calcToggle = document.getElementById('advCalcToggle');
    var calcBody = document.getElementById('advCalcBody');
    var calcRows = document.getElementById('advCalcRows');
    var calcResult = document.getElementById('advCalcResult');

    if (calcToggle) {
      calcToggle.addEventListener('click', function () {
        var open = !calcBody.hidden;
        calcBody.hidden = open;
        calcToggle.textContent = open ? '展开' : '收起';
        if (!open && !calcRows.innerHTML) buildCalc();
      });
    }

    function buildCalc() {
      calcRows.innerHTML = CALC_ROWS.map(function (r) {
        return '<label class="adv-calc-row"><span class="adv-calc-label">' + r.label +
          '<em>' + r.hint + '</em></span>' +
          '<input type="number" min="0" step="1" value="' + r.def + '" data-calc="' + r.id + '">' +
          '<span class="adv-calc-unit">' + r.unit + '</span></label>';
      }).join('');

      calcRows.addEventListener('input', recalc);
      recalc();
    }

    function recalc() {
      var total = 0;
      CALC_ROWS.forEach(function (r) {
        var el = calcRows.querySelector('[data-calc="' + r.id + '"]');
        var n = Math.max(0, +(el && el.value) || 0);
        // 每天的 ×30,每周的 ×4.3
        var monthly = r.id === 'chat' ? n * 30 : n * 4.3;
        total += monthly * r.per;
      });
      if (total <= 0) {
        state.calcTokens = null;
        calcResult.innerHTML = '<span class="adv-calc-empty">// 全部留空 → 使用问卷里的粗略档位</span>';
      } else {
        state.calcTokens = Math.round(total);
        calcResult.innerHTML = '估算用量:<strong>' + fmtTok(total) + ' token / 月</strong>' +
          '<button type="button" class="adv-btn adv-recalc">用这个数字重算推荐 →</button>';
        var btn = calcResult.querySelector('.adv-recalc');
        if (btn) btn.addEventListener('click', function () {
          renderResult();
          resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }

    renderQuestion();
  }

  /* ==========================================
     6.5 模型天梯页(/rankings/)
     数据在页面内的 JSON 岛,渲染/筛选/加权/FLIP 动画在此
     ========================================== */
  function initRankings() {
    var app = document.getElementById('rankingsApp');
    if (!app || app.dataset.ready) return;
    app.dataset.ready = '1';

    var DATA;
    try {
      DATA = JSON.parse(document.getElementById('rankingsData').textContent);
    } catch (e) { return; }

    var INSTS = DATA.institutions;
    var DIMS = DATA.dimensions;
    var instKeys = Object.keys(INSTS);

    var state = { dim: 'overall', query: '', sortBy: 'composite', enabled: {}, weights: {} };
    instKeys.forEach(function (k) {
      state.enabled[k] = true;
      state.weights[k] = DATA.defaultWeights[k] || 25;
    });

    var dimsEl = document.getElementById('rkDims');
    var instsEl = document.getElementById('rkInsts');
    var headEl = document.getElementById('rkHead');
    var bodyEl = document.getElementById('rkBody');
    var emptyEl = document.getElementById('rkEmpty');
    var searchEl = document.getElementById('rkSearch');

    function metricOf(inst) { return DIMS[state.dim].metrics[inst]; }

    function rawScore(model, inst) {
      var mk = metricOf(inst);
      if (!mk) return null;
      var s = model.scores[inst];
      return (s && s[mk] != null) ? s[mk] : null;
    }

    function activeInsts() {
      return instKeys.filter(function (k) { return state.enabled[k] && metricOf(k); });
    }

    function compute() {
      var act = activeInsts();
      // 每项机构得分在全部 20 个模型内做 min-max 归一化
      var range = {};
      act.forEach(function (k) {
        var vals = DATA.models
          .map(function (m) { return rawScore(m, k); })
          .filter(function (v) { return v != null; });
        range[k] = { min: Math.min.apply(null, vals), max: Math.max.apply(null, vals) };
      });

      var rows = DATA.models.map(function (m) {
        var cells = {}, wSum = 0, acc = 0, covered = 0;
        act.forEach(function (k) {
          var v = rawScore(m, k);
          if (v == null) { cells[k] = null; return; }
          var r = range[k];
          var norm = r.max > r.min ? (v - r.min) / (r.max - r.min) * 100 : 100;
          cells[k] = { raw: v, norm: norm };
          // 缺失项不计权重:按可用项重新归一
          wSum += state.weights[k];
          acc += norm * state.weights[k];
          covered++;
        });
        return {
          model: m, cells: cells,
          composite: wSum > 0 ? acc / wSum : null,
          coverage: covered, total: act.length
        };
      });

      var q = state.query.trim().toLowerCase();
      if (q) {
        rows = rows.filter(function (r) {
          return (r.model.name + ' ' + r.model.vendor).toLowerCase().indexOf(q) !== -1;
        });
      }

      rows.sort(function (a, b) {
        if (state.sortBy === 'composite') return (b.composite || -1) - (a.composite || -1);
        var av = a.cells[state.sortBy], bv = b.cells[state.sortBy];
        return (bv ? bv.norm : -1) - (av ? av.norm : -1);
      });

      return { rows: rows, act: act };
    }

    function fmt(inst, v) {
      return inst === 'arena' ? String(Math.round(v)) : v.toFixed(1);
    }

    /* 厂商徽章:本地化的官方 logo(见 /img/brands/),字母兜底 */
    var VENDOR_META = {
      'Anthropic': ['anthropic', 'A'],
      'OpenAI': ['openai', 'O'],
      'Google': ['google', 'G'],
      'Moonshot': ['moonshot', 'K'],
      'xAI': ['xai', 'X'],
      'DeepSeek': ['deepseek', 'D'],
      'Alibaba': ['qwen', 'Q'],
      'MiniMax': ['minimax', 'MX'],
      'Z.ai': ['zai', 'Z'],
      'Mistral': ['mistral', 'M']
    };

    function icoHtml(vendor) {
      var meta = VENDOR_META[vendor];
      if (!meta) return '';
      return '<span class="rk-ico b-' + meta[0] + '">' + meta[1] + '</span>';
    }

    function render(animate) {
      var res = compute();
      var act = res.act;

      // FLIP 第一步:记录每行旧位置
      var prev = {};
      if (animate) {
        bodyEl.querySelectorAll('tr[data-id]').forEach(function (tr) {
          prev[tr.dataset.id] = tr.getBoundingClientRect().top;
        });
      }

      var h = '<tr><th class="rk-col-rank">#</th><th class="rk-col-model">模型</th>';
      act.forEach(function (k) {
        h += '<th class="rk-sortable' + (state.sortBy === k ? ' is-sorted' : '') + '" data-sort="' + k + '">' +
          INSTS[k].short + '<span class="rk-unit">' + INSTS[k].unit + '</span></th>';
      });
      h += '<th class="rk-sortable rk-col-comp' + (state.sortBy === 'composite' ? ' is-sorted' : '') + '" data-sort="composite">综合分<span class="rk-unit">0-100</span></th>' +
        '<th class="rk-col-cov">覆盖</th></tr>';
      headEl.innerHTML = h;

      bodyEl.innerHTML = res.rows.map(function (r, i) {
        var m = r.model;
        var cellsHtml = act.map(function (k) {
          var c = r.cells[k];
          if (!c) return '<td class="rk-miss" title="该机构暂未收录此模型">—</td>';
          return '<td><span class="rk-raw">' + fmt(k, c.raw) + '</span><span class="rk-norm">' + c.norm.toFixed(0) + '</span></td>';
        }).join('');
        var comp = r.composite == null ? '—' : r.composite.toFixed(1);
        return '<tr data-id="' + m.id + '">' +
          '<td class="rk-col-rank">' + (i + 1 < 10 ? '0' + (i + 1) : i + 1) + '</td>' +
          '<td class="rk-col-model"><span class="rk-mwrap">' + icoHtml(m.vendor) + '<span>' +
            '<a class="rk-model-link" href="' + m.url + '" target="_blank" rel="noopener">' + m.name + '</a>' +
            '<span class="rk-vendor">' + m.vendor + (m.open ? ' · <em class="rk-open">开源权重</em>' : '') + '</span>' +
          '</span></span></td>' +
          cellsHtml +
          '<td class="rk-col-comp"><div class="rk-bar"><i style="width:' + (r.composite || 0) + '%"></i></div><span class="rk-comp-num">' + comp + '</span></td>' +
          '<td class="rk-col-cov">' + r.coverage + '/' + r.total + '</td>' +
          '</tr>';
      }).join('');
      emptyEl.hidden = res.rows.length > 0;

      // FLIP 第二步:从旧位置平滑滑入新位置;新出现的行淡入
      if (animate) {
        bodyEl.querySelectorAll('tr[data-id]').forEach(function (tr) {
          var was = prev[tr.dataset.id];
          if (was == null) {
            tr.style.opacity = '0';
            requestAnimationFrame(function () {
              tr.style.transition = 'opacity 0.3s ease';
              tr.style.opacity = '1';
            });
            return;
          }
          var dy = was - tr.getBoundingClientRect().top;
          if (dy) {
            tr.style.transform = 'translateY(' + dy + 'px)';
            tr.style.transition = 'none';
            requestAnimationFrame(function () {
              tr.style.transition = 'transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)';
              tr.style.transform = '';
            });
          }
        });
      }
    }

    function renderInsts() {
      instsEl.innerHTML = instKeys.map(function (k) {
        var has = !!metricOf(k);
        return '<div class="rk-inst' + (has ? '' : ' is-na') + '">' +
          '<input type="checkbox" data-inst="' + k + '"' + (state.enabled[k] ? ' checked' : '') + (has ? '' : ' disabled') + ' aria-label="启用 ' + INSTS[k].name + '">' +
          '<a href="' + INSTS[k].url + '" target="_blank" rel="noopener" class="rk-inst-name">' + INSTS[k].name + '</a>' +
          (has
            ? '<input type="range" min="0" max="100" step="5" value="' + state.weights[k] + '" data-weight="' + k + '" class="rk-weight"' + (state.enabled[k] ? '' : ' disabled') + ' aria-label="' + INSTS[k].name + ' 权重">' +
              '<span class="rk-weight-num" data-wnum="' + k + '">' + state.weights[k] + '</span>'
            : '<span class="rk-inst-na">该维度无评分</span>') +
          '</div>';
      }).join('');
    }

    // 维度切换
    dimsEl.innerHTML = Object.keys(DIMS).map(function (d) {
      return '<button type="button" class="rk-dim' + (d === state.dim ? ' is-active' : '') + '" data-dim="' + d + '">' + DIMS[d].label + '</button>';
    }).join('');
    dimsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.rk-dim');
      if (!btn || btn.dataset.dim === state.dim) return;
      state.dim = btn.dataset.dim;
      dimsEl.querySelectorAll('.rk-dim').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      if (state.sortBy !== 'composite' && !DIMS[state.dim].metrics[state.sortBy]) {
        state.sortBy = 'composite';
      }
      renderInsts();
      render(true);
    });

    // 机构启用/停用
    instsEl.addEventListener('change', function (e) {
      var cb = e.target.closest('input[type="checkbox"]');
      if (!cb) return;
      state.enabled[cb.dataset.inst] = cb.checked;
      if (state.sortBy === cb.dataset.inst && !cb.checked) state.sortBy = 'composite';
      renderInsts();
      render(true);
    });

    // 权重滑杆
    instsEl.addEventListener('input', function (e) {
      var sl = e.target.closest('input[type="range"]');
      if (!sl) return;
      state.weights[sl.dataset.weight] = +sl.value;
      var num = instsEl.querySelector('[data-wnum="' + sl.dataset.weight + '"]');
      if (num) num.textContent = sl.value;
      render(true);
    });

    // 列头排序
    headEl.addEventListener('click', function (e) {
      var th = e.target.closest('.rk-sortable');
      if (!th || th.dataset.sort === state.sortBy) return;
      state.sortBy = th.dataset.sort;
      render(true);
    });

    // 搜索
    searchEl.addEventListener('input', function () {
      state.query = searchEl.value;
      render(true);
    });

    renderInsts();
    render(false);

    /* --- 板块切换(能力天梯 / 订阅性价比) --- */
    var boardTabs = document.querySelectorAll('.rk-board-tab');
    var boards = document.querySelectorAll('.rk-board');
    boardTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (tab.classList.contains('is-active')) return;
        boardTabs.forEach(function (t) { t.classList.toggle('is-active', t === tab); });
        boards.forEach(function (b) {
          b.classList.toggle('is-active', b.dataset.board === tab.dataset.board);
        });
      });
    });

    /* --- 平台悬停解析卡(共享浮层,fixed 定位避免被滚动容器裁剪) --- */
    var tipCard = document.getElementById('rkTipCard');
    if (!tipCard) {
      tipCard = document.createElement('div');
      tipCard.id = 'rkTipCard';
      tipCard.className = 'rk-tipcard';
      tipCard.hidden = true;
      document.body.appendChild(tipCard);
    }

    function showTip(plat) {
      var html = plat.querySelector('.rk-tip-html');
      if (!html) return;
      tipCard.innerHTML = html.innerHTML;
      tipCard.hidden = false;
      var r = plat.getBoundingClientRect();
      var cw = Math.min(340, window.innerWidth - 24);
      tipCard.style.width = cw + 'px';
      tipCard.style.left = Math.min(Math.max(12, r.left), window.innerWidth - cw - 12) + 'px';
      var top = r.top - tipCard.offsetHeight - 10;
      if (top < 64) top = r.bottom + 10; // 顶部放不下就放到下方
      tipCard.style.top = top + 'px';
      tipCard.getBoundingClientRect(); // 强制回流,确保过渡从初始态开始
      tipCard.classList.add('is-visible');
    }

    function hideTip() {
      tipCard.classList.remove('is-visible');
      tipCard.hidden = true;
    }

    document.querySelectorAll('.rk-plat').forEach(function (plat) {
      plat.addEventListener('mouseenter', function () { showTip(plat); });
      plat.addEventListener('mouseleave', hideTip);
      plat.addEventListener('focus', function () { showTip(plat); });
      plat.addEventListener('blur', hideTip);
    });

    /* --- Excel 式列宽拖拽(订阅性价比表) --- */
    var priceTable = document.querySelector('.rk-price-table');
    if (priceTable) {
      var priceCols = priceTable.querySelectorAll('colgroup col');

      function colW(col) {
        return parseInt(col.style.width || col.getAttribute('width'), 10) || 150;
      }

      function syncTableWidth() {
        var sum = 0;
        priceCols.forEach(function (c) { sum += colW(c); });
        priceTable.style.width = sum + 'px';
      }

      priceTable.querySelectorAll('thead th').forEach(function (th, i) {
        var col = priceCols[i];
        if (!col) return;
        var grip = document.createElement('span');
        grip.className = 'rk-resizer';
        th.appendChild(grip);
        grip.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          var startX = e.clientX;
          var startW = colW(col);
          grip.classList.add('is-dragging');
          try { grip.setPointerCapture(e.pointerId); } catch (err) {}
          var move = function (ev) {
            col.style.width = Math.max(90, startW + (ev.clientX - startX)) + 'px';
            syncTableWidth();
          };
          var up = function () {
            grip.classList.remove('is-dragging');
            grip.removeEventListener('pointermove', move);
            grip.removeEventListener('pointerup', up);
            grip.removeEventListener('pointercancel', up);
          };
          grip.addEventListener('pointermove', move);
          grip.addEventListener('pointerup', up);
          grip.addEventListener('pointercancel', up);
        });
      });

      syncTableWidth();
    }
  }

  /* ==========================================
     7. PJAX 无刷新导航:站内链接 fetch 换正文,
     AudioContext / 雨幕 Canvas 全程存活,雨声不断
     ========================================== */
  var pjaxContainer = document.querySelector('.main-content');

  // 加载反馈:顶部黄色扫动条 + 正文降透明度,消除"点了没反应"的错觉
  var pjaxBar = document.createElement('div');
  pjaxBar.className = 'pjax-bar';
  document.body.appendChild(pjaxBar);

  function setPjaxLoading(on) {
    document.body.classList.toggle('pjax-loading', on);
  }

  function pjaxNavigate(url, push) {
    setPjaxLoading(true);
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('bad status');
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newMain = doc.querySelector('.main-content');
        if (!newMain) throw new Error('no main');
        document.title = doc.title;
        pjaxContainer.innerHTML = newMain.innerHTML;
        // 同步导航当前页高亮(服务端渲染的 is-active)
        var newNav = doc.getElementById('siteNav');
        var curNav = document.getElementById('siteNav');
        if (newNav && curNav) curNav.innerHTML = newNav.innerHTML;
        var newMobile = doc.getElementById('mobileNav');
        if (newMobile && mobileNav) mobileNav.innerHTML = newMobile.innerHTML;
        if (push) history.pushState({ pjax: true }, '', url);
        window.scrollTo(0, 0);
        closeMobileNav();
        closeSearch();
        initPage();
        setPjaxLoading(false);
      })
      .catch(function () {
        // 任意失败都回退为整页跳转,保证可达性
        setPjaxLoading(false);
        location.href = url;
      });
  }

  if (pjaxContainer && window.history && history.pushState) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      // 跳过非页面资源(atom.xml、search.json 等)
      if (/\.\w+$/.test(url.pathname) && !/\.html?$/.test(url.pathname)) return;
      // 同页锚点交给浏览器默认行为(目录跳转)
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      if (url.pathname === location.pathname && url.search === location.search) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      pjaxNavigate(url.pathname + url.search, true);
    });

    window.addEventListener('popstate', function () {
      pjaxNavigate(location.pathname + location.search, false);
    });
  }

  /* ==========================================
     8. 首次初始化 + 雨天模式恢复
     ========================================== */
  initPage();

  if (getCurrentTheme() === 'rain') {
    Rain.setEnabled(true);
  }

});

/* ==============================================================
   Rain Engine — Canvas 雨景 + Web Audio 雨声
   视觉密度与音量共用同一条强度曲线(intensity 0~1 缓慢漂移)
   ============================================================== */
var Rain = (function () {
  var canvas = null, ctx = null;
  var running = false, rafId = null;
  var W = 0, H = 0;
  var drops = [], ripples = [], splashes = [], puddles = [];
  var spawnCarry = 0, lastTime = 0, elapsed = 0;
  /* 雨声素材来源(在雨夜模式下后台循环播放):
     "Heavy Rain" — 作者 NachtmahrTV,CC0(公有领域)
     https://freesound.org/people/NachtmahrTV/sounds/618108/
     约 5 分钟密集大雨,制作型环境音(与助眠雨视频同风格)。
     解码失败时回退到合成雨幕。 */
  var RAIN_SRC = '/audio/rain.mp3?v=3'; // 换音源时递增 v,绕过浏览器缓存(head.ejs 的预载链接需同步)
  var usingRecording = false;
  var rainEl = null; // 流式播放的 <audio> 元素
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

    // 合成雨点"嗒"声:仅在录音降级模式下补充质感(录音本身自带雨点声)
    if (!usingRecording) {
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
    }

    // 随机合成远雷(录音已自带真实雷声,这里放得很稀疏,主要提供闪光同步)
    if (nextThunderAt === 0) nextThunderAt = elapsed + 30 + Math.random() * 60;
    if (elapsed >= nextThunderAt) {
      if (Math.random() < 0.3 + 0.6 * intensity) playThunder(intensity);
      nextThunderAt = elapsed + 60 + Math.random() * 120;
    }

    draw(dt, intensity);
    updateAudio(intensity);

    rafId = requestAnimationFrame(loop);
  }

  /* ---------- 音频 ---------- */

  function initAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();

    // 粉红噪声(Paul Kellet 滤波法):供雷声与降级雨幕使用
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

    // 响度链:压缩器抬升整体响度(对齐"助眠雨"视频的听感),防削波
    bedGain = audioCtx.createGain();
    bedGain.gain.value = 0;
    var comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.02;
    comp.release.value = 0.3;
    var makeup = audioCtx.createGain();
    makeup.gain.value = 1.8;
    bedGain.connect(comp);
    comp.connect(makeup);
    makeup.connect(masterGain);

    // 首选:流式播放真实雨声录音(素材来源见模块顶部注释)。
    // 用 <audio> 元素而非 fetch+decode:数百 KB 缓冲即可出声,
    // 不必等 7MB 全量下载;经 MediaElementSource 仍接入增益/压缩链。
    try {
      rainEl = new Audio(RAIN_SRC);
      rainEl.loop = true;
      rainEl.preload = 'auto';
      rainEl.addEventListener('error', function () {
        if (usingRecording) {
          usingRecording = false;
          rainEl = null;
          synthBed();
        }
      });
      var mediaSrc = audioCtx.createMediaElementSource(rainEl);
      mediaSrc.connect(bedGain);
      usingRecording = true;
      rainEl.play().catch(function () {}); // 无手势时静默失败,交给 resumeAudio
    } catch (e) {
      synthBed();
    }
  }

  /* 降级方案:浏览器无法解码录音时,用粉红噪声合成雨幕 */
  function synthBed() {
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
    bedSrc.connect(bedHP);
    bedHP.connect(bedLowpass);
    bedLowpass.connect(bedGain);
    bedSrc.start();

    // 淅沥质感:低频随机信号轻微抖动雨幕音量
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
    // 雨越大音量越大;录音与合成雨幕的响度基准不同
    var base = running
      ? (usingRecording ? 0.4 + 0.2 * intensity : 0.035 + 0.075 * intensity)
      : 0;
    bedGain.gain.setTargetAtTime(base, t, 0.45);
    if (bedLowpass) bedLowpass.frequency.setTargetAtTime(3000 + 2200 * intensity, t, 0.45);
    if (bedModDepth) bedModDepth.gain.setTargetAtTime(base * 0.6, t, 0.45);
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
    if (rainEl && rainEl.paused) {
      rainEl.play().catch(function () {});
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
          if (!running) {
            if (rainEl) rainEl.pause();
            if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
          }
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
      if (rainEl) rainEl.pause();
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
