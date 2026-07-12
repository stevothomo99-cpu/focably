const SUPA_URL = 'https://mxgnrgajspprupzxaeld.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14Z25yZ2Fqc3BwcnVwenhhZWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTg5MjUsImV4cCI6MjA5NjU3NDkyNX0.tpVmlTfPSR1RmqiS57xgbCIl0Cd3-kHGi7tiOzmJWfw';
const { createClient } = supabase;
const db = createClient(SUPA_URL, SUPA_KEY);

// ── AI proxy ──
// Claude calls go through the `ai-generate` Edge Function, which holds the
// Anthropic key server-side. The client never sees a provider secret.
const AI_PROXY_URL = SUPA_URL + '/functions/v1/ai-generate';
async function aiHeaders() {
  const { data: { session } } = await db.auth.getSession();
  const token = session?.access_token || SUPA_KEY;
  return { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token };
}

// ── Stripe config ──
const STRIPE_PK = 'pk_live_51T3vs4BClvRtlFVH7Zh5svzkwISEUF3CBRgZjUmHtFuBlbuxqPwG95rSA8mcwDIEuB34M3rqYLKo1MHXJHnwvcen00THCh7f4c';
const STRIPE_PRICE_MONTHLY = 'price_1TiYduBClvRtlFVHK1JSodkf';
const STRIPE_PRICE_ANNUAL  = 'price_1TiYeWBClvRtlFVH8KKVA20U';
let stripeInstance = null;
function getStripe() {
  if(!stripeInstance) stripeInstance = Stripe(STRIPE_PK);
  return stripeInstance;
}

function isPro() {
  // Parent: check family subscription
  if(currentFamily?.subscription_status === 'pro' || currentFamily?.subscription_status === 'school_attached') return true;
  // Student: check profile subscription (inherited from family at link time)
  if(currentProfile?.subscription_status === 'pro' || currentProfile?.subscription_status === 'school_attached') return true;
  return false;
}

let currentUser = null, currentProfile = null, currentFamily = null, currentSchool = null;
let profileLoadInProgress = false;
let currentChildRecord = null; // set when student's child record is found
let currentChildren = [], selectedChildId = null;
let selectedAge = null, selectedTheme = null, selectedRole = 'parent';
let currentProofFile = null, currentProofTaskId = null;
let appReady = false; // True once app is fully loaded — blocks auth interrupts
let pendingInviteToken = null; // set when the URL carries our own ?invite_token= (see acceptInvite())
let passwordResetMode = false; // true while handling a Supabase PASSWORD_RECOVERY link

const themes = {
  fantasy:   { grad:'linear-gradient(135deg,#4C1D95,#7C3AED)', emoji:'🧙', name:'The Apprentice Wizard', title:'Keeper of Knowledge', streak:'⚔️ Warrior', realm1Grad:'linear-gradient(135deg,#4C1D95,#6D28D9)', realm2Grad:'linear-gradient(135deg,#F59E0B,#B45309)', chest:'🏰', aiTitle:'🧙 Quest Wizard', aiSub:'Tell the wizard your quest!', aiBtnText:'Get My Quest Steps', aiStyle:'fantasy quest steps' },
  space:     { grad:'linear-gradient(135deg,#1E3A8A,#2563EB)', emoji:'👨‍🚀', name:'Cadet Explorer', title:'Navigator · Space Academy', streak:'🚀 Lieutenant', realm1Grad:'linear-gradient(135deg,#1E3A8A,#1D4ED8)', realm2Grad:'linear-gradient(135deg,#065F46,#059669)', chest:'🛸', aiTitle:'🤖 Mission Control', aiSub:'Divide your assignment into missions!', aiBtnText:'Plan My Missions', aiStyle:'space mission objectives' },
  adventure: { grad:'linear-gradient(135deg,#064E3B,#065F46)', emoji:'🧭', name:'The Young Explorer', title:'Trailblazer · Exploration Corps', streak:'🗺️ Pathfinder', realm1Grad:'linear-gradient(135deg,#064E3B,#047857)', realm2Grad:'linear-gradient(135deg,#7C2D12,#F97316)', chest:'🗺️', aiTitle:'🧭 Trail Guide', aiSub:'Map every step of the trail!', aiBtnText:'Map My Trail', aiStyle:'adventure trail waypoints' }
};


// ── HS THEMES ──
// Each theme defines: header gradient, body bg, card bg, text colours, accent colours
// Light themes: dark text on light bg. Dark themes: light text on dark bg.
const HS_THEMES = {

  // ── FREE ──

  vanilla: {
    name:'Vanilla', emoji:'✨', free:true, dark:false,
    desc:'Clean & classic',
    vars:{
      '--hs-primary':'#7C3AED','--hs-primary-dark':'#5B21B6','--hs-primary-light':'#A78BFA',
      '--hs-accent':'#10B981','--hs-accent2':'#F59E0B',
      '--hs-header-grad':'linear-gradient(135deg,#4C1D95 0%,#7C3AED 100%)',
      '--hs-header-text':'#FFFFFF',
      '--hs-body-bg':'#F5F3FF','--hs-card-bg':'#FFFFFF','--hs-card-text':'#1E1B4B',
      '--hs-subtext':'#6B7280',
      '--hs-task-done-bg':'#ECFDF5','--hs-task-done-border':'#6EE7B7',
      '--hs-xp-fill':'#7C3AED','--hs-trust-bar':'#10B981',
      '--hs-badge-bg':'rgba(124,58,237,0.12)','--hs-badge-text':'#5B21B6',
    }
  },

  midnight: {
    name:'Midnight', emoji:'🌙', free:true, dark:true,
    desc:'Pure dark mode',
    vars:{
      '--hs-primary':'#C084FC','--hs-primary-dark':'#A855F7','--hs-primary-light':'#E9D5FF',
      '--hs-accent':'#22D3EE','--hs-accent2':'#F472B6',
      '--hs-header-grad':'linear-gradient(135deg,#000000 0%,#09090F 60%,#130D2E 100%)',
      '--hs-header-text':'#C084FC',
      '--hs-body-bg':'#06040F','--hs-card-bg':'#120E24','--hs-card-text':'#F3E8FF',
      '--hs-subtext':'#C084FC',
      '--hs-task-done-bg':'#0A1628','--hs-task-done-border':'#22D3EE',
      '--hs-xp-fill':'#C084FC','--hs-trust-bar':'#22D3EE',
      '--hs-badge-bg':'rgba(192,132,252,0.2)','--hs-badge-text':'#E9D5FF',
    }
  },

  // ── PRO ──

  lightning: {
    name:'Ancient Lightning', emoji:'⚡', free:false, dark:false,
    desc:'Gold & thunder',
    vars:{
      '--hs-primary':'#D97706','--hs-primary-dark':'#92400E','--hs-primary-light':'#FCD34D',
      '--hs-accent':'#1D4ED8','--hs-accent2':'#60A5FA',
      '--hs-header-grad':'linear-gradient(135deg,#78350F 0%,#D97706 50%,#FCD34D 100%)',
      '--hs-header-text':'#1C1917',
      '--hs-body-bg':'#FFFBEB','--hs-card-bg':'#FEF3C7','--hs-card-text':'#78350F',
      '--hs-subtext':'#92400E',
      '--hs-task-done-bg':'#EFF6FF','--hs-task-done-border':'#3B82F6',
      '--hs-xp-fill':'#D97706','--hs-trust-bar':'#1D4ED8',
      '--hs-badge-bg':'rgba(217,119,6,0.15)','--hs-badge-text':'#92400E',
    }
  },

  softHour: {
    name:'Soft Hour', emoji:'🌸', free:false, dark:false,
    desc:'Pastel pink vibes',
    vars:{
      '--hs-primary':'#EC4899','--hs-primary-dark':'#BE185D','--hs-primary-light':'#FBCFE8',
      '--hs-accent':'#8B5CF6','--hs-accent2':'#F9A8D4',
      '--hs-header-grad':'linear-gradient(135deg,#EC4899 0%,#F472B6 50%,#A78BFA 100%)',
      '--hs-header-text':'#FFFFFF',
      '--hs-body-bg':'#FDF2F8','--hs-card-bg':'#FCE7F3','--hs-card-text':'#831843',
      '--hs-subtext':'#BE185D',
      '--hs-task-done-bg':'#F3E8FF','--hs-task-done-border':'#C4B5FD',
      '--hs-xp-fill':'#EC4899','--hs-trust-bar':'#8B5CF6',
      '--hs-badge-bg':'rgba(236,72,153,0.15)','--hs-badge-text':'#9D174D',
    }
  },

  neural: {
    name:'Neural', emoji:'🤖', free:false, dark:true,
    desc:'Cyberpunk neon',
    vars:{
      '--hs-primary':'#22D3EE','--hs-primary-dark':'#0891B2','--hs-primary-light':'#67E8F9',
      '--hs-accent':'#A3E635','--hs-accent2':'#F43F5E',
      '--hs-header-grad':'linear-gradient(135deg,#000000 0%,#0C4A6E 60%,#164E63 100%)',
      '--hs-header-text':'#22D3EE',
      '--hs-body-bg':'#020617','--hs-card-bg':'#0C1A2E','--hs-card-text':'#E0F2FE',
      '--hs-subtext':'#67E8F9',
      '--hs-task-done-bg':'#052E16','--hs-task-done-border':'#A3E635',
      '--hs-xp-fill':'#22D3EE','--hs-trust-bar':'#A3E635',
      '--hs-badge-bg':'rgba(34,211,238,0.15)','--hs-badge-text':'#67E8F9',
    }
  },

  matchDay: {
    name:'Match Day', emoji:'⚽', free:false, dark:false,
    desc:'Green & white kit',
    vars:{
      '--hs-primary':'#16A34A','--hs-primary-dark':'#15803D','--hs-primary-light':'#86EFAC',
      '--hs-accent':'#FACC15','--hs-accent2':'#FFFFFF',
      '--hs-header-grad':'linear-gradient(135deg,#14532D 0%,#16A34A 60%,#22C55E 100%)',
      '--hs-header-text':'#FFFFFF',
      '--hs-body-bg':'#F0FDF4','--hs-card-bg':'#DCFCE7','--hs-card-text':'#14532D',
      '--hs-subtext':'#15803D',
      '--hs-task-done-bg':'#FEF9C3','--hs-task-done-border':'#FACC15',
      '--hs-xp-fill':'#16A34A','--hs-trust-bar':'#FACC15',
      '--hs-badge-bg':'rgba(22,163,74,0.15)','--hs-badge-text':'#14532D',
    }
  },

  respawn: {
    name:'Respawn', emoji:'🎮', free:false, dark:true,
    desc:'Gaming neon purple',
    vars:{
      '--hs-primary':'#C026D3','--hs-primary-dark':'#86198F','--hs-primary-light':'#E879F9',
      '--hs-accent':'#06B6D4','--hs-accent2':'#FACC15',
      '--hs-header-grad':'linear-gradient(135deg,#1A0027 0%,#4A0066 50%,#C026D3 100%)',
      '--hs-header-text':'#F5D0FE',
      '--hs-body-bg':'#0D0015','--hs-card-bg':'#1E0030','--hs-card-text':'#F5D0FE',
      '--hs-subtext':'#E879F9',
      '--hs-task-done-bg':'#083344','--hs-task-done-border':'#06B6D4',
      '--hs-xp-fill':'#C026D3','--hs-trust-bar':'#06B6D4',
      '--hs-badge-bg':'rgba(192,38,211,0.2)','--hs-badge-text':'#F5D0FE',
    }
  },

  offGrid: {
    name:'Off Grid', emoji:'🌿', free:false, dark:false,
    desc:'Earthy & calm',
    vars:{
      '--hs-primary':'#059669','--hs-primary-dark':'#047857','--hs-primary-light':'#6EE7B7',
      '--hs-accent':'#CA8A04','--hs-accent2':'#84CC16',
      '--hs-header-grad':'linear-gradient(135deg,#064E3B 0%,#059669 50%,#6EE7B7 100%)',
      '--hs-header-text':'#ECFDF5',
      '--hs-body-bg':'#F0FDF4','--hs-card-bg':'#D1FAE5','--hs-card-text':'#064E3B',
      '--hs-subtext':'#047857',
      '--hs-task-done-bg':'#FEF9C3','--hs-task-done-border':'#CA8A04',
      '--hs-xp-fill':'#059669','--hs-trust-bar':'#CA8A04',
      '--hs-badge-bg':'rgba(5,150,105,0.15)','--hs-badge-text':'#065F46',
    }
  },

  studio: {
    name:'Studio', emoji:'🎨', free:false, dark:false,
    desc:'Bold & creative',
    vars:{
      '--hs-primary':'#EA580C','--hs-primary-dark':'#9A3412','--hs-primary-light':'#FED7AA',
      '--hs-accent':'#7C3AED','--hs-accent2':'#06B6D4',
      '--hs-header-grad':'linear-gradient(135deg,#EA580C 0%,#F97316 40%,#FBBF24 100%)',
      '--hs-header-text':'#FFFFFF',
      '--hs-body-bg':'#FFF7ED','--hs-card-bg':'#FFEDD5','--hs-card-text':'#7C2D12',
      '--hs-subtext':'#9A3412',
      '--hs-task-done-bg':'#EDE9FE','--hs-task-done-border':'#A78BFA',
      '--hs-xp-fill':'#EA580C','--hs-trust-bar':'#7C3AED',
      '--hs-badge-bg':'rgba(234,88,12,0.15)','--hs-badge-text':'#9A3412',
    }
  },

  grunge: {
    name:'Grunge', emoji:'🔥', free:false, dark:true,
    desc:'Raw & dark energy',
    vars:{
      '--hs-primary':'#EF4444','--hs-primary-dark':'#B91C1C','--hs-primary-light':'#FCA5A5',
      '--hs-accent':'#F97316','--hs-accent2':'#FBBF24',
      '--hs-header-grad':'linear-gradient(135deg,#0C0A09 0%,#44100A 60%,#7F1D1D 100%)',
      '--hs-header-text':'#FEF2F2',
      '--hs-body-bg':'#0C0A09','--hs-card-bg':'#1C0F0F','--hs-card-text':'#FEF2F2',
      '--hs-subtext':'#FCA5A5',
      '--hs-task-done-bg':'#1C1204','--hs-task-done-border':'#F97316',
      '--hs-xp-fill':'#EF4444','--hs-trust-bar':'#F97316',
      '--hs-badge-bg':'rgba(239,68,68,0.2)','--hs-badge-text':'#FCA5A5',
    }
  }
};

let currentHSTheme = 'vanilla';

function applyHSTheme(key, save) {
  const t = HS_THEMES[key] || HS_THEMES.vanilla;
  currentHSTheme = key;
  const root = document.documentElement;
  Object.entries(t.vars).forEach(([k,v]) => root.style.setProperty(k, v));
  // Dark body bg for dark themes
  const appEl = document.getElementById('screen-app');
  if(appEl) {
    appEl.style.background = 'var(--hs-body-bg)';
    appEl.style.color = t.dark ? 'var(--hs-card-text)' : '';
  }
  // CSS vars handle card theming automatically — no JS override needed
  // Update profile immediately so re-renders show correct active state
  if(currentProfile) currentProfile.theme = key;
  // Persist to Supabase if requested
  if(save && currentUser) {
    db.from('profiles').update({theme: key}).eq('id', currentUser.id).then(({error}) => { if(error) console.log('Theme save error:', error.message); });
  }
  // Update theme picker UI if open
  document.querySelectorAll('.hs-theme-card').forEach(el => {
    el.classList.toggle('hs-theme-card--active', el.dataset.themeKey === key);
  });
}

function renderHSThemePickerInto(container) {
  const proUser = (currentProfile?.subscription_status === 'pro' || currentProfile?.subscription_status === 'school_attached') || (isPro ? isPro() : false);
  const current = currentProfile?.theme || 'vanilla';
  const entries = Object.entries(HS_THEMES);
  const freeThemes = entries.filter(([,v]) => v.free);
  const proThemes  = entries.filter(([,v]) => !v.free);

  let html = `<div class="card" id="hsThemeCard">
    <div class="card-title">🎨 Your Theme</div>
    <p style="font-size:12px;color:var(--gray-500);margin-bottom:14px;">Pick your vibe. Free users get 2 themes — upgrade for all 10.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">`;

  freeThemes.forEach(([key, t]) => {
    const active = key === current;
    const grad = t.vars['--hs-header-grad'];
    const headerTxt = t.vars['--hs-header-text'];
    html += `<div class="hs-theme-card${active?' hs-theme-card--active':''}" data-theme-key="${key}"
      onclick="applyHSTheme('${key}',true);renderHSThemePickerInto(document.getElementById('themesDrawerContent'));"
      style="border-radius:14px;overflow:hidden;border:3px solid ${active?'#FFFFFF':'rgba(0,0,0,0.08)'};
      box-shadow:${active?'0 0 0 3px var(--hs-primary,var(--violet))':'none'};cursor:pointer;transition:all 0.2s;">
      <div style="background:${grad};padding:14px 8px;text-align:center;">
        <div style="font-size:26px;margin-bottom:4px;">${t.emoji}</div>
        <div style="font-family:'Nunito',sans-serif;font-weight:900;font-size:12px;color:${headerTxt};">${t.name}</div>
      </div>
      <div style="padding:8px;background:${t.vars['--hs-card-bg']};text-align:center;">
        <div style="font-size:10px;color:${t.vars['--hs-subtext']};">${t.desc}</div>
        ${active?`<div style="font-size:10px;font-weight:800;color:${t.vars['--hs-primary']};margin-top:3px;">✓ Active</div>`:''}
      </div>
    </div>`;
  });

  html += `</div>`;

  if (!proUser) {
    html += `<div style="background:linear-gradient(135deg,rgba(124,58,237,0.08),rgba(16,185,129,0.05));border:1.5px solid rgba(124,58,237,0.2);border-radius:14px;padding:14px;margin-bottom:12px;">
      <div style="font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;color:var(--violet);margin-bottom:10px;">⭐ Pro Themes (8 more)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:12px;">`;
    proThemes.forEach(([key, t]) => {
      html += `<div style="text-align:center;opacity:0.5;">
        <div style="font-size:24px;">${t.emoji}</div>
        <div style="font-size:10px;font-weight:700;">${t.name}</div>
      </div>`;
    });
    html += `</div>
      <button onclick="showPaywall('upgrade','Unlock All Themes','Get 8 more theme skins + teacher connection + unlimited AI')" 
        style="width:100%;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--violet),var(--violet-dark));color:white;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;cursor:pointer;margin-bottom:8px;">
        🎨 Unlock All Themes + Create Your Own
      </button>
      <p style="font-size:11px;color:var(--gray-500);text-align:center;margin:0;">Mix colours, pick your vibe — Pro only</p>
    </div>`;
  } else {
    // Pro user — show all themes
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">`;
    proThemes.forEach(([key, t]) => {
      const active = key === current;
      const pg = t.vars['--hs-header-grad'];
      const pt = t.vars['--hs-header-text'];
      html += `<div class="hs-theme-card${active?' hs-theme-card--active':''}" data-theme-key="${key}"
        onclick="applyHSTheme('${key}',true);renderHSThemePickerInto(document.getElementById('themesDrawerContent'));"
        style="border-radius:14px;overflow:hidden;border:3px solid ${active?'#FFFFFF':'rgba(0,0,0,0.08)'};
        box-shadow:${active?'0 0 0 3px var(--hs-primary,var(--violet))':'none'};cursor:pointer;transition:all 0.2s;">
        <div style="background:${pg};padding:14px 8px;text-align:center;">
          <div style="font-size:26px;margin-bottom:4px;">${t.emoji}</div>
          <div style="font-family:'Nunito',sans-serif;font-weight:900;font-size:12px;color:${pt};">${t.name}</div>
        </div>
        <div style="padding:8px;background:${t.vars['--hs-card-bg']};text-align:center;">
          <div style="font-size:10px;color:${t.vars['--hs-subtext']};">${t.desc}</div>
          ${active?`<div style="font-size:10px;font-weight:800;color:${t.vars['--hs-primary']};margin-top:3px;">✓ Active</div>`:''}
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;

  container.innerHTML = html;
}

function renderHSThemePicker() {
  const placeholder = document.getElementById('hsThemeCardPlaceholder');
  if(placeholder) renderHSThemePickerInto(placeholder);
}

const trustConfig = {
  verify:   { label:'🔴 Verify Mode', cls:'trust-verify', color:'var(--rose)', next:'21 points to Check mode' },
  check:    { label:'🟡 Check Mode', cls:'trust-check', color:'var(--amber)', next:'51 points to Trust mode' },
  trust:    { label:'🟢 Trust Mode', cls:'trust-trust', color:'var(--mint)', next:'81 points to Champion!' },
  champion: { label:'⭐ Champion!', cls:'trust-champion', color:'var(--violet)', next:'Maximum trust achieved!' }
};

