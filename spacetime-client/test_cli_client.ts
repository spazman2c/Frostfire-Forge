#!/usr/bin/env bun

import CLISpacetimeDBClient from './src/cli_client';

/**
 * Test script for the CLI-based SpacetimeDB client
 */
async function testCLIClient() {
  console.log('🧪 Testing CLI-based SpacetimeDB client...');
  
  const client = new CLISpacetimeDBClient();
  
  try {
    // Connect to SpacetimeDB
    console.log('🔌 Connecting to SpacetimeDB...');
    await client.connect();
    
    // Wait a bit for initial data to load
    console.log('⏳ Waiting for initial data...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test connection status
    const status = client.getConnectionStatus();
    console.log('📊 Connection status:', status);
    
    // Get database info
    console.log('📋 Getting database info...');
    await client.getDatabaseInfo();
    
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
    await client.sendChat('Hello from the CLI client!');
    
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
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Final state check
    console.log('📊 Final game state:');
    console.log(`- Players: ${client.getPlayers().length}`);
    console.log(`- Items: ${client.getItems().length}`);
    console.log(`- Chat messages: ${client.getChatMessages().length}`);
    
    // Show some details
    const players = client.getPlayers();
    if (players.length > 0) {
      console.log('👥 Player details:');
      players.forEach(player => {
        console.log(`  - ${player.username} at (${player.x}, ${player.y})`);
      });
    }
    
    const messages = client.getChatMessages();
    if (messages.length > 0) {
      console.log('💬 Chat messages:');
      messages.forEach(msg => {
        console.log(`  - ${msg.sender_identity}: ${msg.message}`);
      });
    }
    
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
testCLIClient().catch(console.error); 