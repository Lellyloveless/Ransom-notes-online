const socket=io();let roomCode="",myId="",myTiles=[],chosen=[],timer,seconds=60,state;
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function show(x){["home","lobby","game"].forEach(id=>$(id).classList.toggle("hidden",id!==x))}
function enter(r){if(r.error)return $("error").textContent=r.error;roomCode=r.roomCode;myId=r.playerId;$("roomLabel").textContent=roomCode;show(r.spectator?"game":"lobby");history.replaceState({},'',`?room=${roomCode}`)}
$("create").onclick=()=>socket.emit("createRoom",{name:$("name").value.trim()},enter);
$("join").onclick=()=>socket.emit("joinRoom",{roomCode:$("room").value.trim(),name:$("name").value.trim()},enter);
$("start").onclick=()=>socket.emit("startRound",{roomCode},r=>{if(r.error)$("lobbyMsg").textContent=r.error});
$("copy").onclick=async()=>{await navigator.clipboard.writeText(location.origin+"?room="+roomCode);$("lobbyMsg").textContent="Invite copied!"};
socket.on("yourTiles",t=>{myTiles=t;renderTiles()});
socket.on("state",s=>{state=s;renderPlayers();if(s.phase==="voting")renderSubs()});
socket.on("roundStarted",d=>{show("game");$("round").textContent="ROUND "+d.round;$("prompt").textContent=d.prompt;$("winner").classList.add("hidden");$("submissions").classList.add("hidden");chosen=[];startTimer();renderTiles();renderSentence()});
socket.on("allSubmitted",()=>{$("status").textContent="Everyone submitted — vote!"});
socket.on("roundWinner",d=>{$("winner").classList.remove("hidden");$("winner").innerHTML=`🏆 ${esc(d.name)} WINS!<br><small>${d.score} point(s)</small><button onclick="nextRound()">NEXT ROUND</button>`});
function renderPlayers(){if(!state)return;$("players").innerHTML=Object.entries(state.players).map(([id,p])=>`<div class="player"><span>${esc(p.name)}${id===myId?" (YOU)":""}</span><span>${p.score} pts</span></div>`).join("");if(state.phase==="lobby")$("lobbyMsg").textContent=Object.keys(state.players).length<3?"Waiting for at least 3 players…":"Ready to start!"}
function renderTiles(){$("tiles").innerHTML=myTiles.map((w,i)=>`<button class="tile ${chosen.includes(i)?"used":""}" data-i="${i}">${esc(w)}</button>`).join("");document.querySelectorAll(".tile").forEach(b=>b.onclick=()=>{let i=+b.dataset.i;chosen.includes(i)?chosen=chosen.filter(x=>x!==i):chosen.push(i);renderTiles();renderSentence()})}
function renderSentence(){$("sentence").innerHTML=chosen.length?chosen.map(i=>`<span class="chosen" data-i="${i}">${esc(myTiles[i])}</span>`).join(" "):"<span style='opacity:.5'>Click words to build your sentence…</span>";document.querySelectorAll(".chosen").forEach(x=>x.onclick=()=>{chosen=chosen.filter(i=>i!==+x.dataset.i);renderTiles();renderSentence()})}
$("clear").onclick=()=>{chosen=[];renderTiles();renderSentence()};
$("submit").onclick=()=>{if(!chosen.length)return;$("status").textContent="Submitted!";socket.emit("submit",{roomCode,words:chosen.map(i=>myTiles[i])},r=>{if(r.error)$("status").textContent=r.error})};
function renderSubs(){let subs=state.submissions||{};$("submissions").classList.remove("hidden");$("submissions").innerHTML="<h3>VOTE — PICK ONE</h3>"+Object.entries(subs).map(([id,s])=>`<div class="submission"><div>${s.words.map(esc).join(" ")}</div>${id!==myId?`<button data-id="${id}">VOTE</button>`:"<small>Your submission</small>"}</div>`).join("");document.querySelectorAll(".submission button").forEach(b=>b.onclick=()=>socket.emit("vote",{roomCode,target:b.dataset.id},r=>{$("status").textContent=r.error||"Vote submitted!"}))}
function startTimer(){clearInterval(timer);seconds=60;timer=setInterval(()=>{seconds--;let m=String(Math.floor(seconds/60)).padStart(2,"0"),s=String(seconds%60).padStart(2,"0");$("timer").textContent=m+":"+s;if(seconds<=0)clearInterval(timer)},1000)}
window.nextRound=()=>socket.emit("startRound",{roomCode},r=>{if(r.error)$("status").textContent=r.error});
const q=new URLSearchParams(location.search);if(q.get("room"))$("room").value=q.get("room").toUpperCase();