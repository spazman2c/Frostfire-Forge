use spacetimedb::{ReducerContext, Table};
use serde::{Deserialize, Serialize};

// Game Tables
#[spacetimedb::table(name = player)]
pub struct Player {
    identity: String,
    username: String,
    x: f32,
    y: f32,
    health: i32,
    max_health: i32,
    mana: i32,
    max_mana: i32,
    level: i32,
    experience: i32,
    gold: i32,
    online: bool,
    last_seen: u64, // Unix timestamp
    world: String,
    party_id: Option<String>,
}

#[spacetimedb::table(name = item)]
pub struct Item {
    id: String,
    name: String,
    description: String,
    item_type: String,
    damage: Option<i32>,
    armor: Option<i32>,
    mana: Option<i32>,
    health: Option<i32>,
    quality: String,
    icon: String,
}

#[spacetimedb::table(name = chat_message)]
pub struct ChatMessage {
    id: String,
    sender_identity: String,
    message: String,
    channel: String,
    timestamp: u64, // Unix timestamp
}

// Initialize the database
#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {
    log::info!("Initializing Frostfire Forge game database...");
    
    // Create some default items
    let items = vec![
        Item {
            id: "health_potion".to_string(),
            name: "Health Potion".to_string(),
            description: "Restores 50 health points".to_string(),
            item_type: "consumable".to_string(),
            damage: None,
            armor: None,
            mana: None,
            health: Some(50),
            quality: "common".to_string(),
            icon: "health_potion".to_string(),
        },
        Item {
            id: "mana_potion".to_string(),
            name: "Mana Potion".to_string(),
            description: "Restores 30 mana points".to_string(),
            item_type: "consumable".to_string(),
            damage: None,
            armor: None,
            mana: Some(30),
            health: None,
            quality: "common".to_string(),
            icon: "mana_potion".to_string(),
        },
        Item {
            id: "iron_sword".to_string(),
            name: "Iron Sword".to_string(),
            description: "A basic iron sword".to_string(),
            item_type: "weapon".to_string(),
            damage: Some(15),
            armor: None,
            mana: None,
            health: None,
            quality: "common".to_string(),
            icon: "iron_sword".to_string(),
        },
    ];
    
    for item in items {
        ctx.db.item().insert(item);
    }
    
    log::info!("Frostfire Forge database initialized successfully!");
}

// Called when a client connects
#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) {
    let identity = ctx.sender.to_string();
    log::info!("Player connected: {}", identity);
    
    // Check if player already exists
    let existing_player = ctx.db.player().iter().find(|p| p.identity == identity);
    
    if existing_player.is_none() {
        // Create new player
        let player = Player {
            identity: identity.clone(),
            username: format!("Player_{}", &identity[..8]),
            x: 100.0,
            y: 100.0,
            health: 100,
            max_health: 100,
            mana: 50,
            max_mana: 50,
            level: 1,
            experience: 0,
            gold: 0,
            online: true,
            last_seen: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            world: "default".to_string(),
            party_id: None,
        };
        
        ctx.db.player().insert(player);
        log::info!("Created new player: {}", identity);
    } else {
        log::info!("Player reconnected: {}", identity);
    }
}

// Called when a client disconnects
#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    let identity = ctx.sender.to_string();
    log::info!("Player disconnected: {}", identity);
}

// Player movement
#[spacetimedb::reducer]
pub fn player_move(ctx: &ReducerContext, x: f32, y: f32) {
    let identity = ctx.sender.to_string();
    
    // Create a new player record with updated position
    let player = Player {
        identity: identity.clone(),
        username: format!("Player_{}", &identity[..8]),
        x,
        y,
        health: 100,
        max_health: 100,
        mana: 50,
        max_mana: 50,
        level: 1,
        experience: 0,
        gold: 0,
        online: true,
        last_seen: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        world: "default".to_string(),
        party_id: None,
    };
    
    ctx.db.player().insert(player);
    log::info!("Player {} moved to ({}, {})", identity, x, y);
}

// Player chat
#[spacetimedb::reducer]
pub fn player_chat(ctx: &ReducerContext, message: String, channel: String) {
    let identity = ctx.sender.to_string();
    
    let chat_message = ChatMessage {
        id: Uuid::new_v4().to_string(),
        sender_identity: identity.clone(),
        message,
        channel,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };
    
    ctx.db.chat_message().insert(chat_message);
    log::info!("Player {} sent a message", identity);
}

// Get player info
#[spacetimedb::reducer]
pub fn get_player_info(ctx: &ReducerContext) {
    let identity = ctx.sender.to_string();
    
    if let Some(player) = ctx.db.player().iter().find(|p| p.identity == identity) {
        log::info!("Player {} info: Level {}, Health {}/{}, Mana {}/{}", 
            player.username, player.level, player.health, player.max_health, 
            player.mana, player.max_mana);
    }
}

// Get all online players
#[spacetimedb::reducer]
pub fn get_online_players(ctx: &ReducerContext) {
    let online_players: Vec<Player> = ctx.db.player().iter().filter(|p| p.online).collect();
    log::info!("Online players: {}", online_players.len());
    
    for player in online_players {
        log::info!("- {} at ({}, {})", player.username, player.x, player.y);
    }
}

// Use an item
#[spacetimedb::reducer]
pub fn use_item(ctx: &ReducerContext, item_id: String) {
    let identity = ctx.sender.to_string();
    
    // Get the item
    if let Some(item) = ctx.db.item().iter().find(|i| i.id == item_id) {
        log::info!("Player {} used {}", identity, item.name);
        
        if let Some(health) = item.health {
            log::info!("Restored {} health", health);
        }
        if let Some(mana) = item.mana {
            log::info!("Restored {} mana", mana);
        }
    } else {
        log::warn!("Item {} not found", item_id);
    }
}

// Say hello to all players
#[spacetimedb::reducer]
pub fn say_hello(ctx: &ReducerContext) {
    let online_players: Vec<Player> = ctx.db.player().iter().filter(|p| p.online).collect();
    log::info!("Hello to all {} online players!", online_players.len());
    
    for player in online_players {
        log::info!("Hello, {}!", player.username);
    }
}
