import WebSocket from 'ws';

// Game types based on the SpacetimeDB module
export interface Player {
  identity: string;
  username: string;
  x: number;
  y: number;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  level: number;
  experience: number;
  gold: number;
  online: boolean;
  last_seen: number;
  world: string;
  party_id?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  item_type: string;
  damage?: number;
  armor?: number;
  mana?: number;
  health?: number;
  quality: string;
  icon: string;
}

export interface ChatMessage {
  id: string;
  sender_identity: string;
  message: string;
  channel: string;
  timestamp: number;
}

export class FrostfireForgeClient {
  private ws: WebSocket | null = null;
  private players: Map<string, Player> = new Map();
  private items: Map<string, Item> = new Map();
  private chatMessages: ChatMessage[] = [];
  private messageId = 0;

  constructor(private serverUrl: string = 'ws://localhost:3002') {}

  // Connect to the game
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.on('open', () => {
          console.log('Connected to Frostfire Forge!');
          resolve();
        });
        
        this.ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        });
        
        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });
        
        this.ws.on('close', () => {
          console.log('Disconnected from Frostfire Forge');
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Disconnect from the game
  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Handle incoming messages
  private handleMessage(message: any) {
    console.log('Received message:', message);
    
    // Handle different message types
    if (message.type === 'player') {
      message.data.forEach((player: Player) => {
        this.players.set(player.identity, player);
        console.log(`Player ${player.username} at (${player.x}, ${player.y})`);
      });
    } else if (message.type === 'item') {
      message.data.forEach((item: Item) => {
        this.items.set(item.id, item);
        console.log(`Item: ${item.name} - ${item.description}`);
      });
    } else if (message.type === 'chat_message') {
      message.data.forEach((msg: ChatMessage) => {
        this.chatMessages.push(msg);
        console.log(`[${msg.channel}] ${msg.sender_identity}: ${msg.message}`);
      });
    }
  }

  // Send a message to the server
  private sendMessage(type: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    const message = {
      id: ++this.messageId,
      type,
      data
    };
    
    this.ws.send(JSON.stringify(message));
  }

  // Move player
  async movePlayer(x: number, y: number): Promise<void> {
    try {
      this.sendMessage('player_move', { x, y });
      console.log(`Moving to (${x}, ${y})`);
    } catch (error) {
      console.error('Failed to move player:', error);
      throw error;
    }
  }

  // Send chat message
  async sendChat(message: string, channel: string = 'global'): Promise<void> {
    try {
      this.sendMessage('player_chat', { message, channel });
      console.log(`Sent message: ${message}`);
    } catch (error) {
      console.error('Failed to send chat message:', error);
      throw error;
    }
  }

  // Use an item
  async useItem(itemId: string): Promise<void> {
    try {
      this.sendMessage('use_item', { item_id: itemId });
      console.log(`Using item: ${itemId}`);
    } catch (error) {
      console.error('Failed to use item:', error);
      throw error;
    }
  }

  // Get player info
  async getPlayerInfo(): Promise<void> {
    try {
      this.sendMessage('get_player_info', {});
    } catch (error) {
      console.error('Failed to get player info:', error);
      throw error;
    }
  }

  // Get online players
  async getOnlinePlayers(): Promise<void> {
    try {
      this.sendMessage('get_online_players', {});
    } catch (error) {
      console.error('Failed to get online players:', error);
      throw error;
    }
  }

  // Say hello to all players
  async sayHello(): Promise<void> {
    try {
      this.sendMessage('say_hello', {});
    } catch (error) {
      console.error('Failed to say hello:', error);
      throw error;
    }
  }

  // Get all players
  getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  // Get all items
  getItems(): Item[] {
    return Array.from(this.items.values());
  }

  // Get chat messages
  getChatMessages(): ChatMessage[] {
    return this.chatMessages;
  }

  // Get player by identity
  getPlayer(identity: string): Player | undefined {
    return this.players.get(identity);
  }

  // Get item by ID
  getItem(id: string): Item | undefined {
    return this.items.get(id);
  }
}

// Test the SpacetimeDB module directly
async function testSpacetimeDBModule() {
  console.log('Testing SpacetimeDB module...');
  
  // Test the module by calling the SpacetimeDB CLI
  const { exec } = require('child_process');
  
  try {
    // List databases
    exec('export PATH="/Users/christophersantangelo/.local/bin:$PATH" && spacetime list', (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('Error listing databases:', error);
        return;
      }
      console.log('Available databases:', stdout);
    });
    
    // Describe the frostfire-forge database
    exec('export PATH="/Users/christophersantangelo/.local/bin:$PATH" && spacetime describe frostfire-forge', (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('Error describing database:', error);
        return;
      }
      console.log('Database description:', stdout);
    });
    
  } catch (error) {
    console.error('Error testing module:', error);
  }
}

// Example usage
async function main() {
  console.log('Starting Frostfire Forge SpacetimeDB test...');
  
  // First test the module directly
  await testSpacetimeDBModule();
  
  // Then test the client
  const client = new FrostfireForgeClient();
  
  try {
    await client.connect();
    
    // Wait a bit for initial data to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get online players
    await client.getOnlinePlayers();
    
    // Say hello
    await client.sayHello();
    
    // Move player
    await client.movePlayer(150, 200);
    
    // Send a chat message
    await client.sendChat('Hello, Frostfire Forge!');
    
    // Use an item
    await client.useItem('health_potion');
    
    console.log('Available players:', client.getPlayers().length);
    console.log('Available items:', client.getItems().length);
    
    // Keep the connection alive for a bit
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.disconnect();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default FrostfireForgeClient; 