require('dotenv').config({ quiet: true });

const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');

const lectures = JSON.parse(fs.readFileSync(path.join(__dirname, 'lectures.json'), 'utf8'));

const tools = [
    {
        name: 'find_lecture',
        description: 'Return the title and topics of one course lecture by its number, 1 to 10. Use it when asked what a lecture covers.',
        inputSchema: {
            type: 'object',
            properties: { number: { type: 'integer', description: 'Lecture number, 1 to 10' } },
            required: ['number']
        }
    },
    {
        name: 'list_lectures',
        description: 'List the number and title of every course lecture. Use it when asked what the course covers.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'list_upcoming_events',
        description: 'List upcoming club events, dates, remaining places, and your registration status.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'register_for_event',
        description: 'Register the signed-in member for an upcoming club event if places are available.',
        inputSchema: {
            type: 'object',
            properties: {
                event_id: { type: 'integer', description: 'ID of the event to register for' }
            },
            required: ['event_id']
        }
    },
    {
        name: 'cancel_registration',
        description: "Cancel the signed-in member's registration using its registration ID.",
        inputSchema: {
            type: 'object',
            properties: {
                registration_id: {
                    type: 'integer',
                    description: 'ID of the registration to cancel'
                }
            },
            required: ['registration_id']
        }
    }
];

function textResult(id, text, isError) {
    return {
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text }], isError }
    };
}

function positiveInteger(value, name) {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return value;
}

function readableError(error) {
    if (error && typeof error.message === 'string' && error.message.length > 0) {
        return error.message;
    }
    return 'The event operation failed';
}

function createHandler({
    lectureData = lectures,
    eventService,
    getUserForToken,
    getToken = () => process.env.MCP_TOKEN
} = {}) {
    async function callEventTool(id, name, args) {
        const token = getToken();
        if (typeof token !== 'string' || token.length === 0) {
            return textResult(id, 'MCP_TOKEN is not set', true);
        }

        try {
            const resolveUser = getUserForToken ??
                require('../src/services/auth.service').getUserForToken;
            const user = await resolveUser(token);
            if (!user) {
                return textResult(id, 'MCP_TOKEN is invalid', true);
            }

            const service = eventService ?? require('../src/services/event.service');
            switch (name) {
                case 'list_upcoming_events': {
                    const events = await service.listUpcomingEvents(user.id);
                    return textResult(id, JSON.stringify(events), false);
                }
                case 'register_for_event': {
                    const eventId = positiveInteger(args.event_id, 'event_id');
                    const result = await service.registerForEvent(eventId, user.id);
                    return textResult(id, result.message, false);
                }
                case 'cancel_registration': {
                    const registrationId = positiveInteger(
                        args.registration_id,
                        'registration_id'
                    );
                    const result = await service.cancelRegistration(
                        registrationId,
                        user.id
                    );
                    return textResult(id, result.message, false);
                }
                default:
                    return {
                        jsonrpc: '2.0',
                        id,
                        error: { code: -32602, message: 'Unknown tool' }
                    };
            }
        } catch (error) {
            return textResult(id, readableError(error), true);
        }
    }

    return async function handle(msg) {
        if (msg.method === 'initialize') {
            return {
                jsonrpc: '2.0',
                id: msg.id,
                result: {
                    protocolVersion: msg.params.protocolVersion,
                    capabilities: { tools: {} },
                    serverInfo: { name: 'lectures', version: '0.1.0' }
                }
            };
        }
        if (msg.method === 'notifications/initialized') {
            return null;
        }

        if (msg.method === 'tools/list') {
            return { jsonrpc: '2.0', id: msg.id, result: { tools } };
        }

        if (msg.method === 'tools/call') {
            const name = msg.params.name;
            const args = msg.params.arguments || {};

            if (name === 'find_lecture') {
                const lecture = lectureData.find((item) => item.number === args.number);
                if (!lecture) {
                    return textResult(msg.id, `Lecture ${args.number} not found`, true);
                }
                return textResult(
                    msg.id,
                    `Lecture ${lecture.number}: ${lecture.title}. Topics: ${lecture.topics}`,
                    false
                );
            }

            if (name === 'list_lectures') {
                return textResult(
                    msg.id,
                    lectureData.map((item) => `${item.number}. ${item.title}`).join('\n'),
                    false
                );
            }

            if ([
                'list_upcoming_events',
                'register_for_event',
                'cancel_registration'
            ].includes(name)) {
                return callEventTool(msg.id, name, args);
            }

            return {
                jsonrpc: '2.0',
                id: msg.id,
                error: { code: -32602, message: 'Unknown tool' }
            };
        }

        return {
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32601, message: 'Method not found' }
        };
    };
}

function start() {
    const lines = readline.createInterface({ input: process.stdin });
    const handle = createHandler();

    lines.on('line', async (line) => {
        console.error('got: ' + line);
        const reply = await handle(JSON.parse(line));
        if (reply) {
            process.stdout.write(JSON.stringify(reply) + '\n');
        }
    });
}

if (require.main === module) {
    start();
}

module.exports = { createHandler, tools };
