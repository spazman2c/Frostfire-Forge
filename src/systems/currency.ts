import query from "../controllers/sqldatabase";

const max_copper = 99;
const max_silver = 99;
const max_gold = 9999999;

const currency = {
    async get(username: string): Promise<Currency> {
        if (!username) return { copper: 0, silver: 0, gold: 0 };
        const response = await query("SELECT copper, silver, gold FROM currency WHERE username = ?", [username]) as Currency[];
        if (response.length === 0) return { copper: 0, silver: 0, gold: 0 };
        return response[0] as Currency;
    },
    async set(username: string, currencyData: Currency) {
        if (!username || !currencyData) return;
        const { copper, silver, gold } = currencyData;
        await query(
            "INSERT INTO currency (username, copper, silver, gold) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE copper = ?, silver = ?, gold = ?",
            [username, copper, silver, gold, copper, silver, gold]
        );
    },
    async add(username: string, amount: Currency) : Promise<Currency> {
        const currentCurrency = await this.get(username);
        if (!currentCurrency) return { copper: 0, silver: 0, gold: 0 };

        if (currentCurrency.copper + amount.copper > max_copper) {
            const overflowToSilver = Math.floor((currentCurrency.copper + amount.copper) / (max_copper + 1));
            currentCurrency.silver += overflowToSilver;
            currentCurrency.copper = (currentCurrency.copper + amount.copper) % (max_copper + 1);
        }

        if (currentCurrency.silver + amount.silver > max_silver) {
            const overflowToGold = Math.floor((currentCurrency.silver + amount.silver) / (max_silver + 1));
            currentCurrency.gold += overflowToGold;
            currentCurrency.silver = currentCurrency.silver % (max_silver + 1);
        }

        if (currentCurrency.gold + amount.gold > max_gold) {
            currentCurrency.gold = max_gold;
        } else {
            currentCurrency.gold += amount.gold;
        }
        await this.set(username, currentCurrency);
        return currentCurrency;
    },
    async remove(username: string, amount: Currency) : Promise<Currency> {
        const currentCurrency = await this.get(username);
        if (!currentCurrency) return { copper: 0, silver: 0, gold: 0 };

        if (currentCurrency.copper < amount.copper) {
            currentCurrency.copper = 0;
            currentCurrency.silver = Math.max(0, currentCurrency.silver - amount.silver);
            currentCurrency.gold = Math.max(0, currentCurrency.gold - amount.gold);
        } else {
            currentCurrency.copper -= amount.copper;
            if (currentCurrency.silver < amount.silver) {
                currentCurrency.silver = 0;
                currentCurrency.gold = Math.max(0, currentCurrency.gold - amount.gold);
            } else {
                currentCurrency.silver -= amount.silver;
                if (currentCurrency.gold < amount.gold) {
                    currentCurrency.gold = 0;
                } else {
                    currentCurrency.gold -= amount.gold;
                }
            }
        }
        await this.set(username, currentCurrency);
        return currentCurrency;
    },
};

export default currency;