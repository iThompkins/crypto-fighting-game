// Mobile controls handling
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dpadUp = document.getElementById('dpad-up');
  const dpadRight = document.getElementById('dpad-right');
  const dpadDown = document.getElementById('dpad-down');
  const dpadLeft = document.getElementById('dpad-left');
  const attackButton = document.getElementById('attack-button');
  
  // Track active keys for mobile
  const mobileKeys = new Set();
  
  // Helper to simulate keyboard events
  function simulateKeyEvent(key, type) {
    const event = new KeyboardEvent(type, {
      key: key,
      code: key === ' ' ? 'Space' : `${key.charAt(0).toUpperCase()}${key.slice(1)}`,
      bubbles: true
    });
    document.dispatchEvent(event);
    
    // Update the currentKeys set
    if (type === 'keydown') {
      currentKeys.add(key);
    } else if (type === 'keyup') {
      currentKeys.delete(key);
    }
  }
  
  // Touch event handlers for D-pad
  function setupTouchEvents(element, key) {
    // Touch start
    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!mobileKeys.has(key)) {
        mobileKeys.add(key);
        simulateKeyEvent(key, 'keydown');
        element.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
      }
    });
    
    // Touch end
    element.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (mobileKeys.has(key)) {
        mobileKeys.delete(key);
        simulateKeyEvent(key, 'keyup');
        element.style.backgroundColor = key === ' ' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
      }
    });
    
    // Touch cancel
    element.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      if (mobileKeys.has(key)) {
        mobileKeys.delete(key);
        simulateKeyEvent(key, 'keyup');
        element.style.backgroundColor = key === ' ' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
      }
    });
    
    // Mouse events for testing on desktop
    element.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (!mobileKeys.has(key)) {
        mobileKeys.add(key);
        simulateKeyEvent(key, 'keydown');
        element.style.backgroundColor = key === ' ' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';
      }
    });
    
    element.addEventListener('mouseup', (e) => {
      e.preventDefault();
      if (mobileKeys.has(key)) {
        mobileKeys.delete(key);
        simulateKeyEvent(key, 'keyup');
        element.style.backgroundColor = key === ' ' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
      }
    });
  }
  
  // Setup touch events for all controls
  setupTouchEvents(dpadUp, 'w');
  setupTouchEvents(dpadRight, 'd');
  setupTouchEvents(dpadDown, 's');
  setupTouchEvents(dpadLeft, 'a');
  setupTouchEvents(attackButton, ' ');
  
  // Handle orientation changes
  window.addEventListener('resize', adjustForOrientation);
  
  function adjustForOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth;
    const mobileControls = document.getElementById('mobile-controls');
    
    if (isPortrait) {
      // Portrait mode
      mobileControls.style.flexDirection = 'row';
      mobileControls.style.bottom = 'auto';
      mobileControls.style.top = '66%';
      mobileControls.style.left = '0';
      mobileControls.style.width = '100%';
      mobileControls.style.transform = 'translateY(-50%)';
      mobileControls.style.justifyContent = 'space-around';
      mobileControls.style.padding = '0 15%';
    } else {
      // Landscape mode
      mobileControls.style.flexDirection = 'row';
      mobileControls.style.bottom = '0';
      mobileControls.style.left = '0';
      mobileControls.style.width = '100%';
    }
  }
  
  // Initial adjustment
  adjustForOrientation();
});
