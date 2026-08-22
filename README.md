# Ransom Notes Online — Render Ready

Single Node/Express + Socket.IO service. Express serves the game and Socket.IO provides realtime multiplayer.

## Render
Connect this repository to Render as a **Web Service**.
Build command: `npm install`
Start command: `npm start`
Health check: `/health`

Render supplies `PORT`; the server binds to `0.0.0.0`.

## Local
`npm install`
`npm start`
Then open http://localhost:10000

Rooms are stored in memory, so restarting the service clears active games.

## Word bank
Each player receives 100 word tiles per round from a larger word pool. The word bank scrolls so it remains usable on mobile and desktop.
