/* Shared navigation and editor chrome. Exported artwork keeps its original styles. */
(() => {
  const tools = [
    ['maxcard','Max Card','↗'], ['tierlist','Tier List','▤'], ['team11','Best XI','⚽'],
    ['top10','Top 10','№'], ['shards','Compare Players','⇄'], ['claim','Must Claim','◇'], ['players','New Players','✧']
  ];
  const current = document.body.dataset.tool || 'home';
  const shell = document.getElementById('siteShell');
  if (!shell) return;
  shell.innerHTML = `<a class="fc-skip" href="#fcMain">Skip to content</a><header class="fc-mobile"><a class="fc-logo" href="index.html"><span>ϟ</span> FC VOLT</a><button class="fc-menu-toggle" type="button" aria-expanded="false" aria-controls="fcSidebar">☰ <span>Tools</span></button></header><aside class="fc-sidebar" id="fcSidebar"><a class="fc-logo" href="index.html"><span>ϟ</span> FC VOLT</a><p class="fc-nav-label">CREATOR STUDIO</p><nav aria-label="Main navigation"><a href="index.html" ${current==='home'?'aria-current="page"':''}><i>⌂</i>Home</a><span class="fc-nav-label">YOUR TOOLS</span>${tools.map(([id,name,icon])=>`<a href="${id}.html" ${id===current?'aria-current="page"':''}><i>${icon}</i>${name}</a>`).join('')}</nav><div class="fc-sidebar-foot"><span class="fc-online-dot"></span> Made for FC Mobile<br><small>Create. Download. Share.</small></div></aside>`;
  const toggle = shell.querySelector('.fc-menu-toggle');
  toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));document.body.classList.toggle('fc-menu-open',open);};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){toggle.setAttribute('aria-expanded','false');document.body.classList.remove('fc-menu-open');}});
  const main = document.querySelector('main'); if(main) main.id ||= 'fcMain';
  if(main?.id!=='fcMain') shell.querySelector('.fc-skip').href='#'+main.id;
  // Preserve button nodes, IDs and attached handlers when grouping secondary actions.
  document.querySelectorAll('.toolbar > .actions,.toolbar > .top-actions,.top-header > .top-actions').forEach(group=>{
    if(current==='maxcard')return;
    const buttons=[...group.children].filter(el=>el.tagName==='BUTTON');
    const primary=buttons.filter(b=> /export.*png|export.*image|download.*png|add player/i.test(b.textContent));
    const secondary=buttons.filter(b=>!primary.includes(b));
    if(!secondary.length)return;
    const details=document.createElement('details');details.className='fc-more-actions';const summary=document.createElement('summary');summary.textContent='More options';details.append(summary);
    const content=document.createElement('div');content.className='fc-more-content';secondary.forEach(b=>content.append(b));content.addEventListener('click',e=>{if(e.target.closest('button'))details.open=false;});details.append(content);group.append(details);
  });
  // Keep detailed display styling available while putting the editor task first.
  document.querySelectorAll('.controls-bar,.subbar').forEach(section=>{
    const detail=document.createElement('details');detail.className='fc-customize';
    const summary=document.createElement('summary');summary.textContent=current==='team11'?'Formation, title & appearance':'Title & appearance';
    section.before(detail);detail.append(summary,section);
    // Keep only the title and formation in the first view of the squad editor.
    if(current==='team11'){
      detail.open=true;const groups=[...section.querySelectorAll(':scope > .control-group')];
      const advanced=document.createElement('details');advanced.className='fc-inline-settings';
      const heading=document.createElement('summary');heading.textContent='Appearance & card settings';advanced.append(heading);
      const content=document.createElement('div');groups.slice(2).forEach(g=>content.append(g));advanced.append(content);section.append(advanced);
    }
  });
  document.querySelectorAll('.sidebar > .panel-card,.editor-panel > .panel-card').forEach(panel=>{
    const heading=panel.querySelector('.panel-title');
    if(!heading||!/presets|background|layout/i.test(heading.textContent))return;
    const details=document.createElement('details');details.className='fc-panel-settings';
    const summary=document.createElement('summary');summary.textContent=heading.textContent.trim();heading.hidden=true;
    panel.before(details);details.append(summary,panel);
  });
})();
