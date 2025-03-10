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
  
  // Add a restart button
  setTimeout(() => {
    document.querySelector('#displayText').innerHTML += '<div><button onclick="location.reload()" style="margin-top: 20px; padding: 10px; font-family: \'Press Start 2P\', cursive;">Play Again</button></div>'
  }, 2000);
}

let timer = 60
let timerId
function decreaseTimer() {
  if (timer > 0) {
    timerId = setTimeout(decreaseTimer, 1000)
    timer--
    document.querySelector('#timer').innerHTML = timer
  }

  if (timer === 0) {
    determineWinner({ player, player2, timerId })
  }
}
