const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public"), { setHeaders: (res) => res.setHeader("Cache-Control", "no-store") }));
app.get("/health", (_, res) => res.json({ status: "ok", version: "2.1.0" }));

const prompts = [
  "Give the worst excuse for being late.", "Describe a terrible invention.",
  "Explain why the police are at your door.", "Write a dating profile for a garden gnome.",
  "Describe the world's worst superhero.", "Create a slogan for a terrible restaurant.",
  "Explain why you absolutely cannot go to work today.", "Describe the worst thing to say on a first date.",
  "Explain why you are banned from the local supermarket.", "Write a warning label for a suspicious object.",
  "Describe the worst possible wedding speech.", "Explain what your pet is secretly planning.",
  "Give a terrible solution to a very serious problem.", "Describe your dream job if you had absolutely no qualifications.",
  "Explain why your neighbour has called the police.", "Create an advertisement for something nobody should buy."
];

// Built-in pool. Add as many extra words as you like to custom_words.txt.
const words = [
  "a","about","above","absolutely","accidentally","actually","after","again","against","almost","already","always","am","an","and","angry","another","any","anyone","anything","apparently","are","around","as","at","away","awful","back","bad","barely","be","beautiful","because","been","before","behind","being","believe","best","better","big","bizarre","both","broke","but","by","can","can't","carefully","cat","certainly","cheap","clearly","completely","could","couldn't","crazy","cute","dad","dangerous","day","definitely","deliberately","did","didn't","different","do","does","doesn't","dog","don't","down","dragon","drink","drunk","during","easily","else","enough","even","every","everyone","everything","extremely","famous","fast","finally","find","first","for","from","funny","ghost","girl","give","go","good","got","grandma","grandpa","great","had","has","have","he","he's","haunted","her","here","hers","him","his","honestly","how","I","I'd","I'll","I'm","I've","if","illegal","in","inside","instead","is","isn't","it","it's","just","kind","kitchen","large","last","late","laughing","little","look","lost","love","make","massive","maybe","me","mess","might","more","most","my","myself","never","new","next","nice","no","nobody","not","nothing","now","of","off","old","on","once","one","only","or","other","our","ours","out","outside","over","perfect","perhaps","pizza","please","police","probably","quick","quiet","really","red","restaurant","right","said","same","sandwich","secret","secretly","she","she's","should","silly","since","small","so","some","someone","something","sorry","stolen","strange","suspicious","terrible","than","that","that's","the","their","theirs","them","then","there","there's","these","they","they're","thing","this","those","three","tiny","to","today","together","too","totally","under","until","up","very","was","we","we're","weird","were","what","when","where","which","who","why","will","with","without","woman","work","would","wouldn't","wrong","wow","yes","you","your","yours","yesterday","zombie","wizard","boss","neighbour","friend","monster","hero","villain","baby","bird","cow","horse","hamster","duck","chicken","fish","banana","cake","cheese","coffee","juice","money","car","bus","train","house","garden","bedroom","bathroom","office","school","shop","hospital","castle","forest","beach","moon","sun","rain","snow","fire","water","phone","computer","internet","message","letter","secret","key","door","window","chair","table","shoes","pants","shirt","hat","umbrella","knife","spoon","fork","book","movie","music","song","game","party","birthday","holiday","morning","afternoon","evening","night","tomorrow","soon","later","never","second","third","left","upstairs","downstairs","here","there","everywhere","nowhere","quickly","slowly","loudly","quietly","suddenly","surprisingly","luckily","unfortunately","seriously","obviously","hopefully","immediately","simply","also","still","back","away","apart","through","into","onto","toward","against","between","beside","near","below","although","while","unless","yet","nor","plus","minus","help","stop","run","hide","wait","listen","come","leave","stay","open","close","take","bring","send","call","text","tell","ask","know","think","want","need","like","hate","love","see","hear","feel","smell","taste","break","fix","steal","borrow","buy","sell","pay","win","lose","play","sleep","wake","eat","cook","burn","explode","escape","dance","sing","scream","laugh","cry","smile","wave","fight","kiss","marry","lie","cheat","jump","fall","fly","swim","drive","crash","stuck","early","ready","busy","tired","hungry","thirsty","sick","happy","sad","scared","confused","excited","bored","embarrassed","awkward","normal","fancy","expensive","free","broken","huge","giant","ugly","gross","hot","cold","wet","dry","clean","dirty","empty","full","heavy","light","easy","hard","lucky","unlucky","safe","legal","public","private","unknown","real","fake","magic","cursed","missing","mysterious","horrible","wonderful","brilliant","stupid","genius","ridiculous","important","useless","worst","worse","final","random","special","accidental","emergency","disaster","problem","solution","reason","excuse","plan","idea","story","truth","lie","warning","danger","doctor","teacher","manager","king","queen","prince","princess","pirate","ninja","cowboy","witch","vampire","alien","robot","unicorn","fairy","mermaid","clown","detective","criminal","celebrity","landlord","roommate","stranger","enemy","family","mum","mom","mother","father","brother","sister","uncle","aunt","cousin","kid","child","person","people","stuff","place","home","flat","street","road","pub","bar","cafe","park","station","airport","hotel","prison","church","museum","cinema","mountain","river","sea","space","planet","world","country","city","town","village","bed","sofa","toilet","shower","bath","fridge","oven","microwave","laptop","tablet","camera","television","remote","keyboard","mouse","charger","wallet","keys","bag","box","card","photo","picture","paper","pen","pencil","cup","plate","bowl","bottle","glass","burger","chips","biscuit","chocolate","bread","toast","egg","bacon","sausage","apple","orange","lemon","tea","milk","beer","wine","dinner","breakfast","lunch","snack","van","bike","bicycle","motorbike","taxi","plane","boat","ship","rocket","film","Christmas","Halloween","summer","winter","spring","autumn"
];

function loadCustomWords() {
  try {
    return fs.readFileSync(path.join(__dirname, "custom_words.txt"), "utf8")
      .split(/\r?\n/).map(w => w.trim())
      .filter(w => w && !w.startsWith("#") && w.length <= 30);
  } catch { return []; }
}
function wordPool() { return [...new Set([...words, ...loadCustomWords()])]; }

const rooms = new Map();
const makeCode = () => { let c; do c = Math.random().toString(36).slice(2,6).toUpperCase(); while (rooms.has(c)); return c; };
const makeTiles = () => [...wordPool()].sort(() => Math.random() - .5).slice(0, 100);
const publicPlayers = r => Object.fromEntries(Object.entries(r.players).map(([id,p]) => [id,{name:p.name,score:p.score,connected:p.connected}]));
function broadcast(code) {
  const r = rooms.get(code); if (!r) return;
  io.to(code).emit("state", { phase:r.phase, round:r.round, prompt:r.prompt, host:r.host, players:publicPlayers(r), submissions:r.submissions, scores:Object.fromEntries(Object.entries(r.players).map(([id,p])=>[id,p.score])), roundMinutes:r.roundMinutes, deadline:r.deadline, votes:r.votes });
}
function finishWriting(code) {
  const r=rooms.get(code); if (!r || r.phase!=="writing") return;
  if (r.timer) clearTimeout(r.timer); r.timer=null;
  for (const [id,p] of Object.entries(r.players)) if (!r.submissions[id]) r.submissions[id]={name:p.name,words:p.draft||[],auto:true};
  r.phase="voting"; io.to(code).emit("timeUp"); io.to(code).emit("allSubmitted"); broadcast(code);
}

io.on("connection", s => {
  s.on("createRoom", ({name},cb) => {
    if(!name?.trim()) return cb({error:"Enter a name."});
    const code=makeCode(); const r={players:{},spectators:{},host:s.id,phase:"lobby",round:0,prompt:"",submissions:{},votes:{},roundMinutes:2,deadline:null,timer:null};
    r.players[s.id]={name:name.trim().slice(0,24),score:0,connected:true,tiles:[],draft:[]}; rooms.set(code,r); s.join(code); s.data.room=code; cb({ok:true,roomCode:code,playerId:s.id}); broadcast(code);
  });
  s.on("joinRoom", ({roomCode,name},cb) => {
    const code=(roomCode||"").toUpperCase(),r=rooms.get(code); if(!r) return cb({error:"Room not found."}); if(!name?.trim()) return cb({error:"Enter a name."});
    if(Object.keys(r.players).length>=8){r.spectators[s.id]={name:name.trim().slice(0,24)};s.join(code);s.data.room=code;cb({ok:true,spectator:true,roomCode:code,playerId:s.id});broadcast(code);return;}
    r.players[s.id]={name:name.trim().slice(0,24),score:0,connected:true,tiles:[],draft:[]};s.join(code);s.data.room=code;cb({ok:true,roomCode:code,playerId:s.id});broadcast(code);
  });
  s.on("setRoundTime", ({roomCode,minutes},cb={}) => {const r=rooms.get(roomCode),n=Number(minutes);if(!r)return cb({error:"Room not found."});if(s.id!==r.host)return cb({error:"Only the host can choose the time."});if(!Number.isInteger(n)||n<2||n>10)return cb({error:"Choose between 2 and 10 minutes."});if(r.phase!=="lobby")return cb({error:"Time can only be changed in the lobby."});r.roundMinutes=n;broadcast(roomCode);cb({ok:true});});
  s.on("startRound", ({roomCode},cb={}) => {
    const r=rooms.get(roomCode); if(!r)return cb({error:"Room not found."}); if(s.id!==r.host)return cb({error:"Only the host can start."}); if(Object.keys(r.players).length<3)return cb({error:"At least 3 players are required."});
    r.round++;r.phase="writing";r.prompt=prompts[Math.floor(Math.random()*prompts.length)];r.submissions={};r.votes={};r.deadline=Date.now()+r.roundMinutes*60*1000;
    for(const [id,p] of Object.entries(r.players)){p.tiles=makeTiles();p.draft=[];io.to(id).emit("yourTiles",p.tiles);}
    io.to(roomCode).emit("roundStarted",{prompt:r.prompt,round:r.round,minutes:r.roundMinutes,deadline:r.deadline});broadcast(roomCode);r.timer=setTimeout(()=>finishWriting(roomCode),r.roundMinutes*60*1000);cb({ok:true});
  });
  s.on("updateDraft", ({roomCode,words:chosen},cb={}) => {const r=rooms.get(roomCode),p=r?.players[s.id];if(!p||r.phase!=="writing")return cb({error:"Draft not accepted."});if(!Array.isArray(chosen)||chosen.length>100||!chosen.every(w=>p.tiles.includes(w)))return cb({error:"Use only your supplied words."});p.draft=chosen;cb({ok:true});});
  s.on("submit", ({roomCode,words:chosen},cb={}) => {const r=rooms.get(roomCode),p=r?.players[s.id];if(!p||r.phase!=="writing")return cb({error:"Submission not accepted."});if(!Array.isArray(chosen)||chosen.length>100||!chosen.every(w=>p.tiles.includes(w)))return cb({error:"Use only your supplied words."});p.draft=chosen;r.submissions[s.id]={name:p.name,words:chosen,auto:false};if(Object.keys(r.submissions).length===Object.keys(r.players).length)finishWriting(roomCode);else broadcast(roomCode);cb({ok:true});});
  s.on("vote", ({roomCode,target},cb={}) => {const r=rooms.get(roomCode);if(!r||r.phase!=="voting"||!r.players[s.id]||s.id===target||!r.submissions[target])return cb({error:"Vote not accepted."});if(r.votes[s.id])return cb({error:"You have already voted."});r.votes[s.id]=target;if(Object.keys(r.votes).length===Object.keys(r.players).length){const counts={};Object.values(r.votes).forEach(t=>counts[t]=(counts[t]||0)+1);const max=Math.max(...Object.values(counts));const winners=Object.keys(counts).filter(id=>counts[id]===max);winners.forEach(id=>r.players[id].score++);r.phase="results";io.to(roomCode).emit("roundWinner",{names:winners.map(id=>r.players[id].name),scores:Object.fromEntries(winners.map(id=>[id,r.players[id].score]))});}broadcast(roomCode);cb({ok:true});});
  s.on("disconnect",()=>{const code=s.data.room,r=rooms.get(code);if(!r)return;if(r.players[s.id])r.players[s.id].connected=false;delete r.spectators[s.id];if(r.host===s.id){const next=Object.keys(r.players).find(id=>r.players[id].connected);if(next)r.host=next;}broadcast(code);});
});
const PORT=Number(process.env.PORT)||10000;server.listen(PORT,"0.0.0.0",()=>console.log(`Listening on ${PORT}`));
