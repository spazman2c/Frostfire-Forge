import path from "path";
import fs from "fs";
import crypto from "crypto";
import log from "./logger";
import weapon from "../systems/weapons";
import item from "../systems/items";
import spell from "../systems/spells";
import npc from "../systems/npcs";
import particle from "../systems/particles";
import worlds from "../systems/worlds";
import quest from "../systems/quests";
// import NPC from "../systems/npc_scripting";
import assetCache from "../services/assetCache";
import generate from "../modules/sprites";
import zlib from "zlib";
import query from "../controllers/sqldatabase";
import * as settings from "../../config/settings.json";
// Warm up the database connection
await query("SELECT 1 + 1 AS solution -- Warm up the database connection");

import assetConfig from "../services/assetConfig";
const assetPath = assetConfig.getAssetConfig();
if (!assetPath || !fs.existsSync(path.join(import.meta.dir, assetPath))) {
  throw new Error(`Asset path not found at ${assetPath}`);
}

const asset = fs.readFileSync(path.join(import.meta.dir, assetPath), "utf-8");
if (!asset) {
  throw new Error("Failed to load asset config");
}

const assetData = JSON.parse(asset);

function loadAnimations() {
  const now = performance.now();

  const animationPath = path.join(import.meta.dir, assetData.animations.path);
  if (!fs.existsSync(animationPath)) {
    console.log("No animations found");
    return;
  }

  const animationFiles = parseAnimations();
  const animations = [] as any[];

  for (const file of animationFiles) {
    if (validateAnimationFile(file)) {
      const buffer = fs.readFileSync(path.join(animationPath, file));
      const compressed = zlib.deflateSync(buffer);

      const originalSize = buffer.length;
      const compressedSize = compressed.length;
      const ratio = (originalSize / compressedSize).toFixed(2);
      const savings = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

      log.debug(`Compressed animation: ${file}
  - Original: ${originalSize} bytes
  - Compressed: ${compressedSize} bytes
  - Compression Ratio: ${ratio}x
  - Compression Savings: ${savings}%`);

      animations.push({ name: file, data: compressed });
    }
  }

  assetCache.add("animations", animations);
  log.success(`Loaded ${animations.length} animation(s) in ${(performance.now() - now).toFixed(2)}ms`);
}
loadAnimations();

function loadIcons() {
  const now = performance.now();
  const icons = [] as any[];
  const iconDir = path.join(import.meta.dir, assetData.icons.path);

  if (!fs.existsSync(iconDir)) {
    throw new Error(`Icons directory not found at ${iconDir}`);
  }

  const iconFiles = fs.readdirSync(iconDir).filter((file) => file.endsWith(".png"));

  iconFiles.forEach((file) => {
    const name = file.replace(".png", "");
    const rawData = fs.readFileSync(path.join(iconDir, file));
    const base64Data = rawData.toString("base64");

    log.debug(`Loaded icon: ${name}`);

    const iconHash = crypto
      .createHash("sha256")
      .update(base64Data)
      .digest("hex");

    const compressedData = zlib.gzipSync(base64Data);

    icons.push({ name, data: compressedData, hash: iconHash });
    assetCache.add(name, compressedData);

    const originalSize = base64Data.length;
    const compressedSize = compressedData.length;
    const ratio = (originalSize / compressedSize).toFixed(2);
    const savings = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

    log.debug(`Compressed icon: ${name}
  - Original: ${originalSize} bytes
  - Compressed: ${compressedSize} bytes
  - Compression Ratio: ${ratio}x
  - Compression Savings: ${savings}%`);
  });

  assetCache.add("icons", icons);
  log.success(`Loaded ${icons.length} icon(s) in ${(performance.now() - now).toFixed(2)}ms`);
}
loadIcons();

// Load world data
const worldNow = performance.now();
assetCache.add("worlds", await worlds.list());
const world = assetCache.get("worlds") as WorldData[];
log.success(`Loaded ${world.length} world(s) from the database in ${(performance.now() - worldNow).toFixed(2)}ms`);

// Check if the world name in the config is in the asset cache
const worldName = settings.world;
if (!world.find((w) => w.name === worldName)) {
  throw new Error(`World name ${worldName} was not loaded correctly from the database\nFound the following worlds: ${world.map((w) => w.name).join(", ")}`);
} else {
  log.success(`World: ${worldName} was loaded correctly from the database`);
}

// Load item data
const itemnow = performance.now();
assetCache.add("items", await item.list());
// For each item, find the icon data and add the compressed data to the item object
assetCache.get("items").forEach((item: any) => {
  if (item.icon) {
    const iconData = assetCache.get(item.icon);
    item.icon = iconData || null; // Replace the icon with the compressed data if it exists
  }
});
const items = assetCache.get("items") as Item[];

log.success(`Loaded ${items.length} item(s) from the database in ${(performance.now() - itemnow).toFixed(2)}ms`);

// Load spell data
const spellnow = performance.now();
assetCache.add("spells", await spell.list());
const spells = assetCache.get("spells") as SpellData[];
log.success(`Loaded ${spells.length} spell(s) from the database in ${(performance.now() - spellnow).toFixed(2)}ms`);

// Load weapon data
const weaponnow = performance.now();
assetCache.add("weapons", await weapon.list());
const weapons = assetCache.get("weapons") as WeaponData[];
log.success(`Loaded ${weapons.length} weapon(s) from the database in ${(performance.now() - weaponnow).toFixed(2)}ms`);

// Load npc data
const npcnow = performance.now();
assetCache.add("npcs", await npc.list());
const npcs = assetCache.get("npcs") as Npc[];
log.success(`Loaded ${npcs.length} npc(s) from the database in ${(performance.now() - npcnow).toFixed(2)}ms`);

// Load particle data
const particleNow = performance.now();
assetCache.add("particles", await particle.list());
const particles = assetCache.get("particles") as Particle[];
log.success(`Loaded ${particles.length} particle(s) from the database in ${(performance.now() - particleNow).toFixed(2)}ms`);

// Load quest data
const questNow = performance.now();
assetCache.add("quests", await quest.list());
const quests = assetCache.get("quests") as Quest[];
log.success(`Loaded ${quests.length} quest(s) from the database in ${(performance.now() - questNow).toFixed(2)}ms`);

// Load maps
function loadMaps() {
  const now = performance.now();
  const maps = [] as MapData[];
  const failedMaps = [] as string[];
  const mapDir = path.join(import.meta.dir, assetData.maps.path);

  if (!fs.existsSync(mapDir)) {
    throw new Error(`Maps directory not found at ${mapDir}`);
  }

  const mapFiles = fs.readdirSync(mapDir);

  if (mapFiles.length === 0) {
    throw new Error("No maps found in the maps directory");
  }

  mapFiles.forEach((file) => {
    if (!file.endsWith(".json")) return;
    const f = path.join(mapDir, file);
    const result = tryParse(fs.readFileSync(f, "utf-8")) || failedMaps.push(f);

    if (result) {
      const jsonString = JSON.stringify(result);
      const compressedData = zlib.gzipSync(jsonString);

      const mapHash = crypto
        .createHash("sha256")
        .update(jsonString)
        .digest("hex");

      maps.push({
        name: file,
        data: result,
        hash: mapHash,
        compressed: compressedData,
      });

      const originalSize = jsonString.length;
      const compressedSize = compressedData.length;
      const ratio = (originalSize / compressedSize).toFixed(2);
      const savings = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

      log.debug(`Loaded map: ${file}`);
      log.debug(`Compressed map: ${file}
  - Original: ${originalSize} bytes
  - Compressed: ${compressedSize} bytes
  - Compression Ratio: ${ratio}x
  - Compression Savings: ${savings}%`);
    }
  });

  if (failedMaps.length > 0) {
    for (const map of failedMaps) {
      log.error(`Failed to parse ${map} as a map`);
    }
  }

  // Store collision layers in asset cache
  maps.forEach((map) => {
    const collisions = [] as any[];
    map.data.layers.forEach((layer: any) => {
      if (
        layer.properties &&
        layer.properties[0]?.name.toLowerCase() === "collision" &&
        layer.properties[0]?.value === true
      ) {
        collisions.push(layer.data);
      }
    });

    const collisionMap: number[][] = [];

    collisions.forEach((collision: number[]) => {
      if (collisionMap.length === 0) {
        collisionMap.push([...collision.map(() => 0)]);
      }
      collision.forEach((index: number, i: number) => {
        if (index !== 0) {
          collisionMap[0][i] = 1;
        }
      });
    });

    collisionMap.push(map.data.layers[0].width, map.data.layers[0].height);

    const compressedCollisionMap = [] as any[];
    compressedCollisionMap.push(collisionMap[1], collisionMap[2]);

    let current = collisionMap[0][2];
    let count = 1;
    for (let i = 1; i < collisionMap[0].length; i++) {
      if (collisionMap[0][i] === current) {
        count++;
      } else {
        compressedCollisionMap.push(current, count);
        current = collisionMap[0][i];
        count = 1;
      }
    }
    compressedCollisionMap.push(current, count);

    const collisionBytes = new Uint8Array(collisionMap[0]).length;
    const compressedBytes = new Uint8Array(compressedCollisionMap).length;
    const ratio = (collisionBytes / compressedBytes).toFixed(2);
    const savings = (((collisionBytes - compressedBytes) / collisionBytes) * 100).toFixed(2);

    if (compressedBytes >= collisionBytes) {
      log.error(`Failed to compress collision map for ${map.name}
    - Original: ${collisionBytes} bytes
    - Compressed: ${compressedBytes} bytes
    - Compression Ratio: ${ratio}x
    - Compression Savings: ${savings}%`);
      throw new Error("Failed to compress collision map");
    }

    log.debug(`Generated compressed collision map for ${map.name}
  - Original: ${collisionBytes} bytes
  - Compressed: ${compressedBytes} bytes
  - Compression Ratio: ${ratio}x
  - Compression Savings: ${savings}%`);

    assetCache.addNested(
      map.name.replace(".json", ""),
      "collision",
      compressedCollisionMap
    );
  });

  const mainMap = maps.find((map) => map.name === "main.json");
  if (!mainMap) {
    throw new Error("Main map not found");
  }

  assetCache.add("maps", maps);
  log.success(`Loaded ${maps.length} map(s) in ${(performance.now() - now).toFixed(2)}ms`);
}
loadMaps();

// Load tilesets
function loadTilesets() {
  const now = performance.now();
  const tilesets = [] as TilesetData[];
  const tilesetDir = path.join(import.meta.dir, assetData.tilesets.path);

  if (!fs.existsSync(tilesetDir)) {
    throw new Error(`Tilesets directory not found at ${tilesetDir}`);
  }

  const tilesetFiles = fs.readdirSync(tilesetDir);
  tilesetFiles.forEach((file) => {
    const tilesetData = fs.readFileSync(path.join(tilesetDir, file), "base64");
    const compressedData = zlib.gzipSync(tilesetData);

    const originalSize = tilesetData.length;
    const compressedSize = compressedData.length;
    const ratio = (originalSize / compressedSize).toFixed(2);
    const savings = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

    log.debug(`Loaded tileset: ${file}`);
    log.debug(`Compressed tileset: ${file}
  - Original: ${originalSize} bytes
  - Compressed: ${compressedSize} bytes
  - Compression Ratio: ${ratio}x
  - Compression Savings: ${savings}%`);

    const tilesetHash = crypto
      .createHash("sha256")
      .update(tilesetData)
      .digest("hex");

    tilesets.push({ name: file, data: compressedData, hash: tilesetHash });
  });

  assetCache.add("tilesets", tilesets);
  log.success(`Loaded ${tilesets.length} tileset(s) in ${(performance.now() - now).toFixed(2)}ms`);
}
loadTilesets();

function tryParse(data: string): any {
  try {
    return JSON.parse(data);
  } catch (e: any) {
    log.error(e);
    return null;
  }
}


function loadSoundEffects() {
  const now = performance.now();
  const soundEffects = [] as SoundData[];
  const soundEffectDir = path.join(import.meta.dir, assetData.sfx.path);

  if (!fs.existsSync(soundEffectDir)) {
    throw new Error(`Sound effects directory not found at ${soundEffectDir}`);
  }

  const soundEffectFiles = fs.readdirSync(soundEffectDir).filter((file) => file.endsWith(".mp3"));

  soundEffectFiles.forEach((file) => {
    const name = file.replace(".mp3", "");
    const data = fs.readFileSync(path.join(soundEffectDir, file), "base64");
    const compressedData = zlib.gzipSync(data);

    const originalSize = data.length;
    const compressedSize = compressedData.length;
    const ratio = (originalSize / compressedSize).toFixed(2);
    const savings = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

    log.debug(`Loaded sound effect: ${name}`);
    log.debug(`Compressed sound effect: ${name}
  - Original: ${originalSize} bytes
  - Compressed: ${compressedSize} bytes
  - Compression Ratio: ${ratio}x
  - Compression Savings: ${savings}%`);

    soundEffects.push({ name, data: compressedData });
  });

  assetCache.add("audio", soundEffects);
  log.success(`Loaded ${soundEffects.length} sound effect(s) in ${(performance.now() - now).toFixed(2)}ms`);
}
loadSoundEffects();

async function loadSpriteSheets() {
  const spritesheetnow = performance.now();
  const spritesheets = [] as SpriteSheetData[];
  const spriteDir = path.join(import.meta.dir, assetData.spritesheets.path);
  if (!fs.existsSync(spriteDir)) {
    throw new Error(`Sprites directory not found at ${spriteDir}`);
  }

  // Not a folder
  fs.readdirSync(spriteDir).filter((file) => file.endsWith(".png")).map((file) => {
    const name = file.replace(".png", "");
    const data = fs.readFileSync(path.join(spriteDir, file), "base64");
    const buffer = Buffer.from(data, "base64");
    log.debug(`Loaded sprite sheet: ${name}`);
    const spriteHash = crypto
      .createHash("sha256")
      .update(data)
      .digest("hex");
      spritesheets.push({ name, width: 24, height: 40, data: buffer, hash: spriteHash });
  });

  assetCache.add("spritesheets", spritesheets);
  log.success(`Loaded ${spritesheets.length} sprite sheet(s) in ${(performance.now() - spritesheetnow).toFixed(2)}ms`);

  const sprites = [] as SpriteData[];
  const spritenow = performance.now();
  const spritePromises = spritesheets.map(async (spritesheet: any) => {
    const sprite = await generate(spritesheet) as any;
    return sprite;
  });

  const spriteData = await Promise.all(spritePromises);
  spriteData.forEach((sprite) => {
    sprites.push(sprite);
  });

  log.success(`Generated ${sprites.length} sprite(s) in ${(performance.now() - spritenow).toFixed(2)}ms`);
}

await loadSpriteSheets();

function parseAnimations() {
  const animationFiles = fs
    .readdirSync(path.join(import.meta.dir, assetData.animations.path))
    .filter((file) => file.toLowerCase().endsWith(".png"));
  return animationFiles;
}

function validateAnimationFile(file: string) {
  // Check for PNG byte
  const buffer = fs.readFileSync(
    path.join(import.meta.dir, assetData.animations.path, file)
  );
  if (
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    return false;
  }
  return true;
}