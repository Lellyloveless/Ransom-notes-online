const socket=io();
let roomCode="",myId="",myTiles=[],chosen=[],timer=null,state=null,myVote=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function show(x){["home","lobby","game"].forEach(id=>$(id).classList.toggle("hidden",id!==x));}
function enter(r){if(r.error)return $("error").textContent=r.error;roomCode=r.roomCode;myId=r.playerId;$("roomLabel").textContent=roomCode;show(r.spectator?"game":"lobby");history.replaceState({},"",`?room=${roomCode}`);}
$("create").onclick=()=>socket.emit("createRoom",{name:$("name").value.trim()},enter);
$("join").onclick=()=>socket.emit("joinRoom",{roomCode:$("room").value.trim(),name:$("name").value.trim()},enter);
$("start").onclick=()=>socket.emit("startRound",{roomCode},r=>{if(r.error)$("lobbyMsg").textContent=r.error;});
$("roundTime").onchange=()=>socket.emit("setRoundTime",{roomCode,minutes:+$("roundTime").value},r=>{if(r.error)$("lobbyMsg").textContent=r.error;});
$("copy").onclick=async()=>{await navigator.clipboard.writeText(location.origin+"?room="+roomCode);$("lobbyMsg").textContent="Invite copied!";};
$("clear").onclick=()=>{chosen=[];sendDraft();renderTiles();renderSentence();};
$("submit").onclick=manualSubmit;
function manualSubmit(){if(!chosen.length)return $("status").textContent="Add at least one word first.";$("status").textContent="Submitting…";socket.emit("submit",{roomCode,words:chosen.map(i=>myTiles[i])},r=>{$("status").textContent=r.error||"Submitted! Waiting for everyone…";});}
function sendDraft(){socket.emit("updateDraft",{roomCode,words:chosen.map(i=>myTiles[i])});}
socket.on("yourTiles",t=>{myTiles=t;renderTiles();renderSentence();});
socket.on("state",s=>{state=s;renderPlayers();renderScoreboard();if(s.phase==="voting")renderSubs();if(s.phase==="lobby")setTimeControl();});
socket.on("roundStarted",d=>{$("submit").disabled=false;show("game");myVote=null;$("round").textContent="ROUND "+d.round;$("prompt").textContent=d.prompt;$("winner").classList.add("hidden");$("submissions").classList.add("hidden");$("status").textContent="";chosen=[];startTimer(d.deadline);renderTiles();renderSentence();renderScoreboard();});
socket.on("allSubmitted",()=>{$("status").textContent="Everyone has submitted — vote!";clearInterval(timer);renderSubs();});
socket.on("timeUp",()=>{$("status").textContent="Time's up! Your current note was submitted automatically.";$("submit").disabled=true;clearInterval(timer);renderSubs();});
socket.on("votingStarted", () => {
    window.location.href = "/voting.html";
});
socket.on("roundWinner",d=>{$("winner").classList.remove("hidden");const names=d.names.join(" & ");$("winner").innerHTML=`🏆 ${esc(names)} ${d.names.length===1?"WINS":"WIN"}!<br><small>+1 point${d.names.length===1?"":" each"}</small><button onclick="nextRound()">NEXT ROUND</button>`;renderScoreboard();});
function renderPlayers(){if(!state)return;$("players").innerHTML=Object.entries(state.players).map(([id,p])=>`<div class="player"><span>${esc(p.name)}${id===myId?" (YOU)":""}</span><span>${p.score} pts</span></div>`).join("");if(state.phase==="lobby"){$("lobbyMsg").textContent=Object.keys(state.players).length<3?"Waiting for at least 3 players…":"Ready to start!";$('start').disabled=Object.keys(state.players).length<3;setTimeControl();}}
function renderScoreboard(){if(!state||!$("scoreboard"))return;const rows=Object.entries(state.players).sort((a,b)=>b[1].score-a[1].score);$("scoreboard").innerHTML=rows.map(([id,p],i)=>`<div class="score-row ${id===myId?"me":""}"><span>${i+1}. ${esc(p.name)}</span><strong>${p.score}</strong></div>`).join("");}
function setTimeControl(){if(!state||state.phase!=="lobby")return;const host=state.players[myId];$("roundTime").disabled=!(host&&state.host===myId);if(state.roundMinutes)$("roundTime").value=state.roundMinutes;}
function renderTiles(){$("tiles").innerHTML=myTiles.map((w,i)=>`<button class="tile ${chosen.includes(i)?"used":""}" data-i="${i}">${esc(w)}</button>`).join("");document.querySelectorAll(".tile").forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(chosen.includes(i))chosen=chosen.filter(x=>x!==i);else chosen.push(i);sendDraft();renderTiles();renderSentence();});}
function renderSentence(){$("sentence").innerHTML=chosen.length?chosen.map(i=>`<span class="chosen" data-i="${i}">${esc(myTiles[i])}</span>`).join(" "):"<span style='opacity:.5'>Click words to build your sentence…</span>";document.querySelectorAll(".chosen").forEach(x=>x.onclick=()=>{chosen=chosen.filter(i=>i!==+x.dataset.i);sendDraft();renderTiles();renderSentence();});}
function renderSubs(){
  const subs=state.submissions||{};
  $("submissions").classList.remove("hidden");
  const cards=Object.entries(subs).map(([id,s])=>{
    const text=s.words.length?s.words.map(esc).join(" "):"(No words submitted)";
    let action="";
    if(id===myId) action="<small>Your submission — you cannot vote for yourself.</small>";
    else if(myVote===id) action="<div class='voted-label'>YOUR VOTE</div>";
    else if(myVote) action="<div class='small'>Vote already submitted.</div>";
    else action=`<button class="vote" data-id="${id}">VOTE FOR THIS</button>`;
    return `<div class="submission ${myVote===id?"selected-vote":""}"><div class="note-text">${text}</div>${action}</div>`;
  }).join("");
  $("submissions").innerHTML="<h3>VOTE — PICK YOUR FAVOURITE</h3>"+cards;
  document.querySelectorAll(".vote").forEach(b=>b.onclick=()=>{
    if(myVote)return;
    myVote=b.dataset.id; renderSubs();
    socket.emit("vote",{roomCode,target:myVote},r=>{
      $("status").textContent=r.error||"Vote submitted!";
      if(r.error){myVote=null;renderSubs();}
    });
  });
}
function startTimer(deadline){clearInterval(timer);function tick(){const left=Math.max(0,deadline-Date.now());const total=Math.ceil(left/1000);const m=String(Math.floor(total/60)).padStart(2,"0"),s=String(total%60).padStart(2,"0");$("timer").textContent=`${m}:${s}`;if(total<=0)clearInterval(timer);}tick();timer=setInterval(tick,250);}
window.nextRound=()=>socket.emit("startRound",{roomCode},r=>{if(r.error)$("status").textContent=r.error;});
const q=new URLSearchParams(location.search);if(q.get("room"))$("room").value=q.get("room").toUpperCase();
