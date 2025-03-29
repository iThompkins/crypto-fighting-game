// Game playback system
class GamePlayback {
  constructor(moveHistory, player1, player2) {
    this.moveHistory = moveHistory || [];
    this.player1 = player1;
    this.player2 = player2;
    this.currentIndex = 0;
    this.isPlaying = false;
    this.playbackSpeed = 1.0; // Default speed
    this.lastFrameTime = 0;
    this.targetFps = 30;
  }

  // Start playback
  start() {
    if (this.moveHistory.length === 0) {
      console.error('No move history to play back');
      return;
    }

    // Reset game state
    this.resetGameState();
    
    // Start playback
    this.isPlaying = true;
    this.currentIndex = 0;
    this.lastFrameTime = 0;
    
    // Start animation loop
    requestAnimationFrame(this.update.bind(this));
  }

  // Pause playback
  pause() {
    this.isPlaying = false;
  }

  // Resume playback
  resume() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      requestAnimationFrame(this.update.bind(this));
    }
  }

  // Set playback speed (0.5 = half speed, 2.0 = double speed)
  setSpeed(speed) {
    this.playbackSpeed = Math.max(0.1, Math.min(5.0, speed));
  }

  // Reset game state for playback
  resetGameState() {
    // Reset player positions
    this.player1.position = { x: 200, y: 330 };
    this.player2.position = { x: 700, y: 330 };
    
    // Reset velocities
    this.player1.velocity = { x: 0, y: 0 };
    this.player2.velocity = { x: 0, y: 0 };
    
    // Reset health
    this.player1.health = 100;
    this.player2.health = 100;
    
    // Reset sprites
    this.player1.switchSprite('idle');
    this.player2.switchSprite('idle');
    
    // Reset health bars
    gsap.to('#playerHealth', {width: '100%'});
    gsap.to('#player2Health', {width: '100%'});
    
    // Reset facing directions
    this.player1.facingLeft = false;
    this.player2.facingLeft = true;
    
    // Reset attack state
    this.player1.isAttacking = false;
    this.player2.isAttacking = false;
    
    // Reset death state
    this.player1.dead = false;
    this.player2.dead = false;
    
    // Show both players
    this.player1.show();
    this.player2.show();
  }

  // Update function called on each animation frame
  update(timestamp) {
    if (!this.isPlaying) return;
    
    // Calculate time since last frame
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp;
      requestAnimationFrame(this.update.bind(this));
      return;
    }
    
    const deltaTime = timestamp - this.lastFrameTime;
    const frameTime = (1000 / this.targetFps) / this.playbackSpeed;
    
    // If enough time has passed, process the next move
    if (deltaTime >= frameTime) {
      this.lastFrameTime = timestamp;
      
      // Process next move if available
      if (this.currentIndex < this.moveHistory.length) {
        const move = this.moveHistory[this.currentIndex];
        this.applyMove(move);
        this.currentIndex++;
      } else {
        // End of playback
        this.isPlaying = false;
        console.log('Playback complete');
        return;
      }
    }
    
    // Continue animation loop
    requestAnimationFrame(this.update.bind(this));
  }

  // Apply a move to the appropriate player
  applyMove(move) {
    // Determine which player this move belongs to
    // We'll use sequence numbers: odd for player1, even for player2
    const isPlayer1Move = move.sequence % 2 === 1;
    const player = isPlayer1Move ? this.player1 : this.player2;
    const keys = move.keys;
    
    // Reset velocity
    player.velocity.x = 0;
    
    // Movement
    if (keys.includes('a') || keys.includes('ArrowLeft')) {
      player.velocity.x = -5;
      player.switchSprite('run');
      player.facingLeft = isPlayer1Move; // Player 1 faces left when moving left
    } else if (keys.includes('d') || keys.includes('ArrowRight')) {
      player.velocity.x = 5;
      player.switchSprite('run');
      player.facingLeft = !isPlayer1Move; // Player 1 faces right when moving right
    } else {
      player.switchSprite('idle');
    }
    
    // Jumping
    if ((keys.includes('w') || keys.includes('ArrowUp')) && player.velocity.y === 0) {
      player.velocity.y = -20;
      player.switchSprite('jump');
    }
    
    // Attacking
    if ((keys.includes(' ') || keys.includes('ArrowDown')) && !player.isAttacking) {
      player.attack();
    }
    
    // Update position
    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y;
    
    // Apply gravity
    if (player.position.y + player.height + player.velocity.y >= canvas.height - 96) {
      player.velocity.y = 0;
      player.position.y = 330;
    } else {
      player.velocity.y += gravity;
    }
    
    // Check for attacks and collisions
    this.checkCollisions();
  }
  
  // Check for collisions between players
  checkCollisions() {
    // Check if player1 is attacking player2
    if (rectangularCollision({rectangle1: this.player1, rectangle2: this.player2}) &&
        this.player1.isAttacking && this.player1.framesCurrent === 4 && !this.player2.dead) {
      this.player2.takeHit();
      this.player1.isAttacking = false;
      gsap.to('#player2Health', {width: this.player2.health + '%'});
    }
    
    // Check if player2 is attacking player1
    if (rectangularCollision({rectangle1: this.player2, rectangle2: this.player1}) &&
        this.player2.isAttacking && this.player2.framesCurrent === 2 && !this.player1.dead) {
      this.player1.takeHit();
      this.player2.isAttacking = false;
      gsap.to('#playerHealth', {width: this.player1.health + '%'});
    }
    
    // Reset attack states
    if (this.player1.isAttacking && this.player1.framesCurrent === 4) {
      this.player1.isAttacking = false;
    }
    if (this.player2.isAttacking && this.player2.framesCurrent === 2) {
      this.player2.isAttacking = false;
    }
  }
}
