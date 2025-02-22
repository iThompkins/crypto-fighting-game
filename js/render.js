function renderEnvironment() {
    // Clear canvas
    c.fillStyle = 'black'
    c.fillRect(0, 0, canvas.width, canvas.height)

    // Draw background and shop
    if (background.loaded) background.update()
    if (shop.loaded) shop.update()

    // Add overlay effect
    c.fillStyle = 'rgba(255, 255, 255, 0.15)'
    c.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw players if connected
    if (gameState.player1Connected && player.loaded) {
        player.draw()
    }
    if (gameState.player2Connected && enemy && enemy.loaded) {
        enemy.draw()
    }

    window.requestAnimationFrame(renderEnvironment)
}
