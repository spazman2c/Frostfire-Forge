import { packetTypes } from "./types";
import log from "../modules/logger";
import player from "../systems/player";
import permissions from "../systems/permissions";
import inventory from "../systems/inventory";
import cache from "../services/cache";
import assetCache from "../services/assetCache";
import language from "../systems/language";
import packet from "../modules/packet";
import generate from "../modules/sprites";
import swears from "../../config/swears.json";
const maps = assetCache.get("maps");
const spritesheets = assetCache.get("spritesheets");
import { decryptPrivateKey, decryptRsa, _privateKey } from "../modules/cipher";
// Load settings
import * as settings from "../../config/settings.json";

let restartScheduled: boolean;
let restartTimers: NodeJS.Timer[];

// Create sprites from the spritesheets
const spritePromises = spritesheets.map(async (spritesheet: any) => {
  const sprite = await generate(spritesheet);
  return sprite;
});

Promise.all(spritePromises).then((sprites) => {
  assetCache.add("sprites", sprites);
});

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
        ws.send(
          packet.encode(JSON.stringify({ type: "BENCHMARK", data: data }))
        );
        break;
      }
      case "PING": {
        ws.send(packet.encode(JSON.stringify({ type: "PONG", data: data })));
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "TIME_SYNC",
              data: Date.now(),
            })
          )
        );
        break;
      }
      case "PONG": {
        ws.send(packet.encode(JSON.stringify({ type: "PING", data: data })));
        break;
      }
      case "LOGIN": {
        ws.send(
          packet.encode(
            JSON.stringify({ type: "LOGIN_SUCCESS", data: ws.data.id, secret: ws.data.secret, publicKey: ws.data.publicKey })
          )
        );
        break;
      }
      case "TIME_SYNC": {
        // Calculate latency
        const latency = performance.now() - Number(data) - 5000;
        if (latency >= 3000) {
          log.error(
            `Client with id: ${ws.data.id} has high latency: ${latency}ms and will be disconnected`
          );
          ws.close(1001, "High latency");
        }
        const ServerTime = performance.now();
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "TIME_SYNC",
              data: ServerTime,
            })
          )
        );
        break;
      }
      case "AUTH": {
        // Set the session id for the player
        const auth = await player.setSessionId(data.toString(), ws.data.id);
        if (!auth) {
          ws.send(
            packet.encode(JSON.stringify({ type: "LOGIN_FAILED", data: null }))
          );
          ws.close(1008, "Already logged in");
          break;
        }
        const getUsername = (await player.getUsernameBySession(
          ws.data.id
        )) as any[];
        const username = getUsername[0]?.username as string;
        // Get permissions for the player
        const access = await permissions.get(username) as string;
        
        // Retrieve the player's inventory
        const items = (await inventory.get(username)) || [];
        if (items.length > 30) {
          items.length = 30;
        }
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "INVENTORY",
              data: items,
              slots: 30,
            })
          )
        );
        // Get the player's stats
        const stats = await player.getStats(username);
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "STATS",
              data: stats,
            })
          )
        );
        // Get client configuration
        const clientConfig = (await player.getConfig(username)) as any[];
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "CLIENTCONFIG",
              data: clientConfig,
            })
          )
        );
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
          spawnLocation = { map: "main.json", x: 0, y: 0 };
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
          ) || (maps as any[]).find((map: MapData) => map.name === "main.json");

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
          permissions: (typeof access === 'string' ? access.split(",") : []),
          movementInterval: null,
        });
        log.debug(
          `Spawn location for ${username}: ${spawnLocation.map.replace(
            ".json",
            ""
          )} at ${spawnLocation.x},${spawnLocation.y}`
        );
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "LOAD_MAP",
              data: [
                map?.compressed,
                map?.hash,
                spawnLocation?.map,
                position?.x || 0,
                position?.y || 0,
                position?.direction || "down",
              ],
            })
          )
        );

        // Load NPCs for the current map only
        const npcsInMap = npcs.filter(
          (npc: Npc) => npc.map === spawnLocation.map.replace(".json", "")
        );

        npcsInMap.forEach((npc: Npc) => {
          const particleArray = typeof npc.particles === 'string' ? (npc.particles as string).split(",").map(name => particles.find((p: Particle) => p.name === name.trim())).filter(Boolean) : [];
          ws.send(
            packet.encode(
              JSON.stringify({
                type: "CREATE_NPC",
                data: {
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
                },
              })
            )
          );
        });

        const players = filterPlayersByMap(spawnLocation.map);

        const playerData = [] as any[];

        players.forEach((player) => {
          player.ws.send(
            packet.encode(
              JSON.stringify({
                type: "SPAWN_PLAYER",
                data: {
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
                },
              })
            )
          );
        });

        players.forEach((player) => {
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
          };
          playerData.push(data);
        });
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "LOAD_PLAYERS",
              data: playerData,
            })
          )
        );
        break;
      }
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

        const movePlayer = () => {
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
            collisionPosition,
          );
          if (collision && !currentPlayer.isNoclip) {
            clearInterval(currentPlayer.movementInterval);
            currentPlayer.movementInterval = null;
            return;
          }

          currentPlayer.location.position = tempPosition;
          
          // Broadcast movement to other players
          const playersInMap = filterPlayersByMap(currentPlayer.location.map);
          const targetPlayers = currentPlayer.isStealth 
            ? playersInMap.filter(p => p.isAdmin)
            : playersInMap;

          targetPlayers.forEach((player) => {
            player.ws.send(
              packet.encode(
                JSON.stringify({
                  type: "MOVEXY",
                  data: {
                    id: ws.data.id,
                    _data: currentPlayer.location.position,
                  },
                })
              )
            );
          });
        };

        // Start continuous movement
        movePlayer(); // Execute first movement immediately
        currentPlayer.movementInterval = setInterval(movePlayer, 10); // Continue movement every 10ms
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
            player.ws.send(
              packet.encode(
                JSON.stringify({
                  type: "MOVEXY",
                  data: {
                    id: ws.data.id,
                    _data: currentPlayer.location.position,
                  },
                })
              )
            );
          });
        } else {
          const playersInMap = filterPlayersByMap(currentPlayer.location.map);
          playersInMap.forEach((player) => {
            player.ws.send(
              packet.encode(
                JSON.stringify({
                  type: "MOVEXY",
                  data: {
                    id: ws.data.id,
                    _data: currentPlayer.location.position,
                  },
                })
              )
            );
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
          playerWs.send(
            packet.encode(
              JSON.stringify({
                type: "CHAT",
                data: {
                  id: ws.data.id,
                  message,
                },
              })
            )
          );
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
          const encryptedMessage = Buffer.from(Object.values(message) as number[]);
          const privateKey = _privateKey;
          if (!privateKey) return;
          const decryptedPrivateKey = decryptPrivateKey(privateKey, process.env.RSA_PASSPHRASE || "").toString();
          decryptedMessage = decryptRsa(encryptedMessage, decryptedPrivateKey) || "";
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
        const englishMessage = currentPlayer.language === "en" ? 
          decryptedMessage as string : 
          await language.translate(decryptedMessage as string, "en");
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
            translations[player.language] = player.language === "en" ? filteredMessage : 
              await language.translate(filteredMessage, player.language);
          }

          sendMessageToPlayer(player.ws, translations[player.language]);
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
          ws.send(
            packet.encode(
              JSON.stringify({
                type: "SELECTPLAYER",
                data: null,
              })
            )
          );
          break;
        } else {
          if (selectedPlayer.isStealth && !player.isAdmin) {
            ws.send(
              packet.encode(
                JSON.stringify({
                  type: "SELECTPLAYER",
                  data: null,
                })
              )
            );
            break;
          }
          ws.send(
            packet.encode(
              JSON.stringify({
                type: "SELECTPLAYER",
                data: {
                  id: selectedPlayer.id,
                  username: selectedPlayer.username,
                  stats: selectedPlayer.stats,
                },
              })
            )
          );
        }
        break;
      }
      case "TARGETCLOSEST": {
        if (!currentPlayer) return;
        const playersInRange = filterPlayersByDistance(ws, 500, currentPlayer.location.map)
          .filter(p => !p.isStealth && p.id !== currentPlayer.id); // Filter out stealth players and self
        
        const closestPlayer = await player.findClosestPlayer(
          currentPlayer,
          playersInRange,
          500
        );

        ws.send(
          packet.encode(
            JSON.stringify({
              type: "SELECTPLAYER",
              data: {
                id: closestPlayer?.id || null,
                username: closestPlayer?.username || null,
                stats: closestPlayer?.stats || null,
              },
            })
          )
        );
        break;
      }
      case "INSPECTPLAYER": {
        if (currentPlayer) {
          ws.send(
            packet.encode(
              JSON.stringify({
                type: "INSPECTPLAYER",
                data: {
                  id: currentPlayer?.id,
                  stats: currentPlayer?.stats,
                  username: currentPlayer?.username,
                },
              })
            )
          );
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
        playersInMap.forEach((player) => {
          player.ws.send(
            packet.encode(
              JSON.stringify({
                type: "STEALTH",
                data: {
                  id: ws.data.id,
                  isStealth: currentPlayer.isStealth,
                },
              })
            )
          );
        });
        // Send the player's new position to all players in the map when they toggle stealth mode off
        if (!isStealth) {
          playersInMap.forEach((player) => {
            player.ws.send(
              packet.encode(
                JSON.stringify({
                  type: "MOVEXY",
                  data: {
                    id: ws.data.id,
                    _data: currentPlayer.location.position,
                  },
                })
              )
            );
          });
        }
        break;
      }
      case "ATTACK": {
        if (currentPlayer?.attackDelay > Date.now()) return;
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
        if (!playersInAttackRange.includes(target) || !player.canAttack(currentPlayer, target)) return;

        // Generate a number for the pitch of the audio
        const pitch = Math.random() * 0.1 + 0.95;

        // Random whole number between 10 and 25
        const damage = Math.floor(Math.random() * (25 - 10 + 1) + 10);
        target.stats.health -= damage;

        // Check if player is currently in stealth mode
        // If the player is in stealth mode, only send an audio packet to admins
        if (currentPlayer.isStealth) {
          playersInMapAdminNearBy.forEach((player) => {
            player.ws.send(
              packet.encode(
                JSON.stringify({
                  type: "AUDIO",
                  name: "attack_sword",
                  data: assetCache
                    .get("audio")
                    .find((a: SoundData) => a.name === "attack_sword"),
                  pitch: pitch,
                })
              )
            );
          });
        } else {
          playersNearBy.forEach((player) => {
            player.ws.send(
              packet.encode(
                JSON.stringify({
                  type: "AUDIO",
                  name: "attack_sword",
                  data: assetCache
                    .get("audio")
                    .find((a: SoundData) => a.name === "attack_sword"),
                  pitch: pitch,
                  timestamp: performance.now(),
                })
              )
            );
          });

          if (target.stats.health <= 0) {
            target.stats.health = 100;
            target.location.position = { x: 0, y: 0, direction: "down" };
            playersInMap.forEach((player) => {
              player.ws.send(
                packet.encode(
                  JSON.stringify({
                    type: "MOVEXY",
                    data: {
                      id: target.id,
                      _data: target.location.position,
                    },
                  })
                )
              );
              player.ws.send(
                packet.encode(
                  JSON.stringify({
                    type: "REVIVE",
                    data: {
                      id: target.id,
                      target: target.id,
                      stats: target.stats,
                    },
                  })
                )
              );
            });
          } else {
            playersInMap.forEach((player) => {
              player.ws.send(
                packet.encode(
                  JSON.stringify({
                    type: "UPDATESTATS",
                    data: {
                      id: ws.data.id,
                      target: target.id,
                      stats: target.stats,
                    },
                  })
                )
              );
            });
          }
        }
        player.setStats(target.username, target.stats);
        currentPlayer.attackDelay = Date.now() + 1000;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        currentPlayer.attackDelay = 0;
        break;
      }
      case "STARTGAME": {
        // Send music
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "MUSIC",
              name: "music_morning_dew",
              data: assetCache
                .get("audio")
                .find((a: SoundData) => a.name === "music_morning_dew"),
            })
          )
        );
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
            if (!currentPlayer.permissions.some((p: string) => p === "admin.kick" || p === "admin.*")) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You don't have permission to use this command" } })));
              break;
            } 
            const identifier = args[0].toLowerCase() || null;
            if (!identifier) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Please provide a username or ID" } })));
              break;
            }

            // Find player by ID or username
            let targetPlayer;
            if (isNaN(Number(identifier))) {
              // Search by username
              const players = Object.values(cache.list());
              targetPlayer = players.find(p => p.username.toLowerCase() === identifier.toLowerCase());
            } else {
              // Search by ID
              targetPlayer = cache.get(identifier);
            }

            // Prevent disconnecting yourself
            if (targetPlayer?.id === currentPlayer.id) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You cannot disconnect yourself" } })));
              break;
            }

            if (!targetPlayer) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Player not found or is not online" } })));
              break;
            }

            // Prevent disconnecting admins
            if (targetPlayer.isAdmin) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You cannot disconnect other admins" } })));
              break;
            }

            player.kick(targetPlayer.username, targetPlayer.ws);
            ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `Disconnected ${targetPlayer.username} from the server` } })));
            break;
          }
          // Send a message to all players in the current map
          case "NOTIFY":
          case "BROADCAST": {
            // server.notify or server.*
            if (!currentPlayer.permissions.some((p: string) => p === "server.notify" || p === "server.*")) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You don't have permission to use this command" } })));
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
                  player.ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message } })));
                });
                break;
              }
              case "ADMINS": {
                const playersInMap = filterPlayersByMap(currentPlayer.location.map);
                const playersInMapAdmins = playersInMap.filter((p) => p.isAdmin);
                playersInMapAdmins.forEach((player) => {
                  player.ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message } })));
                });
                break;
              }
              case "MAP": {
                const playersInMap = filterPlayersByMap(currentPlayer.location.map);
                playersInMap.forEach((player) => {
                  player.ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message } })));
                });
                break;
              }
            }
            break;
          }
          // Ban a player
          case "BAN": {
            // admin.ban or admin.*
            if (!currentPlayer.permissions.some((p: string) => p === "admin.ban" || p === "admin.*")) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You don't have permission to use this command" } })));
              break;
            }
            const identifier = args[0].toLowerCase() || null;
            if (!identifier) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Please provide a username or ID" } })));
              break;
            }

            // Find player by ID or username in cache first
            let targetPlayer;
            if (isNaN(Number(identifier))) {
              // Search by username
              const players = Object.values(cache.list());
              targetPlayer = players.find(p => p.username.toLowerCase() === identifier.toLowerCase());
            } else {
              // Search by ID
              targetPlayer = cache.get(identifier);
            }

            // If not found in cache, check database
            if (!targetPlayer) {
              const dbPlayer = await player.findPlayerInDatabase(identifier) as { username: string, banned: number }[];
              targetPlayer = dbPlayer.length > 0 ? dbPlayer[0] : null;
            }

            if (!targetPlayer) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Player not found" } })));
              break;
            }

            // Prevent banning yourself
            if (targetPlayer.id === currentPlayer.id) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You cannot ban yourself" } })));
              break;
            }

            // Prevent banning admins
            if (targetPlayer.isAdmin) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You cannot ban other admins" } })));
              break;
            }

            // Check if the player is already banned
            if (targetPlayer.banned) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `${targetPlayer.username} is already banned` } })));
              break;
            }
            
            // Ban the player
            await player.ban(targetPlayer.username, targetPlayer.ws);
            ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `Banned ${targetPlayer.username} from the server` } })));
            break;
          }
          case "UNBAN": {
            // admin.unban or admin.*
            if (!currentPlayer.permissions.some((p: string) => p === "admin.unban" || p === "admin.*")) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You don't have permission to use this command" } })));
              break;
            }
            const identifier = args[0] || null;
            if (!identifier) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Please provide a username or ID" } })));
              break;
            }

            const targetPlayer = await player.findPlayerInDatabase(identifier) as { username: string, banned: number }[] as any[];
            if (!targetPlayer) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Player not found or is not online" } })));
              break;
            }

            // Prevent unbanning yourself
            if (targetPlayer[0].id === currentPlayer.id) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You cannot unban yourself" } })));
              break;
            }

            // Unban the player
            await player.unban(targetPlayer[0].username);
            ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `Unbanned ${targetPlayer[0].username} from the server` } })));
            break;           
          }
          // Toggle admin status
          case "ADMIN":
          case "SETADMIN": {
            // server.admin or server.*
            if (!currentPlayer.permissions.some((p: string) => p === "server.admin" || p === "server.*")) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You don't have permission to use this command" } })));
              break;
            }
            const identifier = args[0].toLowerCase() || null;
            if (!identifier) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Please provide a username or ID" } })));
              break;
            }

            // Find player by ID or username in cache first
            let targetPlayer;
            if (isNaN(Number(identifier))) {
              // Search by username
              const players = Object.values(cache.list());
              targetPlayer = players.find(p => p.username.toLowerCase() === identifier.toLowerCase());
            } else {
              // Search by ID
              targetPlayer = cache.get(identifier);
            }

            // If not found in cache, check database
            if (!targetPlayer) {
              const dbPlayer = await player.findPlayerInDatabase(identifier) as { username: string, banned: number }[];
              targetPlayer = dbPlayer.length > 0 ? dbPlayer[0] : null;
            }

            // Prevent toggling your own admin status
            if (targetPlayer?.id === currentPlayer.id) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You cannot toggle your own admin status" } })));
              break;
            }
            
            // Toggle admin status
            const admin = await player.toggleAdmin(targetPlayer.username, targetPlayer.ws);
            // Update player cache if the player is in the cache
            if (targetPlayer) {
              targetPlayer.isAdmin = admin;
              cache.set(targetPlayer.id, targetPlayer);
            }
            ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `${targetPlayer.username} admin status has been updated to ${admin}` } })));
            break;
          }
          // Shutdown the server
          case "SHUTDOWN": {
            // server.shutdown or server.*
            if (!currentPlayer.permissions.some((p: string) => p === "server.shutdown" || p === "server.*")) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You don't have permission to use this command" } })));
              break;
            }
            const players = Object.values(cache.list());
            players.forEach((player) => {
              player.ws.send(packet.encode(JSON.stringify({ 
                type: "NOTIFY", 
                data: { message: "⚠️ Server shutting down - please reconnect in a few minutes ⚠️" } 
              })));
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
            if (!currentPlayer.permissions.some((p: string) => p === "server.restart" || p === "server.*")) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You don't have permission to use this command" } })));
              break;
            }

            // Check if restart is already scheduled
            if (restartScheduled) {
              restartTimers.forEach(timer => clearTimeout(timer));
              restartTimers = [];
              restartScheduled = false;
              
              const players = Object.values(cache.list());
              players.forEach((player) => {
                player.ws.send(packet.encode(JSON.stringify({ 
                  type: "NOTIFY", 
                  data: { message: "⚠️ Server restart has been aborted ⚠️" } 
                })));
              });
              break;
            }

            // Set restart flag
            restartScheduled = true;
            restartTimers = [];

            const minutes = 15;
            const RESTART_DELAY = minutes * 60000;
            const totalMinutes = Math.floor(RESTART_DELAY / 60000);
            
            const minuteIntervals = Array.from({length: totalMinutes}, (_, i) => totalMinutes - i);
            const secondIntervals = Array.from({length: 30}, (_, i) => 30 - i);

            // Minute notifications
            minuteIntervals.forEach(minutes => {
              restartTimers.push(setTimeout(() => {
                const players = Object.values(cache.list());
                players.forEach((player) => {
                  player.ws.send(packet.encode(JSON.stringify({ 
                    type: "NOTIFY", 
                    data: { message: `⚠️ Server restarting in ${minutes} minute${minutes === 1 ? '' : 's'} ⚠️` } 
                  })));
                });
              }, RESTART_DELAY - (minutes * 60 * 1000)));
            });

            // Second notifications
            secondIntervals.forEach(seconds => {
              restartTimers.push(setTimeout(() => {
                const players = Object.values(cache.list());
                players.forEach((player) => {
                  player.ws.send(packet.encode(JSON.stringify({ 
                    type: "NOTIFY", 
                    data: { message: `⚠️ Server restarting in ${seconds} second${seconds === 1 ? '' : 's'} ⚠️` } 
                  })));
                });
              }, RESTART_DELAY - (seconds * 1000)));
            });

            // Final exit timeout
            restartTimers.push(setTimeout(() => {
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
            }, RESTART_DELAY));
            break;
          }
          // Respawn player by username or ID
          case "RESPAWN": {
            // admin.respawn or admin.*
            if (!currentPlayer.permissions.some((p: string) => p === "admin.respawn" || p === "admin.*")) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You don't have permission to use this command" } })));
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
                targetPlayer = players.find(p => p.username.toLowerCase() === identifier.toLowerCase());
              } else {
                // Search by ID
                targetPlayer = cache.get(identifier);
              }

              // If not found in cache, check database
              if (!targetPlayer) {
                const dbPlayer = await player.findPlayerInDatabase(identifier) as { username: string }[];
                targetPlayer = dbPlayer.length > 0 ? dbPlayer[0] : null;
              }

              if (!targetPlayer) {
                ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Player not found" } })));
                break;
              }
            }

            // Respawn the player
            await player.setLocation(targetPlayer.username, "main", { x: 0, y: 0, direction: "down" });
            
            // Update cache if player is online
            if (cache.get(targetPlayer.id)) {
              targetPlayer.location.position = { x: 0, y: 0, direction: "down" };
              cache.set(targetPlayer.id, targetPlayer);
              const playersInMap = filterPlayersByMap(targetPlayer.location.map);
              playersInMap.forEach((player) => {
                player.ws.send(packet.encode(JSON.stringify({ type: "MOVEXY", data: { id: targetPlayer.id, _data: targetPlayer.location.position } })));
              });
            }
            
            ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `Respawned ${targetPlayer.username}` } })));
            break;
          }
          // Update permissions for a player
          case "PERMISSION":
          case "PERMISSIONS": {
            // admin.permission or admin.*
            if (!currentPlayer.permissions.some((p: string) => p === "admin.permission" || p === "admin.*")) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You don't have permission to use this command" } })));
              break;
            }
            const mode = args[0]?.toUpperCase() || null;
            if (!mode) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Please provide a mode" } })));
              break;
            }

            if (mode !== "ADD" && mode !== "REMOVE" && mode !== "SET" && mode !== "CLEAR" && mode !== "LIST") {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Invalid mode" } })));
              break;
            }

            let targetPlayer;
            const identifier = args[1]?.toLowerCase() || null;
            
            // Find player by ID or username in cache first
            const players = Object.values(cache.list());
            if (isNaN(Number(identifier))) {
              // Search by username
              targetPlayer = players.find(p => p.username.toLowerCase() === identifier.toLowerCase());
            } else {
              // Search by ID
              targetPlayer = cache.get(identifier);
            }

            // If not found in cache, check database
            if (!targetPlayer) {
              const dbPlayer = await player.findPlayerInDatabase(identifier) as { username: string }[];
              targetPlayer = dbPlayer.length > 0 ? dbPlayer[0] : null;
            }
            
            if (!targetPlayer) {
              ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Player not found" } })));
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
                  ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `Invalid permission: ${permission}` } })));
                  return;
                }
              });
            }

            switch (mode) {
              case "ADD": {
                if (!currentPlayer.permissions.some((p: string) => p === "permission.add" || p === "permission.*")) {
                  // Prevent setting permissions for yourself
                  if (targetPlayer?.id === currentPlayer.id) {
                    ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You cannot set permissions for yourself" } })));
                    break;
                  }
                  ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Invalid command" } })));
                  break;
                }
                await permissions.add(targetPlayer.username, permissionsArray);
                // Update the player cache
                targetPlayer.permissions = permissionsArray;
                cache.set(targetPlayer.id, targetPlayer);
                ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `Permissions added to ${targetPlayer.username}` } })));
                break;
              }
              case "REMOVE": {
                if (!currentPlayer.permissions.some((p: string) => p === "permission.remove" || p === "permission.*")) {
                  // Prevent setting permissions for yourself
                  if (targetPlayer?.id === currentPlayer.id) {
                    ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You cannot set permissions for yourself" } })));
                    break;
                  }
                  ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Invalid command" } })));
                  break;
                }
                await permissions.remove(targetPlayer.username, permissionsArray);
                // Update the player cache
                targetPlayer.permissions = permissionsArray;
                cache.set(targetPlayer.id, targetPlayer);
                ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `Permissions removed from ${targetPlayer.username}` } })));
                break;
              }
              case "SET": {
                if (!currentPlayer.permissions.some((p: string) => p === "permission.add" || p === "permission.*")) {
                  // Prevent setting permissions for yourself
                  if (targetPlayer?.id === currentPlayer.id) {
                    ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You cannot set permissions for yourself" } })));
                    break;
                  }
                  ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Invalid command" } })));
                  break;
                }
                await permissions.set(targetPlayer.username, permissionsArray);
                // Update the player cache
                targetPlayer.permissions = permissionsArray;
                cache.set(targetPlayer.id, targetPlayer);
                ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `Permissions set for ${targetPlayer.username}` } })));
                break;
              }
              case "CLEAR": {
                if (!currentPlayer.permissions.some((p: string) => p === "permission.remove" || p === "permission.*")) {
                  // Prevent setting permissions for yourself
                  if (targetPlayer?.id === currentPlayer.id) {
                    ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "You cannot set permissions for yourself" } })));
                    break;
                  }
                  ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Invalid command" } })));
                  break;
                }
                await permissions.clear(targetPlayer.username);
                // Update the player cache
                targetPlayer.permissions = [];
                cache.set(targetPlayer.id, targetPlayer);
                ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `Permissions cleared for ${targetPlayer.username}` } })));
                break;
              }
              case "LIST": {
                if (!currentPlayer.permissions.some((p: string) => p === "permission.list" || p === "permission.*")) {
                  ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Invalid command" } })));
                  break;
                }
                const response = await permissions.get(targetPlayer.username) as string || "No permissions found";
                ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: `Permissions for ${targetPlayer.username}: ${response.replaceAll(",", ", ")}` } })));
                break;
              }
            }
            break;
          }
          default: {
            ws.send(packet.encode(JSON.stringify({ type: "NOTIFY", data: { message: "Invalid command" } })));
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
