"use strict";
// Simple SpacetimeDB client using HTTP requests
// This approach works around the SDK complexity
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleSpacetimeDBClient = void 0;
class SimpleSpacetimeDBClient {
    constructor(databaseName = 'frostfire-forge', serverUrl = 'http://localhost:3002') {
        this.isConnected = false;
        this.players = new Map();
        this.items = new Map();
        this.chatMessages = [];
        this.databaseName = databaseName;
        this.serverUrl = serverUrl;
    }
    /**
     * Connect to the SpacetimeDB database
     */
    async connect() {
        try {
            console.log(`🔌 Connecting to SpacetimeDB database: ${this.databaseName}`);
            // Test connection by making a simple HTTP request
            const response = await fetch(`${this.serverUrl}/health`);
            if (response.ok) {
                this.isConnected = true;
                console.log('✅ Connected to SpacetimeDB successfully!');
            }
            else {
                throw new Error(`Failed to connect: ${response.status}`);
            }
        }
        catch (error) {
            console.error('❌ Failed to connect to SpacetimeDB:', error);
            throw error;
        }
    }
    /**
     * Disconnect from the database
     */
    async disconnect() {
        this.isConnected = false;
        console.log('🔌 Disconnected from SpacetimeDB');
    }
    /**
     * Move player to new position
     */
    async movePlayer(x, y) {
        if (!this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            // Simulate the move by logging it
            console.log(`🎮 Player moved to (${x}, ${y})`);
            // In a real implementation, this would call the SpacetimeDB API
            // For now, we'll simulate the action
            await this.simulateAction('player_move', { x, y });
        }
        catch (error) {
            console.error('❌ Failed to move player:', error);
            throw error;
        }
    }
    /**
     * Send a chat message
     */
    async sendChat(message, channel = 'global') {
        if (!this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            console.log(`💬 Sent chat message: ${message}`);
            // Simulate the chat action
            await this.simulateAction('player_chat', { message, channel });
        }
        catch (error) {
            console.error('❌ Failed to send chat message:', error);
            throw error;
        }
    }
    /**
     * Use an item
     */
    async useItem(itemId) {
        if (!this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            console.log(`🎒 Used item: ${itemId}`);
            // Simulate the item usage
            await this.simulateAction('use_item', { item_id: itemId });
        }
        catch (error) {
            console.error('❌ Failed to use item:', error);
            throw error;
        }
    }
    /**
     * Get player information
     */
    async getPlayerInfo() {
        if (!this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            console.log('👤 Retrieved player info');
            await this.simulateAction('get_player_info', {});
        }
        catch (error) {
            console.error('❌ Failed to get player info:', error);
            throw error;
        }
    }
    /**
     * Get all online players
     */
    async getOnlinePlayers() {
        if (!this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            console.log('👥 Retrieved online players');
            await this.simulateAction('get_online_players', {});
        }
        catch (error) {
            console.error('❌ Failed to get online players:', error);
            throw error;
        }
    }
    /**
     * Say hello to all players
     */
    async sayHello() {
        if (!this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            console.log('👋 Said hello to all players');
            await this.simulateAction('say_hello', {});
        }
        catch (error) {
            console.error('❌ Failed to say hello:', error);
            throw error;
        }
    }
    /**
     * Simulate an action (for testing purposes)
     */
    async simulateAction(action, params) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log(`🎯 Simulated action: ${action}`, params);
        // Add some mock data for testing
        if (action === 'player_move') {
            const mockPlayer = {
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
            const mockMessage = {
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
    getPlayers() {
        return Array.from(this.players.values());
    }
    /**
     * Get all items
     */
    getItems() {
        return Array.from(this.items.values());
    }
    /**
     * Get chat messages
     */
    getChatMessages() {
        return this.chatMessages;
    }
    /**
     * Get player by identity
     */
    getPlayer(identity) {
        return this.players.get(identity);
    }
    /**
     * Get item by ID
     */
    getItem(id) {
        return this.items.get(id);
    }
    /**
     * Check if connected
     */
    isConnectedToGame() {
        return this.isConnected;
    }
    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            databaseName: this.databaseName,
            serverUrl: this.serverUrl
        };
    }
}
exports.SimpleSpacetimeDBClient = SimpleSpacetimeDBClient;
exports.default = SimpleSpacetimeDBClient;
//# sourceMappingURL=simple_client.js.map