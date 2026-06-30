/**
 * Apple Theme - Main JavaScript
 * Vanilla JS, no dependencies
 */

document.addEventListener('DOMContentLoaded', function () {

  /* ==========================================
     1. Dark Mode Toggle
     ========================================== */
  var themeToggle = document.getElementById('themeToggle');
  var lastClickTime = 0;

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var wrapper = document.getElementById('app-wrapper');
    if (wrapper) {
      wrapper.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }

  // Initialize theme syncing immediately
  setTheme(getCurrentTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', function (e) {
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

  /* ==========================================
     8. Interactive WebGL Three.js Koi Pond Simulation
     ========================================== */
  var scrollIndicator = document.getElementById('scrollIndicator');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', function () {
      var target = document.getElementById('blogSection');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  var canvas = document.getElementById('rippleCanvas');
  if (canvas && typeof THREE !== 'undefined') {
    var container = canvas.parentElement;
    var scene, camera, renderer;
    var waterMesh, floorMesh;
    var mouseWorld = new THREE.Vector3(-9999, -9999, -9999);
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Load reference pond picture as background texture
    var textureLoader = new THREE.TextureLoader();
    var pebbleTexture = textureLoader.load('/images/pond.jpg', function(tex) {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true; // Force texture upload to GPU
      
      // Update materials if meshes are already initialized (resolves slow-network asynchronous loading race condition)
      if (waterMesh && waterMesh.material) {
        waterMesh.material.uniforms.uTexture.value = tex;
        waterMesh.material.needsUpdate = true;
      }
      if (floorMesh && floorMesh.material) {
        floorMesh.material.map = tex;
        floorMesh.material.needsUpdate = true;
      }
    });

    // Array to manage active mathematical ripples
    var maxRipples = 25;
    var ripples = []; // Each: { x, z, startTime, intensity, speed, frequency }

    // Flat arrays to pass as uniform values
    var uRipplesArray = new Float32Array(maxRipples * 4); // vec4: [x, z, startTime, intensity]
    var uRippleParamsArray = new Float32Array(maxRipples * 2); // vec2: [speed, frequency]

    function init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.set(0, 10, 0); // Bird-eye view looking down
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);

      // Bottom layer geometry (Pebbles and bottom sandbed)
      var floorGeo = new THREE.PlaneGeometry(35, 22);
      floorGeo.rotateX(-Math.PI / 2);
      var floorMat = new THREE.MeshBasicMaterial({ 
        map: pebbleTexture,
        side: THREE.DoubleSide
      });
      floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.y = -5.0; 
      scene.add(floorMesh);

      // Advanced WebGL Refraction Caustics & Specular Glisten Sun Sparkle Shader
      var waterMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0.0 },
          uTexture: { value: pebbleTexture },
          uIsDark: { value: isDark ? 1.0 : 0.0 },
          uRipples: { value: uRipplesArray },
          uRippleParams: { value: uRippleParamsArray },
          uRippleCount: { value: 0 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform sampler2D uTexture;
          uniform float uIsDark;
          uniform vec4 uRipples[25];     // [x, z, startTime, intensity]
          uniform vec2 uRippleParams[25];  // [speed, frequency]
          uniform int uRippleCount;
          varying vec2 vUv;
          varying vec3 vWorldPos;

          void main() {
            vec2 uv = vUv;
            
            // 1. Calculate ambient micro-ripples (gentle wind effect, larger and faster for active background water)
            float t1 = uTime * 1.5;
            float t2 = uTime * 1.2;
            float wave1 = sin(uv.x * 16.0 + t1) * 0.0055;
            float wave2 = cos(uv.y * 14.0 - t2) * 0.0055;
            
            float dx = wave1;
            float dy = wave2;
            
            // 2. Loop and sum all active mouse mathematical ripples (infinite resolution, no wireframe moire!)
            for (int i = 0; i < 25; i++) {
              if (i >= uRippleCount) break;
              
              vec4 rip = uRipples[i];
              vec2 params = uRippleParams[i];
              
              float age = uTime - rip.z;
              if (age > 0.0 && age < 2.0) {
                float dist = distance(vWorldPos.xz, rip.xy);
                float waveFront = age * params.x; // age * speed
                
                if (dist < waveFront) {
                  // Propagating wave formula with exponential damping
                  float radialDist = waveFront - dist;
                  float falloff = 1.0 - (dist / 14.0);
                  if (falloff > 0.0) {
                    float fade = clamp((2.0 - age) * 4.0, 0.0, 1.0);
                    float amplitude = rip.w * exp(-age * 2.8) * sin(dist * params.y - age * 8.5) * falloff * fade;
                    
                    float angle = atan(vWorldPos.z - rip.y, vWorldPos.x - rip.x);
                    dx += cos(angle) * amplitude * params.y;
                    dy += sin(angle) * amplitude * params.y;
                  }
                }
              }
            }

            vec2 distortion = vec2(dx, dy);

            // Compute standard water normal based on displacement derivatives
            float normalStrength = 0.08;
            vec3 normal = normalize(vec3(-dx * normalStrength, 1.0, -dy * normalStrength));

            // Specular highlighting (Glistening sparkles from sun)
            vec3 lightDir = normalize(vec3(0.35, 1.0, 0.35));
            vec3 viewDir = normalize(vec3(0.0, 1.0, 0.0));
            vec3 halfDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfDir), 0.0), 128.0) * 1.6;

            // Refracted bottom texture sampling
            vec4 refractionColor;
            if (uIsDark > 0.5) {
              // Luminous, clear and bright turquoise pond water bottom in Dark mode (not pitch black!)
              float r = texture2D(uTexture, uv + distortion * 0.8).r;
              float g = texture2D(uTexture, uv + distortion * 0.8).g;
              float b = texture2D(uTexture, uv + distortion * 0.8).b;
              refractionColor = vec4(r * 0.60, g * 0.80, b * 0.98, 1.0);
            } else {
              // Light mode natural colors refraction
              float r = texture2D(uTexture, uv + distortion * 0.9).r;
              float g = texture2D(uTexture, uv + distortion * 0.95).g;
              float b = texture2D(uTexture, uv + distortion * 1.0).b;
              refractionColor = vec4(r * 0.94, g * 0.96, b * 0.99, 1.0);
            }

            // Water volume tone blending
            vec4 waterSurfaceColor = uIsDark > 0.5 ? vec4(0.02, 0.05, 0.12, 0.38) : vec4(0.85, 0.93, 0.97, 0.22);
            vec4 finalColor = mix(refractionColor, waterSurfaceColor, 0.35) + vec4(vec3(spec), 0.0);

            gl_FragColor = finalColor;
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });

      var waterGeo = new THREE.PlaneGeometry(35, 22);
      waterGeo.rotateX(-Math.PI / 2);
      waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.position.y = -0.5;
      scene.add(waterMesh);

      var ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);
    }

    init();

    // Mouse positioning
    var planeXZ = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var raycaster = new THREE.Raycaster();

    function getMouseWorldPosition(e) {
      var rect = canvas.getBoundingClientRect();
      var normX = ((e.clientX - rect.left) / canvas.width) * 2 - 1;
      var normY = -((e.clientY - rect.top) / canvas.height) * 2 + 1;
      
      raycaster.setFromCamera(new THREE.Vector2(normX, normY), camera);
      var intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(planeXZ, intersection)) {
        return intersection;
      }
      return new THREE.Vector3(-9999, -9999, -9999);
    }

    var lastMouseTime = 0;
    var lastMousePos = new THREE.Vector3();

    // Mousemove triggers mathematical ripples based on velocity
    container.addEventListener('mousemove', function (e) {
      var now = performance.now() / 1000.0;
      var currentPos = getMouseWorldPosition(e);
      mouseWorld.copy(currentPos);

      if (lastMousePos.x === -9999) {
        lastMousePos.copy(currentPos);
        lastMouseTime = now;
        return;
      }

      var dt = now - lastMouseTime;
      
      // Force checking intervals to be strictly at least 16ms (frame rate sampling)
      // This avoids time-difference dilution on high-polling gaming mice (1000Hz)
      if (dt >= 0.016) {
        var dist = currentPos.distanceTo(lastMousePos);
        var speed = dist / dt;
        
        // Spawn a ripple if mouse moves fast enough (reactive to user speed)
        if (speed > 4.2 && ripples.length < maxRipples) {
          ripples.push({
            x: currentPos.x,
            z: currentPos.z,
            startTime: now,
            intensity: Math.min(speed * 0.035, 0.40), // ripple strength proportional to speed
            speed: 3.8 + Math.random() * 1.4,
            frequency: 5.5 + Math.random() * 2.5
          });
        }
        
        lastMousePos.copy(currentPos);
        lastMouseTime = now;
      }
    });

    container.addEventListener('mouseleave', function () {
      mouseWorld.set(-9999, -9999, -9999);
      lastMousePos.set(-9999, -9999, -9999);
    });

    // Touch triggers ripples
    container.addEventListener('touchmove', function (e) {
      if (e.touches.length > 0) {
        var now = performance.now() / 1000.0;
        var currentPos = getMouseWorldPosition(e.touches[0]);
        if (ripples.length < maxRipples) {
          ripples.push({
            x: currentPos.x,
            z: currentPos.z,
            startTime: now,
            intensity: 0.18,
            speed: 4.0,
            frequency: 6.5
          });
        }
      }
    }, { passive: true });

    // Handle resizing window
    function onWindowResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onWindowResize);

    // Animation frame loops
    var animationFrameId = null;

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      
      var time = performance.now() / 1000.0;

      // Pause if out of view
      if (window.scrollY > window.innerHeight) {
        return;
      }

      // 1. Filter out expired ripples (life: 2.0s)
      ripples = ripples.filter(function(r) {
        return time - r.startTime < 2.0;
      });

      // 2. Populate flat array uniforms for WebGL shader
      for (var i = 0; i < maxRipples; i++) {
        var idx4 = i * 4;
        var idx2 = i * 2;
        
        if (i < ripples.length) {
          var r = ripples[i];
          uRipplesArray[idx4] = r.x;
          uRipplesArray[idx4 + 1] = r.z;
          uRipplesArray[idx4 + 2] = r.startTime;
          uRipplesArray[idx4 + 3] = r.intensity;
          
          uRippleParamsArray[idx2] = r.speed;
          uRippleParamsArray[idx2 + 1] = r.frequency;
        } else {
          uRipplesArray[idx4] = -9999;
          uRipplesArray[idx4 + 1] = -9999;
          uRipplesArray[idx4 + 2] = 0;
          uRipplesArray[idx4 + 3] = 0;
          
          uRippleParamsArray[idx2] = 0;
          uRippleParamsArray[idx2 + 1] = 0;
        }
      }

      // 3. Update uniforms and render
      waterMesh.material.uniforms.uTime.value = time;
      waterMesh.material.uniforms.uRippleCount.value = ripples.length;
      
      var activeDark = document.documentElement.getAttribute('data-theme') === 'dark';
      waterMesh.material.uniforms.uIsDark.value = activeDark ? 1.0 : 0.0;

      renderer.render(scene, camera);
    }

    animate();

    // Sync theme settings
    var themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function (e) {
        // Trigger a huge ripple centered at the button coordinate on click!
        var now = performance.now() / 1000.0;
        var clickPos = getMouseWorldPosition(e);
        if (clickPos.x !== -9999 && ripples.length < maxRipples) {
          ripples.push({
            x: clickPos.x,
            z: clickPos.z,
            startTime: now,
            intensity: 0.65, // Massive theme change wave
            speed: 6.5,
            frequency: 4.5
          });
        }
        
        setTimeout(function () {
          isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          if (waterMesh) {
            waterMesh.material.uniforms.uIsDark.value = isDark ? 1.0 : 0.0;
          }
        }, 50);
      });
    }
  }

  /* ==========================================
     11. Heavily Cushioned High-Resistance Snap Scroll
     ========================================== */
  var targetY = window.pageYOffset;
  var currentY = window.pageYOffset;
  var isScrollHijacked = false;
  var snapTimeout = null;

  // Sync whether we are on the homepage
  var isHomePage = document.getElementById('rippleCanvas') !== null;

  if (isHomePage) {
    window.addEventListener('wheel', function (e) {
      var scrollY = window.pageYOffset;
      var landingHeight = window.innerHeight;

      // Hijack scroll ONLY in the landing transition zone
      if (scrollY < landingHeight - 10 || (scrollY >= landingHeight - 10 && scrollY <= landingHeight + 10 && e.deltaY < 0)) {
        e.preventDefault();
        
        // Sync scroll coordinate variables on first wheel click to prevent jump offsets
        if (!isScrollHijacked) {
          targetY = scrollY;
          currentY = scrollY;
          isScrollHijacked = true;
        }

        // 65% scroll delta multiplier for responsive movement (moderate resistance, not deadlocked)
        targetY += e.deltaY * 0.65; 
        targetY = Math.max(0, Math.min(landingHeight, targetY));

        if (snapTimeout) clearTimeout(snapTimeout);

        // Auto-snap when user stops scrolling (200ms threshold)
        snapTimeout = setTimeout(function() {
          if (targetY > landingHeight * 0.30) {
            // If they scroll past 30% going down, snap all the way to posts feed
            targetY = landingHeight; 
          } else {
            // Otherwise snap back to top
            targetY = 0; 
          }
        }, 200);
      } else {
        isScrollHijacked = false;
        targetY = window.pageYOffset;
        currentY = window.pageYOffset;
      }
    }, { passive: false });

    // Continuous Lerping animation loop for scroll dampening
    function updateScrollLerp() {
      if (isScrollHijacked) {
        var diff = targetY - currentY;
        if (Math.abs(diff) > 0.5) {
          currentY += diff * 0.08; // smooth spring speed
          window.scrollTo(0, currentY);
        } else {
          currentY = targetY;
          window.scrollTo(0, currentY);
          isScrollHijacked = false; // CRITICAL: release scroll lock so scrollbar dragging functions!
        }
      } else {
        targetY = window.pageYOffset;
        currentY = window.pageYOffset;
      }
      requestAnimationFrame(updateScrollLerp);
    }
    requestAnimationFrame(updateScrollLerp);

    // Sync scroll position variables on manual scroll or window resize
    function syncScrollIndex() {
      if (!isScrollHijacked) {
        targetY = window.pageYOffset;
        currentY = window.pageYOffset;
      }
    }
    window.addEventListener('scroll', syncScrollIndex);
    window.addEventListener('resize', syncScrollIndex);

    // Enter Site scroll arrow click handler
    var scrollIndicator = document.getElementById('scrollIndicator');
    if (scrollIndicator) {
      scrollIndicator.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById('blogSection');
        if (target) {
          isScrollHijacked = true;
          targetY = target.offsetTop;
        }
      });
    }
  }

});
