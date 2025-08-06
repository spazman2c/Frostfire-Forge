// SpacetimeDB client using CLI commands
// This approach uses the SpacetimeDB CLI to interact with the database

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

export class CLISpacetimeDBClient {
  private databaseName: string;
  private databaseIdentity: string = 'c200203fdb083a9fef0f756903ed762af8c332336eb1fffac5159cf2e1ea94ea';
  private isConnected = false;
  private players: Map<string, Player> = new Map();
  private items: Map<string, Item> = new Map();
  private chatMessages: ChatMessage[] = [];

  constructor(databaseName: string = 'frostfire-forge') {
    this.databaseName = databaseName;
  }

  /**
   * Connect to the SpacetimeDB database
   */
  async connect(): Promise<void> {
    try {
      console.log(`🔌 Connecting to SpacetimeDB database: ${this.databaseName}`);
      
      // Test connection by listing databases
      const { stdout } = await execAsync('export PATH="/Users/christophersantangelo/.local/bin:$PATH" && spacetime list');
      
      if (stdout.includes(this.databaseIdentity)) {
        this.isConnected = true;
        console.log('✅ Connected to SpacetimeDB successfully!');
        console.log(`📊 Database identity: ${this.databaseIdentity}`);
      } else {
        throw new Error(`Database ${this.databaseName} not found`);
      }
      
    } catch (error) {
      console.error('❌ Failed to connect to SpacetimeDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 Disconnected from SpacetimeDB');
  }

  /**
   * Execute a SpacetimeDB CLI command
   */
  private async executeCommand(command: string): Promise<string> {
    const fullCommand = `export PATH="/Users/christophersantangelo/.local/bin:$PATH" && ${command}`;
    const { stdout, stderr } = await execAsync(fullCommand);
    
    if (stderr) {
      console.warn('⚠️ Command stderr:', stderr);
    }
    
    return stdout;
  }

  /**
   * Move player to new position
   */
  async movePlayer(x: number, y: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SpacetimeDB');
    }
    
    try {
      console.log(`🎮 Player moved to (${x}, ${y})`);
      
      // Simulate the action since we can't directly call reducers via CLI
      await this.simulateAction('player_move', { x, y });
      
    } catch (error) {
      console.error('❌ Failed to move player:', error);
      throw error;
    }
  }

  /**
   * Send a chat message
   */
  async sendChat(message: string, channel: string = 'global'): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SpacetimeDB');
    }
    
    try {
      console.log(`💬 Sent chat message: ${message}`);
      
      // Simulate the action
      await this.simulateAction('player_chat', { message, channel });
      
    } catch (error) {
      console.error('❌ Failed to send chat message:', error);
      throw error;
    }
  }

  /**
   * Use an item
   */
  async useItem(itemId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SpacetimeDB');
    }
    
    try {
      console.log(`🎒 Used item: ${itemId}`);
      
      // Simulate the action
      await this.simulateAction('use_item', { item_id: itemId });
      
    } catch (error) {
      console.error('❌ Failed to use item:', error);
      throw error;
    }
  }

  /**
   * Get player information
   */
  async getPlayerInfo(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SpacetimeDB');
    }
    
    try {
      console.log('👤 Retrieved player info');
      await this.simulateAction('get_player_info', {});
      
    } catch (error) {
      console.error('❌ Failed to get player info:', error);
      throw error;
    }
  }

  /**
   * Get all online players
   */
  async getOnlinePlayers(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SpacetimeDB');
    }
    
    try {
      console.log('👥 Retrieved online players');
      await this.simulateAction('get_online_players', {});
      
    } catch (error) {
      console.error('❌ Failed to get online players:', error);
      throw error;
    }
  }

  /**
   * Say hello to all players
   */
  async sayHello(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SpacetimeDB');
    }
    
    try {
      console.log('👋 Said hello to all players');
      await this.simulateAction('say_hello', {});
      
    } catch (error) {
      console.error('❌ Failed to say hello:', error);
      throw error;
    }
  }

  /**
   * Get database description
   */
  async getDatabaseInfo(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SpacetimeDB');
    }
    
    try {
      console.log('📊 Getting database info...');
      const result = await this.executeCommand(`spacetime describe --json ${this.databaseName}`);
      console.log('📋 Database description:', result);
      
    } catch (error) {
      console.error('❌ Failed to get database info:', error);
      throw error;
    }
  }

  /**
   * Simulate an action (for testing purposes)
   */
  private async simulateAction(action: string, params: any): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`🎯 Simulated action: ${action}`, params);
    
    // Add some mock data for testing
    if (action === 'player_move') {
      const mockPlayer: Player = {
        identity: 'test-player',
        username: 'TestPlayer',
        x: params.x,
        y: params.y,
        health: 100,
        max_health: 100,
        mana: 50,
        max_mana: 50,
        level: 1,
        experience: 0,
        gold: 0,
        online: true,
        last_seen: Date.now(),
        world: 'default'
      };
      this.players.set(mockPlayer.identity, mockPlayer);
    }
    
    if (action === 'player_chat') {
      const mockMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        sender_identity: 'test-player',
        message: params.message,
        channel: params.channel,
        timestamp: Date.now()
      };
      this.chatMessages.push(mockMessage);
    }
  }

  /**
   * Get all players
   */
  getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  /**
   * Get all items
   */
  getItems(): Item[] {
    return Array.from(this.items.values());
  }

  /**
   * Get chat messages
   */
  getChatMessages(): ChatMessage[] {
    return this.chatMessages;
  }

  /**
   * Get player by identity
   */
  getPlayer(identity: string): Player | undefined {
    return this.players.get(identity);
  }

  /**
   * Get item by ID
   */
  getItem(id: string): Item | undefined {
    return this.items.get(id);
  }

  /**
   * Check if connected
   */
  isConnectedToGame(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; databaseName: string; databaseIdentity: string } {
    return {
      connected: this.isConnected,
      databaseName: this.databaseName,
      databaseIdentity: this.databaseIdentity
    };
  }
}

export default CLISpacetimeDBClient; 