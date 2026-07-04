// ── TEACHER APP ──
let teacherClasses = [];
let selectedClassId = null;
let teacherViewMode = 'assignments';

async function loadTeacherApp() {
  setFooterActive('home');
  showScreen('app');
  appReady = true;
  switchRole('teacher');
  document.getElementById('teacherName').textContent=(currentProfile.full_name||'Teacher')+' 👩‍🏫';
  const navName = document.getElementById('navUserName');
  if(navName) navName.textContent = currentProfile.full_name?.split(' ')[0] || '';

  // Load school if teacher belongs to one
  currentSchool = null;
  if(currentProfile.school_id) {
    const {data:school} = await dbQuery(db.from('schools').select('*').eq('id',currentProfile.school_id).maybeSingle(), 5000, null);
    currentSchool = school || null;
  }
  // Show/update school badge in teacher header
  const schoolBadge = document.getElementById('teacherSchoolBadge');
  if(schoolBadge) {
    schoolBadge.textContent = currentSchool ? '🏫 '+currentSchool.name : '👤 Individual Teacher';
    schoolBadge.style.display = 'block';
  }

  try {
    const {data:classes} = await dbQuery(db.from('classes').select('*').eq('teacher_id',currentUser.id).order('created_at',{ascending:true}), 8000, []);
    teacherClasses = classes || [];
    if(teacherClasses.length) {
      renderClassDropdown();
      document.getElementById('addAnotherClass').style.display='block';
      // Auto-select first class
      document.getElementById('classDropdown').value = teacherClasses[0].id;
      await selectClass(teacherClasses[0].id);
    } else {
      // No classes yet — show create form
      document.getElementById('classSetupCard').style.display='block';
    }
  } catch(e) {
    console.error('loadTeacherApp error:', e.message);
    document.getElementById('classSetupCard').style.display='block';
  }
  loadApprovalQueues().catch(()=>{});
  startNotifPolling();
}

function setTeacherView(mode) {
  teacherViewMode = mode;
  const aView = document.getElementById('teacherAssignmentsView');
  const sView = document.getElementById('teacherStudentsView');
  const sel = document.getElementById('teacherViewSelect');
  if(sel && sel.value !== mode) sel.value = mode;
  if(mode === 'assignments') {
    aView.style.display='block'; sView.style.display='none';
  } else {
    aView.style.display='none'; sView.style.display='block';
  }
}

function renderClassDropdown() {
  const dropdown = document.getElementById('classDropdown');
  if(dropdown) {
    dropdown.innerHTML = teacherClasses.map(c => {
      const subj = classSubjectIfDistinct(c);
      return `<option value="${c.id}">${c.name}${subj?' — '+subj:''} ${c.year_group||''}</option>`;
    }).join('');
    const sel = document.getElementById('classSelector');
    if(sel) sel.style.display='block';
  }
  // Always populate assignment class dropdown
  const assignDropdown = document.getElementById('assignmentClass');
  if(assignDropdown) {
    assignDropdown.innerHTML = '<option value="">— Select class —</option>' + teacherClasses.map(c => {
      const subj = classSubjectIfDistinct(c);
      return `<option value="${c.id}">${c.name}${subj?' — '+subj:''}</option>`;
    }).join('');
  }
}

async function selectClass(classId) {
  if(!classId) return;
  selectedClassId = classId;
  const cls = teacherClasses.find(c => c.id === classId);
  if(!cls) return;

  // Update header
  const clsSubj = classSubjectIfDistinct(cls);
  document.getElementById('teacherSubline').textContent = `${cls.name}${clsSubj?' · '+clsSubj:''} ${cls.year_group||''}`;

  // Show invite code only if a valid (non-expired) one exists
  document.getElementById('classInfo').style.display='block';
  const codeValid = cls.invite_code && cls.invite_code_expires_at && new Date(cls.invite_code_expires_at) > new Date();
  const classCodeDisplay = document.getElementById('classCodeDisplay');
  const classGenBtn = document.getElementById('classGenBtn');
  if(codeValid) {
    document.getElementById('classInviteCode').textContent = cls.invite_code;
    document.getElementById('classCodeExpiry').textContent = expiryLabel(cls.invite_code_expires_at);
    classCodeDisplay.style.display = 'block';
    if(classGenBtn) classGenBtn.textContent = '🔄 Generate New Code';
  } else {
    classCodeDisplay.style.display = 'none';
    if(classGenBtn) classGenBtn.textContent = '🔑 Generate Invite Code';
  }

  // Show class-specific cards
  document.getElementById('classAssignmentsCard').style.display='block';
  document.getElementById('classSetupCard').style.display='none';

  // Load data
  await loadTeacherClassAssignments(classId);
  loadApprovalQueues().catch(()=>{});

  // Get student count
  const {data:members} = await dbQuery(db.from('class_members').select('id').eq('class_id',classId), 5000, []);
  const count = members?.length || 0;
  const countEl = document.getElementById('classStudentCount');
  if(countEl) countEl.textContent = count > 0 ? `${count} student${count!==1?'s':''} enrolled` : 'No students yet — share invite code';
}

async function loadTeacherClassAssignments(classId) {
  // Load assignments for this class with task completion data
  const {data:assignments} = await dbQuery(
    db.from('assignments').select('*, tasks(*), children(name), parent_created').eq('class_id', classId).or('status.eq.active,status.is.null').order('due_date',{ascending:true}),
    8000, []
  );

  const aView = document.getElementById('teacherAssignmentsView');
  const sView = document.getElementById('teacherStudentsView');

  if(!assignments?.length) {
    aView.innerHTML = '<div style="font-size:13px;color:var(--gray-500);text-align:center;padding:16px 0;">No assignments yet — add one below</div>';
    sView.innerHTML = '<div style="font-size:13px;color:var(--gray-500);text-align:center;padding:16px 0;">No assignments yet</div>';
    return;
  }

  // GROUP BY ASSIGNMENT (unique titles — same assignment published to multiple students)
  const currentCls = teacherClasses.find(c => c.id === classId) || null;
  const assignmentGroups = {};
  assignments.forEach(a => {
    const key = a.title + '_' + (a.due_date||'');
    const safeKey = key.replace(/[^a-zA-Z0-9]/g,'_');
    if(!assignmentGroups[safeKey]) assignmentGroups[safeKey] = {title:a.title, due:a.due_date, desc:a.description, key:safeKey, cls: currentCls, parentCreated: !!a.parent_created, instances:[]};
    assignmentGroups[safeKey].instances.push(a);
  });

  // ASSIGNMENT VIEW
  aView.innerHTML = Object.values(assignmentGroups).map(group => {
    const instances = group.instances;
    const totalStudents = instances.length;
    const completedStudents = instances.filter(a => {
      const tasks = a.tasks||[];
      return tasks.length > 0 && tasks.every(t=>t.completed);
    }).length;
    const dueStr = group.due ? new Date(group.due).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'}) : 'No due date';
    const today = new Date();
    const due = group.due ? new Date(group.due) : null;
    const isOverdue = due && due < today;
    const pct = totalStudents ? Math.round((completedStudents/totalStudents)*100) : 0;
    const statusColor = isOverdue ? 'var(--rose)' : pct===100 ? 'var(--mint)' : 'var(--amber)';

    const studentRows = instances.map(a => {
      const tasks = a.tasks||[];
      const done = tasks.filter(t=>t.completed).length;
      const studentPct = tasks.length ? Math.round((done/tasks.length)*100) : 0;
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gray-100);">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-family:'Nunito',sans-serif;font-weight:900;font-size:12px;flex-shrink:0;">${a.children?.name?.charAt(0)||'?'}</div>
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:600;">${a.children?.name||'Student'}</div>
          <div style="background:var(--gray-100);border-radius:10px;height:4px;margin-top:3px;"><div style="background:${studentPct===100?'var(--mint)':'var(--violet)'};border-radius:10px;height:4px;width:${studentPct}%;"></div></div>
        </div>
        <div style="font-size:11px;font-weight:700;color:${studentPct===100?'var(--mint)':'var(--gray-500)'};">${done}/${tasks.length}</div>
      </div>`;
    }).join('');

    const parentBadge = group.parentCreated
      ? `<span style="font-size:10px;font-weight:700;color:var(--violet);background:var(--gray-100);padding:1px 7px;border-radius:20px;margin-left:6px;">👨‍👩‍👧 Added by parent</span>`
      : '';
    const archiveBtn = group.parentCreated
      ? `<span style="font-size:14px;opacity:0.3;" title="Parent-created — managed by the parent">🔒</span>`
      : `<button class="archive-btn" data-archive-key="${group.key}" data-archive-title="${group.title.replace(/"/g,'&quot;')}" data-archive-ids="${instances.map(a=>a.id).join(',')}" onclick="event.stopPropagation();handleArchiveClick(this)" title="Archive assignment">🗄️</button>`;

    return `<div style="border-radius:12px;border:1.5px solid ${group.parentCreated?'var(--gray-100)':'var(--gray-200)'};overflow:hidden;margin-bottom:10px;" id="assignTile-${group.key}">
      <div style="padding:12px;cursor:pointer;background:var(--gray-50);" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;color:var(--indigo);">${group.title}${parentBadge}</div>
            ${group.cls ? `<div style="font-size:11px;font-weight:700;color:var(--violet);margin-top:2px;">📚 ${group.cls.name||group.cls.subject||''}</div>` : ''}
            <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
              <span style="font-size:11px;color:${isOverdue?'var(--rose)':'var(--gray-500)'};">📅 ${dueStr}</span>
              <span style="font-size:11px;font-weight:700;color:${statusColor};">${completedStudents}/${totalStudents} students done</span>
            </div>
          </div>
          <div style="font-size:12px;font-weight:900;color:${statusColor};">${pct}%</div>
          ${archiveBtn}
        </div>
        <div style="background:var(--gray-200);border-radius:10px;height:5px;margin-top:8px;"><div style="background:${statusColor};border-radius:10px;height:5px;width:${pct}%;transition:width 0.6s;"></div></div>
      </div>
      <div style="display:none;padding:10px 12px;">${studentRows}</div>
    </div>`;
  }).join('');

  // STUDENT VIEW — group by student
  const studentMap = {};
  assignments.forEach(a => {
    const name = a.children?.name || 'Unknown';
    if(!studentMap[name]) studentMap[name] = {name, assignments:[]};
    studentMap[name].assignments.push(a);
  });

  sView.innerHTML = Object.values(studentMap).map((student, si) => {
    const totalTasks = student.assignments.flatMap(a=>a.tasks||[]).length;
    const doneTasks = student.assignments.flatMap(a=>a.tasks||[]).filter(t=>t.completed).length;
    const pct = totalTasks ? Math.round((doneTasks/totalTasks)*100) : 0;
    const initial = student.name.charAt(0).toUpperCase();
    const colors = ['#EDE9FE','#ECFDF5','#FFF1F2','#FEF3C7'];
    const tColors = ['var(--violet)','var(--mint)','var(--rose)','var(--amber)'];
    const ci = si % 4;

    // Per-assignment rows for this student
    const today = new Date().toISOString().split('T')[0];
    const assignRows = student.assignments.map(a => {
      const t = a.tasks||[];
      const d = t.filter(x=>x.completed).length;
      const apct = t.length ? Math.round((d/t.length)*100) : 0;
      const overdue = a.due_date && a.due_date < today && apct < 100;
      const col = apct>=100 ? 'var(--mint)' : overdue ? 'var(--rose)' : 'var(--violet)';
      const dueStr = a.due_date ? new Date(a.due_date).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : 'No due date';
      const pend = t.filter(x=>x.verification_status==='pending').length;
      const pendBadge = pend ? `<span style="font-size:10px;font-weight:700;color:var(--amber);background:#FFFBEB;padding:1px 6px;border-radius:20px;margin-left:6px;">⏳ ${pend}</span>` : '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:white;border-radius:9px;margin-bottom:6px;border:1px solid var(--gray-100);">
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:600;color:var(--indigo);">${a.title}${pendBadge}</div>
          <div style="font-size:10px;color:${overdue?'var(--rose)':'var(--gray-500)'};margin:2px 0 4px;">📅 ${dueStr} · ${d}/${t.length} steps</div>
          <div style="background:var(--gray-100);border-radius:10px;height:4px;"><div style="background:${col};border-radius:10px;height:4px;width:${apct}%;"></div></div>
        </div>
        <div style="font-size:11px;font-weight:800;color:${col};min-width:32px;text-align:right;">${apct}%</div>
      </div>`;
    }).join('');

    return `<div style="border-bottom:1px solid var(--gray-100);margin-bottom:4px;">
      <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('.pstu-chev').style.transform=this.nextElementSibling.style.display==='none'?'':'rotate(180deg)'" style="display:flex;align-items:center;gap:10px;padding:10px 0;cursor:pointer;">
        <div style="width:36px;height:36px;border-radius:50%;background:${colors[ci]};color:${tColors[ci]};display:flex;align-items:center;justify-content:center;font-family:'Nunito',sans-serif;font-weight:900;font-size:15px;flex-shrink:0;">${initial}</div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:13px;margin-bottom:3px;">${student.name}</div>
          <div style="background:var(--gray-100);border-radius:10px;height:5px;"><div style="background:${pct===100?'var(--mint)':'var(--violet)'};border-radius:10px;height:5px;width:${pct}%;"></div></div>
        </div>
        <div style="font-size:12px;font-weight:700;color:${pct===100?'var(--mint)':'var(--gray-500)'};">${doneTasks}/${totalTasks}</div>
        <div class="pstu-chev" style="font-size:11px;color:var(--gray-400);transition:transform 0.25s;">▼</div>
      </div>
      <div style="display:none;padding:0 0 12px 46px;">
        ${assignRows || '<div style="font-size:12px;color:var(--gray-400);font-style:italic;padding:4px 0;">No assignments</div>'}
        <button class="nudge-btn" onclick="event.stopPropagation();sendNudge('','${student.name}')" style="margin-top:4px;">Nudge 👋</button>
      </div>
    </div>`;
  }).join('');
}

function showCreateClass() {
  document.getElementById('classSetup').style.display='block';
  // createClassTitle no longer exists (the card uses a static title) — guard so
  // the field-clearing below still runs instead of throwing on a null element
  const titleEl = document.getElementById('createClassTitle');
  if(titleEl) titleEl.textContent='Add a new class';
  document.getElementById('className').value='';
  document.getElementById('classYear').value='';
}

async function createClass() {
  const name=document.getElementById('className').value.trim(),year=document.getElementById('classYear').value.trim();
  if(!name){showToast('Enter a class name');return;}
  const directEnrol = document.getElementById('directEnrolToggle')?.checked || false;
  const isApproved = currentProfile?.school_role === 'admin' || currentProfile?.school_role === 'member';
  // `subject` is still a required column server-side but is no longer a separate
  // field in the UI — mirror the class name into it so nothing else that reads
  // classes.subject breaks.
  const {data,error}=await db.from('classes').insert({teacher_id:currentUser.id,name,subject:name,year_group:year,school_id:currentProfile.school_id||null,direct_student_enrol:isApproved&&directEnrol}).select().maybeSingle();
  if(error){showToast('❌ Error creating class: '+error.message);return;}
  teacherClasses.push(data);
  selectedClassId = data.id;
  renderClassDropdown();
  document.getElementById('classDropdown').value = data.id;
  document.getElementById('classSetup').style.display='none';
  document.getElementById('addAnotherClass').style.display='block';
  selectClass(data.id);
  showToast('✅ Class created!');
}

async function loadClassProgress(classId) {
  const {data:members} = await db.from('class_members').select('*, children(*)').eq('class_id',classId);
  const el=document.getElementById('teacherStudentProgress');
  if(!el) return;  // element was removed in the refactor; guard against null deref
  if(!members?.length){el.innerHTML='<div style="font-size:13px;color:var(--gray-500);text-align:center;padding:12px 0;">No students yet — share your class code!</div>';return;}
  const colors=['#EDE9FE','#ECFDF5','#FFF1F2','#FEF3C7'];
  const textColors=['var(--violet)','var(--mint)','var(--rose)','var(--amber)'];
  el.innerHTML=members.map((m,i)=>{
    const c=m.children; if(!c) return '';
    const trustCfg=trustConfig[c.trust_level||'verify'];
    return `<div class="student-prog-row">
      <div class="s-avatar" style="background:${colors[i%colors.length]};color:${textColors[i%textColors.length]}">${c.name?.charAt(0).toUpperCase()||'?'}</div>
      <div class="s-prog-info"><div class="s-prog-name">${c.name} <span style="font-size:10px;">${trustCfg.label}</span></div><div class="s-prog-track"><div class="s-prog-fill" style="background:${textColors[i%textColors.length]};width:${c.trust_score||0}%"></div></div></div>
      <button class="nudge-btn" onclick="sendNudge('${c.id}','${c.name}')">Nudge 👋</button>
    </div>`;
  }).join('');
}

// ── TEACHER STEP BUILDER ──
let teacherSteps = [];
let aiGeneratedSteps = [];

function addTeacherStep(title='') {
  const id = 'step_' + Date.now() + Math.random().toString(36).substr(2,5);
  teacherSteps.push({id, title, verification_required: false});
  renderTeacherSteps();
}

function removeTeacherStep(id) {
  teacherSteps = teacherSteps.filter(s => s.id !== id);
  renderTeacherSteps();
}

function renderTeacherSteps() {
  const container = document.getElementById('teacherStepsList');
  if(!container) return;
  if(!teacherSteps.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--gray-500);font-style:italic;margin-bottom:8px;">No steps added yet — AI will generate them on publish if left empty</div>';
    return;
  }
  container.innerHTML = teacherSteps.map((s,i) => `
    <div class="step-row-input">
      <div style="width:20px;height:20px;border-radius:50%;background:var(--violet);color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</div>
      <input type="text" value="${s.title}" placeholder="Step ${i+1} description..." 
        oninput="teacherSteps[${i}].title=this.value"
        style="flex:1;padding:9px 12px;border-radius:10px;border:1.5px solid var(--gray-200);font-size:13px;font-family:'Inter',sans-serif;outline:none;">
      <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--gray-500);white-space:nowrap;cursor:pointer;">
        <input type="checkbox" ${s.verification_required?'checked':''} onchange="teacherSteps[${i}].verification_required=this.checked"> 📸
      </label>
      <button class="step-remove-btn" onclick="removeTeacherStep('${s.id}')">×</button>
    </div>`).join('');
}

async function generateTeacherSteps() {
  const title = document.getElementById('aTitle').value.trim();
  const desc = document.getElementById('aDesc').value.trim();
  if(!title) { showToast('Add an assignment title first'); return; }
  const btn = document.getElementById('aiStepsBtn');
  btn.disabled = true; btn.textContent = '⏳ Generating...';
  try {
    const res = await fetch(AI_PROXY_URL, {
      method:'POST', headers:(await aiHeaders()),
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514', max_tokens:1000,
        system:`You help teachers create step-by-step tasks for students with ADHD. Break the assignment into 4-6 clear, achievable steps. Return ONLY a raw JSON array. Each object: "title" (clear action, max 10 words) and "verification_required" (true only for the final submission step). No markdown, no backticks.`,
        messages:[{role:'user',content:`Assignment: "${title}". ${desc?'Instructions: '+desc:''}`}]
      })
    });
    const data = await res.json();
    aiGeneratedSteps = JSON.parse(data.content[0].text.replace(/```json|```/g,'').trim());
    const preview = document.getElementById('aiStepsPreviewList');
    preview.innerHTML = aiGeneratedSteps.map((s,i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--gray-100);font-size:13px;">
        <div style="width:20px;height:20px;border-radius:50%;background:var(--violet);color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</div>
        <div style="flex:1;">${s.title}</div>
        ${s.verification_required?'<span style="font-size:10px;background:var(--amber-light);padding:2px 6px;border-radius:10px;">📸 Proof</span>':''}
      </div>`).join('');
    document.getElementById('aiStepsPreview').style.display = 'block';
  } catch(e) {
    showToast('❌ AI error — add steps manually');
  }
  btn.disabled = false; btn.textContent = '✨ AI Generate';
}

function acceptAISteps() {
  teacherSteps = aiGeneratedSteps.map(s => ({
    id: 'step_'+Date.now()+Math.random().toString(36).substr(2,5),
    title: s.title,
    verification_required: s.verification_required||false
  }));
  document.getElementById('aiStepsPreview').style.display = 'none';
  renderTeacherSteps();
  showToast('✅ AI steps added!');
}

async function publishAssignment() {
  const title=document.getElementById('aTitle').value.trim(),due=document.getElementById('aDue').value,desc=document.getElementById('aDesc').value.trim(),hours=document.getElementById('aHours').value;
  const requireProof=document.getElementById('requireProofToggle').checked;
  if(!title){showToast('✏️ Add a title first');return;}
  const classId = document.getElementById('assignmentClass')?.value || selectedClassId;
  if(!classId||classId===''){showToast('⚠️ Please select a class first!');return;}
  const cls = teacherClasses.find(c=>c.id===classId);
  const {data:members}=await db.from('class_members').select('child_id').eq('class_id',classId);
  if(!members?.length){showToast('No students in class yet');return;}
  const assignments=members.map(m=>({created_by:currentUser.id,class_id:classId,child_id:m.child_id,title,description:desc,due_date:due||null,estimated_hours:hours||null,subject:cls?.subject||'',status:'active'}));
  // Upload file first if one is attached
  let fileUrl = null;
  if(pendingAssignmentFile) {
    const tempId = Date.now().toString();
    fileUrl = await uploadAssignmentFile(tempId);
  }
  // Add file_url to all assignments
  if(fileUrl) assignments.forEach(a => a.file_url = fileUrl);
  const {data:newAssignments,error}=await dbQuery(db.from('assignments').insert(assignments).select());
  if(error?.message&&error.message!=='timeout'){showToast('❌ Error publishing');return;}

  // Create tasks from teacherSteps, AI-generate if none defined
  if(newAssignments?.length) {
    let stepsToCreate = [...teacherSteps];

    // AI auto-generate if no steps defined
    if(!stepsToCreate.length) {
      const title = document.getElementById('aTitle').value.trim();
      const desc = document.getElementById('aDesc').value.trim();
      try {
        const res = await fetch(AI_PROXY_URL, {
          method:'POST', headers:(await aiHeaders()),
          body: JSON.stringify({
            model:'claude-sonnet-4-20250514', max_tokens:800,
            system:`Break this school assignment into 4-5 clear steps for a student. Return ONLY a raw JSON array. Each: "title" (max 10 words) and "verification_required" (true only for final step if proof needed). No markdown.`,
            messages:[{role:'user',content:`Assignment: "${title}". ${desc}`}]
          })
        });
        const d = await res.json();
        stepsToCreate = JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim()).map(s=>({
          id:'auto',title:s.title,verification_required:requireProof&&s.verification_required
        }));
      } catch(e) {
        // Fallback to single step
        stepsToCreate = [{id:'auto',title:'Complete the assignment',verification_required:requireProof}];
      }
    }

    // Create tasks for each student
    const allTasks = newAssignments.flatMap(a =>
      stepsToCreate.map((s,i) => ({
        assignment_id: a.id,
        child_id: a.child_id,
        title: s.title,
        xp_value: 15,
        star_value: 1,
        sort_order: i+1,
        verification_required: s.verification_required||false,
        verification_type: 'either'
      }))
    );
    await dbQuery(db.from('tasks').insert(allTasks));
  }

  showToast(`✅ Published to ${members.length} student${members.length>1?'s':''}!`);
  // Reset form and steps
  document.getElementById('aTitle').value='';
  document.getElementById('aDesc').value='';
  document.getElementById('requireProofToggle').checked=false;
  teacherSteps = [];
  renderTeacherSteps();
  // Return to main teacher view and refresh assignments
  closeDrawerScreen();
  await loadTeacherClassAssignments(selectedClassId);
}

async function sendNudge(childId,childName) {
  const {data:child}=await db.from('children').select('*, families(parent_id)').eq('id',childId).maybeSingle();
  if(child?.families?.parent_id) {
    await db.from('notifications').insert({recipient_id:child.families.parent_id,sender_id:currentUser.id,child_id:childId,type:'nudge',title:'Nudge from teacher',body:`${currentProfile.full_name} sent a nudge about ${childName}'s progress.`});
  }
  showToast(`👋 Nudge sent to ${childName}'s parent!`);
}
function copyClassCode() { navigator.clipboard.writeText(document.getElementById('classInviteCode').textContent).then(()=>showToast('📋 Class code copied!')); }

