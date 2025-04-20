// This file is used to create the database and tables if they don't exist
import query from "../controllers/sqldatabase";
import log from "../modules/logger";

// Create accounts table if it doesn't exist
const createAccountsTable = async () => {
  log.info("Creating accounts table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        token TEXT UNIQUE DEFAULT NULL,
        password_hash TEXT NOT NULL,
        last_login DATETIME DEFAULT NULL,
        online INTEGER DEFAULT 0 NOT NULL,
        role INTEGER DEFAULT 0 NOT NULL,
        banned INTEGER DEFAULT 0 NOT NULL,
        ip_address TEXT DEFAULT NULL,
        geo_location TEXT DEFAULT NULL,
        verification_code TEXT DEFAULT NULL,
        needs_password_reset INTEGER DEFAULT 0 NOT NULL,
        map TEXT DEFAULT NULL,
        position TEXT DEFAULT NULL,
        session_id TEXT UNIQUE DEFAULT NULL,
        stealth INTEGER DEFAULT 0 NOT NULL,
        direction TEXT DEFAULT NULL,
        verified INTEGER DEFAULT 0 NOT NULL,
        noclip INTEGER DEFAULT 0 NOT NULL
      );
  `;
  await query(sql);
};

// Create allowed_ips table if it doesn't exist
const createAllowedIpsTable = async () => {
  log.info("Creating allowed_ips table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS allowed_ips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL UNIQUE
    );
  `;
  await query(sql);
};

// Create blocked_ips table if it doesn't exist
const createBlockedIpsTable = async () => {
  log.info("Creating blocked_ips table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS blocked_ips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL UNIQUE
    );
  `;
  await query(sql);
};

// Insert 127.0.0.1 and ::1 as allowed IPs if they doesn't exist
const insertLocalhost = async () => {
  log.info("Inserting localhost and ::1 as allowed IPs...");
  const sql = `
    INSERT OR IGNORE INTO allowed_ips (ip) VALUES ('127.0.0.1'), ('::1');
    `;
  await query(sql);
};

// Insert demo account if doesn't exist
const insertDemoAccount = async () => {
  log.info("Inserting demo account...");
  const sql = `
    INSERT OR IGNORE INTO accounts (
      email,
      username,
      password_hash,
      online,
      role,
      banned,
      needs_password_reset,
      stealth,
      direction
    ) VALUES (
      'demo@example.com',
      'demo_user',
      'Lb2e9d35b2720ec87198b38fee811cc386fe909aa03786085960b269d7089cd02bc8f85f7bee2e3d565341dee70e9d9a9de2b971eef84c43f04d987414b4cf6c7Aed1d913ef3afd0f87b5127e14016aa50f6053e26527cf82b091b4d0a567151c0Pfa585d89c851dd338a70dcf535aa2a92fee7836dd6aff1226583e88e0996293f16bc009c652826e0fc5c706695a03cddce372f139eff4d13959da6f1f5d3eabeY63395358fb084a3ef48a0d5d153d6476fb5f9a0b57ad09252cbec05c9067d45bX',
      0,
      0,
      0,
      1,
      0,
      'down'
    );
    `;
  await query(sql);
};

const insertDemoStats = async () => {
  log.info("Inserting demo stats...");
  const sql = `
    INSERT OR IGNORE INTO stats (
      username,
      health,
      max_health,
      stamina,
      max_stamina
    ) VALUES (
      'demo_user',
      100,
      100,
      100,
      100
    );
    `;
  await query(sql);
}

const insertDemoClientConfig = async () => {
  log.info("Inserting demo client config...");
  const sql = `
    INSERT OR IGNORE INTO clientconfig (
      username,
      fps,
      music_volume,
      effects_volume,
      muted
    ) VALUES (
      'demo_user',
      60,
      100,
      100,
      0
    );
    `;
  await query(sql);
}

const getAllowedIPs = async () => {
  const sql = `
    select * from allowed_ips;
    `;
  return await query(sql);
};

// Create inventory table if it doesn't exist
const createInventoryTable = async () => {
  log.info("Creating inventory table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS inventory (
        username TEXT NOT NULL,
        item TEXT NOT NULL,
        quantity INTEGER NOT NULL
    );
  `;
  await query(sql);
};

// Create items table if it doesn't exist
const createItemsTable = async () => {
  log.info("Creating items table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        name TEXT NOT NULL UNIQUE,
        quality TEXT NOT NULL,
        description TEXT DEFAULT NULL
    );
  `;
  await query(sql);
};

const createStatsTable = async () => {
  log.info("Creating stats table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        username TEXT NOT NULL UNIQUE,
        health INTEGER NOT NULL DEFAULT 100,
        max_health INTEGER NOT NULL DEFAULT 100,
        stamina INTEGER NOT NULL DEFAULT 100,
        max_stamina INTEGER NOT NULL DEFAULT 100
    );
  `;
  await query(sql);
}

const createClientConfig = async () => {
  log.info("Creating clientconfig table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS clientconfig (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        username TEXT NOT NULL UNIQUE,
        fps INTEGER NOT NULL DEFAULT 240,
        music_volume INTEGER NOT NULL DEFAULT 100,
        effects_volume INTEGER NOT NULL DEFAULT 100,
        muted INTEGER NOT NULL DEFAULT 0
    );
  `;
  await query(sql);
}

const createWeaponsTable = async () => {
  log.info("Creating weapons table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS weapons (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        name TEXT NOT NULL UNIQUE,
        damage INTEGER NOT NULL,
        mana INTEGER NOT NULL,
        \`range\` INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT DEFAULT NULL,
        quality TEXT NOT NULL DEFAULT 'common'
    );
  `;
  await query(sql);
}

const createSpellsTable = async () => {
  log.info("Creating spells table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS spells (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        name TEXT NOT NULL UNIQUE,
        damage INTEGER NOT NULL,
        mana INTEGER NOT NULL,
        \`range\` INTEGER NOT NULL,
        type TEXT NOT NULL,
        cast_time INTEGER NOT NULL,
        description TEXT DEFAULT NULL
    );
  `;
  await query(sql);
}

const createPermissionsTable = async () => {
  log.info("Creating permissions table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS permissions (
        username TEXT NOT NULL UNIQUE PRIMARY KEY,
        permissions TEXT NOT NULL
    );
  `;
  await query(sql);
}

const createPermissionTypesTable = async () => {
  log.info("Creating permission_types table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS permission_types (
        name TEXT NOT NULL UNIQUE PRIMARY KEY
    );
    INSERT OR IGNORE INTO permission_types (name) VALUES
      ('admin.ban'),
      ('admin.disconnect'),
      ('admin.permission'),
      ('admin.respawn'),
      ('admin.unban'),
      ('permission.add'),
      ('permission.list'),
      ('permission.remove'),
      ('server.admin'),
      ('server.notify'),
      ('server.restart'),
      ('server.shutdown');
  `;
  await query(sql);
}

const createNpcTable = async () => {
  log.info("Creating npcs table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS npcs (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        name TEXT NOT NULL UNIQUE,
        position TEXT NOT NULL,
        hidden INTEGER NOT NULL DEFAULT 0,
        script TEXT DEFAULT NULL,
        dialog TEXT DEFAULT NULL,
        particles TEXT DEFAULT NULL
    );
  `;
  await query(sql);
}

const createParticleTable = async () => {
  log.info("Creating particles table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS particles (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        name TEXT NOT NULL UNIQUE,
        size INTEGER NOT NULL DEFAULT 1,
        color TEXT NOT NULL DEFAULT 'transparent',
        velocity TEXT NOT NULL DEFAULT '0,0',
        lifetime INTEGER NOT NULL DEFAULT 100,
        opacity FLOAT NOT NULL DEFAULT 1,
        visible INTEGER NOT NULL DEFAULT 1,
        gravity TEXT NOT NULL DEFAULT '0,0',
        localposition TEXT NOT NULL DEFAULT '0,0',
        amount INTEGER NOT NULL DEFAULT 1,
        interval INTEGER NOT NULL DEFAULT 1,
        staggertime FLOAT NOT NULL DEFAULT 0,
        spread TEXT NOT NULL DEFAULT '0,0',
        weather TEXT NOT NULL DEFAULT 'none'
    );
  `;
  await query(sql);
}

const createWeatherTable = async () => {
  log.info("Creating weather table...");
  const sql = `
    CREATE TABLE IF NOT EXISTS weather (
      name VARCHAR(100) NOT NULL UNIQUE PRIMARY KEY,
      ambience FLOAT NOT NULL DEFAULT 0,
      wind_direction VARCHAR(5) NOT NULL DEFAULT 'none',
      wind_speed FLOAT NOT NULL DEFAULT 0,
      humidity FLOAT NOT NULL DEFAULT 30,
      temperature FLOAT NOT NULL DEFAULT 68,
      precipitation FLOAT NOT NULL DEFAULT 0
    );
  `;
  await query(sql);
}

// Run the database setup
const setupDatabase = async () => {
  await createAccountsTable();
  await createAllowedIpsTable();
  await createBlockedIpsTable();
  await insertLocalhost();
  await createInventoryTable();
  await createItemsTable();
  await createStatsTable();
  await createClientConfig();
  await createWeaponsTable();
  await createSpellsTable();
  await createPermissionsTable();
  await createPermissionTypesTable();
  await createNpcTable();
  await createParticleTable();
  await createWeatherTable();
};

try {
  log.info("Setting up database...");
  await setupDatabase();
  const ips = await getAllowedIPs();
  log.trace(`Created allowed ips: ${JSON.stringify(ips)}`);
  await insertDemoAccount();
  await insertDemoStats();
  await insertDemoClientConfig();
  log.success("Database setup complete!");
  process.exit(0);
} catch (error) {
  log.error(`Error setting up database: ${error}`);
  process.exit(1);
}
