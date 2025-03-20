import '../utility/validate_config';
const now = performance.now();
import log from "../modules/logger";
import player from "../systems/player";
import verify from "../services/verification";
import query from "../controllers/sqldatabase";
import * as settings from "../../config/settings.json";
import path from "path";
import fs from "fs";
import docs_html from "./www/public/docs.html";
import benchmark_html from "./www/public/benchmark.html";
import login_html from "./www/public/index.html";
import register_html from "./www/public/register.html";
import game_html from "./www/public/game.html";

// Load assets
import "../modules/assetloader";

import assetCache from "../services/assetCache";
const maps = assetCache.get("maps");
const tilesets = assetCache.get("tilesets");

const _cert = path.join(import.meta.dir, "../certs/cert.crt");
const _key = path.join(import.meta.dir, "../certs/cert.key");
const _https = process.env.WEBSRV_USESSL === "true" && fs.existsSync(_cert) && fs.existsSync(_key);

const routes = {
  "/docs": docs_html,
  "/benchmark": benchmark_html,
  "/": login_html,
  "/registration": register_html,
  "/game": game_html,
  "/login": login,
  "/verify": authenticate,
  "/register": register,
  "/map/hash": {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const mapName = url.searchParams.get("name");
      if (!mapName) {
        return new Response(JSON.stringify({ message: "Invalid request" }), { status: 400 });
      }

      for (const key of Object.keys(maps)) {
        if (maps[key].name === mapName) {
          return new Response(JSON.stringify({ hash: maps[key].hash }), { status: 200 });
        }
      }

      return new Response(JSON.stringify({ message: "Map not found" }), { status: 404 });
    },
    POST: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    PUT: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    DELETE: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    PATCH: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    OPTIONS: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
  },
  "/tileset/hash" : {
    GET: async (req: Request) => {
      if (req.method !== "GET") {
        return new Response(JSON.stringify({ message: "Invalid request" }), { status: 400 });
    }
    const url = new URL(req.url);
    const tilesetName = url.searchParams.get("name");
    if (!tilesetName) {
      return new Response(JSON.stringify({ message: "Invalid request" }), { status: 400 });
    }

    for (const key of Object.keys(tilesets)) {
      if (tilesets[key].name === tilesetName) {
        return new Response(JSON.stringify({ hash: tilesets[key].hash }), { status: 200 });
      }
    }
    return new Response(JSON.stringify({ message: "Tileset not found" }), { status: 404 });
    },
    POST: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    PUT: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    DELETE: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    PATCH: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    OPTIONS: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
  },
  "/tileset" : {
    GET: async (req: Request) => {
      if (req.method !== "GET") {
        return new Response(JSON.stringify({ message: "Invalid request" }), { status: 400 });
      }
    const url = new URL(req.url);
    const tilesetName = url.searchParams.get("name");
    if (!tilesetName) {
      return new Response(JSON.stringify({ message: "Invalid request" }), { status: 400 });
    }

    for (const key of Object.keys(tilesets)) {
      if (tilesets[key].name === tilesetName) {
        return new Response(JSON.stringify({ tileset: tilesets[key] }), { status: 200 });
      }
    }
    return new Response(JSON.stringify({ message: "Tileset not found" }), { status: 404 });
    },
    POST: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    PUT: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    DELETE: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },  
    PATCH: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
    OPTIONS: async () => {
      // Return a 405
      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
    },
  },
}

Bun.serve({
  port: _https ? 443 : 80,
  routes: {
    "/docs": routes["/docs"],
    "/benchmark": routes["/benchmark"],
    "/": routes["/"],
    "/registration": routes["/registration"],
    "/register": routes["/register"],
    "/game": routes["/game"],
    "/login": routes["/login"],
    "/verify": routes["/verify"],
    "/map/hash": routes["/map/hash"],
    "/tileset/hash": routes["/tileset/hash"],
    "/tileset": routes["/tileset"],
  },
  fetch(req) {
    const url = new URL(req.url);
    if (_https && url.protocol === "http:") {
      return Response.redirect(`https://${url.host}${url.pathname}${url.search}`, 301);
    }
    const route = routes[url.pathname as keyof typeof routes];
    if (!route) {
      return new Response("Not found", { status: 404 });
    }
    return route[req.method as keyof typeof route]?.(req);
  },
  ...(_https ? {
      cert: fs.readFileSync(_cert),
      key: fs.readFileSync(_key),
    }
  : {}),
});

async function authenticate(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");
  const code = url.searchParams.get("code");

  if (!token || !code || !email) {
    return new Response(JSON.stringify({ message: "Invalid request" }), { status: 403 });
  }

  const result = await query("SELECT * FROM accounts WHERE token = ? AND email = ? AND verification_code = ? LIMIT 1", [token, email.toLowerCase(), code]) as any;
  if (result.length === 0) {
    return new Response(JSON.stringify({ message: "Invalid request" }), { status: 403 });
  }

  await query("UPDATE accounts SET verified = 1 WHERE token = ?", [token]);
  await query("UPDATE accounts SET verification_code = NULL WHERE token = ?", [token]);
  
  // Send to /game
  return Response.redirect(`${process.env.DOMAIN}/game`, 301);
}

async function register(req: Request) {
  try {
    const body = await req.json();
    const { username, email, password, password2 } = body;
    if (!username || !password || !email || !password2) {
      return new Response(JSON.stringify({ message: "All fields are required" }), { status: 400 });
    }

    if (password !== password2) {
      return new Response(JSON.stringify({ message: "Passwords do not match" }), { status: 400 });
    }

    if (username.length < 3 || username.length > 15 || password.length < 8 || password.length > 20) {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 400 });
    }

    if (email.length < 5 || email.length > 50 || !email.includes("@") || !email.includes(".")) {
      return new Response(JSON.stringify({ message: "Invalid email" }), { status: 400 });
    }

    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(email)) {
      return new Response(JSON.stringify({ message: "Invalid email" }), { status: 400 }); 
    }

    const user = await player.register(username.toLowerCase(), password, email.toLowerCase(), req) as any;
    if (!user) {
      return new Response(JSON.stringify({ message: "Failed to register" }), { status: 400 });
    }

    if (user.error) {
      return new Response(JSON.stringify({ message: user.error }), { status: 400 });
    }

    const token = await player.login(username.toLowerCase(), password);
    if (!token) {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 400 });
    }

    const result = await verify(token, email.toLowerCase(), username.toLowerCase()) as any;
    if (result instanceof Error) {
      return new Response(JSON.stringify({ message: "Failed to send verification email" }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: "Verification email sent" }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ message: "Failed to register", error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
  }
}

async function login(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;
    if (!username || !password) {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 400 });
    }
    if (username.length < 3 || username.length > 15 || password.length < 8 || password.length > 20) {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 400 });
    }

    const token = await player.login(username.toLowerCase(), password);
    if (!token) {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 400 });
    }

    const useremail = await player.getEmail(username.toLowerCase()) as string;
    if (!useremail) {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 400 });
    }

    if (!settings["2fa"].enabled || !process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      // Update the account to verified
      await query("UPDATE accounts SET verified = 1 WHERE token = ?", [token]);

      // Remove any verification code that may exist
      await query("UPDATE accounts SET verification_code = NULL WHERE token = ?", [token]);
      // 2FA is not enabled, so we can just return the token
      return new Response(JSON.stringify({ message: "Logged in successfully", data: { token } }), { status: 301 });
    } else {
      // 2FA is enabled, so we need to send a verification email
      const result = await verify(token, useremail.toLowerCase(), username.toLowerCase()) as any;
      if (result instanceof Error) {
        return new Response(JSON.stringify({ message: "Failed to send verification email" }), { status: 500 });
      }
      // Return a 200
      return new Response(JSON.stringify({ message: "Verification email sent", data: { token } }), { status: 200 });
    }
  } catch (error) {
    log.error(`Failed to authenticate: ${error}`);
    return new Response(JSON.stringify({ message: "Failed to authenticate" }), { status: 500 });
  }
}

log.success(`Webserver started in ${(performance.now() - now).toFixed(2)}ms`);
await import("../socket/server");