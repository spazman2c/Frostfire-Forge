#!/usr/bin/env bun

import { spacetimeBridge } from './src/systems/spacetime_bridge';

/**
 * Test script for SpacetimeDB Bridge
 * 
 * This script tests the integration between the existing game server
 * and the new SpacetimeDB backend.
 */
async function testSpacetimeBridge() {
  console.log('🧪 Testing SpacetimeDB Bridge...');
  
  try {
    // Initialize the bridge
    await spacetimeBridge.initialize();
    
    console.log('✅ Bridge initialized successfully');
    
    // Test game state
    const gameState = spacetimeBridge.getGameState();
    console.log('📊 Initial game state:', gameState);
    
    // Test player movement
    await spacetimeBridge.movePlayer('test-player-1', 100, 150);
    
    // Test chat message
    await spacetimeBridge.sendChat('test-player-1', 'Hello from the bridge!');
    
    // Test item usage
    await spacetimeBridge.useItem('health_potion');
    
    // Get online players
    const players = await spacetimeBridge.getOnlinePlayers();
    console.log('👥 Online players:', players.length);
    
    // Get items
    const items = spacetimeBridge.getItems();
    console.log('🎒 Available items:', items.length);
    
    // Get chat messages
    const messages = spacetimeBridge.getChatMessages();
    console.log('💬 Chat messages:', messages.length);
    
    // Wait a bit to see real-time updates
    console.log('⏳ Waiting for real-time updates...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get updated game state
    const updatedGameState = spacetimeBridge.getGameState();
    console.log('📊 Updated game state:', updatedGameState);
    
    console.log('✅ All bridge tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Bridge test failed:', error);
  } finally {
    // Clean up
    await spacetimeBridge.disconnect();
    console.log('🧹 Bridge test cleanup completed');
  }
}

// Run the test
testSpacetimeBridge().catch(console.error); 