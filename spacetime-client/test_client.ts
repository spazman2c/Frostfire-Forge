#!/usr/bin/env bun

import SpacetimeDBClient from './src/spacetime_client';

/**
 * Test script for the new SpacetimeDB client
 */
async function testSpacetimeDBClient() {
  console.log('🧪 Testing new SpacetimeDB client...');
  
  const client = new SpacetimeDBClient();
  
  try {
    // Connect to SpacetimeDB
    console.log('🔌 Connecting to SpacetimeDB...');
    await client.connect();
    
    // Wait a bit for initial data to load
    console.log('⏳ Waiting for initial data...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test connection status
    const status = client.getConnectionStatus();
    console.log('📊 Connection status:', status);
    
    // Test getting online players
    console.log('👥 Getting online players...');
    await client.getOnlinePlayers();
    
    // Test saying hello
    console.log('👋 Saying hello...');
    await client.sayHello();
    
    // Test player movement
    console.log('🎮 Testing player movement...');
    await client.movePlayer(150, 200);
    
    // Test sending chat
    console.log('💬 Testing chat...');
    await client.sendChat('Hello from the new client!');
    
    // Test using an item
    console.log('🎒 Testing item usage...');
    await client.useItem('health_potion');
    
    // Get current game state
    console.log('📊 Current game state:');
    console.log(`- Players: ${client.getPlayers().length}`);
    console.log(`- Items: ${client.getItems().length}`);
    console.log(`- Chat messages: ${client.getChatMessages().length}`);
    
    // Wait for real-time updates
    console.log('⏳ Waiting for real-time updates...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Final state check
    console.log('📊 Final game state:');
    console.log(`- Players: ${client.getPlayers().length}`);
    console.log(`- Items: ${client.getItems().length}`);
    console.log(`- Chat messages: ${client.getChatMessages().length}`);
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await client.disconnect();
    console.log('🧹 Test cleanup completed');
  }
}

// Run the test
testSpacetimeDBClient().catch(console.error); 