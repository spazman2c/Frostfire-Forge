"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrostfireForgeClient = void 0;
const ws_1 = __importDefault(require("ws"));
class FrostfireForgeClient {
    constructor(serverUrl = 'ws://localhost:3002') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.players = new Map();
        this.items = new Map();
        this.chatMessages = [];
        this.messageId = 0;
    }
    // Connect to the game
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new ws_1.default(this.serverUrl);
                this.ws.on('open', () => {
                    console.log('Connected to Frostfire Forge!');
                    resolve();
                });
                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    }
                    catch (error) {
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
            }
            catch (error) {
                reject(error);
            }
        });
    }
    // Disconnect from the game
    async disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    // Handle incoming messages
    handleMessage(message) {
        console.log('Received message:', message);
        // Handle different message types
        if (message.type === 'player') {
            message.data.forEach((player) => {
                this.players.set(player.identity, player);
                console.log(`Player ${player.username} at (${player.x}, ${player.y})`);
            });
        }
        else if (message.type === 'item') {
            message.data.forEach((item) => {
                this.items.set(item.id, item);
                console.log(`Item: ${item.name} - ${item.description}`);
            });
        }
        else if (message.type === 'chat_message') {
            message.data.forEach((msg) => {
                this.chatMessages.push(msg);
                console.log(`[${msg.channel}] ${msg.sender_identity}: ${msg.message}`);
            });
        }
    }
    // Send a message to the server
    sendMessage(type, data) {
        if (!this.ws || this.ws.readyState !== ws_1.default.OPEN) {
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
    async movePlayer(x, y) {
        try {
            this.sendMessage('player_move', { x, y });
            console.log(`Moving to (${x}, ${y})`);
        }
        catch (error) {
            console.error('Failed to move player:', error);
            throw error;
        }
    }
    // Send chat message
    async sendChat(message, channel = 'global') {
        try {
            this.sendMessage('player_chat', { message, channel });
            console.log(`Sent message: ${message}`);
        }
        catch (error) {
            console.error('Failed to send chat message:', error);
            throw error;
        }
    }
    // Use an item
    async useItem(itemId) {
        try {
            this.sendMessage('use_item', { item_id: itemId });
            console.log(`Using item: ${itemId}`);
        }
        catch (error) {
            console.error('Failed to use item:', error);
            throw error;
        }
    }
    // Get player info
    async getPlayerInfo() {
        try {
            this.sendMessage('get_player_info', {});
        }
        catch (error) {
            console.error('Failed to get player info:', error);
            throw error;
        }
    }
    // Get online players
    async getOnlinePlayers() {
        try {
            this.sendMessage('get_online_players', {});
        }
        catch (error) {
            console.error('Failed to get online players:', error);
            throw error;
        }
    }
    // Say hello to all players
    async sayHello() {
        try {
            this.sendMessage('say_hello', {});
        }
        catch (error) {
            console.error('Failed to say hello:', error);
            throw error;
        }
    }
    // Get all players
    getPlayers() {
        return Array.from(this.players.values());
    }
    // Get all items
    getItems() {
        return Array.from(this.items.values());
    }
    // Get chat messages
    getChatMessages() {
        return this.chatMessages;
    }
    // Get player by identity
    getPlayer(identity) {
        return this.players.get(identity);
    }
    // Get item by ID
    getItem(id) {
        return this.items.get(id);
    }
}
exports.FrostfireForgeClient = FrostfireForgeClient;
// Test the SpacetimeDB module directly
async function testSpacetimeDBModule() {
    console.log('Testing SpacetimeDB module...');
    // Test the module by calling the SpacetimeDB CLI
    const { exec } = require('child_process');
    try {
        // List databases
        exec('export PATH="/Users/christophersantangelo/.local/bin:$PATH" && spacetime list', (error, stdout, stderr) => {
            if (error) {
                console.error('Error listing databases:', error);
                return;
            }
            console.log('Available databases:', stdout);
        });
        // Describe the frostfire-forge database
        exec('export PATH="/Users/christophersantangelo/.local/bin:$PATH" && spacetime describe frostfire-forge', (error, stdout, stderr) => {
            if (error) {
                console.error('Error describing database:', error);
                return;
            }
            console.log('Database description:', stdout);
        });
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await client.disconnect();
    }
}
// Run the example if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
exports.default = FrostfireForgeClient;
//# sourceMappingURL=index.js.map