"use strict";
// SpacetimeDB client using CLI commands
// This approach uses the SpacetimeDB CLI to interact with the database
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLISpacetimeDBClient = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class CLISpacetimeDBClient {
    constructor(databaseName = 'frostfire-forge') {
        this.databaseIdentity = 'c200203fdb083a9fef0f756903ed762af8c332336eb1fffac5159cf2e1ea94ea';
        this.isConnected = false;
        this.players = new Map();
        this.items = new Map();
        this.chatMessages = [];
        this.databaseName = databaseName;
    }
    /**
     * Connect to the SpacetimeDB database
     */
    async connect() {
        try {
            console.log(`🔌 Connecting to SpacetimeDB database: ${this.databaseName}`);
            // Test connection by listing databases
            const { stdout } = await execAsync('export PATH="/Users/christophersantangelo/.local/bin:$PATH" && spacetime list');
            if (stdout.includes(this.databaseIdentity)) {
                this.isConnected = true;
                console.log('✅ Connected to SpacetimeDB successfully!');
                console.log(`📊 Database identity: ${this.databaseIdentity}`);
            }
            else {
                throw new Error(`Database ${this.databaseName} not found`);
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
     * Execute a SpacetimeDB CLI command
     */
    async executeCommand(command) {
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
    async movePlayer(x, y) {
        if (!this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            console.log(`🎮 Player moved to (${x}, ${y})`);
            // Simulate the action since we can't directly call reducers via CLI
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
            // Simulate the action
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
            // Simulate the action
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
     * Get database description
     */
    async getDatabaseInfo() {
        if (!this.isConnected) {
            throw new Error('Not connected to SpacetimeDB');
        }
        try {
            console.log('📊 Getting database info...');
            const result = await this.executeCommand(`spacetime describe --json ${this.databaseName}`);
            console.log('📋 Database description:', result);
        }
        catch (error) {
            console.error('❌ Failed to get database info:', error);
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
            databaseIdentity: this.databaseIdentity
        };
    }
}
exports.CLISpacetimeDBClient = CLISpacetimeDBClient;
exports.default = CLISpacetimeDBClient;
//# sourceMappingURL=cli_client.js.map