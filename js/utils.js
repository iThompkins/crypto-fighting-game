function rectangularCollision({ rectangle1, rectangle2 }) {
  return (
    rectangle1.attackBox.position.x + rectangle1.attackBox.width >=
      rectangle2.position.x &&
    rectangle1.attackBox.position.x <=
      rectangle2.position.x + rectangle2.width &&
    rectangle1.attackBox.position.y + rectangle1.attackBox.height >=
      rectangle2.position.y &&
    rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
  )
}

function determineWinner({ player, player2, timerId }) {
  clearTimeout(timerId)
  document.querySelector('#displayText').style.display = 'flex'
  
  // Stop the game
  gameState.gameEnded = true
  
  if (player.health === player2.health) {
    document.querySelector('#displayText').innerHTML = 'Tie'
  } else if (player.health > player2.health) {
    document.querySelector('#displayText').innerHTML = 'Player 1 Wins'
  } else if (player.health < player2.health) {
    document.querySelector('#displayText').innerHTML = 'Player 2 Wins'
  }
  
  // Log game history to console
  console.log("=== GAME HISTORY ===");
  console.log(`Total moves: ${gameState.moveSync.moveHistory.length}`);
  console.log("Move history:", gameState.moveSync.moveHistory);
  
  // Add a restart button and playback button
  setTimeout(() => {
    document.querySelector('#displayText').innerHTML += `
      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
        <button onclick="startPlayback()" style="padding: 10px; font-family: 'Press Start 2P', cursive;">
          Watch Replay
        </button>
        <button onclick="location.reload()" style="padding: 10px; font-family: 'Press Start 2P', cursive;">
          Play Again
        </button>
        <button onclick="downloadGameHistory()" style="padding: 10px; font-family: 'Press Start 2P', cursive;">
          Download History
        </button>
      </div>
    `
  }, 2000);
}

// Timer is now managed by moveSync
