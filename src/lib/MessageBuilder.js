/**
 * A map of color names to their integer values.
 * @type {Object<string, number>}
 */
const ColorMap = {
    DEFAULT: 0,
    WHITE: 16777215,
    AQUA: 1752220,
    GREEN: 3066993,
    BLUE: 3447003,
    YELLOW: 16776960,
    PURPLE: 10181046,
    LUMINOUS_VIVID_PINK: 15277667,
    GOLD: 15844367,
    ORANGE: 15105570,
    RED: 15158332,
    GREY: 9807270,
    NAVY: 3426654,
    DARK_AQUA: 1146986,
    DARK_GREEN: 2067276,
    DARK_BLUE: 2123412,
    DARK_PURPLE: 7419530,
    DARK_VIVID_PINK: 11342935,
    DARK_GOLD: 12745742,
    DARK_ORANGE: 11027200,
    DARK_RED: 10038562,
    DARK_GREY: 9936031,
    DARKER_GREY: 8359053,
    LIGHT_GREY: 12370112,
    DARK_NAVY: 2899536,
    BLURPLE: 5793266,
    GREYPLE: 10070709,
    DARK_BUT_NOT_BLACK: 2895628,
    NOT_QUITE_BLACK: 2303786,
};

/**
 * Resolves a color to an integer.
 * @param {string|number|number[]} color - The color to resolve.
 * @returns {number|null} The resolved color as an integer, or null if invalid.
 */
function resolveColor(color) {
    if (typeof color === 'number') {
        return color;
    }

    if (typeof color === 'string') {
        const upperCaseColor = color.toUpperCase();
        if (ColorMap[upperCaseColor]) {
            return ColorMap[upperCaseColor];
        }
        
        let hex = upperCaseColor;
        if (hex.startsWith('#')) {
            hex = hex.substring(1);
        } else if (hex.startsWith('0X')) {
            hex = hex.substring(2);
        }

        if (/^[0-9A-F]{6}$/.test(hex)) {
            return parseInt(hex, 16);
        }
    }

    if (Array.isArray(color) && color.length === 3) {
        const [r, g, b] = color;
        return (r << 16) + (g << 8) + b;
    }

    return null;
}

/**
 * Parses a Discord message object to ensure embed structures are correct.
 * @param {object} message - The Discord message object, can contain content and embeds.
 * @returns {object} The parsed message object with corrected embed structures.
 */
function parseMessage(message) {
    if (!message || !message.embeds || !Array.isArray(message.embeds)) {
        return message;
    }

    message.embeds = message.embeds.map(embed => {
        if (!embed) {
            return null;
        }

        // Color
        if (embed.color !== undefined && embed.color !== null) {
            const resolved = resolveColor(embed.color);
            if (resolved !== null) {
                embed.color = resolved;
            }
        }

        // Thumbnail
        if (typeof embed.thumbnail === 'string') {
            if (embed.thumbnail.length > 0) {
                embed.thumbnail = { url: embed.thumbnail };
            } else {
                delete embed.thumbnail;
            }
        }

        // Image
        if (typeof embed.image === 'string') {
            if (embed.image.length > 0) {
                embed.image = { url: embed.image };
            } else {
                delete embed.image;
            }
        }

        // Author
        if (Array.isArray(embed.author)) {
            embed.author = embed.author[0] || undefined;
        }
        if (embed.author && typeof embed.author === 'object' && !embed.author.name) {
             delete embed.author;
        }
        
        // Footer
        if (typeof embed.footer === 'string') {
            embed.footer = { text: embed.footer };
        }
        if (Array.isArray(embed.footer)) {
            embed.footer = embed.footer[0] || undefined;
        }
        if (embed.footer && typeof embed.footer === 'object' && !embed.footer.text) {
            delete embed.footer;
        }

        return embed;
    }).filter(Boolean); // Remove any null embeds

    return message;
}

module.exports = { parseMessage };
