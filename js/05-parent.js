// ── PARENT APP ──
async function loadParentApp() {
  setFooterActive('home');
  showScreen('app');
  appReady = true;
  switchRole('parent');
  document.getElementById('parentName').textContent=(currentProfile.full_name||'Parent')+' 👋';
  // Show Pro badge if subscribed
  const proEl = document.getElementById('parentProBadge');
  if(proEl) proEl.style.display = isPro() ? 'inline-block' : 'none';
  const navName = document.getElementById('navUserName');
  if(navName) navName.textContent = currentProfile.full_name?.split(' ')[0] || '';
  let {data:families} = await dbQuery(db.from('families').select('*').eq('parent_id',currentUser.id).order('created_at',{ascending:true}), 8000, []);
  let family = null;
  if(families && families.length > 0) {
    // Prefer the family that has children linked to it
    const {data:childRows} = await dbQuery(db.from('children').select('family_id').in('family_id', families.map(f=>f.id)), 5000, []);
    const familyWithChildren = childRows?.length ? families.find(f => childRows.some(c => c.family_id === f.id)) : null;
    family = familyWithChildren || families[0];
  }
  if(!family) {
    const {data:nf} = await dbQuery(db.from('families').insert({parent_id:currentUser.id,family_name:(currentProfile.full_name||'My')+"'s Family"}).select().maybeSingle());
    family=nf;
  }
  currentFamily=family;
  // Check for Stripe return
  await handleStripeReturn();
  const {data:children} = await dbQuery(db.from('children').select('*').eq('family_id',family.id), 8000, []);
  currentChildren=children||[];
  renderChildTabs();
  if(currentChildren.length){
    selectedChildId=currentChildren[0].id;
    // Load stats in background — don't block app load
    loadChildStats(selectedChildId).catch(()=>{});
    loadJoinedClasses(selectedChildId).catch(()=>{});
    // Populate child selector in join class card
    const sel = document.getElementById('joinClassChildSelect');
    if(sel) {
      if(currentChildren.length > 1) {
        sel.innerHTML = '<select class="form-input" id="joinClassChildId" style="margin-bottom:8px;">' +
          currentChildren.map(c => `<option value="${c.id}">${c.name}</option>`).join('') +
          '</select>';
      } else {
        sel.innerHTML = `<div style="font-size:13px;font-weight:600;color:var(--indigo);margin-bottom:8px;">For: ${currentChildren[0].name}</div>`;
      }
    }
    // Populate child selector in parent task card
    const taskSel = document.getElementById('parentTaskChildSelect');
    if(taskSel) {
      if(currentChildren.length > 1) {
        taskSel.innerHTML = '<select class="form-input" id="parentTaskChildId" style="margin-bottom:8px;">' +
          currentChildren.map(c => `<option value="${c.id}">${c.name}</option>`).join('') +
          '</select>';
      } else if(currentChildren.length === 1) {
        taskSel.innerHTML = `<div style="font-size:13px;font-weight:600;color:var(--indigo);margin-bottom:8px;">For: ${currentChildren[0].name}</div>`;
      }
    }
  }
  loadApprovalQueues().catch(()=>{});
  showScreen('app');
  setTimeout(updateNotifStatus, 1000);
  startNotifPolling();
}

function renderChildTabs() {
  const tabs=document.getElementById('childTabs');
  if(!currentChildren.length){tabs.innerHTML='<div class="child-tab active">No children yet</div>';return;}
  tabs.innerHTML=currentChildren.map((c,i)=>`<div class="child-tab ${i===0?'active':''}" onclick="selectChild('${c.id}',this)">${c.name}</div>`).join('')+'<div class="child-tab" onclick="openDrawerScreen(\'family-invite\')" title="Add another child">+ Add</div>';
}

async function selectChild(childId,el) {
  document.querySelectorAll('.child-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  selectedChildId=childId;
  await loadChildStats(childId);
  loadJoinedClasses(childId).catch(()=>{});
}

async function loadChildStats(childId) {
  const child=currentChildren.find(c=>c.id===childId);
  if(!child) return;
  // Trust score display
  document.getElementById('pTrustScore').textContent=child.trust_score||0;
  const lvl=trustConfig[child.trust_level||'verify'];
  document.getElementById('pTrustLevel').textContent=lvl.label;
  document.getElementById('pTrustScore').style.color=lvl.color;
  document.getElementById('pStreak').textContent=`🔥 ${child.streak||0}`;
  document.getElementById('pStars').textContent=child.age_group==='primary'?`⭐ ${child.stars||0}`:`⚡ ${child.xp||0}`;
  document.getElementById('pStarsSub').textContent=child.age_group==='primary'?'Quest stars':'XP earned';
  const {data:assignments} = await dbQuery(db.from('assignments').select('*, tasks(*), classes(name, subject, profiles(full_name))').eq('child_id',childId).eq('status','active'), 8000, []);
  parentAssignmentCache = {};
  (assignments||[]).forEach(a => { parentAssignmentCache[a.id] = a; });
  const allTasks=(assignments||[]).flatMap(a=>a.tasks||[]);
  const doneTasks=allTasks.filter(t=>t.completed).length;
  const today=new Date().toISOString().split('T')[0];
  const overdue=(assignments||[]).filter(a=>a.due_date&&a.due_date<today).length;
  document.getElementById('pTasksDone').textContent=`${doneTasks}/${allTasks.length}`;
  document.getElementById('pTasksSub').textContent=`${allTasks.length?Math.round(doneTasks/allTasks.length*100):0}% complete`;
  // Subject progress — grouped by class (mirrors student view)
  const subjectEl=document.getElementById('parentSubjectProgress');
  if(!assignments?.length){subjectEl.innerHTML='<div style="font-size:13px;color:var(--gray-500);text-align:center;padding:12px 0;">No assignments yet</div>';return;}

  const statusColor = (a) => {
    const tasks = a.tasks||[];
    const done = tasks.filter(t=>t.completed).length;
    const pct = tasks.length?Math.round((done/tasks.length)*100):0;
    if(pct >= 100) return 'var(--gray-400)';
    if(a.due_date) {
      const days = Math.round((new Date(a.due_date) - new Date())/(1000*60*60*24));
      if(days < 7) return 'var(--rose)';
      if(days < 14) return 'var(--amber)';
    }
    return 'var(--mint)';
  };

  // Group by class
  const classBuckets = {};
  assignments.forEach(a => {
    const cid = a.class_id || 'noclass';
    if(!classBuckets[cid]) classBuckets[cid] = { cls: a.classes, assignments: [] };
    classBuckets[cid].assignments.push(a);
  });

  subjectEl.innerHTML = Object.entries(classBuckets).map(([classId, bucket], ci) => {
    const cls = bucket.cls;
    const className = cls?.name || cls?.subject || '📚 Home Tasks';
    const teacherName = cls?.profiles?.full_name ? cls.profiles.full_name : (classId === 'noclass' ? 'Added by you' : '');

    // Class-level progress
    const allTasks = bucket.assignments.flatMap(a => a.tasks||[]);
    const classDone = allTasks.filter(t=>t.completed).length;
    const classPct = allTasks.length ? Math.round((classDone/allTasks.length)*100) : 0;
    const openCount = bucket.assignments.filter(a => {
      const t = a.tasks||[]; const d = t.filter(x=>x.completed).length;
      return t.length===0 || d<t.length;
    }).length;
    // Most urgent assignment colour drives the class bar
    const urgencyOrder = ['var(--rose)','var(--amber)','var(--mint)','var(--gray-400)'];
    const classColor = urgencyOrder.find(c => bucket.assignments.some(a => statusColor(a)===c)) || 'var(--mint)';

    // Assignment rows inside
    const rows = bucket.assignments.map(a => {
      const tasks = a.tasks||[];
      const done = tasks.filter(t=>t.completed).length;
      const pct = tasks.length?Math.round((done/tasks.length)*100):0;
      const col = statusColor(a);
      const dueStr = a.due_date ? new Date(a.due_date).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : 'No due date';
      const pendingCount = tasks.filter(t=>t.verification_status==='pending').length;
      const pendingBadge = pendingCount ? `<span style="font-size:10px;font-weight:700;color:var(--amber);background:#FFFBEB;padding:1px 6px;border-radius:20px;margin-left:6px;">⏳ ${pendingCount} awaiting</span>` : '';
      return `<div onclick="openAssignmentDetail('${a.id}')" style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:white;border-radius:10px;margin-bottom:6px;border:1px solid var(--gray-100);cursor:pointer;transition:border-color 0.15s;" onmouseover="this.style.borderColor='var(--violet-light)'" onmouseout="this.style.borderColor='var(--gray-100)'">
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:var(--indigo);">${a.title}${pendingBadge}</div>
          <div style="font-size:11px;color:var(--gray-500);margin:3px 0 5px;">Due ${dueStr} · ${done}/${tasks.length} steps</div>
          <div style="background:var(--gray-100);border-radius:10px;height:5px;"><div style="background:${col};border-radius:10px;height:5px;width:${pct}%;transition:width 0.5s;"></div></div>
        </div>
        <div style="font-size:12px;font-weight:800;color:${col};min-width:34px;text-align:right;">${pct}%</div>
        <div style="font-size:14px;color:var(--gray-300);">›</div>
      </div>`;
    }).join('');

    return `<div style="background:var(--gray-50);border-radius:14px;margin-bottom:10px;overflow:hidden;">
      <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('.pcls-chev').style.transform=this.nextElementSibling.style.display==='none'?'':'rotate(180deg)'" style="padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;">
        <div style="flex:1;">
          <div style="font-weight:700;font-size:14px;color:var(--indigo);">${className}</div>
          <div style="font-size:11px;color:var(--gray-500);margin:3px 0 5px;">${teacherName?teacherName+' · ':''}${openCount} active · ${classPct}% overall</div>
          <div style="background:var(--gray-200);border-radius:10px;height:5px;"><div style="background:${classColor};border-radius:10px;height:5px;width:${classPct}%;transition:width 0.5s;"></div></div>
        </div>
        <div class="pcls-chev" style="font-size:12px;color:var(--gray-500);transition:transform 0.25s;">▼</div>
      </div>
      <div style="display:${ci===0?'block':'none'};padding:0 12px 12px;">${rows}</div>
    </div>`;
  }).join('');

  // Load enrolled classes
  const enrolledEl = document.getElementById('parentEnrolledClasses');
  if(enrolledEl) {
    const {data:memberships} = await dbQuery(
      db.from('class_members').select('classes(id, name, subject, year_group, profiles(full_name))').eq('child_id', childId),
      5000, []
    );
    if(!memberships?.length) {
      enrolledEl.innerHTML = '<div style="font-size:13px;color:var(--gray-500);text-align:center;padding:8px 0;">No classes enrolled yet</div>';
    } else {
      enrolledEl.innerHTML = memberships.map(m => {
        const cls = m.classes;
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--gray-50);border-radius:10px;margin-bottom:8px;">
          <div style="font-size:22px;">📚</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:13px;color:var(--indigo);">${cls.name}</div>
            <div style="font-size:11px;color:var(--gray-500);">${cls.subject||''} ${cls.year_group?'· '+cls.year_group:''} ${cls.profiles?.full_name?'· '+cls.profiles.full_name:''}</div>
          </div>
          <div style="font-size:11px;color:var(--mint);font-weight:600;">✓ Enrolled</div>
        </div>`;
      }).join('');
    }
  }
}

// loadParentVerifyQueue, loadTeacherVerifyQueue, renderVerifyItem, approveVerification, confirmReject
// removed — replaced by unified loadApprovalQueues / resolveApproval / renderApprovalQueue

async function updateTrustScoreManual(childId, action) {
  const {data:child} = await db.from('children').select('trust_score').eq('id',childId).maybeSingle();
  if(!child) return;
  const points = action==='approved'?2:action==='rejected'?-3:1;
  const newScore = Math.max(0,Math.min(100,(child.trust_score||0)+points));
  const newLevel = newScore>=81?'champion':newScore>=51?'trust':newScore>=21?'check':'verify';
  await db.from('children').update({trust_score:newScore,trust_level:newLevel}).eq('id',childId);
}

// ── SCHOOL ADMIN ──────────────────────────────────────────────

async function loadSchoolAdmin() {
  if(!currentSchool) {
    showToast('No school loaded'); return;
  }
  const schoolId = currentSchool.id;

  // Populate school info
  document.getElementById('adminSchoolName').textContent = currentSchool.name;
  const status = currentSchool.subscription_status || 'trial';
  const statusColors = {trial:'#FEF3C7', active:'#ECFDF5', past_due:'#FFF1F2', cancelled:'#F1F5F9'};
  const statusTextColors = {trial:'#92400E', active:'#065F46', past_due:'#9F1239', cancelled:'#475569'};
  const badge = document.getElementById('adminSubBadge');
  if(badge) {
    badge.textContent = status.replace('_',' ');
    badge.style.background = statusColors[status] || '#F1F5F9';
    badge.style.color = statusTextColors[status] || '#475569';
  }
  document.getElementById('adminSchoolCode').textContent = currentSchool.invite_code || '——';
  document.getElementById('adminSchoolStatus').textContent = 'School ID: ' + schoolId.slice(0,8) + '…';
  const expiry = currentSchool.invite_code_expires_at;
  document.getElementById('adminCodeExpiry').textContent = expiry
    ? 'Expires ' + new Date(expiry).toLocaleDateString('en-AU')
    : '';

  // Load pending teachers
  const {data:pending} = await dbQuery(
    db.from('profiles').select('id, full_name, email').eq('school_id', schoolId).eq('school_role','pending'),
    8000, []
  );
  const pendingCard = document.getElementById('adminPendingCard');
  const pendingList = document.getElementById('adminPendingList');
  if(pending?.length) {
    pendingCard.style.display = 'block';
    pendingList.innerHTML = pending.map(t => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:#FFFBEB;margin-bottom:8px;border:1px solid #FDE68A;">
        <div style="font-size:22px;">👩‍🏫</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--indigo);">${t.full_name||'Teacher'}</div>
          <div style="font-size:11px;color:var(--gray-500);">${t.email||''}</div>
        </div>
        <button data-tid="${t.id}" data-tname="${(t.full_name||'Teacher').replace(/"/g,'&quot;')}" class="admin-approve-btn" style="padding:6px 12px;border-radius:20px;border:none;background:var(--mint);color:white;font-size:12px;font-weight:700;cursor:pointer;margin-right:4px;">✓ Approve</button>
        <button data-tid="${t.id}" data-tname="${(t.full_name||'Teacher').replace(/"/g,'&quot;')}" class="admin-remove-btn" style="padding:6px 12px;border-radius:20px;border:none;background:var(--rose);color:white;font-size:12px;font-weight:700;cursor:pointer;">✗</button>
      </div>`).join('');
    pendingList.querySelectorAll('.admin-approve-btn').forEach(btn => {
      btn.addEventListener('click', () => approveTeacher(btn.dataset.tid, btn.dataset.tname));
    });
    pendingList.querySelectorAll('.admin-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => removeTeacher(btn.dataset.tid, btn.dataset.tname));
    });
  } else {
    pendingCard.style.display = 'none';
  }

  // Load active teachers
  const {data:teachers} = await dbQuery(
    db.from('profiles').select('id, full_name, email, school_role').eq('school_id', schoolId).in('school_role',['admin','member']),
    8000, []
  );
  const teacherList = document.getElementById('adminTeacherList');
  if(!teachers?.length) {
    teacherList.innerHTML = '<div style="font-size:13px;color:var(--gray-400);text-align:center;padding:12px 0;">No teachers yet</div>';
  } else {
    teacherList.innerHTML = teachers.map(t => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:var(--gray-50);margin-bottom:8px;">
        <div style="font-size:22px;">${t.school_role==='admin'?'👑':'👩‍🏫'}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--indigo);">${t.full_name||'Teacher'} ${t.school_role==='admin'?'<span style="font-size:10px;background:var(--violet);color:white;padding:2px 6px;border-radius:10px;margin-left:4px;">Admin</span>':''}</div>
          <div style="font-size:11px;color:var(--gray-500);">${t.email||''}</div>
        </div>
        ${t.id !== currentUser.id ? `<button data-tid="${t.id}" data-tname="${(t.full_name||'Teacher').replace(/"/g,'&quot;')}" class="admin-remove-teacher-btn" style="padding:5px 10px;border-radius:20px;border:1.5px solid var(--gray-200);background:white;color:var(--gray-500);font-size:11px;font-weight:600;cursor:pointer;">Remove</button>` : '<span style="font-size:11px;color:var(--gray-400);">You</span>'}
      </div>`).join('');
    teacherList.querySelectorAll('.admin-remove-teacher-btn').forEach(btn => {
      btn.addEventListener('click', () => removeTeacher(btn.dataset.tid, btn.dataset.tname));
    });
  }

  // Load classes
  const {data:classes} = await dbQuery(
    db.from('classes').select('id, name, subject, year_group, direct_student_enrol, class_members(count)').eq('school_id', schoolId).eq('status','active'),
    8000, []
  );
  const classList = document.getElementById('adminClassList');
  if(!classes?.length) {
    classList.innerHTML = '<div style="font-size:13px;color:var(--gray-400);text-align:center;padding:12px 0;">No classes yet</div>';
  } else {
    classList.innerHTML = classes.map(c => {
      const count = c.class_members?.[0]?.count || 0;
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:var(--gray-50);margin-bottom:8px;">
        <div style="font-size:22px;">📚</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--indigo);">${c.name}</div>
          <div style="font-size:11px;color:var(--gray-500);">${c.subject||''} ${c.year_group||''} · ${count} student${count===1?'':'s'}</div>
        </div>
        ${c.direct_student_enrol ? '<span style="font-size:10px;background:#ECFDF5;color:var(--mint);padding:2px 8px;border-radius:10px;font-weight:700;">Direct enrol</span>' : ''}
      </div>`;
    }).join('');
  }
}

async function approveTeacher(teacherId, teacherName) {
  await dbQuery(db.from('profiles').update({school_role:'member'}).eq('id', teacherId));
  // Notify the teacher
  await dbQuery(db.from('notifications').insert({
    recipient_id: teacherId,
    sender_id: currentUser.id,
    type: 'school_approved',
    title: '✅ School Access Approved',
    body: 'You have been approved to join ' + (currentSchool?.name||'the school') + '. You can now create classes and use direct student enrolment.'
  }));
  showToast('✅ ' + teacherName + ' approved');
  loadSchoolAdmin();
}

async function removeTeacher(teacherId, teacherName) {
  if(!confirm('Remove ' + teacherName + ' from the school?')) return;
  await dbQuery(db.from('profiles').update({school_id:null, school_role:null}).eq('id', teacherId));
  showToast(teacherName + ' removed from school');
  loadSchoolAdmin();
}

async function regenSchoolCode() {
  if(!confirm('Generate a new school invite code? The old code will stop working.')) return;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i=0;i<6;i++) code += chars[Math.floor(Math.random()*chars.length)];
  const expires = new Date(Date.now() + 30*24*60*60*1000).toISOString();
  await dbQuery(db.from('schools').update({invite_code:code, invite_code_expires_at:expires}).eq('id', currentSchool.id));
  currentSchool.invite_code = code;
  currentSchool.invite_code_expires_at = expires;
  document.getElementById('adminSchoolCode').textContent = code;
  document.getElementById('adminCodeExpiry').textContent = 'Expires ' + new Date(expires).toLocaleDateString('en-AU');
  showToast('🔑 New code: ' + code);
}

function copyAdminSchoolCode() {
  const code = document.getElementById('adminSchoolCode').textContent;
  navigator.clipboard.writeText(code).then(() => showToast('📋 Code copied: ' + code));
}

// ── REWARDS ──

const REWARD_EMOJIS = ['🎮','🍕','🎬','🛒','🍦','🎉','🎈','🏖️','🚗','🎲','🃏','⚽','🎸','📱','🍫','🍔','🎠','🏊','🎪','🎯','📚','🎨','🧩','🏆','💰','🌟','🎁','🎤','🎧','🍭'];

const REWARD_SUGGESTIONS = [
  {emoji:'🎮', title:'30 min screen time', cost:10},
  {emoji:'🍕', title:'Choose Friday dinner', cost:25},
  {emoji:'🎬', title:'Movie night pick', cost:30},
  {emoji:'🛒', title:'$5 to spend', cost:50},
  {emoji:'🍦', title:'Ice cream trip', cost:20},
  {emoji:'🎉', title:'Friend sleepover', cost:60},
  {emoji:'🏖️', title:'Beach day', cost:75},
  {emoji:'🎲', title:'Board game night pick', cost:15},
];

let selectedRewardEmoji = '🎁';
let currentRewards = [];
let currentRedemptions = [];

function toggleEmojiPicker() {
  const picker = document.getElementById('rewardEmojiPicker');
  if(!picker) return;
  const isOpen = picker.style.display !== 'none';
  if(isOpen) { picker.style.display = 'none'; return; }
  const grid = picker.querySelector('div');
  if(grid && !grid.children.length) {
    grid.innerHTML = REWARD_EMOJIS.map(e =>
      `<div onclick="pickRewardEmoji('${e}')" style="font-size:24px;padding:6px;border-radius:8px;cursor:pointer;text-align:center;transition:background 0.15s;" onmouseover="this.style.background='var(--gray-100)'" onmouseout="this.style.background=''">${e}</div>`
    ).join('');
  }
  picker.style.display = 'block';
}

function pickRewardEmoji(emoji) {
  selectedRewardEmoji = emoji;
  const preview = document.getElementById('rewardEmojiPreview');
  if(preview) preview.textContent = emoji;
  const picker = document.getElementById('rewardEmojiPicker');
  if(picker) picker.style.display = 'none';
}

async function loadManageRewards() {
  const childId = document.getElementById('rewardChildPicker')?.value;
  const list = document.getElementById('manageRewardsList');
  const reqCard = document.getElementById('redemptionRequestsCard');
  const reqList = document.getElementById('redemptionRequestsList');
  console.log('loadManageRewards: childId=', childId, 'currentChildren=', currentChildren?.map(c=>c.id+':'+c.name));
  if(!list) return;

  if(!childId) {
    list.innerHTML = '<div style="font-size:13px;color:var(--gray-400);text-align:center;padding:12px 0;">Select a child above</div>';
    if(reqCard) reqCard.style.display = 'none';
    return;
  }

  list.innerHTML = '<div style="font-size:13px;color:var(--gray-400);text-align:center;padding:12px 0;">Loading…</div>';

  // Load rewards for this child
  const {data:rewards, error:rewardsErr} = await dbQuery(
    db.from('rewards').select('*').eq('child_id', childId).eq('is_active', true).order('star_cost')
  );
  console.log('loadManageRewards: rewards=', rewards, 'error=', rewardsErr?.message);
  currentRewards = rewards || [];

  // Load pending redemptions
  const {data:redemptions} = await dbQuery(
    db.from('redemptions')
      .select('*, rewards(title, emoji, star_cost)')
      .eq('child_id', childId)
      .eq('status', 'pending')
      .order('requested_at', {ascending:false})
  );
  currentRedemptions = redemptions || [];

  // Render redemption requests
  if(currentRedemptions.length) {
    if(reqCard) reqCard.style.display = 'block';
    if(reqList) reqList.innerHTML = currentRedemptions.map(r => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:var(--gray-50);margin-bottom:8px;">
        <div style="font-size:22px;">${r.rewards?.emoji||'🎁'}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--indigo);">${r.rewards?.title||'Reward'}</div>
          <div style="font-size:11px;color:var(--gray-500);">⭐ ${r.rewards?.star_cost||0} stars · ${new Date(r.requested_at).toLocaleDateString('en-AU')}</div>
        </div>
        <button data-redemption-id="${r.id}" data-action="approved" class="redemption-action-btn" style="padding:6px 12px;border-radius:20px;border:none;background:var(--mint);color:white;font-size:12px;font-weight:700;cursor:pointer;margin-right:4px;">✓ Yes</button>
        <button data-redemption-id="${r.id}" data-action="rejected" class="redemption-action-btn" style="padding:6px 12px;border-radius:20px;border:none;background:var(--rose);color:white;font-size:12px;font-weight:700;cursor:pointer;">✗ No</button>
      </div>`).join('');
    // Attach listeners
    reqList.querySelectorAll('.redemption-action-btn').forEach(btn => {
      btn.addEventListener('click', () => respondToRedemption(btn.dataset.redemptionId, btn.dataset.action, btn));
    });
  } else {
    if(reqCard) reqCard.style.display = 'none';
  }

  // Render active rewards list
  if(!currentRewards.length) {
    list.innerHTML = '<div style="font-size:13px;color:var(--gray-400);text-align:center;padding:12px 0;">No rewards yet — add one above!</div>';
    return;
  }
  list.innerHTML = currentRewards.map(r => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:var(--gray-50);margin-bottom:8px;">
      <div style="font-size:22px;">${r.emoji}</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;color:var(--indigo);">${r.title}</div>
        <div style="font-size:11px;color:var(--amber);font-weight:700;">⭐ ${r.star_cost} stars</div>
      </div>
      <button data-reward-id="${r.id}" class="delete-reward-btn" style="padding:5px 10px;border-radius:20px;border:1.5px solid var(--gray-200);background:white;color:var(--gray-500);font-size:11px;font-weight:600;cursor:pointer;">Remove</button>
    </div>`).join('');
  list.querySelectorAll('.delete-reward-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteReward(btn.dataset.rewardId));
  });
}

async function addReward() {
  const childId = document.getElementById('rewardChildPicker')?.value;
  const title = document.getElementById('rewardTitle')?.value?.trim();
  const cost = parseInt(document.getElementById('rewardCost')?.value) || 10;
  if(!childId) { showToast('Select a child first'); return; }
  if(!title) { showToast('Enter a reward name'); return; }

  // Get family_id from currentFamily
  const familyId = currentFamily?.id;
  if(!familyId) { showToast('Family not loaded'); return; }

  const {error} = await dbQuery(
    db.from('rewards').insert({
      family_id: familyId,
      created_by: currentUser.id,
      child_id: childId,
      title,
      emoji: selectedRewardEmoji,
      star_cost: cost,
      is_active: true
    })
  );
  if(error) { showToast('Error adding reward'); console.error(error); return; }
  // Reset form
  document.getElementById('rewardTitle').value = '';
  document.getElementById('rewardCost').value = '10';
  selectedRewardEmoji = '🎁';
  document.getElementById('rewardEmojiPreview').textContent = '🎁';
  showToast('🎁 Reward added!');
  loadManageRewards();
}

async function deleteReward(rewardId) {
  if(!confirm('Remove this reward?')) return;
  await dbQuery(db.from('rewards').update({is_active: false}).eq('id', rewardId));
  showToast('Reward removed');
  loadManageRewards();
}

async function respondToRedemption(redemptionId, action, btn) {
  btn.disabled = true;
  btn.textContent = '…';

  const {data:redemption} = await dbQuery(
    db.from('redemptions').select('*, children(profile_id), rewards(title,emoji,star_cost)').eq('id',redemptionId).maybeSingle()
  );
  if(!redemption) { showToast('Could not load redemption'); return; }

  await dbQuery(
    db.from('redemptions').update({status: action, responded_at: new Date().toISOString()}).eq('id', redemptionId)
  );

  // If approved, deduct stars from child
  if(action === 'approved') {
    const stars = redemption.rewards?.star_cost || 0;
    const childId = redemption.child_id;
    const {data:child} = await dbQuery(db.from('children').select('stars').eq('id',childId).maybeSingle());
    const newStars = Math.max(0, (child?.stars||0) - stars);
    await dbQuery(db.from('children').update({stars: newStars}).eq('id', childId));

    // Notify the student
    const studentId = redemption.children?.profile_id;
    if(studentId) {
      await dbQuery(db.from('notifications').insert({
        recipient_id: studentId,
        sender_id: currentUser.id,
        type: 'reward_approved',
        title: '🎉 Reward Approved!',
        body: `Your parent approved: ${redemption.rewards?.emoji||'🎁'} ${redemption.rewards?.title||'your reward'}. Enjoy!`
      }));
      await sendPushToUser(studentId, '🎉 Reward Approved!', `Your parent approved: ${redemption.rewards?.title||'your reward'}. Enjoy!`);
      // Email student
      sendTransactionalEmail('reward_approved', {
        studentId,
        rewardTitle: redemption.rewards?.title || 'your reward',
        rewardEmoji: redemption.rewards?.emoji || '🎁',
        starCost: redemption.rewards?.star_cost || 0
      });
    }
    showToast('🎉 Reward approved!');
  } else {
    // Notify rejection
    const studentId = redemption.children?.profile_id;
    if(studentId) {
      await dbQuery(db.from('notifications').insert({
        recipient_id: studentId,
        sender_id: currentUser.id,
        type: 'reward_rejected',
        title: '😔 Not Yet',
        body: `${redemption.rewards?.emoji||'🎁'} ${redemption.rewards?.title||'Your reward request'} wasn't approved this time. Keep earning!`
      }));
      // Email student
      sendTransactionalEmail('reward_rejected', {
        studentId,
        rewardTitle: redemption.rewards?.title || 'your reward',
        rewardEmoji: redemption.rewards?.emoji || '🎁'
      });
    }
    showToast('Reward declined');
  }
  await loadParentRedemptions();
}

// Load redemption requests for parent main view
async function loadSubscriptionScreen() {
  const el = document.getElementById('subscriptionContent');
  if (!el) return;

  const status = currentFamily?.subscription_status || 'free';
  const stripeCustomerId = currentFamily?.stripe_customer_id;
  const stripeSubId = currentFamily?.stripe_subscription_id;

  if (status === 'free') {
    el.innerHTML = '<div class="card" style="text-align:center;padding:24px;">' +
      '<div style="font-size:40px;margin-bottom:12px;">🌱</div>' +
      '<div style="font-size:17px;font-weight:800;color:var(--indigo);margin-bottom:6px;">Free Plan</div>' +
      '<div style="font-size:13px;color:var(--gray-500);margin-bottom:20px;">Upgrade to Family Pro to unlock teacher connections, unlimited children, themes and more.</div>' +
      '<button class="publish-btn" onclick="showPaywall(&apos;upgrade&apos;,&apos;Upgrade to Family Pro&apos;,&apos;Unlock teacher connections, unlimited children, themes and more.&apos;)" style="background:linear-gradient(135deg,var(--violet),#5B21B6);">⭐ Upgrade to Family Pro</button>' +
    '</div>';
    return;
  }

  if (status === 'school_attached') {
    el.innerHTML = '<div class="card">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
        '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--violet),#5B21B6);display:flex;align-items:center;justify-content:center;font-size:22px;">🏫</div>' +
        '<div><div style="font-size:16px;font-weight:800;color:var(--indigo);">School-Attached Pro</div>' +
        '<div style="font-size:12px;color:var(--gray-500);">Included with your school license</div></div>' +
      '</div>' +
      '<div style="background:#ECFDF5;border-radius:10px;padding:12px;margin-bottom:12px;">' +
        '<div style="font-size:12px;font-weight:700;color:#065F46;">✅ Active — covered by school license</div>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--gray-500);">Your Family Pro access is included as part of your school FocablyED license. Contact your school admin for billing questions.</div>' +
    '</div>';
    return;
  }

  // Pro — fetch latest family data for renewal info
  const {data:freshFamily} = await dbQuery(db.from('families').select('*').eq('parent_id', currentUser.id).maybeSingle());
  const planLabel = freshFamily?.stripe_subscription_id?.includes('annual') ? 'Family Pro — Annual' : 'Family Pro — Monthly';

  el.innerHTML = '<div class="card" style="margin-bottom:12px;">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
      '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--violet),#5B21B6);display:flex;align-items:center;justify-content:center;font-size:22px;">⭐</div>' +
      '<div><div style="font-size:16px;font-weight:800;color:var(--indigo);">Family Pro</div>' +
      '<div style="font-size:12px;color:var(--gray-500);">Full access for your family</div></div>' +
    '</div>' +
    '<div style="background:#ECFDF5;border-radius:10px;padding:12px;margin-bottom:16px;">' +
      '<div style="font-size:12px;font-weight:700;color:#065F46;margin-bottom:4px;">✅ Active</div>' +
      '<div style="font-size:13px;color:#065F46;">All features unlocked for your family</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">' +
      '<div style="background:var(--gray-50);border-radius:10px;padding:12px;">' +
        '<div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Plan</div>' +
        '<div style="font-size:13px;font-weight:700;color:var(--indigo);">' + (freshFamily?.stripe_subscription_id ? 'Monthly $9.99' : 'Family Pro') + '</div>' +
      '</div>' +
      '<div style="background:var(--gray-50);border-radius:10px;padding:12px;">' +
        '<div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Billing</div>' +
        '<div style="font-size:13px;font-weight:700;color:var(--indigo);">Via Stripe</div>' +
      '</div>' +
    '</div>' +
    '<button onclick="openStripePortal()" class="publish-btn" style="background:linear-gradient(135deg,var(--violet),#5B21B6);margin-bottom:8px;">💳 Update Payment Method</button>' +
    '<div style="font-size:11px;color:var(--gray-400);text-align:center;margin-bottom:16px;">Securely update your card details via Stripe</div>' +
    '<div style="text-align:center;"><button onclick="toggleManageSubMenu()" style="background:none;border:none;font-size:12px;color:var(--gray-400);cursor:pointer;">Manage subscription ›</button></div>' +
    '<div id="manageSubMenu" style="display:none;margin-top:12px;border:1px solid var(--gray-100);border-radius:12px;overflow:hidden;">' +
      '<div onclick="openStripePortal()" style="padding:12px 16px;font-size:13px;color:var(--indigo);cursor:pointer;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:8px;">📋 View billing history</div>' +
      '<div onclick="confirmCancelSubscription()" style="padding:12px 16px;font-size:13px;color:#9CA3AF;cursor:pointer;display:flex;align-items:center;gap:8px;">✕ Cancel subscription</div>' +
    '</div>' +
  '</div>' +
  '<div class="card">' +
    '<div class="card-title">✅ Whats included</div>' +
    '<div style="font-size:13px;color:var(--gray-600);line-height:1.8;">' +
      '👨‍👩‍👧 Unlimited children<br>' +
      '🏫 Teacher class connections<br>' +
      '🎨 Full theme library<br>' +
      '🐿️ Unlimited Squirrel requests<br>' +
      '🔔 Push notifications<br>' +
      '🎁 Rewards system' +
    '</div>' +
  '</div>';
}

async function openStripePortal() {
  const stripePortalUrl = 'https://billing.stripe.com/p/login/bJe14meC37jBbNu6ko6J200';
  showToast('Opening billing portal…');
  window.open(stripePortalUrl, '_blank');
}

function confirmCancelSubscription() {
  const confirmed = confirm('Are you sure you want to cancel?\n\nYou will lose access to:\n• Teacher class connections\n• Unlimited children\n• Full theme library\n• Unlimited AI imports\n\nYour data is safe and you can resubscribe anytime.');
  if (!confirmed) return;
  showToast('Opening billing portal…');
  window.open('https://billing.stripe.com/p/login/bJe14meC37jBbNu6ko6J200', '_blank');
}

function toggleManageSubMenu() {
  const menu = document.getElementById('manageSubMenu');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

async function loadSchoolSubscriptionScreen() {
  const el = document.getElementById('schoolSubscriptionContent');
  if (!el) return;
  if (!currentSchool) {
    el.innerHTML = '<div class="card" style="text-align:center;padding:24px;color:var(--gray-500);">No school loaded.</div>';
    return;
  }

  // Fetch license for this school
  const {data:license} = await dbQuery(
    db.from('licenses').select('*').eq('school_id', currentSchool.id).maybeSingle()
  );

  const status = currentSchool.subscription_status || 'trial';
  const statusColors = {trial:'#FEF3C7', active:'#ECFDF5', past_due:'#FFF1F2', cancelled:'#F1F5F9'};
  const statusText = {trial:'⏳ Trial', active:'✅ Active', past_due:'⚠️ Past Due', cancelled:'❌ Cancelled'};
  const tierLabels = {small:'School Small (≤300 students)', medium:'School Medium (≤800 students)', large:'School Large (Unlimited)', platinum:'School Platinum (Full coverage)'};
  const tierPrices = {small:'$990/yr', medium:'$1,990/yr', large:'$3,490/yr', platinum:'$5,990/yr'};

  const expiry = license?.expires_at ? new Date(license.expires_at).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'}) : 'Not set';
  const activated = license?.activated_at ? new Date(license.activated_at).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'}) : 'Not set';

  el.innerHTML = '<div class="card" style="margin-bottom:12px;">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
      '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0F172A,#334155);display:flex;align-items:center;justify-content:center;font-size:22px;">🏫</div>' +
      '<div><div style="font-size:16px;font-weight:800;color:var(--indigo);">' + (currentSchool.name || 'My School') + '</div>' +
      '<div style="font-size:12px;color:var(--gray-500);">School License</div></div>' +
    '</div>' +
    '<div style="background:' + (statusColors[status]||'#F1F5F9') + ';border-radius:10px;padding:12px;margin-bottom:16px;">' +
      '<div style="font-size:13px;font-weight:700;">' + (statusText[status]||status) + '</div>' +
    '</div>' +
    (license ? (
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">' +
        '<div style="background:var(--gray-50);border-radius:10px;padding:12px;">' +
          '<div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Tier</div>' +
          '<div style="font-size:13px;font-weight:700;color:var(--indigo);">' + (tierLabels[license.tier]||license.tier||'—') + '</div>' +
        '</div>' +
        '<div style="background:var(--gray-50);border-radius:10px;padding:12px;">' +
          '<div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Price</div>' +
          '<div style="font-size:13px;font-weight:700;color:var(--indigo);">' + (tierPrices[license.tier]||'—') + '</div>' +
        '</div>' +
        '<div style="background:var(--gray-50);border-radius:10px;padding:12px;">' +
          '<div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Activated</div>' +
          '<div style="font-size:13px;font-weight:700;color:var(--indigo);">' + activated + '</div>' +
        '</div>' +
        '<div style="background:var(--gray-50);border-radius:10px;padding:12px;">' +
          '<div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Expires</div>' +
          '<div style="font-size:13px;font-weight:700;color:var(--indigo);">' + expiry + '</div>' +
        '</div>' +
      '</div>'
    ) : '<div style="font-size:13px;color:var(--gray-500);margin-bottom:16px;">No license record found. Contact FocablyED to set up your school license.</div>') +
    '<div style="font-size:12px;color:var(--gray-400);border-top:1px solid var(--gray-100);padding-top:12px;margin-top:4px;">To renew, upgrade, or cancel your school license, contact us at <strong>schools@focablyed.com</strong></div>' +
  '</div>';
}

async function openRedemptionHistory() {
  openDrawerScreen('redemption-history');
  await loadRedemptionHistory();
}

async function loadRedemptionHistory() {
  const list = document.getElementById('redemptionHistoryList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray-400);font-size:14px;">Loading...</div>';

  let query;
  if (currentProfile?.role === 'parent') {
    const childIds = currentChildren.map(c => c.id);
    if (!childIds.length) { list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray-400);font-size:14px;">No children linked yet.</div>'; return; }
    query = db.from('redemptions').select('*, rewards(title,emoji,star_cost), children(name)').in('child_id', childIds).order('requested_at', {ascending:false}).limit(50);
  } else {
    // Student
    if (!currentChildRecord?.id) { list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray-400);font-size:14px;">No history yet.</div>'; return; }
    query = db.from('redemptions').select('*, rewards(title,emoji,star_cost)').eq('child_id', currentChildRecord.id).order('requested_at', {ascending:false}).limit(50);
  }

  const {data:redemptions} = await dbQuery(query, 8000, []);
  if (!redemptions || !redemptions.length) {
    list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray-400);font-size:14px;">No reward history yet.</div>';
    return;
  }

  const statusStyle = {
    pending:  'background:#FEF3C7;color:#92400E;',
    approved: 'background:#D1FAE5;color:#065F46;',
    rejected: 'background:#FEE2E2;color:#991B1B;'
  };
  const statusLabel = { pending:'⏳ Pending', approved:'✅ Approved', rejected:'❌ Rejected' };

  list.innerHTML = redemptions.map(function(r) {
    const date = new Date(r.requested_at).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
    const childLine = currentProfile?.role === 'parent' ? '<div style="font-size:11px;color:var(--gray-500);">' + (r.children?.name||'Child') + '</div>' : '';
    const st = r.status || 'pending';
    return '<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:var(--gray-50);margin-bottom:8px;">' +
      '<div style="font-size:24px;">' + (r.rewards?.emoji||'🎁') + '</div>' +
      '<div style="flex:1;">' +
        '<div style="font-size:14px;font-weight:700;color:var(--indigo);">' + (r.rewards?.title||'Reward') + '</div>' +
        childLine +
        '<div style="font-size:11px;color:var(--gray-400);margin-top:2px;">⭐ ' + (r.rewards?.star_cost||0) + ' stars · ' + date + '</div>' +
      '</div>' +
      '<span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;' + (statusStyle[st]||statusStyle.pending) + '">' + (statusLabel[st]||st) + '</span>' +
    '</div>';
  }).join('');
}

async function loadParentRedemptions() {
  const card = document.getElementById('parent-redemption-card');
  const queue = document.getElementById('parent-redemption-queue');
  if(!card || !queue) return;

  // Get all children for this parent
  const childIds = currentChildren.map(c=>c.id);
  if(!childIds.length) { card.style.display='none'; return; }

  const {data:redemptions} = await dbQuery(
    db.from('redemptions')
      .select('*, rewards(title,emoji,star_cost), children(name)')
      .in('child_id', childIds)
      .eq('status','pending')
      .order('requested_at', {ascending:false})
  );

  if(!redemptions || !redemptions.length) { card.style.display='none'; return; }
  card.style.display = 'block';

  queue.innerHTML = redemptions.map(r => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:var(--gray-50);margin-bottom:8px;">
      <div style="font-size:22px;">${r.rewards?.emoji||'🎁'}</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;color:var(--indigo);">${r.rewards?.title||'Reward'}</div>
        <div style="font-size:11px;color:var(--gray-500);">${r.children?.name||'Child'} · ⭐ ${r.rewards?.star_cost||0} stars</div>
      </div>
      <button data-redemption-id="${r.id}" data-action="approved" class="parent-redemption-btn" style="padding:6px 12px;border-radius:20px;border:none;background:var(--mint);color:white;font-size:12px;font-weight:700;cursor:pointer;margin-right:4px;">✓</button>
      <button data-redemption-id="${r.id}" data-action="rejected" class="parent-redemption-btn" style="padding:6px 12px;border-radius:20px;border:none;background:var(--rose);color:white;font-size:12px;font-weight:700;cursor:pointer;">✗</button>
    </div>`).join('');

  queue.querySelectorAll('.parent-redemption-btn').forEach(btn => {
    btn.addEventListener('click', () => respondToRedemption(btn.dataset.redemptionId, btn.dataset.action, btn).then(()=>loadParentRedemptions()));
  });
}

// Load rewards for student (called from loadStudentAssignments / loadStudentApp)
async function loadStudentRewards(childId, stars) {
  const container = document.getElementById('rewardsContainer');
  if(!container) return;

  const {data:rewards} = await dbQuery(
    db.from('rewards').select('*').eq('child_id', childId).eq('is_active', true).order('star_cost')
  );

  // Load both pending AND recently approved redemptions (last 24h) to show correct status
  const {data:activeRedemptions} = await dbQuery(
    db.from('redemptions').select('reward_id,status').eq('child_id', childId).in('status',['pending','approved'])
  );
  const pendingIds = new Set((activeRedemptions||[]).filter(r=>r.status==='pending').map(r=>r.reward_id));
  const approvedIds = new Set((activeRedemptions||[]).filter(r=>r.status==='approved').map(r=>r.reward_id));

  if(!rewards || !rewards.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--gray-400);text-align:center;grid-column:1/-1;padding:8px 0;">No rewards set up yet — ask your parent!</div>';
    return;
  }

  container.innerHTML = rewards.map(r => {
    const canAfford = (stars||0) >= r.star_cost;
    const isPending = pendingIds.has(r.id);
    const isApproved = approvedIds.has(r.id);
    let cls, status, clickable;
    if(isApproved) {
      cls = 'reward-tile'; status = '✅ Enjoyed!'; clickable = false;
    } else if(isPending) {
      cls = 'reward-tile'; status = '⏳ Requested!'; clickable = false;
    } else if(canAfford) {
      cls = 'reward-tile unlocked'; status = '✨ Redeem!'; clickable = true;
    } else {
      cls = 'reward-tile'; status = 'Need ' + (r.star_cost - (stars||0)) + ' more ⭐'; clickable = false;
    }
    return '<div class="' + cls + '" data-reward-id="' + r.id + '" data-clickable="' + clickable + '" style="cursor:' + (clickable ? 'pointer' : 'default') + ';opacity:' + (isApproved ? '0.6' : '1') + ';">' +
      '<div class="r-emoji">' + r.emoji + '</div>' +
      '<div class="r-name">' + r.title + '</div>' +
      '<div class="r-cost">⭐ ' + r.star_cost + ' stars</div>' +
      '<div class="r-status">' + status + '</div>' +
    '</div>';
  }).join('');

  // Attach click handlers only for affordable, non-pending, non-approved rewards
  container.querySelectorAll('.reward-tile[data-clickable="true"]').forEach(tile => {
    tile.addEventListener('click', () => redeemReward(tile.dataset.rewardId, childId));
  });
}

async function redeemReward(rewardId, childId) {
  const reward = await dbQuery(db.from('rewards').select('*').eq('id',rewardId).maybeSingle()).then(r=>r.data);
  if(!reward) return;
  if(!confirm(`Redeem "${reward.emoji} ${reward.title}" for ⭐ ${reward.star_cost} stars?\n\nYour parent will need to approve it.`)) return;

  const familyId = reward.family_id;
  const {error} = await dbQuery(
    db.from('redemptions').insert({
      reward_id: rewardId,
      child_id: childId,
      family_id: familyId,
      status: 'pending'
    })
  );
  if(error) { showToast('Error requesting reward'); return; }

  // Refresh reward tiles immediately so pending status shows
  const {data:updatedChild} = await dbQuery(db.from('children').select('stars').eq('id', childId).maybeSingle());
  loadStudentRewards(childId, updatedChild?.stars || 0);

  // Notify parent
  const {data:family} = await dbQuery(db.from('families').select('parent_id').eq('id', familyId).maybeSingle());
  if(family?.parent_id) {
    const {data:child} = await dbQuery(db.from('children').select('name').eq('id',childId).maybeSingle());
    await dbQuery(db.from('notifications').insert({
      recipient_id: family.parent_id,
      sender_id: currentUser.id,
      type: 'reward_requested',
      title: '🎁 Reward Request!',
      body: `${child?.name||'Your child'} wants to redeem: ${reward.emoji} ${reward.title} (⭐ ${reward.star_cost} stars)`
    }));
    await sendPushToUser(family.parent_id, '🎁 Reward Request!', `${child?.name||'Your child'} wants to redeem: ${reward.title}`);
    // Email parent
    sendTransactionalEmail('reward_requested', {
      parentId: family.parent_id,
      studentName: child?.name || 'Your child',
      rewardTitle: reward.title,
      rewardEmoji: reward.emoji,
      starCost: reward.star_cost
    });
  }

  showToast('🎁 Request sent to your parent!');
  // Refresh the treasure chest view
  const {data:childData} = await dbQuery(db.from('children').select('stars').eq('id',childId).maybeSingle());
  loadStudentRewards(childId, childData?.stars||0);
}

async function approveReward(rewardId,btn) {
  await db.from('rewards').update({status:'approved',approved_at:new Date().toISOString()}).eq('id',rewardId);
  btn.textContent='✓ Approved!';btn.style.background='var(--indigo)';btn.disabled=true;
  showToast('🎉 Reward approved!');
}
function copyInviteCode() { navigator.clipboard.writeText(document.getElementById('familyInviteCode').textContent).then(()=>showToast('📋 Invite code copied!')); }

// ── DYNAMIC INVITE CODES (48h expiry) ──
function randomInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let s = '';
  for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

function expiryLabel(expiresAt) {
  if(!expiresAt) return '';
  const ms = new Date(expiresAt) - new Date();
  if(ms <= 0) return '⚠️ Expired — generate a new one';
  const hrs = Math.floor(ms/3600000);
  const mins = Math.floor((ms%3600000)/60000);
  if(hrs >= 1) return `⏳ Valid for ${hrs}h ${mins}m`;
  return `⏳ Valid for ${mins}m`;
}

async function generateFamilyCode() {
  const btn = document.getElementById('familyGenBtn');
  if(btn){ btn.disabled=true; btn.textContent='Generating…'; }
  if(!currentFamily){ showToast('No family found'); if(btn){btn.disabled=false;btn.textContent='🔑 Generate Invite Code';} return; }
  const code = randomInviteCode();
  const expires = new Date(Date.now() + 48*3600000).toISOString();
  const {error} = await dbQuery(db.from('families').update({invite_code:code, invite_code_expires_at:expires}).eq('id', currentFamily.id));
  if(btn){ btn.disabled=false; btn.textContent='🔄 Generate New Code'; }
  if(error){ showToast('❌ '+error.message); return; }
  currentFamily.invite_code = code;
  currentFamily.invite_code_expires_at = expires;
  document.getElementById('familyInviteCode').textContent = code;
  document.getElementById('familyCodeExpiry').textContent = expiryLabel(expires);
  document.getElementById('familyCodeDisplay').style.display = 'block';
  showToast('🔑 New code generated — valid 48h');
}

async function generateClassCode() {
  const btn = document.getElementById('classGenBtn');
  if(btn){ btn.disabled=true; btn.textContent='Generating…'; }
  if(!selectedClassId){ showToast('Select a class first'); if(btn){btn.disabled=false;btn.textContent='🔑 Generate Invite Code';} return; }
  const code = randomInviteCode();
  const expires = new Date(Date.now() + 48*3600000).toISOString();
  const {error} = await dbQuery(db.from('classes').update({invite_code:code, invite_code_expires_at:expires}).eq('id', selectedClassId));
  if(btn){ btn.disabled=false; btn.textContent='🔄 Generate New Code'; }
  if(error){ showToast('❌ '+error.message); return; }
  const cls = teacherClasses.find(c=>c.id===selectedClassId);
  if(cls){ cls.invite_code = code; cls.invite_code_expires_at = expires; }
  document.getElementById('classInviteCode').textContent = code;
  document.getElementById('classCodeExpiry').textContent = expiryLabel(expires);
  document.getElementById('classCodeDisplay').style.display = 'block';
  showToast('🔑 New class code — valid 48h');
}

// ── ASSIGNMENT FILE UPLOAD ──
let pendingAssignmentFile = null;

function handleAssignmentFile(input) {
  const file = input.files[0];
  if(!file) return;
  pendingAssignmentFile = file;
  const label = document.getElementById('assignmentUploadLabel');
  const zone = document.getElementById('assignmentUploadZone');
  if(label) label.textContent = '📎 ' + file.name;
  if(zone) zone.style.borderColor = 'var(--mint)';
  showToast(`📎 ${file.name} ready`);
  input.value = '';
}

async function uploadAssignmentFile(assignmentId) {
  if(!pendingAssignmentFile) return null;
  const ext = pendingAssignmentFile.name.split('.').pop();
  const path = `${currentUser.id}/${assignmentId}.${ext}`;
  const { data, error } = await db.storage
    .from('assignment-files')
    .upload(path, pendingAssignmentFile, { upsert: true });
  if(error) { console.log('Assignment upload error:', error.message); return null; }
  // Generate signed URL (1 year expiry) for private bucket
  const { data: signedData, error: signedError } = await db.storage
    .from('assignment-files')
    .createSignedUrl(path, 31536000);
  const fileUrl = signedData?.signedUrl || null;
  pendingAssignmentFile = null;
  const label = document.getElementById('assignmentUploadLabel');
  const zone = document.getElementById('assignmentUploadZone');
  if(label) label.textContent = 'Tap to attach file';
  if(zone) zone.style.borderColor = '';
  return fileUrl;
}

// ── PARENT TASK VISIBILITY ──
let taskVisibility = 'private'; // 'private' | 'class'
let selectedTaskStars = 1; // default 1 star

function selectTaskStars(n) {
  selectedTaskStars = n;
  document.querySelectorAll('.star-val-btn').forEach(b => {
    const active = parseInt(b.dataset.val) === n;
    b.style.background = active ? 'var(--amber)' : 'white';
    b.style.color = active ? 'white' : 'var(--gray-500)';
    b.style.borderColor = active ? 'var(--amber)' : 'var(--gray-200)';
  });
}

function setTaskVisibility(mode) {
  taskVisibility = mode;
  const privBtn = document.getElementById('visPrivateBtn');
  const clsBtn = document.getElementById('visClassBtn');
  const wrap = document.getElementById('taskClassPickerWrap');
  const hint = document.getElementById('visHint');
  if(mode === 'private') {
    privBtn.style.background='var(--violet)'; privBtn.style.color='white'; privBtn.style.borderColor='var(--violet)';
    clsBtn.style.background='white'; clsBtn.style.color='var(--gray-500)'; clsBtn.style.borderColor='var(--gray-200)';
    wrap.style.display='none';
    hint.textContent='🔒 Private — home task only, never visible to teachers.';
  } else {
    clsBtn.style.background='var(--violet)'; clsBtn.style.color='white'; clsBtn.style.borderColor='var(--violet)';
    privBtn.style.background='white'; privBtn.style.color='var(--gray-500)'; privBtn.style.borderColor='var(--gray-200)';
    wrap.style.display='block';
    hint.textContent='🏫 Tagged — also appears on the teacher\'s class list (marked added by you).';
  }
}

async function populateTaskClassPicker() {
  const picker = document.getElementById('taskClassPicker');
  if(!picker) return;
  // Determine selected child
  const childSelectEl = document.getElementById('parentTaskChildSelect')?.querySelector('select');
  const childId = childSelectEl?.value || currentChildren?.[0]?.id;
  if(!childId) { picker.innerHTML = '<option value="">No classes — child not enrolled</option>'; return; }
  // Fetch the child's enrolled classes
  const {data:members} = await dbQuery(
    db.from('class_members').select('classes(id, name, subject)').eq('child_id', childId),
    6000, []
  );
  const classes = (members||[]).map(m=>m.classes).filter(Boolean);
  if(!classes.length) {
    picker.innerHTML = '<option value="">No enrolled classes yet</option>';
  } else {
    picker.innerHTML = '<option value="">— Select a class —</option>' +
      classes.map(c => `<option value="${c.id}">${c.name}${c.subject?' — '+c.subject:''}</option>`).join('');
  }
}

async function parentAddTask() {
  const title = document.getElementById('parentTaskTitle').value.trim();
  const subject = document.getElementById('parentTaskSubject').value.trim();
  const due = document.getElementById('parentTaskDue').value;
  const desc = document.getElementById('parentTaskDesc').value.trim();
  if(!title){ showToast('✏️ Add a task title first'); return; }

  // Get selected child
  const childSelectEl = document.getElementById('parentTaskChildSelect')?.querySelector('select');
  const childId = childSelectEl?.value || currentChildren?.[0]?.id;
  if(!childId){ showToast('No child linked yet'); return; }

  // Visibility — private (no class) or tagged to an enrolled class
  let taggedClassId = null;
  if(taskVisibility === 'class') {
    taggedClassId = document.getElementById('taskClassPicker')?.value || '';
    if(!taggedClassId){ showToast('🏫 Pick a class, or switch to Private'); return; }
  }

  // Create assignment
  const {data:assignment, error:aErr} = await dbQuery(
    db.from('assignments').insert({
      created_by: currentUser.id,
      child_id: childId,
      class_id: taggedClassId,            // null = private/home task
      parent_created: true,                // flag so teacher view can mark it
      title, subject: subject||'General',
      description: desc,
      due_date: due||null,
      status: 'active'
    }).select().maybeSingle()
  );
  if(aErr?.message && aErr.message !== 'timeout'){ showToast('❌ Error adding task: '+aErr.message); return; }

  // AI auto-generate steps for parent tasks too
  if(assignment) {
    let parentSteps = [];
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:600,
          system:`Break this homework task into 3-4 simple steps for a student. Return ONLY a raw JSON array. Each: "title" (max 8 words). No markdown.`,
          messages:[{role:'user',content:`Task: "${title}". ${desc}`}]
        })
      });
      const d = await res.json();
      parentSteps = JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim());
    } catch(e) {
      parentSteps = [{title: title}];
    }
    const tasks = parentSteps.map((s,i) => ({
      assignment_id: assignment.id,
      child_id: childId,
      title: s.title||title,
      xp_value: 15, star_value: selectedTaskStars,
      sort_order: i+1,
      verification_required: false
    }));
    await dbQuery(db.from('tasks').insert(tasks));
  }

  const childName = currentChildren.find(c=>c.id===childId)?.name || 'child';
  showToast(taggedClassId ? `✅ Task added & shared with class!` : `✅ Private task added for ${childName}!`);
  document.getElementById('parentTaskTitle').value = '';
  document.getElementById('parentTaskSubject').value = '';
  document.getElementById('parentTaskDesc').value = '';
  document.getElementById('parentTaskDue').value = '';
  setTaskVisibility('private');
  const picker = document.getElementById('taskClassPicker');
  if(picker) picker.value = '';
  // Refresh stats and return to main parent view
  await loadChildStats(childId);
  closeDrawerScreen();
}

// ── Brain Dump ──────────────────────────────────────────────────────────────────

let brainDumpRecognition = null;
let brainDumpListening = false;
let brainDumpTasks = [];

function toggleBrainDumpVoice() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice not supported on this browser — try Chrome');
    return;
  }
  if (brainDumpListening) {
    brainDumpRecognition?.stop();
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  brainDumpRecognition = new SpeechRecognition();
  brainDumpRecognition.continuous = true;
  brainDumpRecognition.interimResults = false;
  brainDumpRecognition.lang = 'en-AU';

  brainDumpRecognition.onstart = function() {
    brainDumpListening = true;
    const btn = document.getElementById('brainDumpVoiceBtn');
    const status = document.getElementById('brainDumpVoiceStatus');
    if(btn) { btn.style.background = '#EF4444'; btn.textContent = '⏹'; }
    if(status) status.style.display = 'block';
  };
  brainDumpRecognition.onresult = function(e) {
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript + ' ';
    }
    const input = document.getElementById('brainDumpInput');
    if(input) input.value = (input.value + ' ' + transcript).trim();
  };
  brainDumpRecognition.onend = function() {
    brainDumpListening = false;
    const btn = document.getElementById('brainDumpVoiceBtn');
    const status = document.getElementById('brainDumpVoiceStatus');
    if(btn) { btn.style.background = 'var(--violet)'; btn.textContent = '🎤'; }
    if(status) status.style.display = 'none';
  };
  brainDumpRecognition.start();
}

async function processBrainDump() {
  const dumpText = document.getElementById('brainDumpInput')?.value.trim();
  if(!dumpText) { showToast('Type something first!'); return; }

  // AI import cap check
  if(!isPro()) {
    const used = currentProfile?.ai_import_count || 0;
    if(used >= 3) { showPaywall('upgrade','Upgrade for unlimited Squirrel requests','Free accounts get 3 Squirrel requests per month. Upgrade to Family Pro for unlimited.'); return; }
  }

  const btn = document.getElementById('brainDumpBtn');
  const hint = document.getElementById('brainDumpHint');
  const results = document.getElementById('brainDumpResults');
  if(btn) { btn.disabled = true; btn.textContent = '🐿️ Squirrel is thinking…'; }
  if(results) results.style.display = 'none';

  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a task organiser for a student. Extract all tasks, assignments and to-dos from the brain dump. Return ONLY a raw JSON array, no markdown, no preamble. Each item: {"title":"short task title","subject":"subject or empty string","due_date":"YYYY-MM-DD or null","notes":"any extra detail or empty string"}. Keep titles under 60 chars.',
        messages: [{role:'user', content:'Today is ' + today + '. Brain dump:\n' + dumpText}]
      })
    });

    const data = await response.json();
    console.log('Brain dump API response:', JSON.stringify(data).substring(0, 300));

    if(!response.ok || data.error) {
      console.error('Brain dump API error:', data.error || data);
      showToast('❌ API error: ' + (data.error?.message || response.status));
      return;
    }

    let text = (data.content?.[0]?.text || '').trim();
    console.log('Brain dump raw text:', text.substring(0, 200));
    // Strip markdown code fences if present
    text = text.replace(/```json|```/g, '').trim();

    try {
      brainDumpTasks = JSON.parse(text);
    } catch(parseErr) {
      console.error('Brain dump JSON parse error:', parseErr, 'text was:', text);
      showToast('❌ Could not parse response — try again');
      return;
    }

    if(!Array.isArray(brainDumpTasks) || !brainDumpTasks.length) {
      showToast('Could not find any tasks — try adding more detail');
      return;
    }

    // Update AI import count
    const newCount = (currentProfile?.ai_import_count || 0) + 1;
    await dbQuery(db.from('profiles').update({ai_import_count: newCount, ai_import_reset_at: currentProfile?.ai_import_reset_at || new Date().toISOString()}).eq('id', currentUser.id));
    if(currentProfile) currentProfile.ai_import_count = newCount;

    // Render tasks
    const list = document.getElementById('brainDumpTaskList');
    if(list) {
      list.innerHTML = brainDumpTasks.map(function(t, i) {
        return '<div style="border:1px solid var(--gray-100);border-radius:10px;padding:12px;margin-bottom:8px;">' +
          '<div style="display:flex;gap:8px;margin-bottom:6px;">' +
            '<input type="checkbox" id="bdCheck' + i + '" checked style="margin-top:3px;cursor:pointer;width:16px;height:16px;">' +
            '<input type="text" value="' + (t.title||'').replace(/"/g,'') + '" id="bdTitle' + i + '" class="form-input" style="flex:1;font-weight:700;">' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<input type="text" value="' + (t.subject||'').replace(/"/g,'') + '" id="bdSubject' + i + '" class="form-input" placeholder="Subject" style="flex:1;">' +
            '<input type="date" value="' + (t.due_date||'') + '" id="bdDue' + i + '" class="form-input" style="flex:1;">' +
          '</div>' +
          (t.notes ? '<div style="font-size:11px;color:var(--gray-400);margin-top:4px;">' + t.notes + '</div>' : '') +
        '</div>';
      }).join('');
    }

    if(results) results.style.display = 'block';
    results?.scrollIntoView({behavior:'smooth', block:'start'});
    showToast('🐿️ Squirrel found ' + brainDumpTasks.length + ' tasks!');

  } catch(e) {
    showToast('❌ Could not process — try again');
    console.error('Brain dump error:', e);
  } finally {
    if(btn) { btn.disabled = false; btn.textContent = '🐿️ Squirrel, sort this!'; }
  }
}

async function saveBrainDumpTasks() {
  if(!brainDumpTasks.length) return;
  const childId = currentChildRecord?.id;
  if(!childId) { showToast('No student record found'); return; }

  let saved = 0;
  for(let i = 0; i < brainDumpTasks.length; i++) {
    const checked = document.getElementById('bdCheck' + i)?.checked;
    if(!checked) continue;
    const title = document.getElementById('bdTitle' + i)?.value.trim();
    const subject = document.getElementById('bdSubject' + i)?.value.trim();
    const due = document.getElementById('bdDue' + i)?.value || null;
    if(!title) continue;

    await dbQuery(db.from('assignments').insert({
      child_id: childId,
      created_by: currentUser.id,
      title,
      description: subject || null,
      due_date: due,
      status: 'pending',
      parent_created: false
    }), 8000, null);
    saved++;
  }

  showToast('✅ ' + saved + ' task' + (saved !== 1 ? 's' : '') + ' saved!');
  brainDumpTasks = [];
  document.getElementById('brainDumpInput').value = '';
  document.getElementById('brainDumpResults').style.display = 'none';
  closeDrawerScreen();
  await loadStudentAssignments(currentProfile?.age_group);
}

// ── Microsoft Teams OAuth ──────────────────────────────────────────────────────

const MS_CLIENT_ID = '2593af2c-94ef-47ec-aa9a-40de24336aca';
const MS_REDIRECT_URI = 'https://focably.vercel.app';
const MS_SCOPES = ['User.Read', 'EduAssignments.ReadBasic'];

let msalInstance = null;
let msTeamsAccount = null;

function getMsalInstance() {
  if (!msalInstance) {
    msalInstance = new msal.PublicClientApplication({
      auth: {
        clientId: MS_CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: MS_REDIRECT_URI,
      },
      cache: { cacheLocation: 'sessionStorage' }
    });
  }
  return msalInstance;
}

async function connectMicrosoftTeams() {
  const btn = document.getElementById('teamsConnectBtn');
  const status = document.getElementById('teamsConnectionStatus');
  try {
    btn.disabled = true;
    btn.textContent = 'Connecting…';
    const msal = getMsalInstance();
    await msal.initialize();
    const response = await msal.loginPopup({ scopes: MS_SCOPES });
    msTeamsAccount = response.account;
    status.textContent = 'Connected as ' + (msTeamsAccount.name || msTeamsAccount.username);
    btn.textContent = 'Refresh';
    btn.disabled = false;
    const disconnectBtn = document.getElementById('teamsDisconnectBtn');
    if(disconnectBtn) disconnectBtn.style.display = 'block';
    showToast('✅ Microsoft account connected!');
    await loadTeamsAssignments();
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Connect';
    if (e.errorCode !== 'user_cancelled') {
      showToast('❌ Could not connect: ' + (e.message || e.errorCode));
    }
  }
}

function disconnectMicrosoftTeams() {
  msTeamsAccount = null;
  sessionStorage.clear();
  const status = document.getElementById('teamsConnectionStatus');
  const btn = document.getElementById('teamsConnectBtn');
  const disconnectBtn = document.getElementById('teamsDisconnectBtn');
  const listDiv = document.getElementById('teamsAssignmentsList');
  if(status) status.textContent = 'Not connected';
  if(btn) { btn.textContent = 'Connect'; btn.disabled = false; }
  if(disconnectBtn) disconnectBtn.style.display = 'none';
  if(listDiv) listDiv.style.display = 'none';
  showToast('Disconnected from Microsoft');
}

async function loadTeamsAssignments() {
  const status = document.getElementById('teamsConnectionStatus');
  const listDiv = document.getElementById('teamsAssignmentsList');
  const content = document.getElementById('teamsAssignmentsContent');
  if (!msTeamsAccount) return;

  content.innerHTML = '<div style="font-size:12px;color:var(--gray-400);text-align:center;padding:8px;">Loading assignments…</div>';
  listDiv.style.display = 'block';

  try {
    const msal = getMsalInstance();
    await msal.initialize();
    const tokenResponse = await msal.acquireTokenSilent({
      scopes: MS_SCOPES,
      account: msTeamsAccount
    });

    // Fetch assignments from MS Graph Education API
    const resp = await fetch('https://graph.microsoft.com/v1.0/education/me/assignments?$top=20&$orderby=dueDateTime desc', {
      headers: { Authorization: 'Bearer ' + tokenResponse.accessToken }
    });

    if (!resp.ok) throw new Error('Graph API error: ' + resp.status);
    const data = await resp.json();
    const assignments = data.value || [];

    if (!assignments.length) {
      content.innerHTML = '<div style="font-size:12px;color:var(--gray-400);text-align:center;padding:8px;">No assignments found in Teams.</div>';
      return;
    }

    content.innerHTML = assignments.map(function(a) {
      const due = a.dueDateTime ? new Date(a.dueDateTime).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : 'No due date';
      const title = a.displayName || 'Untitled';
      const subject = a.classId ? '' : '';
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px;border-radius:8px;background:white;margin-bottom:6px;border:1px solid #DBEAFE;">' +
        '<div>' +
          '<div style="font-size:13px;font-weight:700;color:var(--indigo);">' + title + '</div>' +
          '<div style="font-size:11px;color:var(--gray-400);">Due: ' + due + '</div>' +
        '</div>' +
        '<button data-title="' + title.replace(/"/g,'') + '" data-due="' + (a.dueDateTime||'') + '" data-desc="' + ((a.instructions?.content||'').replace(/"/g,'').substring(0,200)) + '" onclick="importTeamsAssignment(this.dataset.title, this.dataset.due, this.dataset.desc)" style="padding:5px 12px;border-radius:20px;background:#0078D4;color:white;border:none;font-size:11px;font-weight:700;cursor:pointer;">Import</button>' +
      '</div>';
    }).join('');

  } catch(e) {
    content.innerHTML = '<div style="font-size:12px;color:#EF4444;text-align:center;padding:8px;">Could not load assignments: ' + (e.message||'Unknown error') + '</div>';
  }
}

function importTeamsAssignment(title, dueDateTime, description) {
  // Pre-fill the import confirmation card
  document.getElementById('importTitle').value = title || '';
  document.getElementById('importDue').value = dueDateTime ? new Date(dueDateTime).toISOString().split('T')[0] : '';
  document.getElementById('importDesc').value = description || '';
  document.getElementById('importSubject').value = '';
  document.getElementById('importConfirmCard').style.display = 'block';

  // Show pickers based on role
  const childWrap = document.getElementById('importChildSelectWrap');
  const classWrap = document.getElementById('importClassWrap');
  const role = currentProfile?.role;
  if (childWrap) childWrap.style.display = role === 'parent' ? 'block' : 'none';
  if (classWrap) {
    if (role === 'teacher') {
      classWrap.style.display = 'block';
      // Populate class picker
      const picker = document.getElementById('importClassPicker');
      if(picker && teacherClasses?.length) {
        picker.innerHTML = '<option value="">— Select a class —</option>' +
          teacherClasses.map(c => '<option value="' + c.id + '">' + c.name + ' — ' + (c.subject||'') + '</option>').join('');
        if(selectedClassId) picker.value = selectedClassId;
      }
    } else {
      classWrap.style.display = 'none';
    }
  }

  showToast('✅ Assignment imported — check details below');
  document.getElementById('importConfirmCard').scrollIntoView({behavior:'smooth', block:'start'});
}

// ── Import Assignment functions ──────────────────────────────────────────────

async function parseImportedAssignment() {
  const raw = document.getElementById('importPasteInput').value.trim();
  if(!raw) { showToast('Paste some assignment text first'); return; }

  // ── AI import usage cap ──
  const allowed = await checkAIImportLimit();
  if(!allowed) return;

  const btn = document.getElementById('importParseBtn');
  btn.textContent = '⏳ Extracting…'; btn.disabled = true;

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD for context
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: `Extract assignment details from pasted text. Today's date is ${today}. Return ONLY a raw JSON object with these keys:
- "title": string (assignment name, max 10 words)
- "subject": string (subject/class name, or "" if unclear)
- "due_date": string in YYYY-MM-DD format (or "" if not found)
- "description": string (key instructions, max 60 words, or "")
No markdown, no backticks, no explanation. Just the JSON object.`,
        messages: [{ role: 'user', content: raw }]
      })
    });
    const data = await res.json();
    const parsed = JSON.parse(data.content[0].text.replace(/```json|```/g,'').trim());

    // Increment AI usage counter
    await incrementAIImportCount();

    // Populate confirmation form
    document.getElementById('importTitle').value = parsed.title || '';
    document.getElementById('importSubject').value = parsed.subject || '';
    document.getElementById('importDue').value = parsed.due_date || '';
    document.getElementById('importDesc').value = parsed.description || '';

    // Show role-specific extras
    const role = currentProfile?.role;
    if(role === 'parent') {
      const wrap = document.getElementById('importChildSelectWrap');
      wrap.style.display = 'block';
      if(currentChildren?.length) {
        wrap.innerHTML = `<label class="form-lbl">For which child?</label>
          <select class="form-input" id="importChildPicker">
            ${currentChildren.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select>`;
      }
    }
    if(role === 'teacher' && teacherClasses?.length) {
      const wrap = document.getElementById('importClassWrap');
      const picker = document.getElementById('importClassPicker');
      picker.innerHTML = '<option value="">— Select a class —</option>' +
        teacherClasses.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
      wrap.style.display = 'block';
    }

    document.getElementById('importConfirmCard').style.display = 'block';
    document.getElementById('importConfirmCard').scrollIntoView({behavior:'smooth', block:'start'});
  } catch(e) {
    showToast('❌ Could not parse — try editing the text and retrying');
    console.error('Import parse error:', e);
  } finally {
    btn.textContent = '🐿️ Ask Squirrel'; btn.disabled = false;
  }
}

async function saveImportedAssignment() {
  const title = document.getElementById('importTitle').value.trim();
  const subject = document.getElementById('importSubject').value.trim();
  const due = document.getElementById('importDue').value;
  const desc = document.getElementById('importDesc').value.trim();
  if(!title) { showToast('✏️ Add a title first'); return; }

  const btn = document.getElementById('importSaveBtn');
  btn.textContent = '⏳ Saving…'; btn.disabled = true;

  const role = currentProfile?.role;

  try {
    if(role === 'teacher') {
      // Save as a class assignment
      const classId = document.getElementById('importClassPicker')?.value || '';
      if(!classId) { showToast('Select a class first'); btn.textContent='💾 Save Assignment'; btn.disabled=false; return; }
      const {error} = await dbQuery(
        db.from('assignments').insert({
          created_by: currentUser.id,
          class_id: classId,
          school_id: currentProfile.school_id || null,
          title, description: desc,
          due_date: due || null,
          status: 'active'
        }).select().maybeSingle()
      );
      if(error?.message && error.message !== 'timeout') throw new Error(error.message);
      showToast('✅ Assignment imported!');
      // Refresh teacher view
      if(selectedClassId) selectClass(selectedClassId).catch(()=>{});

    } else {
      // Parent or student — save as private task for child
      let childId = null;
      if(role === 'parent') {
        childId = document.getElementById('importChildPicker')?.value || currentChildren?.[0]?.id;
      } else {
        // Student — get their own child record
        const {data:children} = await dbQuery(db.from('children').select('id').eq('profile_id',currentUser.id).limit(1), 5000, []);
        childId = children?.[0]?.id;
      }
      if(!childId) { showToast('No child account linked yet'); btn.textContent='💾 Save Assignment'; btn.disabled=false; return; }

      const {data:assignment, error} = await dbQuery(
        db.from('assignments').insert({
          created_by: currentUser.id,
          child_id: childId,
          class_id: null,           // private — not visible to teachers
          parent_created: true,
          title, description: desc,
          due_date: due || null,
          status: 'active'
        }).select().maybeSingle()
      );
      if(error?.message && error.message !== 'timeout') throw new Error(error.message);

      // AI-generate steps in background (same as parentAddTask)
      if(assignment) {
        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method:'POST', headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            body: JSON.stringify({
              model:'claude-sonnet-4-20250514', max_tokens:600,
              system:`Break this homework task into 3-4 simple steps for a student. Return ONLY a raw JSON array. Each item: "title" (max 8 words). No markdown.`,
              messages:[{role:'user',content:`Task: "${title}". ${desc}`}]
            })
          });
          const d = await res.json();
          const steps = JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim());
          const stepRows = steps.map((s,i)=>({
            assignment_id: assignment.id,
            child_id: childId,
            title: s.title || s.step || `Step ${i+1}`,
            completed: false,
            verification_required: i === steps.length-1,
            verification_status: 'none',
            star_value: 2,
            xp_value: 15,
            sort_order: i
          }));
          await dbQuery(db.from('tasks').insert(stepRows), 8000, null);
        } catch(e) { console.log('Step gen skipped:', e.message); }
      }

      showToast('✅ Assignment imported!');
      // Refresh student/parent view
      if(role === 'parent') loadParentAssignments().catch(()=>{});
      else loadStudentAssignments(currentProfile.age_group).catch(()=>{});
    }

    // Reset form
    document.getElementById('importPasteInput').value = '';
    document.getElementById('importConfirmCard').style.display = 'none';
    closeDrawerScreen();

  } catch(e) {
    showToast('❌ Error saving: '+e.message);
    console.error('Import save error:', e);
  } finally {
    btn.textContent = '💾 Save Assignment'; btn.disabled = false;
  }
}

// ── End import functions ─────────────────────────────────────────────────────

// ── School setup functions ──────────────────────────────────────────────────

function openSchoolSetup() {
  closeDrawer();
  // If teacher has no school, offer create or join sub-options
  // We'll show a simple choice by opening a mini-screen; for now direct to create
  // (join is available if they have a code from another admin)
  const choice = confirm('Do you want to CREATE a new school?\n\nOK = Create new school\nCancel = Join an existing school with a code');
  if(choice) {
    openDrawerScreen('create-school');
  } else {
    openDrawerScreen('join-school');
  }
}

async function createSchool() {
  const name = document.getElementById('newSchoolName').value.trim();
  if(!name) { showToast('Enter your school name'); return; }

  // ── License gate ──
  const licenseKey = (document.getElementById('newSchoolLicenseKey')?.value || '').trim().toUpperCase();
  if(!licenseKey) { showToast('❌ A license key is required to create a school'); return; }

  // Validate key format FOCABLY-XXXX-XXXX
  if(!/^FOCABLY-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey)) {
    showToast('❌ Invalid key format — should be FOCABLY-XXXX-XXXX');
    return;
  }

  // Check license exists, is unused, and not expired
  const {data:license, error:licError} = await dbQuery(
    db.from('licenses').select('*').eq('key', licenseKey).maybeSingle(),
    8000, null
  );
  if(licError || !license) {
    showToast('❌ License key not found — contact schools@focablyed.com');
    return;
  }
  if(license.school_id) {
    showToast('❌ This license key is already in use');
    return;
  }
  if(license.expires_at && new Date(license.expires_at) < new Date()) {
    showToast('❌ This license key has expired — contact schools@focablyed.com');
    return;
  }

  // ── Create the school ──
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i=0;i<6;i++) code += chars[Math.floor(Math.random()*chars.length)];
  const expires = new Date(Date.now() + 30*24*60*60*1000).toISOString();

  const {data:school, error} = await dbQuery(
    db.from('schools').insert({name, invite_code:code, invite_code_expires_at:expires, subscription_status:'active'}).select().maybeSingle(),
    8000, null
  );
  if(error || !school) { showToast('❌ Error creating school: '+(error?.message||'unknown')); return; }

  // ── Activate license ──
  await dbQuery(
    db.from('licenses').update({school_id: school.id, activated_at: new Date().toISOString()}).eq('key', licenseKey),
    8000, null
  );

  // ── Link this teacher as admin ──
  const {error:profErr} = await dbQuery(
    db.from('profiles').update({school_id:school.id, school_role:'admin'}).eq('id',currentUser.id),
    8000, null
  );
  if(profErr) { showToast('❌ Error linking to school: '+profErr.message); return; }
  currentProfile.school_id = school.id;
  currentProfile.school_role = 'admin';
  currentSchool = school;

  // Update badge
  const badge = document.getElementById('teacherSchoolBadge');
  if(badge) { badge.textContent = '🏫 '+school.name+' (Admin)'; badge.style.display='block'; }
  showToast('✅ School created! Invite code: '+code);
  closeDrawerScreen();
}

async function joinSchool() {
  const code = document.getElementById('schoolCodeInput').value.trim().toUpperCase();
  if(code.length !== 6) { showToast('Enter the 6-character school code'); return; }
  // Look up school by invite code
  const {data:school, error} = await dbQuery(
    db.from('schools').select('*').eq('invite_code',code).maybeSingle(),
    8000, null
  );
  if(error || !school) { showToast('❌ School code not found'); return; }
  // Check expiry
  if(school.invite_code_expires_at && new Date(school.invite_code_expires_at) < new Date()) {
    showToast('❌ This code has expired — ask your admin to generate a new one'); return;
  }
  // Link teacher as member
  const {error:profErr} = await dbQuery(
    db.from('profiles').update({school_id:school.id, school_role:'pending'}).eq('id',currentUser.id),
    8000, null
  );
  if(profErr) { showToast('❌ Error joining school: '+profErr.message); return; }
  currentProfile.school_id = school.id;
  currentProfile.school_role = 'pending';
  currentSchool = school;
  const badge = document.getElementById('teacherSchoolBadge');
  if(badge) { badge.textContent = '⏳ '+school.name+' (Pending Approval)'; badge.style.display='block'; }
  showToast('✅ Request sent! Waiting for admin approval.');
  closeDrawerScreen();
}

// ── End school functions ────────────────────────────────────────────────────

async function joinClass() {
  const code = document.getElementById('classCodeInput').value.trim().toUpperCase();
  if(code.length !== 6) { showToast('Enter the 6-character class code'); return; }

  // Find the class
  const {data:cls} = await db.from('classes').select('*, profiles(full_name)').eq('invite_code', code).maybeSingle();
  if(!cls) { showToast('❌ Class not found — check the code'); return; }
  if(cls.invite_code_expires_at && new Date(cls.invite_code_expires_at) < new Date()){
    showToast('⏰ This class code has expired — ask the teacher for a new one'); return;
  }

  // Students can only join directly if teacher has enabled direct_student_enrol
  if(currentProfile?.role === 'student') {
    if(!cls.direct_student_enrol) {
      showToast('⚠️ Ask your parent to join this class for you'); return;
    }
    // Student joins directly — get their child record
    const {data:childRecord} = await dbQuery(
      db.from('children').select('id').eq('profile_id', currentUser.id).maybeSingle()
    );
    if(!childRecord) { showToast('❌ Could not find your student record'); return; }
    const {data:existing} = await db.from('class_members').select('id').eq('class_id', cls.id).eq('child_id', childRecord.id).maybeSingle();
    if(existing) { showToast('Already in this class!'); return; }
    const {error} = await db.from('class_members').insert({ class_id: cls.id, child_id: childRecord.id });
    if(error) { showToast('❌ Could not join class: ' + error.message); return; }
    showToast(`✅ Joined \${cls.name}!`);
    document.getElementById('classCodeInput').value = '';
    await loadStudentApp();
    return;
  }

  // Use selected child from dropdown or first child (parent flow)
  // ── Paywall gate: parent must be Pro to join a class ──
  if(!isPro()) {
    showPaywall('join_class',
      'Upgrade to connect with teachers',
      'Family Pro lets you link your child to their class and see assignments, progress and proof submissions from their teacher.');
    return;
  }

  const childSelectEl = document.getElementById('joinClassChildId');
  const childId = childSelectEl?.value || currentChildren?.[0]?.id;
  if(!childId) { showToast('No child linked to your account yet'); return; }

  // Check not already in class
  const {data:existing} = await db.from('class_members').select('id').eq('class_id', cls.id).eq('child_id', childId).maybeSingle();
  if(existing) { showToast('Already in this class!'); return; }

  // Add to class
  const {error} = await db.from('class_members').insert({ class_id: cls.id, child_id: childId });
  if(error) { showToast('❌ Could not join class: ' + error.message); return; }

  showToast(`✅ Joined ${cls.name}!`);
  document.getElementById('classCodeInput').value = '';
  await loadJoinedClasses(childId);
}

async function loadJoinedClasses(childId) {
  const {data:memberships} = await db.from('class_members')
    .select('*, classes(id, name, subject, year_group, profiles(full_name))')
    .eq('child_id', childId);

  // Legacy joinedClasses element (student primary view if exists)
  const el = document.getElementById('joinedClasses');
  if(el) {
    if(!memberships?.length) { el.innerHTML=''; return; }
    el.innerHTML = memberships.map(m => '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--gray-50);border-radius:10px;margin-bottom:8px;">' +
      '<div style="font-size:24px;">📚</div>' +
      '<div style="flex:1"><div style="font-weight:700;font-size:13px;">' + m.classes.name + '</div>' +
      '<div style="font-size:11px;color:var(--gray-500);">' + (m.classes.subject||'') + '</div></div>' +
      '<div style="font-size:11px;color:var(--mint);font-weight:600;">✓ Enrolled</div>' +
    '</div>').join('');
  }
}

