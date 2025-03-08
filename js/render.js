// This function is no longer needed as rendering is handled in animate()

// Mobile-specific rendering adjustments
function adjustCanvasForMobile() {
  const canvas = document.querySelector('canvas');
  const isPortrait = window.innerHeight > window.innerWidth;
  
  if (isPortrait) {
    // In portrait mode, make canvas fit width but larger
    const aspectRatio = canvas.height / canvas.width;
    const newWidth = window.innerWidth;
    const newHeight = newWidth * aspectRatio;
    
    // Make canvas bigger but maintain aspect ratio
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    
    // Ensure it's not too big for the viewport
    if (newHeight > window.innerHeight * 0.6) {
      const adjustedHeight = window.innerHeight * 0.6;
      const adjustedWidth = adjustedHeight / aspectRatio;
      canvas.style.width = `${adjustedWidth}px`;
      canvas.style.height = `${adjustedHeight}px`;
    }
  } else {
    // In landscape, center in the screen while maintaining aspect ratio
    const aspectRatio = canvas.height / canvas.width;
    const maxWidth = window.innerWidth * 0.9; // Use 90% of screen width
    const maxHeight = window.innerHeight * 0.7; // Leave room for controls
    
    let newWidth = maxWidth;
    let newHeight = newWidth * aspectRatio;
    
    // If too tall, scale down
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight / aspectRatio;
    }
    
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    
    // Center the canvas
    const container = document.querySelector('#game-container');
    if (container) {
      container.style.display = 'flex';
      container.style.justifyContent = 'center';
      container.style.alignItems = 'center';
    }
  }
}

// Call this function on window resize
window.addEventListener('resize', adjustCanvasForMobile);
// Initial call
window.addEventListener('DOMContentLoaded', adjustCanvasForMobile);
