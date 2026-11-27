const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function colorVariables(block) {
    return Object.fromEntries(
        [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)]
            .map(([, name, value]) => [name, value])
    );
}

function luminance(color) {
    const channels = [1, 3, 5].map((index) => {
        const value = Number.parseInt(color.slice(index, index + 2), 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels.reduce(
        (total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index],
        0
    );
}

function contrast(foreground, background) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}

test('every page has a language, a descriptive title, and labels for its inputs', () => {
    for (const file of ['src/public/login.html', 'src/views/events.html']) {
        const html = read(file);
        assert.match(html, /<html\s+lang="en">/);
        assert.match(html, /<title>[^<]{4,}<\/title>/);
        const inputIds = [...html.matchAll(/<input\b[^>]*\bid="([^"]+)"/g)]
            .map((match) => match[1]);
        for (const id of inputIds) {
            assert.match(html, new RegExp(`<label\\s+for="${id}"`), `${file}: ${id}`);
        }
    }

    const organizerHtml = require('../../src/public/js/organizer-view.js')
        .render({ visible: true });
    const organizerInputs = [...organizerHtml.matchAll(/<input\b[^>]*\bid="([^"]+)"/g)]
        .map((match) => match[1]);
    for (const id of organizerInputs) {
        assert.match(organizerHtml, new RegExp(`<label\\s+for="${id}"`), id);
    }
});

test('shared styles define responsive scales, focus, touch targets, reserved space, and dark mode', () => {
    const css = read('src/public/css/site.css');

    assert.match(css, /--space-1:/);
    assert.match(css, /--space-12:/);
    assert.match(css, /--font-xs:/);
    assert.match(css, /--font-2xl:/);
    assert.match(css, /@media \(max-width: 40rem\)/);
    assert.match(css, /grid-template-columns:\s*repeat\(auto-fit/);
    assert.match(css, /#eventsList\s*\{\s*min-height:/);
    assert.match(css, /:focus-visible\s*\{\s*outline:/);
    assert.match(css, /a,\s*button\s*\{\s*min-height:\s*2\.75rem/);
    assert.match(css, /@media \(prefers-color-scheme: dark\)/);
});

test('light and dark theme text colors meet the 4.5:1 contrast threshold', () => {
    const css = read('src/public/css/site.css');
    const lightBlock = css.match(/:root\s*\{([^}]+)\}/)[1];
    const darkBlock = css.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]+)\}/)[1];
    const themes = [
        colorVariables(lightBlock),
        { ...colorVariables(lightBlock), ...colorVariables(darkBlock) }
    ];

    for (const theme of themes) {
        for (const foreground of ['text', 'muted', 'action', 'error']) {
            for (const background of ['background', 'surface']) {
                assert.ok(
                    contrast(theme[foreground], theme[background]) >= 4.5,
                    `${foreground} on ${background} must meet 4.5:1`
                );
            }
        }
        for (const background of ['action', 'action-hover']) {
            assert.ok(
                contrast(theme['button-text'], theme[background]) >= 4.5,
                `button text on ${background} must meet 4.5:1`
            );
        }
    }
});
