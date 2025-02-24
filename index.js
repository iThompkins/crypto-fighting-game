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
    x: 0,
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
    x: 400,
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
  }
})

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
  
  // Reset velocity
  controlledPlayer.velocity.x = 0;
  
  // Movement (both WASD and arrow keys)
  if (keys.includes('a') || keys.includes('ArrowLeft')) {
    controlledPlayer.velocity.x = -5;
    controlledPlayer.switchSprite('run');
  } else if (keys.includes('d') || keys.includes('ArrowRight')) {
    controlledPlayer.velocity.x = 5;
    controlledPlayer.switchSprite('run');
  } else {
    controlledPlayer.switchSprite('idle');
  }

  // Jumping (both W and Up arrow)
  if ((keys.includes('w') || keys.includes('ArrowUp')) && controlledPlayer.velocity.y === 0) {
    controlledPlayer.velocity.y = -20;
    controlledPlayer.switchSprite('jump');
  } else if (controlledPlayer.velocity.y > 0) {
    controlledPlayer.switchSprite('fall');
  }

  // Attacking (both spacebar and Down arrow)
  if (keys.includes(' ') || keys.includes('ArrowDown')) {
    controlledPlayer.attack();
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

  // Collision detection
  if (rectangularCollision({rectangle1: player, rectangle2: player2}) &&
      player.isAttacking && player.framesCurrent === 4 && !player2.dead) {
    player2.takeHit()
    player.isAttacking = false
    gsap.to('#player2Health', {width: player2.health + '%'})
  }

  if (rectangularCollision({rectangle1: player2, rectangle2: player}) &&
      player2.isAttacking && player2.framesCurrent === 2 && !player.dead) {
    player.takeHit()
    player2.isAttacking = false
    gsap.to('#playerHealth', {width: player.health + '%'})
  }

  // Reset attack states
  if (player.isAttacking && player.framesCurrent === 4) {
    player.isAttacking = false
  }
  if (player2.isAttacking && player2.framesCurrent === 2) {
    player2.isAttacking = false
  }

  // Check win condition and handle death
  if (player.health <= 0 && !player.dead) {
    player.switchSprite('death')
    player.dead = true
    determineWinner({ player, player2, timerId })
  } else if (player2.health <= 0 && !player2.dead) {
    player2.switchSprite('death')
    player2.dead = true
    determineWinner({ player, player2, timerId })
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

  // Update game state if both players are connected and game has started
  if (gameState.player1Connected && gameState.player2Connected && gameState.gameStarted) {
    updatePlayerState(Array.from(currentKeys))
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

window.addEventListener('keydown', (event) => {
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

window.addEventListener('keyup', (event) => {
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

// Update local state and send moves to peer
setInterval(() => {
  if (gameState.gameStarted) {
    // Send current state to peer
    const currentState = {
      keys: Array.from(currentKeys),
      position: isHost ? player.position : player2.position,
      velocity: isHost ? player.velocity : player2.velocity,
      isAttacking: isHost ? player.isAttacking : player2.isAttacking
    };
    sendGameMove(currentState);
  }
}, 1000 / 60);  // 60fps update rate for smoother animation
