const socket = io();
let roomCode = localStorage.getItem("roomCode");
let playerId = localStorage.getItem("playerId");

socket.on("state", state => {
    if (state.phase !== "voting") return;

    document.getElementById("prompt").textContent = state.prompt;

    const container = document.getElementById("submissions");
    container.innerHTML = "";

    Object.entries(state.submissions).forEach(([id, sub]) => {
        if (id === playerId) return; // can't vote for yourself

        const div = document.createElement("div");
        div.className = "submission";

        div.innerHTML = `
            <p><strong>${sub.name}</strong></p>
            <p>${sub.words.join(" ")}</p>
            <button class="vote-btn" data-id="${id}">Vote</button>
        `;

        container.appendChild(div);
    });

    updateTimer(state.deadline);
});

document.addEventListener("click", e => {
    if (e.target.classList.contains("vote-btn")) {
        const target = e.target.dataset.id;
        socket.emit("vote", { roomCode, target }, res => {
            if (res.ok) {
                e.target.textContent = "Your Vote";
                e.target.classList.add("voted");
            }
        });
    }
});

function updateTimer(deadline) {
    const timerEl = document.getElementById("timer");

    function tick() {
        const remaining = deadline - Date.now();

        if (remaining <= 0) {
            timerEl.textContent = "Time’s up!";
            timerEl.classList.add("red");
            return;
        }

        const seconds = Math.floor(remaining / 1000);
        timerEl.textContent = seconds + "s";

        if (seconds <= 30) {
            timerEl.classList.add("red");
        }

        requestAnimationFrame(tick);
    }

    tick();
}
