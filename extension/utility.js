// extension/utility.js

const fs = require('fs-extra'); // Use file system operations
const console = require('./logging.js');

// Copy socket.io and xterm.js files
async function copyFiles(path, directory) {
    const filePairs = [
        [
            path.join(directory, 'node_modules/socket.io/client-dist/socket.io.min.js'),
            path.join(directory, 'web/inc/socket.io/socket.io.min.js')
        ],
        [
            path.join(directory, 'node_modules/xterm/css/xterm.css'),
            path.join(directory, 'web/inc/xterm/xterm.css')
        ],
        [
            path.join(directory, 'node_modules/xterm/lib/xterm.js'),
            path.join(directory, 'web/inc/xterm/xterm.js')
        ],
        [
            path.join(directory, 'node_modules/xterm-addon-fit/lib/xterm-addon-fit.js'),
            path.join(directory, 'web/inc/xterm/xterm-addon-fit.js')
        ]
    ];
    try {
        let handledFiles = 0;
        for (const [src, dest] of filePairs) {
            if (!fs.existsSync(src)) { // Skip this pair if source does not exist
                console.warn(`File "${src}" is missing.`);
                continue;
            }
            const srcStat = await fs.stat(src);
            
            let destStat = { mtime:0 }; // Set default destStats
            if (!fs.existsSync(dest)) { // Ensure the destination directory if the dest file is missing
                await fs.ensureDir(path.dirname(dest));
            } else {
                destStat = await fs.stat(dest);
            }

            // Check if source file is newer than destination file
            if (srcStat.mtime > destStat.mtime) {
                await fs.copyFile(src, dest);
                console.debug(`Copied "${src}" to "${dest}"`);
                handledFiles++;
            } else {
                console.debug(`File "${dest}" is up to date.`);
            }
        }
        if (handledFiles > 0) console.info(`Web files handled: ${filePairs.length}`);
    } catch (error) {
        console.error('Failed to copy files:', error);
    }
}

function generateName() {
    const attributes = ["adventurous", "alone", "altruistic", "amiable", "animated", "ardent", "artistic", "assertive", "attractive", "inspiring", "blissful", "bold", "brave", "buoyant", "charismatic", "compassionate", "creative", "cute", "daring", "dynamic", "elegant", "ethereal", "exuberant", "fearless", "fluffy", "generous", "genuine", "graceful", "harmonious", "heartfelt", "hopeful", "insightful", "joyful", "jubilant", "lively", "luminous", "majestic", "meticulous", "mysterious", "noble", "novel", "nurturing", "observant", "optimistic", "opulent", "original", "outgoing", "passionate", "perceptive", "pioneering", "playful", "powerful", "precious", "pristine", "proactive", "purposeful", "quirky", "radiant", "receptive", "reflective", "refreshing", "resilient", "reverent", "rewarding", "robust", "scholarly", "serene", "sexy", "shimmering", "sincere", "sociable", "solid", "soothing", "sophisticated", "soulful", "spirited", "spontaneous", "steadfast", "sublime", "suspicious", "synergistic", "tenacious", "therapeutic", "thoughtful", "timeless", "tolerant", "tranquil", "trustworthy", "upbeat", "versatile", "vibrant", "visionary", "vivacious", "whimsical", "wise", "witty"];
    const animals = ["albatross", "alligator", "antelope", "ape", "armadillo", "baboon", "badger", "bat", "beagle", "bear", "beaver", "bison", "boar", "buffalo", "bull", "camel", "cat", "chameleon", "cheetah", "chihuahua", "chimpanzee", "chinchilla", "cobra", "cow", "crab", "crocodile", "crow", "deer", "dodo", "dog", "dolphin", "donkey", "duck", "eagle", "eel", "elephant", "elk", "emu", "fish", "flamingo", "fox", "frog", "giraffe", "goat", "goose", "gorilla", "hamster", "hare", "hawk", "hedgehog", "hen", "hippo", "horse", "iguana", "jackal", "jaguar", "jellyfish", "kangaroo", "koala", "lemur", "leopard", "lion", "lizard", "llama", "lynx", "mammoth", "mole", "monitor", "monkey", "mouse", "mule", "orangutan", "ostrich", "otter", "owl", "panda", "panther", "peacock", "pigeon", "polar", "possum", "rabbit", "racoon", "rat", "rhino", "shark", "sheep", "sloth", "snake", "squirrel", "swan", "tiger", "tortoise", "turtle", "vulture", "whale", "wolf", "wombat", "zebra"];
  
    // Randomly select an attribute and an animal
    const randomAttribute = attributes[Math.floor(Math.random() * attributes.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  
    // Combine them to create a name
    return randomAttribute + '-' + randomAnimal;
}
  

module.exports = {
    copyFiles,
    generateName
};
