// This function is no longer needed as rendering is handled in animate()

// Mobile-specific rendering adjustments
function adjustCanvasForMobile() {
  const canvas = document.querySelector('canvas');
  const isPortrait = window.innerHeight > window.innerWidth;
  
  if (isPortrait) {
    // In portrait mode, make canvas fit width
    const aspectRatio = canvas.height / canvas.width;
    const newWidth = window.innerWidth;
    const newHeight = newWidth * aspectRatio;
    
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
  } else {
    // In landscape, try to fit the screen while maintaining aspect ratio
    const aspectRatio = canvas.height / canvas.width;
    const maxWidth = window.innerWidth;
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
  }
}

// Call this function on window resize
window.addEventListener('resize', adjustCanvasForMobile);
// Initial call
window.addEventListener('DOMContentLoaded', adjustCanvasForMobile);
