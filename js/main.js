/**
 * Apple Theme - Main JavaScript
 * Vanilla JS, no dependencies
 */

document.addEventListener('DOMContentLoaded', function () {

  /* ==========================================
     1. Dark Mode Toggle
     ========================================== */
  var themeToggle = document.getElementById('themeToggle');

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = getCurrentTheme();
      var next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  /* ==========================================
     2. Scroll Animations (Intersection Observer)
     ========================================== */
  var animatedElements = document.querySelectorAll('.animate-on-scroll');

  if ('IntersectionObserver' in window && animatedElements.length > 0) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // Calculate stagger delay based on sibling index
          var parent = entry.target.parentElement;
          if (parent) {
            var siblings = parent.querySelectorAll('.animate-on-scroll');
            var index = Array.prototype.indexOf.call(siblings, entry.target);
            entry.target.style.transitionDelay = (index * 0.08) + 's';
          }
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    animatedElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: just show everything
    animatedElements.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ==========================================
     3. Scroll to Top Button
     ========================================== */
  var scrollToTopBtn = document.getElementById('scrollToTop');

  if (scrollToTopBtn) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('is-visible');
      } else {
        scrollToTopBtn.classList.remove('is-visible');
      }
    }, { passive: true });

    scrollToTopBtn.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  /* ==========================================
     4. Mobile Menu Toggle
     ========================================== */
  var mobileMenuToggle = document.getElementById('mobileMenuToggle');
  var mobileNav = document.getElementById('mobileNav');

  if (mobileMenuToggle && mobileNav) {
    mobileMenuToggle.addEventListener('click', function () {
      mobileMenuToggle.classList.toggle('is-active');
      mobileNav.classList.toggle('is-active');
    });

    // Close mobile menu when clicking a nav link
    var mobileNavLinks = mobileNav.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenuToggle.classList.remove('is-active');
        mobileNav.classList.remove('is-active');
      });
    });
  }

  /* ==========================================
     5. Header Scroll Effect
     ========================================== */
  var siteHeader = document.getElementById('siteHeader');

  if (siteHeader) {
    var lastScrollY = 0;

    window.addEventListener('scroll', function () {
      var currentScrollY = window.scrollY;

      if (currentScrollY > 10) {
        siteHeader.classList.add('is-scrolled');
      } else {
        siteHeader.classList.remove('is-scrolled');
      }

      lastScrollY = currentScrollY;
    }, { passive: true });
  }

  /* ==========================================
     6. Reading Progress Bar
     ========================================== */
  var progressBar = document.getElementById('readingProgress');
  var postBody = document.querySelector('.post-body');

  if (progressBar && postBody) {
    progressBar.style.display = 'block';

    window.addEventListener('scroll', function () {
      var windowHeight = window.innerHeight;
      var documentHeight = document.documentElement.scrollHeight;
      var scrollTop = window.scrollY;
      var progress = (scrollTop / (documentHeight - windowHeight)) * 100;
      progress = Math.min(Math.max(progress, 0), 100);
      progressBar.style.width = progress + '%';
    }, { passive: true });
  } else if (progressBar) {
    progressBar.style.display = 'none';
  }

  /* ==========================================
     7. External Links - Open in New Tab
     ========================================== */
  var postBodyEl = document.querySelector('.post-body');
  if (postBodyEl) {
    var links = postBodyEl.querySelectorAll('a[href^="http"]');
    links.forEach(function (link) {
      if (!link.getAttribute('target')) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

});
