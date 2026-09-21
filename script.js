const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const categories=['All',...new Set(DYNEX_COMMANDS.map(x=>x[1]))]; let active='All';
const grid=$('#commandGrid'), search=$('#search'), filters=$('#filters');
filters.innerHTML=categories.map(c=>`<button class="filter ${c==='All'?'active':''}" data-cat="${c}">${c}</button>`).join('');
function render(){const q=search.value.trim().toLowerCase();const rows=DYNEX_COMMANDS.filter(([n,c])=>(active==='All'||c===active)&&n.includes(q));grid.innerHTML=rows.map(([n,c])=>`<a class="cmd" href="#commands"><span>/</span>${n}<em>${c}</em></a>`).join('');$('#empty').hidden=rows.length>0;}
filters.addEventListener('click',e=>{const b=e.target.closest('.filter');if(!b)return;active=b.dataset.cat;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));render()}); search.addEventListener('input',render); render();
const clientId='1550980325176246342';
const invite=`https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
['inviteBtn','inviteBtn2'].forEach(id=>{const a=$('#'+id);a.href=invite;a.addEventListener('click',e=>{if(clientId==='YOUR_CLIENT_ID'){e.preventDefault();alert('Set your DYNEX Discord Application Client ID in script.js first.');}})});
$('.menu').addEventListener('click',()=>$('.nav-links').classList.toggle('open'));
$$('.nav-links a').forEach(a=>a.addEventListener('click',()=>$('.nav-links').classList.remove('open')));
