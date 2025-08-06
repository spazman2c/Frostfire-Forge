"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpacetimeDBClient = void 0;
// Import the available exports from the SpacetimeDB SDK
const spacetimedb_sdk_1 = require("@clockworklabs/spacetimedb-sdk");
class SpacetimeDBClient {
    constructor(databaseName = 'frostfire-forge', serverUrl = 'ws://localhost:3002') {
        this.databaseName = databaseName;
        this.serverUrl = serverUrl;
        this.db = null;
        this.players = new Map();
        this.items = new Map();
        this.chatMessages = [];
        this.isConnected = false;
    }
    /**
     * Connect to the SpacetimeDB database
     */
    async connect() {
        try {
            console.log(`🔌 Connecting to SpacetimeDB database: ${this.databaseName}`);
            // Create connection using the builder pattern
            this.db = new spacetimedb_sdk_1.DbConnectionBuilder()
                .setHost(this.serverUrl)
                .setDatabase(this.databaseName)
                .build();
            // Connect to the database
            await this.db.connect();
            this.isConnected = true;
            console.log('✅ Connected to SpacetimeDB successfully!');
            // Set up subscriptions for real-time updates
            this.setupSubscriptions();
        }
        catch (error) {
            console.error('❌ Failed to connect to SpacetimeDB:', error);
            throw error;
        }
    }
    /**
     * Set up subscriptions for real-time data updates
     */
    setupSubscriptions() {
        if (!this.db)
            return;
        try {
            // Subscribe to player updates
            this.db.subscribe(['player'], (tableName, row, operation) => {
                console.log(`📊 Player ${operation}:`, row);
                if (operation === 'insert' || operation === 'update') {
                    this.players.set(row.identity, row);
                }
                else if (operation === 'delete') {
                    this.players.delete(row.identity);
                }
            });
            // Subscribe to item updates
            this.db.subscribe(['item'], (tableName, row, operation) => {
                console.log(`📦 Item ${operation}:`, row);
                if (operation === 'insert' || operation === 'update') {
                    this.items.set(row.id, row);
                }
                else if (operation === 'delete') {
                    this.items.delete(row.id);
                }
            });
            // Subscribe to chat message updates
            this.db.subscribe(['chat_message'], (tableName, row, operation) => {
                console.log(`💬 Chat ${operation}:`, row);
                if (operation === 'insert') {
                    this.chatMessages.push(row);
                }
            });
            console.log('📡 Subscriptions set up successfully');
        }
        catch (error) {
            console.error('❌ Failed to set up subscriptions:', error);
        }
    }
    /**
     * Disconnect from the database
     */
    async disconnect() {
        if (this.db && this.isConnected) {
            await this.db.disconnect();
            this.db = null;
            this.isConnected = false;
            console.log('🔌 Disconnected from SpacetimeDB');
        }
    }
    /**
     * Move player to new position
     */
    async movePlayer(x, y) {
        if (!this.db || !this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            await this.db.call('player_move', [x, y]);
            console.log(`🎮 Player moved to (${x}, ${y})`);
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
        if (!this.db || !this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            await this.db.call('player_chat', [message, channel]);
            console.log(`💬 Sent chat message: ${message}`);
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
        if (!this.db || !this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            await this.db.call('use_item', [itemId]);
            console.log(`🎒 Used item: ${itemId}`);
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
        if (!this.db || !this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            await this.db.call('get_player_info', []);
            console.log('👤 Retrieved player info');
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
        if (!this.db || !this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            await this.db.call('get_online_players', []);
            console.log('👥 Retrieved online players');
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
        if (!this.db || !this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            await this.db.call('say_hello', []);
            console.log('👋 Said hello to all players');
        }
        catch (error) {
            console.error('❌ Failed to say hello:', error);
            throw error;
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
exports.SpacetimeDBClient = SpacetimeDBClient;
exports.default = SpacetimeDBClient;
//# sourceMappingURL=spacetime_client.js.map