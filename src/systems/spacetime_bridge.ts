import CLISpacetimeDBClient from '../../spacetime-client/src/cli_client';

/**
 * SpacetimeDB Bridge System
 * 
 * This system bridges the existing Frostfire Forge game server
 * with the new SpacetimeDB backend for real-time multiplayer.
 */
export class SpacetimeBridge {
  private client: CLISpacetimeDBClient;
  private isConnected = false;
  private gameState: any = {};
  private players: Map<string, any> = new Map();
  private items: Map<string, any> = new Map();
  private chatMessages: any[] = [];

  constructor() {
    this.client = new CLISpacetimeDBClient('frostfire-forge');
  }

  /**
   * Initialize the SpacetimeDB bridge
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing SpacetimeDB bridge...');
      
      // Connect to SpacetimeDB
      await this.client.connect();
      this.isConnected = true;
      
      console.log('✅ SpacetimeDB bridge connected successfully!');
      
      // Get initial database info
      await this.client.getDatabaseInfo();
      
      // Set up periodic state sync
      this.startStateSync();
      
    } catch (error) {
      console.error('❌ Failed to initialize SpacetimeDB bridge:', error);
      throw error;
    }
  }

  /**
   * Start periodic state synchronization
   */
  private startStateSync(): void {
    setInterval(async () => {
      if (this.isConnected) {
        try {
          // Sync players
          const players = this.client.getPlayers();
          players.forEach(player => {
            this.players.set(player.identity, player);
          });
          
          // Sync items
          const items = this.client.getItems();
          items.forEach(item => {
            this.items.set(item.id, item);
          });
          
          // Sync chat messages
          const messages = this.client.getChatMessages();
          this.chatMessages = messages;
          
          console.log(`🔄 State sync: ${players.length} players, ${items.length} items, ${messages.length} messages`);
          
        } catch (error) {
          console.error('❌ State sync failed:', error);
        }
      }
    }, 5000); // Sync every 5 seconds
  }

  /**
   * Move a player in the game
   */
  async movePlayer(playerId: string, x: number, y: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('SpacetimeDB bridge not connected');
    }
    
    try {
      await this.client.movePlayer(x, y);
      
      // Update local state
      const player = this.players.get(playerId);
      if (player) {
        player.x = x;
        player.y = y;
        this.players.set(playerId, player);
      }
      
      console.log(`🎮 Player ${playerId} moved to (${x}, ${y})`);
      
    } catch (error) {
      console.error('❌ Failed to move player:', error);
      throw error;
    }
  }

  /**
   * Send a chat message
   */
  async sendChat(playerId: string, message: string, channel: string = 'global'): Promise<void> {
    if (!this.isConnected) {
      throw new Error('SpacetimeDB bridge not connected');
    }
    
    try {
      await this.client.sendChat(message, channel);
      
      // Add to local state
      const chatMessage = {
        id: `msg_${Date.now()}`,
        sender_identity: playerId,
        message: message,
        channel: channel,
        timestamp: Date.now()
      };
      this.chatMessages.push(chatMessage);
      
      console.log(`💬 Player ${playerId} sent message: ${message}`);
      
    } catch (error) {
      console.error('❌ Failed to send chat message:', error);
      throw error;
    }
  }

  /**
   * Use an item
   */
  async useItem(playerId: string, itemId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('SpacetimeDB bridge not connected');
    }
    
    try {
      await this.client.useItem(itemId);
      
      console.log(`🎒 Player ${playerId} used item: ${itemId}`);
      
    } catch (error) {
      console.error('❌ Failed to use item:', error);
      throw error;
    }
  }

  /**
   * Get player information
   */
  async getPlayerInfo(playerId: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('SpacetimeDB bridge not connected');
    }
    
    try {
      await this.client.getPlayerInfo();
      
      const player = this.players.get(playerId);
      return player || null;
      
    } catch (error) {
      console.error('❌ Failed to get player info:', error);
      throw error;
    }
  }

  /**
   * Get all online players
   */
  async getOnlinePlayers(): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error('SpacetimeDB bridge not connected');
    }
    
    try {
      await this.client.getOnlinePlayers();
      
      return Array.from(this.players.values());
      
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
      throw new Error('SpacetimeDB bridge not connected');
    }
    
    try {
      await this.client.sayHello();
      console.log('👋 Said hello to all players');
      
    } catch (error) {
      console.error('❌ Failed to say hello:', error);
      throw error;
    }
  }

  /**
   * Get current game state
   */
  getGameState(): any {
    return {
      connected: this.isConnected,
      players: Array.from(this.players.values()),
      items: Array.from(this.items.values()),
      chatMessages: this.chatMessages,
      playerCount: this.players.size,
      itemCount: this.items.size,
      messageCount: this.chatMessages.length
    };
  }

  /**
   * Get a specific player
   */
  getPlayer(playerId: string): any {
    return this.players.get(playerId);
  }

  /**
   * Get a specific item
   */
  getItem(itemId: string): any {
    return this.items.get(itemId);
  }

  /**
   * Get chat messages
   */
  getChatMessages(): any[] {
    return this.chatMessages;
  }

  /**
   * Check if bridge is connected
   */
  isConnectedToSpacetimeDB(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from SpacetimeDB
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('🔌 SpacetimeDB bridge disconnected');
    }
  }

  /**
   * Get bridge status
   */
  getStatus(): any {
    return {
      connected: this.isConnected,
      clientStatus: this.client.getConnectionStatus(),
      gameState: this.getGameState()
    };
  }
}

// Create a singleton instance
export const spacetimeBridge = new SpacetimeBridge(); 