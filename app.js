/* Scootizien careers quiz – entirely client-side, no personal data collected. */
(() => {
  'use strict';
  const data = window.SCOOT_DATA;
  if (!data || data.questions.length !== 60 || data.roles.length !== 6) throw new Error('Scoot quiz data is incomplete.');
  const roleById = Object.fromEntries(data.roles.map(r => [r.id, r]));
  const byRole = Object.fromEntries(data.roles.map(r => [r.id, data.questions.filter(q => q.role === r.id)]));
  const $ = id => document.getElementById(id);
  const screens = ['home', 'quiz', 'tie', 'results'];
  const labels = ['Strongly dislike','Dislike','Unsure','Like','Strongly like'];
  const state = {questions:[], answers:{}, idx:0, minBack:0, match:null, scoreRows:[], originalAttempt:[], tieIds:[]};
  const shuffle = a => {
    const b = [...a];
    for (let i=b.length-1;i>0;i--) {const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
    return b;
  };
  function setScreen(name) {
    for (const s of screens) $('screen-' + s).classList.toggle('active', s === name);
    $('header-state').textContent = ({home:'READY TO BOARD',quiz:'QUIZ IN PROGRESS',tie:'CHOOSE YOUR PATH',results:'YOUR RESULT IS IN'})[name];
    window.scrollTo(0,0);
  }
  // A balanced sample: exactly 3 of the 10 bank items per role = 18 total.
  function start() {
    const selected = data.roles.flatMap(r => shuffle(byRole[r.id]).slice(0,3));
    state.questions = shuffle(selected);
    state.originalAttempt = [...state.questions];
    state.answers={};state.idx=0;state.minBack=0;state.match=null;state.tieIds=[];
    renderQuestion();setScreen('quiz');
  }
  function renderQuestion() {
    const q=state.questions[state.idx];
    if (!q) throw new Error('Question sequence unavailable');
    $('question-count').textContent = `QUESTION ${String(state.idx+1).padStart(2,'0')} / 18`;
    $('progress-fill').style.width = `${(state.idx)/18*100}%`;
    $('progressbar').setAttribute('aria-valuenow', String(state.idx));
    $('question-text').textContent = q.text;
    $('quiz-title').textContent = 'How much would you enjoy...';
    const area = $('answer-options');area.replaceChildren();
    labels.forEach((label,i) => {
      const val=i+1;
      const b=document.createElement('button');b.type='button';
      b.className='answer'+(state.answers[q.id]===val?' selected':'');
      b.setAttribute('role','radio');b.setAttribute('aria-checked',String(state.answers[q.id]===val));
      b.setAttribute('aria-label',`${val}: ${label}`);
      const n=document.createElement('span');n.className='num';n.textContent=val;
      const t=document.createElement('span');t.className='answer-caption';t.textContent=label;
      b.append(n,t);b.addEventListener('click',()=>choose(val));area.append(b);
    });
    $('back-btn').disabled=state.idx<=state.minBack;
    $('next-btn').disabled = !(q.id in state.answers);
    $('next-btn').textContent=state.idx===17?'SEE MY SCOOTIZIEN ↗':'NEXT QUESTION →';
  }
  function choose(val) {
    const q=state.questions[state.idx];state.answers[q.id]=val;renderQuestion();
  }
  function next() {
    const q=state.questions[state.idx];if (!(q.id in state.answers)) return;
    if (state.idx<17){state.idx++;renderQuestion();} else complete();
  }
  function prev() {if(state.idx>state.minBack){state.idx--;renderQuestion();}}
  function scoreCurrent() {
    const rows=data.roles.map(r=>{
      const qs=state.questions.filter(q=>q.role===r.id);
      if(qs.length!==3) throw new Error('Unequal role sampling');
      const total=qs.reduce((sum,q)=>sum+state.answers[q.id],0);
      if(!Number.isFinite(total)) throw new Error('Missing answer');
      return {id:r.id, total, average:total/3, questions:qs};
    });
    return rows.sort((a,b)=>b.total-a.total || data.roles.findIndex(r=>r.id===a.id)-data.roles.findIndex(r=>r.id===b.id));
  }
  function complete() {
    state.scoreRows=scoreCurrent();
    const highest=state.scoreRows[0].total;
    const ties=state.scoreRows.filter(s=>s.total===highest);
    if(ties.length>1){
      state.tieIds=ties.map(r=>r.id);
      showTieChoices(ties);
    }else{state.match=ties[0].id;renderResults();}
  }
  function showTieChoices(ties) {
    const area=$('tie-options');area.replaceChildren();
    for(const item of ties){
      const r=roleById[item.id];
      const button=document.createElement('button');button.type='button';button.className='tie-choice';
      const t=document.createElement('strong');t.textContent=r.name;
      const desc=document.createElement('span');desc.textContent=r.try;
      button.append(t,desc);
      button.addEventListener('click',()=>{state.match=r.id;renderResults();});
      area.append(button);
    }
    setScreen('tie');
  }
  function renderResults() {
    const main=roleById[state.match];
    const mainRow=state.scoreRows.find(s=>s.id===state.match);
    const alt=state.scoreRows.find(s=>s.id!==state.match);
    const altRole=roleById[alt.id];
    $('result-image').src=main.image;
    $('result-image').alt=`Scootizens ${main.mascot} character representing ${main.name}`;
    $('result-mascot').textContent=main.mascot.toUpperCase();
    $('result-title').textContent=main.name;
    $('result-nickname').textContent=main.nickname;
    $('result-summary').textContent=main.summary;
    $('result-about').textContent=main.about;
    const allLow=mainRow.average<3;
    const interests=mainRow.questions.slice().sort((a,b)=>state.answers[b.id]-state.answers[a.id]).slice(0,2);
    $('result-why').textContent=(allLow?'This was your highest relative score among six role pathways. The activities you rated most positively here were: ':'Compared with other pathways, you showed interest in activities such as: ')+interests.map(q=>q.text.replace(/\.$/, '').toLowerCase()).join('; ')+'. These are examples of work covered in the supplied role description. Your score is not a skill or eligibility rating.';
    $('result-score').replaceChildren();
    const strong=document.createElement('strong');strong.textContent=`${mainRow.average.toFixed(2)} / 5`;
    const small=document.createElement('small');small.textContent='YOUR AVERAGE INTEREST RATING';
    $('result-score').append(strong,small);
    $('alternative-image').src=altRole.image;
    $('alternative-image').alt=`${altRole.mascot}, the Scootizens character for ${altRole.name}`;
    $('alternative-title').textContent=altRole.name;
    $('alternative-copy').textContent=`You also rated activities connected to this role at ${alt.average.toFixed(2)} / 5. Overlapping interests are normal because aviation careers share skills and tasks.`;
    $('result-tip').textContent=main.try;
    const roster=$('scootizen-roster-grid');roster.replaceChildren();
    data.roles.forEach(role=>{
      const card=document.createElement('article');
      card.className='scootizen-card'+(role.id===main.id?' is-match':'')+(role.id===altRole.id?' is-alternative':'');
      const portrait=document.createElement('img');portrait.src=role.image;portrait.loading='lazy';
      portrait.alt=`${role.mascot} mascot for Scoot ${role.name}`;
      const details=document.createElement('div');details.className='scootizen-card-details';
      const job=document.createElement('strong');job.textContent=role.name;
      const mascot=document.createElement('span');mascot.textContent=role.mascot;
      details.append(job,mascot);card.append(portrait,details);
      if(role.id===main.id||role.id===altRole.id){
        const flag=document.createElement('span');flag.className='scootizen-card-flag';
        flag.textContent=role.id===main.id?'YOUR MATCH':'ALSO EXPLORE';card.append(flag);
      }
      roster.append(card);
    });
    const scores=$('all-scores');scores.replaceChildren();
    state.scoreRows.forEach(s=>{
      const row=document.createElement('div');row.className='score-row';
      const name=document.createElement('div');name.className='score-name';name.textContent=roleById[s.id].name;
      const track=document.createElement('div');track.className='score-track';
      const fill=document.createElement('div');fill.className='score-fill';fill.style.width=`${s.average/5*100}%`;track.append(fill);
      const value=document.createElement('div');value.className='score-value';value.textContent=`${s.average.toFixed(2)} / 5`;
      row.append(name,track,value);scores.append(row);
    });
    if(state.tieIds.length>1) {
      $('result-why').textContent += ` You had a joint top score and selected ${main.name} in the follow-up preference question; the numeric scores remain tied.`;
    }
    setScreen('results');
  }
  function retake() {
    if(state.questions.length!==18) return start();
    const fixed=state.questions.slice(0,10);
    const previousIDs=new Set(state.questions.map(q=>q.id));
    const tail=[];
    for(const role of data.roles) {
      const fixedCount=fixed.filter(q=>q.role===role.id).length;
      const needed=3-fixedCount;
      if(needed<0) throw new Error('First 10 exceed per-role allocation');
      let candidates=byRole[role.id].filter(q=>!previousIDs.has(q.id));
      if(candidates.length<needed) candidates=byRole[role.id].filter(q=>!fixed.some(f=>f.id===q.id));
      tail.push(...shuffle(candidates).slice(0,needed));
    }
    if(tail.length!==8) throw new Error('Retake sampling count incorrect');
    state.questions=[...fixed,...shuffle(tail)];
    state.answers=Object.fromEntries(fixed.map(q=>[q.id,state.answers[q.id]]));
    state.idx=10;state.minBack=10;state.match=null;state.tieIds=[];
    renderQuestion();setScreen('quiz');
  }
  function copyResult() {
    const role=roleById[state.match];const sc=state.scoreRows.find(s=>s.id===state.match);
    const str=`My Scootizien is ${role.name} (${role.mascot}) — ${role.nickname}! I scored ${sc.average.toFixed(2)}/5 in interest in the sampled work activities. Take the career discovery quiz: https://km-commits-cpu.github.io/Scootizien_Quiz/ (for exploration, not job eligibility).`;
    if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(str).then(()=>temporaryFeedback('copy-btn','COPIED ✓')).catch(()=>fallbackCopy(str));}else fallbackCopy(str);
  }
  function fallbackCopy(str){const ta=document.createElement('textarea');ta.value=str;document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();temporaryFeedback('copy-btn',ok?'COPIED ✓':'COPY NOT SUPPORTED');}
  function temporaryFeedback(id,msg){const b=$(id);const old=b.textContent;b.textContent=msg;setTimeout(()=>b.textContent=old,1800);}
  $('start-btn').addEventListener('click',start);
  $('next-btn').addEventListener('click',next);
  $('back-btn').addEventListener('click',prev);
  $('tie-back').addEventListener('click',()=>{state.idx=17;renderQuestion();setScreen('quiz');});
  $('retake-btn').addEventListener('click',retake);
  $('restart-btn').addEventListener('click',start);
  $('copy-btn').addEventListener('click',copyResult);
  $('home-logo').addEventListener('click',e=>{e.preventDefault();setScreen('home');});
  document.addEventListener('keydown',e=>{
    if(!$('screen-quiz').classList.contains('active')||e.ctrlKey||e.metaKey||e.altKey)return;
    if(/^[1-5]$/.test(e.key)){choose(Number(e.key));}
    else if(e.key==='Enter'&&!$('next-btn').disabled){next();}
  });
  // Testing helpers provide a stable, transparent way to verify sampling/scoring logic.
  window.__SCOOT_QA__ = {start,retake,scoreCurrent,getState:()=>({questions:state.questions.map(q=>({id:q.id,role:q.role})),answers:{...state.answers},idx:state.idx,minBack:state.minBack,match:state.match})};
})();
