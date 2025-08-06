#!/usr/bin/env bun

import { spacetimeBridge } from './src/systems/spacetime_bridge';

/**
 * Comprehensive test for SpacetimeDB bridge integration
 * 
 * This script tests the integration between the existing game server
 * and the new SpacetimeDB backend.
 */
async function testSpacetimeIntegration() {
  console.log('🧪 Testing SpacetimeDB Bridge Integration...');
  
  try {
    // Initialize the bridge
    console.log('🔄 Initializing SpacetimeDB bridge...');
    await spacetimeBridge.initialize();
    
    console.log('✅ Bridge initialized successfully');
    
    // Test bridge status
    const status = spacetimeBridge.getStatus();
    console.log('📊 Bridge status:', JSON.stringify(status, null, 2));
    
    // Test game state
    const gameState = spacetimeBridge.getGameState();
    console.log('📊 Initial game state:', JSON.stringify(gameState, null, 2));
    
    // Test player movement
    console.log('🎮 Testing player movement...');
    await spacetimeBridge.movePlayer('test-player-1', 100, 150);
    
    // Test chat message
    console.log('💬 Testing chat message...');
    await spacetimeBridge.sendChat('test-player-1', 'Hello from the bridge integration!');
    
    // Test item usage
    console.log('🎒 Testing item usage...');
    await spacetimeBridge.useItem('test-player-1', 'health_potion');
    
    // Test getting online players
    console.log('👥 Testing get online players...');
    const onlinePlayers = await spacetimeBridge.getOnlinePlayers();
    console.log('👥 Online players:', onlinePlayers);
    
    // Test saying hello
    console.log('👋 Testing say hello...');
    await spacetimeBridge.sayHello();
    
    // Wait for state sync
    console.log('⏳ Waiting for state synchronization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get updated game state
    const updatedGameState = spacetimeBridge.getGameState();
    console.log('📊 Updated game state:', JSON.stringify(updatedGameState, null, 2));
    
    // Test getting specific player
    console.log('👤 Testing get specific player...');
    const player = spacetimeBridge.getPlayer('test-player-1');
    console.log('👤 Player details:', player);
    
    // Test getting chat messages
    console.log('💬 Testing get chat messages...');
    const messages = spacetimeBridge.getChatMessages();
    console.log('💬 Chat messages:', messages);
    
    // Test connection status
    console.log('🔌 Testing connection status...');
    const isConnected = spacetimeBridge.isConnectedToSpacetimeDB();
    console.log('🔌 Connected to SpacetimeDB:', isConnected);
    
    // Final status check
    const finalStatus = spacetimeBridge.getStatus();
    console.log('📊 Final bridge status:', JSON.stringify(finalStatus, null, 2));
    
    console.log('✅ All integration tests completed successfully!');
    
    // Clean up
    console.log('🧹 Cleaning up...');
    await spacetimeBridge.disconnect();
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

// Run the integration test
testSpacetimeIntegration().catch(console.error); 