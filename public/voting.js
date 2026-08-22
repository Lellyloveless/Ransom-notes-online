const socket = io();
const roomCode = localStorage.getItem("roomCode");
const myId = localStorage.getItem("playerId");
let myVote = null;

socket.emit("requestState", roomCode);

const $ = id => document.getElementById(id);

// Listen for game state updates
socket.on("state", state => {
    if (state.phase !== "voting") return;

    $("prompt").textContent = state.prompt;

    const container = $("submissions");
    container.innerHTML = "";

    Object.entries(state.submissions).forEach(([id, sub]) => {
        const div = document.createElement("div");
        div.className = "submission";

        const text = sub.words.length ? sub.words.join(" ") : "(No words submitted)";
        let action = "";

        if (id === myId) {
            action = "<small>You cannot vote for yourself.</small>";
        } else if (myVote === id) {
            action = "<div class='voted-label'>YOUR VOTE</div>";
        } else if (myVote) {
            action = "<div class='small'>Vote already submitted.</div>";
        } else {
            action = `<button class="vote-btn" data-id="${id}">Vote</button>`;
        }

        div.innerHTML = `<div class="note-text">${text}</div>${action}`;
        container.appendChild(div);
    });

    updateTimer(state.deadline);
});

// Handle vote clicks
document.addEventListener("click", e => {
    if (!e.target.classList.contains("vote-btn")) return;
    if (myVote) return;

    const target = e.target.dataset.id;
    myVote = target;

    socket.emit("vote", { roomCode, target }, res => {
        if (!res.ok) myVote = null;
        socket.emit("requestState", roomCode);
    });
});

// Timer
function updateTimer(deadline) {
    const timerEl = $("timer");

    function tick() {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            timerEl.textContent = "Time’s up!";
            timerEl.classList.add("red-timer");
            return;
        }

        const seconds = Math.floor(remaining / 1000);
        timerEl.textContent = seconds + "s";

        if (seconds <= 30) timerEl.classList.add("red-timer");
        requestAnimationFrame(tick);
    }

    tick();
}

// Show winner
socket.on("roundWinner", data => {
    const names = data.names.join(" & ");
    $("winner").classList.remove("hidden");
    $("winner").innerHTML = `
        🏆 ${names} WIN!<br>
        <small>+1 point</small>
        <button onclick="nextRound()">NEXT ROUND</button>
    `;
});

function nextRound() {
    socket.emit("startRound", { roomCode });
}
