import query from "../controllers/sqldatabase";
import log from "../modules/logger";

const friends = {
  async list(username: string) {
    if (!username) return [];
    try {
      const response = (await query(
        "SELECT friends FROM friendslist WHERE username = ?",
        [username]
      )) as any[];
      if (response.length === 0 || !response[0].friends) {
        return [];
      }
      const friendsList = response[0].friends
        .split(",")
        .map((friend: string) => friend.trim());
      return friendsList.filter((friend: any) => friend !== "");
    } catch (error) {
      log.error(`Error listing friends for ${username}: ${error}`);
      return [];
    }
  },
  async add(username: string, friend_username: string) {
    if (!username || !friend_username) return [];

    try {
      const queryResult = (await query(
        "SELECT id FROM accounts WHERE username = ?",
        [friend_username]
      )) as any;
      const id = queryResult[0]?.id;
      if (!id) return await this.list(username); // Friend not found

      const friendId = id.toString();
      const currentFriends = await this.list(username);

      if (currentFriends.includes(friendId)) {
        return currentFriends; // Already a friend
      }

      currentFriends.push(friendId);
      const friendsString = currentFriends.join(",");

      const result = (await query(
        "INSERT INTO friendslist (username, friends) VALUES (?, ?) ON DUPLICATE KEY UPDATE friends = ?",
        [username, friendsString, friendsString]
      )) as any;

      if (result.affectedRows > 0) {
        return currentFriends;
      } else {
        log.error(`Failed to add friend for ${username}`);
        return currentFriends;
      }
    } catch (error) {
      log.error(`Error adding friend for ${username}: ${error}`);
      return await this.list(username);
    }
  },
  async remove(username: string, friend_username: string) {
    if (!username || !friend_username) return [];
    try {
      const queryResult = (await query(
        "SELECT id FROM accounts WHERE username = ?",
        [friend_username]
      )) as any;
      const id = queryResult[0]?.id;
      if (!id) return [];

      const currentFriends = await this.list(username);
      const friendIndex = currentFriends.indexOf(id.toString());
      if (friendIndex === -1) {
        return currentFriends; // Friend not found, return current list
      }

      currentFriends.splice(friendIndex, 1); // Remove friend
      const friendsString = currentFriends.join(",");

      const result = (await query(
        "UPDATE friendslist SET friends = ? WHERE username = ?",
        [friendsString, username]
      )) as any;
      if (result.affectedRows > 0) {
        return currentFriends; // Return updated friends list
      } else {
        log.error(`Failed to remove friend for ${username}`);
        return currentFriends;
      }
    } catch (error) {
      log.error(`Error removing friend for ${username}: ${error}`);
      return [];
    }
  },
};

export default friends;
