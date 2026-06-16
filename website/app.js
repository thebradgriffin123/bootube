// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {

  // --- Core Navigation & Intro Logic ---
  const video = document.getElementById('promoVideo');
  const siteContent = document.getElementById('siteContent');
  const customCursor = document.getElementById('customCursor');
  const hamburger = document.getElementById('hamburgerMenu');
  const mobileMenu = document.getElementById('mobileMenuOverlay');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  const skipBtn = document.getElementById('skipIntroBtn');
  
  document.body.style.overflow = 'hidden';
  
  if (video) {
    video.addEventListener('ended', revealContent);
    video.addEventListener('click', revealContent);
  }
  
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      if (video && video.duration) video.currentTime = video.duration - 0.1;
      revealContent();
    });
  }

  function revealContent() {
    if (skipBtn) {
      skipBtn.style.opacity = '0';
      skipBtn.style.pointerEvents = 'none';
    }
    if (siteContent) {
      siteContent.style.opacity = '1';
      siteContent.style.pointerEvents = 'auto';
    }
    document.body.style.overflow = 'auto';
    initAudio(); // Init audio context on first user interaction
  }

  // Custom Cursor
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (customCursor) {
      customCursor.style.left = mouseX + 'px';
      customCursor.style.top = mouseY + 'px';
    }
  });

  const interactables = document.querySelectorAll('a, button, .faq-item summary, .hamburger');
  interactables.forEach(el => {
    el.addEventListener('mouseenter', () => customCursor?.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => customCursor?.classList.remove('cursor-hover'));
  });

  // Mobile Menu
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
      });
    });
  }

  // Scroll Reveal Observer
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
  revealElements.forEach(el => revealObserver.observe(el));


  // --- 1. Audio Glitch Synthesis ---
  let audioCtx;
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
  }

  function playGlitchSound() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); // Very quiet
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }

  const primaryBtns = document.querySelectorAll('.btn-primary');
  primaryBtns.forEach(btn => {
    btn.addEventListener('mouseenter', playGlitchSound);
  });

  // --- 4. Particle Canvas Engine ---
  const canvas = document.getElementById('particleCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1;
        this.color = Math.random() > 0.5 ? 'rgba(0, 243, 255, 0.5)' : 'rgba(255, 51, 51, 0.5)';
      }
      
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
      
      update() {
        let dx = mouseX - this.x;
        let dy = mouseY - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let maxDistance = 150;
        let force = (maxDistance - distance) / maxDistance;
        let directionX = forceDirectionX * force * this.density;
        let directionY = forceDirectionY * force * this.density;
        
        if (distance < maxDistance) {
          this.x -= directionX;
          this.y -= directionY;
        } else {
          if (this.x !== this.baseX) {
            let dx = this.x - this.baseX;
            this.x -= dx/10;
          }
          if (this.y !== this.baseY) {
            let dy = this.y - this.baseY;
            this.y -= dy/10;
          }
        }
        this.draw();
      }
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < 150; i++) {
        particles.push(new Particle());
      }
    }

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      requestAnimationFrame(animateParticles);
    }
    
    initParticles();
    animateParticles();
  }

  // --- 5. Floating Parallax Blocks ---
  const blocksContainer = document.getElementById('floatingBlocks');
  if (blocksContainer) {
    for(let i=0; i<8; i++) {
      let block = document.createElement('div');
      block.className = 'floating-block';
      block.style.left = Math.random() * 100 + 'vw';
      block.style.top = Math.random() * 100 + 'vh';
      block.style.width = (Math.random() * 100 + 50) + 'px';
      block.style.height = block.style.width;
      block.dataset.speed = Math.random() * 0.5 + 0.1;
      blocksContainer.appendChild(block);
    }
    
    window.addEventListener('scroll', () => {
      let scrollY = window.scrollY;
      const blocks = document.querySelectorAll('.floating-block');
      blocks.forEach(block => {
        let speed = block.dataset.speed;
        block.style.transform = `translateY(${-scrollY * speed}px)`;
      });
    });
  }

  // --- 6. Live Censor Demo ---
  const demoInput = document.getElementById('demoInput');
  const demoOutput = document.getElementById('demoOutput');
  const demoSwearWords = ['shit', 'fuck', 'damn', 'bitch', 'asshole', 'crap']; // Hardcoded for demo

  if (demoInput && demoOutput) {
    demoInput.addEventListener('input', (e) => {
      let text = e.target.value;
      
      if (!text.trim()) {
        demoOutput.innerHTML = 'Waiting for input...';
        demoOutput.style.color = 'var(--text-secondary)';
        return;
      }
      
      demoOutput.style.color = 'var(--text-primary)';
      
      let censoredText = text;
      demoSwearWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        censoredText = censoredText.replace(regex, (match) => {
          if (match.length <= 2) return `<span class="censored">${match[0]}*</span>`;
          return `<span class="censored">${match[0]}${'*'.repeat(match.length - 2)}${match[match.length - 1]}</span>`;
        });
      });
      
      demoOutput.innerHTML = censoredText;
    });
  }

  // --- 7. Feature Card Glow Follow ---
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // --- 8. Magnetic CTA Buttons ---
  const magneticBtns = document.querySelectorAll('.btn-primary');
  magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const h = rect.width / 2;
      const v = rect.height / 2;
      const x = e.clientX - rect.left - h;
      const y = e.clientY - rect.top - v;
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0px, 0px) scale(1)';
    });
  });

});
