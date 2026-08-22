const express=require("express");
const http=require("http");
const path=require("path");
const {Server}=require("socket.io");
const app=express();
const server=http.createServer(app);
const io=new Server(server);
app.use(express.static(path.join(__dirname,"public")));
app.get("/health",(_,res)=>res.json({status:"ok"}));

const prompts=[
"Give the worst excuse for being late.",
"Describe a terrible invention.",
"Explain why the police are at your door.",
"Write a dating profile for a garden gnome.",
"Describe the world's worst superhero.",
"Create a slogan for a terrible restaurant.",
"Explain why you absolutely cannot go to work today.",
"Describe the worst thing to say on a first date."
];
const words=["my","your","the","a","very","extremely","tiny","massive","haunted","suspicious","cat","dog","grandma","boss","neighbour","wizard","dragon","pizza","sandwich","exploded","escaped","danced","screamed","secretly","accidentally","yesterday","because","inside","outside","under","over","with","without","stolen","terrible","beautiful","weird","awkward","illegal","probably","definitely","again","now"];
const rooms=new Map();
const makeCode=()=>{let c;do c=Math.random().toString(36).slice(2,6).toUpperCase();while(rooms.has(c));return c};
const makeTiles=()=>[...words].sort(()=>Math.random()-.5).slice(0,12);
const publicPlayers=r=>Object.fromEntries(Object.entries(r.players).map(([id,p])=>[id,{name:p.name,score:p.score,connected:p.connected}]));
function broadcast(code){const r=rooms.get(code);if(!r)return;io.to(code).emit("state",{phase:r.phase,round:r.round,prompt:r.prompt,players:publicPlayers(r),submissions:r.submissions,scores:Object.fromEntries(Object.entries(r.players).map(([id,p])=>[id,p.score]))})}

io.on("connection",s=>{
 s.on("createRoom",({name},cb)=>{if(!name?.trim())return cb({error:"Enter a name."});const code=makeCode();const r={players:{},spectators:{},host:s.id,phase:"lobby",round:0,prompt:"",submissions:{},votes:{}};r.players[s.id]={name:name.trim().slice(0,24),score:0,connected:true,tiles:[]};rooms.set(code,r);s.join(code);s.data.room=code;cb({ok:true,roomCode:code,playerId:s.id});broadcast(code)});
 s.on("joinRoom",({roomCode,name},cb)=>{const code=(roomCode||"").toUpperCase(),r=rooms.get(code);if(!r)return cb({error:"Room not found."});if(!name?.trim())return cb({error:"Enter a name."});if(Object.keys(r.players).length>=8){r.spectators[s.id]={name:name.trim().slice(0,24)};s.join(code);s.data.room=code;return cb({ok:true,spectator:true,roomCode:code,playerId:s.id})}r.players[s.id]={name:name.trim().slice(0,24),score:0,connected:true,tiles:[]};s.join(code);s.data.room=code;cb({ok:true,roomCode:code,playerId:s.id});broadcast(code)});
 s.on("startRound",({roomCode},cb)=>{const r=rooms.get(roomCode);if(!r)return cb({error:"Room not found."});if(s.id!==r.host)return cb({error:"Only the host can start."});if(Object.keys(r.players).length<3)return cb({error:"At least 3 players are required."});r.round++;r.phase="writing";r.prompt=prompts[Math.floor(Math.random()*prompts.length)];r.submissions={};r.votes={};for(const [id,p] of Object.entries(r.players)){p.tiles=makeTiles();io.to(id).emit("yourTiles",p.tiles)}io.to(roomCode).emit("roundStarted",{prompt:r.prompt,round:r.round});broadcast(roomCode);cb({ok:true})});
 s.on("submit",({roomCode,words:chosen},cb)=>{const r=rooms.get(roomCode),p=r?.players[s.id];if(!p||r.phase!=="writing")return cb({error:"Submission not accepted."});if(!Array.isArray(chosen)||!chosen.length||chosen.length>12||!chosen.every(w=>p.tiles.includes(w)))return cb({error:"Use only your supplied words."});r.submissions[s.id]={name:p.name,words:chosen};if(Object.keys(r.submissions).length===Object.keys(r.players).length){r.phase="voting";io.to(roomCode).emit("allSubmitted")}broadcast(roomCode);cb({ok:true})});
 s.on("vote",({roomCode,target},cb)=>{const r=rooms.get(roomCode);if(!r||r.phase!=="voting"||!r.players[s.id]||s.id===target||!r.submissions[target])return cb({error:"Vote not accepted."});r.votes[s.id]=target;if(Object.keys(r.votes).length===Object.keys(r.players).length){const counts={};Object.values(r.votes).forEach(t=>counts[t]=(counts[t]||0)+1);const winner=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];r.players[winner].score++;r.phase="results";io.to(roomCode).emit("roundWinner",{name:r.players[winner].name,score:r.players[winner].score})}broadcast(roomCode);cb({ok:true})});
 s.on("disconnect",()=>{const code=s.data.room,r=rooms.get(code);if(!r)return;if(r.players[s.id])r.players[s.id].connected=false;delete r.spectators[s.id];if(r.host===s.id){const next=Object.keys(r.players).find(id=>r.players[id].connected);if(next)r.host=next}broadcast(code)});
});
const PORT=Number(process.env.PORT)||10000;
server.listen(PORT,"0.0.0.0",()=>console.log(`Listening on ${PORT}`));