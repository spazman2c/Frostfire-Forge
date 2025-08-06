// Configuration Updater for Frostfire Forge Frontend
// This script updates the WebSocket connection to use the backend API

(function() {
  'use strict';
  
  // Wait for the configuration to load
  function waitForConfig() {
    if (window.FROSTFIRE_CONFIG) {
      updateWebSocketConnection();
    } else {
      setTimeout(waitForConfig, 100);
    }
  }
  
  function updateWebSocketConnection() {
    const config = window.FROSTFIRE_CONFIG;
    
    // Update the WebSocket connection URL
    if (config.WS_URL) {
      // Find and replace the hardcoded WebSocket URL in the websocket.js
      const originalWebSocketUrl = 'ws://localhost:3001';
      const newWebSocketUrl = config.WS_URL;
      
      // Update any existing WebSocket connections
      if (window.socket && window.socket.url !== newWebSocketUrl) {
        console.log('Updating WebSocket connection to:', newWebSocketUrl);
        window.socket.close();
        window.socket = new WebSocket(newWebSocketUrl);
      }
    }
    
    // Update API base URL for any fetch requests
    if (config.API_BASE_URL) {
      window.API_BASE_URL = config.API_BASE_URL;
    }
    
    console.log('Frostfire Forge configuration applied:', config);
  }
  
  // Start the configuration process
  waitForConfig();
})(); 