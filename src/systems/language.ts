import log from "../modules/logger";
import swears from "../../config/swears.json";
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const TRANSLATION_SERVICE = process.env.TRANSLATION_SERVICE || "google_translate";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-nano-2025-04-14"; // Default to cheapest model
import OpenAI from "openai";
let openai: OpenAI | null = null;

if (TRANSLATION_SERVICE === "openai" && OPENAI_API_KEY) {
    openai = new OpenAI();
}

const language = {
    translate: async (text: string, lang: string) => {
        let response = text;
        if (!text || text.trim() === "") return text;

        try {
            const translationPromise = (async () => {
                if (TRANSLATION_SERVICE.toLowerCase() === "google_translate") {
                    if (!GOOGLE_TRANSLATE_API_KEY) {
                        log.warn("Google Translate API Key not found");
                        return response;
                    }
                    response = await language.translate_google({ text, lang }) as any;
                }

                if (TRANSLATION_SERVICE.toLowerCase() === "openai") {
                    if (!OPENAI_API_KEY) {
                        log.warn("OpenAI API Key not found");
                        return response;
                    }
                    response = await language.translate_openai({ text, lang }) as any;
                }
                return response;
            })();

            // Set 3 second timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Translation timeout')), 1000);
            });

            response = await Promise.race([translationPromise, timeoutPromise]) as string;
        } catch (error) {
            // Default to google translate if error
            log.error(`Error translating text: ${error}`);
            return language.translate_google({ text, lang }) as any;
        }

        // Replace any HTML entities
        const htmlEntities: { [key: string]: string } = {
            "&amp;": "&",
            "&lt;": "<",
            "&gt;": ">",
            "&quot;": "\"",
            "&#39;": "'",
            "&#96;": "`"
        };

        response = response.replace(/&(?:amp|lt|gt|quot|#39|#96);/g, (match: string) => htmlEntities[match]);
        return response;
    },
    translate_google: async (data: any) => {
        log.debug(`Translating text: ${data.text} to ${data.lang} using Google Translate`);
        const url = new URL("https://translation.googleapis.com/language/translate/v2");
        // API Key
        url.searchParams.append('key', GOOGLE_TRANSLATE_API_KEY as string);
        // Text to translate
        url.searchParams.append('q', data.text);
        
        // Target language
        url.searchParams.append('target', data.lang);

        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
            },
        }).then((res) => res.json());
        
        // Get any errors
        if (response.error) {
            log.error(`Error translating text: ${response.error.message}`);
            return;
        }

        let translatedText = response.data.translations[0].translatedText;

        // If translating to English, check for swear words
        if (data.lang === "en") {
            for (const swear of swears) {
                const swearRegex = new RegExp(swear.id, "gi");
                while (swearRegex.test(translatedText)) {
                    const randomLength = Math.floor(Math.random() * 5) + 1;
                    translatedText = translatedText.replace(
                        swearRegex,
                        "*".repeat(randomLength)
                    );
                }
            }
        }

        return translatedText;
    },
    translate_openai: async (data: any) => {
        log.debug(`Translating text: ${data.text} to ${data.lang} using OpenAI`);
        if (!openai) {
            log.error("OpenAI client not initialized");
            return data.text;
        }

        try {
            const completion = await openai.chat.completions.create({
                model: OPENAI_MODEL,
                messages: [
                    {
                        role: "system",
                        content: `
                            You are a professional translator.
                            Translate the text accurately while preserving the original meaning and tone.
                            Leave all emojis and special characters intact.
                            Replace common swear words with asterisks. Do not let ANY swear words through in any context.
                            Only respond with the translated text, do not include any other text.
                            If there is not enough context to translate the text, respond with the original text.
                            If the text is already in the target language, respond with the original text.
                            If the word cannot be translated, respond with the original text.
                            Never respond with "I'm sorry, I can't translate that." or any variation of that phrase.
                            If you cannot translate the text, respond with the original text.
                        `
                    },
                    {
                        role: "user",
                        content: `Translate the following text to ${data.lang}: ${data.text}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 150
            });

            const translatedText = completion.choices[0]?.message?.content?.trim();
            if (!translatedText) {
                log.error("No translation received from OpenAI");
                return data.text;
            }

            return translatedText;
        } catch (error) {
            log.error(`OpenAI Translation Error: ${error}`);
        }
    }
};

export default language;