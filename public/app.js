const socket = io();
let roomCode = "";
let myId = "";
let myTiles = [];
let chosen = [];
let timer = null;
let state = null;
let myVote = null;

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
}[c]));

function show(x) {
    ["home", "lobby", "game"].forEach(id =>
        $(id).classList.toggle("hidden", id !== x)
    );
}

function enter(r) {
    if (r.error) return $("error").textContent = r.error;

    roomCode = r.roomCode;
    myId = r.playerId;

    localStorage.setItem("roomCode", roomCode);
    localStorage.setItem("playerId", myId);

    $("roomLabel").textContent = roomCode;
    show(r.spectator ? "game" : "lobby");

    history.replaceState({}, "", `?room=${roomCode}`);
}

$("create").onclick = () =>
    socket.emit("createRoom", { name: $("name").value.trim() }, enter);

$("join").onclick = () =>
    socket.emit("joinRoom", {
        roomCode: $("room").value.trim(),
        name: $("name").value.trim()
    }, enter);

$("start").onclick = () =>
    socket.emit("startRound", { roomCode }, r => {
        if (r.error) $("lobbyMsg").textContent = r.error;
    });

$("roundTime").onchange = () =>
    socket.emit("setRoundTime", {
        roomCode,
        minutes: +$("roundTime").value
    }, r => {
        if (r.error) $("lobbyMsg").textContent = r.error;
    });

$("copy").onclick = async () => {
    await navigator.clipboard.writeText(location.origin + "?room=" + roomCode);
    $("lobbyMsg").textContent = "Invite copied!";
};

$("clear").onclick = () => {
    chosen = [];
    sendDraft();
    renderTiles();
    renderSentence();
};

$("submit").onclick = manualSubmit;

function manualSubmit() {
    if (!chosen.length)
        return $("status").textContent = "Add at least one word first.";

    $("status
