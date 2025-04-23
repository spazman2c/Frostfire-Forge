import query from "../controllers/sqldatabase";
import quests from "./quests";

const questlog = {
  async get(username: string) {
    const result = await query("SELECT completed_quests, incomplete_quests FROM quest_log WHERE username = ?", [username]) as any[];
    if (!result || !result[0]) {
      return { completed: [], incomplete: [] };
    }
    const completed = result[0].completed_quests ? result[0].completed_quests.split(",") : [];
    const incomplete = result[0].incomplete_quests ? result[0].incomplete_quests.split(",") : [];
    return { completed, incomplete };
  },
  async startQuest(username: string, id: number) {
    const quest = await quests.find(id);
    if (!quest) return;
    const questLog = await questlog.get(username);
    questLog.incomplete.push(id);
    await questlog.updateQuestLog(username, questLog);
  },
  async updateQuestLog(username: string, questLog: any) {
    return await query("UPDATE quest_log SET completed_quests = ?, incomplete_quests = ? WHERE username = ?", [questLog.completed.join(","), questLog.incomplete.join(","), username]);
  },
  async completeQuest(username: string, id: number) {
    const quest = await quests.find(id);
    if (!quest) return;
    const questLog = await questlog.get(username);
    if (questLog.incomplete.includes(id)) {
      questLog.incomplete.splice(questLog.incomplete.indexOf(id), 1);
      questLog.completed.push(id);
      await questlog.updateQuestLog(username, questLog);
    }
  }
}

export default questlog;