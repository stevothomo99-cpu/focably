// ── INIT ──
// ── PULL TO REFRESH ──
(function() {
  let startY = 0;
  let isPulling = false;
  let pullActive = false;
  let indicator = null;

  function getIndicator() {
    if(!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pullIndicator';
      indicator.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;align-items:center;justify-content:center;height:0;overflow:hidden;background:rgba(123,47,190,0.15);transition:height 0.1s;pointer-events:none;';
      indicator.innerHTML = '<span style="font-size:20px;opacity:0;transition:opacity 0.2s;">🐿️</span>';
      document.body.appendChild(indicator);
    }
    return indicator;
  }

  document.addEventListener('touchstart', e => {
    if(window.scrollY === 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
      pullActive = false;
    }
  }, {passive: true});

  document.addEventListener('touchmove', e => {
    if(!isPulling) return;
    const dist = e.touches[0].clientY - startY;
    if(dist > 8 && window.scrollY === 0) {
      // Actively prevent the browser pull-to-refresh
      pullActive = true;
      e.preventDefault();
      const ind = getIndicator();
      const h = Math.min(dist * 0.6, 60);
      ind.style.height = h + 'px';
      const sq = ind.querySelector('span');
      if(sq) sq.style.opacity = dist > 40 ? '1' : '0';
    }
  }, {passive: false}); // passive:false required to allow preventDefault

  document.addEventListener('touchend', async e => {
    if(!isPulling) return;
    isPulling = false;
    const dist = e.changedTouches[0].clientY - startY;
    const ind = getIndicator();
    ind.style.height = '0';
    const sq = ind.querySelector('span');
    if(sq) sq.style.opacity = '0';
    if(pullActive && dist > 60 && typeof refreshCurrentView === 'function') {
      pullActive = false;
      await refreshCurrentView();
    }
    pullActive = false;
  }, {passive: true});
})();

window.addEventListener('load', async () => {
  // Register service worker first
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(e => console.log('SW failed:', e.message));
  }
  // Detect return from Stripe Checkout
  const returningFromStripe = new URLSearchParams(window.location.search).has('checkout');
  try {
    console.log('App starting — waking Supabase...');
    // Ping Supabase first to wake it up
    fetch(`${SUPA_URL}/rest/v1/profiles?select=id&limit=1`, {headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}}).catch(()=>{});
    // Small delay to let it wake
    await new Promise(r => setTimeout(r, 1500));
    console.log('Getting session...');

    // Get session — if returning from Stripe, retry a few times so we don't
    // bounce the user to login before the session rehydrates.
    let session = null;
    const maxAttempts = returningFromStripe ? 5 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const sessionPromise = db.auth.getSession();
      const timeout = new Promise(resolve => setTimeout(() => resolve({data:{session:null}}), 15000));
      const result = await Promise.race([sessionPromise, timeout]);
      session = result?.data?.session || null;
      if (session) break;
      if (attempt < maxAttempts) {
        console.log(`Session not ready (attempt ${attempt}/${maxAttempts}), retrying…`);
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    console.log('Session:', session ? 'logged in as ' + session.user.email : 'none');
    if (session) {
      currentUser = session.user;
      profileLoadInProgress = true;
      await loadProfile();
    } else {
      // If we came back from Stripe but lost the session, flag it so the
      // success message still shows after the user signs back in.
      if (returningFromStripe) {
        try { sessionStorage.setItem('pendingCheckoutReturn', window.location.search); } catch(e) {}
      }
      showScreen('auth');
    }
  } catch(e) {
    console.error('Startup error:', e.message);
    showScreen('auth');
  }
});

// Keep Supabase awake — ping every 4 minutes
setInterval(() => {
  fetch(`${SUPA_URL}/rest/v1/profiles?select=id&limit=1`, {headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}}).catch(()=>{});
}, 240000);

db.auth.onAuthStateChange(async (event, session) => {
  // Once app is loaded, only respond to sign out
  if (appReady) {
    if (event === 'SIGNED_OUT') {
      appReady = false;
      currentUser = null;
      showScreen('auth');
    }
    return;
  }
  if ((event === 'SIGNED_IN' || event === 'EMAIL_CONFIRMED') && session) {
    // Skip if window.load already kicked off a profile load
    if (profileLoadInProgress || currentUser) return;
    currentUser = session.user;
    await loadProfile();
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    showScreen('auth');
  }
});

function showScreen(name) {
  ['loading','auth','confirm','onboarding','app'].forEach(s => {
    const el = document.getElementById('screen-' + s);
    if(el) el.style.display = 'none';
  });
  const t = document.getElementById('screen-' + name);
  if(t) t.style.display = ['auth','onboarding','confirm'].includes(name) ? 'flex' : 'block';
}

function showConfirmScreen(email) {
  document.getElementById('confirmEmail').textContent = email;
  showScreen('confirm');
}
