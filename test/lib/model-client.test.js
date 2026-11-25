const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createModelClient,
    ModelUnavailableError
} = require('../../src/lib/model-client');

function modelResponse(text) {
    return {
        ok: true,
        async json() {
            return { candidates: [{ content: { parts: [{ text }] } }] };
        }
    };
}

test('model client sends text requests with environment configuration and parses the response', async () => {
    let request;
    const client = createModelClient({
        getConfig: () => ({ apiKey: 'test-key', modelName: 'test-model' }),
        fetchImpl: async (url, options) => {
            request = { url, options };
            return modelResponse('Draft description');
        }
    });

    const result = await client.generateText('Write a draft');

    assert.equal(result, 'Draft description');
    assert.match(request.url, /models\/test-model:generateContent$/);
    assert.equal(request.options.headers['x-goog-api-key'], 'test-key');
    assert.equal(JSON.parse(request.options.body).contents[0].parts[0].text, 'Write a draft');
    assert.ok(request.options.signal instanceof AbortSignal);
});

test('model client sends inline image data and requests JSON output', async () => {
    let requestBody;
    const client = createModelClient({
        getConfig: () => ({ apiKey: 'test-key', modelName: 'test-model' }),
        fetchImpl: async (_url, options) => {
            requestBody = JSON.parse(options.body);
            return modelResponse('{"title":"Open Day"}');
        }
    });

    const result = await client.generateJson('Extract event fields', {
        mimeType: 'image/png',
        data: 'iVBORw0KGgo='
    });

    assert.equal(result, '{"title":"Open Day"}');
    assert.deepEqual(requestBody.contents[0].parts[1], {
        inline_data: { mime_type: 'image/png', data: 'iVBORw0KGgo=' }
    });
    assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
});

test('model client reports a missing API key without making a request', async () => {
    let fetchCalled = false;
    const client = createModelClient({
        getConfig: () => ({ apiKey: '', modelName: 'test-model' }),
        fetchImpl: async () => {
            fetchCalled = true;
        }
    });

    assert.equal(client.isConfigured(), false);
    await assert.rejects(client.generateText('Write a draft'), (error) => {
        assert.ok(error instanceof ModelUnavailableError);
        assert.equal(error.reason, 'missing_key');
        return true;
    });
    assert.equal(fetchCalled, false);
});

test('model client classifies an aborted request as a timeout', async () => {
    const client = createModelClient({
        getConfig: () => ({ apiKey: 'test-key', modelName: 'test-model' }),
        timeoutMs: 5,
        fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
                const error = new Error('Request aborted');
                error.name = 'AbortError';
                reject(error);
            }, { once: true });
        })
    });

    await assert.rejects(client.generateText('Write a draft'), (error) => {
        assert.ok(error instanceof ModelUnavailableError);
        assert.equal(error.reason, 'timeout');
        assert.equal(error.cause.name, 'AbortError');
        return true;
    });
});

test('model client classifies HTTP 429 as rate limited', async () => {
    const client = createModelClient({
        getConfig: () => ({ apiKey: 'test-key', modelName: 'test-model' }),
        fetchImpl: async () => ({ ok: false, status: 429 })
    });

    await assert.rejects(client.generateText('Write a draft'), (error) => {
        assert.ok(error instanceof ModelUnavailableError);
        assert.equal(error.reason, 'rate_limited');
        return true;
    });
});

test('model client classifies fetch and provider failures as network unavailable', async () => {
    for (const fetchImpl of [
        async () => {
            throw new TypeError('Network connection failed');
        },
        async () => ({ ok: false, status: 503 })
    ]) {
        const client = createModelClient({
            getConfig: () => ({ apiKey: 'test-key', modelName: 'test-model' }),
            fetchImpl
        });

        await assert.rejects(client.generateText('Write a draft'), (error) => {
            assert.ok(error instanceof ModelUnavailableError);
            assert.equal(error.reason, 'network');
            return true;
        });
    }
});
