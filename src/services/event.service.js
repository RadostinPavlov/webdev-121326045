const eventDb = require('../db/event.db');

async function listUpcomingEvents() {
    return await eventDb.getUpcomingEvents();
}

module.exports = {
    listUpcomingEvents
};
