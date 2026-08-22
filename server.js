const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res) => res.setHeader("Cache-Control", "no-store"),
  })
);

app.get("/health", (_, res) => res.json({ status: "ok", version: "2.2.1" }));

const prompts = [
  "Give the worst excuse for being late.",
  "Describe a terrible invention.",
  "Explain why the police are at your door.",
  "Write a dating profile for a garden gnome.",
  "Describe the world's worst superhero.",
  "Create a slogan for a terrible restaurant.",
  "Explain why you absolutely cannot go to work today.",
  "Describe the worst thing to say on a first date.",
  "Explain why you are banned from the local supermarket.",
  "Write a warning label for a suspicious object.",
  "Describe the worst possible wedding speech.",
  "Explain what your pet is secretly planning.",
  "Give a terrible solution to a very serious problem.",
  "Describe your dream job if you had absolutely no qualifications.",
  "Explain why your neighbour has called the police.",
  "Create an advertisement for something nobody should buy.",
];

// Built-in pool. Add as many extra words as you like to custom_words.txt.
const words = [
  "a","about","above","absolutely","accidentally","actually","after","again","against","almost","already","always","am","an","and","angry","another","any","anyone","anything","apparently","are","around","as","at","away","awful","back","bad","barely","be","beautiful","because","been","before","behind","being","believe","best","better","big","bizarre","both","broke","but","by","can","can't","carefully","cat","certainly","cheap","clearly","completely","could","couldn't","crazy","cute","dad","dangerous","day","definitely","deliberately","did","didn't","different","do","does","doesn't","dog","don't","down","dragon","drink","drunk","during","easily","else","enough","even","every","everyone","everything","extremely","famous","fast","finally","find","first","for","from","funny","ghost","girl","give","go","good","got","grandma","grandpa","great","had","has","have","he","he's","haunted","her","here","hers","him","his","honestly","how","I","I'd","I'll","I'm","I've","if","illegal","in","inside","instead","is","isn't","it","it's","just","kind","kitchen","large","last","late","laughing","little","look","lost","love","make","massive","maybe","me","mess","might","more","most","my","myself","never","new","next","nice","no","nobody","not","nothing","now","of","off","old","on","once","one","only","or","other","our","ours","out","outside","over","perfect","perhaps","pizza","please","police","probably","quick","quiet","really","red","restaurant","right","said","same","sandwich","secret","secretly","she","she's","should","silly","since","small","so","some","someone","something","sorry","stolen","strange","suspicious","terrible","than","that","that's","the","their","theirs","them","then","there","there's","these","they","they're","thing","this","those","three","tiny","to","today","together","too","totally","under","until","up","very","was","we","we're","weird","were","what","when","where","which","who","why","will","with","without","woman","work","would","wouldn't","wrong","wow","yes","you","your","yours","yesterday","zombie","wizard","boss","neighbour","friend","monster","hero","villain","baby","bird","cow","horse","hamster","duck","chicken","fish","banana","cake","cheese","coffee","juice","money","car","bus","train","house","garden","bedroom","bathroom","office","school","shop","hospital","castle","forest","beach","moon","sun","rain","snow","fire","water","phone","computer","internet","message","letter","secret","key","door","window","chair","table","shoes","pants","shirt","hat","umbrella","knife","spoon","fork","book","movie","music","song","game","party","birthday","holiday","morning","afternoon","evening","night","tomorrow","soon","later","never","second","third","left","upstairs","downstairs","here","there","everywhere","nowhere","quickly","slowly","loudly","quietly","suddenly","surprisingly","luckily","unfortunately","seriously","obviously","hopefully","immediately","simply","also","still","back","away","apart","through","into","onto","toward","against","between","beside","near","below","although","while","unless","yet","nor","plus","minus","help","stop","run","hide","wait","listen","come","leave","stay","open","close","take","bring","send","call","text","tell","ask","know","think","want","need","like","hate","love","see","hear","feel","smell","taste","break","fix","steal","borrow","buy","sell","pay","win","lose","play","sleep","wake","eat","cook","burn","explode","escape","dance","sing","scream","laugh","cry","smile","wave","fight","kiss","marry","lie","cheat","jump","fall","fly","swim","drive","crash","stuck","early","ready","busy","tired","hungry","thirsty","sick","happy","sad","scared","confused","excited","bored","embarrassed","awkward","normal","fancy","expensive","free","broken","huge","giant","ugly","gross","hot","cold","wet","dry","clean","dirty","empty","full","heavy","light","easy","hard","lucky","unlucky","safe","legal","public","private","unknown","real","fake","magic","cursed","missing","mysterious","horrible","wonderful","brilliant","stupid","genius","ridiculous","important","useless","worst","worse","final","random","special","accidental","emergency","disaster","problem","solution","reason","excuse","plan","idea","story","truth","lie","warning","danger","doctor","teacher","manager","king","queen","prince","princess","pirate","ninja","cowboy","witch","vampire","alien","robot","unicorn","fairy","mermaid","clown","detective","criminal","celebrity","landlord","roommate","stranger","enemy","family","mum","mom","mother","father","brother","sister","uncle","aunt","cousin","kid","child","person","people","stuff","place","home","flat","street","road","pub","bar","cafe","park","station","airport","hotel","prison","church","museum","cinema","mountain","river","sea","space","planet","world","country","city","town","village","bed","sofa","toilet","shower","bath","fridge","oven","microwave","laptop","tablet","camera","television","remote","keyboard","mouse","charger","wallet","keys","bag","box","card","photo","picture","paper","pen","pencil","cup","plate","bowl","bottle","glass","burger","chips","biscuit","chocolate","bread","toast","egg","bacon","sausage","apple","orange","lemon","tea","milk","beer","wine","dinner","breakfast","lunch","snack","van","bike","bicycle","motorbike","taxi","plane","boat","ship","rocket","film","Christmas","Halloween","summer","winter","spring","autumn"
];

function loadCustomWords() {
  try {
    return fs
      .readFileSync(path.join(__dirname, "custom_words.txt"), "utf8")
      .split(/\r?\n/)
      .map((w) => w.trim())
      .filter((w) => w && !w.startsWith("#") && w.length <= 30);
  } catch {
    return [];
  }
}

function wordPool() {
  return [...new Set([...words, ...loadCustomWords()])];
}

const rooms = new Map();

const makeCode = () => {
  let c;
  do c = Math.random().toString(36).slice(2, 6).toUpperCase();
  while (rooms.has(c));
  return c;
};

const makeTiles = () =>
  [...wordPool()].sort(() => Math.random() - 0.5).slice(0, 100);

const publicPlayers = (r) =>
  Object.fromEntries(
    Object.entries(r.players).map(([id, p]) => [
      id,
      { name: p.name, score: p.score, connected: p.connected },
    ])
  );

const activePlayerIds = (r) =>
  Object.keys(r.players).filter((id) => r.players[id].connected);

function broadcast(code) {
  const r = rooms.get(code);
  if (!r) return;
  io.to(code).emit("state", {
    phase: r.phase,
    round: r.round,
    prompt: r.prompt,
    host: r.host,
    players: publicPlayers(r),
    submissions: r.submissions,
    scores: Object.fromEntries(
      Object.entries(r.players).map(([id, p]) => [id, p.score])
    ),
    roundMinutes: r.roundMinutes,
    deadline: r.deadline,
    votes: r.votes,
  });
}

function finishWriting(code, reason = "submitted") {
  const r = rooms.get(code);
  if (!r || r.phase !== "writing") return false;

  if (r.timer) {
    clearTimeout(r.timer);
    r.timer = null;
  }

  // Auto-submit for all players (connected or not), with empty drafts
