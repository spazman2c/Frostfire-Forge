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
export declare class FrostfireForgeClient {
    private serverUrl;
    private ws;
    private players;
    private items;
    private chatMessages;
    private messageId;
    constructor(serverUrl?: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private handleMessage;
    private sendMessage;
    movePlayer(x: number, y: number): Promise<void>;
    sendChat(message: string, channel?: string): Promise<void>;
    useItem(itemId: string): Promise<void>;
    getPlayerInfo(): Promise<void>;
    getOnlinePlayers(): Promise<void>;
    sayHello(): Promise<void>;
    getPlayers(): Player[];
    getItems(): Item[];
    getChatMessages(): ChatMessage[];
    getPlayer(identity: string): Player | undefined;
    getItem(id: string): Item | undefined;
}
export default FrostfireForgeClient;
//# sourceMappingURL=index.d.ts.map