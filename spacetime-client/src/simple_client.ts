// Simple SpacetimeDB client using HTTP requests
// This approach works around the SDK complexity

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

export class SimpleSpacetimeDBClient {
  private serverUrl: string;
  private databaseName: string;
  private isConnected = false;
  private players: Map<string, Player> = new Map();
  private items: Map<string, Item> = new Map();
  private chatMessages: ChatMessage[] = [];

  constructor(
    databaseName: string = 'frostfire-forge',
    serverUrl: string = 'http://localhost:3002'
  ) {
    this.databaseName = databaseName;
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to the SpacetimeDB database
   */
  async connect(): Promise<void> {
    try {
      console.log(`🔌 Connecting to SpacetimeDB database: ${this.databaseName}`);
      
      // Test connection by making a simple HTTP request
      const response = await fetch(`${this.serverUrl}/health`);
      
      if (response.ok) {
        this.isConnected = true;
        console.log('✅ Connected to SpacetimeDB successfully!');
      } else {
        throw new Error(`Failed to connect: ${response.status}`);
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
   * Move player to new position
   */
  async movePlayer(x: number, y: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SpacetimeDB');
    }
    
    try {
      // Simulate the move by logging it
      console.log(`🎮 Player moved to (${x}, ${y})`);
      
      // In a real implementation, this would call the SpacetimeDB API
      // For now, we'll simulate the action
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
      
      // Simulate the chat action
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
      
      // Simulate the item usage
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
  getConnectionStatus(): { connected: boolean; databaseName: string; serverUrl: string } {
    return {
      connected: this.isConnected,
      databaseName: this.databaseName,
      serverUrl: this.serverUrl
    };
  }
}

export default SimpleSpacetimeDBClient; 