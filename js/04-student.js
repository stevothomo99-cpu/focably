// ── STUDENT APP ──
async function loadStudentApp(knownChild) {
  setFooterActive('home');
  isNavigating = true;
  appReady = true;
  showScreen('app');
  switchRole('student');
  const age=currentProfile.age_group, theme=currentProfile.theme||'fantasy';
  const firstName = currentProfile.full_name?.split(' ')[0] || '';
  const avatar = currentProfile.avatar || (age==='primary' ? '🧙' : '🎓');
  // Set nav user name for all roles
  const navName = document.getElementById('navUserName');
  if(navName) navName.textContent = firstName;
  // Hide both mode panels — loadStudentAssignments will reveal the correct one
  document.getElementById('primary-mode').style.display='none';
  document.getElementById('hs-mode').style.display='none';
  document.getElementById('linkAccountCard').style.display='none';
  if(age==='primary'){
    applyTheme(theme);
    // Set avatar as heroEmoji for primary
    const heroEl = document.getElementById('heroEmoji');
    if(heroEl) heroEl.textContent = avatar;
  } else {
    document.getElementById('hsName').textContent=`Hey, ${firstName}! 👋`;
    // Set avatar in HS header — photo or emoji
    const hsAvatarEl = document.getElementById('hsAvatar');
    if(hsAvatarEl) {
      if(currentProfile.avatar_photo) {
        hsAvatarEl.innerHTML='';
        const img = document.createElement('img');
        img.src = currentProfile.avatar_photo;
        img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%;';
        hsAvatarEl.appendChild(img);
      } else {
        hsAvatarEl.innerHTML='';
        hsAvatarEl.style.fontSize='40px';
        hsAvatarEl.textContent = avatar;
      }
    }
    // Apply saved HS theme — save to Supabase if no theme set yet
    const hsTheme = currentProfile.theme && HS_THEMES[currentProfile.theme] ? currentProfile.theme : 'vanilla';
    const shouldSave = !currentProfile.theme || !HS_THEMES[currentProfile.theme];
    applyHSTheme(hsTheme, shouldSave);
  }
  isNavigating = false;
  // Load assignments — pass knownChild to skip DB query if we just linked
  loadStudentAssignments(age, knownChild).catch(e => console.log('Assignment load error:', e.message));
  requestNotificationPermission();
  startNotifPolling();
}

async function loadStudentAssignments(ageGroup, knownChild) {
  // Safety check — if no age group yet send to onboarding
  if(!ageGroup) { showScreen('onboarding'); return; }
  console.log('loadStudentAssignments: fetching child for user', currentUser.id);
  // If we already have the child record (e.g. just linked), skip the DB query
  let child = knownChild || null;
  if(!child) {
    const {data:children} = await dbQuery(db.from('children').select('*').eq('profile_id',currentUser.id).order('created_at',{ascending:false}).limit(1), 8000, []);
    child = children?.[0] || currentChildRecord || null;
  }
  console.log('loadStudentAssignments: child=', child);
  if(!child) {
    console.log('loadStudentAssignments: no child found — showing link card');
    currentChildRecord = null;
    document.getElementById('linkAccountCard').style.display='block';
    document.getElementById('primary-mode').style.display='none';
    // For HS students, show the hs-mode header (greeting + XP ring) so they see their name,
    // but clear any class tiles so it doesn't look broken
    if(ageGroup==='highschool') {
      document.getElementById('hs-mode').style.display='block';
      document.getElementById('hsClassTilesContainer').innerHTML='';
    } else {
      document.getElementById('hs-mode').style.display='none';
    }
    return;
  }
  currentChildRecord = child; // store for hamburger menu family link check
  document.getElementById('linkAccountCard').style.display='none';
  updateTrustDisplay(child, ageGroup==='primary'?'':'hs');
  if(ageGroup==='primary'){document.getElementById('primary-mode').style.display='block';}
  else{document.getElementById('hs-mode').style.display='block';}
  // Fetch assignments
  const {data:rawAssignments} = await dbQuery(
    db.from('assignments').select('*').eq('child_id',child.id).eq('status','active').order('due_date',{ascending:true}),
    8000, []
  );
  console.log('Raw assignments:', rawAssignments?.length);

  // Fetch tasks for these assignments
  const assignmentIds = (rawAssignments||[]).map(a=>a.id);
  const {data:allTasks} = assignmentIds.length ? await dbQuery(
    db.from('tasks').select('*').in('assignment_id', assignmentIds),
    8000, []
  ) : {data:[]};

  // Fetch class details for assignments that have a class_id
  const classIds = [...new Set((rawAssignments||[]).filter(a=>a.class_id).map(a=>a.class_id))];
  const {data:classData} = classIds.length ? await dbQuery(
    db.from('classes').select('id, name, subject, year_group, teacher_id').in('id', classIds),
    8000, []
  ) : {data:[]};

  // Fetch teacher names
  const teacherIds = [...new Set((classData||[]).map(c=>c.teacher_id))];
  const {data:teacherData} = teacherIds.length ? await dbQuery(
    db.from('profiles').select('id, full_name').in('id', teacherIds),
    8000, []
  ) : {data:[]};

  // Combine everything
  const assignments = (rawAssignments||[]).map(a => {
    const tasks = (allTasks||[]).filter(t=>t.assignment_id===a.id);
    const cls = (classData||[]).find(c=>c.id===a.class_id);
    const teacher = cls ? (teacherData||[]).find(t=>t.id===cls.teacher_id) : null;
    return {
      ...a,
      tasks,
      classes: cls ? {...cls, profiles: teacher ? {full_name: teacher.full_name} : null} : null
    };
  });
  console.log('Assignments built:', assignments?.length, 'tasks total:', allTasks?.length);
  if(ageGroup==='primary') renderPrimaryAssignments(assignments||[],child);
  else renderHSAssignments(assignments||[],child);
}

function updateTrustDisplay(child, prefix='') {
  const score = child.trust_score || 0;
  const level = child.trust_level || 'verify';
  const cfg = trustConfig[level];
  const pEl = document.getElementById(prefix+'trustBadge');
  const sEl = document.getElementById(prefix+'trustScoreNum');
  const bEl = document.getElementById(prefix+'trustBarFill');
  const lEl = document.getElementById(prefix+'trustScoreLabel');
  if(pEl){pEl.className='trust-badge '+cfg.cls;pEl.textContent=cfg.label;}
  if(sEl) sEl.textContent=score;
  if(bEl){bEl.style.width=score+'%';bEl.style.background=prefix==='hs'?'var(--hs-trust-bar,'+cfg.color+')':cfg.color;}
  if(lEl) lEl.textContent=cfg.next;
}

function getTileState(assignment) {
  const tasks = assignment.tasks||[];
  const done = tasks.filter(t=>t.completed).length;
  const total = tasks.length;
  if(total && done===total) return 'done';
  if(assignment.due_date) {
    // Compare as local date strings to avoid UTC timezone issues
    const today = new Date();
    const todayStr = today.getFullYear() + '-' +
      String(today.getMonth()+1).padStart(2,'0') + '-' +
      String(today.getDate()).padStart(2,'0');
    const dueStr = assignment.due_date.split('T')[0];
    console.log('Date check:', assignment.title, 'due:', dueStr, 'today:', todayStr, 'overdue:', dueStr <= todayStr);
    if(dueStr <= todayStr) return 'overdue';
    // Days difference
    const due = new Date(dueStr + 'T12:00:00');
    const diffDays = Math.ceil((due - today)/(1000*60*60*24));
    if(diffDays <= 1) return 'overdue';
    if(diffDays <= 7) return 'urgent';
  }
  return done > 0 ? 'good' : 'active';
}

function getTileClass(state) {
  // Returns inline gradient - no CSS classes used
  const gradients = {
    overdue: 'linear-gradient(135deg,#9B1C1C,#DC2626)',
    urgent:  'linear-gradient(135deg,#F59E0B,#F97316)',
    active:  'linear-gradient(135deg,#1E1B4B,#7C3AED)',
    good:    'linear-gradient(135deg,#064E3B,#10B981)',
    done:    'linear-gradient(135deg,#374151,#6B7280)',
  };
  return gradients[state] || gradients.active;
}

function renderClassTiles(assignments, child, containerId, isHS) {
  const container = document.getElementById(containerId);
  if(!container) return;

  if(!assignments.length) {
    container.innerHTML=`<div class="card" style="text-align:center;padding:20px;"><div style="font-size:32px;margin-bottom:8px;">🎉</div><div style="font-weight:700;">No ${isHS?'assignments':'quests'} yet!</div><div style="font-size:13px;color:var(--gray-500);margin-top:4px;">Check back when your teacher adds work.</div></div>`;
    return;
  }

  const icons = ['📐','📖','🔬','🌏','🎨','🏃','🎯','🧪'];

  // State config
  const stateColors = {
    overdue: { tile: 'linear-gradient(135deg,#9B1C1C,#DC2626)', anim: 'glowRed 2s infinite',  label: '⚠️ Overdue' },
    urgent:  { tile: 'linear-gradient(135deg,#F59E0B,#F97316)', anim: 'glowAmber 2s infinite', label: '⏰ Due Soon' },
    active:  { tile: 'linear-gradient(135deg,#1E1B4B,#7C3AED)', anim: 'none',                 label: '📝 In Progress' },
    good:    { tile: 'linear-gradient(135deg,#064E3B,#10B981)', anim: 'none',                 label: '✅ On Track' },
    done:    { tile: 'linear-gradient(135deg,#374151,#6B7280)', anim: 'none',                 label: '✓ Complete' },
  };

  // Assignment row backgrounds — distinct solid-ish colours
  const aRowBg = {
    overdue: 'rgba(153,27,27,0.6)',
    urgent:  'rgba(180,52,3,0.55)',
    active:  'rgba(91,33,182,0.55)',
    good:    'rgba(6,95,70,0.55)',
    done:    'rgba(0,0,0,0.45)',
  };
  // Assignment row text opacity for done state
  const aRowOpacity = { overdue:'1', urgent:'1', active:'1', good:'1', done:'0.6' };

  // Group by class
  const classBuckets = {};
  assignments.forEach(a => {
    const cid = a.class_id || 'noclass';
    if(!classBuckets[cid]) classBuckets[cid] = { cls: a.classes, assignments: [] };
    classBuckets[cid].assignments.push(a);
  });

  container.innerHTML = '<div class="class-tiles">' + Object.entries(classBuckets).map(([classId, bucket], i) => {
    const cls = bucket.cls;
    const className = cls?.name || cls?.subject || '📚 Home Tasks';
    const teacherName = cls?.profiles?.full_name ? 'with ' + cls.profiles.full_name : classId === 'noclass' ? 'Added by parent' : '';
    const openAssignments = bucket.assignments.filter(a => {
      const tasks = a.tasks||[];
      const done = tasks.filter(t=>t.completed).length;
      return tasks.length === 0 || done < tasks.length;
    }).length;

    // Class tile state
    const aStates = bucket.assignments.map(a => getTileState(a));
    const stateOrder = ['overdue','urgent','active','good','done'];
    const classState = stateOrder.find(s => aStates.includes(s)) || 'active';
    console.log('Class:', className, 'state:', classState, 'aStates:', aStates);
    const classCfg = stateColors[classState];

    // Build assignment tiles
    const assignmentTiles = bucket.assignments.map(a => {
      const tasks = a.tasks||[];
      const aDone = tasks.filter(t=>t.completed).length;
      const aTotal = tasks.length;
      const aState = getTileState(a);
      console.log('Assignment:', a.title, 'state:', aState, 'due:', a.due_date, 'tasks:', (a.tasks||[]).length, 'done:', (a.tasks||[]).filter(t=>t.completed).length);
      const aCfg = stateColors[aState];
      const aDue = a.due_date ? new Date(a.due_date).toLocaleDateString('en-AU',{weekday:'short',month:'short',day:'numeric'}) : 'No due date';
      const fileLink = a.file_url ? `<a href="${a.file_url}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;background:rgba(255,255,255,0.2);color:white;font-size:11px;font-weight:700;text-decoration:none;margin-top:5px;">📎 Attachment</a>` : '';
      const descHtml = a.description ? `<div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:3px;line-height:1.4;">${a.description}</div>` : '';

      // Steps inside assignment
      const stepsHtml = aTotal ? tasks.map(task => {
        const isPending = task.verification_status==='pending';
        const isDone = task.completed && (task.verification_status==='approved'||!task.verification_required);
        const isRejected = task.verification_status==='rejected';
        const sCls = isDone?'done':isPending?'pending':isRejected?'rejected':'';
        const gem = isDone?'✓':isPending?'⏳':isRejected?'✗':'';
        const clickFn = !task.verification_required&&!isDone ? `onclick="tileToggleTask('${task.id}',this)"` : '';
        const needsProof = task.verification_required && !isDone && !isPending;

        const proofSection = needsProof ? `
          <div id="proofSection-${task.id}" style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.15);padding-top:8px;">
            <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-bottom:6px;">📸 Upload proof to complete this step</div>
            <div id="proofPreview-${task.id}" style="display:none;margin-bottom:6px;border-radius:8px;overflow:hidden;max-height:120px;"><img id="proofImg-${task.id}" src="" style="width:100%;object-fit:cover;"></div>
            <div id="proofFileName-${task.id}" style="display:none;font-size:11px;color:rgba(255,255,255,0.75);margin-bottom:6px;padding:4px 8px;background:rgba(255,255,255,0.1);border-radius:8px;"></div>
            <div style="display:flex;gap:6px;">
              <button onclick="event.stopPropagation();triggerProofUpload('${task.id}')" style="flex:1;padding:7px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.1);color:white;font-size:12px;font-weight:600;cursor:pointer;" id="proofUploadBtn-${task.id}">📎 Choose File</button>
              <button onclick="event.stopPropagation();submitProof('${task.id}')" style="flex:1;padding:7px;border-radius:10px;border:none;background:var(--mint);color:white;font-size:12px;font-weight:700;cursor:pointer;display:none;" id="proofSubmitBtn-${task.id}">✓ Submit</button>
            </div>
          </div>` : '';

        const rejectionMsg = isRejected ? `<div style="font-size:11px;color:#FCA5A5;margin-top:4px;">❌ ${task.rejection_reason||'Proof rejected — try again'}</div>` : '';
        const pendingMsg = isPending ? `
          <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.15);padding-top:8px;">
            <div style="font-size:11px;color:rgba(245,158,11,0.9);margin-bottom:6px;">⏳ Waiting for approval...</div>
            <button onclick="event.stopPropagation();withdrawProof('${task.id}')" style="padding:5px 12px;border-radius:20px;border:1.5px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.1);color:white;font-size:11px;font-weight:600;cursor:pointer;">↩️ Replace File</button>
          </div>` : '';

        return `<div class="class-tile-step ${sCls}" id="tilestep-${task.id}" ${clickFn} style="${needsProof?'cursor:default;display:block;':''}">
          <div style="display:flex;align-items:center;gap:10px;width:100%;">
            <div class="step-circle">${gem}</div>
            <div style="flex:1;"><div class="step-title">${task.title}</div>${rejectionMsg}${pendingMsg}</div>
            ${task.verification_required?'<span class="step-badge">📸</span>':''}
          </div>
          ${proofSection}
        </div>`;
      }).join('') : '<div style="padding:10px 16px;font-size:13px;color:rgba(255,255,255,0.6);">No steps yet</div>';

      return `
        <div style="margin:0 8px 8px;border-radius:12px;overflow:hidden;background:${aRowBg[aState]};border:1.5px solid rgba(255,255,255,0.15);opacity:${aRowOpacity[aState]};">
          <div style="padding:12px 14px;cursor:pointer;" onclick="toggleTile('${a.id}')">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:900;color:white;font-family:'Nunito',sans-serif;${aState==='done'?'text-decoration:line-through;opacity:0.7;':''}">${aState==='done'?'✓ ':''} ${a.title}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:5px;flex-wrap:wrap;">
                  <span style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:20px;font-size:11px;color:white;font-weight:600;">📅 ${aDue}</span>
                  <span style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:20px;font-size:11px;color:white;font-weight:600;" id="acount-${a.id}">${aDone}/${aTotal} steps</span>
                  <span style="background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:20px;font-size:11px;color:white;font-weight:600;">${aCfg.label}</span>
                </div>
                ${descHtml}
                ${fileLink}
              </div>
              <div style="color:rgba(255,255,255,0.6);font-size:16px;flex-shrink:0;" id="chevron-${a.id}">▼</div>
            </div>
          </div>
          <div class="class-tile-steps" id="tilesteps-${a.id}">
            ${stepsHtml}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="class-tile" id="tile-${classId}" style="background:${classCfg.tile};animation:${classCfg.anim};">
        <div class="class-tile-header" onclick="toggleTile('classtile-${classId}')">
          <div class="class-tile-icon">${icons[i%icons.length]}</div>
          <div class="class-tile-info">
            <div class="class-tile-name">${className}</div>
            <div class="class-tile-teacher">${teacherName}</div>
            <div class="class-tile-due" id="classprog-${classId}">${openAssignments} open assignment${openAssignments!==1?'s':''}</div>
          </div>
          <div style="color:rgba(255,255,255,0.7);font-size:18px;" id="chevron-classtile-${classId}">▼</div>
        </div>
        <div class="class-tile-steps" id="tilesteps-classtile-${classId}">
          ${assignmentTiles}
        </div>
      </div>`;
  }).join('') + '</div>';
}


function toggleTile(assignmentId) {
  const steps = document.getElementById('tilesteps-'+assignmentId);
  const chevron = document.getElementById('chevron-'+assignmentId);
  if(!steps) return;
  const isOpen = steps.classList.contains('open');
  steps.classList.toggle('open', !isOpen);
  if(chevron) chevron.textContent = isOpen ? '▼' : '▲';
}

async function tileToggleTask(taskId, el) {
  const step = el.closest('.class-tile-step');
  if(!step || step.classList.contains('done') || step.classList.contains('step-success')) return;
  // Optimistic update with celebration
  celebrateStep(step);
  const {error} = await dbQuery(db.from('tasks').update({completed:true,completed_at:new Date().toISOString()}).eq('id',taskId));
  if(error?.message && error.message !== 'timeout') {
    step.classList.remove('step-success');
    step.classList.remove('done');
    const circle = step.querySelector('.step-circle');
    if(circle) circle.textContent = '';
    showToast('❌ Could not save — try again');
    return;
  }
  // Update tile progress
  updateTileProgress(step);
  // Send notification to parent
  sendCompletionNotification(taskId);
}

function updateTileProgress(stepEl) {
  // Find the parent assignment container
  const assignmentContainer = stepEl.closest('[id^="tilesteps-"]');
  if(!assignmentContainer) return;
  const assignmentId = assignmentContainer.id.replace('tilesteps-','');

  // Count steps in this assignment
  const allSteps = assignmentContainer.querySelectorAll('.class-tile-step');
  const doneSteps = assignmentContainer.querySelectorAll('.class-tile-step.done');
  const total = allSteps.length;
  const done = doneSteps.length;

  // Update assignment row label
  const chevronEl = document.getElementById('chevron-'+assignmentId);
  if(chevronEl) {
    const labelEl = chevronEl.closest('[onclick]')?.querySelector('div:last-of-type span:last-of-type');
  }

  // Find the parent class tile
  const classTile = stepEl.closest('.class-tile');
  if(!classTile) return;
  const classId = classTile.id.replace('tile-','');

  // Recount ALL steps across all assignments in this class tile
  const allClassSteps = classTile.querySelectorAll('.class-tile-step');
  const doneClassSteps = classTile.querySelectorAll('.class-tile-step.done');
  const totalClass = allClassSteps.length;
  const doneClass = doneClassSteps.length;
  const pct = totalClass ? Math.round((doneClass/totalClass)*100) : 0;

  // Update progress bar
  const fillEl = classTile.querySelector('.class-tile-fill');
  if(fillEl) fillEl.style.width = pct + '%';

  // Update label
  const labelEls = classTile.querySelectorAll('.class-tile-label span');
  if(labelEls[0]) labelEls[0].textContent = doneClass + ' of ' + totalClass + ' steps done';
  if(labelEls[1]) labelEls[1].textContent = pct + '%';

  // Update tile header count
  const dueEl = classTile.querySelector('.class-tile-due');
  if(dueEl) dueEl.textContent = doneClass + '/' + totalClass + ' steps complete';

  // Update tile colour based on completion
  // Remove all state classes first then add the right one
  // Colours handled via inline styles
  stateClasses.forEach(c => classTile.classList.remove(c));
  classTile.style.animation = 'none';
  classTile.style.boxShadow = 'none';

  if(doneClass === totalClass && totalClass > 0) {
    classTile.style.background = 'linear-gradient(135deg,#374151,#6B7280)';
    showToast('🏆 Quest complete! Amazing work!');
  } else if(doneClass > 0) {
    classTile.style.background = 'linear-gradient(135deg,#064E3B,#10B981)';
  } else {
    classTile.style.background = 'linear-gradient(135deg,#1E1B4B,#7C3AED)';
  }
}

function updateStepToPending(taskId, proofUrl) {
  const stepEl = document.getElementById('tilestep-'+taskId);
  if(!stepEl) return;

  // Update circle to pending
  const circle = stepEl.querySelector('.step-circle');
  if(circle) circle.textContent = '⏳';

  // Update title
  const title = stepEl.querySelector('.step-title');
  if(title) title.innerHTML = title.textContent.replace('🌟 ','');

  // Add pending class
  stepEl.classList.remove('done','step-success','rejected');
  stepEl.classList.add('pending');

  // Replace proof section with pending message + replace button
  const proofSection = stepEl.querySelector('[id^="proofSection-"]');
  if(proofSection) {
    proofSection.innerHTML = `
      <div style="font-size:11px;color:rgba(245,158,11,0.9);margin-bottom:6px;">⏳ Proof submitted — waiting for approval</div>
      ${proofUrl && proofUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) ?
        `<img src="${proofUrl}" style="width:100%;max-height:100px;object-fit:cover;border-radius:8px;margin-bottom:6px;">` :
        proofUrl ? `<div style="font-size:11px;padding:4px 8px;background:rgba(255,255,255,0.1);border-radius:8px;margin-bottom:6px;">📄 File submitted</div>` : ''
      }
      <button onclick="event.stopPropagation();withdrawProof('${taskId}')" style="padding:5px 12px;border-radius:20px;border:1.5px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.1);color:white;font-size:11px;font-weight:600;cursor:pointer;">↩️ Replace File</button>
    `;
  }
}

async function withdrawProof(taskId) {
  const {error} = await dbQuery(db.from('tasks').update({
    verification_status: 'none',
    proof_url: null,
    proof_filename: null,
    proof_submitted_at: null,
    completed: false
  }).eq('id', taskId));
  if(error?.message && error.message !== 'timeout') {
    showToast('❌ Could not withdraw — try again');
    return;
  }
  showToast('↩️ Proof withdrawn — upload a new file');
  // Update step in place — restore upload UI
  const stepEl = document.getElementById('tilestep-'+taskId);
  if(stepEl) {
    stepEl.classList.remove('pending','done','step-success');
    const circle = stepEl.querySelector('.step-circle');
    if(circle) circle.textContent = '';
    const proofSection = stepEl.querySelector('[id^="proofSection-"]');
    if(proofSection) {
      proofSection.innerHTML = `
        <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-bottom:6px;">📸 Upload proof to complete this step</div>
        <div id="proofPreview-${taskId}" style="display:none;margin-bottom:6px;border-radius:8px;overflow:hidden;max-height:120px;"><img id="proofImg-${taskId}" src="" style="width:100%;object-fit:cover;"></div>
        <div id="proofFileName-${taskId}" style="display:none;font-size:11px;color:rgba(255,255,255,0.75);margin-bottom:6px;padding:4px 8px;background:rgba(255,255,255,0.1);border-radius:8px;"></div>
        <div style="display:flex;gap:6px;">
          <button onclick="event.stopPropagation();triggerProofUpload('${taskId}')" style="flex:1;padding:7px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.1);color:white;font-size:12px;font-weight:600;cursor:pointer;" id="proofUploadBtn-${taskId}">📎 Choose File</button>
          <button onclick="event.stopPropagation();submitProof('${taskId}')" style="flex:1;padding:7px;border-radius:10px;border:none;background:var(--mint);color:white;font-size:12px;font-weight:700;cursor:pointer;display:none;" id="proofSubmitBtn-${taskId}">✓ Submit</button>
        </div>
      `;
    }
  }
}

async function sendCompletionNotification(taskId) {
  try {
    const {data:task} = await dbQuery(db.from('tasks').select('child_id,title').eq('id',taskId).maybeSingle());
    if(!task) return;
    const {data:children} = await dbQuery(db.from('children').select('*, families(parent_id)').eq('id',task.child_id).limit(1));
    const child = children?.[0];
    if(child?.families?.parent_id) {
      const parentId = child.families.parent_id;
      const notifTitle = '⭐ Step completed!';
      const notifBody = `${currentProfile.full_name} completed: "${task.title}"`;
      // Save in-app notification
      await dbQuery(db.from('notifications').insert({
        recipient_id: parentId,
        sender_id: currentUser.id,
        child_id: task.child_id,
        type: 'task_complete',
        title: notifTitle,
        body: notifBody
      }));
      // Send push notification
      await sendPushToUser(parentId, notifTitle, notifBody);
    }
  } catch(e) { console.log('Notification error:', e.message); }
}

function renderPrimaryAssignments(assignments, child) {
  const t = themes[currentProfile.theme||'fantasy'];
  document.getElementById('streakCount').textContent=child.streak||0;
  document.getElementById('starsLabel').textContent=`${child.stars||0} Quest Stars`;
  document.getElementById('chestStarsDisplay').textContent=child.stars>0?'⭐'.repeat(Math.min(child.stars,5))+(child.stars>5?` ×${child.stars}`:''):'No stars yet';
  document.getElementById('chestCount').textContent=`${child.stars||0} stars collected`;
  document.getElementById('chestEmoji').textContent=t.chest;
  renderClassTiles(assignments, child, 'classTilesContainer', false);
  loadStudentRewards(child.id, child.stars||0);
}

function renderQuestStep(task) {
  const isPending = task.verification_status==='pending';
  const isRejected = task.verification_status==='rejected';
  const isDone = task.completed && task.verification_status==='approved';
  const isNoVerify = task.completed && !task.verification_required;
  const cls = isDone||isNoVerify?'done':isPending?'pending':isRejected?'rejected':'';
  const gemContent = isDone||isNoVerify?'✓':isPending?'⏳':isRejected?'✗':'';
  const proofArea = task.verification_required && !isDone && !isNoVerify ? `
    <div class="proof-upload-area ${isPending?'':'visible'}" id="proof-${task.id}" style="${isPending?'display:none':''}">
      <div class="proof-upload-btn" onclick="triggerProofUpload('${task.id}')">📸 Upload Proof (photo or document)</div>
      <div class="proof-preview" id="preview-${task.id}"><img id="previewImg-${task.id}" src="" alt="proof"></div>
      <button class="submit-proof-btn" id="submitProof-${task.id}" onclick="submitProof('${task.id}')">✓ Submit Proof</button>
    </div>` : '';
  const rejectionMsg = isRejected ? `<div class="rejection-msg">❌ Proof rejected: ${task.rejection_reason||'Try again with better proof'}</div>` : '';
  const pendingMsg = isPending ? `<div style="font-size:11px;color:rgba(245,158,11,0.9);margin-top:6px;">⏳ Waiting for approval...</div>` : '';
  const verifyBadge = task.verification_required ? `<span class="step-verify-badge">📸</span>` : '';
  const clickHandler = !task.verification_required&&!isDone ? `onclick="toggleQuestStep('${task.id}',this)"` : '';
  return `<div class="quest-step ${cls}" id="step-${task.id}" ${clickHandler}>
    <div class="step-row"><div class="step-gem">${gemContent}</div><div class="step-text">${task.title}</div>${verifyBadge}<div style="font-size:14px;">⭐</div></div>
    ${proofArea}${rejectionMsg}${pendingMsg}
  </div>`;
}

function renderHSAssignments(assignments, child) {
  document.getElementById('hsStreakCount').textContent=child.streak||0;
  const xp=child.xp||0;
  document.getElementById('xpPts').textContent=`⚡ ${xp} XP`;
  const level=Math.floor(xp/500)+1;
  document.getElementById('xpLevel').textContent=level;
  document.getElementById('xpLevelLabel').textContent=level;
  document.getElementById('xpBarFill').style.width=((xp%500)/500*100)+'%';
  document.getElementById('xpRing').style.strokeDashoffset=163-(163*((xp%500)/500));
  renderClassTiles(assignments, child, 'hsClassTilesContainer', true);
  // HS mode doesn't have a treasure chest but we still load rewards in case they scroll down
  loadStudentRewards(child.id, child.xp||0);
}

function renderHSTask(task) {
  const isPending=task.verification_status==='pending';
  const isRejected=task.verification_status==='rejected';
  const isDone=task.completed&&(task.verification_status==='approved'||!task.verification_required);
  const cls=isDone?'done':isPending?'pending':isRejected?'rejected':'';
  const checkContent=isDone?'✓':isPending?'⏳':isRejected?'✗':'';
  const verifyBadge=task.verification_required?`<span style="font-size:10px;color:var(--amber);font-weight:700;margin-left:4px;">📸</span>`:'';
  const clickHandler=!task.verification_required&&!isDone?`onclick="toggleHSTask('${task.id}',this)"`:'';
  const proofArea=task.verification_required&&!isDone?`
    <div class="hs-proof-area ${isPending?'':'visible'}" id="hsproof-${task.id}" style="${isPending?'display:none':''}">
      <div style="font-size:12px;font-weight:600;color:var(--amber);margin-bottom:6px;">📸 Upload proof to complete this task</div>
      <div style="border:2px dashed var(--amber-light);border-radius:10px;padding:10px;text-align:center;cursor:pointer;font-size:13px;font-weight:600;color:var(--amber);" onclick="triggerProofUpload('${task.id}')">Tap to upload photo or document</div>
      <button style="width:100%;margin-top:8px;padding:9px;border-radius:10px;border:none;background:var(--amber);color:white;font-weight:700;font-size:13px;cursor:pointer;display:none;" id="hsSubmitProof-${task.id}" onclick="submitProof('${task.id}')">✓ Submit Proof</button>
    </div>`:'';
  const rejectionArea=isRejected?`<div class="hs-rejection-area visible">❌ Rejected: ${task.rejection_reason||'Try again with clearer proof'}</div>`:'';
  const pendingArea=isPending?`<div class="hs-proof-area visible" style="background:#FFFBEB;"><div style="font-size:12px;color:var(--amber);font-weight:600;">⏳ Proof submitted — waiting for approval</div></div>`:'';
  return `<div class="hs-task ${cls}" id="hstask-${task.id}">
    <div class="hs-task-row" ${clickHandler}>
      <div class="hs-check">${checkContent}</div>
      <div class="hs-task-text">${task.title}${verifyBadge}</div>
      <div class="hs-task-xp">+${task.xp_value} XP</div>
    </div>
    ${proofArea}${rejectionArea}${pendingArea}
  </div>`;
}

// ── TASK COMPLETION ──
async function toggleQuestStep(taskId, el) {
  const wasDone=el.classList.contains('done');
  if(wasDone) return;
  el.classList.add('done');
  el.querySelector('.step-gem').textContent='✓';
  const {error}=await db.from('tasks').update({completed:true,completed_at:new Date().toISOString(),verification_status:'none'}).eq('id',taskId);
  if(error){el.classList.remove('done');el.querySelector('.step-gem').textContent='';showToast('❌ Could not save');return;}
  showToast('⭐ Step complete!');
}

async function toggleHSTask(taskId, el) {
  const row=el.closest('.hs-task');
  if(!row||row.classList.contains('done')) return;
  row.classList.add('done');
  row.querySelector('.hs-check').textContent='✓';
  const {error}=await db.from('tasks').update({completed:true,completed_at:new Date().toISOString(),verification_status:'none'}).eq('id',taskId);
  if(error){row.classList.remove('done');row.querySelector('.hs-check').textContent='';showToast('❌ Could not save');return;}
  showToast('⚡ Task complete!');
}

// ── PROOF UPLOAD ──
function triggerProofUpload(taskId) {
  currentProofTaskId = taskId;
  document.getElementById('proofFileInput').click();
}

document.getElementById('proofFileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if(!file) return;
  currentProofFile = file;
  const taskId = currentProofTaskId;

  // Show preview for images in tile
  if(file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const prev = document.getElementById('proofPreview-'+taskId);
      const img = document.getElementById('proofImg-'+taskId);
      if(prev&&img) { img.src=ev.target.result; prev.style.display='block'; }
    };
    reader.readAsDataURL(file);
  } else {
    // Show filename for non-images
    const nameEl = document.getElementById('proofFileName-'+taskId);
    if(nameEl) { nameEl.textContent = '📄 ' + file.name; nameEl.style.display='block'; }
  }

  // Show submit button, update upload button label
  const submitBtn = document.getElementById('proofSubmitBtn-'+taskId);
  const uploadBtn = document.getElementById('proofUploadBtn-'+taskId);
  if(submitBtn) submitBtn.style.display='block';
  if(uploadBtn) uploadBtn.textContent = '📎 Change File';

  showToast(`📎 ${file.name} ready`);
  this.value = '';
});

async function submitProof(taskId) {
  if(!currentProofFile) { showToast('Select a file first!'); return; }
  const btn = document.getElementById('submitProof-'+taskId) || document.getElementById('hsSubmitProof-'+taskId);
  if(btn) { btn.disabled=true; btn.textContent='Uploading...'; }
  try {
    const fileExt = currentProofFile.name.split('.').pop();
    const fileName = `${currentUser.id}/${taskId}-${Date.now()}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await db.storage
      .from('task-proofs')
      .upload(fileName, currentProofFile, { upsert: true });
    if(uploadError) throw uploadError;
    const { data: signedProof } = await db.storage.from('task-proofs').createSignedUrl(fileName, 31536000);
    const publicUrl = signedProof?.signedUrl || '';
    await db.from('tasks').update({
      verification_status:'pending',
      proof_url: publicUrl,
      proof_filename: currentProofFile.name,
      proof_submitted_at: new Date().toISOString(),
      completed: false
    }).eq('id', taskId);
    // Notify both parent and teacher
    const {data:task} = await db.from('tasks').select('child_id').eq('id',taskId).maybeSingle();
    if(task) await notifyProofSubmitted(taskId, task.child_id);
    currentProofFile = null;
    showToast('✅ Proof submitted! Waiting for approval.');
    // Update just this step in place — don't reload whole page
    updateStepToPending(taskId, publicUrl);
  } catch(e) {
    if(btn){btn.disabled=false;btn.textContent='✓ Submit Proof';}
    showToast('❌ Upload failed. Try again.');
    console.error(e);
  }
}

function applyTheme(t) {
  const cfg=themes[t]||themes.fantasy;
  document.getElementById('questHeader').style.background=cfg.grad;
  document.getElementById('heroEmoji').textContent=cfg.emoji;
  document.getElementById('heroName').textContent=cfg.name;
  document.getElementById('heroTitle').textContent=cfg.title;
  document.getElementById('chestEmoji').textContent=cfg.chest;
  document.getElementById('aiCardTitle').textContent=cfg.aiTitle;
  document.getElementById('aiCardSub').textContent=cfg.aiSub;
  document.getElementById('aiBtnText').textContent=cfg.aiBtnText;
}

// ── LINK TO FAMILY ──
let linkToFamilyInProgress = false;
async function linkToFamily() {
  // Prevent double-tap duplicates
  if(linkToFamilyInProgress) return;
  linkToFamilyInProgress = true;
  const btn = document.getElementById('linkFamilyBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Linking…'; }

  const code = document.getElementById('inviteCodeInput').value.trim().toUpperCase();
  if(code.length!==6){
    showToast('Enter the 6-character code');
    linkToFamilyInProgress = false;
    if(btn){ btn.disabled = false; btn.textContent = 'Link ✓'; }
    return;
  }
  const {data:family} = await dbQuery(db.from('families').select('*').eq('invite_code',code).maybeSingle(), 8000, null);
  if(!family){
    showToast('❌ Code not found — check with your parent');
    linkToFamilyInProgress = false;
    if(btn){ btn.disabled = false; btn.textContent = 'Link ✓'; }
    return;
  }
  if(family.invite_code_expires_at && new Date(family.invite_code_expires_at) < new Date()){
    showToast('⏰ This code has expired — ask for a new one');
    linkToFamilyInProgress = false;
    if(btn){ btn.disabled = false; btn.textContent = 'Link ✓'; }
    return;
  }
  // Check if this profile is already linked to ANY family
  const {data:existingRows, error:existingErr} = await dbQuery(db.from('children').select('id').eq('profile_id',currentUser.id).limit(1), 5000, null);
  console.log('linkToFamily: existingRows=', existingRows, 'err=', existingErr?.message);
  if(existingRows && existingRows.length > 0){
    showToast('✅ Already linked — loading your app!');
    appReady = true;
    linkToFamilyInProgress = false;
    await new Promise(resolve => setTimeout(resolve, 400));
    await loadStudentApp();
    return;
  }

  // ── Paywall gate: check if family already has a child (2nd child = Pro required) ──
  const {data:familyChildren} = await dbQuery(db.from('children').select('id').eq('family_id',family.id));
  if(familyChildren?.length >= 1) {
    // Load family subscription to check
    const {data:parentFamily} = await dbQuery(db.from('families').select('subscription_status').eq('id',family.id).maybeSingle());
    const subStatus = parentFamily?.subscription_status || 'free';
    if(subStatus !== 'pro' && subStatus !== 'school_attached') {
      showToast('⭐ This family needs Family Pro to add a second child.');
      return;
    }
  }
  const {data:newChild, error} = await db.from('children').insert({
    profile_id: currentUser.id,
    family_id: family.id,
    name: currentProfile.full_name,
    age_group: currentProfile.age_group
  }).select().maybeSingle();
  console.log('linkToFamily: insert result=', newChild, 'error=', error?.message);
  if(error) {
    // Unique constraint violation = already linked (race condition or prior attempt)
    // Treat as success — find their existing row and load the app
    if(error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique')) {
      console.log('linkToFamily: unique constraint hit — already linked, loading app');
      const {data:existingChild} = await dbQuery(db.from('children').select('*').eq('profile_id',currentUser.id).order('created_at',{ascending:false}).limit(1), 5000, null);
      currentChildRecord = existingChild?.[0] || null;
      appReady = true;
      linkToFamilyInProgress = false;
      showToast('✅ Already linked — loading your app!');
      await new Promise(resolve => setTimeout(resolve, 400));
      if(!currentProfile.age_group) { showScreen('onboarding'); } else { await loadStudentApp(); }
      return;
    }
    showToast('❌ Could not link account: ' + error.message);
    linkToFamilyInProgress = false;
    if(btn){ btn.disabled = false; btn.textContent = 'Link ✓'; }
    return;
  }
  // ── Inherit family subscription status onto child's profile ──
  // Covers the case where parent already paid Pro before child joined
  const familySubStatus = family.subscription_status || 'free';
  if(familySubStatus === 'pro' || familySubStatus === 'school_attached') {
    await dbQuery(db.from('profiles').update({subscription_status: familySubStatus}).eq('id', currentUser.id), 5000, null);
    currentProfile.subscription_status = familySubStatus;
    console.log('linkToFamily: inherited subscription_status =', familySubStatus);
  }
  // Set currentChildRecord directly from insert — no need to re-query, avoids propagation race
  currentChildRecord = newChild;
  // Set appReady BEFORE navigating so auth state change can't interrupt
  appReady = true;
  linkToFamilyInProgress = false;
  showToast('✅ Linked to family!');
  await new Promise(resolve => setTimeout(resolve, 400));
  if(!currentProfile.age_group) {
    showScreen('onboarding');
  } else {
    await loadStudentApp(newChild);
  }
}

