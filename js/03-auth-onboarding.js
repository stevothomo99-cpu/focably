
// ── AUTH ──
function showSignUp() { 
  ['authSignIn','authSignUp','authForgotPassword'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  const el=document.getElementById('authSignUp'); if(el)el.style.display='block'; clearError(); 
}
function showSignIn() { 
  ['authSignIn','authSignUp','authForgotPassword'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  const el=document.getElementById('authSignIn'); if(el)el.style.display='block'; clearError(); 
}
function showForgotPassword() {
  ['authSignIn','authSignUp','authForgotPassword'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  const el=document.getElementById('authForgotPassword'); if(el)el.style.display='block'; clearError();
}
async function sendPasswordReset() {
  const email = document.getElementById('fpEmail').value.trim();
  if(!email) { showError('Enter your email address'); return; }
  const btn = document.getElementById('fpBtn');
  btn.disabled=true; btn.textContent='Sending...';
  const {error} = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  btn.disabled=false; btn.textContent='Send Reset Link';
  if(error) { showError(error.message); return; }
  showError('✅ Reset link sent! Check your email.');
  document.getElementById('authError').style.background='rgba(16,185,129,0.2)';
  document.getElementById('authError').style.borderColor='rgba(16,185,129,0.4)';
  document.getElementById('authError').style.color='#6EE7B7';
}
function selectRole(r) { selectedRole=r; ['parent','teacher','student'].forEach(x => document.getElementById('role-'+x).classList.toggle('active',x===r)); }
function showError(m) { const e=document.getElementById('authError'); e.textContent=m; e.style.display='block'; }
function clearError() { document.getElementById('authError').style.display='none'; }

async function signIn() {
  const email=document.getElementById('siEmail').value.trim(), pw=document.getElementById('siPassword').value;
  if(!email||!pw){showError('Enter email and password');return;}
  const btn=document.getElementById('siBtn'); btn.disabled=true; btn.textContent='Signing in...';
  try {
    // Wake up Supabase before signing in
    await fetch(`${SUPA_URL}/rest/v1/profiles?select=id&limit=1`, {headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}}).catch(()=>{});
    btn.textContent='Connecting...';
    const signInPromise = db.auth.signInWithPassword({email,password:pw});
    const signInTimeout = new Promise((_,reject) => setTimeout(() => reject(new Error('Sign in timed out — please try again')), 15000));
    const {data:signInData, error} = await Promise.race([signInPromise, signInTimeout]);
    btn.disabled=false; btn.textContent='Sign In';
    if(error) { showError(error.message); return; }
    // Manually trigger profile load if onAuthStateChange doesn't fire
    if(signInData?.session) {
      currentUser = signInData.session.user;
      await loadProfile();
    }
  } catch(e) {
    btn.disabled=false; btn.textContent='Sign In';
    showError(e.message || 'Connection error — please try again');
  }
}
async function signUp() {
  const name=document.getElementById('suName').value.trim(), email=document.getElementById('suEmail').value.trim(), pw=document.getElementById('suPassword').value;
  if(!name||!email||!pw){showError('Fill in all fields');return;}
  if(pw.length<6){showError('Password needs 6+ characters');return;}
  const btn=document.getElementById('suBtn'); btn.disabled=true; btn.textContent='Creating...';
  const {data,error}=await db.auth.signUp({email,password:pw,options:{data:{full_name:name,role:selectedRole}}});
  btn.disabled=false; btn.textContent='Create Account';
  if(error){showError(error.message);return;}
  if(data?.user&&!data?.session){
    // Email confirmation required
    showConfirmScreen(email);
  } else if(data?.session){
    // Email confirmation off — signed in immediately
    currentUser=data.session.user;
    await loadProfile();
  }
}
async function signInGoogle() { await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}}); }
// ── FOOTER NAV ──
function setFooterActive(tab) {
  ['home','tasks','rewards','messages','settings'].forEach(t => {
    const el = document.getElementById('fnav-'+t);
    if(el) el.classList.toggle('active', t===tab);
  });
}

function footerNav(tab) {
  // If we're in a drawer screen, close it first then go home
  if(tab === 'home') {
    closeDrawerScreen();
    setFooterActive('home');
    return;
  }

  const role = currentProfile?.role;

  if(tab === 'settings') {
    // Show settings screen for all roles
    ['student','parent','teacher'].forEach(r => {
      const el = document.getElementById('view-'+r); if(el) el.style.display='none';
    });
    ALL_DRAWER_SCREENS.forEach(s => {
      const el = document.getElementById('screen-'+s); if(el) el.style.display='none';
    });
    const ss = document.getElementById('screen-settings');
    if(ss) ss.style.display='block';
    // Populate settings
    const p = currentProfile;
    const nameEl = document.getElementById('settingsName');
    const roleEl = document.getElementById('settingsRole');
    const avatarEl = document.getElementById('settingsAvatar');
    if(nameEl) nameEl.textContent = p?.full_name || '—';
    if(roleEl) roleEl.textContent = p?.role || '—';
    if(avatarEl) {
      if(p?.avatar_photo) {
        avatarEl.innerHTML='';
        const img=document.createElement('img');
        img.src=p.avatar_photo;
        img.style.cssText='width:42px;height:42px;border-radius:50%;object-fit:cover;';
        avatarEl.appendChild(img);
      } else {
        avatarEl.innerHTML='';
        avatarEl.textContent = p?.avatar || (p?.role==='student' ? '🎓' : p?.role==='parent' ? '👨‍👩‍👧' : '📚');
      }
    }
    // Show avatar change only for students
    const avatarWrap = document.getElementById('settingsChangeAvatarWrap');
    if(avatarWrap) avatarWrap.style.display = (p?.role==='student') ? 'block' : 'none';
    // Show notifications card for parent/student
    const notifsCard = document.getElementById('settingsNotifsCard');
    if(notifsCard) notifsCard.style.display = (p?.role !== 'teacher') ? 'block' : 'none';
    // Theme is now in its own drawer page (My Theme in hamburger menu)
    const placeholder = document.getElementById('hsThemeCardPlaceholder');
    if(placeholder) placeholder.innerHTML = '';
    setFooterActive('settings');
    return;
  }

  if(tab === 'tasks') {
    // For all roles: go home and scroll to task/class section
    closeDrawerScreen();
    setFooterActive('tasks');
    setTimeout(() => {
      let el = null;
      if(role === 'student') {
        const isHS = currentProfile?.age_group === 'highschool';
        el = document.getElementById(isHS ? 'hsClassTilesContainer' : 'classTilesContainer');
      } else if(role === 'parent') {
        el = document.getElementById('parentSubjectProgress');
      } else if(role === 'teacher') {
        el = document.getElementById('teacherAssignmentsView');
      }
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    }, 100);
    return;
  }

  if(tab === 'rewards') {
    // Student only — scroll to Treasure Chest
    closeDrawerScreen();
    setFooterActive('rewards');
    setTimeout(() => {
      const el = document.getElementById('chestEmoji') || document.getElementById('rewardsContainer');
      if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
    }, 100);
    return;
  }

  if(tab === 'messages') {
    showToast('💬 Messages coming soon!');
    setFooterActive('home'); // Don't highlight messages since it's not active
    return;
  }
}

async function confirmDeleteAccount() {
  const confirmed = confirm('⚠️ Delete your account?\n\nThis will permanently delete all your data including tasks, XP, trust scores, and family connections.\n\nThis cannot be undone.');
  if(!confirmed) return;
  const doubleConfirm = confirm('Are you absolutely sure? Type OK to confirm permanent deletion.');
  if(!doubleConfirm) return;
  showToast('⏳ Deleting your account...');
  try {
    const uid = currentUser.id;
    // Delete in order: push_subscriptions, tasks (via children), children, profiles auth user
    await db.from('push_subscriptions').delete().eq('user_id', uid);
    await db.from('class_enrollments').delete().eq('student_id', uid);
    // If parent — delete family
    if(currentProfile?.role === 'parent') {
      const {data:fam} = await db.from('families').select('id').eq('parent_id', uid).maybeSingle();
      if(fam) {
        await db.from('children').delete().eq('family_id', fam.id);
        await db.from('families').delete().eq('id', fam.id);
      }
    }
    // If student — delete child record
    if(currentProfile?.role === 'student') {
      await db.from('children').delete().eq('profile_id', uid);
    }
    await db.from('profiles').delete().eq('id', uid);
    await db.auth.signOut();
    showToast('✅ Account deleted. Sorry to see you go.');
    showScreen('auth');
  } catch(e) {
    showToast('❌ Could not delete account: ' + e.message + '\n\nEmail privacy@focablyed.com for manual deletion.');
  }
}

function toggleManageChildClass(el) {
  var n = el.nextElementSibling;
  n.style.display = n.style.display === "none" ? "block" : "none";
  var chev = el.querySelector(".mc-chev");
  if(chev) chev.style.transform = n.style.display === "none" ? "" : "rotate(180deg)";
}

async function openManageChildren() {
  openDrawerScreen('manage-children');
  const list = document.getElementById('manageChildrenList');
  if (!list) return;
  if (!currentChildren || !currentChildren.length) {
    list.innerHTML = '<div class="card" style="text-align:center;color:var(--gray-500);font-size:14px;padding:24px;">No children linked yet.<br><br><button class="publish-btn" onclick="openDrawerScreen(&apos;family-invite&apos;)" style="background:linear-gradient(135deg,var(--violet),#5B21B6);margin-top:8px;">&#x1F4EC; Add a Child</button></div>';
    return;
  }

  // Show loading state
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400);">Loading...</div>';

  // Fetch classes + assignments for all children
  const childIds = currentChildren.map(function(c) { return c.id; });
  const {data:memberships} = await dbQuery(
    db.from('class_members').select('child_id, classes(id, name, subject, year_group, profiles(full_name))').in('child_id', childIds),
    8000, []
  );
  const {data:assignments} = await dbQuery(
    db.from('assignments').select('*, tasks(*)').in('child_id', childIds).or('status.eq.active,status.is.null').order('due_date', {ascending:true}),
    8000, []
  );

  // Group memberships and assignments by child
  const childClasses = {};
  const childAssignments = {};
  currentChildren.forEach(function(c) { childClasses[c.id] = []; childAssignments[c.id] = []; });
  (memberships||[]).forEach(function(m) { if(childClasses[m.child_id]) childClasses[m.child_id].push(m.classes); });
  (assignments||[]).forEach(function(a) { if(childAssignments[a.child_id]) childAssignments[a.child_id].push(a); });

  list.innerHTML = currentChildren.map(function(c) {
    const classes = childClasses[c.id] || [];
    const childAsn = childAssignments[c.id] || [];

    // Build class accordion rows
    const classRows = classes.length ? classes.map(function(cls) {
      const clsAssignments = childAsn.filter(function(a) { return a.class_id === cls.id; });
      const totalTasks = clsAssignments.flatMap(function(a) { return a.tasks||[]; }).length;
      const doneTasks = clsAssignments.flatMap(function(a) { return a.tasks||[]; }).filter(function(t) { return t.completed; }).length;
      const pct = totalTasks ? Math.round((doneTasks/totalTasks)*100) : 0;
      const teacher = cls.profiles?.full_name || '';

      const asnRows = clsAssignments.length ? clsAssignments.map(function(a) {
        const tasks = a.tasks||[];
        const done = tasks.filter(function(t) { return t.completed; }).length;
        const apct = tasks.length ? Math.round((done/tasks.length)*100) : 0;
        const due = a.due_date ? new Date(a.due_date).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : 'No due date';
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = a.due_date && a.due_date < today && apct < 100;
        const col = apct>=100 ? 'var(--mint)' : isOverdue ? 'var(--rose)' : 'var(--violet)';
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:white;border-radius:9px;margin-bottom:6px;border:1px solid var(--gray-100);">' +
          '<div style="flex:1;">' +
            '<div style="font-size:12px;font-weight:600;color:var(--indigo);">' + a.title + '</div>' +
            '<div style="font-size:10px;color:' + (isOverdue?'var(--rose)':'var(--gray-500)') + ';margin:2px 0 4px;">Due ' + due + ' &nbsp;·&nbsp; ' + done + '/' + tasks.length + ' steps</div>' +
            '<div style="background:var(--gray-100);border-radius:10px;height:4px;"><div style="background:' + col + ';border-radius:10px;height:4px;width:' + apct + '%;"></div></div>' +
          '</div>' +
          '<div style="font-size:11px;font-weight:800;color:' + col + ';">' + apct + '%</div>' +
        '</div>';
      }).join('') : '<div style="font-size:12px;color:var(--gray-400);font-style:italic;padding:4px 0;">No assignments yet</div>';

      return '<div style="border:1px solid var(--gray-100);border-radius:12px;overflow:hidden;margin-bottom:8px;">' +
        '<div onclick="toggleManageChildClass(this)" style="display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;background:var(--gray-50);">' +
          '<div style="font-size:20px;">📚</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:13px;font-weight:700;color:var(--indigo);">' + cls.name + '</div>' +
            '<div style="font-size:11px;color:var(--gray-500);">' + (cls.subject||'') + (cls.year_group?' · '+cls.year_group:'') + (teacher?' · '+teacher:'') + ' · ' + clsAssignments.length + ' active · ' + pct + '% done</div>' +
          '</div>' +
          '<div class="mc-chev" style="font-size:11px;color:var(--gray-400);transition:transform 0.2s;">▼</div>' +
        '</div>' +
        '<div style="display:none;padding:10px 12px;">' + asnRows + '</div>' +
      '</div>';
    }).join('') : '<div style="font-size:12px;color:var(--gray-400);padding:8px 0;">No classes enrolled yet</div>';

    return '<div class="card" style="margin-bottom:12px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
        '<div>' +
          '<div style="font-size:15px;font-weight:700;color:var(--indigo);">' + (c.name||'Child') + '</div>' +
          '<div style="font-size:12px;color:var(--gray-500);">&#x2B50; ' + (c.stars||0) + ' stars &nbsp;&middot;&nbsp; &#x1F525; ' + (c.streak||0) + ' streak &nbsp;&middot;&nbsp; Trust: ' + (c.trust_score||0) + '</div>' +
        '</div>' +
        '<button data-child-id="' + c.id + '" data-child-name="' + (c.name||'Child') + '" onclick="confirmUnlinkChild(this.dataset.childId, this.dataset.childName)" style="padding:8px 14px;border-radius:20px;border:1.5px solid #EF4444;background:white;color:#EF4444;font-size:13px;font-weight:700;cursor:pointer;">Unlink</button>' +
      '</div>' +
      '<div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Classes</div>' +
      classRows +
    '</div>';
  }).join('') + '<div style="margin-top:8px;"><button class="publish-btn" onclick="openDrawerScreen(&apos;family-invite&apos;)" style="background:linear-gradient(135deg,var(--violet),#5B21B6);">&#x1F4EC; Add Another Child</button></div>';
}

async function confirmUnlinkChild(childId, childName) {
  const confirmed = confirm('Unlink ' + childName + ' from your family?\n\nTheir account stays active but they will lose access to parent-assigned tasks and your family connection.\n\nThis cannot be undone.');
  if (!confirmed) return;
  try {
    const {error} = await dbQuery(db.from('children').delete().eq('id', childId), 8000, null);
    if (error) throw error;
    currentChildren = currentChildren.filter(function(c) { return c.id !== childId; });
    if (selectedChildId === childId) {
      selectedChildId = currentChildren[0] ? currentChildren[0].id : null;
    }
    renderChildTabs();
    if (selectedChildId) loadChildStats(selectedChildId);
    showToast('\u2705 ' + childName + ' unlinked from your family');
    openManageChildren();
  } catch(e) {
    showToast('\u274C Could not unlink: ' + e.message);
  }
}

async function confirmUnlinkFamily() {
  const confirmed = confirm('Unlink from your family?\n\nYou will lose access to parent-assigned tasks and proof verification. You can re-link anytime with a new family invite code.');
  if(!confirmed) return;
  try {
    if(!currentChildRecord) { showToast('No family link found'); return; }
    await dbQuery(db.from('children').delete().eq('id', currentChildRecord.id), 5000, null);
    currentChildRecord = null;
    showToast('✅ Unlinked from family');
    closeDrawer();
    await loadStudentAssignments(currentProfile.age_group);
  } catch(e) {
    showToast('❌ Could not unlink: ' + e.message);
  }
}

async function signOut() { await db.auth.signOut(); const n=document.getElementById('navUserName'); if(n) n.textContent=''; showToast('👋 Signed out'); }

function setLoadingStatus(msg) {
  const el = document.getElementById('loadingStatus');
  if(el) el.textContent = msg;
  console.log('Status:', msg);
}

function showRetryButton() {
  const btn = document.getElementById('loadingRetry');
  if(btn) btn.style.display = 'block';
}

async function retryLoad() {
  document.getElementById('loadingRetry').style.display = 'none';
  await loadProfile();
}

async function loadProfile() {
  profileLoadInProgress = true;
  showScreen('loading');
  setLoadingStatus('Loading your profile...');
  console.log('loadProfile: starting for', currentUser.email);
  // Clear any stale auth errors so they don't flash during load
  const authErrEl = document.getElementById('authError');
  if(authErrEl) { authErrEl.textContent = ''; authErrEl.style.display = 'none'; }
  
  // Hard timeout — show retry button after 25 seconds
  const hardTimeout = setTimeout(() => {
    setLoadingStatus('Taking longer than usual — almost there...');
    showRetryButton();
  }, 25000);

  try {
    console.log('loadProfile: fetching profile...');
    const profilePromise = db.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    const profileTimeout = new Promise(resolve => setTimeout(() => resolve({data:null, error:{message:'timeout'}}), 22000));
    const profileRes = await Promise.race([profilePromise, profileTimeout]);
    let profile = profileRes.data;
    let profileError = profileRes.error;
    clearTimeout(hardTimeout);
    setLoadingStatus('Profile loaded — setting up your app...');
    console.log('loadProfile: fetch done, profile=', profile?.role, 'error=', profileError?.message);

    console.log('loadProfile: profile=', profile?.role, 'error=', profileError?.message);

    if(!profile) {
      const role = currentUser.user_metadata?.role || 'parent';
      console.log('loadProfile: creating new profile, role=', role);
      await dbQuery(db.from('profiles').upsert({
        id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
        role: role
      }, {onConflict: 'id', ignoreDuplicates: true}));
      const r = await dbQuery(db.from('profiles').select('*').eq('id', currentUser.id).maybeSingle());
      profile = r.data;
    }

    if(!profile) {
      console.log('loadProfile: still no profile — showing auth');
      showScreen('auth');
      showError('Could not load your profile. Please try again.');
      return;
    }

    // Fix role if metadata says different — run in background, don't block
    if(currentUser.user_metadata?.role && profile.role !== currentUser.user_metadata.role) {
      profile.role = currentUser.user_metadata.role;
      dbQuery(db.from('profiles').update({role: currentUser.user_metadata.role}).eq('id', currentUser.id)).catch(()=>{});
    }

    currentProfile = profile;
    console.log('loadProfile: routing to', profile.role, 'age_group=', profile.age_group);

    // Stamp last_active_at (fire-and-forget; ignore errors if column missing)
    db.from('profiles').update({last_active_at: new Date().toISOString()}).eq('id', currentUser.id).then(()=>{}, ()=>{});

    if(profile.role === 'student') {
      if(!profile.age_group) showScreen('onboarding');
      else await loadStudentApp();
    } else if(profile.role === 'parent') {
      await loadParentApp();
    } else if(profile.role === 'teacher') {
      await loadTeacherApp();
    } else {
      console.log('loadProfile: unknown role', profile.role);
      showScreen('auth');
      showError('Unknown account role. Please sign up again.');
    }
  } catch(e) {
    clearTimeout(hardTimeout);
    console.error('loadProfile: fatal error', e.message);
    showScreen('auth');
    showError('Something went wrong loading your profile. Please try again.');
  }
}

// ── ONBOARDING ──
const AVATARS_HS = ['🎧','🎮','🏀','⚽','🎨','🎸','📸','🌊','🚀','🦊','🐺','🦁','🐉','⚡','🔥','🌙','🎯','🏆','💡','🎭'];
const AVATARS_PRIMARY = ['🧙','🦸','🐱','🐶','🦊','🐸','🦄','🐲','🚀','🌟','🎩','🦋','🐼','🦁','🤖','👾','🧸','🎪','🌈','⚡'];
let selectedAvatar = null;

function renderAvatarGrid(ageGroup) {
  const emojis = ageGroup === 'primary' ? AVATARS_PRIMARY : AVATARS_HS;
  const grid = document.getElementById('avatarGrid');
  if(!grid) return;
  grid.innerHTML = emojis.map(e =>
    `<div class="avatar-opt" onclick="selectAvatar('${e}',this)">${e}</div>`
  ).join('');
  selectedAvatar = null;
}

function selectAvatar(emoji, el) {
  selectedAvatar = emoji;
  document.querySelectorAll('.avatar-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
}

function selectChangeAvatar(emoji, el) {
  selectedAvatar = emoji;
  selectedAvatarPhoto = null; // clear any photo selection
  // Update preview
  const emojiPrev = document.getElementById('avatarPreviewEmoji');
  const photoPrev = document.getElementById('avatarPreviewPhoto');
  if(emojiPrev){ emojiPrev.style.display='block'; emojiPrev.textContent=emoji; }
  if(photoPrev){ photoPrev.style.display='none'; photoPrev.src=''; }
  document.querySelectorAll('#changeAvatarGrid .avatar-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
}

async function saveAvatarChange() {
  const age = currentProfile.age_group;
  if(selectedAvatarPhoto) {
    // Saving a photo avatar
    const {error} = await dbQuery(db.from('profiles').update({avatar: null, avatar_photo: selectedAvatarPhoto}).eq('id',currentUser.id), 8000, null);
    if(error) { showToast('❌ Could not save photo: ' + error.message); return; }
    currentProfile.avatar = null;
    currentProfile.avatar_photo = selectedAvatarPhoto;
    selectedAvatarPhoto = null;
    // Update displayed avatar
    updateAvatarDisplay(age, null, currentProfile.avatar_photo);
    showToast('✅ Photo avatar saved!');
    closeDrawerScreen();
  } else {
    if(!selectedAvatar) { showToast('Pick an avatar first!'); return; }
    const {error} = await dbQuery(db.from('profiles').update({avatar: selectedAvatar, avatar_photo: null}).eq('id',currentUser.id), 5000, null);
    if(error) { showToast('❌ Could not save avatar'); return; }
    currentProfile.avatar = selectedAvatar;
    currentProfile.avatar_photo = null;
    updateAvatarDisplay(age, selectedAvatar, null);
    showToast('✅ Avatar updated!');
    closeDrawerScreen();
  }
}

function updateAvatarDisplay(age, emoji, photoDataURL) {
  if(photoDataURL) {
    // Photo avatar — update all avatar display points
    ['hsAvatar','settingsAvatar','heroEmoji'].forEach(id => {
      const el = document.getElementById(id);
      if(!el) return;
      if(id === 'settingsAvatar') {
        // Settings shows in a div — replace with img
        el.innerHTML = '';
        el.style.fontSize='inherit';
        const img = document.createElement('img');
        img.src = photoDataURL;
        img.style.cssText='width:42px;height:42px;border-radius:50%;object-fit:cover;';
        el.appendChild(img);
      } else {
        // Replace emoji span with img
        el.innerHTML='';
        const img = document.createElement('img');
        img.src = photoDataURL;
        img.style.cssText = id==='hsAvatar'
          ? 'width:100%;height:100%;border-radius:50%;object-fit:cover;'
          : 'width:56px;height:56px;border-radius:50%;object-fit:cover;';
        el.appendChild(img);
      }
    });
  } else if(emoji) {
    const hsEl = document.getElementById(age==='highschool'?'hsAvatar':'heroEmoji');
    if(hsEl) { hsEl.innerHTML=''; hsEl.textContent=emoji; }
    const sEl = document.getElementById('settingsAvatar');
    if(sEl) { sEl.innerHTML=''; sEl.textContent=emoji; }
  }
}


// ── PHOTO AVATAR ──
let selectedAvatarPhoto = null; // base64 data URL of compressed photo
let avatarTabActive = 'emoji';

function switchAvatarTab(tab) {
  avatarTabActive = tab;
  const emojiBtn = document.getElementById('avatarTabEmoji');
  const photoBtn = document.getElementById('avatarTabPhoto');
  const emojiContent = document.getElementById('avatarTabEmojiContent');
  const photoContent = document.getElementById('avatarTabPhotoContent');
  if(tab === 'emoji') {
    emojiBtn.style.background='var(--violet)'; emojiBtn.style.color='white'; emojiBtn.style.borderColor='var(--violet)';
    photoBtn.style.background='white'; photoBtn.style.color='var(--gray-700,#374151)'; photoBtn.style.borderColor='var(--gray-200,#DDD6FE)';
    emojiContent.style.display='block';
    photoContent.style.display='none';
  } else {
    photoBtn.style.background='var(--violet)'; photoBtn.style.color='white'; photoBtn.style.borderColor='var(--violet)';
    emojiBtn.style.background='white'; emojiBtn.style.color='var(--gray-700,#374151)'; emojiBtn.style.borderColor='var(--gray-200,#DDD6FE)';
    emojiContent.style.display='none';
    photoContent.style.display='block';
  }
}

function handleAvatarPhotoSelect(event) {
  const file = event.target.files?.[0];
  if(!file) return;
  const errEl = document.getElementById('avatarPhotoError');
  const procEl = document.getElementById('avatarPhotoProcessing');
  if(errEl) errEl.style.display='none';
  // Validate
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)) {
    if(errEl){ errEl.textContent='Please pick a JPG or PNG photo.'; errEl.style.display='block'; }
    return;
  }
  if(file.size > 10 * 1024 * 1024) {
    if(errEl){ errEl.textContent='Photo too large — pick one under 10MB.'; errEl.style.display='block'; }
    return;
  }
  if(procEl) procEl.style.display='block';
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Compress + crop to square via canvas
      const canvas = document.createElement('canvas');
      const SIZE = 200; // 200x200px output
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      // Crop to centre square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      // Clip to circle
      ctx.beginPath();
      ctx.arc(SIZE/2, SIZE/2, SIZE/2, 0, Math.PI*2);
      ctx.clip();
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, SIZE, SIZE);
      // Export as JPEG at 0.7 quality (~15-30KB typically)
      const dataURL = canvas.toDataURL('image/jpeg', 0.7);
      selectedAvatarPhoto = dataURL;
      selectedAvatar = null; // clear emoji selection
      // Update preview
      const emojiPrev = document.getElementById('avatarPreviewEmoji');
      const photoPrev = document.getElementById('avatarPreviewPhoto');
      if(emojiPrev) emojiPrev.style.display='none';
      if(photoPrev){ photoPrev.src=dataURL; photoPrev.style.display='block'; }
      // Clear emoji grid selection
      document.querySelectorAll('.avatar-opt').forEach(el => el.classList.remove('selected'));
      if(procEl) procEl.style.display='none';
      showToast('📸 Photo ready — tap Save to confirm');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function selectAge(age) {
  selectedAge=age;
  document.getElementById('age-primary').classList.toggle('selected',age==='primary');
  document.getElementById('age-highschool').classList.toggle('selected',age==='highschool');
  // Show avatar picker for both age groups
  const avatarSection = document.getElementById('avatarSection');
  if(avatarSection) { avatarSection.classList.add('visible'); renderAvatarGrid(age); }
  if(age==='primary'){
    document.getElementById('themeSection').style.display='block';
    document.getElementById('startBtn').classList.remove('visible');
  } else {
    document.getElementById('themeSection').style.display='none';
    selectedTheme=null;
    document.getElementById('startBtn').classList.add('visible');
  }
}
function selectTheme(t) {
  selectedTheme=t;
  ['fantasy','space','adventure'].forEach(x=>document.getElementById('theme-'+x).classList.toggle('selected',x===t));
  document.getElementById('startBtn').classList.add('visible');
}
async function completeOnboarding() {
  if(!selectedAge){showToast('Pick your age group!');return;}
  if(selectedAge==='primary'&&!selectedTheme){showToast('Pick a quest world!');return;}
  const avatar = selectedAvatar || (selectedAge==='primary' ? '🧙' : '🎓');
  const {error:saveErr} = await dbQuery(db.from('profiles').update({age_group:selectedAge,theme:selectedTheme,avatar}).eq('id',currentUser.id), 8000, null);
  if(saveErr){ showToast('Could not save profile: ' + saveErr.message); return; }
  currentProfile.age_group=selectedAge; currentProfile.theme=selectedTheme; currentProfile.avatar=avatar;
  // Also update children row in case age_group was null when they linked
  if(currentChildRecord?.id) {
    await dbQuery(db.from('children').update({age_group:selectedAge}).eq('id',currentChildRecord.id), 5000, null);
    currentChildRecord.age_group = selectedAge;
  }
  await loadStudentApp();
  // HS students: prompt to pick a theme right after onboarding
  if(selectedAge === 'highschool') {
    setTimeout(() => openDrawerScreen('themes'), 400);
  }
}
