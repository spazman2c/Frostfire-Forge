import { packetTypes } from "./types";
import { packetManager } from "./packet_manager";
import log from "../modules/logger";
import player from "../systems/player";
import permissions from "../systems/permissions";
import inventory from "../systems/inventory";
import cache from "../services/cache";
import assetCache from "../services/assetCache";
import language from "../systems/language";
import questlog from "../systems/questlog";
import quests from "../systems/quests";
import generate from "../modules/sprites";
import swears from "../../config/swears.json";
const maps = assetCache.get("maps");
const spritesheets = assetCache.get("spritesheets");
import { decryptPrivateKey, decryptRsa, _privateKey } from "../modules/cipher";
// Load settings
import * as settings from "../../config/settings.json";
const defaultMap = settings.default_map?.replace(".json", "") || "main";

let restartScheduled: boolean;
let restartTimers: NodeJS.Timer[];

// Create sprites from the spritesheets
const spritePromises = spritesheets.map(async (spritesheet: any) => {
  const sprite = await generate(spritesheet);
  return sprite;
});

const sprites = (await Promise.all(spritePromises)).flat();
assetCache.add("sprites", sprites);

const npcs = assetCache.get("npcs");
const particles = assetCache.get("particles");

export default async function packetReceiver(
  server: any,
  ws: any,
  message: string
) {
  try {
    // Check if the message is empty
    if (!message) return ws.close(1008, "Empty message");
    // Check if the message is too large
    const parsedMessage: Packet = tryParsePacket(message) as Packet;
    if (
      message.length >
        (1024 * 1024 * settings?.websocket?.maxPayloadMB || 1024 * 1024) &&
      parsedMessage.type !== "BENCHMARK" &&
      !settings?.websocket?.benchmarkenabled
    )
      return ws.close(1009, "Message too large");
    // Check if the packet is malformed
    if (!parsedMessage) return ws.close(1007, "Malformed message");
    const data = parsedMessage?.data;
    const type = parsedMessage?.type;
    // Check if the packet has a type and data
    if (!type || (!data && data != null))
      return ws.close(1007, "Malformed message");
    // Check if the packet type is valid
    if (
      Object.values(packetTypes).indexOf(parsedMessage?.type as string) === -1
    ) {
      ws.close(1007, "Invalid packet type");
    }

    const currentPlayer = cache.get(ws.data.id) || null;

    // Handle the packet
    switch (type) {
      case "BENCHMARK": {
        sendPacket(ws, packetManager.benchmark(data));
        break;
      }
      case "PING": {
        sendPacket(ws, packetManager.ping(data));
        break;
      }
      case "PONG": {
        sendPacket(ws, packetManager.pong(data));
        break;
      }
      case "LOGIN": {
        sendPacket(ws, packetManager.login(ws));
        break;
      }
      case "TIME_SYNC": {
        sendPacket(ws, packetManager.timeSync(data, ws));
        break;
      }
      // TODO:Move this to the auth packet
      case "AUTH": {
        // Set the session id for the player
        const auth = await player.setSessionId(data.toString(), ws.data.id);
        if (!auth) {
          sendPacket(ws, packetManager.loginFailed());
          ws.close(1008, "Already logged in");
          break;
        }
        const getUsername = (await player.getUsernameBySession(
          ws.data.id
        )) as any[];

        const username = getUsername[0]?.username as string;
        // Get permissions for the player
        const access = (await permissions.get(username)) as string;

        // Retrieve the player's inventory
        const items = (await inventory.get(username)) || [];
        if (items.length > 30) {
          items.length = 30;
        }

        sendPacket(ws, packetManager.inventory(items));

        // Retrieve the player's quest log
        const questLog = (await questlog.get(username)) || [];
        const incompleteQuest = questLog.incomplete;
        const completedQuest = questLog.completed;

        // Send the player's quest log
        sendPacket(ws, packetManager.questlog(completedQuest, incompleteQuest));

        // Get the player's stats
        const stats = await player.getStats(username);
        sendPacket(ws, packetManager.stats(stats));

        // Get client configuration
        const clientConfig = (await player.getConfig(username)) as any[];
        sendPacket(ws, packetManager.clientConfig(clientConfig));

        const location = (await player.getLocation({
          username: username,
        })) as LocationData | null;

        const isAdmin = await player.isAdmin(username);
        let isStealth = await player.isStealth(username);
        let isNoclip = await player.isNoclip(username);

        // Turn off stealth mode if the player is not an admin and is in stealth mode
        if (!isAdmin && isStealth) {
          await player.toggleStealth(username);
          isStealth = false;
        }
        if (!isAdmin && isNoclip) {
          await player.toggleNoclip(username);
          isNoclip = false;
        }

        const position = location?.position as unknown as PositionData;
        let spawnLocation;
        if (
          !location ||
          (!position?.x && position.x.toString() != "0") ||
          (!position?.y && position.y.toString() != "0")
        ) {
          spawnLocation = { map: `${defaultMap}.json`, x: 0, y: 0 };
        } else {
          spawnLocation = {
            map: `${location.map}.json`,
            x: position.x || 0,
            y: position.y || 0,
            direction: position.direction,
          };
        }
        const map =
          (maps as any[]).find(
            (map: MapData) => map.name === spawnLocation?.map
          ) ||
          (maps as any[]).find(
            (map: MapData) => map.name === `${defaultMap}.json`
          );

        if (!map) return;

        spawnLocation.map = map.name;
        await player.setLocation(
          ws.data.id,
          spawnLocation.map.replace(".json", ""),
          { x: spawnLocation.x, y: spawnLocation.y, direction: "down" }
        );

        cache.add(ws.data.id, {
          username,
          isAdmin,
          isStealth,
          isNoclip,
          id: ws.data.id,
          location: {
            map: spawnLocation.map.replace(".json", ""),
            position: {
              x: spawnLocation.x || 0,
              y: spawnLocation.y || 0,
              direction: "down",
            },
          },
          language: parsedMessage?.language || "en",
          ws,
          stats,
          attackDelay: 0,
          lastMovementPacket: null,
          permissions: typeof access === "string" ? access.split(",") : [],
          movementInterval: null,
          pvp: false,
          last_attack: null,
        });
        log.debug(
          `Spawn location for ${username}: ${spawnLocation.map.replace(
            ".json",
            ""
          )} at ${spawnLocation.x},${spawnLocation.y}`
        );
        const mapData = [
          map?.compressed,
          map?.hash,
          spawnLocation?.map,
          position?.x || 0,
          position?.y || 0,
          position?.direction || "down",
        ];

        sendPacket(ws, packetManager.loadMap(mapData));

        // Load NPCs for the current map only
        const npcsInMap = npcs.filter(
          (npc: Npc) => npc.map === spawnLocation.map.replace(".json", "")
        );

        const npcPackets = npcsInMap.reduce((packets: any[], npc: Npc) => {
          const particleArray =
            typeof npc.particles === "string"
              ? (npc.particles as string)
                  .split(",")
                  .map((name) =>
                    particles.find((p: Particle) => p.name === name.trim())
                  )
                  .filter(Boolean)
              : [];

          const npcData = {
            id: npc.id,
            last_updated: npc.last_updated,
            location: {
              x: npc.position.x,
              y: npc.position.y,
              direction: "down",
            },
            script: npc.script,
            hidden: npc.hidden,
            dialog: npc.dialog,
            particles: particleArray,
            quest: npc.quest,
            map: npc.map,
            position: npc.position,
          };
          return [...packets, ...packetManager.createNpc(npcData)];
        }, [] as any[]);

        sendPacket(ws, npcPackets);

        const players = filterPlayersByMap(spawnLocation.map);

        const playerData = [] as any[];

        const sprite_idle = sprites.find(
          (sprite) => sprite.name === "frostfire-player_4"
        );

        players.forEach((player) => {
          const spawnData = {
            id: ws.data.id,
            location: {
              map: spawnLocation.map,
              x: position.x || 0,
              y: position.y || 0,
              direction: position.direction,
            },
            username,
            isAdmin,
            isStealth,
            stats,
            sprite: sprite_idle.data,
          };
          sendPacket(player.ws, packetManager.spawnPlayer(spawnData));

          const location = player.location;
          const data = {
            id: player.id,
            location: {
              map: location.map,
              x: location.position.x || 0,
              y: location.position.y || 0,
              direction: location.position.direction,
            },
            username: player.username,
            isAdmin: player.isAdmin,
            isStealth: player.isStealth,
            stats: player.stats,
            sprite: sprite_idle.data,
          };

          playerData.push(data);
        });

        sendPacket(ws, packetManager.loadPlayers(playerData));
        break;
      }
      // TODO:Move this to the logout packet
      case "LOGOUT": {
        if (!currentPlayer) return;
        await player.setLocation(
          currentPlayer.id,
          currentPlayer.location.map,
          currentPlayer.location.position
        );
        await player.logout(currentPlayer.id);
        break;
      }
      case "DISCONNECT": {
        if (!currentPlayer) return;
        await player.setLocation(
          currentPlayer.id,
          currentPlayer.location.map,
          currentPlayer.location.position
        );
        await player.clearSessionId(currentPlayer.id);
        break;
      }
      case "MOVEXY": {
        if (!currentPlayer) return;
        const tileSize = 16;
        const speed = 2;
        const targetFPS = 60;
        const frameTime = 1000 / targetFPS; // Time per frame in milliseconds

        const directionAdjustments = {
          up: {
            tempX: 0,
            tempY: -speed,
            direction: "up",
            collisionX: (tempPosition: PositionData) =>
              tempPosition.x + (tileSize * 2) / 2,
            collisionY: (tempPosition: PositionData) => tempPosition.y,
          },
          down: {
            tempX: 0,
            tempY: speed,
            direction: "down",
            collisionX: (tempPosition: PositionData) =>
              tempPosition.x + tileSize,
            collisionY: (tempPosition: PositionData) =>
              tempPosition.y + tileSize * 2 + tileSize,
          },
          left: {
            tempX: -speed,
            tempY: 0,
            direction: "left",
            collisionX: (tempPosition: PositionData) => tempPosition.x,
            collisionY: (tempPosition: PositionData) =>
              tempPosition.y + tileSize * 2 + tileSize / 2,
          },
          right: {
            tempX: speed,
            tempY: 0,
            direction: "right",
            collisionX: (tempPosition: PositionData) =>
              tempPosition.x + tileSize * 2,
            collisionY: (tempPosition: PositionData) =>
              tempPosition.y + tileSize * 2 + tileSize / 2,
          },
          upleft: {
            tempX: -speed,
            tempY: -speed,
            direction: "upleft",
            collisionX: (tempPosition: PositionData) => tempPosition.x,
            collisionY: (tempPosition: PositionData) => tempPosition.y,
          },
          upright: {
            tempX: speed,
            tempY: -speed,
            direction: "upright",
            collisionX: (tempPosition: PositionData) =>
              tempPosition.x + tileSize * 2,
            collisionY: (tempPosition: PositionData) => tempPosition.y,
          },
          downleft: {
            tempX: -speed,
            tempY: speed,
            direction: "downleft",
            collisionX: (tempPosition: PositionData) => tempPosition.x,
            collisionY: (tempPosition: PositionData) =>
              tempPosition.y + tileSize * 2 + tileSize,
          },
          downright: {
            tempX: speed,
            tempY: speed,
            direction: "downright",
            collisionX: (tempPosition: PositionData) =>
              tempPosition.x + tileSize * 2,
            collisionY: (tempPosition: PositionData) =>
              tempPosition.y + tileSize * 2 + tileSize,
          },
        };

        const direction = data.toString().toLowerCase();

        // Handle movement abort
        if (direction === "abort") {
          if (currentPlayer.movementInterval) {
            clearInterval(currentPlayer.movementInterval);
            currentPlayer.movementInterval = null;
          }
          return;
        }

        // Now cast to the movement-only types
        const moveDirection = direction as keyof typeof directionAdjustments;

        // Only allow the player to move in these directions
        const directions = [
          "up",
          "down",
          "left",
          "right",
          "upleft",
          "upright",
          "downleft",
          "downright",
        ];
        if (!directions.includes(moveDirection)) return;

        // Clear any existing movement
        if (currentPlayer.movementInterval) {
          clearInterval(currentPlayer.movementInterval);
        }

        let lastTime = performance.now();
        const movePlayer = () => {
          const currentTime = performance.now();
          const deltaTime = currentTime - lastTime;

          // Skip frame if too early
          if (deltaTime < frameTime) {
            return;
          }

          // Update last frame time
          lastTime = currentTime - (deltaTime % frameTime);

          const tempPosition = { ...currentPlayer.location.position };
          const collisionPosition = { ...currentPlayer.location.position };
          const playerHeight = 48;
          const playerWidth = 32;
          collisionPosition.x += playerWidth / 2;
          collisionPosition.y += playerHeight / 2;

          const adjustment = directionAdjustments[moveDirection];
          tempPosition.x += adjustment.tempX;
          tempPosition.y += adjustment.tempY;
          tempPosition.direction = adjustment.direction;
          collisionPosition.x = adjustment.collisionX(tempPosition);
          collisionPosition.y = adjustment.collisionY(tempPosition);

          const collision = player.checkIfWouldCollide(
            currentPlayer.location.map,
            collisionPosition
          );
          if (collision && !currentPlayer.isNoclip) {
            clearInterval(currentPlayer.movementInterval);
            currentPlayer.movementInterval = null;
            return;
          }

          currentPlayer.location.position = tempPosition;

          // Broadcast movement to other players
          let playersInMap = filterPlayersByMap(currentPlayer.location.map);
          if (currentPlayer.isStealth) {
            playersInMap = playersInMap.filter((p) => p.isAdmin);
          }
          const targetPlayers = currentPlayer.isStealth
            ? playersInMap.filter((p) => p.isAdmin)
            : playersInMap;

          targetPlayers.forEach((player) => {
            const movementData = {
              id: ws.data.id,
              _data: currentPlayer.location.position,
            };

            sendPacket(player.ws, packetManager.moveXY(movementData));
          });
        };

        // Start continuous movement with requestAnimationFrame-like timing
        movePlayer(); // Execute first movement immediately
        currentPlayer.movementInterval = setInterval(movePlayer, 1); // Check frequently but only update at 60fps
        break;
      }
      case "TELEPORTXY": {
        if (!currentPlayer?.isAdmin) return;
        currentPlayer.location.position = data;
        currentPlayer.location.position.direction = "down";
        if (currentPlayer.isStealth) {
          const playersInMap = filterPlayersByMap(currentPlayer.location.map);
          const playersInMapAdmin = playersInMap.filter((p) => p.isAdmin);
          currentPlayer.location.position.x = Math.floor(
            Number(currentPlayer.location.position.x)
          );
          currentPlayer.location.position.y = Math.floor(
            Number(currentPlayer.location.position.y)
          );
          playersInMapAdmin.forEach((player) => {
            const movementData = {
              id: ws.data.id,
              _data: currentPlayer.location.position,
            };
            sendPacket(player.ws, packetManager.moveXY(movementData));
          });
        } else {
          const playersInMap = filterPlayersByMap(currentPlayer.location.map);
          playersInMap.forEach((player) => {
            const movementData = {
              id: ws.data.id,
              _data: currentPlayer.location.position,
            };
            sendPacket(player.ws, packetManager.moveXY(movementData));
          });
        }
        break;
      }
      case "CHAT": {
        if (!currentPlayer) return;
        const messageData = data as any;
        const message = messageData?.message;
        const mode = messageData?.mode;

        // Send message to the sender
        const sendMessageToPlayer = (playerWs: any, message: string) => {
          const chatData = {
            id: ws.data.id,
            message,
            username: currentPlayer.username,
          };
          sendPacket(playerWs, packetManager.chat(chatData));
        };

        if (message == null) {
          const playersInMap = filterPlayersByMap(currentPlayer.location.map);
          playersInMap.forEach((player) => {
            sendMessageToPlayer(player.ws, "");
          });
          return;
        }

        let decryptedMessage;
        if (mode && mode == "decrypt") {
          const encryptedMessage = Buffer.from(
            Object.values(message) as number[]
          );
          const privateKey = _privateKey;
          if (!privateKey) return;
          const decryptedPrivateKey = decryptPrivateKey(
            privateKey,
            process.env.RSA_PASSPHRASE || ""
          ).toString();
          decryptedMessage =
            decryptRsa(encryptedMessage, decryptedPrivateKey) || "";
        } else {
          decryptedMessage = message;
        }

        // Send the message to the sender
        sendMessageToPlayer(ws, decryptedMessage as string);

        const playerCache = cache.list();
        let playersInMap = Object.values(playerCache).filter(
          (p) =>
            p.location.map === currentPlayer.location.map && p.id !== ws.data.id
        );

        if (currentPlayer.isStealth) {
          // Filter only admins in the same map
          playersInMap = playersInMap.filter((p) => p.isAdmin);
        }

        // If there are no players in the map, return
        if (playersInMap.length === 0) return;

        // Translate the original message to English so that we can filter it against an English swear word list
        const englishMessage =
          currentPlayer.language === "en"
            ? (decryptedMessage as string)
            : await language.translate(decryptedMessage as string, "en");
        let filteredMessage = englishMessage;

        // Check for swear words
        for (const swear of swears) {
          const swearRegex = new RegExp(swear.id, "gi");
          while (swearRegex.test(filteredMessage)) {
            const randomLength = Math.floor(Math.random() * 5) + 1;
            filteredMessage = filteredMessage.replace(
              swearRegex,
              "*".repeat(randomLength)
            );
          }
        }

        const translations: Record<string, string> = {};

        playersInMap.forEach(async (player) => {
          if (!translations[player.language]) {
            // Skip translation if target language matches source language
            translations[player.language] =
              player.language === "en"
                ? filteredMessage
                : await language.translate(filteredMessage, player.language);
          }

          const chatData = {
            id: ws.data.id,
            message: translations[player.language],
            username: currentPlayer.username,
          };
          
          sendPacket(player.ws, packetManager.chat(chatData));
        });
        break;
      }
      case "TYPING": {
        if (!currentPlayer) return;
        const typingData = {
          id: ws.data.id,
        };
        let playersInMap = filterPlayersByMap(currentPlayer.location.map);
        if (currentPlayer.isStealth) {
          playersInMap = playersInMap.filter((p) => p.isAdmin);
        }
        playersInMap.forEach((player) => {
          sendPacket(player.ws, packetManager.typing(typingData));
        });
        break;
      }
      case "CLIENTCONFIG": {
        if (!currentPlayer) return;
        await player.setConfig(ws.data.id, data);
        break;
      }
      case "SELECTPLAYER": {
        if (!currentPlayer) return;
        const location = data as unknown as LocationData;
        const playerCache = cache.list();
        // Get current player data from cache
        // only get players that are in the same map
        const players = Object.values(playerCache).filter(
          (p) => p.location.map === currentPlayer.location.map
        );
        // Find the first player that is closest to the selected location within a 25px radius
        const selectedPlayer = players.find(
          (p) =>
            Math.abs(p.location.position.x - Math.floor(Number(location.x))) <
              25 &&
            Math.abs(p.location.position.y - Math.floor(Number(location.y))) <
              25
        );

        if (!selectedPlayer) {
          const selectPlayerData = {
            id: ws.data.id,
            data: null,
          };
          sendPacket(ws, packetManager.selectPlayer(selectPlayerData));
          break;
        } else {
          if (selectedPlayer.isStealth && !currentPlayer.isAdmin) {
            const selectPlayerData = {
              id: ws.data.id,
              data: null,
            };
            sendPacket(ws, packetManager.selectPlayer(selectPlayerData));
            break;
          } else {
            const selectPlayerData = {
              id: selectedPlayer.id,
              username: selectedPlayer.username,
              stats: selectedPlayer.stats,
            };
            sendPacket(ws, packetManager.selectPlayer(selectPlayerData));
          }
        }
        break;
      }
      case "TARGETCLOSEST": {
        if (!currentPlayer) return;
        const playersInRange = filterPlayersByDistance(
          ws,
          500,
          currentPlayer.location.map
        ).filter((p) => !p.isStealth && p.id !== currentPlayer.id); // Filter out stealth players and self

        const closestPlayer = await player.findClosestPlayer(
          currentPlayer,
          playersInRange,
          500
        );

        const selectPlayerData = {
          id: closestPlayer?.id || null,
          username: closestPlayer?.username || null,
          stats: closestPlayer?.stats || null,
        };
        sendPacket(ws, packetManager.selectPlayer(selectPlayerData));
        break;
      }
      case "INSPECTPLAYER": {
        if (currentPlayer) {
          const inspectPlayerData = {
            id: currentPlayer?.id,
            stats: currentPlayer?.stats,
            username: currentPlayer?.username,
          };
          sendPacket(ws, packetManager.inspectPlayer(inspectPlayerData));
        }
        break;
      }
      case "NOCLIP": {
        if (!currentPlayer?.isAdmin) return;
        const isNoclip = await player.toggleNoclip(currentPlayer.username);
        currentPlayer.isNoclip = isNoclip;
        break;
      }
      case "STEALTH": {
        if (!currentPlayer?.isAdmin) return;
        const isStealth = await player.toggleStealth(currentPlayer.username);
        currentPlayer.isStealth = isStealth;
        const playersInMap = filterPlayersByMap(currentPlayer.location.map);
        const stealthData = {
          id: ws.data.id,
          isStealth: currentPlayer.isStealth,
        };
        sendPacket(ws, packetManager.stealth(stealthData));
        playersInMap.forEach((player) => {
          const stealthData = {
            id: ws.data.id,
            isStealth: currentPlayer.isStealth,
          };
          sendPacket(player.ws, packetManager.stealth(stealthData));
        });
        // Send the player's new position to all players in the map when they toggle stealth mode off
        if (!isStealth) {
          playersInMap.forEach((player) => {
            const moveXYData = {
              id: ws.data.id,
              _data: currentPlayer.location.position,
            };
            sendPacket(player.ws, packetManager.moveXY(moveXYData));
          });
        }
        break;
      }
      case "ATTACK": {
        if (currentPlayer?.attackDelay > performance.now()) return;
        if (currentPlayer.stats.stamina < 10) return;
        const _data = data as any;
        const target = cache.get(_data.id);
        if (!target) return;

        const playersInMap = filterPlayersByMap(currentPlayer.location.map);
        const playersNearBy = filterPlayersByDistance(
          ws,
          700,
          currentPlayer.location.map
        );
        const playersInAttackRange = filterPlayersByDistance(
          ws,
          60,
          currentPlayer.location.map
        );
        const playersInMapAdminNearBy = playersNearBy.filter((p) => p.isAdmin);
        // Check if targetted player is included in the playersNearBy array and if the player can attack
        if (
          !playersInAttackRange.includes(target) ||
          !player.canAttack(currentPlayer, target)
        )
          return;

        // Generate a number for the pitch of the audio
        const pitch = Math.random() * 0.1 + 0.95;

        // Random whole number between 10 and 25
        const damage = Math.floor(Math.random() * (25 - 10 + 1) + 10);
        const stamina = 10;

        target.stats.health = Math.round(target.stats.health - damage);
        currentPlayer.stats.stamina -= stamina;
        
        // Ensure stamina doesn't go below 0
        if (currentPlayer.stats.stamina < 0) {
          currentPlayer.stats.stamina = 0;
        }

        const audioData = {
          name: "attack_sword",
          data: assetCache
            .get("audio")
            .find((a: SoundData) => a.name === "attack_sword"),
          pitch: pitch,
          timestamp: performance.now(),
        };

        // Check if player is currently in stealth mode
        // If the player is in stealth mode, only send an audio packet to admins
        if (currentPlayer.isStealth) {
          playersInMapAdminNearBy.forEach((player) => {
            sendPacket(player.ws, packetManager.audio(audioData));
          });
        } else {
          playersNearBy.forEach((player) => {
            sendPacket(player.ws, packetManager.audio(audioData));
          });
          // Dead player
          if (target.stats.health <= 0) {
            target.stats.health = 100;
            target.stats.stamina = 100;
            target.location.position = { x: 0, y: 0, direction: "down" };
            playersInMap.forEach((player) => {
              const moveXYData = {
                id: target.id,
                _data: target.location.position,
              };
              sendPacket(player.ws, packetManager.moveXY(moveXYData));

              const reviveData = {
                id: target.id,
                target: target.id,
                stats: target.stats,
              };
              sendPacket(player.ws, packetManager.revive(reviveData));
            });
          } else {
            playersInMap.forEach((player) => {
              const updateStatsData = {
                id: ws.data.id,
                target: target.id,
                stats: target.stats,
              };

              const currentPlayerUpdateStatsData = {
                id: currentPlayer.id,
                target: currentPlayer.id,
                stats: currentPlayer.stats,
              };
              sendPacket(player.ws, packetManager.updateStats(updateStatsData));
              sendPacket(player.ws, packetManager.updateStats(currentPlayerUpdateStatsData));
            });
          }
        }
        currentPlayer.pvp = true;
        target.pvp = true;
        currentPlayer.last_attack = performance.now();
        target.last_attack = performance.now();

        player.setStats(target.username, target.stats);
        player.setStats(currentPlayer.username, currentPlayer.stats);
        currentPlayer.attackDelay = performance.now() + 1000;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        currentPlayer.attackDelay = 0;
        break;
      }
      case "QUESTDETAILS": {
        const questId = data as unknown as number;
        const quest = await quests.find(questId);
        sendPacket(ws, packetManager.questDetails(quest));
        break;
      }
      case "STARTGAME": {
        // Send music

        const musicData = {
          name: "music_morning_dew",
          data: assetCache
            .get("audio")
            .find((a: SoundData) => a.name === "music_morning_dew"),
        };
        sendPacket(ws, packetManager.music(musicData));
        break;
      }
      case "COMMAND": {
        if (!currentPlayer) return;
        const _data = data as any;
        const command = _data.command.toUpperCase();
        const args = _data.args;
        switch (command) {
          // Kick a player
          case "KICK":
          case "DISCONNECT": {
            // admin.kick or admin.*
            if (
              !currentPlayer.permissions.some(
                (p: string) => p === "admin.kick" || p === "admin.*"
              )
            ) {
              const notifyData = {
                message: "You don't have permission to use this command",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }
            const identifier = args[0].toLowerCase() || null;
            if (!identifier) {
              const notifyData = {
                message: "Please provide a username or ID",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Find player by ID or username
            let targetPlayer;
            if (isNaN(Number(identifier))) {
              // Search by username
              const players = Object.values(cache.list());
              targetPlayer = players.find(
                (p) => p.username.toLowerCase() === identifier.toLowerCase()
              );
            } else {
              // Search by ID
              targetPlayer = cache.get(identifier);
            }

            // Prevent disconnecting yourself
            if (targetPlayer?.id === currentPlayer.id) {
              const notifyData = {
                message: "You cannot disconnect yourself",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            if (!targetPlayer) {
              const notifyData = {
                message: "Player not found or is not online",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Prevent disconnecting admins
            if (targetPlayer.isAdmin) {
              const notifyData = {
                message: "You cannot disconnect other admins",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            player.kick(targetPlayer.username, targetPlayer.ws);
            const notifyData = {
              message: `Disconnected ${targetPlayer.username} from the server`,
            };
            sendPacket(ws, packetManager.notify(notifyData));
            break;
          }
          // Send a message to all players in the current map
          case "NOTIFY":
          case "BROADCAST": {
            // server.notify or server.*
            if (
              !currentPlayer.permissions.some(
                (p: string) => p === "server.notify" || p === "server.*"
              )
            ) {
              const notifyData = {
                message: "You don't have permission to use this command",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }
            let message;
            let audience = "ALL";

            // If no audience provided, treat first arg as the message
            if (!args[0]) return;
            if (!["ALL", "ADMINS", "MAP"].includes(args[0].toUpperCase())) {
              message = args.join(" ");
            } else {
              audience = args[0].toUpperCase();
              message = args.slice(1).join(" ");
            }

            if (!message) return;
            const players = Object.values(cache.list());

            switch (audience) {
              case "ALL": {
                players.forEach((player) => {
                  const notifyData = {
                    message: message,
                  };
                  sendPacket(player.ws, packetManager.notify(notifyData));
                });
                break;
              }
              case "ADMINS": {
                const playersInMap = filterPlayersByMap(
                  currentPlayer.location.map
                );
                const playersInMapAdmins = playersInMap.filter(
                  (p) => p.isAdmin
                );
                playersInMapAdmins.forEach((player) => {
                  const notifyData = {
                    message: message,
                  };
                  sendPacket(player.ws, packetManager.notify(notifyData));
                });
                break;
              }
              case "MAP": {
                const playersInMap = filterPlayersByMap(
                  currentPlayer.location.map
                );
                playersInMap.forEach((player) => {
                  const notifyData = {
                    message: message,
                  };
                  sendPacket(player.ws, packetManager.notify(notifyData));
                });
                break;
              }
            }
            break;
          }
          // Ban a player
          case "BAN": {
            // admin.ban or admin.*
            if (
              !currentPlayer.permissions.some(
                (p: string) => p === "admin.ban" || p === "admin.*"
              )
            ) {
              const notifyData = {
                message: "You don't have permission to use this command",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }
            const identifier = args[0].toLowerCase() || null;
            if (!identifier) {
              const notifyData = {
                message: "Please provide a username or ID",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Find player by ID or username in cache first
            let targetPlayer;
            if (isNaN(Number(identifier))) {
              // Search by username
              const players = Object.values(cache.list());
              targetPlayer = players.find(
                (p) => p.username.toLowerCase() === identifier.toLowerCase()
              );
            } else {
              // Search by ID
              targetPlayer = cache.get(identifier);
            }

            // If not found in cache, check database
            if (!targetPlayer) {
              const dbPlayer = (await player.findPlayerInDatabase(
                identifier
              )) as { username: string; banned: number }[];
              targetPlayer = dbPlayer.length > 0 ? dbPlayer[0] : null;
            }

            if (!targetPlayer) {
              const notifyData = {
                message: "Player not found",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Prevent banning yourself
            if (targetPlayer.id === currentPlayer.id) {
              const notifyData = {
                message: "You cannot ban yourself",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Prevent banning admins
            if (targetPlayer.isAdmin) {
              const notifyData = {
                message: "You cannot ban other admins",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Check if the player is already banned
            if (targetPlayer.banned) {
              const notifyData = {
                message: `${targetPlayer.username} is already banned`,
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Ban the player
            await player.ban(targetPlayer.username, targetPlayer.ws);
            const notifyData = {
              message: `Banned ${targetPlayer.username} from the server`,
            };
            sendPacket(ws, packetManager.notify(notifyData));
            break;
          }
          case "UNBAN": {
            // admin.unban or admin.*
            if (
              !currentPlayer.permissions.some(
                (p: string) => p === "admin.unban" || p === "admin.*"
              )
            ) {
              const notifyData = {
                message: "You don't have permission to use this command",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }
            const identifier = args[0] || null;
            if (!identifier) {
              const notifyData = {
                message: "Please provide a username or ID",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            const targetPlayer = (await player.findPlayerInDatabase(
              identifier
            )) as { username: string; banned: number }[] as any[];
            if (!targetPlayer) {
              const notifyData = {
                message: "Player not found or is not online",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Prevent unbanning yourself
            if (targetPlayer[0].id === currentPlayer.id) {
              const notifyData = {
                message: "You cannot unban yourself",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Unban the player
            await player.unban(targetPlayer[0].username);
            const notifyData = {
              message: `Unbanned ${targetPlayer[0].username} from the server`,
            };
            sendPacket(ws, packetManager.notify(notifyData));
            break;
          }
          // Toggle admin status
          case "ADMIN":
          case "SETADMIN": {
            // server.admin or server.*
            if (
              !currentPlayer.permissions.some(
                (p: string) => p === "server.admin" || p === "server.*"
              )
            ) {
              const notifyData = {
                message: "You don't have permission to use this command",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }
            const identifier = args[0].toLowerCase() || null;
            if (!identifier) {
              const notifyData = {
                message: "Please provide a username or ID",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Find player by ID or username in cache first
            let targetPlayer;
            if (isNaN(Number(identifier))) {
              // Search by username
              const players = Object.values(cache.list());
              targetPlayer = players.find(
                (p) => p.username.toLowerCase() === identifier.toLowerCase()
              );
            } else {
              // Search by ID
              targetPlayer = cache.get(identifier);
            }

            // If not found in cache, check database
            if (!targetPlayer) {
              const dbPlayer = (await player.findPlayerInDatabase(
                identifier
              )) as { username: string; banned: number }[];
              targetPlayer = dbPlayer.length > 0 ? dbPlayer[0] : null;
            }

            // Prevent toggling your own admin status
            if (targetPlayer?.id === currentPlayer.id) {
              const notifyData = {
                message: "You cannot toggle your own admin status",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Toggle admin status
            const admin = await player.toggleAdmin(
              targetPlayer.username,
              targetPlayer.ws
            );
            // Update player cache if the player is in the cache
            if (targetPlayer) {
              targetPlayer.isAdmin = admin;
              cache.set(targetPlayer.id, targetPlayer);
            }
            const notifyData = {
              message: `${targetPlayer.username} admin status has been updated to ${admin}`,
            };
            sendPacket(ws, packetManager.notify(notifyData));
            break;
          }
          // Shutdown the server
          case "SHUTDOWN": {
            // server.shutdown or server.*
            if (
              !currentPlayer.permissions.some(
                (p: string) => p === "server.shutdown" || p === "server.*"
              )
            ) {
              const notifyData = {
                message: "You don't have permission to use this command",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }
            const players = Object.values(cache.list());
            players.forEach((player) => {
              const notifyData = {
                message:
                  "⚠️ Server shutting down - please reconnect in a few minutes ⚠️",
              };
              sendPacket(player.ws, packetManager.notify(notifyData));
            });

            // Wait for 5 seconds
            await new Promise((resolve) => setTimeout(resolve, 5000));
            players.forEach((player) => {
              player.ws.close(1000, "Server is restarting");
            });
            // Keep checking until all players are disconnected
            const checkInterval = setInterval(() => {
              const remainingPlayers = Object.values(cache.list());
              remainingPlayers.forEach((player) => {
                player.ws.close(1000, "Server is restarting");
              });

              if (remainingPlayers.length === 0) {
                clearInterval(checkInterval);
                process.exit(0);
              }
            }, 100);
            break;
          }
          // Restart the server
          case "RESTART": {
            // server.restart or server.*
            if (
              !currentPlayer.permissions.some(
                (p: string) => p === "server.restart" || p === "server.*"
              )
            ) {
              const notifyData = {
                message: "You don't have permission to use this command",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Check if restart is already scheduled
            if (restartScheduled) {
              restartTimers.forEach((timer) => clearTimeout(timer));
              restartTimers = [];
              restartScheduled = false;

              const players = Object.values(cache.list());
              players.forEach((player) => {
                const notifyData = {
                  message: "⚠️ Server restart has been aborted ⚠️",
                };
                sendPacket(player.ws, packetManager.notify(notifyData));
              });
              break;
            }

            // Set restart flag
            restartScheduled = true;
            restartTimers = [];

            const minutes = 15;
            const RESTART_DELAY = minutes * 60000;
            const totalMinutes = Math.floor(RESTART_DELAY / 60000);

            const minuteIntervals = Array.from(
              { length: totalMinutes },
              (_, i) => totalMinutes - i
            );
            const secondIntervals = Array.from(
              { length: 30 },
              (_, i) => 30 - i
            );

            // Minute notifications
            minuteIntervals.forEach((minutes) => {
              restartTimers.push(
                setTimeout(() => {
                  const players = Object.values(cache.list());
                  players.forEach((player) => {
                    const notifyData = {
                      message: `⚠️ Server restarting in ${minutes} minute${
                        minutes === 1 ? "" : "s"
                      } ⚠️`,
                    };
                    sendPacket(player.ws, packetManager.notify(notifyData));
                  });
                }, RESTART_DELAY - minutes * 60 * 1000)
              );
            });

            // Second notifications
            secondIntervals.forEach((seconds) => {
              restartTimers.push(
                setTimeout(() => {
                  const players = Object.values(cache.list());
                  players.forEach((player) => {
                    const notifyData = {
                      message: `⚠️ Server restarting in ${seconds} second${
                        seconds === 1 ? "" : "s"
                      } ⚠️`,
                    };
                    sendPacket(player.ws, packetManager.notify(notifyData));
                  });
                }, RESTART_DELAY - seconds * 1000)
              );
            });

            // Final exit timeout
            restartTimers.push(
              setTimeout(() => {
                const players = Object.values(cache.list());
                players.forEach((player) => {
                  player.ws.close(1000, "Server is restarting");
                });
                // Keep checking until all players are disconnected
                const checkInterval = setInterval(() => {
                  const remainingPlayers = Object.values(cache.list());
                  remainingPlayers.forEach((player) => {
                    player.ws.close(1000, "Server is restarting");
                  });

                  if (remainingPlayers.length === 0) {
                    clearInterval(checkInterval);
                    process.exit(0);
                  }
                }, 100);
              }, RESTART_DELAY)
            );
            break;
          }
          // Respawn player by username or ID
          case "RESPAWN": {
            // admin.respawn or admin.*
            if (
              !currentPlayer.permissions.some(
                (p: string) => p === "admin.respawn" || p === "admin.*"
              )
            ) {
              const notifyData = {
                message: "You don't have permission to use this command",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            let targetPlayer;
            const identifier = args[0].toLowerCase() || null;

            if (!identifier) {
              targetPlayer = currentPlayer;
            } else {
              // Find player by ID or username in cache first
              const players = Object.values(cache.list());
              if (isNaN(Number(identifier))) {
                // Search by username
                targetPlayer = players.find(
                  (p) => p.username.toLowerCase() === identifier.toLowerCase()
                );
              } else {
                // Search by ID
                targetPlayer = cache.get(identifier);
              }

              // If not found in cache, check database
              if (!targetPlayer) {
                const dbPlayer = (await player.findPlayerInDatabase(
                  identifier
                )) as { username: string }[];
                targetPlayer = dbPlayer.length > 0 ? dbPlayer[0] : null;
              }

              if (!targetPlayer) {
                const notifyData = {
                  message: "Player not found",
                };
                sendPacket(ws, packetManager.notify(notifyData));
                break;
              }
            }

            // Respawn the player
            await player.setLocation(targetPlayer.username, `${defaultMap}`, {
              x: 0,
              y: 0,
              direction: "down",
            });

            // Update cache if player is online
            if (cache.get(targetPlayer.id)) {
              targetPlayer.location.position = {
                x: 0,
                y: 0,
                direction: "down",
              };
              cache.set(targetPlayer.id, targetPlayer);
              const playersInMap = filterPlayersByMap(
                targetPlayer.location.map
              );
              playersInMap.forEach((player) => {
                const moveData = {
                  id: targetPlayer.id,
                  _data: targetPlayer.location.position,
                };
                sendPacket(player.ws, packetManager.moveXY(moveData));
              });
            }

            const notifyData = {
              message: `Respawned ${targetPlayer.username}`,
            };
            sendPacket(ws, packetManager.notify(notifyData));
            break;
          }
          // Update permissions for a player
          case "PERMISSION":
          case "PERMISSIONS": {
            // admin.permission or admin.*
            if (
              !currentPlayer.permissions.some(
                (p: string) => p === "admin.permission" || p === "admin.*"
              )
            ) {
              const notifyData = {
                message: "You don't have permission to use this command",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }
            const mode = args[0]?.toUpperCase() || null;
            if (!mode) {
              const notifyData = {
                message: "Please provide a mode",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            if (
              mode !== "ADD" &&
              mode !== "REMOVE" &&
              mode !== "SET" &&
              mode !== "CLEAR" &&
              mode !== "LIST"
            ) {
              const notifyData = {
                message: "Invalid mode",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            let targetPlayer;
            const identifier = args[1]?.toLowerCase() || null;

            // Find player by ID or username in cache first
            const players = Object.values(cache.list());
            if (isNaN(Number(identifier))) {
              // Search by username
              targetPlayer = players.find(
                (p) => p.username.toLowerCase() === identifier.toLowerCase()
              );
            } else {
              // Search by ID
              targetPlayer = cache.get(identifier);
            }

            // If not found in cache, check database
            if (!targetPlayer) {
              const dbPlayer = (await player.findPlayerInDatabase(
                identifier
              )) as { username: string }[];
              targetPlayer = dbPlayer.length > 0 ? dbPlayer[0] : null;
            }

            if (!targetPlayer) {
              const notifyData = {
                message: "Player not found",
              };
              sendPacket(ws, packetManager.notify(notifyData));
              break;
            }

            // Permissions is what ever is after the mode unless it's clear or list
            let access;
            let permissionsArray;
            if (mode !== "CLEAR" && mode !== "LIST") {
              access = args.slice(2).join(" ");
              // Check if each permission is valid
              const validPermissions = await permissions.list();
              // Ensure permissions is split by commas
              permissionsArray = access.split(",");
              permissionsArray.forEach((permission: string) => {
                if (!validPermissions.includes(permission)) {
                  const notifyData = {
                    message: `Invalid permission: ${permission}`,
                  };
                  sendPacket(ws, packetManager.notify(notifyData));
                  return;
                }
              });
            }

            switch (mode) {
              case "ADD": {
                if (
                  !currentPlayer.permissions.some(
                    (p: string) =>
                      p === "permission.add" || p === "permission.*"
                  )
                ) {
                  // Prevent setting permissions for yourself
                  if (targetPlayer?.id === currentPlayer.id) {
                    const notifyData = {
                      message: "You cannot set permissions for yourself",
                    };
                    sendPacket(ws, packetManager.notify(notifyData));
                    break;
                  }
                  const notifyData = {
                    message: "Invalid command",
                  };
                  sendPacket(ws, packetManager.notify(notifyData));
                  break;
                }
                await permissions.add(targetPlayer.username, permissionsArray);
                // Update the player cache
                targetPlayer.permissions = permissionsArray;
                cache.set(targetPlayer.id, targetPlayer);
                const notifyData = {
                  message: `Permissions added to ${targetPlayer.username}`,
                };
                sendPacket(ws, packetManager.notify(notifyData));
                break;
              }
              case "REMOVE": {
                if (
                  !currentPlayer.permissions.some(
                    (p: string) =>
                      p === "permission.remove" || p === "permission.*"
                  )
                ) {
                  // Prevent setting permissions for yourself
                  if (targetPlayer?.id === currentPlayer.id) {
                    const notifyData = {
                      message: "You cannot set permissions for yourself",
                    };
                    sendPacket(ws, packetManager.notify(notifyData));
                    break;
                  }
                  const notifyData = {
                    message: "Invalid command",
                  };
                  sendPacket(ws, packetManager.notify(notifyData));
                  break;
                }
                await permissions.remove(
                  targetPlayer.username,
                  permissionsArray
                );
                // Update the player cache
                targetPlayer.permissions = permissionsArray;
                cache.set(targetPlayer.id, targetPlayer);
                const notifyData = {
                  message: `Permissions removed from ${targetPlayer.username}`,
                };
                sendPacket(ws, packetManager.notify(notifyData));
                break;
              }
              case "SET": {
                if (
                  !currentPlayer.permissions.some(
                    (p: string) =>
                      p === "permission.add" || p === "permission.*"
                  )
                ) {
                  // Prevent setting permissions for yourself
                  if (targetPlayer?.id === currentPlayer.id) {
                    const notifyData = {
                      message: "You cannot set permissions for yourself",
                    };
                    sendPacket(ws, packetManager.notify(notifyData));
                    break;
                  }
                  const notifyData = {
                    message: "Invalid command",
                  };
                  sendPacket(ws, packetManager.notify(notifyData));
                  break;
                }
                await permissions.set(targetPlayer.username, permissionsArray);
                // Update the player cache
                targetPlayer.permissions = permissionsArray;
                cache.set(targetPlayer.id, targetPlayer);
                const notifyData = {
                  message: `Permissions set for ${targetPlayer.username}`,
                };
                sendPacket(ws, packetManager.notify(notifyData));
                break;
              }
              case "CLEAR": {
                if (
                  !currentPlayer.permissions.some(
                    (p: string) =>
                      p === "permission.remove" || p === "permission.*"
                  )
                ) {
                  // Prevent setting permissions for yourself
                  if (targetPlayer?.id === currentPlayer.id) {
                    const notifyData = {
                      message: "You cannot set permissions for yourself",
                    };
                    sendPacket(ws, packetManager.notify(notifyData));
                    break;
                  }
                  const notifyData = {
                    message: "Invalid command",
                  };
                  sendPacket(ws, packetManager.notify(notifyData));
                  break;
                }
                await permissions.clear(targetPlayer.username);
                // Update the player cache
                targetPlayer.permissions = [];
                cache.set(targetPlayer.id, targetPlayer);
                const notifyData = {
                  message: `Permissions cleared for ${targetPlayer.username}`,
                };
                sendPacket(ws, packetManager.notify(notifyData));
                break;
              }
              case "LIST": {
                if (
                  !currentPlayer.permissions.some(
                    (p: string) =>
                      p === "permission.list" || p === "permission.*"
                  )
                ) {
                  const notifyData = {
                    message: "Invalid command",
                  };
                  sendPacket(ws, packetManager.notify(notifyData));
                  break;
                }
                const response =
                  ((await permissions.get(targetPlayer.username)) as string) ||
                  "No permissions found";
                const notifyData = {
                  message: `Permissions for ${
                    targetPlayer.username
                  }: ${response.replaceAll(",", ", ")}`,
                };
                sendPacket(ws, packetManager.notify(notifyData));
                break;
              }
            }
            break;
          }
          default: {
            const notifyData = {
              message: "Invalid command",
            };
            sendPacket(ws, packetManager.notify(notifyData));
            break;
          }
        }
        break;
      }
      // Unknown packet type
      default: {
        break;
      }
    }
  } catch (e) {
    log.error(e as string);
  }
}

// Function to filter players by map
function filterPlayersByMap(map: string) {
  const players = cache.list();
  return Object.values(players).filter(
    (p) =>
      p.location.map.replaceAll(".json", "") === map.replaceAll(".json", "")
  );
}

// Function to filter players by distance and map
function filterPlayersByDistance(ws: any, distance: number, map: string) {
  const players = filterPlayersByMap(map);
  const currentPlayer = cache.get(ws.data.id);
  return players.filter((p) => {
    const dx = p.location.position.x - currentPlayer.location.position.x;
    const dy = p.location.position.y - currentPlayer.location.position.y;
    return Math.sqrt(dx * dx + dy * dy) <= distance;
  });
}

// Try to parse the packet data
function tryParsePacket(data: any) {
  try {
    return JSON.parse(data.toString());
  } catch (e) {
    log.error(e as string);
    return undefined;
  }
}

function sendPacket(ws: any, packets: any[]) {
  packets.forEach((packet) => {
    ws.send(packet);
  });
}
