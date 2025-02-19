import '../utility/validate_config';
const now = performance.now();
import express from "express";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import crypto from "crypto";
import http from "http";
import https from "https";
import path from "path";
import fs from "fs";
const app = express();

import log from "../../src/modules/logger";
import "../../src/services/security";

// Load settings
import * as settings from "../../config/settings.json";

// Load assets
import "../../src/modules/assetloader";

/* SSL Certificate Setup */
const _cert = path.join(import.meta.dir, "../certs/cert.crt");
const _key = path.join(import.meta.dir, "../certs/cert.key");
const _https = process.env.WEBSRV_USESSL === "true" && fs.existsSync(_cert) && fs.existsSync(_key);

// Compression
app.use(compression());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cookieSession({
    name: "session",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
    domain: "*.*",
    keys: [process.env.SESSION_KEY || crypto.randomBytes(20).toString("hex")],
  })
);

// Disable x-powered-by header
app.disable("x-powered-by");

// Disable proxy trust
app.set('trust proxy', false);

// Rate limiting
if (settings?.webserverRatelimit?.enabled) {
  const limiter = rateLimit({
    windowMs: settings?.webserverRatelimit?.windowMs * 60 * 1000 || 15 * 60 * 1000,
    max: settings?.webserverRatelimit?.max || 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      message: "Too many requests, please try again later.",
    },
    validate: false,
  });
  log.success(`Rate limiting enabled for the webserver`);
  app.use(limiter);
} else {
  log.warn("Rate limiting is disabled for the webserver");
}

// Redirect to HTTPS
if (_https) {
  app.enable('trust proxy'); // Trust X-Forwarded-* headers
  app.use((req, res, next) => {
    if (req.secure) {
      // Request was via https, so do no special handling
      next();
    } else {
      // Redirect to https
      res.redirect('https://' + req.headers.host + req.url);
    }
  });
}

// Filter
import filter from "../../src/systems/security";
app.use(function (req: any, res: any, next: any) {
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-access-token"
  );
  res.setHeader("Cache-Control", "public, max-age=2.88e+7");
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  filter(req, res, next, ip);
});

// Sanitize the URL
app.use(function (req: any, res: any, next: any) {
  let url = req.url;
  if (url.match(/\/{2,}$/)) {
    // Remove repeating slashes at the end of the domain
    url = url.replace(/\/{2,}$/g, "/");
    // Redirect to the new url
    res.redirect(
      `${req.headers["x-forwarded-proto"] || req.protocol}://${
        req.headers.host
      }${url}`
    );
  } else {
    next();
  }
});

app.use(function (req: any, res: any, next: any) {
  if (!process.env.DOMAIN) {
    next();
    return;
  }
  const allowedHost = process.env.DOMAIN?.replace("https://", "");
  if (req.hostname === allowedHost || req.hostname === 'localhost') {
    next();
  } else {
    res.status(403).redirect(`https://${allowedHost}`);
  }
});

// Static files
app.use("/", express.static(path.join(import.meta.dirname, "www/public")));

// Unauthenticated Routes
import { router as ReigisterRouter } from "../../src/routes/register";
app.use(ReigisterRouter);

// Verify Routes
import { router as VerifyRouter } from "../../src/routes/verify";
app.use(VerifyRouter);

// Benchmark Routes
import { router as BenchmarkRouter } from "../../src/routes/benchmark";
app.use(BenchmarkRouter);

// Documentation Routes
import { router as DocumentationRouter } from "../../src/routes/documentation";
app.use(DocumentationRouter);

import { router as LoginRouter } from "../../src/routes/login";
app.use(LoginRouter);

// Authorization Middleware
import { router as AuthorizationRouter } from "../../src/routes/authorization";
app.use(AuthorizationRouter);

// Static files
app.use("/game", express.static(path.join(import.meta.dirname, "www/game")));
import { router as mapRouter } from "../../src/routes/map";
app.use(mapRouter);
import { router as tilesetRouter } from "../../src/routes/tileset";
app.use(tilesetRouter);
import { router as functionRouter } from "../../src/routes/functions";
app.use(functionRouter);


// 404 redirect to /
app.use(function (req: any, res: any) {
  res.redirect("/");
});

const server = http.createServer(app);
let httpsServer: any;

if (_https) {
  try {
    const cert = _https ? fs.readFileSync(_cert, "utf8") : "";
    const key = _https ? fs.readFileSync(_key, "utf8") : "";
    
    const tlsOptions = {
      cert: cert,
      key: key,
      requestCert: true,
      rejectUnauthorized: false
    }

    // Create HTTPS server with Express app
    httpsServer = https.createServer(tlsOptions, app);

    httpsServer.on('error', (err: any) => {
      console.error('HTTPS Server Error:', err);
    });

    // Make sure to listen on the SSL port
    httpsServer.listen(process.env.WEBSRV_PORTSSL, async () => {
      log.success(`HTTPS server is listening on localhost:${process.env.WEBSRV_PORTSSL} - Ready in ${(performance.now() - now).toFixed(2)}ms`);
    });
  
    httpsServer.on("stop", () => {
      log.info("HTTPS server is stopping...");
      httpsServer.close(() => {
        log.info("HTTPS server stopped.");
      });
    });

  } catch (e: any) {
    log.error(`Error starting HTTPS server: ${e.message}`);
  }
}

server.listen(process.env.WEBSRV_PORT, async () => {
  log.success(`HTTP server is listening on localhost:${process.env.WEBSRV_PORT} - Ready in ${(performance.now() - now).toFixed(2)}ms`);
  await import("../../src/socket/server");
});

// Wait for connections to close gracefully
server.on("stop", () => {
  log.info("Server is stopping...");
  server.close(() => {
    log.info("Server stopped.");
  });
});

export default app;