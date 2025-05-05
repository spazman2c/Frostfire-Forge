import query from "../controllers/sqldatabase";
import log from "../modules/logger";

const permissions = {
    clear: async (username: string) => {
        // Clear permissions for a player
        await query("UPDATE permissions SET permissions = NULL WHERE username = ?", [username]);
        log.info(`Permissions cleared for ${username}`);
    },    
    set: async (username: string, permissions: string[]) => {
        // Set permissions for a player
        await query(
            "INSERT INTO permissions (username, permissions) VALUES (?, ?) ON DUPLICATE KEY UPDATE permissions = ?",
            [username, permissions.join(","), permissions.join(",")]
        );
        log.info(`Permissions ${permissions.join(",")} set for ${username}`);
    },
    get: async (username: string) => {
        // Get permissions for a player
        const response = await query("SELECT permissions FROM permissions WHERE username = ?", [username]) as { permissions: string }[];
        if (response.length === 0) return [];
        return response[0]?.permissions || [];
    },
    add: async (username: string, permission: string) => {
        // Get permissions for a player
        const response = await permissions.get(username) as string;
        const access = response.split(",");
        access.push(permission);
        await permissions.set(username, access);
        log.info(`Permission ${permission} added to ${username}`);
    },
    remove: async (username: string, permission: string) => {
        // Get permissions for a player
        const response = await permissions.get(username) as string;
        const access = response.split(",");
        access.splice(access.indexOf(permission), 1);
        await permissions.set(username, access);
        log.info(`Permission ${permission} removed from ${username}`);
    },
    list: async() => {
        // Get all permission types 
        const response = await query("SELECT name FROM permission_types") as { name: string }[];
        return response.map((permission) => permission.name);
    }
}

export default permissions;