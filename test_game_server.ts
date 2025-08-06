#!/usr/bin/env bun

import { spacetimeBridge } from './src/systems/spacetime_bridge';

/**
 * Test Game Server with SpacetimeDB Integration
 */
async function testGameServer() {
  console.log('🎮 Testing Game Server with SpacetimeDB Integration...');
  
  try {
    // Initialize the bridge
    console.log('🔌 Connecting to SpacetimeDB...');
    await spacetimeBridge.initialize();
    
    console.log('✅ Connected to SpacetimeDB successfully!');
    
    // Test basic functionality
    console.log('🧪 Testing game functionality...');
    
    // Test player movement
    console.log('🎮 Testing player movement...');
    await spacetimeBridge.movePlayer('test-player-1', 100, 150);
    
    // Test chat
    console.log('💬 Testing chat...');
    await spacetimeBridge.sendChat('test-player-1', 'Hello from the game server!');
    
    // Test item usage
    console.log('🎒 Testing item usage...');
    await spacetimeBridge.useItem('test-player-1', 'health_potion');
    
    // Get game state
    const gameState = spacetimeBridge.getGameState();
    console.log('📊 Current game state:', JSON.stringify(gameState, null, 2));
    
    // Test getting online players
    const onlinePlayers = await spacetimeBridge.getOnlinePlayers();
    console.log('👥 Online players:', onlinePlayers);
    
    // Test saying hello
    await spacetimeBridge.sayHello();
    
    console.log('✅ All tests completed successfully!');
    console.log('🎮 Game server is ready for multiplayer!');
    console.log('🌐 Web interface: http://localhost:3002');
    console.log('🔌 SpacetimeDB: http://localhost:3002');
    
    // Keep running for a bit to show it's working
    console.log('⏳ Server is running... Press Ctrl+C to stop');
    
    // Wait for 10 seconds to show it's working
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Final status check
    const finalState = spacetimeBridge.getGameState();
    console.log('📊 Final game state:', JSON.stringify(finalState, null, 2));
    
    await spacetimeBridge.disconnect();
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testGameServer().catch(console.error); 