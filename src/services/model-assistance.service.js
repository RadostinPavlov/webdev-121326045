const { createModelClient } = require('../lib/model-client');

const DESCRIPTION_LIMIT = 1000;
const IMAGE_LIMIT_BYTES = 4 * 1024 * 1024;
const MODEL_UNAVAILABLE_MESSAGE =
    'The model is unavailable. Please fill in the form by hand.';
const INVALID_POSTER_MESSAGE =
    'The model returned invalid poster details. Please fill in the form by hand.';
const EMPTY_FIELDS = {
    title: '',
    date: '',
    time: '',
    venue: '',
    capacity: ''
};

function createServiceError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function valueAsText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function createDescriptionPrompt(event) {
    return [
        'Write a concise, plain-text event description. Do not invent details.',
        `Title: ${valueAsText(event?.title)}`,
        `Date: ${valueAsText(event?.date)}`,
        `Time: ${valueAsText(event?.time)}`,
        `Venue: ${valueAsText(event?.venue)}`,
        `Audience: ${valueAsText(event?.audience)}`,
        `Notes: ${valueAsText(event?.notes)}`,
        `Return only the description, with no more than ${DESCRIPTION_LIMIT} characters.`
    ].join('\n');
}

function fallbackDescription(event) {
    const title = valueAsText(event?.title) || 'our upcoming event';
    const dateTime = [valueAsText(event?.date), valueAsText(event?.time)]
        .filter(Boolean)
        .join(' at ');
    const venue = valueAsText(event?.venue);
    const place = venue ? ` at ${venue}` : '';
    const schedule = dateTime ? ` on ${dateTime}` : '';
    return `Join us for ${title}${place}${schedule}.`.slice(0, DESCRIPTION_LIMIT);
}

function isValidDescription(value) {
    return typeof value === 'string' &&
        value.trim().length > 0 &&
        value.trim().length <= DESCRIPTION_LIMIT &&
        !/<\/?[a-z][^>]*>/i.test(value) &&
        !/```/.test(value);
}

function decodeImage(image) {
    if (
        !image ||
        !['image/png', 'image/jpeg'].includes(image.mimeType) ||
        typeof image.data !== 'string' ||
        image.data.length === 0 ||
        image.data.length % 4 !== 0 ||
        image.data.length > Math.ceil(IMAGE_LIMIT_BYTES / 3) * 4
    ) {
        throw createServiceError('INVALID_IMAGE', 'Upload a PNG or JPEG poster');
    }

    const paddingLength = image.data.endsWith('==')
        ? 2
        : image.data.endsWith('=')
            ? 1
            : 0;
    const decodedLength = (image.data.length * 3) / 4 - paddingLength;
    if (decodedLength > IMAGE_LIMIT_BYTES) {
        throw createServiceError('INVALID_IMAGE', 'Poster images must be 4 MB or smaller');
    }
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.data)) {
        throw createServiceError('INVALID_IMAGE', 'Upload a valid base64-encoded poster');
    }

    const bytes = Buffer.from(image.data, 'base64');
    const isPng = image.mimeType === 'image/png' &&
        bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = image.mimeType === 'image/jpeg' &&
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff;
    if (!isPng && !isJpeg) {
        throw createServiceError('INVALID_IMAGE', 'The image data does not match its PNG or JPEG type');
    }
}

function isFutureDate(value, now) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsedDate = new Date(`${value}T00:00:00.000Z`);
    if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== value
    ) {
        return false;
    }

    return value > now.toISOString().slice(0, 10);
}

function validatePosterFields(value, now) {
    const title = valueAsText(value.title);
    const venue = valueAsText(value.venue);
    const time = valueAsText(value.time);
    const date = isFutureDate(value.date, now) ? value.date : '';
    const capacity = Number.isSafeInteger(value.capacity) && value.capacity > 0
        ? value.capacity
        : '';
    const fields = {
        title: title.length <= 200 ? title : '',
        date,
        time: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '',
        venue: venue.length <= 200 ? venue : '',
        capacity
    };
    const invalidLabels = [
        ['title', 'title'],
        ['date', 'date'],
        ['time', 'time'],
        ['venue', 'venue'],
        ['capacity', 'capacity']
    ].filter(([field]) => fields[field] === '').map(([, label]) => label);

    return { fields, invalidLabels };
}

function emptyPosterResult(message) {
    return {
        ...EMPTY_FIELDS,
        source: 'fallback',
        message
    };
}

function createModelAssistanceService({
    client = createModelClient(),
    now = () => new Date()
} = {}) {
    return {
        async draftDescription(event) {
            if (!client.isConfigured()) {
                return {
                    description: fallbackDescription(event),
                    source: 'fallback',
                    message: 'Suggested without the model'
                };
            }

            let result;
            try {
                result = await client.generateText(createDescriptionPrompt(event));
            } catch {
                return {
                    description: fallbackDescription(event),
                    source: 'fallback',
                    message: 'Suggested without the model'
                };
            }

            if (!isValidDescription(result)) {
                return {
                    description: fallbackDescription(event),
                    source: 'fallback',
                    message: 'Suggested without the model'
                };
            }

            return { description: result.trim(), source: 'model' };
        },

        async extractFromPoster(image) {
            decodeImage(image);
            if (!client.isConfigured()) {
                return emptyPosterResult(MODEL_UNAVAILABLE_MESSAGE);
            }

            let response;
            try {
                response = await client.generateJson(
                    'Extract title, date (YYYY-MM-DD), time (HH:mm), venue, and capacity. ' +
                    'Return only a JSON object with those five fields. Do not guess missing values.',
                    image
                );
            } catch {
                return emptyPosterResult(MODEL_UNAVAILABLE_MESSAGE);
            }

            let extracted;
            try {
                extracted = typeof response === 'string' ? JSON.parse(response) : response;
            } catch {
                return emptyPosterResult(INVALID_POSTER_MESSAGE);
            }
            if (!extracted || typeof extracted !== 'object' || Array.isArray(extracted)) {
                return emptyPosterResult(INVALID_POSTER_MESSAGE);
            }

            const { fields, invalidLabels } = validatePosterFields(extracted, now());
            if (invalidLabels.length) {
                return {
                    ...fields,
                    source: 'model',
                    message: `Please fill in the ${invalidLabels.join(' and ')} by hand.`
                };
            }
            return { ...fields, source: 'model' };
        }
    };
}

const defaultService = createModelAssistanceService();

module.exports = {
    ...defaultService,
    createModelAssistanceService
};
