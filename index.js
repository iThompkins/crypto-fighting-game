const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024
canvas.height = 576

c.fillRect(0, 0, canvas.width, canvas.height)

const gravity = 0.7

const background = new Sprite({
  position: {
    x: 0,
    y: 0
  },
  imageSrc: './img/background.png'
})

const shop = new Sprite({
  position: {
    x: 600,
    y: 128
  },
  imageSrc: './img/shop.png',
  scale: 2.75,
  framesMax: 6
})

const player = new Fighter({
  position: {
    x: 200,
    y: 0
  },
  velocity: {
    x: 0,
    y: 0
  },
  offset: {
    x: 0,
    y: 0
  },
  imageSrc: './img/samuraiMack/Idle.png',
  framesMax: 8,
  scale: 2.5,
  offset: {
    x: 215,
    y: 157
  },
  sprites: {
    idle: {
      imageSrc: './img/samuraiMack/Idle.png',
      framesMax: 8
    },
    run: {
      imageSrc: './img/samuraiMack/Run.png',
      framesMax: 8
    },
    jump: {
      imageSrc: './img/samuraiMack/Jump.png',
      framesMax: 2
    },
    fall: {
      imageSrc: './img/samuraiMack/Fall.png',
      framesMax: 2
    },
    attack1: {
      imageSrc: './img/samuraiMack/Attack1.png',
      framesMax: 6
    },
    takeHit: {
      imageSrc: './img/samuraiMack/Take Hit - white silhouette.png',
      framesMax: 4
    },
    death: {
      imageSrc: './img/samuraiMack/Death.png',
      framesMax: 6
    }
  },
  attackBox: {
    offset: {
      x: 100,
      y: 50
    },
    width: 160,
    height: 50
  }
})

const player2 = new Fighter({
  position: {
    x: 700,
    y: 100
  },
  velocity: {
    x: 0,
    y: 0
  },
  color: 'blue',
  offset: {
    x: -50,
    y: 0
  },
  imageSrc: './img/kenji/Idle.png',
  framesMax: 4,
  scale: 2.5,
  offset: {
    x: 215,
    y: 167
  },
  sprites: {
    idle: {
      imageSrc: './img/kenji/Idle.png',
      framesMax: 4
    },
    run: {
      imageSrc: './img/kenji/Run.png',
      framesMax: 8
    },
    jump: {
      imageSrc: './img/kenji/Jump.png',
      framesMax: 2
    },
    fall: {
      imageSrc: './img/kenji/Fall.png',
      framesMax: 2
    },
    attack1: {
      imageSrc: './img/kenji/Attack1.png',
      framesMax: 4
    },
    takeHit: {
      imageSrc: './img/kenji/Take hit.png',
      framesMax: 3
    },
    death: {
      imageSrc: './img/kenji/Death.png',
      framesMax: 7
    }
  },
  attackBox: {
    offset: {
      x: -170,
      y: 50
    },
    width: 170,
    height: 50
  },
  facingLeft: true // Player 2 should face left by default
})

// Initialize current sprite property
player.currentSprite = 'idle';
player2.currentSprite = 'idle';

// Initialize game playback
let gamePlayback = null;

// Function to start playback of the game
function startPlayback() {
  // Hide game end text
  document.querySelector('#displayText').style.display = 'none';
  
  // Create playback controller with combined move history
  const combinedHistory = [...gameState.moveSync.getMoveHistory()];
  combinedHistory.sort((a, b) => a.timestamp - b.timestamp);
  
  console.log(`Starting playback with ${combinedHistory.length} moves`);
  
  gamePlayback = new GamePlayback(combinedHistory, player, player2);
  gamePlayback.start();
  
  // Add playback controls
  const controlsHtml = `
    <div id="playback-controls" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 1000;">
      <button onclick="gamePlayback.pause()" style="padding: 5px 10px; font-family: 'Press Start 2P', cursive; font-size: 10px;">
        Pause
      </button>
      <button onclick="gamePlayback.resume()" style="padding: 5px 10px; font-family: 'Press Start 2P', cursive; font-size: 10px;">
        Play
      </button>
      <button onclick="gamePlayback.setSpeed(0.5)" style="padding: 5px 10px; font-family: 'Press Start 2P', cursive; font-size: 10px;">
        0.5x
      </button>
      <button onclick="gamePlayback.setSpeed(1.0)" style="padding: 5px 10px; font-family: 'Press Start 2P', cursive; font-size: 10px;">
        1.0x
      </button>
      <button onclick="gamePlayback.setSpeed(2.0)" style="padding: 5px 10px; font-family: 'Press Start 2P', cursive; font-size: 10px;">
        2.0x
      </button>
      <button onclick="location.reload()" style="padding: 5px 10px; font-family: 'Press Start 2P', cursive; font-size: 10px;">
        Exit
      </button>
    </div>
  `;
  
  // Add controls to the DOM
  const controlsDiv = document.createElement('div');
  controlsDiv.innerHTML = controlsHtml;
  document.body.appendChild(controlsDiv.firstElementChild);
}

console.log(player)

const keys = {
  a: {
    pressed: false
  },
  d: {
    pressed: false
  },
  ArrowRight: {
    pressed: false
  },
  ArrowLeft: {
    pressed: false
  }
}

function updatePlayerState(keys) {
  const controlledPlayer = isHost ? player : player2;
  const otherPlayer = isHost ? player2 : player;
  
  // Store current sprite for network sync
  controlledPlayer.currentSprite = controlledPlayer.currentSprite || 'idle';
  
  // Reset velocity
  controlledPlayer.velocity.x = 0;
  
  // Movement (both WASD and arrow keys)
  if (keys.includes('a') || keys.includes('ArrowLeft')) {
    controlledPlayer.velocity.x = -5;
    controlledPlayer.switchSprite('run');
    controlledPlayer.currentSprite = 'run';
    // Player 1 faces left when moving left, Player 2 faces right when moving left
    controlledPlayer.facingLeft = isHost;
  } else if (keys.includes('d') || keys.includes('ArrowRight')) {
    controlledPlayer.velocity.x = 5;
    controlledPlayer.switchSprite('run');
    controlledPlayer.currentSprite = 'run';
    // Player 1 faces right when moving right, Player 2 faces left when moving right
    controlledPlayer.facingLeft = !isHost;
  } else {
    controlledPlayer.switchSprite('idle');
    controlledPlayer.currentSprite = 'idle';
  }

  // Jumping (both W and Up arrow)
  if ((keys.includes('w') || keys.includes('ArrowUp')) && controlledPlayer.velocity.y === 0) {
    controlledPlayer.velocity.y = -20;
    controlledPlayer.switchSprite('jump');
    controlledPlayer.currentSprite = 'jump';
  } else if (controlledPlayer.velocity.y > 0) {
    controlledPlayer.switchSprite('fall');
    controlledPlayer.currentSprite = 'fall';
  }

  // Attacking (both spacebar and Down arrow)
  if ((keys.includes(' ') || keys.includes('ArrowDown')) && !controlledPlayer.isAttacking) {
    controlledPlayer.attack();
    controlledPlayer.currentSprite = 'attack1';
  }

  // Update position based on velocity
  controlledPlayer.position.x += controlledPlayer.velocity.x;
  controlledPlayer.position.y += controlledPlayer.velocity.y;

  // Apply gravity
  if (controlledPlayer.position.y + controlledPlayer.height + controlledPlayer.velocity.y >= canvas.height - 96) {
    controlledPlayer.velocity.y = 0;
    controlledPlayer.position.y = 330;
  } else {
    controlledPlayer.velocity.y += gravity;
  }

  // Collision detection - check for both players
  // This ensures both machines detect the same collisions
  if (rectangularCollision({rectangle1: player, rectangle2: player2}) &&
      player.isAttacking && player.framesCurrent === 4 && !player2.dead) {
    // Record the hit in our move history
    if (isHost) {
      // Add a special "hit" move to the history
      const hitMove = {
        keys: ['hit-p2'],
        timestamp: Date.now(),
        sequence: ++gameState.moveSync.lastSequence,
        isHost: true,
        hitData: {
          attacker: 'player1',
          defender: 'player2',
          damage: 20
        }
      };
      gameState.moveSync.moveHistory.push(hitMove);
    }
    
    player2.takeHit();
    player.isAttacking = false;
    gsap.to('#player2Health', {width: player2.health + '%'});
    
    // Check for game over
    if (player2.health <= 0) {
      player2.dead = true;
      determineWinner({ player, player2, timerId: null });
    }
  }

  if (rectangularCollision({rectangle1: player2, rectangle2: player}) &&
      player2.isAttacking && player2.framesCurrent === 2 && !player.dead) {
    // Record the hit in our move history
    if (!isHost) {
      // Add a special "hit" move to the history
      const hitMove = {
        keys: ['hit-p1'],
        timestamp: Date.now(),
        sequence: ++gameState.moveSync.lastSequence,
        isHost: false,
        hitData: {
          attacker: 'player2',
          defender: 'player1',
          damage: 20
        }
      };
      gameState.moveSync.moveHistory.push(hitMove);
    }
    
    player.takeHit();
    player2.isAttacking = false;
    gsap.to('#playerHealth', {width: player.health + '%'});
    
    // Check for game over
    if (player.health <= 0) {
      player.dead = true;
      determineWinner({ player, player2, timerId: null });
    }
  }

  // Reset attack states
  if (player.isAttacking && player.framesCurrent === 4) {
    player.isAttacking = false;
  }
  if (player2.isAttacking && player2.framesCurrent === 2) {
    player2.isAttacking = false;
  }

  // Check win condition and handle death
  if (player.health <= 0 && !player.dead) {
    player.switchSprite('death');
    player.currentSprite = 'death';
    player.dead = true;
    determineWinner({ player, player2, timerId });
  } else if (player2.health <= 0 && !player2.dead) {
    player2.switchSprite('death');
    player2.currentSprite = 'death';
    player2.dead = true;
    determineWinner({ player, player2, timerId });
  }
}

function animate() {
  window.requestAnimationFrame(animate)

  // Clear canvas and draw background elements
  c.fillStyle = 'black'
  c.fillRect(0, 0, canvas.width, canvas.height)
  background.update()
  shop.update()

  // Add overlay effect
  c.fillStyle = 'rgba(255, 255, 255, 0.15)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  // Update game state if both players are connected and game has started but not ended
  if (gameState.player1Connected && gameState.player2Connected && gameState.gameStarted && !gameState.gameEnded) {
    // Only update the player we control
    const controlledPlayer = isHost ? player : player2;
    
    // In free play mode, we only update our own player
    if (gameMode === 'freeplay') {
      updatePlayerState(Array.from(currentKeys));
    } else {
      // In wallet mode, we update both players
      updatePlayerState(Array.from(currentKeys));
    }
  }

  // Draw players
  if (gameState.player1Connected) {
    player.update()
  }
  if (gameState.player2Connected) {
    player2.update()
  }
}

animate()

let currentKeys = new Set();

document.addEventListener('keydown', (event) => {
  currentKeys.add(event.key);
  const controlledPlayer = isHost ? player : player2;
  
  if (!controlledPlayer.dead) {
    switch (event.key) {
      case 'd':
      case 'ArrowRight':
        controlledPlayer.lastKey = event.key
        break
      case 'a':
      case 'ArrowLeft':
        controlledPlayer.lastKey = event.key
        break
      case 'w':
      case 'ArrowUp':
        break
      case ' ':
      case 'ArrowDown':
        break
    }
  }
})

document.addEventListener('keyup', (event) => {
  currentKeys.delete(event.key);
  switch (event.key) {
    case 'd':
      keys.d.pressed = false
      break
    case 'a':
      keys.a.pressed = false
      break
  }

  // enemy keys
  switch (event.key) {
    case 'ArrowRight':
      keys.ArrowRight.pressed = false
      break
    case 'ArrowLeft':
      keys.ArrowLeft.pressed = false
      break
  }
})

// Keep track of connection health
let lastPingTime = 0;
let pingInterval;
let connectionHealthy = true;
let connectionStatusInterval;

// Function to update connection status display
function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    if (!conn) {
        statusElement.textContent = 'Not connected';
        statusElement.style.color = '#aaa';
        return;
    }
    
    if (conn.open && connectionHealthy) {
        statusElement.textContent = 'Connected';
        statusElement.style.color = '#4caf50';
    } else if (conn.open && !connectionHealthy) {
        statusElement.textContent = 'Connection unstable';
        statusElement.style.color = '#ff9800';
    } else {
        statusElement.textContent = 'Disconnected';
        statusElement.style.color = '#f44336';
    }
}

// Start connection status updates
function startConnectionStatusUpdates() {
    if (connectionStatusInterval) clearInterval(connectionStatusInterval);
    
    connectionStatusInterval = setInterval(() => {
        updateConnectionStatus();
    }, 1000);
}

// Function to start ping/pong for connection health
function startPingPong() {
    if (pingInterval) clearInterval(pingInterval);
    
    pingInterval = setInterval(() => {
        if (conn && conn.open) {
            // Send ping
            lastPingTime = Date.now();
            try {
                conn.send({ type: 'ping', time: lastPingTime });
            } catch (err) {
                console.error('Error sending ping:', err);
                connectionHealthy = false;
            }
            
            // Check if we've received a pong within reasonable time
            if (lastPingTime > 0 && Date.now() - lastPingTime > 10000) {
                console.warn('No pong received for 10 seconds, connection may be unstable');
                connectionHealthy = false;
            }
        }
    }, 5000); // Ping every 5 seconds
}

// Handle ping/pong in the data handler
function handlePingPong(data) {
    if (data.type === 'ping') {
        // Respond with pong
        if (conn && conn.open) {
            try {
                conn.send({ type: 'pong', time: data.time });
            } catch (err) {
                console.error('Error sending pong:', err);
            }
        }
    } else if (data.type === 'pong') {
        // Received pong, connection is healthy
        const latency = Date.now() - data.time;
        console.log(`Connection latency: ${latency}ms`);
        connectionHealthy = true;
        lastPingTime = 0; // Reset ping time
    }
}

// Update local state and send moves to peer
let lastSendTime = 0;
function sendPlayerState() {
  if (!gameState.gameStarted || !conn || !conn.open) return;
  
  const now = Date.now();
  const minTimeBetweenSends = 1000 / gameState.moveSync.getCurrentFps();
  
  // Throttle sending based on target FPS
  if (now - lastSendTime < minTimeBetweenSends) return;
  
  lastSendTime = now;
  sendGameMove(currentKeys);
}

// Process all unprocessed moves for the current frame
function processGameMoves() {
  if (!gameState.gameStarted || gameState.gameEnded) return;
  
  // Get all moves that should be applied in the current frame
  const moves = gameState.moveSync.getUnprocessedMoves();
  
  if (moves.length > 0) {
    console.log(`Processing ${moves.length} moves for frame ${gameState.moveSync.getCurrentFrame()}`);
    
    // Apply each move in sequence
    moves.forEach(move => {
      // Apply move to the appropriate player
      if ((move.isHost && isHost) || (!move.isHost && !isHost)) {
        // This is our own move, already applied
      } else {
        // This is opponent's move
        applyMoveToOpponent(move);
      }
    });
    
    // Update game timer based on elapsed time
    updateGameTimer();
  }
}

// Update the game timer based on elapsed time
function updateGameTimer() {
  if (!gameState.gameStarted || gameState.gameEnded) return;
  
  const currentTime = gameState.moveSync.getGameTimerValue();
  document.querySelector('#timer').innerHTML = currentTime;
  
  // Check if game should end
  if (currentTime <= 0 && !gameState.gameEnded) {
    determineWinner({ player, player2, timerId: null });
  }
}

// Call sendPlayerState on each animation frame
function updateNetworkState() {
  if (gameState.gameStarted && !gameState.gameEnded) {
    sendPlayerState();
    processGameMoves();
  }
  requestAnimationFrame(updateNetworkState);
}

// Start network state updates
updateNetworkState();
