type Nullable<T> = T | null;

// Define the packet structure
declare interface Packet {
  type: PacketType;
  data: PacketData;
  id: Nullable<string>;
  useragent: Nullable<string>;
  language: Nullable<string>;
  publicKey: Nullable<string>;
}

// Define the packet type
declare interface PacketType {
  [key: number]: string;
}

// Define the packet data
declare interface PacketData {
  data: Array<any>;
}

declare interface Subscription {
  event: string;
  callback: (data: any) => void;
}

// Define the identity of a client
declare interface Identity {
  id: string;
  useragent: string;
  publicKey: string;
}

// Define client rate limit
declare interface ClientRateLimit {
  id: string;
  requests: number;
  rateLimited: boolean;
  time: Nullable<number>;
  windowTime: number;
}

// Define RateLimit options
declare interface RateLimitOptions {
  maxRequests: number;
  time: number;
  maxWindowTime: number;
}

// Define map data
declare interface MapData {
  name: string;
  data: any;
  hash: string;
  compressed: Buffer;
}

// Define tileset data
declare interface TilesetData {
  name: string;
  data: Buffer;
  hash: string;
}

// Define script data
declare interface ScriptData {
  name: string;
  data: string;
  hash: string;
}

// Define player data
declare interface Player {
  id?: string;
  username?: string;
  position?: PositionData;
  location?: LocationData;
  map?: string;
  stats?: StatsData;
  isStealth?: boolean;
  isAdmin?: boolean;
  isNoclip?: boolean;
}

type NullablePlayer = Player | null;

// Define inventory item
declare interface InventoryItem {
  name: string;
  quantity: Nullable<number>;
}

// Define item data
declare interface Item {
  name: string;
  quality: string;
  description: string;
}

// Define npc data
declare interface Npc {
  id: Nullable<number>;
  last_updated: Nullable<number>;
  map: string;
  position: PositionData;
  hidden: boolean;
  script: Nullable<string>;
  dialog: Nullable<string>;
  particles: Nullable<Particle[]>;
}

// Define location data
declare interface LocationData {
  [key: string]: string;
}

// Define location
declare interface PositionData {
  x: number;
  y: number;
  direction: string | null;
}

// Define stats data
declare interface StatsData {
  health: number;
  max_health: number;
  stamina: number;
  max_stamina: number;
}

// Define config data
declare interface ConfigData {
  [key: string]: number | string | boolean;
}

// Define weapon data
declare interface WeaponData {
  name: string;
  damage: number;
  mana: number;
  range: number;
  quality: string;
  type: string;
  description: string;
}

// Define Sound effects data
declare interface SoundData {
  name: string;
  data: Buffer;
  pitch?: number;
}

// Define Sprite data
declare interface SpriteSheetData {
  name: string;
  width: number;
  height: number;
  data: Buffer;
  hash: string;
}

// Define Sprite data
declare interface SpriteData {
  name: string;
  data: Buffer;
  hash: string;
}

// Define Spell data
declare interface SpellData {
  name: string;
  damage: number;
  mana: number;
  range: number;
  type: string;
  cast_time: number;
  description: string;
}

type NPCScript = {
  onCreated: (this: Npc) => void;
  say: (this: Npc, message: string) => void;
};

declare interface Particle {
  name: string | null; // Name of the particle
  size: number; // Size of the particle
  color: string | null; // Color of the particle (optional)
  velocity: {
      x: number; // Velocity of the particle in the x direction
      y: number; // Velocity of the particle in the y direction
  };
  lifetime: number; // Lifetime of the particle in seconds
  scale: number; // Scale of the particle
  opacity: number; // Opacity of the particle
  visible: boolean; // Whether the particle is visible
  gravity: {
      x: number; // Gravity of the particle in the x direction
      y: number; // Gravity of the particle in the y direction
  }; // Whether the particle has gravity
  localposition: {
    x: number | 0;
    y: number | 0;
  } | null;
  interval: number;
  amount: number;
  staggertime: number;
  currentLife: number | null;
  initialVelocity: {
    x: number;
    y: number;
  } | null;
  spread: {
    x: number;
    y: number;
  };
  weather: WeatherData | 'none';
}

declare interface WeatherData {
  name: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  wind_direction: string;
  precipitation: number;
  ambience: number;
}