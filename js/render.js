function renderEnvironment() {
    c.fillStyle = 'black'
    c.fillRect(0, 0, canvas.width, canvas.height)
    background.update()
    shop.update()
    c.fillStyle = 'rgba(255, 255, 255, 0.15)'
    c.fillRect(0, 0, canvas.width, canvas.height)
    
    // Only draw players (without updating their state)
    if (gameState.player1Connected) {
        player.draw()
    }
    if (gameState.player2Connected) {
        enemy.draw()
    }

    window.requestAnimationFrame(renderEnvironment)
}
