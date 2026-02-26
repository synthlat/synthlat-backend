/**
 * XP necesario para subir del nivel N al N+1.
 */
function xpForNextLevel(level, base, multiplier) {
    return Math.floor(base * Math.pow(multiplier, level));
}

/**
 * Barra de progreso visual.
 * @param {number} current
 * @param {number} total
 * @param {number} length - Cantidad de bloques
 */
function progressBar(current, total, length = 12) {
    const filled = Math.min(Math.round((current / total) * length), length);
    return "█".repeat(filled) + "░".repeat(length - filled);
}

module.exports = { xpForNextLevel, progressBar };
