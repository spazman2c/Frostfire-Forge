#!/usr/bin/env bun

import { spacetimeBridge } from './src/systems/spacetime_bridge';

/**
 * Initialize SpacetimeDB Bridge
 * 
 * This script initializes the SpacetimeDB bridge to connect
 * the running game server with the SpacetimeDB backend.
 */
async function initializeSpacetimeBridge() {
  console.log('🚀 Initializing SpacetimeDB Bridge...');
  
  try {
    // Initialize the bridge
    await spacetimeBridge.initialize();
    
    console.log('✅ SpacetimeDB Bridge initialized successfully!');
    
    // Get initial status
    const status = spacetimeBridge.getStatus();
    console.log('📊 Bridge Status:', JSON.stringify(status, null, 2));
    
    // Test basic functionality
    console.log('🧪 Testing bridge functionality...');
    
    // Test saying hello
    await spacetimeBridge.sayHello();
    
    // Test getting online players
    const onlinePlayers = await spacetimeBridge.getOnlinePlayers();
    console.log('👥 Online players:', onlinePlayers);
    
    // Test getting game state
    const gameState = spacetimeBridge.getGameState();
    console.log('📊 Game state:', JSON.stringify(gameState, null, 2));
    
    console.log('✅ Bridge initialization and testing completed!');
    console.log('🎮 Game server is now connected to SpacetimeDB!');
    console.log('🌐 Web interface available at: http://localhost:3002');
    console.log('🔌 SpacetimeDB server running on: http://localhost:3002');
    
    // Keep the bridge running
    console.log('⏳ Bridge is running... Press Ctrl+C to stop');
    
    // Keep the process alive
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down SpacetimeDB bridge...');
      await spacetimeBridge.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize SpacetimeDB bridge:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeSpacetimeBridge().catch(console.error); 