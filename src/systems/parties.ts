import query from "../controllers/sqldatabase";
import log from "../modules/logger";

const parties = {
    async isInParty(username: string) {
        if (!username) return false;
        try {
            const result = await query("SELECT party_id FROM accounts WHERE username = ?", [username]) as any[];
            if (result.length === 0) return false; // User not found
            return result.length > 0;
        } catch (error) {
            log.error(`Error checking if user is in party: ${error}`);
            return false;
        }
    },
    async isPartyLeader(username: string) {
        if (!username) return false;
        try {
            // First check if the user is in a party
            const result = await query("SELECT party_id FROM accounts WHERE username = ?", [username]) as any[];
            if (result.length === 0 || !result[0].party_id) return false; // User not found or not in a party
            const partyId = result[0].party_id;
            // Now check if the user is the party leader
            const leaderResult = await query("SELECT leader FROM parties WHERE id = ?", [partyId]) as any[];
            if (leaderResult.length === 0) return false; // Party not found
            return leaderResult[0].leader === username; // Check if the username matches the party leader
        } catch (error) {
            log.error(`Error checking if user is party leader: ${error}`);
            return false;
        }
    },
    async getPartyId(username: string) {
        if (!username) return null;
        try {
            const result = await query("SELECT party_id FROM accounts WHERE username = ?", [username]) as any[];
            if (result.length === 0 || !result[0].party_id) {
                return null; // User not found or not in a party
            }
            return result[0].party_id; // Return the party ID
        } catch (error) {
            log.error(`Error getting party ID for user: ${error}`);
            return null;
        }
    },
    async getPartyMembers(partyId: number) {
        if (!partyId) return [];
        try {
            const result = await query("SELECT members FROM parties WHERE id = ?", [partyId]) as any[];
            if (result.length === 0 || !result[0].members) return []; // Party not found or no members
            // Assuming members are stored as a comma-separated string
            const members = result[0].members.split(",").map((member: any) => member.trim());
            return members.filter((member: any) => member); // Filter out any empty strings
        } catch (error) {
            log.error(`Error getting party members: ${error}`);
            return [];
        }
    },
    async getPartyLeader(partyId: number) {
        if (!partyId) return null;
        try {
            const result = await query("SELECT leader FROM parties WHERE id = ?", [partyId]) as any[];
            if (result.length === 0 || !result[0].leader) return null; // Party not found or no leader
            return result[0].leader; // Return the party leader's username
        } catch (error) {
            log.error(`Error getting party leader: ${error}`);
            return null;
        }
    },
    async add(username: string, partyId: number) {
        if (!username || !partyId) return false;
        try {
            // Check if the user is already in a party
            const existingParty = typeof parties.getPartyId(username);
            if (existingParty) return false; // User is already in a party
            // Get party members
            const partyMembers = await parties.getPartyMembers(partyId);
            if (!partyMembers) return false; // No members found or party does not exist

            // Check if party members exceed the limit of 4
            if (partyMembers.length >= 4) return false; // Party is full

            // Prevent adding the same user multiple times
            if (partyMembers.includes(username)) return false;

            // Add the user to the party
            await query("UPDATE accounts SET party_id = ? WHERE username = ?", [partyId, username]);
            // Update the party members list
            const updatedMembers = [...partyMembers, username].join(",");
            await query("UPDATE parties SET members = ? WHERE id = ?", [updatedMembers, partyId]);
            // Send the updated list of party members to the client
            return updatedMembers.split(",").map((member: any) => member.trim());
        } catch (error) {
            log.error(`Error adding user to party: ${error}`);
            return false;
        }
    },
    async remove(username: string) {
        if (!username) return false;
        try {
            // Get the party ID of the user
            const partyId = await parties.getPartyId(username);
            if (!partyId) return false; // User is not in a party
            // Remove the user from the party
            await query("UPDATE accounts SET party_id = NULL WHERE username = ?", [username]);

            // Get current party members
            const partyMembers = await parties.getPartyMembers(partyId);

            // Remove the user from the members list
            const updatedMembers = partyMembers.filter((member: any) => member !== username).join(",");
            await query("UPDATE parties SET members = ? WHERE id = ?", [updatedMembers, partyId]);

            // If the party is now empty, delete the party
            if (updatedMembers.length === 0) {
                await parties.delete(partyId);
                return true;
            } else {
                return updatedMembers.split(",").map((member: any) => member.trim());
            }
        } catch (error) {
            log.error(`Error removing user from party: ${error}`);
            return false;
        }
    },
    async delete (partyId: number) {
        if (!partyId) return false;
        try {
            await query("DELETE FROM parties WHERE id = ?", [partyId]);
            await query("UPDATE accounts SET party_id = NULL WHERE party_id = ?", [partyId]);
            return true;
        } catch (error) {
            log.error(`Error deleting party: ${error}`);
            return false;
        }
    },
    async create (leader: string, username: string)  {
        if (!leader || !username) return false;
        try {
            // Initiate a new party if it doesn't exist
            const existingParty = await query("SELECT id FROM parties WHERE leader = ?", [leader]) as any[];
            if (existingParty.length > 0) return false; // Leader already has a party

            // Ensure the leader isn't already in a party
            const leaderParty = await query("SELECT party_id FROM accounts WHERE username = ?", [leader]) as any[];
            if (leaderParty.length > 0 && leaderParty[0].party_id) return false; // Leader is already in a party

            const members = `${leader},${username}`;
            const result = await query("INSERT INTO parties (leader, members) VALUES (?, ?)", [leader, members]) as any;
            if (result.affectedRows === 0) return false; // Failed to create party
            const partyId = result.insertId;
            // Update the leader's and party member's party_id
            await query("UPDATE accounts SET party_id = ? WHERE username IN (?, ?)", [partyId, leader, username]);
            // Return the party member list
            return [username, leader];
        } catch (error) {
            log.error(`Error creating party: ${error}`);
            return false;
        }
    },
    async leave (username: string) {
        if (!username) return false;
        try {
            const existingParty = await parties.getPartyId(username);
            if (!existingParty) return false; // User is not in a party and cannot leave
            // Check if the user is the party leader
            const isLeader = await parties.isPartyLeader(username);
            if (isLeader) {
                // If the leader leaves, we need to transfer leadership or delete the party
                const partyMembers = await parties.getPartyMembers(existingParty);
                if (partyMembers.length > 1) {
                    // Transfer leadership to the first member in the list
                    const newLeader = partyMembers[1]; // Assuming the second member becomes the new leader
                    await query("UPDATE parties SET leader = ? WHERE id = ?", [newLeader, existingParty]);
                    // Update the party member's party_id
                    await query("UPDATE accounts SET party_id = ? WHERE username = ?", [existingParty, newLeader]);
                    // Remove the leader from the party
                    await query("UPDATE accounts SET party_id = NULL WHERE username = ?", [username]);
                    // Remove the leader from the party members list
                    const updatedMembers = partyMembers.filter((member: any) => member !== username).join(",");
                    await query("UPDATE parties SET members = ? WHERE id = ?", [updatedMembers, existingParty]);
                    return updatedMembers.split(",").map((member: any) => member.trim());
                } else {
                    // If no other members, delete the party
                    await parties.delete(existingParty);
                    return true; // Party deleted successfully
                }
            } else {
                // If the user is not the leader, simply remove them from the party
                const updatedMembers = await parties.remove(username);
                if (!updatedMembers) return false; // Failed to remove user from party
            }
        } catch (error) {
            log.error(`Error leaving party: ${error}`);
            return false;
        }
    }
}

export default parties;