const crypto = require("crypto");

/**
 * Deriva la clave de 32 bytes usando SHA-256, igual que el dashboard.
 */
function getKey(encryptionKey) {
    return crypto.createHash("sha256").update(String(encryptionKey)).digest();
}

/**
 * Decrypta un texto cifrado con AES-256-CBC.
 * Formato esperado: "ivHex:encryptedHex"
 * @param {string} encryptedText
 * @param {string} encryptionKey - La misma ENCRYPTION_KEY del .env
 * @returns {string}
 */
function decrypt(encryptedText, encryptionKey) {
    const parts = encryptedText.split(":");
    const iv = Buffer.from(parts.shift(), "hex");
    const encrypted = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", getKey(encryptionKey), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString();
}

module.exports = { decrypt };
