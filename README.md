# Ransom Notes Online — Render Ready

## New in this version
- Visible scoreboard during the game.
- The player currently logged in is highlighted.
- Host can choose **2–10 minutes** before each round.
- The timer is synchronised to the server.
- When time expires, every player's current draft is automatically submitted.
- Voting buttons turn green and show **YOUR VOTE** after selection.
- Larger built-in word pool; each player still receives 100 tiles per round.
- Add your own words in `custom_words.txt`, one word or short phrase per line.

## Adding your own words
Open `custom_words.txt` and add words below the comments, one per line. You can use short phrases too. Commit the change to GitHub; Render will redeploy and the new words will be included in future rounds.

## Render
This is a single Node/Express + Socket.IO Web Service. Build command: `npm install`. Start command: `npm start`. Health check: `/health`.

## Local
`npm install` then `npm start`, then open http://localhost:10000.

Rooms are stored in memory, so active rooms reset if the Render service restarts.
