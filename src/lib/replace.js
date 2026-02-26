function Replace(obj, replacements) {
    if (typeof obj === "string") {
        let result = obj;
        // Itera sobre cada par [placeholder, value] y realiza el reemplazo
        for (const [placeholder, value] of replacements) {
            result = result.split(placeholder).join(value);
        }
        return result;
    } else if (Array.isArray(obj)) {
        // Si es un array, recorre cada elemento
        return obj.map(element => Replace(element, replacements));
    } else if (typeof obj === "object" && obj !== null) {
        // Si es un objeto, recorre sus propiedades recursivamente
        for (let key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = Replace(obj[key], replacements);
            }
        }
    }
    return obj;
}

module.exports = Replace;
