const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TIMEOUT_MS = 10_000;

function createModelClient({
    fetchImpl = globalThis.fetch,
    getConfig = () => ({
        apiKey: process.env.GEMINI_API_KEY,
        modelName: process.env.MODEL_NAME
    }),
    timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
    function isConfigured() {
        const { apiKey, modelName } = getConfig();
        return Boolean(apiKey && modelName);
    }

    async function generate(parts, responseMimeType) {
        const { apiKey, modelName } = getConfig();
        if (!apiKey || !modelName) {
            const error = new Error('Model client is not configured');
            error.code = 'MODEL_NOT_CONFIGURED';
            throw error;
        }
        if (typeof fetchImpl !== 'function') {
            throw new TypeError('Fetch is not available');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetchImpl(
                `${API_BASE_URL}/models/${encodeURIComponent(modelName)}:generateContent`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    },
                    body: JSON.stringify({
                        contents: [{ parts }],
                        ...(responseMimeType
                            ? { generationConfig: { responseMimeType } }
                            : {})
                    }),
                    signal: controller.signal
                }
            );

            if (!response.ok) {
                const error = new Error(`Model request failed with status ${response.status}`);
                error.status = response.status;
                throw error;
            }

            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts
                ?.map((part) => part.text)
                .filter((part) => typeof part === 'string')
                .join('');
            if (typeof text !== 'string' || !text.trim()) {
                throw new Error('Model response did not contain text');
            }
            return text;
        } finally {
            clearTimeout(timeout);
        }
    }

    return {
        isConfigured,
        generateText(prompt) {
            return generate([{ text: prompt }]);
        },
        generateJson(prompt, image) {
            return generate([
                { text: prompt },
                {
                    inline_data: {
                        mime_type: image.mimeType,
                        data: image.data
                    }
                }
            ], 'application/json');
        }
    };
}

module.exports = { createModelClient };
