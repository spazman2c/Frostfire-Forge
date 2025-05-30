const socket = new WebSocket(`__VAR.WEBSOCKETURL__`);
let sentRequests = 0;
let receivedResponses = 0;
const overlay = document.getElementById("overlay") as HTMLDivElement;
const debugContainer = document.getElementById("debug-container") as HTMLDivElement;
const positionText = document.getElementById("position") as HTMLDivElement;
const packetsSentReceived = document.getElementById("packets-sent-received") as HTMLDivElement;
import * as pako from "../libs/pako.js";
import parseAPNG from '../libs/apng_parser.js';
socket.binaryType = "arraybuffer";
const players = [] as any[];
const npcs = [] as any[];
// const mapScale = 0.1;
const audioCache = new Map<string, string>();
const npcImage = new Image();
npcImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAmCAYAAABOFCLqAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TxQ8qDq0g4pChioNdVMSxVLEIFkpboVUHk0u/oElDkuLiKLgWHPxYrDq4OOvq4CoIgh8g7oKToouU+L+k0CLGg+N+vLv3uHsHCI0KU82uKKBqlpGKx8RsblXseYWAPgQxgSGJmXoivZiB5/i6h4+vdxGe5X3uzzGg5E0G+ETiKNMNi3iDeHbT0jnvE4dYSVKIz4knDbog8SPXZZffOBcdFnhmyMik5olDxGKxg+UOZiVDJZ4hDiuqRvlC1mWF8xZntVJjrXvyFwby2kqa6zRHEccSEkhChIwayqjAQoRWjRQTKdqPefhHHH+SXDK5ymDkWEAVKiTHD/4Hv7s1C9NTblIgBnS/2PbHGNCzCzTrtv19bNvNE8D/DFxpbX+1Acx9kl5va+EjYHAbuLhua/IecLkDDD/pkiE5kp+mUCgA72f0TTkgeAv0r7m9tfZx+gBkqKvlG+DgEBgvUva6x7t7O3v790yrvx+jlHK64ZQ6gAAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAAd0SU1FB+kCCRMwEsjIppIAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAB50lEQVRYw+2YvWvCYBDGn7xk0yRUKtqIiBBaUAoOznXv6B9b6GhnN3GRDErQRG2U1w9cStNB35hEjV/5sOBNuYRcft7de88h95LPW7gR4wHg/fURkrCMDYLOE/hofYMAgCQsQeeJ2EBYIgi7OS5UMS3VI4Oi8wSmpTrGhaq7TACgTBpQUYOyyZIkLJESg2+nyYyz46uGCWXS2IVhQKxsfSqhT7fPkuTHvl788mf7TstJ1PU9ZsTvVyTJjyvoNXZKLN7vZfuEOZrsat+nJwluyO4w/wKGPzaY9l0H4Z8MQ72nIUQJ2FsmNVWz5SBs0WRaOC3VoaZquzDpXhOmYUam3pKwhGmYSPea7jKxbEie8Ry2KZMGILB+Wq1hirlFrKcoJS6A1iYzn+0HyGJ8C99gxgHQ1z0ji9bmRjwgLBF2A8uihVWxgg6XiQSiw2WwKlZcFXFNYK2rI0lHkcAk6QhaVz889J6tISC6Uxdqaazh8Qksixa+2sb2COafrgZQtW0W3srZ87UpCAhvLCfUWTCsVN6yXeOrl6wQQWbl1Lj35eoOE9jaqWo64Gg2r3Zd6quaDvmcOTOYcZvBFPwUlsvZgxOe+KloWHZoSyB+Kho2kHdLIH4qGrZ5twTeT0XDNueWAADcLf3B+AfAy/vU2Mt7LwAAAABJRU5ErkJggg==';
const typingImage = new Image();
typingImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAVCAYAAADfLRcdAAABhWlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV+/qEhF0A4iDhmqONhFRcSpVLEIFkpboVUHk0u/oElDkuLiKLgWHPxYrDq4OOvq4CoIgh8g7oKToouU+L+k0CLGg+N+vLv3uHsHeJtVphj+GKCopp5OxIVcflUIviIAPwYwh3GRGVoys5iF6/i6h4evd1Ge5X7uz9EnFwwGeATiGNN0k3iDeGbT1DjvE4dZWZSJz4kndLog8SPXJYffOJds9vLMsJ5NzxOHiYVSF0tdzMq6QjxNHJEVlfK9OYdlzluclWqdte/JXxgqqCsZrtMcQQJLSCIFARLqqKAKE1FaVVIMpGk/7uIftv0pcknkqoCRYwE1KBBtP/gf/O7WKE5NOkmhOBB4sayPUSC4C7QalvV9bFmtE8D3DFypHX+tCcx+kt7oaJEjoH8buLjuaNIecLkDDD1poi7ako+mt1gE3s/om/LA4C3Qu+b01t7H6QOQpa6Wb4CDQ2CsRNnrLu/u6e7t3zPt/n4A+Ehy3OEAdvwAAAAGYktHRACjAGoAQYpfYckAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQfpBQQTFRn3o6swAAAAGXRFWHRDb21tZW50AENyZWF0ZWQgd2l0aCBHSU1QV4EOFwAAAIVJREFUSMdjZEACqday/xkGGZh99DEjjM3EMITAkHIsI3LUK4nxwSWOXH80YI6y0ZSDs++9+sQwmgxoDViQOchR/+bTtwFzFLI7pIQFRpMBfZMBLtAY/hfOrl/JPCBqR5MB3SqFZ28/DIrSQISPa7Q0GLjSALlOHm0bjKjSYLSnMJoMGBgAuS4u7T48tcgAAAAASUVORK5CYII=';
const onlinecount = document.getElementById("onlinecount") as HTMLDivElement;
const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
const progressBar = document.getElementById("progress-bar") as HTMLDivElement;
const progressBarContainer = document.getElementById("progress-bar-container") as HTMLDivElement;
const inventoryUI = document.getElementById("inventory") as HTMLDivElement;
const spellBookUI = document.getElementById("spell-book-container") as HTMLDivElement;
const friendsListUI = document.getElementById("friends-list-container") as HTMLDivElement;
const friendsList = document.getElementById("friends-list-content") as HTMLDivElement;
const inventoryGrid = document.getElementById("grid") as HTMLDivElement;
const statUI = document.getElementById("stat-screen") as HTMLDivElement;
const chatInput = document.getElementById("chat-input") as HTMLInputElement;
const chatMessages = document.getElementById("chat-messages") as HTMLDivElement;
const startGameButton = document.getElementById("start-game-button") as HTMLButtonElement;
const loadingScreen = document.getElementById("loading-screen");
const xpBar = document.getElementById("xp-bar") as HTMLDivElement;
if (startGameButton) {
  startGameButton.addEventListener("click", () => { 
    sendRequest({
      type: "STARTGAME",
      data: null,
    });
    // Hide the start game button
    startGameButton.style.display = "none";
    // Hide the loading screen
    if (loadingScreen) {
      // Fade out the loading screen after the map is loaded
      loadingScreen.style.transition = "1s";
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.style.display = "none";
        progressBar.style.width = "0%";
        progressBarContainer.style.display = "block";
      }, 1000);
    }
  });
}
const healthBar = document.getElementById(
  "health-progress-bar"
) as HTMLDivElement;
const staminaBar = document.getElementById(
  "stamina-progress-bar"
) as HTMLDivElement;
const targetStats = document.getElementById(
  "target-stats-container"
) as HTMLDivElement;
const targetHealthBar = document.getElementById(
  "target-health-progress-bar"
) as HTMLDivElement;
const targetStaminaBar = document.getElementById(
  "target-stamina-progress-bar"
) as HTMLDivElement;
//const map = document.getElementById("map") as HTMLDivElement;
//const fullmap = document.getElementById("full-map") as HTMLDivElement;
//const mapPosition = document.getElementById("position") as HTMLDivElement;
const pauseMenu = document.getElementById(
  "pause-menu-container"
) as HTMLDivElement;
const optionsMenu = document.getElementById(
  "options-menu-container"
) as HTMLDivElement;
const menuElements = ["options-menu-container"];
const fpsSlider = document.getElementById("fps-slider") as HTMLInputElement;
const musicSlider = document.getElementById("music-slider") as HTMLInputElement;
const effectsSlider = document.getElementById(
  "effects-slider"
) as HTMLInputElement;
const mutedCheckbox = document.getElementById(
  "muted-checkbox"
) as HTMLInputElement;
const healthLabel = document.getElementById("stats-screen-health-label") as HTMLDivElement;
const manaLabel = document.getElementById("stats-screen-mana-label") as HTMLDivElement;
let loaded: boolean = false;
let toggleInventory = false;
let toggleSpellBook = false;
let toggleFriendsList = false;
const times = [] as number[];
let lastFrameTime = 0; // Track the time of the last frame
let controllerConnected = false;

// Adjust these values near the top with other declarations
let cameraX = 0;
let cameraY = 0;

// Add this variable with other declarations at the top
let lastSentDirection = "";

// Add near the top with other canvas declarations
// const mapCanvas = document.createElement('canvas');
// document.body.appendChild(mapCanvas);
// mapCanvas.style.position = 'absolute';
// mapCanvas.style.zIndex = '1';
canvas.style.position = 'absolute';

let lastUpdate = performance.now(); // Declare outside function

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

// Event listener for gamepad connection
window.addEventListener("gamepadconnected", () => {
  controllerConnected = true;
});

// Event listener for gamepad disconnection
window.addEventListener("gamepaddisconnected", () => {
  controllerConnected = false;
});

const packet = {
  decode(data: ArrayBuffer) {
    const decoder = new TextDecoder();
    return decoder.decode(data);
  },
  encode(data: string) {
    const encoder = new TextEncoder();
    return encoder.encode(data);
  },
};

// Add these at the top level with other state variables
let lastDirection = "";
let pendingRequest = false;

animationLoop();
function animationLoop() {
  if (!ctx) return;

  const fpsTarget = parseFloat(fpsSlider.value);
  const frameDuration = 1000 / fpsTarget;
  const now = performance.now();

  // Skip frame if not enough time has passed
  const deltaTime = (now - lastFrameTime) / 1000; // seconds
  if (now - lastFrameTime < frameDuration) {
    window.requestAnimationFrame(animationLoop);
    return;
  }
  lastFrameTime = now;

  const currentPlayer = players.find(
    (player) => player.id === sessionStorage.getItem("connectionId")
  );
  
  if (!currentPlayer) {
    window.requestAnimationFrame(animationLoop);
    return;
  }

  // Update camera for current player
  updateCamera(currentPlayer);

  // Handle movement updates if moving
  if (isMoving && isKeyPressed) {
    const currentKeys = new Set([...pressedKeys]);
    let currentDirection = "";
    
    if (currentKeys.has("KeyW") && currentKeys.has("KeyA")) currentDirection = "UPLEFT";
    else if (currentKeys.has("KeyW") && currentKeys.has("KeyD")) currentDirection = "UPRIGHT";
    else if (currentKeys.has("KeyS") && currentKeys.has("KeyA")) currentDirection = "DOWNLEFT";
    else if (currentKeys.has("KeyS") && currentKeys.has("KeyD")) currentDirection = "DOWNRIGHT";
    else if (currentKeys.has("KeyW")) currentDirection = "UP";
    else if (currentKeys.has("KeyS")) currentDirection = "DOWN";
    else if (currentKeys.has("KeyA")) currentDirection = "LEFT";
    else if (currentKeys.has("KeyD")) currentDirection = "RIGHT";

    if (currentDirection && currentDirection !== lastDirection && !pendingRequest) {
      pendingRequest = true;
      sendRequest({
        type: "MOVEXY",
        data: currentDirection,
      });
      lastDirection = currentDirection;
      
      setTimeout(() => {
        pendingRequest = false;
      }, 50);
    }
  } else if (isMoving && !isKeyPressed) {
    // Handle movement stop
    if (lastDirection !== "") {
      sendRequest({
        type: "MOVEXY",
        data: "ABORT",
      });
    }
    isMoving = false;
    lastDirection = "";
  }

  // Calculate visible area once
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  // Clear entire visible viewport
  ctx.clearRect(scrollX, scrollY, viewportWidth, viewportHeight);

  // Filter visible entities with extended viewport
  const visiblePlayers = players.filter(player => 
    isInViewport(
      player.position.x, 
      player.position.y, 
      scrollX - 64,
      scrollY - 64,
      viewportWidth + 128,
      viewportHeight + 128
    ) && (player.id === sessionStorage.getItem("connectionId") || !player.isStealth || (player.isStealth && currentPlayer.isAdmin))
  );

  const visibleNpcs = npcs.filter(npc => 
    isInViewport(
      npc.position.x,
      npc.position.y,
      scrollX - 64,
      scrollY - 64,
      viewportWidth + 128,
      viewportHeight + 128
    )
  );

  // Render visible entities
  visiblePlayers.forEach(player => player.show(ctx));
  
  visibleNpcs.forEach(npc => {
    npc.show(ctx);
    // Only process particles for visible NPCs
    if (npc.particles) {
      npc.particles
        .filter((particle: any) => 
          particle.visible && 
          isInViewport(
            particle.x,
            particle.y,
            scrollX - 64,
            scrollY - 64,
            viewportWidth + 128,
            viewportHeight + 128,
            32
          ) 
        )
        .forEach((particle: any) => npc.updateParticle(particle, npc, ctx, deltaTime));
    }
  });

  // Update FPS counter
  if (times.length > 60) times.shift();
  times.push(now);

  window.requestAnimationFrame(animationLoop);
}

const cameraSmoothing = 0.08;
function updateCamera(currentPlayer: any) {
  if (!loaded) return;
  
  if (currentPlayer) {
    const now = performance.now();
    const deltaTime = Math.min((now - lastUpdate) / 16.67, 2);
    lastUpdate = now;
    
    // Calculate target camera position without rounding initially
    const targetX = currentPlayer.position.x - window.innerWidth / 2 + 8;
    const targetY = currentPlayer.position.y - window.innerHeight / 2 + 48;
    
    // Apply smoothing to unrounded values
    const smoothing = 1 - Math.pow(1 - cameraSmoothing, deltaTime);
    cameraX = lerp(cameraX, targetX, smoothing);
    cameraY = lerp(cameraY, targetY, smoothing);
    
    // Round only for the final scroll position
    window.scrollTo(Math.round(cameraX), Math.round(cameraY));
  }
}

// Helper function to check if an entity is in viewport
function isInViewport(x: number, y: number, scrollX: number, scrollY: number, viewportWidth: number, viewportHeight: number, buffer: number = 64) {
  return !(x < scrollX - buffer || 
           x > scrollX + viewportWidth + buffer || 
           y < scrollY - buffer || 
           y > scrollY + viewportHeight + buffer);
}

// Event listener for joystick movement
window.addEventListener("gamepadjoystick", (e: CustomEventInit) => {
  if (!loaded) return;
  if (pauseMenu.style.display == "block") return;

  // Get the joystick coordinates
  const x = e.detail.x;
  const y = e.detail.y;

  // Check if joystick is in neutral position (increased deadzone)
  const deadzone = 0.5;
  if (Math.abs(x) < deadzone && Math.abs(y) < deadzone) {
    if (lastSentDirection !== "ABORT") {
      sendRequest({
        type: "MOVEXY",
            data: "ABORT",
      });
      lastSentDirection = "ABORT";
    }
    return;
  }

  // Determine the angle in degrees
  const angle = Math.atan2(y, x) * (180 / Math.PI);

  // Determine direction based on angle ranges
  let direction = "";
  if (angle >= -22.5 && angle < 22.5) {
    direction = "RIGHT";
  } else if (angle >= 22.5 && angle < 67.5) {
    direction = "DOWNRIGHT";
  } else if (angle >= 67.5 && angle < 112.5) {
    direction = "DOWN";
  } else if (angle >= 112.5 && angle < 157.5) {
    direction = "DOWNLEFT";
  } else if (angle >= 157.5 || angle < -157.5) {
    direction = "LEFT";
  } else if (angle >= -157.5 && angle < -112.5) {
    direction = "UPLEFT";
  } else if (angle >= -112.5 && angle < -67.5) {
    direction = "UP";
  } else if (angle >= -67.5 && angle < -22.5) {
    direction = "UPRIGHT";
  }

  // Only send if direction changed
  if (direction && direction !== lastSentDirection) {
    if (pauseMenu.style.display == "block") return;
    sendRequest({
      type: "MOVEXY",
          data: direction,
    });
    lastSentDirection = direction;
  }
});

socket.onopen = () => {
  sendRequest({
    type: "PING",
    data: null,
  });
};

socket.onclose = () => {
  // Remove the loading bar if it exists
  progressBarContainer.style.display = 'none';
  showNotification("You have been disconnected from the server", false, true);
};

socket.onerror = () => {
  progressBarContainer.style.display = 'none';
  showNotification("An error occurred while connecting to the server", false, true);
};

const animationCache = new Map<string, string>();

socket.onmessage = async (event) => {
  receivedResponses++;
  if (!(event.data instanceof ArrayBuffer)) return;
  const data = JSON.parse(packet.decode(event.data))["data"];
  const type = JSON.parse(packet.decode(event.data))["type"];
  switch (type) {
    case "INVITATION": {
      // Show the invitation modal
      createInvitationPopup(data);
      break;
    }
    case "UPDATE_FRIENDS": {
        const currentPlayer = players.find((player) => player.id === sessionStorage.getItem("connectionId"));
        if (currentPlayer) {
          currentPlayer.friends = data.friends || [];
          updateFriendsList(data);
        }
      break;
    }
    case "ANIMATION": {
      let apng: any;
      try {
          if (animationCache.has(data.name)) {
              const inflatedData = animationCache.get(data.name)!;
              apng = parseAPNG(inflatedData);
          } else {
              // @ts-expect-error - pako is not defined because it is loaded in the index.html
              const inflatedData = pako.inflate(new Uint8Array(data.data.data));
              apng = parseAPNG(inflatedData.buffer);
              animationCache.set(data.name, inflatedData.buffer);
          }

          if (!(apng instanceof Error) && players) {
              const findPlayer = async () => {
                  const player = players.find(p => p.id === data.id);
                  if (player) {
                      player.animation = {
                          frames: apng.frames,
                          currentFrame: 0,
                          lastFrameTime: performance.now()
                      };
                      // Initialize the frames' images
                      apng.frames.forEach((frame: any) => frame.createImage());
                  } else {
                      // Retry after a short delay
                      await new Promise(resolve => setTimeout(resolve, 100));
                      await findPlayer();
                  }
              };
              
              findPlayer().catch(err => console.error('Error in findPlayer:', err));
          }
      } catch (error) {
          console.error('Failed to process animation data:', error);
      }
      break;
    }
    case "PONG":
      sendRequest({
        type: "LOGIN",
        data: null,
      });
      break;

    case "TIME_SYNC": {
      setTimeout(async () => {
        sendRequest({
              type: "TIME_SYNC",
              data: data,
        });
      }, 5000);
      break;
    }
    case "CONNECTION_COUNT": {
      onlinecount.innerText = `${data} online`;
      break;
    }
    case "SPAWN_PLAYER": {
      await isLoaded();
      updateFriendOnlineStatus(data.username, true);
      createPlayer(data);
      break;
    }
    case "LOAD_PLAYERS": {
      await isLoaded();
      if (!data) return;
      data.forEach((player: any) => {
        if (player.id != sessionStorage.getItem("connectionId")) {
          // Check if the player is already created and remove it
          players.forEach((p, index) => {
            if (p.id === player.id) {
              players.splice(index, 1);
            }
          });
          createPlayer(player);
        }
      });
      break;
    }
    case "DISCONNECT_PLAYER": {
      console.log("Player disconnected: " + data);
      // Remove the player from the players array
      players.forEach((player, index) => {
        if (player.id === data) {
          updateFriendOnlineStatus(player.username, false);
          players.splice(index, 1);
          const dot = document.querySelector(`[data-id="${player.id}"]`) as HTMLElement;
          if (dot) {
            dot.remove();
          }
        }
        // Untarget the player if they are targeted
        if (player.targeted) {
          player.targeted = false;
          targetStats.style.display = "none";
          updateTargetStats(0, 0, 0, 0);
        }
      });

      break;
    }
    case "MOVEXY": {
      const player = players.find((player) => player.id === data.id);
      if (!player) return;

      // Handle movement abort
      if (data._data === "abort") {
        break;
      }

      player.typing = false;

      // Smoothly update player position
      const targetX = canvas.width / 2 + data._data.x;
      const targetY = canvas.height / 2 + data._data.y;
      
      // Update position directly for non-client players
      if (data.id !== sessionStorage.getItem("connectionId")) {
        player.position.x = targetX;
        player.position.y = targetY;
      } else {
        // For the client player, update position directly to avoid input lag
        player.position.x = targetX;
        player.position.y = targetY;
        
        // Update position text
        positionText.innerText = `Position: ${data._data.x}, ${data._data.y}`;
      }
      break;
    }
    case "CREATE_NPC": {
      await isLoaded();
      if (!data) return;
      createNPC(data);
      break;
    }
    case "LOAD_MAP":
      {
        // Remove the full map image if it exists to update the map image with a new one
        // const image = fullmap.querySelector("img") as HTMLImageElement;
        // if (image) {
        //   fullmap.removeChild(image);
        // }
        // Uncompress zlib compressed data
        // @ts-expect-error - pako is not defined because it is loaded in the index.html
        const inflated = pako.inflate(new Uint8Array(new Uint8Array(data[0].data)), { to: "string" });
        const mapData = inflated ? JSON.parse(inflated) : null;
        const mapHash = data[1] as string;
        const mapName = data[2];

        const validateMap = async (mapName: string, mapHash: string) => {
            const response = await fetch(`/map/hash?name=${mapName}`);
            if (!response.ok || response.headers.get('content-length') === '0') {
                throw new Error("Failed to fetch map");
            }
            const { hash } = await response.json();
            if (hash !== mapHash) throw new Error("Map hash mismatch");
        };

        const loadTilesets = async (tilesets: any[]) => {
            if (!tilesets?.length) throw new Error("No tilesets found");

            // Fetch all tileset data and hashes concurrently
            const tilesetPromises = tilesets.map(async (tileset) => {
                const name = tileset.image.split("/").pop();
                const [tilesetResponse, hashResponse] = await Promise.all([
                    fetch(`/tileset?name=${name}`),
                    fetch(`/tileset/hash?name=${name}`)
                ]);

                if (!tilesetResponse.ok || !hashResponse.ok) {
                    throw new Error(`Failed to fetch tileset: ${name}`);
                }

                const [tilesetData, hashData] = await Promise.all([
                    tilesetResponse.json(),
                    hashResponse.json()
                ]);

                if (hashData.hash !== tilesetData.tileset.hash) {
                    throw new Error(`Hash mismatch for tileset: ${name}`);
                }

                // @ts-expect-error - pako is loaded in index.html
                const inflatedData = pako.inflate(new Uint8Array(tilesetData.tileset.data.data), { to: "string" });
                
                return new Promise<HTMLImageElement>((resolve, reject) => {
                    const image = new Image();
                    image.onload = () => resolve(image);
                    image.onerror = () => reject(new Error(`Failed to load tileset image: ${name}`));
                    image.src = `data:image/png;base64,${inflatedData}`;
                });
            });

            return Promise.all(tilesetPromises);
        };
        try {
            await validateMap(mapName, mapHash);
            const images = await loadTilesets(mapData.tilesets);
            if (!images.length) throw new Error("No tileset images loaded");
            await drawMap(images);
        } catch (error) {
            console.error("Map loading failed:", error);
            throw error;
        }

        async function drawMap(images: HTMLImageElement[]): Promise<void> {
          return new Promise((resolve) => {
            const mapWidth = mapData.width * mapData.tilewidth;
            const mapHeight = mapData.height * mapData.tileheight;
            
            // Create canvas for each layer
            const layerCanvases = mapData.layers.map((_layer: any, index: number) => {
              const layerCanvas = document.createElement('canvas');
              // Set dimensions
              layerCanvas.width = mapWidth;
              layerCanvas.height = mapHeight;
              // Set styles
              layerCanvas.style.position = 'absolute';
              layerCanvas.style.zIndex = (_layer.zIndex || index < 6 ? index : index + 1).toString();
              layerCanvas.style.width = `${mapWidth}px`;
              layerCanvas.style.height = `${mapHeight}px`;
              
              document.body.appendChild(layerCanvas);
              return {
                  canvas: layerCanvas,
                  ctx: layerCanvas.getContext('2d', { willReadFrequently: false })!
              };
            });
            
            // Match game canvas dimensions
            canvas.width = mapWidth;
            canvas.height = mapHeight;
            canvas.style.width = mapWidth + "px";
            canvas.style.height = mapHeight + "px";
            canvas.style.zIndex = '7';
            
            // Sort layers by zIndex
            const sortedLayers = [...mapData.layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            let currentLayer = 0;
            let progress = 0;
            const step = 100 / mapData.layers.length;
            
            async function processLayer(layer: any, layerCanvas: any): Promise<void> {
              const ctx = layerCanvas.ctx;
              ctx.imageSmoothingEnabled = false;
              
              const batchSize = 10;
              progress += step;
              progressBar.style.width = `${progress}%`;
              
              async function processRowBatch(startY: number): Promise<void> {
                for (let y = startY; y < startY + batchSize && y < mapData.height; y++) {
                  for (let x = 0; x < mapData.width; x++) {
                    const tileIndex = layer.data[y * mapData.width + x];
                    if (tileIndex === 0) continue;
                    
                    const tileset = mapData.tilesets.find(
                      (t: any) => t.firstgid <= tileIndex && tileIndex < t.firstgid + t.tilecount
                    );
                    if (!tileset) continue;
                    
                    const image = images[mapData.tilesets.indexOf(tileset)] as unknown as HTMLImageElement;
                    if (!image) continue;
                    
                    const localTileIndex = tileIndex - tileset.firstgid;
                    const tilesPerRow = Math.floor(tileset.imagewidth / tileset.tilewidth);
                    const tileX = (localTileIndex % tilesPerRow) * tileset.tilewidth;
                    const tileY = Math.floor(localTileIndex / tilesPerRow) * tileset.tileheight;
                    
                    ctx.drawImage(
                      image,
                      tileX,
                      tileY,
                      tileset.tilewidth,
                      tileset.tileheight,
                      x * mapData.tilewidth,
                      y * mapData.tileheight,
                      mapData.tilewidth,
                      mapData.tileheight
                    );
                  }
                }
                
                if (startY + batchSize < mapData.height) {
                  await new Promise(resolve => setTimeout(resolve, 0));
                  await processRowBatch(startY + batchSize);
                }
              }
              
              await processRowBatch(0);
            }
            
            async function renderLayers(): Promise<void> {
              while (currentLayer < sortedLayers.length) {
                const layer = sortedLayers[currentLayer];
                await processLayer(layer, layerCanvases[currentLayer]);
                currentLayer++;
                await new Promise(resolve => requestAnimationFrame(resolve));
              }
              
              canvas.style.display = "block";
              startGameButton.style.display = "block";
              progressBarContainer.style.display = "none";
              
              resolve();
            }
            
            loaded = true;
            renderLayers();
          });
        }        
      }
      break;
    case "LOGIN_SUCCESS":
      {
        const connectionId = JSON.parse(packet.decode(event.data))["data"];
        const chatDecryptionKey = JSON.parse(packet.decode(event.data))["chatDecryptionKey"];
        sessionStorage.setItem("connectionId", connectionId); // Store client's socket ID
        const sessionToken = getCookie("token");
        if (!sessionToken) {
          window.location.href = "/";
          return;
        }

        // Store public key
        sessionStorage.setItem("chatDecryptionKey", chatDecryptionKey);

        const language = navigator.language.split("-")[0] || navigator.language || "en";
        sendRequest({
          type: "AUTH",
          data: sessionToken,
          language,
        });
      }
      break;
    case "LOGIN_FAILED":
      {
        window.location.href = "/";
      }
      break;
    case "INVENTORY":
      {
        const data = JSON.parse(packet.decode(event.data))["data"];
        const slots = JSON.parse(packet.decode(event.data))["slots"];
        if (data.length > 0) {
          // Assign each item to a slot
          for (let i = 0; i < data.length; i++) {
            // Create a new item slot
            const slot = document.createElement("div");
            slot.classList.add("slot");
            slot.classList.add("ui");
            const item = data[i];
            slot.classList.add(item.quality.toLowerCase() || "empty");

            if (item.icon) {
              // @ts-expect-error - pako is loaded in index.html
              const inflatedData = pako.inflate(new Uint8Array(item.icon.data), { to: "string" });
              const iconImage = new Image();
              iconImage.src = `data:image/png;base64,${inflatedData}`;
              iconImage.onload = () => {
                slot.appendChild(iconImage);
              };
              // Overlay item quantity if greater than 1
              if (item.quantity > 1) {
                const quantityLabel = document.createElement("div");
                quantityLabel.classList.add("quantity-label");
                quantityLabel.innerText = `x${item.quantity}`;
                slot.appendChild(quantityLabel);
              }
              inventoryGrid.appendChild(slot);
            } else {
              slot.innerHTML = `${item.item}${
                item.quantity > 1 ? `<br>x${item.quantity}` : ""
              }`;
              inventoryGrid.appendChild(slot);
            }
          }
        }

        for (let i = 0; i < slots - data.length; i++) {
          const slot = document.createElement("div");
          slot.classList.add("slot");
          slot.classList.add("empty");
          slot.classList.add("ui");
          inventoryGrid.appendChild(slot);
        }
      }
      break;
    case "QUESTLOG": {
      const data = JSON.parse(packet.decode(event.data))["data"];
      console.log(data);
      break;
    }
    case "QUESTDETAILS": {
      const data = JSON.parse(packet.decode(event.data))["data"];
      console.log(data);
      break;
    }
    case "CHAT": {
      players.forEach((player) => {
        if (player.id === data.id) {
          // Escape HTML tags before setting chat message
          player.chat = data.message;
          // Username with first letter uppercase
          const username = data?.username?.charAt(0).toUpperCase() + data?.username?.slice(1);
          const timestamp = new Date().toLocaleTimeString();
          // Update chat box
          if (data.message?.trim() !== "" && username) {
            const message = document.createElement("div");
            message.classList.add("message");
            message.style.userSelect = "text";
            // Escape HTML in the message before inserting
            const escapedMessage = data.message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            message.innerHTML = `${timestamp} ${username}: ${escapedMessage}`;
            chatMessages.appendChild(message);
            // Scroll to the bottom of the chat messages
            chatMessages.scrollTop = chatMessages.scrollHeight;
            // Set typing to false
            player.typing = false;
          }
        }
      });
      break;
    }
    case "TYPING": {
      players.forEach((player) => {
        if (player.id === data.id) {
          player.typing = true;
          // Clear any existing timeout for this player
          if (player.typingTimeout) {
            clearTimeout(player.typingTimeout);
          }
          // Set typing to false after 5 seconds
          player.typingTimeout = setTimeout(() => {
            player.typing = false;
          }, 3000);
        }
      });
      break;
    }
    case "STOPTYPING": {
      players.forEach((player) => {
        if (player.id === data.id) {
          player.typing = false;
        }
      });
      break;
    }
    case "NPCDIALOG": {
      const npc = npcs.find((npc) => npc.id === data.id);
      if (!npc) return;
      npc.dialog = data.dialog;
      break;
    }
    case "STATS": {
      updateStats(data.health, data.stamina, data.max_stamina, data.max_health);
      updateXp(data.xp, data.level, data.max_xp);
      // Update the player's stats so the health and stamina bars are accurate
      players.forEach((player) => {
        if (player.id === data.id) {
          player.stats = data;
        }
      });
      break;
    }
    case "CLIENTCONFIG": {
      const data = JSON.parse(packet.decode(event.data))["data"][0];
      fpsSlider.value = data.fps;
      document.getElementById(
        "limit-fps-label"
      )!.innerText = `FPS: (${fpsSlider.value})`;
      musicSlider.value = data.music_volume || 0;
      document.getElementById(
        "music-volume-label"
      )!.innerText = `Music: (${musicSlider.value})`;
      effectsSlider.value = data.effects_volume || 0;
      document.getElementById(
        "effects-volume-label"
      )!.innerText = `Effects: (${effectsSlider.value})`;
      mutedCheckbox.checked = data.muted;
      document.getElementById(
        "muted-checkbox"
      )!.innerText = `Muted: ${mutedCheckbox.checked}`;
      break;
    }
    case "SELECTPLAYER": {
      const data = JSON.parse(packet.decode(event.data))["data"];
      if (!data || !data.id || !data.username) {
        players.forEach((player) => {
          player.targeted = false;
        });
        targetStats.style.display = "none";
        updateTargetStats(0, 0, 0, 0);
        break;
      } else {
        players.forEach((player) => {
          if (player.id === data.id) {
            player.targeted = true;
            targetStats.style.display = "block";
            updateTargetStats(player.stats.health, player.stats.max_health, player.stats.stamina, player.stats.max_stamina);
          } else {
            player.targeted = false;
          }
        });
      }
      break;
    }
    case "STEALTH": {
      const data = JSON.parse(packet.decode(event.data))["data"];
      const currentPlayer = players.find(
        (player) => player.id === sessionStorage.getItem("connectionId")
      );

      if (currentPlayer && data.id === currentPlayer.id) {
        sendRequest({
          type: "MOVEXY",
          data: "ABORT",
        });
      }

      players.forEach((player) => {
        if (player.id === data.id) {
          player.isStealth = data.isStealth;
        }
        // Untarget if the player is stealthed and targeted
        if (player.isStealth && player.targeted) {
          player.targeted = false;
          targetStats.style.display = "none";
          updateTargetStats(0, 0, 0, 0);
        }

        const dot = document.querySelector(`[data-id="${player.id}"]`) as HTMLElement;
        if (!dot) return;
        if (player.isStealth) {
          if (currentPlayer?.isAdmin) {
            dot.style.opacity = "1";
          } else {
            dot.style.opacity = "0";
          }
        } else {
          dot.style.opacity = "1";
        }
      });
      break;
    }
    case "UPDATESTATS": {
      const data = JSON.parse(packet.decode(event.data))["data"];
      const target = players.find((player) => player.id === data.target);
      if (!target) return;
      updateStatsNew(target.id, data.stats.health, data.stats.stamina, data.stats.max_stamina);
      break;
    }
    case "REVIVE": {
      const data = JSON.parse(packet.decode(event.data))["data"];
      const target = players.find((player) => player.id === data.target);
      if (!target) return;
      target.stats = data.stats;
      if (target.id === sessionStorage.getItem("connectionId")) {
        updateStats(target.stats.health, target.stats.stamina, target.stats.max_stamina, target.stats.max_health);
      } else {
        target.targeted = false;
        updateTargetStats(0, 0, 0, 0);
      }

      // untarget all players
      targetStats.style.display = "none";
      players.forEach((player) => {
        player.targeted = false;
      });
      break;
    }
    case "UPDATE_XP": {
      const data = JSON.parse(packet.decode(event.data))["data"];
      console.log(data);
      // Only update the xp bar if the current player is the target
      if (data.id === sessionStorage.getItem("connectionId")) {
        updateXp(data.xp, data.level, data.max_xp);
      }
      break;
    }
    case "AUDIO": {
      const name = JSON.parse(packet.decode(event.data))["name"];
      const data = JSON.parse(packet.decode(event.data))["data"];
      const pitch = JSON.parse(packet.decode(event.data))["pitch"] || 1;
      const timestamp = JSON.parse(packet.decode(event.data))["timestamp"];
      playAudio(name, data.data.data, pitch, timestamp);
      break;
    }
    case "MUSIC": {
      const name = JSON.parse(packet.decode(event.data))["name"];
      const data = JSON.parse(packet.decode(event.data))["data"];
      const timestamp = JSON.parse(packet.decode(event.data))["timestamp"];
      playMusic(name, data.data.data, timestamp);
      break;
    }
    case "INSPECTPLAYER": {
      const data = JSON.parse(packet.decode(event.data))["data"];
      // Add the player ID as an attribute to the target stats container
      statUI.setAttribute("data-id", data.id);
      healthLabel!.innerText = `Health: (${data.stats.health})`;
      manaLabel!.innerText = `Mana: (${data.stats.stamina})`;
      statUI.style.transition = "1s";
      statUI.style.left = "10";
      break;
    }
    case "NOTIFY": {
      const data = JSON.parse(packet.decode(event.data))["data"];
      showNotification(data.message, true, false);
      break;
    }
    default:
      break;
  }
}

function updateXp(xp: number, level: number, max_xp: number) {
  const xpPercent = (xp / max_xp) * 100;
  xpBar.style.width = `${Math.max(0, Math.min(100, xpPercent))}%`;
}

function playMusic(name: string, data: Uint8Array, timestamp: number): void {
// Check if the audio is already cached, if not, inflate the data
    // @ts-expect-error - pako is not defined because it is loaded in the index.html
    const cachedAudio = timestamp < performance.now() - 3.6e+6 ? pako.inflate(new Uint8Array(data),{ to: 'string' }) : audioCache.get(name)|| pako.inflate(new Uint8Array(data), { to: 'string' });
    const music = new Audio(`data:audio/wav;base64,${cachedAudio}`);
    if (!music) {
      console.error("Failed to create audio element");
      return;
    }
    const musicVolume = Number(musicSlider.value);
    music.volume = mutedCheckbox.checked || musicVolume === 0 ? 0 : musicVolume / 100;
    music.loop = true;
    try {
      music.play();
      // Cache the audio
      audioCache.set(name, cachedAudio);
      startMusicInterval(music);
    } catch (e) {
      console.error(e);
    }
}

function startMusicInterval(music: any) {
  setInterval(() => {
    const musicVolume = Number(musicSlider.value);
    music.volume = mutedCheckbox.checked || musicVolume === 0 ? 0 : musicVolume / 100;
  }, 100);
}

function playAudio(name: string, data: Uint8Array, pitch: number, timestamp: number): void {
  // Get mute status
  if (mutedCheckbox.checked) return;
  // Get effects volume
  const volume = effectsSlider.value === "0" ? 0 : Number(effectsSlider.value) / 100;
  // Check if the audio is already cached, if not, inflate the data
  // @ts-expect-error - pako is not defined because it is loaded in the index.html
  const cachedAudio = timestamp < performance.now() - 3.6e+6 ? pako.inflate(new Uint8Array(data),{ to: 'string' }) : audioCache.get(name)|| pako.inflate(new Uint8Array(data), { to: 'string' });
  const audio = new Audio(`data:audio/wav;base64,${cachedAudio}`);
  if (!audio) {
    console.error("Failed to create audio element");
    return;
  }
  audio.playbackRate = pitch;
  audio.volume = volume;
  // Auto play
  audio.autoplay = true;

  try {
    audio.play();
    // Cache the audio
    audioCache.set(name, cachedAudio);
  } catch (e) {
    console.error(e);
  }  
}

function getCookie(cname: string) {
  const name = cname + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

let isKeyPressed = false;
let isMoving = false;
const pressedKeys = new Set();
const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
let lastTypingPacket = 0;
let typingTimer: number | null = null;

chatInput.addEventListener("input", () => {
  // Clear any existing timer
  if (typingTimer) {
    window.clearTimeout(typingTimer);
  }

  // Send typing packet if enough time has passed since last one
  if (lastTypingPacket + 1000 < performance.now()) {
    sendRequest({
      type: "TYPING",
      data: null,
    });
    lastTypingPacket = performance.now();
  }

  // Set new timer to send another packet after delay
  typingTimer = window.setTimeout(() => {
    if (chatInput.value.length > 0) {
      sendRequest({
        type: "TYPING",
        data: null,
      });
      lastTypingPacket = performance.now();
    }
  }, 1000);
});

const cooldowns: { [key: string]: number } = {};
const COOLDOWN_DURATION = 1000; // milliseconds

// Keyboard event handler configuration

const keyHandlers = {
  F2: () => toggleDebugContainer(),
  Escape: () => handleEscapeKey(),
  KeyB: () => {
    toggleInventory = toggleUI(inventoryUI, toggleInventory, -350);
  },
  KeyP: () => {
    if (toggleFriendsList) {
      toggleFriendsList = toggleUI(friendsListUI, toggleFriendsList, -425);
    }

    toggleSpellBook = toggleUI(spellBookUI, toggleSpellBook, -425);
  },
  KeyO: () => {
    if (toggleSpellBook) {
      toggleSpellBook = toggleUI(spellBookUI, toggleSpellBook, -425);
    }

    toggleFriendsList = toggleUI(friendsListUI, toggleFriendsList, -425);
  },
  KeyC: () => handleStatsUI(),
  Tab: (e: KeyboardEvent) => {
    e.preventDefault();
    sendRequest({ type: "TARGETCLOSEST", data: null });
  },
  KeyX: () => sendRequest({ type: "STEALTH", data: null }),
  KeyZ: () => sendRequest({ type: "NOCLIP", data: null }),
  Enter: async () => handleEnterKey(),
  Space: () => handleSpaceKey(),
} as const;

// Movement keys configuration
const blacklistedKeys = new Set(['AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight']);

// Helper functions
function toggleDebugContainer() {
  debugContainer.style.display = debugContainer.style.display === "block" ? "none" : "block";
}

function toggleUI(element: HTMLElement, toggleFlag: boolean, hidePosition: number) {
  element.style.transition = "1s";
  element.style.right = toggleFlag ? hidePosition.toString() : "10";
  return !toggleFlag;
}

function handleStatsUI() {
  const isCurrentPlayerStats = statUI.getAttribute("data-id") === sessionStorage.getItem("connectionId");
  if (statUI.style.left === "10px" && isCurrentPlayerStats) {
    statUI.style.transition = "1s";
    statUI.style.left = "-570";
  } else {
    sendRequest({ type: "INSPECTPLAYER", data: null });
  }
}

function handleEscapeKey() {
  stopMovement();
  chatInput.blur();
  
  const isPauseMenuVisible = pauseMenu.style.display === "block";
  pauseMenu.style.display = isPauseMenuVisible ? "none" : "block";
  
  // Close other menus
  menuElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element?.style.display === "block") {
      element.style.display = "none";
    }
  });
}

async function handleEnterKey() {
  const isTyping = chatInput === document.activeElement;
  
  if (!isTyping) {
    sentRequests++;
    chatInput.focus();
    return;
  }

  sendRequest({ type: "STOPTYPING", data: null });
  
  const message = chatInput.value.trim();
  if (!message) {
    chatInput.value = "";
    chatInput.blur();
    return;
  }

  if (message.startsWith("/")) {
    handleCommand(message);
  } else {
    await handleChatMessage(message);
  }

  chatInput.value = "";
  chatInput.blur();
}

function handleCommand(message: string) {
  const command = message.substring(1);
  const commandParts = command.match(/[^\s"]+|"([^"]*)"/g) || [];
  const commandName = commandParts[0];
  const commandArgs = commandParts.slice(1).map(arg => 
    arg.startsWith('"') ? arg.slice(1, -1) : arg
  );

  sendRequest({
    type: "COMMAND",
    data: { command: commandName, args: commandArgs }
  });
}

async function handleChatMessage(message: string) {
  if (window?.crypto?.subtle) {
    const chatDecryptionKey = sessionStorage.getItem("chatDecryptionKey");
    if (!chatDecryptionKey) return;
    
    const encryptedMessage = await encryptRsa(chatDecryptionKey, message || " ");
    sendRequest({
      type: "CHAT",
      data: { message: encryptedMessage, mode: "decrypt" }
    });
  } else {
    sentRequests++;
    sendRequest({
      type: "CHAT",
      data: { message: message || " ", mode: null }
    });
  }

  // Set timeout to clear chat
  setTimeout(() => {
    const currentPlayer = players.find(p => p.id === sessionStorage.getItem("connectionId"));
    if (currentPlayer?.chat === message) {
      sendRequest({ type: "CHAT", data: null });
    }
  }, 7000 + message.length * 35);
}

function handleSpaceKey() {
  const target = players.find(player => player.targeted);
  if (target) {
    sendRequest({ type: "ATTACK", data: target });
  }
}

// Main keyboard event handlers
window.addEventListener("keydown", async (e) => {
  if (!loaded || (pauseMenu.style.display === "block" && e.code !== "Escape")) return;
  if (chatInput === document.activeElement && !["Enter", "Escape"].includes(e.code)) return;

  // Handle movement keys
  if (movementKeys.has(e.code)) {
    pressedKeys.add(e.code);
    if (!isKeyPressed) {
      isKeyPressed = true;
      if (!isMoving) {
        handleKeyPress();
      }
    }
  }

  // Handle other mapped keys
  const now = Date.now();
  const handler = keyHandlers[e.code as keyof typeof keyHandlers];
  if (!handler) return;
  // Prevent repeated calls within cooldown
  if (cooldowns[e.code] && now - cooldowns[e.code] < COOLDOWN_DURATION) return;

  cooldowns[e.code] = now;

  try {
    await handler(e as KeyboardEvent);
  } catch (err) {
    console.error(`Error handling key ${e.code}:`, err);
  }

  // Prevent blacklisted keys
  if (blacklistedKeys.has(e.code)) {
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  if (chatInput === document.activeElement) return;
  if (movementKeys.has(e.code)) {
    pressedKeys.delete(e.code);
    if (pressedKeys.size === 0) {
      isKeyPressed = false;
    }
  }
});

function handleKeyPress() {
  if (!loaded || controllerConnected || pauseMenu.style.display === "block" || isMoving) return;
  isMoving = true;
  lastDirection = "";
  pendingRequest = false;
}

async function isLoaded() {
  // Check every second if the map is loaded
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (loaded) {
        clearInterval(interval);

        resolve();
      }
    }, 10);
  });
}

function createNPC(data: any) {
  const npc: {
    id: string;
    position: { x: number; y: number };
    dialog: string;
    particles: Particle[];
    quest: number | null;
    show: (context: CanvasRenderingContext2D) => void;
    updateParticle: (particle: Particle, npc: any, context: CanvasRenderingContext2D, deltaTime: number) => void;
  } = {
    id: data.id,
    dialog: data.dialog || "",
    position: {
      x: canvas.width / 2 + data.location.x,
      y: canvas.height / 2 + data.location.y,
    },
    particles: data.particles || [],
    quest: data.quest || null,
    show: function (this: typeof npc, context: CanvasRenderingContext2D) {
      if (!npcImage || !context) return;
      // Get current players admin status
      const currentPlayer = players.find(
        (player) => player.id === sessionStorage.getItem("connectionId")
      );
      if (data?.hidden && !currentPlayer?.isAdmin) return;
      context.globalAlpha = 1;
      context.drawImage(npcImage, this.position.x, this.position.y, npcImage.width, npcImage.height);

      context.fillStyle = "black";
      context.fillStyle = "white";
      context.font = "14px 'Comic Relief'";
      context.textAlign = "center";
      if (this.dialog) {
        if (this.dialog.trim() !== "") {
          const lines = getLines(context, this.dialog, 500).reverse();
          let startingPosition = this.position.y;

          for (let i = 0; i < lines.length; i++) {
            startingPosition -= 15;
            context.fillText(lines[i], this.position.x + 16, startingPosition);
          }
        }
      }
    },
    updateParticle: async (particle: Particle, npc: any, context: CanvasRenderingContext2D, deltaTime: number) => {
      // Initialize particle arrays and timing for each type if they don't exist
      if (!npc.particleArrays) {
        npc.particleArrays = {};
        npc.lastEmitTime = {};
      }
      
      const currentTime = performance.now();
      const emitInterval = (particle.interval || 1) * 16.67; // Convert to milliseconds (60fps = 16.67ms)
      
      // Initialize or get the last emit time for this particle type
      if (!npc.lastEmitTime[particle.name || '']) {
        npc.lastEmitTime[particle.name || ''] = currentTime;
      }
      
      // Initialize particle array if it doesn't exist
      if (!npc.particleArrays[particle.name || '']) {
        npc.particleArrays[particle.name || ''] = [];
      }

      // Check if it's time to emit a new particle
      if (currentTime - npc.lastEmitTime[particle.name || ''] >= emitInterval) {
        const randomLifetimeExtension = Math.random() * (particle.staggertime || 0);
        const baseLifetime = particle.lifetime || 1000;
        const windDirection = typeof particle.weather === 'object' ? particle.weather.wind_direction : null;
        const windSpeed = typeof particle.weather === 'object' ? particle.weather.wind_speed || 0 : 0;

        // Default wind bias to 0
        const windBias = {
          x: 0,
          y: 0
        }

        if (windDirection !== null && (windDirection === 'left' || windDirection === 'right')) {
          // Apply wind direction bias to initial position
          const windDirectionRad = (windDirection === 'left' ? 180 : 
                                  windDirection === 'right' ? 0 : 180) * Math.PI / 180;
          windBias.x = Math.cos(windDirectionRad) * windSpeed * 0.5;
          windBias.y = Math.sin(windDirectionRad) * windSpeed * 0.5;
        }

        const newParticle: Particle = {
          ...particle,
          localposition: { 
            x: Number(particle.localposition?.x || 0) + (Math.random() < 0.5 ? -1 : 1) * Math.random() * Number(particle.spread.x),
            y: Number(particle.localposition?.y || 0) + (Math.random() < 0.5 ? -1 : 1) * Math.random() * Number(particle.spread.y)
          },
          velocity: { 
            x: Number(particle.velocity.x || 0) + windBias.x,
            y: Number(particle.velocity.y || 0) + windBias.y
          },
          lifetime: baseLifetime + randomLifetimeExtension,
          currentLife: baseLifetime + randomLifetimeExtension,
          opacity: particle.opacity || 1,
          visible: true,
          size: particle.size || 5,
          color: particle.color || 'white',
          gravity: { ...particle.gravity },
          weather: typeof particle.weather === 'object' ? { ...particle.weather } : 'none'
        };

        // Remove oldest particle if we exceed the maximum amount
        if (npc.particleArrays[particle.name || ''].length >= particle.amount) {
          npc.particleArrays[particle.name || ''].shift();
        }
        
        npc.particleArrays[particle.name || ''].push(newParticle);
        npc.lastEmitTime[particle.name || ''] = currentTime;
      }

      // Update and render existing particles for this type
      const particles = npc.particleArrays[particle.name || ''];
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Decrease lifetime
        p.currentLife -= deltaTime * 1000;

        // Remove dead particles
        if (p.currentLife <= 0) {
          particles.splice(i, 1);
          continue;
        }

        if (!p.localposition) {
          p.localposition = { x: 0, y: 0 };
        }

        // Apply gravity and wind effects
        if (p.velocity && p.gravity) {
          const windDirection = typeof p.weather === 'object' ? p.weather.wind_direction : null;
          const windSpeed = typeof p.weather === 'object' ? p.weather.wind_speed || 0 : 0;
          const windForce = {
            x: 0,
            y: 0
          };

          if (windDirection !== 'none' && (windDirection === 'left' || windDirection === 'right')) {
            const windDirectionRad = (windDirection === 'left' ? 180 : 0) * Math.PI / 180;
            windForce.x = Math.cos(windDirectionRad) * windSpeed * 0.01;
            windForce.y = Math.sin(windDirectionRad) * windSpeed * 0.01;
          }

          // Update velocity with gravity and wind
          p.velocity.x += p.gravity.x * deltaTime + windForce.x;
          p.velocity.y += p.gravity.y * deltaTime + windForce.y;
          
          // Cap velocity considering wind influence
          const maxVelocity = {
            x: particle.velocity.x + (windSpeed * 0.2),
            y: particle.velocity.y + (windSpeed * 0.2)
          };
          
          p.velocity.x = Math.min(Math.max(p.velocity.x, -maxVelocity.x), maxVelocity.x);
          p.velocity.y = Math.min(Math.max(p.velocity.y, -maxVelocity.y), maxVelocity.y);
          
          // Update position
          p.localposition.x += p.velocity.x * deltaTime;
          p.localposition.y += p.velocity.y * deltaTime;
        }

        // Calculate render position
        const centerX = npc.position.x + 16 - (p.size / 2);
        const centerY = npc.position.y + 24 - (p.size / 2);
        const renderX = centerX + p.localposition.x;
        const renderY = centerY + p.localposition.y;

        // Calculate fade in/out alpha
        const fadeInDuration = p.lifetime * 0.4;
        const fadeOutDuration = p.lifetime * 0.4;
        let alpha;

        if (p.lifetime - p.currentLife < fadeInDuration) {
          // Fade in
          alpha = ((p.lifetime - p.currentLife) / fadeInDuration) * p.opacity;
        } else if (p.currentLife < fadeOutDuration) {
          // Fade out
          alpha = (p.currentLife / fadeOutDuration) * p.opacity;
        } else {
          // Fully visible
          alpha = p.opacity;
        }
        
        context.globalAlpha = alpha;

        // Draw particle as a circle
        context.beginPath();
        context.arc(renderX + p.size/2, renderY + p.size/2, p.size/2, 0, Math.PI * 2);
        context.fillStyle = p.color || "white";
        context.fill();
      }

      // Reset global alpha for other rendering
      context.globalAlpha = 1;
    }
  };

  npcs.push(npc);

  // Make a copy of the npc object to prevent the original object from being modified
  const _npc = Object.assign({}, npc) as any;
  // Delete unnecessary properties from the copied npc object
  delete _npc.show;
  
  Object.defineProperties(_npc, {
    id: { writable: false, configurable: false },
    position: { writable: false, configurable: false },
    dialog: { writable: false, configurable: false },
    quest: { writable: false, configurable: false },
  });

  // Execute the npc script in a sandboxed environment where "this" refers to the npc object
  try {
    (async function () {
      await isLoaded();
      new Function(
        "with(this) { " + decodeURIComponent(data.script) + " }"
      ).call(_npc);
    }).call(_npc);
  } catch (e) {
    console.error(e);
  }
}

async function createPlayer(data: any) {
  positionText.innerText = `Position: ${data.location.x}, ${data.location.y}`;
  console.log("Creating player with data:", data);
  updateFriendOnlineStatus(data.username, true);

  // Add this helper function inside createPlayer
  const initializeAnimation = async (animationData: any) => {
    if (!animationData?.data?.data) return null;
    try {
      // @ts-expect-error - pako is loaded in index.html
      const inflatedData = pako.inflate(new Uint8Array(animationData.data.data));
      const apng = parseAPNG(inflatedData.buffer);
      if (!(apng instanceof Error)) {
        // Initialize the frames' images
        apng.frames.forEach(frame => frame.createImage());
        return {
          frames: apng.frames,
          currentFrame: 0,
          lastFrameTime: performance.now()
        };
      }
    } catch (error) {
      console.error('Failed to initialize animation:', error);
    }
    return null;
  };

  const player = {
    id: data.id,
    username: data.username,
    userid: data.userid,
    animation: await initializeAnimation(data.animation),
    friends: data.friends || [],
    position: {
      x: canvas.width / 2 + data.location.x,
      y: canvas.height / 2 + data.location.y,
    },
    chat: "",
    isStealth: data.isStealth,
    isAdmin: data.isAdmin,
    targeted: false,
    stats: data.stats,
    typing: false,
    typingTimeout: null as NodeJS.Timeout | null,
    typingImage: typingImage,
    renderAnimation: function (context: CanvasRenderingContext2D) {
      if (!this.animation?.frames?.length) {
        return;
      }

      const now = performance.now();
      const frame = this.animation.frames[this.animation.currentFrame];
      
      if (now - this.animation.lastFrameTime > frame.delay) {
        this.animation.currentFrame = (this.animation.currentFrame + 1) % this.animation.frames.length;
        this.animation.lastFrameTime = now;
      }

      if (frame.imageElement?.complete) {
        context.drawImage(
          frame.imageElement,
          this.position.x + 16 - frame.width/2,
          this.position.y + 24 - frame.height/2,
          frame.width,
          frame.height
        );
      }
    },
    show: function (context: CanvasRenderingContext2D) {
      context.globalAlpha = 1;
      context.font = "14px 'Comic Relief'";
      
      // Opacity for stealth mode
      if (this.isStealth) {
        context.fillStyle = "rgba(97, 168, 255, 1)";
      } else {
        context.fillStyle = "white";
      }

      // Draw the player's username
      context.textAlign = "center";

      // Current player
      if (data.id === sessionStorage.getItem("connectionId") && !this.isStealth) {
        context.fillStyle = "#ffe561";
      } else {
        if (this.targeted && !this.isStealth) {
          context.fillStyle = "#E01F1F";
        } else {
          if (this.isStealth) {
            context.fillStyle = "rgba(97, 168, 255, 1)";
          } else {
            context.fillStyle = "#ffffff";
          }
        }
      }

      context.shadowColor = "black";
      context.shadowBlur = 2;
      context.shadowOffsetX = 0;
      context.strokeStyle = "black";
      
      // Uppercase the first letter of the username
      data.username =
        data.username.charAt(0).toUpperCase() + data.username.slice(1);
      // Display (Admin) tag if the player is an admin
      if (data.isAdmin) {
        context.strokeText(
          data.username + " (Admin)",
          this.position.x + 16,
          this.position.y + 65
        );
        context.fillText(
          data.username + " (Admin)",
          this.position.x + 16,
          this.position.y + 65
        );
      } else {
        context.strokeText(
          data.username,
          this.position.x + 16,
          this.position.y + 65
        );
        context.fillText(
          data.username,
          this.position.x + 16,
          this.position.y + 65
        );
      }

      // Draw the player's chat message
      context.fillStyle = "black";
      context.fillStyle = "white";
      context.textAlign = "center";
      context.shadowBlur = 1;
      context.shadowColor = "black";
      context.shadowOffsetX = 1;
      context.shadowOffsetY = 1;
      
      if (this.chat) {
        if (this.chat.trim() !== "") {
          const lines = getLines(context, this.chat, 500).reverse();
          let startingPosition = this.position.y;

          for (let i = 0; i < lines.length; i++) {
            startingPosition -= 20;
            // Draw background
            const textWidth = context.measureText(lines[i]).width;
            context.fillStyle = "rgba(0, 0, 0, 0.2)";
            context.fillRect(
              this.position.x + 16 - textWidth/2 - 5, // Center background
              startingPosition - 17, // Slightly above text
              textWidth + 10, // Add padding
              20 // Height of background
            );
            // Draw text
            context.fillStyle = "white";
            context.fillText(lines[i], this.position.x + 16, startingPosition);
          }
        }
      }

      // Draw the player's health bar below the player's name with a width of 100px, centered below the player name
      if (!this.isStealth) {
        if (data.id === sessionStorage.getItem("connectionId") || this.targeted) {
          context.fillStyle = "rgba(0, 0, 0, 0.8)";
          context.fillRect(this.position.x - 34, this.position.y + 71, 100, 3);

          // Update the shadowblur to 2
          context.shadowBlur = 2;
        
          // Set health bar color based on health percentage
          const healthPercent = this.stats.health / this.stats.max_health;
          if (healthPercent < 0.3) {
            context.fillStyle = "#C81D1D"; // red
          } else if (healthPercent < 0.5) {
            context.fillStyle = "#C87C1D"; // orange
          } else if (healthPercent < 0.8) {
            context.fillStyle = "#C8C520"; // yellow
          } else {
            context.fillStyle = "#519D41"; // green
          }
          
          context.fillRect(
            this.position.x - 34,
            this.position.y + 71,
            healthPercent * 100,
            3
          );
        }

        // Draw the player's stamina bar below the player's health bar with a width of 75px, centered below the player's health bar
        // Check if current player is the same as the player we are drawing
        if (data.id === sessionStorage.getItem("connectionId") || this.targeted) {
        context.fillStyle = "rgba(0, 0, 0, 0.8)";
        context.fillRect(this.position.x - 34, this.position.y + 76, 100, 3);
        context.fillStyle = "#469CD9";
        context.fillRect(
          this.position.x - 34,
            this.position.y + 76,
            (this.stats.stamina / this.stats.max_stamina) * 100,
            3
          );
        }
      }

      // Reset shadow settings
      context.shadowColor = "transparent";
      context.shadowBlur = 0;

      if (this.isStealth) {
        context.globalAlpha = 0.5;
      }

      this.renderAnimation(context);

      if (this.typing && this.typingImage) {
        // Show typing image at top left, using image's natural dimensions
        // Update opacity to 0.5 if the player is in stealth mode
        if (this.isStealth) {
          context.globalAlpha = 0.8;
        }
        // Add a shadow to the typing image
        context.shadowColor = "black";
        context.shadowBlur = 2;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        // Shrink the image in half
        
        context.drawImage(
          this.typingImage,
          this.position.x - this.typingImage.width + 15, 
          this.position.y - this.typingImage.height + 15,
          this.typingImage.width / 1.5,
          this.typingImage.height / 1.5
        );
        // Reset opacity
        context.globalAlpha = 1;
        context.shadowColor = "transparent";
        context.shadowBlur = 0;
      }
    },
  };

  players.push(player);

  // Current player
  if (data.id === sessionStorage.getItem("connectionId")) {
    // Initialize camera position immediately for the current player
    cameraX = player.position.x - window.innerWidth / 2 + 8;
    cameraY = player.position.y - window.innerHeight / 2 + 48;
    window.scrollTo(cameraX, cameraY);
    updateFriendsList({friends: data.friends || []});
  }

  // Update player dots on the full map if it is open
  // if (fullmap.style.display === "block") {
  //   updatePlayerDots();
  // }
}

function getLines(ctx: any, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Snap to player's position on resize
window.addEventListener("resize", () => {
  const clientSocketId = sessionStorage.getItem("connectionId");
  const currentPlayer = players.find((player) => player.id === clientSocketId);
  if (currentPlayer) {
    cameraX = currentPlayer.position.x - window.innerWidth / 2 + 8;
    cameraY = currentPlayer.position.y - window.innerHeight / 2 + 48;
    window.scrollTo(cameraX, cameraY);
  }
  // Remove the context menu on resize
  if (document.getElementById("context-menu")) {
    document.getElementById("context-menu")!.remove();
  }
});

// Prevent unfocusing the window
window.addEventListener("blur", () => {
  isKeyPressed = false;
  // Clear the pressedKeys set
  pressedKeys.clear();
});

function updateStatsNew(id: number | null, health: number, stamina: number, max_stamina: number) {
  // If id is null, use the current player
  if (id === null) {
    updateHealthBar(healthBar, health);
    staminaBar.style.width = `${stamina}%`;
    return;
  }
  
  const player = players.find((player) => player.id === id);
  if (!player) return;
  player.stats.health = health;
  player.stats.stamina = stamina;
  player.stats.max_stamina = max_stamina;
  
  // Calculate percentages based on max values
  const healthPercent = (health / player.stats.max_health) * 100;
  const staminaPercent = (stamina / player.stats.max_stamina) * 100;
  
  // Update appropriate health/stamina bars based on whether this is current player or target
  if (player.id === sessionStorage.getItem("connectionId")) {
    // Update current player's bars
    updateHealthBar(healthBar, healthPercent);
    staminaBar.style.width = `${staminaPercent}%`;
    if (player.targeted) {
      updateHealthBar(targetHealthBar, healthPercent);
      targetStaminaBar.style.width = `${staminaPercent}%`;
    }
  } else if (player.targeted) {
    // Update target's bars
    updateHealthBar(targetHealthBar, healthPercent);
    targetStaminaBar.style.width = `${staminaPercent}%`;
  }
}

// Helper function to update health bar styling
function updateHealthBar(bar: HTMLDivElement, health: number) {
  bar.removeAttribute("class");
  bar.classList.add("ui");
  bar.style.width = `${Math.max(0, health)}%`;

  if (health >= 80) {
    bar.classList.add("green");
  } else if (health >= 50) {
    bar.classList.add("yellow");
  } else if (health >= 30) {
    bar.classList.add("orange");
  } else {
    bar.classList.add("red");
  }
}

function updateStats(health: number, stamina: number, max_stamina: number, max_health: number) {
  const healthPercent = (health / max_health) * 100;
  const staminaPercent = (stamina / max_stamina) * 100;
  staminaBar.style.width = `${staminaPercent}%`;
  healthBar.removeAttribute("class");
  healthBar.classList.add("ui");
  healthBar.style.width = `${healthPercent}%`;
  if (staminaPercent < 0) {
    staminaBar.style.width = `0%`;
  }
  if (healthPercent < 0) {
    healthBar.style.width = `0%`;
  }
  if (healthPercent >= 80) {
    healthBar.classList.add("green");
    return;
  }
  if (healthPercent >= 50 && healthPercent < 80) {
    healthBar.classList.add("yellow");
    return;
  }
  if (healthPercent >= 30 && healthPercent < 50) {
    healthBar.classList.add("orange");
    return;
  }
  if (healthPercent < 30) {
    healthBar.classList.add("red");
    return;
  }
}

function updateTargetStats(health: number, max_health: number, stamina: number, max_stamina: number) {
  targetHealthBar.removeAttribute("class");
  targetHealthBar.classList.add("ui");
  const healthPercent = (health / max_health) * 100;
  const staminaPercent = (stamina / max_stamina) * 100;
  targetHealthBar.style.width = `${healthPercent}%`;
  targetStaminaBar.style.width = `${staminaPercent}%`;
  if (healthPercent >= 80) {
    targetHealthBar.classList.add("green");
    return;
  }
  if (healthPercent >= 50 && healthPercent < 80) {
    targetHealthBar.classList.add("yellow");
    return;
  }
  if (healthPercent >= 30 && healthPercent < 50) {
    targetHealthBar.classList.add("orange");
    return;
  }
  if (healthPercent < 30) {
    targetHealthBar.classList.add("red");
    return;
  }
}

document
  .getElementById("pause-menu-action-back")
  ?.addEventListener("click", () => {
    pauseMenu.style.display = "none";
  });

document
  .getElementById("pause-menu-action-options")
  ?.addEventListener("click", () => {
    // If any other menu is open, close all other menus
    pauseMenu.style.display = "none";
    optionsMenu.style.display = "block";
  });

document
  .getElementById("pause-menu-action-exit")
  ?.addEventListener("click", () => {
    sendRequest({
      type: "LOGOUT",
          data: null,
    });
    window.location.href = "/";
  });

fpsSlider.addEventListener("input", () => {
  document.getElementById(
    "limit-fps-label"
  )!.innerText = `FPS: (${fpsSlider.value})`;
});

musicSlider.addEventListener("input", () => {
  document.getElementById(
    "music-volume-label"
  )!.innerText = `Music: (${musicSlider.value})`;
});

effectsSlider.addEventListener("input", () => {
  document.getElementById(
    "effects-volume-label"
  )!.innerText = `Effects: (${effectsSlider.value})`;
});

[fpsSlider, musicSlider, effectsSlider, mutedCheckbox].forEach(element => {
  element.addEventListener("change", () => {
    sendRequest({
      type: "CLIENTCONFIG",
          data: {
            fps: parseInt(fpsSlider.value),
            music_volume: parseInt(musicSlider.value) || 0,
            effects_volume: parseInt(effectsSlider.value) || 0,
            muted: mutedCheckbox.checked,
          } as ConfigData,
    });
  });
});

const contextActions: Record<string, { allowed_self: boolean, label: string, handler: (id: string) => void }> = {
  'inspect-player': {
    label: 'Inspect',
    allowed_self: true,
    handler: (id) => {
      console.log(`Inspecting player ${id}`);
    }
  },
  'send-message': {
    label: 'Send Message',
    allowed_self: false,
    handler: (id) => {
      console.log(`Sending message to ${id}`);
    }
  },
  'invite-to-party': {
    label: 'Invite to Party',
    allowed_self: false,
    handler: (id) => {
      console.log(`Inviting ${id} to party`);
    }
  },
  'add-friend': {
    label: 'Add Friend',
    allowed_self: false,
    handler: (id) => {
      sendRequest({
        type: "ADD_FRIEND",
        data: { id: id },
      });
    }
  },
  'remove-friend': {
    label: 'Remove Friend',
    allowed_self: false,
    handler: (id) => {
      sendRequest({
        type: "REMOVE_FRIEND",
        data: { id: id },
      });
    }
  },
  'invite-to-guild': {
    label: 'Invite to Guild',
    allowed_self: false,
    handler: (id) => {
      console.log(`Inviting ${id} to guild`);
    }
  },
  'block-player': {
    label: 'Block Player',
    allowed_self: false,
    handler: (id) => {
      console.log(`Blocking player ${id}`);
    }
  },
  'report-player': {
    label: 'Report Player',
    allowed_self: false,
    handler: (id) => {
      console.log(`Reporting player ${id}`);
    }
  },
};

function createContextMenu(event: MouseEvent, id: string) {
  if (!loaded) return;
  document.getElementById("context-menu")?.remove();

  const contextMenu = document.createElement("div");
  contextMenu.id = 'context-menu';
  contextMenu.style.left = `${event.clientX}px`;
  contextMenu.style.top = `${event.clientY}px`;
  // If we are off the screen, adjust position
  if (event.clientX + 200 > window.innerWidth) {
    contextMenu.style.left = `${event.clientX - 200}px`;
  }

  if (event.clientX - 200 < 0) {
    contextMenu.style.left = `${event.clientX + 50}px`;
  }

  if (event.clientY + 150 > window.innerHeight) {
    contextMenu.style.top = `${event.clientY - 150}px`;
  }

  if (event.clientY - 150 < 0) {
    contextMenu.style.top = `${event.clientY + 50}px`;
  }
  
  contextMenu.dataset.id = id;

  const ul = document.createElement("ul");
  const isSelf = id === sessionStorage.getItem("connectionId");
  const currentPlayer = players.find(player => player.id === sessionStorage.getItem("connectionId"));
  const targetedPlayer = players.find(player => player.id === id);
  console.log(currentPlayer, targetedPlayer);
  const isFriend = currentPlayer?.friends?.includes(targetedPlayer?.username?.toString()) || false;

  Object.entries(contextActions).forEach(([action, { label, handler, allowed_self }]) => {
    if (!allowed_self && isSelf) return;

    if (action === 'add-friend' && isFriend) return;

    // Skip "remove-friend" if not friends
    if (action === 'remove-friend' && !isFriend) return;

    const li = document.createElement("li");
    li.id = `context-${action}`;
    li.innerText = label;

    li.onclick = (e) => {
      e.stopPropagation();
      handler(id);
      contextMenu.remove();
    };

    ul.appendChild(li);
  });

  contextMenu.appendChild(ul);
  overlay.appendChild(contextMenu);

  document.addEventListener("click", () => contextMenu.remove(), { once: true });
}

// Capture click and get coordinates from canvas
document.addEventListener("contextmenu", (event) => {
  if (!loaded) return;
  if ((event.target as HTMLElement)?.classList.contains("ui")) return;
  // Check where we clicked on the canvas
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Did we click on a player?
  const clickedPlayer = players.find(player => {
    const playerX = player.position.x + 16; // Center of the player
    const playerY = player.position.y + 24; // Center of the player
    return (
      x >= playerX - 16 && x <= playerX + 16 &&
      y >= playerY - 24 && y <= playerY + 24
    );
  });

  if (clickedPlayer) {
    const id = clickedPlayer.id;
    // Create context menu for the clicked player
    createContextMenu(event, id);
  } else {
    // Remove any existing context menu
    const existingMenu = document.getElementById("context-menu");
    if (existingMenu) existingMenu.remove();
    const moveX = Math.floor(x - canvas.width / 2 - 16);
    const moveY = Math.floor(y - canvas.height / 2 - 24);
    sendRequest({
      type: "TELEPORTXY",
          data: { x: moveX, y: moveY },
    });
  }
});

document.addEventListener("click", (event) => {
  // Check if we clicked on a player
  if (!loaded) return;
  if ((event.target as HTMLElement)?.classList.contains("ui")) return;
  // If we don't click on the context menu, remove it
  const contextMenu = document.getElementById("context-menu");
  if (contextMenu && !contextMenu.contains(event.target as Node)) {
    contextMenu.remove();
  }

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const moveX = x - canvas.width / 2 - 16;
  const moveY = y - canvas.height / 2 - 24;
  sendRequest({
    type: "SELECTPLAYER",
    data: { x: moveX, y: moveY },
  });
});

async function encryptRsa(chatDecryptionKey: string, data: string) {
  const cleanedKey = cleanBase64Key(chatDecryptionKey);
  const importedKey = await window.crypto.subtle.importKey(
    "spki",
    new Uint8Array(atob(cleanedKey).split('').map(c => c.charCodeAt(0))),
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["encrypt"]
  );

  const encoded = new TextEncoder().encode(data);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    importedKey,
    encoded
  );

  return new Uint8Array(encrypted);
}

function cleanBase64Key(base64Key: string): string {
  return base64Key.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s+/g, '');
}

/* Notifications */
const notificationContainer = document.getElementById("game-notification-container");
const notificationMessage = document.getElementById("game-notification-message");
let clearNotificationTimeout: any = null;

function showNotification(message: string, autoClose: boolean = true, reconnect: boolean = false) {

  if (!notificationContainer || !notificationMessage) return;
  
  notificationMessage.innerText = message;
  notificationContainer.style.display = "flex";
  
  const baseTimeout = 5000; // Base timeout of 5 seconds
  const timePerChar = 100; // Additional time per character in milliseconds
  const timeout = baseTimeout + (message.length * timePerChar);

  if (autoClose) {
    // Clear any existing timeout
    if (clearNotificationTimeout) {
      clearTimeout(clearNotificationTimeout);
    }
    clearNotificationTimeout = setTimeout(() => {
      notificationContainer.style.display = "none";
      // If reconnect is true, redirect after hiding notification
      if (reconnect) {
        window.location.href = "/";
      }
    }, timeout);
  } else if (reconnect) {
    // If not auto-closing but need to reconnect
    setTimeout(() => {
      window.location.href = "/";
    }, timeout);
  }
}

// Add these event listeners near other chat input related code
chatInput.addEventListener("focus", () => {
  stopMovement();
});

chatInput.addEventListener("blur", () => {
  // Send abort packet when chat is closed
  sendRequest({
    type: "MOVEXY",
    data: "ABORT",
  });
  // Clear pressed keys to prevent continued movement
  pressedKeys.clear();
  isKeyPressed = false;
  isMoving = false;
});

function sendRequest(data: any) {
  sentRequests++;
  socket.send(packet.encode(JSON.stringify(data)));
}

setInterval(() => {
  if (packetsSentReceived.innerText === `Sent: ${sentRequests}, Received: ${receivedResponses}`) return;
  packetsSentReceived.innerText = `Sent: ${sentRequests}, Received: ${receivedResponses}`;
  sentRequests = 0;
  receivedResponses = 0;
}, 1000);

function stopMovement() {
  // Send abort packet when chat is opened
  sendRequest({
    type: "MOVEXY",
    data: "ABORT",
  });
  // Clear pressed keys to prevent continued movement
  pressedKeys.clear();
  isKeyPressed = false;
  isMoving = false;
}

// Create invitation popup model
function createInvitationPopup(invitationData: any) {
  // Check if the popup already exists
  const existingPopup = document.getElementById("invitation-popup");
  if (existingPopup) {
    // If it exists, remove it
    existingPopup.remove();
  }
  const popup = document.createElement("div");
  popup.id = "invitation-popup";
  popup.className = "popup";
  popup.innerHTML = `
    <h2>Invitation</h2>
    <p>${invitationData.message}</p>
    <button id="accept-invitation">Accept</button>
    <button id="decline-invitation">Decline</button>
  `;

  document.body.appendChild(popup);

  const acceptButton = document.getElementById("accept-invitation");
  const declineButton = document.getElementById("decline-invitation");
  let data;

  switch (invitationData.action.toUpperCase()) {
    case "FRIEND_REQUEST": {
      data = {
        type: "INVITATION_RESPONSE",
        data: {
          authorization: invitationData.authorization,
          originator: invitationData.originator,
          action: "FRIEND_REQUEST",
        },
      }
    }
    break;
  }

  if (!data) return;

  // Add event listeners for accept and decline buttons
  acceptButton?.addEventListener("click", () => {
    data.data.response = "ACCEPT";
    sendRequest(data);
    popup.remove();
  });

  declineButton?.addEventListener("click", () => {
    data.data.response = "DECLINE";
    sendRequest(data);
    popup.remove();
  });
}

function updateFriendOnlineStatus(friendName: string, isOnline: boolean) {
  const list = Array.from(friendsList.querySelectorAll('.friend-name')) as HTMLElement[];
  list.forEach((item: HTMLElement) => {
    const name = item.innerText.toLowerCase();
    if (name === friendName.toLowerCase()) {
      const statusElement = item.nextElementSibling as HTMLElement;
      if (statusElement) {
        statusElement.classList.toggle("online", isOnline);
        statusElement.classList.toggle("offline", !isOnline);
        statusElement.innerText = isOnline ? "Online" : "Offline";
      }
    }
  });
}

function updateFriendsList(data: any) {
    const connectionId = sessionStorage.getItem("connectionId");
    const currentPlayer = players.find(player => player.id === connectionId);
    if (!currentPlayer || !data?.friends) return;

    const list = Array.from(friendsList.querySelectorAll('.friend-name')) as HTMLElement[];

    // Step 1: Remove friends from UI that are no longer in data.friends
    list.forEach((item: HTMLElement) => {
        const name = item.innerText.toLowerCase();
        if (!data.friends.map((f: string) => f.toLowerCase()).includes(name)) {
            item.parentElement?.remove(); // Remove the whole friend-item div
        }
    });

    // Step 2: Add new friends from data.friends if they don't exist in UI
    data.friends.forEach((friend: string) => {
        const exists = list.some(item => item.innerText.toLowerCase() === friend.toLowerCase());
        if (!exists) {
            const friendElement = document.createElement("div");
            friendElement.classList.add("friend-item", "ui");

            const friendName = document.createElement("div");
            friendName.classList.add("friend-name");
            friendName.innerText = friend.charAt(0).toUpperCase() + friend.slice(1);
            friendElement.appendChild(friendName);

            const friendStatus = document.createElement("div");
            // Check if the friend is online
            const isOnline = players.some(player => player.username.toLowerCase() === friend.toLowerCase() && player.id !== connectionId);
            friendStatus.classList.add("friend-status", isOnline ? "online" : "offline");
            friendStatus.innerText = isOnline ? "Online" : "Offline";
            friendElement.appendChild(friendStatus);

            friendsList.appendChild(friendElement);
        }
    });
}
