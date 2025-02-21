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
  player.velocity.x = 0
  player2.velocity.x = 0

  // Update movement based on keys
  if (isHost) {
    // Player 1 movement
    if (keys.includes('a')) {
      player.velocity.x = -5
      player.switchSprite('run')
    } else if (keys.includes('d')) {
      player.velocity.x = 5
      player.switchSprite('run')
    } else {
      player.switchSprite('idle')
    }

    // Player 1 jumping/attacking
    if (keys.includes('w')) {
      player.velocity.y = -20
      player.switchSprite('jump')
    } else if (player.velocity.y > 0) {
      player.switchSprite('fall')
    }
    if (keys.includes(' ')) {
      player.attack()
    }
  } else {
    // Player 2 movement
    if (keys.includes('ArrowLeft')) {
      player2.velocity.x = -5
      player2.switchSprite('run')
    } else if (keys.includes('ArrowRight')) {
      player2.velocity.x = 5
      player2.switchSprite('run')
    } else {
      player2.switchSprite('idle')
    }

    // Player 2 jumping/attacking
    if (keys.includes('ArrowUp')) {
      player2.velocity.y = -20
      player2.switchSprite('jump')
    } else if (player2.velocity.y > 0) {
      player2.switchSprite('fall')
    }
    if (keys.includes('ArrowDown')) {
      player2.attack()
    }
  }

  // Collision detection
  if (rectangularCollision({rectangle1: player, rectangle2: player2}) &&
      player.isAttacking && player.framesCurrent === 4) {
    player2.takeHit()
    player.isAttacking = false
    gsap.to('#player2Health', {width: player2.health + '%'})
  }

  if (rectangularCollision({rectangle1: player2, rectangle2: player}) &&
      player2.isAttacking && player2.framesCurrent === 2) {
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

  // Check win condition
  if (player2.health <= 0 || player.health <= 0) {
    determineWinner({ player, player2, timerId })
  }
}

function animate() {
  window.requestAnimationFrame(animate)

  // Only update game state if both players are connected and game has started
  if (gameState.player1Connected && gameState.player2Connected && gameState.gameStarted) {
    updatePlayerState(Array.from(currentKeys))
  }
}

animate()

let currentKeys = new Set();

window.addEventListener('keydown', (event) => {
  currentKeys.add(event.key);
  if (!player.dead) {
    switch (event.key) {
      case 'd':
        keys.d.pressed = true
        player.lastKey = 'd'
        break
      case 'a':
        keys.a.pressed = true
        player.lastKey = 'a'
        break
      case 'w':
        player.velocity.y = -20
        break
      case ' ':
        player.attack()
        break
    }
  }

  if (!enemy.dead) {
    switch (event.key) {
      case 'ArrowRight':
        keys.ArrowRight.pressed = true
        enemy.lastKey = 'ArrowRight'
        break
      case 'ArrowLeft':
        keys.ArrowLeft.pressed = true
        enemy.lastKey = 'ArrowLeft'
        break
      case 'ArrowUp':
        enemy.velocity.y = -20
        break
      case 'ArrowDown':
        enemy.attack()

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
  if (currentKeys.size > 0) {
    // Update local player state
    updatePlayerState();
    player.update();
    
    // Send move to peer
    sendGameMove({
      keys: Array.from(currentKeys)
    });
  }
}, 1000 / 30);  // 30fps update rate
