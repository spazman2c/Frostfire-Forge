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
export declare class SpacetimeDBClient {
    private databaseName;
    private serverUrl;
    private db;
    private players;
    private items;
    private chatMessages;
    private isConnected;
    constructor(databaseName?: string, serverUrl?: string);
    /**
     * Connect to the SpacetimeDB database
     */
    connect(): Promise<void>;
    /**
     * Set up subscriptions for real-time data updates
     */
    private setupSubscriptions;
    /**
     * Disconnect from the database
     */
    disconnect(): Promise<void>;
    /**
     * Move player to new position
     */
    movePlayer(x: number, y: number): Promise<void>;
    /**
     * Send a chat message
     */
    sendChat(message: string, channel?: string): Promise<void>;
    /**
     * Use an item
     */
    useItem(itemId: string): Promise<void>;
    /**
     * Get player information
     */
    getPlayerInfo(): Promise<void>;
    /**
     * Get all online players
     */
    getOnlinePlayers(): Promise<void>;
    /**
     * Say hello to all players
     */
    sayHello(): Promise<void>;
    /**
     * Get all players
     */
    getPlayers(): Player[];
    /**
     * Get all items
     */
    getItems(): Item[];
    /**
     * Get chat messages
     */
    getChatMessages(): ChatMessage[];
    /**
     * Get player by identity
     */
    getPlayer(identity: string): Player | undefined;
    /**
     * Get item by ID
     */
    getItem(id: string): Item | undefined;
    /**
     * Check if connected
     */
    isConnectedToGame(): boolean;
    /**
     * Get connection status
     */
    getConnectionStatus(): {
        connected: boolean;
        databaseName: string;
        serverUrl: string;
    };
}
export default SpacetimeDBClient;
//# sourceMappingURL=spacetime_client.d.ts.map