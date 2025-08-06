use spacetimedb::{
    spacetimedb,
    ReducerContext,
    Identity, SpacetimeType,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Game Tables
#[derive(Clone, Debug, SpacetimeType)]
#[spacetimedb(table)]
pub struct Player {
    #[primarykey]
    pub identity: Identity,
    pub username: String,
    pub x: f32,
    pub y: f32,
    pub health: i32,
    pub max_health: i32,
    pub mana: i32,
    pub max_mana: i32,
    pub level: i32,
    pub experience: i32,
    pub gold: i32,
    pub online: bool,
    pub last_seen: u64, // Unix timestamp
    pub world: String,
    pub party_id: Option<String>,
}

#[derive(Clone, Debug, SpacetimeType)]
#[spacetimedb(table)]
pub struct Item {
    #[primarykey]
    pub id: String,
    pub name: String,
    pub description: String,
    pub item_type: String,
    pub damage: Option<i32>,
    pub armor: Option<i32>,
    pub mana: Option<i32>,
    pub health: Option<i32>,
    pub quality: String,
    pub icon: String,
}

#[derive(Clone, Debug, SpacetimeType)]
#[spacetimedb(table)]
pub struct ChatMessage {
    #[primarykey]
    pub id: String,
    pub sender_identity: Identity,
    pub message: String,
    pub channel: String,
    pub timestamp: u64, // Unix timestamp
}

// Game Events
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PlayerMoveEvent {
    pub x: f32,
    pub y: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChatEvent {
    pub message: String,
    pub channel: String,
}

// Reducers
#[spacetimedb(reducer)]
pub fn player_join(ctx: ReducerContext) -> Result<(), String> {
    let identity = ctx.sender;
    
    // Check if player already exists
    if let Some(_) = ctx.db.get::<Player>(identity) {
        return Ok(());
    }
    
    // Create new player
    let player = Player {
        identity,
        username: format!("Player_{}", identity.to_string()[..8].to_string()),
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
    
    ctx.db.insert(&player)?;
    Ok(())
}

#[spacetimedb(reducer)]
pub fn player_move(ctx: ReducerContext, event: PlayerMoveEvent) -> Result<(), String> {
    let identity = ctx.sender;
    
    if let Some(mut player) = ctx.db.get::<Player>(identity) {
        player.x = event.x;
        player.y = event.y;
        player.last_seen = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        ctx.db.update(&player)?;
    }
    
    Ok(())
}

#[spacetimedb(reducer)]
pub fn player_chat(ctx: ReducerContext, event: ChatEvent) -> Result<(), String> {
    let identity = ctx.sender;
    
    let message = ChatMessage {
        id: Uuid::new_v4().to_string(),
        sender_identity: identity,
        message: event.message,
        channel: event.channel,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };
    
    ctx.db.insert(&message)?;
    Ok(())
}

#[spacetimedb(reducer)]
pub fn player_disconnect(ctx: ReducerContext) -> Result<(), String> {
    let identity = ctx.sender;
    
    if let Some(mut player) = ctx.db.get::<Player>(identity) {
        player.online = false;
        player.last_seen = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        ctx.db.update(&player)?;
    }
    
    Ok(())
}

// Initialize default game data
#[spacetimedb(init)]
pub fn init(ctx: &mut ReducerContext) -> Result<(), String> {
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
        ctx.db.insert(&item)?;
    }
    
    Ok(())
} 