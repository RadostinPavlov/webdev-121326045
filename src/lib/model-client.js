const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TIMEOUT_MS = 10_000;

class ModelUnavailableError extends Error {
    constructor(reason, cause) {
        const messages = {
            timeout: 'Model request timed out',
            rate_limited: 'Model provider is rate-limited',
            missing_key: 'Model API key is not configured',
            network: 'Model provider is unavailable'
        };
        super(messages[reason] ?? messages.network);
        this.name = 'ModelUnavailableError';
        this.code = 'MODEL_UNAVAILABLE';
        this.reason = reason;
        if (cause !== undefined) {
            this.cause = cause;
        }
    }
}

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
        if (!apiKey) {
            throw new ModelUnavailableError('missing_key');
        }
        if (!modelName) {
            throw new ModelUnavailableError('network');
        }
        if (typeof fetchImpl !== 'function') {
            throw new ModelUnavailableError('network');
        }

        const controller = new AbortController();
        let timedOut = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);

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
                if (response.status === 429) {
                    throw new ModelUnavailableError('rate_limited');
                }
                throw new ModelUnavailableError('network');
            }

            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts
                ?.map((part) => part.text)
                .filter((part) => typeof part === 'string')
                .join('');
            return typeof text === 'string' ? text : '';
        } catch (error) {
            if (error instanceof ModelUnavailableError) {
                throw error;
            }
            if (timedOut || error?.name === 'AbortError') {
                throw new ModelUnavailableError('timeout', error);
            }
            throw new ModelUnavailableError('network', error);
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

module.exports = { createModelClient, ModelUnavailableError };
