// Frostfire Forge Frontend Configuration
// Update these URLs to match your backend deployment

const CONFIG = {
  // Backend API URLs
  API_BASE_URL: 'http://148.230.90.76',
  WS_URL: 'ws://148.230.90.76/ws',
  
  // Game Configuration
  GAME_NAME: 'Frostfire Forge',
  VERSION: '1.0.0',
  
  // Cloudflare Configuration
  CLOUDFLARE_ANALYTICS: false,
  
  // Development/Production flags
  DEBUG: false,
  ENABLE_LOGGING: true
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.FROSTFIRE_CONFIG = CONFIG;
} 