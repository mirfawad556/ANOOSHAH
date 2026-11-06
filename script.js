/* =========================================================
   ANOOSHAH BIRTHDAY DASHBOARD — INTERACTIVITY & AUDIO ENGINE
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initCircuitCanvas();
  initHeartsCanvas();
  initAudioEngine();
  initModals();
  initInteractions();
  initPhotoUploader();
});

/* =========================================================
   1. CYBER CIRCUIT CANVAS (High-tech background lines & nodes)
   ========================================================= */
function initCircuitCanvas() {
  const canvas = document.getElementById('circuit-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Array of flowing light pulses along the circuits
  const pulses = [];
  const maxPulses = 16;

  function spawnPulse() {
    pulses.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      radius: Math.random() * 2 + 1.5,
      alpha: Math.random() * 0.7 + 0.3,
      decay: Math.random() * 0.005 + 0.002
    });
  }

  for (let i = 0; i < maxPulses; i++) {
    spawnPulse();
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
        pulses.splice(i, 1);
        spawnPulse();
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 42, 157, ${p.alpha})`;
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 10;
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  render();
}

/* =========================================================
   2. FLOATING NEON HEARTS & CONFETTI ENGINE
   ========================================================= */
let triggerHeartBurst = null;

function initHeartsCanvas() {
  const canvas = document.getElementById('hearts-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];

  class HeartParticle {
    constructor(x, y, isBurst = false) {
      this.x = x !== undefined ? x : Math.random() * width;
      this.y = y !== undefined ? y : height + 20;
      this.size = Math.random() * 14 + 10;
      this.speedY = isBurst ? (Math.random() * -6 - 2) : (Math.random() * -1.2 - 0.6);
      this.speedX = isBurst ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 1.5;
      this.alpha = 1;
      this.rotation = (Math.random() - 0.5) * 0.4;
      this.rotSpeed = (Math.random() - 0.5) * 0.05;
      this.color = ['#ff2a9d', '#ff007f', '#ff85c6', '#9d4edd', '#00f0ff'][Math.floor(Math.random() * 5)];
      this.isBurst = isBurst;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.rotation += this.rotSpeed;
      if (this.isBurst) {
        this.speedY += 0.12; // gravity
        this.alpha -= 0.015;
      } else {
        this.alpha -= 0.003;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;

      // Draw SVG-like heart path
      const s = this.size / 15;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-s * 5, -s * 5, -s * 10, s * 2, 0, s * 10);
      ctx.bezierCurveTo(s * 10, s * 2, s * 5, -s * 5, 0, 0);
      ctx.fill();
      ctx.restore();
    }
  }

  // Regular ambient floating hearts
  setInterval(() => {
    if (particles.length < 35) {
      particles.push(new HeartParticle());
    }
  }, 400);

  // Global burst trigger
  triggerHeartBurst = (x, y) => {
    const burstX = x || width / 2;
    const burstY = y || height / 2;
    for (let i = 0; i < 40; i++) {
      particles.push(new HeartParticle(burstX, burstY, true));
    }
  };

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.alpha <= 0 || p.y < -30 || p.y > height + 50) {
        particles.splice(i, 1);
      }
    }
    requestAnimationFrame(animate);
  }

  animate();
}

/* =========================================================
   3. SYNTHESIS AUDIO ENGINE (Dreamy Synthwave Ambient Audio)
   ========================================================= */
let playChimeSound = () => {};

function initAudioEngine() {
  let audioCtx = null;
  let isPlaying = false;
  let synthInterval = null;

  const notes = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25  // E5
  ];

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, duration = 1.8, type = 'sine', gainVal = 0.08) {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio note error:', e);
    }
  }

  playChimeSound = () => {
    try {
      const ctx = getAudioContext();
      playTone(523.25, 0.4, 'sine', 0.12); // C5
      setTimeout(() => playTone(659.25, 0.6, 'sine', 0.12), 120); // E5
      setTimeout(() => playTone(783.99, 0.8, 'sine', 0.15), 240); // G5
    } catch (e) {}
  };

  const chords = [
    [261.63, 329.63, 392.00, 523.25], // C Maj
    [220.00, 261.63, 329.63, 440.00], // A Min
    [174.61, 220.00, 261.63, 349.23], // F Maj
    [196.00, 246.94, 293.66, 392.00]  // G Maj
  ];
  let chordIndex = 0;

  function startAmbientMusic() {
    isPlaying = true;
    const btnText = document.getElementById('music-btn-text');
    if (btnText) btnText.textContent = 'Mute Vibe 🎶';

    synthInterval = setInterval(() => {
      const currentChord = chords[chordIndex];
      currentChord.forEach((freq, idx) => {
        setTimeout(() => {
          if (isPlaying) playTone(freq, 2.5, 'sine', 0.05);
        }, idx * 240);
      });
      chordIndex = (chordIndex + 1) % chords.length;
    }, 2800);
  }

  function stopAmbientMusic() {
    isPlaying = false;
    clearInterval(synthInterval);
    const btnText = document.getElementById('music-btn-text');
    if (btnText) btnText.textContent = 'Play Vibe 🎵';
  }

  const musicBtn = document.getElementById('btn-music-toggle');
  const dockMusicBtn = document.getElementById('dock-music');

  const toggleHandler = () => {
    if (isPlaying) {
      stopAmbientMusic();
      showToast('Ambient melody paused');
    } else {
      startAmbientMusic();
      showToast('Playing cyber-romantic ambient melody ✨');
    }
  };

  if (musicBtn) musicBtn.addEventListener('click', toggleHandler);
  if (dockMusicBtn) dockMusicBtn.addEventListener('click', toggleHandler);
}

/* =========================================================
   4. MODALS & POPUPS
   ========================================================= */
function initModals() {
  const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      playChimeSound();
    }
  };

  const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  };

  // Close when clicking outside dialog
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('active');
    });
  });

  // Love letter buttons
  document.getElementById('btn-open-letter')?.addEventListener('click', () => openModal('letter-modal'));
  document.getElementById('dock-letter')?.addEventListener('click', () => openModal('letter-modal'));
  document.getElementById('close-letter-modal')?.addEventListener('click', () => closeModal('letter-modal'));
  document.getElementById('btn-close-letter')?.addEventListener('click', () => closeModal('letter-modal'));


  // Secret vault
  document.getElementById('dock-vault')?.addEventListener('click', () => {
    openModal('vault-modal');
    setTimeout(() => pinInput?.focus(), 250);
  });
  document.getElementById('close-vault-modal')?.addEventListener('click', () => closeModal('vault-modal'));

  const unlockBtn = document.getElementById('btn-unlock-vault');
  const pinInput = document.getElementById('vault-pin');
  const secretContent = document.getElementById('vault-secret-content');

  function handleUnlock() {
    const pin = pinInput?.value.trim();

    // If already unlocked and user clicks again, go straight to gallery!
    if (secretContent && secretContent.style.display === 'block') {
      window.location.href = 'gallery.html';
      return;
    }

    if (pin === '1708' || pin.toLowerCase() === 'anooshah') {
      secretContent.style.display = 'block';
      pinInput.classList.remove('shake');
      playChimeSound();
      if (triggerHeartBurst) triggerHeartBurst();
      showToast('Vault decrypted! Opening Secret Gallery... 💖');

      // Smoothly transition to gallery.html after celebrating
      setTimeout(() => {
        window.location.href = 'gallery.html';
      }, 1600);
    } else {
      pinInput.classList.remove('shake');
      void pinInput.offsetWidth; // trigger reflow for smooth shake replay
      pinInput.classList.add('shake');
      showToast('Incorrect passcode! Hint: 1708');
      pinInput.value = '';
      pinInput.focus();
    }
  }

  unlockBtn?.addEventListener('click', handleUnlock);
  pinInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  });
}

/* =========================================================
   5. INTERACTIVE BUTTONS & FORMS
   ========================================================= */
function initInteractions() {
  // Surprise Her Button
  const surpriseBtn = document.getElementById('btn-surprise');
  if (surpriseBtn) {
    surpriseBtn.addEventListener('click', (e) => {
      const rect = surpriseBtn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top;
      if (triggerHeartBurst) triggerHeartBurst(x, y);
      playChimeSound();
      showToast('✨ Happy Birthday Anooshah! You are loved beyond words!');
    });
  }

  // Hero Wishes Button (Starts at 0, adds 1 on click, 1s popup)
  let wishCounter = 0;
  const heroWishBtn = document.getElementById('btn-birthday-wish');
  if (heroWishBtn) {
    heroWishBtn.addEventListener('click', (e) => {
      wishCounter++;
      const pillText = heroWishBtn.querySelector('.pill-text');
      if (pillText) pillText.textContent = `${wishCounter} ${wishCounter === 1 ? 'WISH' : 'WISHES'}`;

      const rect = heroWishBtn.getBoundingClientRect();
      if (triggerHeartBurst) triggerHeartBurst(rect.left + rect.width / 2, rect.top);
      playChimeSound();

      // Remove existing bubble if any
      const existingBubble = heroWishBtn.querySelector('.floating-bubble');
      if (existingBubble) existingBubble.remove();

      // Create 1-second floating pop-up text right above the button
      const bubble = document.createElement('div');
      bubble.className = 'floating-bubble';
      bubble.textContent = 'fawad wishes you happy birthday';
      heroWishBtn.appendChild(bubble);

      setTimeout(() => {
        bubble.remove();
      }, 1000);

      // Also trigger a 1-second toast
      showToast('fawad wishes you happy birthday', 1000);
    });
  }

  // Wish Form
  const wishForm = document.getElementById('wish-form');
  const wishAuthor = document.getElementById('wish-author');
  const wishText = document.getElementById('wish-text');

  if (wishForm) {
    wishForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const author = wishAuthor.value.trim();
      const wish = wishText.value.trim();

      if (!author || !wish) return;

      playChimeSound();
      if (triggerHeartBurst) triggerHeartBurst();

      showToast(`Wish sent from ${author}: "${wish}" 🌟`);
      wishText.value = '';

      // Increment wish counter
      wishCounter++;
      const pillText = heroWishBtn?.querySelector('.pill-text');
      if (pillText) pillText.textContent = `${wishCounter} WISHES`;
    });
  }

  // Numbered list items
  const itemCards = document.querySelectorAll('.item-card');
  const romanticReasons = {
    '1': 'Your smile has this effortless magic that lights up any room instantly. Never lose it!',
    '2': 'You have the kindest, most generous heart. Caring for you is the easiest thing in the world.',
    '3': 'Every plan, dream, and journey ahead looks a million times brighter with you in it.'
  };

  itemCards.forEach((card) => {
    card.addEventListener('click', () => {
      const reasonNum = card.getAttribute('data-reason');
      const note = romanticReasons[reasonNum];
      if (note) {
        showToast(note);
        playChimeSound();
        if (triggerHeartBurst) {
          const rect = card.getBoundingClientRect();
          triggerHeartBurst(rect.left + rect.width / 2, rect.top);
        }
      }
    });
  });

  // Sidebar navigation active state
  document.querySelectorAll('.dock-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dock-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

/* =========================================================
   6. CUSTOM PHOTO UPLOADER (Local Storage Persistence)
   ========================================================= */
function initPhotoUploader() {
  const avatarContainer = document.querySelector('.avatar-container');
  const avatarInput = document.getElementById('avatar-input');
  const avatarImg = document.getElementById('avatar-img');

  // Load saved photo if exists
  const savedAvatar = localStorage.getItem('anooshah_avatar');
  if (savedAvatar && avatarImg) {
    avatarImg.src = savedAvatar;
  }

  if (avatarContainer && avatarInput && avatarImg) {
    avatarContainer.addEventListener('click', () => avatarInput.click());

    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        avatarImg.src = dataUrl;
        try {
          localStorage.setItem('anooshah_avatar', dataUrl);
          showToast('Updated Anooshah\'s profile photo! 📸');
          if (triggerHeartBurst) triggerHeartBurst();
        } catch (err) {
          console.warn('LocalStorage limit exceeded for large image');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Gallery multi-photo upload
  const galleryTrigger = document.getElementById('add-photo-trigger');
  const galleryInput = document.getElementById('gallery-input');
  const galleryGrid = document.querySelector('.gallery-grid');

  if (galleryTrigger && galleryInput && galleryGrid) {
    galleryTrigger.addEventListener('click', () => galleryInput.click());

    galleryInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const card = document.createElement('div');
          card.className = 'gallery-card';
          card.innerHTML = `
            <img src="${event.target.result}" alt="Memory" />
            <div class="gallery-caption">Cherished Memory 💕</div>
          `;
          galleryGrid.insertBefore(card, galleryTrigger);
          showToast('New memory added to vault! 💖');
        };
        reader.readAsDataURL(file);
      });
    });
  }
}

/* =========================================================
   7. TOAST NOTIFICATION UTILITY
   ========================================================= */
function showToast(message, duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  if (duration <= 1200) {
    toast.style.animation = 'slideInRight 0.2s ease, fadeOut 0.3s ease 0.8s forwards';
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}
