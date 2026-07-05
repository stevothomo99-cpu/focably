// ── CONFETTI CELEBRATION ──
function burstConfetti(el) {
  const emojis = ['⭐','🌟','✨','🎉','🏆','💫','🎊','⚡','🔥','💥','🎯','🥳'];
  const rect = el.getBoundingClientRect();
  const cx = rect.width > 0 ? rect.left + rect.width/2 : window.innerWidth/2;
  const cy = rect.height > 0 ? rect.top + rect.height/2 : window.innerHeight/2;
  const anims = ['confettiFall','confettiUp','confettiLeft','confettiRight','confettiUp','confettiFall'];
  
  // Wave 1 — immediate burst (25 particles)
  for(let i=0; i<25; i++) {
    const particle = document.createElement('div');
    particle.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    const angle = (Math.PI * 2 * i) / 25;
    const spread = 30 + Math.random() * 80;
    particle.style.cssText = `
      position:fixed;
      left:${cx + Math.cos(angle)*spread}px;
      top:${cy + Math.sin(angle)*spread*0.4}px;
      font-size:${18+Math.random()*16}px;
      pointer-events:none;
      z-index:9999;
      animation:${anims[Math.floor(Math.random()*anims.length)]} ${2.0+Math.random()*1.0}s ease forwards;
      animation-delay:${Math.random()*0.1}s;
    `;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 3200);
  }

  // Wave 2 — delayed second burst (15 more)
  setTimeout(() => {
    for(let i=0; i<15; i++) {
      const particle = document.createElement('div');
      particle.textContent = emojis[Math.floor(Math.random()*emojis.length)];
      particle.style.cssText = `
        position:fixed;
        left:${cx + (Math.random()-0.5)*160}px;
        top:${cy + (Math.random()-0.5)*60}px;
        font-size:${14+Math.random()*20}px;
        pointer-events:none;
        z-index:9999;
        animation:confettiUp ${1.8+Math.random()*1.2}s ease forwards;
      `;
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 3200);
    }
  }, 400);

  // Big star flash
  const flash = document.createElement('div');
  flash.textContent = '⭐';
  flash.style.cssText = `
    position:fixed;
    left:${cx-30}px;
    top:${cy-30}px;
    font-size:60px;
    pointer-events:none;
    z-index:9999;
    animation:starPop 1.2s ease forwards;
  `;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 1400);

  // Wave 3 — late stragglers
  setTimeout(() => {
    for(let i=0; i<10; i++) {
      const particle = document.createElement('div');
      particle.textContent = emojis[Math.floor(Math.random()*emojis.length)];
      particle.style.cssText = `
        position:fixed;
        left:${cx + (Math.random()-0.5)*200}px;
        top:${cy + (Math.random()-0.5)*80}px;
        font-size:${20+Math.random()*18}px;
        pointer-events:none;
        z-index:9999;
        animation:confettiFall ${1.5+Math.random()*1.0}s ease forwards;
      `;
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 2800);
    }
  }, 800);

  // Ring pulse
  const ring = document.createElement('div');
  ring.style.cssText = `
    position:fixed;
    left:${cx-20}px;
    top:${cy-20}px;
    width:40px;
    height:40px;
    border-radius:50%;
    border:3px solid var(--amber);
    pointer-events:none;
    z-index:9998;
    animation:starRing 1.0s ease forwards;
  `;
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), 1200);
}

function celebrateStep(stepEl) {
  // Add success styling
  stepEl.classList.add('step-success');
  stepEl.classList.remove('done');
  // Update circle
  const circle = stepEl.querySelector('.step-circle');
  if(circle) { circle.textContent='✓'; circle.style.fontSize='14px'; }
  // Update title
  const title = stepEl.querySelector('.step-title');
  if(title) title.innerHTML = '🌟 ' + title.textContent.replace('🌟 ','');
  // Burst confetti
  burstConfetti(stepEl);
  // Show XP/star toast with flair
  setTimeout(() => showToast('⭐ Step complete! Keep going!'), 100);
}

// ── REFRESH ──
async function refreshCurrentView() {
  const btn = document.getElementById('refreshBtn');
  if(btn) { btn.style.animation = 'spin 0.6s linear'; btn.textContent = '↻'; }
  try {
    if(currentProfile.role === 'student') {
      // Preserve currentChildRecord across refresh — re-fetch if missing
      if(!currentChildRecord && currentUser) {
        const {data:kids} = await dbQuery(db.from('children').select('*').eq('profile_id',currentUser.id).order('created_at',{ascending:false}).limit(1), 5000, []);
        if(kids?.[0]) currentChildRecord = kids[0];
      }
      await loadStudentAssignments(currentProfile.age_group);
    } else if(currentProfile.role === 'parent') {
      // Re-fetch children in case a new child linked since last load
      if(currentFamily) {
        const {data:freshChildren} = await dbQuery(db.from('children').select('*').eq('family_id', currentFamily.id), 8000, []);
        currentChildren = freshChildren || [];
        renderChildTabs();
        if(currentChildren.length && !selectedChildId) selectedChildId = currentChildren[0].id;
      }
      if(selectedChildId) await loadChildStats(selectedChildId);
      await loadApprovalQueues();
      await loadParentRedemptions();
    } else if(currentProfile.role === 'teacher') {
      if(selectedClassId) await loadTeacherClassAssignments(selectedClassId);
      await loadApprovalQueues();
    }
    showToast('✅ Updated!');
  } catch(e) {
    showToast('❌ Refresh failed — try again');
  }
  if(btn) { btn.style.animation = ''; }
}

// ── ROLE SWITCHER ──
function switchRole(role) {
  // Hide drawer screens too
  ['new-assignment','archive'].forEach(s => {
    const el = document.getElementById('screen-'+s);
    if(el) el.style.display = 'none';
  });
  ['student','parent','teacher'].forEach(r => {
    const v = document.getElementById('view-'+r);
    if(v) v.style.display = r===role ? 'block' : 'none';
  });
}

// ── AI BREAKDOWN ──
async function breakdownTask() {
  const input=document.getElementById('questInput').value.trim();
  if(!input){showToast('✏️ Describe your task first!');return;}
  const allowed2 = await checkAIImportLimit();
  if(!allowed2) return;
  const t=themes[currentProfile?.theme||'fantasy'];
  const btn=document.getElementById('aiBtn');
  btn.disabled=true;document.getElementById('aiBtnText').textContent='✨ Summoning...';
  document.getElementById('aiSteps').innerHTML='';document.getElementById('aiResult').classList.remove('visible');
  try {
    const res=await fetch(AI_PROXY_URL,{method:'POST',headers:(await aiHeaders()),body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:`You help primary school kids with ADHD break assignments into fun steps styled as ${t.aiStyle}. Return ONLY a raw JSON array of 4-6 steps. Each: "step" (fun, max 8 words) and "stars" (1 or 2). No markdown, no backticks.`,messages:[{role:'user',content:`Break into steps: ${input}`}]})});
    const data=await res.json();
    const steps=JSON.parse(data.content[0].text.replace(/```json|```/g,'').trim());
    await incrementAIImportCount();
    document.getElementById('aiSteps').innerHTML=steps.map((s,i)=>`<div class="ai-step"><div class="ai-num">${i+1}</div><div style="flex:1">${s.step}</div><div>${'⭐'.repeat(s.stars||1)}</div></div>`).join('');
    document.getElementById('aiResult').classList.add('visible');
  } catch(e) {
    document.getElementById('aiSteps').innerHTML='<div style="font-size:13px;color:var(--rose)">Couldn\'t reach wizard. Check connection!</div>';
    document.getElementById('aiResult').classList.add('visible');
  }
  btn.disabled=false;document.getElementById('aiBtnText').textContent=t.aiBtnText;
}

async function breakdownHS() {
  const input=document.getElementById('hsInput').value.trim();
  if(!input){showToast('✏️ Describe your assignment first!');return;}
  const allowed3 = await checkAIImportLimit();
  if(!allowed3) return;
  const btn=document.getElementById('hsAiBtn');
  btn.disabled=true;document.getElementById('hsAiBtnText').textContent='⏳ Breaking it down...';
  document.getElementById('hsAiSteps').innerHTML='';document.getElementById('hsAiResult').classList.remove('visible');
  try {
    const res=await fetch(AI_PROXY_URL,{method:'POST',headers:(await aiHeaders()),body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:`You help high school students with ADHD break assignments into clear steps. Return ONLY a raw JSON array of 4-6 steps. Each: "step" (clear action, max 9 words) and "xp" (10, 15, or 20). No markdown, no backticks.`,messages:[{role:'user',content:`Break this assignment into steps: ${input}`}]})});
    const data=await res.json();
    const steps=JSON.parse(data.content[0].text.replace(/```json|```/g,'').trim());
    document.getElementById('hsAiSteps').innerHTML=steps.map((s,i)=>`<div class="ai-step"><div class="ai-num">${i+1}</div><div style="flex:1">${s.step}</div><div style="font-size:11px;font-weight:700;color:var(--amber)">+${s.xp} XP</div></div>`).join('');
    await incrementAIImportCount();
    document.getElementById('hsAiResult').classList.add('visible');
  } catch(e) {
    document.getElementById('hsAiSteps').innerHTML='<div style="font-size:13px;color:var(--rose)">Connection error. Try again.</div>';
    document.getElementById('hsAiResult').classList.add('visible');
  }
  btn.disabled=false;document.getElementById('hsAiBtnText').textContent='Break into Steps';
}

// ── NOTIFICATIONS + PWA ──
async function enableNotifications() {
  const btn = document.getElementById('enableNotifsBtn');
  const status = document.getElementById('notifStatus');
  if(!('Notification' in window)) {
    if(status) status.textContent = '❌ Notifications not supported in this browser';
    return;
  }
  if(btn) { btn.disabled=true; btn.textContent='Requesting...'; }
  const permission = await Notification.requestPermission();
  if(permission === 'granted') {
    if(status) { status.textContent = '✅ Notifications enabled!'; status.style.background='#ECFDF5'; }
    if(btn) btn.style.display='none';
    await subscribeToPush();
    showToast('🔔 Notifications enabled!');
  } else if(permission === 'denied') {
    if(status) { status.textContent = '❌ Blocked — enable in browser settings'; status.style.background='#FFF1F2'; }
    if(btn) { btn.disabled=false; btn.textContent='🔔 Enable Notifications'; }
  } else {
    if(status) { status.textContent = '⚠️ Permission dismissed — try again'; }
    if(btn) { btn.disabled=false; btn.textContent='🔔 Enable Notifications'; }
  }
}

async function updateNotifStatus() {
  const status = document.getElementById('notifStatus');
  const btn = document.getElementById('enableNotifsBtn');
  const card = document.getElementById('notifCard');
  // Always keep card visible
  if(card) card.style.display = 'block';
  if(!status) return;
  if(!('Notification' in window)) {
    status.textContent = '❌ Not supported in this browser';
    if(btn) btn.style.display='none';
    return;
  }
  if(Notification.permission === 'granted') {
    status.textContent = '✅ On';
    if(btn) { btn.textContent = '🔔 Enabled'; btn.style.opacity='0.6'; btn.style.display='block'; }
    await subscribeToPush();
  } else if(Notification.permission === 'denied') {
    status.textContent = '❌ Blocked';
    if(btn) { btn.textContent = '🔔 Enable'; btn.style.display='block'; btn.style.opacity='1'; }
  } else {
    status.textContent = '';
    if(btn) { btn.textContent = '🔔 Enable'; btn.style.display='block'; btn.style.opacity='1'; }
  }
}

async function requestNotificationPermission() {
  if(!('Notification' in window)) return;
  if(Notification.permission === 'granted') {
    await subscribeToPush();
    return;
  }
  if(Notification.permission !== 'default') return;
  setTimeout(async() => {
    const permission = await Notification.requestPermission();
    if(permission === 'granted') {
      showToast('🔔 Notifications enabled!');
      await subscribeToPush();
    }
  }, 4000);
}

async function subscribeToPush() {
  if(!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const subscription = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BNXQMt9GXyAdtZFj58uSmh69Xeifj_oCL-9jzpj-wBY-WOth7tqcOl7iSFBIyx3slgH_p9--qYft8kTTrKHWIAw')
    });
    // Store subscription in Supabase
    await dbQuery(db.from('push_subscriptions').upsert({
      user_id: currentUser.id,
      subscription: subscription.toJSON()
    }, {onConflict: 'user_id'}));
    console.log('Push subscription saved');
  } catch(e) {
    console.log('Push subscription failed:', e.message);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function sendPushToUser(userId, title, body) {
  try {
    const {data:sub} = await dbQuery(
      db.from('push_subscriptions').select('subscription').eq('user_id', userId).maybeSingle()
    );
    if(!sub?.subscription) return;
    // Call Supabase Edge Function
    await fetch('https://mxgnrgajspprupzxaeld.supabase.co/functions/v1/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (await db.auth.getSession()).data.session?.access_token
      },
      body: JSON.stringify({
        subscription: sub.subscription,
        title,
        body,
        icon: '/icon-192.png'
      })
    });
  } catch(e) {
    console.log('Push send error:', e.message);
  }
}

// Sends a branded transactional email via the send-transactional Edge Function.
// Called (fire-and-forget) at each notification trigger point across the app.
async function sendTransactionalEmail(type, data) {
  try {
    await fetch('https://mxgnrgajspprupzxaeld.supabase.co/functions/v1/send-transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (await db.auth.getSession()).data.session?.access_token
      },
      body: JSON.stringify({ type, data })
    });
  } catch(e) {
    console.log('Transactional email error:', e.message);
  }
}
// ── Unified due-date urgency scheme — the single source of truth for every
// assignment/task tile colour across Teacher, Student (Primary + HS), and
// Parent views. Rule: overdue or due within 48h -> red; due within 7 days ->
// orange; due beyond 7 days (or no due date) -> green; completed -> grey with
// strikethrough (overrides everything else).
function getDueUrgency(dueDate, isComplete) {
  if(isComplete) return 'done';
  if(!dueDate) return 'green';
  // due_date is a calendar date with no time component, so compare whole
  // local days (not raw hours) to avoid timezone/DST off-by-ones — same
  // approach the original student-tile code used.
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  const dueStr = dueDate.split('T')[0];
  if(dueStr <= todayStr) return 'red'; // due today or already overdue
  const due = new Date(dueStr + 'T12:00:00');
  const todayNoon = new Date(todayStr + 'T12:00:00');
  const diffDays = Math.round((due - todayNoon) / (1000*60*60*24));
  if(diffDays <= 2) return 'red';      // due tomorrow or the day after — within ~48h
  if(diffDays <= 7) return 'orange';
  return 'green';
}

// An assignment's colour is the WORST (most urgent) of: its own due date, and
// any of its incomplete steps' own due date (steps can optionally carry a due
// date separate from the assignment's, set by the teacher or AI-extracted on
// import). A step that's already done doesn't drag the colour down regardless
// of what its due date was — only completing every step does that, via the
// isComplete param below. This is what makes one overdue step turn the whole
// assignment (and therefore the whole class tile) red, even if the assignment
// itself isn't due for weeks.
const URGENCY_RANK = { red: 0, orange: 1, green: 2, done: 3 };
function getAssignmentUrgency(assignment) {
  const tasks = assignment.tasks || [];
  const allDone = tasks.length > 0 && tasks.every(t => t.completed);
  let worst = getDueUrgency(assignment.due_date, false);
  tasks.forEach(t => {
    if(t.due_date && !t.completed) {
      const stepUrgency = getDueUrgency(t.due_date, false);
      if(URGENCY_RANK[stepUrgency] < URGENCY_RANK[worst]) worst = stepUrgency;
    }
  });
  return allDone ? 'done' : worst;
}

// Colour/label lookup for the gradient-tile views (student Primary/HS)
const DUE_URGENCY_TILE = {
  red:    { tile: 'linear-gradient(135deg,#9B1C1C,#DC2626)', bg: 'rgba(153,27,27,0.6)',  anim: 'glowRed 2s infinite',  label: '⚠️ Due Soon' },
  orange: { tile: 'linear-gradient(135deg,#F59E0B,#F97316)', bg: 'rgba(180,52,3,0.55)',  anim: 'glowAmber 2s infinite', label: '⏰ Due This Week' },
  green:  { tile: 'linear-gradient(135deg,#064E3B,#10B981)', bg: 'rgba(6,95,70,0.55)',   anim: 'none', label: '✅ On Track' },
  done:   { tile: 'linear-gradient(135deg,#374151,#6B7280)', bg: 'rgba(0,0,0,0.45)',     anim: 'none', label: '✓ Complete' },
};

// Colour lookup for the flat-colour views (Teacher, Parent) that use CSS vars
const DUE_URGENCY_VAR = { red: 'var(--rose)', orange: 'var(--amber)', green: 'var(--mint)', done: 'var(--gray-400)' };
// Light tinted backgrounds for the same buckets, for Parent's white-card UI —
// the whole card/row is tinted (not just a thin accent bar), same rule as
// the gradient-tile Student views.
const DUE_URGENCY_BG = { red: 'var(--rose-bg)', orange: 'var(--amber-bg)', green: 'var(--mint-bg)', done: 'var(--gray-100)' };

// Escapes HTML and preserves line breaks so multi-line instructions render as
// readable, ADHD-friendly text instead of a collapsed wall. Numbered/bulleted
// points that were pasted on one line get pushed onto their own line too.
function formatDescription(text) {
  if(!text) return '';
  const escaped = String(text)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
  // Put "1." / "2)" / "-" / "•" list markers on their own line if they were
  // run together in one paragraph
  const withBreaks = escaped
    .replace(/\s+(?=\d+[.)]\s)/g, '\n')     // before "1." / "2)"
    .replace(/\s+(?=[•\-–]\s)/g, '\n');      // before bullet markers
  return withBreaks.replace(/\n/g, '<br>');
}

// Classes are created with just a name + year group now, but older classes may
// still have a distinct `subject` — only surface it when it adds information.
function classSubjectIfDistinct(cls) {
  if(!cls?.subject || !cls?.name) return cls?.subject || '';
  return cls.subject.trim().toLowerCase() === cls.name.trim().toLowerCase() ? '' : cls.subject;
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;setTimeout(()=>{if(document.getElementById('screen-app').style.display!=='none'){const b=document.createElement('div');b.id='installBanner';b.style.cssText='position:fixed;bottom:80px;left:14px;right:14px;background:var(--indigo);color:white;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;z-index:998;box-shadow:0 8px 24px rgba(30,27,75,0.4);';b.innerHTML=`<div style="font-size:26px;">📱</div><div style="flex:1"><div style="font-weight:700;font-size:14px;">Install FocablyED</div><div style="font-size:12px;opacity:0.75;">Add to home screen</div></div><button onclick="installApp()" style="padding:8px 14px;border-radius:20px;border:none;background:var(--violet);color:white;font-weight:700;font-size:12px;cursor:pointer;">Install</button><button onclick="document.getElementById('installBanner').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:20px;cursor:pointer;padding:0 4px;">×</button>`;document.body.appendChild(b);}},15000);});
async function installApp(){if(!deferredPrompt)return;deferredPrompt.prompt();const r=await deferredPrompt.userChoice;deferredPrompt=null;document.getElementById('installBanner')?.remove();if(r.outcome==='accepted')showToast('🎉 FocablyED installed!');}

// ── SHARED APPROVAL QUEUE ──
// Pulls from Supabase tasks where verification_required=true and verification_status='pending'
// Renders to both parent and teacher queues; approving/rejecting from either clears both.

async function loadApprovalQueues() {
  // Parent queue — tasks for their children
  if(currentProfile?.role === 'parent' && currentChildren?.length) {
    const childIds = currentChildren.map(c => c.id);
    const {data:tasks} = await dbQuery(
      db.from('tasks')
        .select('*, assignments(title, class_id, classes(name, subject, profiles(full_name))), children(name)')
        .in('child_id', childIds)
        .eq('verification_required', true)
        .eq('verification_status', 'pending')
        .order('proof_submitted_at', {ascending: true}),
      8000, []
    );
    renderApprovalQueue('parent', tasks||[]);
    loadParentRedemptions();
  }
  // Teacher queue — tasks for assignments in the currently selected class only
  if(currentProfile?.role === 'teacher') {
    if(!selectedClassId) { renderApprovalQueue('teacher', []); return; }
    const {data:assignments} = await dbQuery(
      db.from('assignments').select('id').eq('class_id', selectedClassId).eq('status', 'active'),
      8000, []
    );
    if(assignments?.length) {
      const ids = assignments.map(a => a.id);
      const {data:tasks} = await dbQuery(
        db.from('tasks')
          .select('*, assignments(title, class_id, classes(name, subject, profiles(full_name))), children(name)')
          .in('assignment_id', ids)
          .eq('verification_required', true)
          .eq('verification_status', 'pending')
          .order('proof_submitted_at', {ascending: true}),
        8000, []
      );
      renderApprovalQueue('teacher', tasks||[]);
    } else {
      renderApprovalQueue('teacher', []);
    }
  }
}

function renderApprovalQueue(role, tasks) {
  const card = document.getElementById(`${role}-approval-card`);
  const queue = document.getElementById(`${role}-approval-queue`);
  if(!card || !queue) return;

  if(!tasks.length) {
    card.style.display = 'none';
    queue.innerHTML = '';
    return;
  }
  card.style.display = 'block';
  queue.innerHTML = tasks.map(task => {
    const student = task.children?.name || 'Student';
    const initial = student.charAt(0).toUpperCase();
    const assignTitle = task.assignments?.title || 'Assignment';
    const className = task.assignments?.classes?.name || task.assignments?.classes?.subject || '';
    const teacherName = task.assignments?.classes?.profiles?.full_name || '';
    const submitted = task.proof_submitted_at
      ? new Date(task.proof_submitted_at).toLocaleDateString('en-AU', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})
      : '';
    const contextParts = [className, assignTitle, teacherName ? `Set by ${teacherName}` : ''].filter(Boolean);

    // Proof attachment — compact link only, no inline image
    const isImage = task.proof_url && task.proof_url.match(/\.(jpg|jpeg|png|gif|webp)/i);
    const proofLink = task.proof_url
      ? `<a href="${task.proof_url}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--violet);text-decoration:none;margin-bottom:10px;">
          ${isImage ? '🖼️' : '📄'} View ${isImage ? 'Photo' : 'Document'} ↗
        </a>`
      : '';

    return `<div class="approval-item" id="approval-${role}-${task.id}">
      <div class="approval-who">
        <div class="approval-avatar">${initial}</div>
        <div class="approval-student">${student}</div>
        <div class="approval-time">${submitted}</div>
      </div>
      <div class="approval-step">✏️ ${task.title}</div>
      <div class="approval-context">${contextParts.join(' · ')}</div>
      ${proofLink}
      <div class="approval-actions">
        <button class="approval-approve" onclick="resolveApproval('${task.id}','${task.child_id}','approve','${role}')">✓ Approve</button>
        <button class="approval-reject"  onclick="resolveApproval('${task.id}','${task.child_id}','reject','${role}')">✕ Reject</button>
      </div>
    </div>`;
  }).join('');
}

async function resolveApproval(taskId, childId, action, fromRole) {
  // Update Supabase
  if(action === 'approve') {
    // Always write the definitive task state so the student view updates,
    // regardless of whether the RPC exists or what it does internally.
    const {error:updErr} = await dbQuery(db.from('tasks').update({
      verification_status: 'approved',
      verified_by: currentUser.id,
      verified_at: new Date().toISOString(),
      completed: true,
      completed_at: new Date().toISOString()
    }).eq('id', taskId));
    if(updErr) console.log('approve update error:', updErr.message);
    // Run the RPC too (for trust score / star award side effects), but don't depend on it
    try { await db.rpc('approve_task_verification', {p_task_id: taskId, p_approver_id: currentUser.id}); }
    catch(e) { await updateTrustScoreManual(childId, 'approved'); }
  } else {
    await dbQuery(db.from('tasks').update({
      verification_status: 'rejected', verified_by: currentUser.id,
      verified_at: new Date().toISOString(), completed: false,
      proof_url: null, proof_submitted_at: null
    }).eq('id', taskId));
    await updateTrustScoreManual(childId, 'rejected');
  }

  // Remove from BOTH queues
  ['parent','teacher'].forEach(role => {
    const el = document.getElementById(`approval-${role}-${taskId}`);
    if(el) {
      el.style.transition = 'opacity 0.3s';
      el.style.opacity = '0';
      setTimeout(() => {
        el.remove();
        // Hide card if queue now empty
        const queue = document.getElementById(`${role}-approval-queue`);
        const card = document.getElementById(`${role}-approval-card`);
        if(queue && card && !queue.querySelector('.approval-item')) card.style.display = 'none';
      }, 300);
    }
  });

  showToast(action === 'approve' ? '✅ Step approved!' : '✕ Step rejected');

  // If teacher approved/rejected — notify parent
  if(fromRole === 'teacher') {
    try {
      const {data:task} = await dbQuery(
        db.from('tasks').select('title, assignments(title, classes(name))').eq('id', taskId).maybeSingle()
      );
      const {data:children} = await dbQuery(
        db.from('children').select('*, families(parent_id)').eq('id', childId).limit(1)
      );
      const parentId = children?.[0]?.families?.parent_id;
      if(parentId && task) {
        const cls = task.assignments?.classes?.name || '';
        const aTitle = task.assignments?.title || '';
        const notifTitle = action === 'approve' ? '✅ Step approved by teacher' : '✕ Step needs more work';
        const notifBody = `"${task.title}"${aTitle ? ' — ' + aTitle : ''}${cls ? ' (' + cls + ')' : ''}`;
        await dbQuery(db.from('notifications').insert({
          recipient_id: parentId, sender_id: currentUser.id,
          child_id: childId, type: action === 'approve' ? 'proof_approved' : 'proof_rejected',
          title: notifTitle, body: notifBody
        }));
        await sendPushToUser(parentId, notifTitle, notifBody);
      }
    } catch(e) { console.log('Approval notify error:', e.message); }
  }

  // Notify the student themselves (so their app reflects the change)
  try {
    const {data:child} = await dbQuery(db.from('children').select('profile_id').eq('id', childId).maybeSingle());
    const studentId = child?.profile_id;
    if(studentId) {
      const {data:t} = await dbQuery(db.from('tasks').select('title').eq('id', taskId).maybeSingle());
      const sTitle = action === 'approve' ? '✅ Step approved!' : '✏️ Step needs another go';
      const sBody = action === 'approve'
        ? `"${t?.title||'Your task'}" was approved — stars earned! ⭐`
        : `"${t?.title||'Your task'}" was sent back — give it another try.`;
      await dbQuery(db.from('notifications').insert({
        recipient_id: studentId, sender_id: currentUser.id,
        child_id: childId, type: action === 'approve' ? 'proof_approved' : 'proof_rejected',
        title: sTitle, body: sBody
      }));
      await sendPushToUser(studentId, sTitle, sBody);
      // Email student
      if(action === 'approve') {
        const {data:taskData} = await dbQuery(db.from('tasks').select('star_value').eq('id', taskId).maybeSingle());
        sendTransactionalEmail('proof_approved', { studentId, taskTitle: t?.title || 'Your task', stars: taskData?.star_value || 0 });
      } else {
        sendTransactionalEmail('proof_rejected', { studentId, taskTitle: t?.title || 'Your task' });
      }
    }
  } catch(e) { console.log('Student notify error:', e.message); }
}

// ── ARCHIVE — JS state (swap for Supabase when ready) ──
// Archive data — loaded from Supabase each time the archive screen opens
let archivedAssignments = [];
let archivedClasses = [];

async function loadArchivedItems() {
  try {
    // Load archived classes for this teacher
    const {data:classes} = await dbQuery(
      db.from('classes')
        .select('id, name, updated_at')
        .eq('teacher_id', currentUser.id)
        .eq('status','archived')
        .order('updated_at', {ascending:false})
    );
    archivedClasses = (classes||[]).map(c=>({
      classId: c.id,
      className: c.name,
      archivedAt: new Date(c.updated_at).toLocaleDateString('en-AU')
    }));

    // Load archived assignments for classes this teacher owns
    const classIds = (await dbQuery(
      db.from('classes').select('id').eq('teacher_id', currentUser.id)
    ))?.data?.map(c=>c.id) || [];

    let rows = [];
    if(classIds.length) {
      const {data:asgns} = await dbQuery(
        db.from('assignments')
          .select('id, title, class_id, updated_at')
          .in('class_id', classIds)
          .eq('status','archived')
          .order('updated_at', {ascending:false})
      );
      rows = asgns||[];
    }

    // Group by title+class so multi-student assignments appear as one row
    const grouped = {};
    rows.forEach(a => {
      const key = a.title+'|'+a.class_id;
      if(!grouped[key]) grouped[key] = {title:a.title, assignmentIds:[], archivedAt: new Date(a.updated_at).toLocaleDateString('en-AU')};
      grouped[key].assignmentIds.push(a.id);
    });
    archivedAssignments = Object.values(grouped);
  } catch(e) {
    console.log('loadArchivedItems error:', e.message);
  }
  refreshArchivedPanel();
}

async function archiveAssignment(taskId, title, assignmentId) {
  await dbQuery(db.from('assignments').update({status:'archived'}).eq('id', assignmentId));
  const tile = document.getElementById('assignTile-'+assignmentId);
  if(tile) {
    tile.style.transition='opacity 0.3s';
    tile.style.opacity='0';
    setTimeout(()=>{tile.remove();},300);
  }
  showToast(`🗄️ "${title}" archived`);
}

// Archive all instances of an assignment (same title/due, published to multiple students)
function handleArchiveClick(btn) {
  const key = btn.getAttribute('data-archive-key');
  const title = btn.getAttribute('data-archive-title');
  const ids = (btn.getAttribute('data-archive-ids')||'').split(',').filter(Boolean);
  if(!ids.length) { showToast('Nothing to archive'); return; }
  if(confirm(`Archive "${title}"?\n\nIt will be hidden from active assignments. You can restore it later from the Archive menu.`)) {
    archiveAssignmentGroup(key, title, ids);
  }
}

async function archiveAssignmentGroup(groupKey, title, assignmentIds) {
  // Archive all instances in Supabase
  for(const id of assignmentIds) {
    await dbQuery(db.from('assignments').update({status:'archived'}).eq('id', id));
  }
  // Animate tile out, then reload archive from Supabase
  const tile = document.getElementById('assignTile-'+groupKey);
  if(tile) {
    tile.style.transition='opacity 0.3s, max-height 0.3s';
    tile.style.opacity='0';
    setTimeout(()=>{tile.remove();},300);
  }
  showToast(`🗄️ "${title}" archived`);
}

async function archiveClass(classId, className, confirmEl) {
  confirmEl.classList.remove('visible');
  // Mark class archived in Supabase
  await dbQuery(db.from('classes').update({status:'archived'}).eq('id', classId));
  // archivedClasses reloaded from Supabase on next archive screen open
  // Notify all students via notification
  try {
    const {data:members} = await dbQuery(db.from('class_members').select('children(profile_id)').eq('class_id', classId));
    const studentIds = (members||[]).map(m=>m.children?.profile_id).filter(Boolean);
    for(const sid of studentIds) {
      await dbQuery(db.from('notifications').insert({
        recipient_id: sid,
        sender_id: currentUser.id,
        type: 'class_archived',
        title: '🎓 Year Complete!',
        body: `${className} has been completed for this year. Well done!`
      }));
      await sendPushToUser(sid, '🎓 Year Complete!', `${className} has been completed for this year. Well done!`);
    }
  } catch(e) { console.log('Archive notify error:', e.message); }
  refreshArchivedPanel();
  showToast(`🎓 ${className} archived — students notified!`);
  // Reload teacher app to reflect change
  setTimeout(()=>loadTeacherApp(), 500);
}

function showArchiveClassConfirm(classId, className) {
  const existing = document.getElementById('archiveConfirm-'+classId);
  if(existing) { existing.classList.toggle('visible'); return; }
  const card = document.getElementById('archiveClassCard');
  if(!card) return;
  const box = document.createElement('div');
  box.className = 'confirm-archive visible';
  box.id = 'archiveConfirm-'+classId;
  box.innerHTML = `
    <p>Archive <strong>${className}</strong>? All assignments will be hidden and students will receive a <strong>Year Complete 🎓</strong> notification.</p>
    <div class="confirm-row">
      <button class="confirm-yes" onclick="archiveClass('${classId}','${className}',this.closest('.confirm-archive'))">Yes, Archive</button>
      <button class="confirm-no" onclick="this.closest('.confirm-archive').classList.remove('visible')">Cancel</button>
    </div>`;
  card.appendChild(box);
}

function refreshArchivedPanel() {
  const section = document.getElementById('archived-section');
  if(!section) return;
  const hasAny = archivedAssignments.length > 0 || archivedClasses.length > 0;
  section.style.display = hasAny ? 'block' : 'none';
  const cc = document.getElementById('archived-classes-list');
  const ac = document.getElementById('archived-assignments-list');
  if(cc) cc.innerHTML = archivedClasses.length
    ? archivedClasses.map(c=>{
        const safeClass = c.className.replace(/'/g,"\'");
        return `<div class="archived-item"><div style="font-size:18px;">📚</div><div style="flex:1;"><div class="archived-item-title">${c.className}</div><div class="archived-item-meta">Archived ${c.archivedAt}</div></div><button class="restore-btn" data-class-id="${c.classId}" data-class-name="${c.className.replace(/"/g,"&quot;")}">Restore</button></div>`;
      }).join('')
    : '<div style="font-size:12px;color:var(--gray-400);font-style:italic;">None yet</div>';
  if(ac) ac.innerHTML = archivedAssignments.length
    ? archivedAssignments.map(a=>{
        const idsJson = JSON.stringify(a.assignmentIds);
        const safeTitle = a.title.replace(/"/g,"&quot;");
        return `<div class="archived-item"><div style="font-size:18px;">📄</div><div style="flex:1;"><div class="archived-item-title">${a.title}</div><div class="archived-item-meta">Archived ${a.archivedAt}</div></div><button class="restore-btn" data-assignment-ids="${safeTitle}" data-assignment-title="${safeTitle}" data-ids-json="${encodeURIComponent(idsJson)}">Restore</button></div>`;
      }).join('')
    : '<div style="font-size:12px;color:var(--gray-400);font-style:italic;">None yet</div>';
  // Attach event listeners for restore buttons (avoids inline onclick with complex args)
  if(cc) cc.querySelectorAll('.restore-btn[data-class-id]').forEach(btn => {
    btn.addEventListener('click', () => restoreClass(btn.dataset.classId, btn.dataset.className));
  });
  if(ac) ac.querySelectorAll('.restore-btn[data-ids-json]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ids = JSON.parse(decodeURIComponent(btn.dataset.idsJson));
      restoreAssignment(ids, btn.dataset.assignmentTitle);
    });
  });
}

async function restoreClass(classId, className) {
  await dbQuery(db.from('classes').update({status:'active'}).eq('id',classId));
  showToast(`✅ ${className} restored`);
  await loadArchivedItems();
  loadTeacherApp();
}

async function restoreAssignment(assignmentIds, title) {
  const ids = Array.isArray(assignmentIds) ? assignmentIds : [assignmentIds];
  for(const id of ids) {
    await dbQuery(db.from('assignments').update({status:'active'}).eq('id',id));
  }
  showToast(`✅ "${title}" restored`);
  await loadArchivedItems();
  if(selectedClassId) await loadTeacherClassAssignments(selectedClassId);
}

let archivePanelOpen = false;
function toggleArchivePanel() {
  archivePanelOpen = !archivePanelOpen;
  const panel = document.getElementById('archive-panel');
  const chevron = document.getElementById('archive-chevron');
  if(panel) panel.style.maxHeight = archivePanelOpen ? '2000px' : '0';
  if(chevron) chevron.style.transform = archivePanelOpen ? 'rotate(180deg)' : '';
}

// ── HAMBURGER DRAWER ──
function openDrawer() {
  const panel = document.getElementById('drawerPanel');
  const overlay = document.getElementById('drawerOverlay');
  // Populate drawer header
  const name = currentProfile?.full_name?.split(' ')[0] || '—';
  const role = currentProfile?.role ? currentProfile.role.charAt(0).toUpperCase() + currentProfile.role.slice(1) : '—';
  document.getElementById('drawerName').textContent = name;
  document.getElementById('drawerRole').textContent = role;
  // Render role-specific items
  renderDrawerItems();
  overlay.style.display = 'block';
  panel.style.right = '0';
  closeNotifPanel();
}

function closeDrawer() {
  document.getElementById('drawerPanel').style.right = '-280px';
  document.getElementById('drawerOverlay').style.display = 'none';
}

function renderDrawerItems() {
  const container = document.getElementById('drawerItems');
  const role = currentProfile?.role;
  let items = [];

  if(role === 'teacher') {
    const sRole = currentProfile?.school_role;
    const schoolItem = !currentProfile?.school_id
      ? { icon:'🏫', label:'Set Up / Join a School', action:`openSchoolSetup()`, disabled: false }
      : sRole === 'admin'
        ? { icon:'🏫', label:'School Admin — ' + (currentSchool?.name||'My School'), action:`openDrawerScreen('school-admin')`, disabled: false }
        : sRole === 'pending'
          ? { icon:'⏳', label:'Awaiting school approval', action:`showToast('Your request is pending admin approval')`, disabled: false }
          : { icon:'🏫', label: currentSchool ? currentSchool.name : 'My School', action:`openDrawerScreen('join-school')`, disabled: true, note:'Already in a school' };
    const licenseItem = currentProfile?.school_role === 'admin'
      ? { icon:'🔑', label:'School License', action:`openDrawerScreen('school-subscription')`, disabled: false }
      : null;
    items = [
      { icon:'📤', label:'New Assignment', action:`openDrawerScreen('new-assignment')`, disabled: !teacherClasses?.length, note: !teacherClasses?.length ? 'Create a class first' : '' },
      { icon:'📥', label:'Import Assignment', action:`openDrawerScreen('import-assignment')`, disabled: false },
      { icon:'🗄️', label:'Archive & Archived', action:`openDrawerScreen('archive')`, disabled: false },
      { icon:'➕', label:'Create New Class', action:`showCreateClassFromDrawer()`, disabled: false },
      schoolItem,
      ...(licenseItem ? [licenseItem] : []),
    ];
  } else if(role === 'parent') {
    const proItem = isPro()
      ? { icon:'⭐', label:'Family Pro — Active', action:`openDrawerScreen('subscription')`, disabled: false }
      : { icon:'⭐', label:'Upgrade to Family Pro', action:`showPaywall('upgrade','Upgrade to Family Pro','Unlock teacher connections, unlimited children, themes and more.')`, disabled: false };
    items = [
      { icon:'👶', label:'Manage Children', action:`openManageChildren()`, disabled: false },
      { icon:'➕', label:'Add Task for Child', action:`openDrawerScreen('add-task')`, disabled: false },
      { icon:'🎁', label:'Manage Rewards', action:`openDrawerScreen('manage-rewards')`, disabled: false },
      { icon:'📜', label:'Reward History', action:`openDrawerScreen('redemption-history')`, disabled: false },
      { icon:'📥', label:'Import Assignment', action:`openDrawerScreen('import-assignment')`, disabled: false },
      { icon:'📬', label:'Family Invite Code', action:`openDrawerScreen('family-invite')`, disabled: false },
      { icon:'🏫', label:'Join a Class', action:`openDrawerScreen('join-class')`, disabled: false },
      proItem,
    ];
  } else if(role === 'student') {
    const hasFamily = !!currentChildRecord; // set when child record found in loadStudentAssignments
    items = [
      { icon:'🧠', label:'Brain Dump', action:`openDrawerScreen('brain-dump')`, disabled: false },
      { icon:'🐿️', label:'Ask Squirrel', action:`openDrawerScreen('ai-breakdown')`, disabled: false },
      { icon:'🏫', label:'Join a Class', action:`openDrawerScreen('join-class')`, disabled: false },
      { icon:'📥', label:'Import Assignment', action:`openDrawerScreen('import-assignment')`, disabled: false },
      { icon:'🎭', label:'Change Avatar', action:`openDrawerScreen('change-avatar')`, disabled: false },
      { icon:'📜', label:'Reward History', action:`openDrawerScreen('redemption-history')`, disabled: false },
    ];
    // Add My Theme for HS students
    if(currentProfile?.age_group === 'highschool') {
      items.splice(items.length - 1, 0, { icon:'🎨', label:'My Theme', action:`openDrawerScreen('themes')`, disabled: false });
    }
    // Students can't unlink themselves from their family (a parent does that
    // from Manage Children if needed) — this is a safe, read-only lookup so
    // a kid can check whose family a code belongs to before anything else.
    if(hasFamily) {
      items.push({ icon:'🔗', label:'Link to Family', action:`openDrawerScreen('family-lookup')`, note:'View your family and add a code', disabled: false });
    }
  }

  container.innerHTML = items.map(item => `
    <div onclick="${item.disabled ? '' : item.action}" style="display:flex;align-items:center;gap:12px;padding:12px 20px;cursor:${item.disabled?'default':'pointer'};opacity:${item.disabled?'0.4':'1'};border-bottom:0.5px solid var(--gray-100);">
      <span style="font-size:18px;">${item.icon}</span>
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--indigo);">${item.label}</div>
        ${item.note ? `<div style="font-size:11px;color:var(--gray-500);">${item.note}</div>` : ''}
      </div>
    </div>
  `).join('');
}

let parentAssignmentCache = {};
const ALL_DRAWER_SCREENS = ['new-assignment','archive','add-task','family-invite','family-lookup','join-class','ai-breakdown','assignment-detail','create-school','join-school','change-avatar','import-assignment','settings','manage-rewards','school-admin','themes','manage-children','redemption-history','subscription','school-subscription','brain-dump'];

function openDrawerScreen(screen) {
  closeDrawer();
  // Hide all role views
  ['student','parent','teacher'].forEach(r => {
    const el = document.getElementById('view-'+r);
    if(el) el.style.display = 'none';
  });
  // Hide all drawer screens
  ALL_DRAWER_SCREENS.forEach(s => {
    const el = document.getElementById('screen-'+s);
    if(el) el.style.display = 'none';
  });
  // Show requested screen
  const target = document.getElementById('screen-'+screen);
  if(target) target.style.display = 'block';

  // Populate class dropdown for new assignment, default to current class
  if(screen === 'redemption-history') {
    loadRedemptionHistory();
  }

  if(screen === 'subscription') {
    loadSubscriptionScreen();
  }

  if(screen === 'school-subscription') {
    loadSchoolSubscriptionScreen();
  }

  if(screen === 'new-assignment') {
    const dd = document.getElementById('assignmentClass');
    if(dd) {
      dd.innerHTML = '<option value="">— Select a class —</option>' +
        teacherClasses.map(c => { const subj = classSubjectIfDistinct(c); return `<option value="${c.id}">${c.name}${subj?' — '+subj:''} ${c.year_group||''}</option>`; }).join('');
      if(selectedClassId) dd.value = selectedClassId;
    }
  }
  // Child selects for parent screens are populated at app load (loadParentApp)

  // AI import: update usage hint
  if(screen === 'import-assignment') {
    const hint = document.getElementById('aiImportUsageHint');
    if(hint) {
      if(isPro()) {
        hint.textContent = '⭐ Family Pro — unlimited Squirrel requests';
        hint.style.color = 'var(--mint)';
      } else {
        const used = currentProfile?.ai_import_count || 0;
        const remaining = Math.max(0, 3 - used);
        hint.textContent = remaining > 0
          ? `${remaining} of 3 free AI imports remaining this month`
          : '0 free imports left — upgrade for unlimited';
        hint.style.color = remaining > 0 ? 'var(--gray-400)' : 'var(--rose)';
      }
    }
  }

  // Add Task: reset visibility to Private and populate enrolled-class picker
  if(screen === 'add-task') {
    setTaskVisibility('private');
    populateTaskClassPicker();
    populateTaskCategoryList();
    selectedTaskStars = 1;
    selectTaskStars(1);
  }

  if(screen === 'family-lookup') {
    const input = document.getElementById('familyLookupCodeInput');
    if(input) input.value = '';
    loadMyFamilyInfo();
  }

  // Family invite: show existing code only if still valid, else just the generate button
  if(screen === 'family-invite') {
    const valid = currentFamily?.invite_code && currentFamily?.invite_code_expires_at && new Date(currentFamily.invite_code_expires_at) > new Date();
    const disp = document.getElementById('familyCodeDisplay');
    const genBtn = document.getElementById('familyGenBtn');
    if(valid) {
      document.getElementById('familyInviteCode').textContent = currentFamily.invite_code;
      document.getElementById('familyCodeExpiry').textContent = expiryLabel(currentFamily.invite_code_expires_at);
      if(disp) disp.style.display = 'block';
      if(genBtn) genBtn.textContent = '🔄 Generate New Code';
    } else {
      if(disp) disp.style.display = 'none';
      if(genBtn) genBtn.textContent = '🔑 Generate Invite Code';
    }
  }

  // Change avatar: populate grid with correct emoji set and show current avatar
  if(screen === 'school-admin') {
    loadSchoolAdmin();
  }

  if(screen === 'archive') {
    loadArchivedItems();
  }

  if(screen === 'settings') {
    footerNav('settings');
    return;
  }

  if(screen === 'manage-rewards') {
    // Populate child picker
    const picker = document.getElementById('rewardChildPicker');
    if(picker) {
      picker.innerHTML = '<option value="">— Select child —</option>' +
        currentChildren.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      // Auto-select if only one child
      if(currentChildren.length === 1) {
        picker.value = currentChildren[0].id;
        loadManageRewards();
      } else {
        loadManageRewards();
      }
    }
    // Reset add form
    selectedRewardEmoji = '🎁';
    const ep = document.getElementById('rewardEmojiPreview');
    if(ep) ep.textContent = '🎁';
    const rt = document.getElementById('rewardTitle');
    if(rt) rt.value = '';
    const rc = document.getElementById('rewardCost');
    if(rc) rc.value = '10';
  }

  if(screen === 'import-assignment') {
    // Reset to clean state each time
    document.getElementById('importPasteInput').value = '';
    document.getElementById('importConfirmCard').style.display = 'none';
    document.getElementById('importChildSelectWrap').style.display = 'none';
    document.getElementById('importClassWrap').style.display = 'none';

    // Show Teams card for students + teachers only
    const teamsCard = document.getElementById('teamsImportCard');
    const teamsDivider = document.getElementById('teamsImportDivider');
    const role = currentProfile?.role;
    const showTeams = role === 'student' || role === 'teacher';
    if(teamsCard) teamsCard.style.display = showTeams ? 'block' : 'none';
    if(teamsDivider) teamsDivider.style.display = showTeams ? 'flex' : 'none';

    // Reset Teams list if switching users
    if(showTeams) {
      const listDiv = document.getElementById('teamsAssignmentsList');
      if(listDiv && !msTeamsAccount) listDiv.style.display = 'none';
    }
  }

  if(screen === 'themes') {
    const container = document.getElementById('themesDrawerContent');
    if(container) renderHSThemePickerInto(container);
  }

  if(screen === 'change-avatar') {
    const age = currentProfile?.age_group;
    const hasPhoto = !!currentProfile?.avatar_photo;
    const currentEmoji = currentProfile?.avatar || (age==='primary' ? '🧙' : '🎓');
    const emojis = age === 'primary' ? AVATARS_PRIMARY : AVATARS_HS;
    // Reset tab to emoji
    avatarTabActive = 'emoji';
    selectedAvatarPhoto = null;
    switchAvatarTab('emoji');
    // Set preview
    const emojiPrev = document.getElementById('avatarPreviewEmoji');
    const photoPrev = document.getElementById('avatarPreviewPhoto');
    if(hasPhoto) {
      if(emojiPrev) emojiPrev.style.display='none';
      if(photoPrev){ photoPrev.src=currentProfile.avatar_photo; photoPrev.style.display='block'; }
    } else {
      if(emojiPrev){ emojiPrev.style.display='block'; emojiPrev.textContent=currentEmoji; }
      if(photoPrev){ photoPrev.src=''; photoPrev.style.display='none'; }
    }
    const grid = document.getElementById('changeAvatarGrid');
    if(grid) {
      grid.innerHTML = emojis.map(e =>
        `<div class="avatar-opt${e===currentEmoji&&!hasPhoto?' selected':''}" onclick="selectChangeAvatar('${e}',this)">${e}</div>`
      ).join('');
    }
    selectedAvatar = hasPhoto ? null : currentEmoji;
  }

  // AI breakdown: show primary (quest) or HS variant based on student age
  if(screen === 'ai-breakdown') {
    const isHS = currentProfile?.age_group === 'highschool';
    const questWrap = document.getElementById('questInput')?.parentElement;
    const hsWrap = document.getElementById('hsAiWrap');
    const aiBtn = document.getElementById('aiBtn');
    const aiResult = document.getElementById('aiResult');
    const cardTitle = document.getElementById('aiCardTitle');
    const cardSub = document.getElementById('aiCardSub');
    const screenTitle = document.getElementById('aiScreenTitle');
    if(isHS) {
      // Hide primary inputs, show HS
      document.getElementById('questInput').style.display = 'none';
      if(aiBtn) aiBtn.style.display = 'none';
      if(aiResult) aiResult.style.display = 'none';
      if(hsWrap) hsWrap.style.display = 'block';
      if(cardTitle) cardTitle.textContent = '🤖 AI Task Breakdown';
      if(cardSub) cardSub.textContent = 'Paste any assignment and Squirrel will break it into steps for you 🐿️';
      if(screenTitle) screenTitle.textContent = 'Break into Steps';
    } else {
      document.getElementById('questInput').style.display = 'block';
      if(aiBtn) aiBtn.style.display = 'flex';
      if(hsWrap) hsWrap.style.display = 'none';
      if(screenTitle) screenTitle.textContent = 'Break Any Task';
    }
  }
}

function onAssignmentClassChange(classId) {
  // Update the active publish target without affecting the main screen's selected class
  if(classId) selectedClassId = classId;
}

function closeDrawerScreen() {
  // Hide all drawer screens
  ALL_DRAWER_SCREENS.forEach(s => {
    const el = document.getElementById('screen-'+s);
    if(el) el.style.display = 'none';
  });
  // Return to the user's own role view
  const role = currentProfile?.role || 'teacher';
  const view = document.getElementById('view-'+role);
  if(view) view.style.display = 'block';
  // Reset footer nav to Home
  setFooterActive('home');
}

function showCreateClassFromDrawer() {
  closeDrawer();
  document.getElementById('classSetupCard').style.display = 'block';
  document.getElementById('classSetupCard').scrollIntoView({behavior:'smooth'});
  // Show direct enrol toggle only for school-approved teachers
  const isApprovedSchoolTeacher = currentProfile?.school_id &&
    (currentProfile?.school_role === 'member' || currentProfile?.school_role === 'admin');
  const dew = document.getElementById('directEnrolWrap');
  if(dew) dew.style.display = isApprovedSchoolTeacher ? 'block' : 'none';
}

// ── PARENT: ASSIGNMENT DETAIL ──
async function openAssignmentDetail(assignmentId) {
  // Hide role views + other drawer screens, show detail screen
  ['student','parent','teacher'].forEach(r => { const el=document.getElementById('view-'+r); if(el) el.style.display='none'; });
  ALL_DRAWER_SCREENS.forEach(s => { const el=document.getElementById('screen-'+s); if(el) el.style.display='none'; });
  const screen = document.getElementById('screen-assignment-detail');
  if(screen) screen.style.display='block';
  const body = document.getElementById('assignmentDetailBody');
  body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-500);">Loading…</div>';

  // Use cache if available, else fetch
  let a = parentAssignmentCache[assignmentId];
  if(!a) {
    const {data} = await dbQuery(db.from('assignments').select('*, tasks(*), classes(name, subject, profiles(full_name))').eq('id',assignmentId).maybeSingle());
    a = data;
  }
  if(!a) { body.innerHTML='<div class="card">Assignment not found.</div>'; return; }

  const tasks = (a.tasks||[]).slice().sort((x,y)=>(x.sort_order||0)-(y.sort_order||0));
  const done = tasks.filter(t=>t.completed).length;
  const pct = tasks.length ? Math.round((done/tasks.length)*100) : 0;
  const className = a.classes?.name || a.classes?.subject || '📚 Home Task';
  const teacherName = a.classes?.profiles?.full_name || '';
  const dueStr = a.due_date ? new Date(a.due_date).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'}) : 'No due date';
  // Unified red(overdue/48h)/orange(7 days)/green/done scheme — the whole
  // card is tinted, same rule used by Student tiles
  const assignmentUrgency = getAssignmentUrgency(a);
  const dueColor = DUE_URGENCY_VAR[assignmentUrgency];
  const dueBg = DUE_URGENCY_BG[assignmentUrgency];

  const stepStatus = (t) => {
    if(t.completed) return {icon:'✅', label:'Done', color:'var(--mint)'};
    if(t.verification_status==='pending') return {icon:'⏳', label:'Awaiting approval', color:'var(--amber)'};
    if(t.verification_status==='rejected') return {icon:'↩️', label:'Sent back', color:'var(--rose)'};
    return {icon:'⬜', label:'Not started', color:'var(--gray-400)'};
  };

  const stepsHtml = tasks.length ? tasks.map((t,i) => {
    const s = stepStatus(t);
    const proofLink = t.proof_url ? `<a href="${t.proof_url}" target="_blank" style="font-size:11px;font-weight:600;color:var(--violet);text-decoration:none;">${t.proof_url.match(/\.(jpg|jpeg|png|gif|webp)/i)?'🖼️ View photo':'📄 View file'} ↗</a>` : '';
    // Steps can carry their own due date, separate from the assignment's —
    // when they do, the WHOLE step card is tinted by the same red/orange/
    // green/done rule, not just the little date badge. A step with no due
    // date of its own has nothing urgency-related to show, so it stays plain.
    const stepUrgency = t.completed ? 'done' : (t.due_date ? getDueUrgency(t.due_date, false) : null);
    const stepBg = stepUrgency ? DUE_URGENCY_BG[stepUrgency] : 'white';
    const stepBorder = stepUrgency ? `border:1px solid var(--gray-100);border-left:4px solid ${DUE_URGENCY_VAR[stepUrgency]};` : 'border:1px solid var(--gray-100);';
    const stepDue = (t.due_date && !t.completed) ? ` · <span style="color:${DUE_URGENCY_VAR[getDueUrgency(t.due_date,false)]};">📅 ${new Date(t.due_date+'T12:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</span>` : '';
    return `<div style="display:flex;gap:10px;padding:11px 12px;background:${stepBg};border-radius:10px;margin-bottom:8px;${stepBorder}">
      <div style="font-size:16px;">${s.icon}</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:var(--indigo);${t.completed?'text-decoration:line-through;opacity:0.6;':''}">${i+1}. ${t.title}</div>
        <div style="font-size:11px;font-weight:600;color:${s.color};margin-top:2px;">${s.label}${stepDue}</div>
        ${proofLink ? `<div style="margin-top:4px;">${proofLink}</div>` : ''}
      </div>
      ${t.star_value?`<div style="font-size:11px;font-weight:700;color:var(--amber);">⭐ ${t.star_value}</div>`:''}
    </div>`;
  }).join('') : '<div style="font-size:13px;color:var(--gray-500);text-align:center;padding:14px 0;">No steps on this assignment.</div>';

  body.innerHTML = `
    <div class="card" style="background:${dueBg};border-left:4px solid ${dueColor};">
      <div style="font-family:'Nunito',sans-serif;font-weight:900;font-size:18px;color:var(--indigo);margin-bottom:6px;${pct===100?'text-decoration:line-through;opacity:0.6;':''}">${a.title}</div>
      <div style="font-size:12px;font-weight:700;color:var(--violet);margin-bottom:2px;">📚 ${className}</div>
      ${teacherName?`<div style="font-size:12px;color:var(--gray-500);margin-bottom:8px;">Set by ${teacherName}</div>`:`<div style="font-size:12px;color:var(--gray-500);margin-bottom:8px;">Added by you</div>`}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        <span style="font-size:12px;font-weight:600;color:${dueColor};background:var(--gray-50);padding:4px 10px;border-radius:20px;">📅 Due ${dueStr}</span>
        <span style="font-size:12px;font-weight:600;color:var(--gray-700);background:var(--gray-50);padding:4px 10px;border-radius:20px;">${done}/${tasks.length} steps done</span>
      </div>
      <div style="background:var(--gray-100);border-radius:10px;height:8px;margin-bottom:6px;"><div style="background:${dueColor};border-radius:10px;height:8px;width:${pct}%;transition:width 0.5s;"></div></div>
      <div style="font-size:12px;color:var(--gray-500);text-align:right;">${pct}% complete</div>
      ${a.description?`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--gray-100);"><div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;">Instructions</div><div style="font-size:13px;color:var(--gray-700);line-height:1.6;">${formatDescription(a.description)}</div></div>`:''}
    </div>
    <div class="card">
      <div class="card-title">📋 Steps</div>
      ${stepsHtml}
    </div>
  `;
}

let notifPanelOpen = false;
let notifPollInterval = null;
let unreadCount = 0;

async function loadNotifications() {
  if(!currentUser) return;
  const {data:notifs} = await dbQuery(
    db.from('notifications')
      .select('*')
      .eq('recipient_id', currentUser.id)
      .order('created_at', {ascending: false})
      .limit(20),
    8000, []
  );
  renderNotifications(notifs||[]);
}

function renderNotifications(notifs) {
  const list = document.getElementById('notifList');
  const badge = document.getElementById('notifBadge');
  const markAllBtn = document.getElementById('markAllBtn');
  if(!list) return;

  unreadCount = notifs.filter(n => !n.read_at).length;

  // Update badge
  if(unreadCount > 0) {
    badge.style.display = 'block';
    markAllBtn.style.display = 'block';
  } else {
    badge.style.display = 'none';
    markAllBtn.style.display = 'none';
  }

  if(!notifs.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;font-size:13px;color:var(--gray-500);">No notifications yet</div>';
    return;
  }

  const typeConfig = {
    proof_approved:  { icon:'✅', action:'View Approvals' },
    proof_rejected:  { icon:'✕',  action:'View Approvals' },
    proof_submitted: { icon:'📸', action:'View Approvals' },
    task_complete:   { icon:'⭐', action:'View Progress'  },
    nudge:           { icon:'👋', action:'View Tasks'     },
    class_archived:  { icon:'🎓', action:null             },
    default:         { icon:'🔔', action:null             },
  };

  list.innerHTML = notifs.map(n => {
    const cfg = typeConfig[n.type] || typeConfig.default;
    const timeAgo = formatTimeAgo(n.created_at);
    const isUnread = !n.read_at;
    const actionHtml = cfg.action
      ? `<div class="notif-action" onclick="handleNotifAction('${n.type}','${n.id}')">→ ${cfg.action}</div>`
      : '';
    return `<div class="notif-item ${isUnread?'unread':''}" id="notif-${n.id}" onclick="markNotifRead('${n.id}')">
      <div class="notif-dot ${isUnread?'':'read'}"></div>
      <div class="notif-body">
        <div class="notif-title">${cfg.icon} ${n.title||''}</div>
        <div class="notif-meta">${n.body||''}</div>
        <div class="notif-meta">${timeAgo}</div>
        ${actionHtml}
      </div>
    </div>`;
  }).join('');
}

function formatTimeAgo(isoStr) {
  if(!isoStr) return '';
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if(diff < 60)  return 'Just now';
  if(diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if(diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

async function markNotifRead(notifId) {
  await dbQuery(db.from('notifications').update({read_at: new Date().toISOString()}).eq('id', notifId));
  const el = document.getElementById('notif-'+notifId);
  if(el) { el.classList.remove('unread'); el.querySelector('.notif-dot')?.classList.add('read'); }
  unreadCount = Math.max(0, unreadCount - 1);
  if(unreadCount === 0) {
    document.getElementById('notifBadge').style.display = 'none';
    document.getElementById('markAllBtn').style.display = 'none';
  }
}

async function markAllNotifsRead() {
  await dbQuery(db.from('notifications').update({read_at: new Date().toISOString()}).eq('recipient_id', currentUser.id).is('read_at', null));
  document.querySelectorAll('.notif-item.unread').forEach(el => {
    el.classList.remove('unread');
    el.querySelector('.notif-dot')?.classList.add('read');
  });
  unreadCount = 0;
  document.getElementById('notifBadge').style.display = 'none';
  document.getElementById('markAllBtn').style.display = 'none';
}

async function handleNotifAction(type, notifId) {
  markNotifRead(notifId);
  closeNotifPanel();
  // Route to the right place
  if(['proof_approved','proof_rejected','proof_submitted'].includes(type)) {
    // Switch to the right role and scroll to approval card
    if(currentProfile.role === 'parent') {
      switchRole('parent');
      setTimeout(() => document.getElementById('parent-approval-card')?.scrollIntoView({behavior:'smooth', block:'start'}), 100);
    } else if(currentProfile.role === 'teacher') {
      switchRole('teacher');
      setTimeout(() => document.getElementById('teacher-approval-card')?.scrollIntoView({behavior:'smooth', block:'start'}), 100);
    }
  } else if(type === 'reward_approved' || type === 'reward_rejected') {
    // Refresh student rewards so pending status clears
    if(currentProfile.role === 'student' && currentChildRecord?.id) {
      const {data:child} = await dbQuery(db.from('children').select('stars').eq('id', currentChildRecord.id).maybeSingle());
      loadStudentRewards(currentChildRecord.id, child?.stars || 0);
    }
  } else if(type === 'task_complete' || type === 'nudge') {
    if(currentProfile.role === 'parent') switchRole('parent');
    else switchRole('student');
  }
}

function toggleNotifPanel() {
  notifPanelOpen = !notifPanelOpen;
  const panel = document.getElementById('notifPanel');
  if(notifPanelOpen) {
    panel.style.display = 'block';
    loadNotifications(); // Refresh on open
  } else {
    panel.style.display = 'none';
  }
}

function closeNotifPanel() {
  notifPanelOpen = false;
  const panel = document.getElementById('notifPanel');
  if(panel) panel.style.display = 'none';
}

// Close panel when clicking outside
document.addEventListener('click', (e) => {
  if(notifPanelOpen && !document.getElementById('notifBellWrap')?.contains(e.target)) {
    closeNotifPanel();
  }
});

// Poll for new notifications every 60s while app is open
function startNotifPolling() {
  loadNotifications();
  if(notifPollInterval) clearInterval(notifPollInterval);
  notifPollInterval = setInterval(loadNotifications, 60000);
}

// Also send notification when student submits proof — notify both parent AND teacher
async function notifyProofSubmitted(taskId, childId) {
  try {
    const {data:task} = await dbQuery(
      db.from('tasks').select('title, assignment_id, assignments(title, created_by, classes(name))').eq('id', taskId).maybeSingle()
    );
    if(!task) return;
    const cls = task.assignments?.classes?.name || '';
    const aTitle = task.assignments?.title || '';
    const childName = currentProfile?.full_name || 'Student';
    const notifTitle = '📸 Proof submitted';
    const notifBody = `${childName} submitted proof for "${task.title}"${aTitle?' — '+aTitle:''}${cls?' ('+cls+')':''}`;

    // Notify teacher
    const teacherId = task.assignments?.created_by;
    if(teacherId) {
      await dbQuery(db.from('notifications').insert({
        recipient_id: teacherId, sender_id: currentUser.id,
        child_id: childId, type: 'proof_submitted',
        title: notifTitle, body: notifBody
      }));
      await sendPushToUser(teacherId, notifTitle, notifBody);
    }
    // Notify parent
    const {data:children} = await dbQuery(db.from('children').select('*, families(parent_id)').eq('id', childId).limit(1));
    const parentId = children?.[0]?.families?.parent_id;
    if(parentId && parentId !== teacherId) {
      await dbQuery(db.from('notifications').insert({
        recipient_id: parentId, sender_id: currentUser.id,
        child_id: childId, type: 'proof_submitted',
        title: notifTitle, body: notifBody
      }));
      await sendPushToUser(parentId, notifTitle, notifBody);
    }
  } catch(e) { console.log('notifyProofSubmitted error:', e.message); }
}

function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}

// ── SUPABASE QUERY HELPER WITH TIMEOUT ──
async function dbQuery(queryPromise, timeoutMs=8000, fallback=null) {
  try {
    const timeout = new Promise(resolve => 
      setTimeout(() => resolve({data: fallback, error: {message: 'timeout'}}), timeoutMs)
    );
    const result = await Promise.race([queryPromise, timeout]);
    return result;
  } catch(e) {
    return {data: fallback, error: {message: e.message}};
  }
}

// ══════════════════════════════════════════
// AI IMPORT USAGE CAP (3 per user per month)
// ══════════════════════════════════════════
async function checkAIImportLimit() {
  if(isPro()) return true;
  const {data:profile} = await dbQuery(
    db.from('profiles').select('ai_import_count, ai_import_reset_at').eq('id', currentUser.id).maybeSingle()
  );
  if(!profile) return true;
  const now = new Date();
  const resetAt = profile.ai_import_reset_at ? new Date(profile.ai_import_reset_at) : null;
  const needsReset = !resetAt ||
    now.getFullYear() > resetAt.getFullYear() ||
    now.getMonth() > resetAt.getMonth();
  if(needsReset) {
    await dbQuery(db.from('profiles').update({
      ai_import_count: 0,
      ai_import_reset_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }).eq('id', currentUser.id));
    if(currentProfile) currentProfile.ai_import_count = 0;
    return true;
  }
  const count = profile.ai_import_count || 0;
  if(count >= 3) {
    showPaywall('ai_import',
      "You've used your 3 free AI imports this month",
      'Upgrade to Family Pro for unlimited AI-powered Smart Import every month.');
    return false;
  }
  return true;
}

async function incrementAIImportCount() {
  const current = currentProfile?.ai_import_count || 0;
  await dbQuery(db.from('profiles').update({ ai_import_count: current + 1 }).eq('id', currentUser.id));
  if(currentProfile) currentProfile.ai_import_count = current + 1;
}


// ══════════════════════════════════════════
// STRIPE / PAYWALL FUNCTIONS
// ══════════════════════════════════════════
let selectedPlan = 'monthly';
let paywallContext = null;

function showPaywall(context, title, subtitle) {
  paywallContext = context || 'upgrade';
  if(title) document.getElementById('paywallTitle').textContent = title;
  if(subtitle) document.getElementById('paywallSubtitle').textContent = subtitle;
  selectPlan('monthly');
  const overlay = document.getElementById('paywallOverlay');
  overlay.style.display = 'flex';
}

function closePaywall() {
  document.getElementById('paywallOverlay').style.display = 'none';
  paywallContext = null;
}

function selectPlan(plan) {
  selectedPlan = plan;
  const mBtn = document.getElementById('planMonthlyBtn');
  const aBtn = document.getElementById('planAnnualBtn');
  if(!mBtn || !aBtn) return;
  if(plan === 'monthly') {
    mBtn.style.background = 'var(--violet)';
    mBtn.style.color = 'var(--white)';
    aBtn.style.background = 'transparent';
    aBtn.style.color = 'var(--violet-light)';
  } else {
    aBtn.style.background = 'var(--violet)';
    aBtn.style.color = 'var(--white)';
    mBtn.style.background = 'transparent';
    mBtn.style.color = 'var(--violet-light)';
  }
}

async function startStripeCheckout() {
  const btn = document.getElementById('paywallCheckoutBtn');
  btn.textContent = 'Loading…';
  btn.disabled = true;
  try {
    const priceId = selectedPlan === 'annual' ? STRIPE_PRICE_ANNUAL : STRIPE_PRICE_MONTHLY;
    const successUrl = window.location.origin + window.location.pathname + '?checkout=success';
    const cancelUrl  = window.location.origin + window.location.pathname + '?checkout=cancelled';

    const res = await fetch(SUPA_URL + '/functions/v1/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPA_KEY,
      },
      body: JSON.stringify({
        priceId,
        customerEmail: currentUser?.email,
        successUrl,
        cancelUrl,
        userId: currentUser?.id,
      })
    });

    const data = await res.json();
    if(!res.ok || !data.url) {
      console.error('Checkout session error:', data);
      showToast('❌ ' + (data.error || 'Could not start checkout'));
      btn.textContent = 'Upgrade Now →';
      btn.disabled = false;
      return;
    }

    // Redirect to Stripe Checkout
    window.location.href = data.url;
  } catch(e) {
    console.error('Checkout error:', e);
    showToast('❌ Could not start checkout. Please try again.');
    btn.textContent = 'Upgrade Now →';
    btn.disabled = false;
  }
}

async function handleStripeReturn() {
  let params = new URLSearchParams(window.location.search);
  // Also check for a stashed return (session dropped, user re-signed in)
  let stashed = null;
  try { stashed = sessionStorage.getItem('pendingCheckoutReturn'); } catch(e) {}
  if(stashed && !params.has('checkout')) {
    params = new URLSearchParams(stashed);
    try { sessionStorage.removeItem('pendingCheckoutReturn'); } catch(e) {}
  }

  if(params.get('checkout') === 'success') {
    window.history.replaceState({}, '', window.location.pathname);
    try { sessionStorage.removeItem('pendingCheckoutReturn'); } catch(e) {}
    showToast('🎉 Welcome to Family Pro! Your subscription is active.');
    if(currentUser) {
      // Webhook may take a moment — refresh family record a couple of times
      for(let i=0; i<3; i++) {
        const {data:family} = await dbQuery(db.from('families').select('*').eq('parent_id',currentUser.id).maybeSingle());
        if(family) { currentFamily = family; if(isPro()) break; }
        await new Promise(r => setTimeout(r, 1500));
      }
      const proEl = document.getElementById('parentProBadge');
      if(proEl) proEl.style.display = isPro() ? 'inline-block' : 'none';
    }
  } else if(params.get('checkout') === 'cancelled') {
    window.history.replaceState({}, '', window.location.pathname);
    try { sessionStorage.removeItem('pendingCheckoutReturn'); } catch(e) {}
    showToast('Checkout cancelled — you can upgrade any time.');
  }
}

