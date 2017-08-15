export const stripWord = (str, word) => str
        .toLowerCase()
        .replace(word.toLowerCase(), '')
        .trim();
