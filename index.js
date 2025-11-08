const { Client, GatewayIntentBits, ActionRowBuilder, ActivityType, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Configuration
const BOARD_SIZE = 15;
const RACK_SIZE = 7;

// Distribution anglaise des lettres (EN)
const LETTER_BAG_EN = {
    'A': { count: 9, points: 1 }, 'B': { count: 2, points: 3 }, 'C': { count: 2, points: 3 },
    'D': { count: 4, points: 2 }, 'E': { count: 12, points: 1 }, 'F': { count: 2, points: 4 },
    'G': { count: 3, points: 2 }, 'H': { count: 2, points: 4 }, 'I': { count: 9, points: 1 },
    'J': { count: 1, points: 8 }, 'K': { count: 1, points: 5 }, 'L': { count: 4, points: 1 },
    'M': { count: 2, points: 3 }, 'N': { count: 6, points: 1 }, 'O': { count: 8, points: 1 },
    'P': { count: 2, points: 3 }, 'Q': { count: 1, points: 10 }, 'R': { count: 6, points: 1 },
    'S': { count: 4, points: 1 }, 'T': { count: 6, points: 1 }, 'U': { count: 4, points: 1 },
    'V': { count: 2, points: 4 }, 'W': { count: 2, points: 4 }, 'X': { count: 1, points: 8 },
    'Y': { count: 2, points: 4 }, 'Z': { count: 1, points: 10 }, '*': { count: 2, points: 0 }
};

// Distribution française des lettres (FR)
const LETTER_BAG_FR = {
    'A': { count: 9, points: 1 }, 'B': { count: 2, points: 3 }, 'C': { count: 2, points: 3 },
    'D': { count: 3, points: 2 }, 'E': { count: 15, points: 1 }, 'F': { count: 2, points: 4 },
    'G': { count: 2, points: 2 }, 'H': { count: 2, points: 4 }, 'I': { count: 8, points: 1 },
    'J': { count: 1, points: 8 }, 'K': { count: 1, points: 10 }, 'L': { count: 5, points: 1 },
    'M': { count: 3, points: 2 }, 'N': { count: 6, points: 1 }, 'O': { count: 6, points: 1 },
    'P': { count: 2, points: 3 }, 'Q': { count: 1, points: 8 }, 'R': { count: 6, points: 1 },
    'S': { count: 6, points: 1 }, 'T': { count: 6, points: 1 }, 'U': { count: 6, points: 1 },
    'V': { count: 2, points: 4 }, 'W': { count: 1, points: 10 }, 'X': { count: 1, points: 10 },
    'Y': { count: 1, points: 10 }, 'Z': { count: 1, points: 10 }, '*': { count: 2, points: 0 }
};

// Distribution espagnole des lettres (ES) - sans CH, LL, RR pour compatibilité
const LETTER_BAG_ES = {
    'A': { count: 12, points: 1 }, 'B': { count: 2, points: 3 }, 'C': { count: 4, points: 3 },
    'D': { count: 5, points: 2 }, 'E': { count: 12, points: 1 }, 'F': { count: 1, points: 4 },
    'G': { count: 2, points: 2 }, 'H': { count: 2, points: 4 }, 'I': { count: 6, points: 1 },
    'J': { count: 1, points: 8 }, 'K': { count: 0, points: 0 }, // K n'existe pas en Scrabble ES standard
    'L': { count: 4, points: 1 }, 'M': { count: 2, points: 3 }, 'N': { count: 5, points: 1 },
    'Ñ': { count: 1, points: 8 }, 'O': { count: 9, points: 1 }, 'P': { count: 2, points: 3 },
    'Q': { count: 1, points: 5 }, 'R': { count: 5, points: 1 }, 'S': { count: 6, points: 1 },
    'T': { count: 4, points: 1 }, 'U': { count: 5, points: 1 }, 'V': { count: 1, points: 4 },
    'W': { count: 0, points: 0 }, // W n'existe pas en Scrabble ES standard
    'X': { count: 1, points: 8 }, 'Y': { count: 1, points: 4 }, 'Z': { count: 1, points: 10 },
    '*': { count: 2, points: 0 }
};


// Cases spéciales
const TRIPLE_WORD = [[0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]];
const DOUBLE_WORD = [[1,1],[2,2],[3,3],[4,4],[1,13],[2,12],[3,11],[4,10],[10,4],[11,3],[12,2],[13,1],[10,10],[11,11],[12,12],[13,13]];
const TRIPLE_LETTER = [[1,5],[1,9],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[13,5],[13,9]];
const DOUBLE_LETTER = [[0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],[6,2],[6,6],[6,8],[6,12],[7,3],[7,11],[8,2],[8,6],[8,8],[8,12],[11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11]];

/**
 * Calculates the base Scrabble score for a given word and language.
 * @param {string} word The word to score (e.g., "QUIZ").
 * @param {string} language The language key ('en', 'fr', 'es').
 * @returns {number} The base score.
 */
function calculateBaseScore(word, language) {
    let bagConfig;
    // Ensure that LETTER_BAG_... constants are defined globally
    if (language === 'fr') {
        bagConfig = LETTER_BAG_FR;
    } else if (language === 'es') {
        bagConfig = LETTER_BAG_ES;
    } else {
        bagConfig = LETTER_BAG_EN; // Default to English
    }

    let score = 0;
    // Assuming normalizeWord is globally defined (which it should be)
    const normalizedWord = normalizeWord(word).toUpperCase(); 

    for (let i = 0; i < normalizedWord.length; i++) {
        const letter = normalizedWord[i];

        // Check for existence of bagConfig before accessing properties
        if (bagConfig && bagConfig[letter]) { 
            score += bagConfig[letter].points;
        } else {
            score += 0;
        }
    }
    return score;
}

async function handleScoreCommand(interaction) {
    // This is where the error happens if calculateBaseScore is below this line.
    await interaction.deferReply({ ephemeral: false }); 

    const language = interaction.options.getString('language');
    const rawWord = interaction.options.getString('word');

    if (!rawWord || rawWord.length === 0) {
        return interaction.editReply({
            content: '❌ Please provide a word to calculate the score for.',
        });
    }

    const baseScore = calculateBaseScore(rawWord, language);

    // Assuming DICTIONARIES and normalizeWord are globally defined
    const dictionary = DICTIONARIES.get(language);
    const isValid = dictionary ? dictionary.has(normalizeWord(rawWord).toUpperCase()) : false;

    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle(`🔢 Score Calculation for: **${rawWord.toUpperCase()}**`)
        .setDescription(`Base score calculated using the **${language.toUpperCase()}** Scrabble letter values.`)
        .addFields(
            { name: 'Base Score', value: `**${baseScore}** points`, inline: true },
            { name: 'Dictionary Status', value: isValid ? '✅ Found' : '❌ Not Found', inline: true },
        )
        .setFooter({ text: 'This score does not include board multipliers (Double/Triple Word/Letter).' });

    return interaction.editReply({ embeds: [embed] });
}

// Dictionnaires
const DICTIONARIES = new Map();

function normalizeWord(word) {
    // Ne normalise pas le 'Ñ' espagnol, mais enlève les accents
    return word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function loadDictionary(lang, filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const words = content.split('\n').map(w => w.trim()).filter(w => w.length > 0);
        const wordSet = new Set();

        for (const word of words) {
            wordSet.add(normalizeWord(word));
        }

        DICTIONARIES.set(lang, wordSet);
        console.log(`📚 Dictionary [${lang}] loaded: ${wordSet.size} words`);
    } catch (error) {
        console.error(`❌ Dictionary loading error [${lang}]:`, error.message);
        console.log(`⚠️ Bot will work without word validation for [${lang}]`);
    }
}

// Load all dictionaries
loadDictionary('en', 'en.txt');
loadDictionary('fr', 'fr.txt');
loadDictionary('es', 'es.txt');


// Parties en cours
const games = new Map();
const pendingInvites = new Map();

class ScrabbleGame {
    constructor(channelId, gameType, player1, language, difficulty = null, player2 = null) {
        this.channelId = channelId;
        this.gameType = gameType;
        this.language = language;
        this.difficulty = difficulty;
        this.players = [
            { id: player1.id, name: player1.username, score: 0, rack: [], isBot: false, totalPlays: 0 }
        ];

        if (gameType === 'bot') {
            this.players.push({ id: 'bot', name: '🤖 Bot', score: 0, rack: [], isBot: true, totalPlays: 0 });
        } else if (player2) {
            this.players.push({ id: player2.id, name: player2.username, score: 0, rack: [], isBot: false, totalPlays: 0 });
        }

        this.currentPlayerIndex = 0;
        this.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
        this.letterBagConfig = this.getLetterBagConfig(language);
        this.dictionary = DICTIONARIES.get(language) || new Set();
        this.letterBag = this.initializeBag();
        this.originalBag = this.getAllLetters();
        this.isStarted = true;
        this.passCount = 0;
        this.messageId = null;
        this.playLog = [];
        this.turnNumber = 1;

        for (const player of this.players) {
            this.fillRack(player);
        }
    }

    getLetterBagConfig(lang) {
        if (lang === 'fr') return LETTER_BAG_FR;
        if (lang === 'es') return LETTER_BAG_ES;
        return LETTER_BAG_EN;
    }

    getAllLetters() {
        const all = [];
        for (const [letter, data] of Object.entries(this.letterBagConfig)) {
            for (let i = 0; i < data.count; i++) {
                all.push(letter);
            }
        }
        return all.sort();
    }

    getRemainingLetters() {
        const remaining = {};
        for (const [letter, data] of Object.entries(this.letterBagConfig)) {
            remaining[letter] = data.count;
        }

        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (this.board[i][j]) {
                    if (remaining[this.board[i][j]] !== undefined) {
                        remaining[this.board[i][j]]--;
                    }
                }
            }
        }

        for (const player of this.players) {
            for (const letter of player.rack) {
                 if (remaining[letter] !== undefined) {
                    remaining[letter]--;
                 }
            }
        }

        return remaining;
    }

    initializeBag() {
        const bag = [];
        for (const [letter, data] of Object.entries(this.letterBagConfig)) {
            for (let i = 0; i < data.count; i++) {
                bag.push(letter);
            }
        }
        return this.shuffle(bag);
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    fillRack(player) {
        while (player.rack.length < RACK_SIZE && this.letterBag.length > 0) {
            player.rack.push(this.letterBag.pop());
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        if (this.currentPlayerIndex === 0) this.turnNumber++;
        // DO NOT reset passCount here
    }

    getCellType(row, col) {
        if (this.board[row][col]) return 'occupied';
        if (row === 7 && col === 7) return 'center';
        if (TRIPLE_WORD.some(([r, c]) => r === row && c === col)) return 'tw';
        if (DOUBLE_WORD.some(([r, c]) => r === row && c === col)) return 'dw';
        if (TRIPLE_LETTER.some(([r, c]) => r === row && c === col)) return 'tl';
        if (DOUBLE_LETTER.some(([r, c]) => r === row && c === col)) return 'dl';
        return 'normal';
    }

    generateBoardDisplay() {
        let display = '```\n   A B C D E F G H I J K L M N O\n';
        for (let i = 0; i < BOARD_SIZE; i++) {
            display += `${(i + 1).toString().padStart(2)} `;
            for (let j = 0; j < BOARD_SIZE; j++) {
                const cell = this.board[i][j];
                if (cell) {
                    display += cell + ' ';
                } else {
                    const type = this.getCellType(i, j);
                    switch (type) {
                        case 'center': display += '★ '; break;
                        case 'tw': display += '≡ '; break;
                        case 'dw': display += '= '; break;
                        case 'tl': display += '‡ '; break;
                        case 'dl': display += '† '; break;
                        default: display += '· '; break;
                    }
                }
            }
            display += '\n';
        }
        display += '```';
        return display;
    }

    isValidWord(word) {
        if (this.dictionary.size === 0) return true;
        return this.dictionary.has(normalizeWord(word));
    }

    findAllPossiblePlays(rack) {
        const plays = [];

        if (this.dictionary.size === 0) {
            console.log('⚠️ Bot cannot play: no dictionary loaded');
            return [];
        }

        for (const word of this.dictionary) {
            if (word.length < 2 || word.length > 15) continue;
            if (!this.canFormWord(word, rack)) continue;

            for (let row = 0; row < BOARD_SIZE; row++) {
                for (let col = 0; col < BOARD_SIZE; col++) {
                    for (const dir of ['H', 'V']) {
                        const result = this.placeWord(word, row, col, dir, rack);

                        // CRITICAL: Only accept plays without errors and with positive score
                        if (result && !result.error && result.score > 0) {
                            // EXTRA VALIDATION: Double-check all perpendicular words are valid
                            let allWordsValid = true;

                            if (result.perpendicularWords) {
                                for (const perpWord of result.perpendicularWords) {
                                    if (perpWord.word.length > 1 && !this.isValidWord(perpWord.word)) {
                                        console.log(`⚠️ Bot rejected ${word} at ${String.fromCharCode(65 + col)}${row + 1} (${dir}) - creates invalid word: ${perpWord.word}`);
                                        allWordsValid = false;
                                        break;
                                    }
                                }
                            }

                            if (allWordsValid) {
                                plays.push({ 
                                    word, 
                                    row, 
                                    col, 
                                    direction: dir, 
                                    score: result.score, 
                                    result,
                                    wordLength: word.length,
                                    tilesUsed: result.placements.length
                                });
                            }
                        }
                    }
                }
            }
        }

        console.log(`🔍 Bot [${this.language}] found ${plays.length} valid plays`);
        return plays;
    }

    canFormWord(word, rack) {
        const rackCopy = [...rack];
        const letters = word.split('');

        for (const letter of letters) {
            const idx = rackCopy.indexOf(letter);
            if (idx !== -1) {
                rackCopy.splice(idx, 1);
            } else if (rackCopy.includes('*')) {
                rackCopy.splice(rackCopy.indexOf('*'), 1);
            } else {
                return false;
            }
        }
        return true;
    }

    getBotPlay() {
        const player = this.getCurrentPlayer();
        const allPlays = this.findAllPossiblePlays(player.rack);

        if (allPlays.length === 0) {
            console.log('🤖 Bot has no valid plays available');
            return null;
        }

        let selectedPlay;

        if (this.difficulty === 'easy') {
            const shortWords = allPlays.filter(p => p.wordLength <= 4);
            if (shortWords.length > 0) {
                shortWords.sort((a, b) => a.score - b.score);
                const bottomPlays = shortWords.slice(0, Math.min(10, shortWords.length));
                selectedPlay = bottomPlays[Math.floor(Math.random() * bottomPlays.length)];
            } else {
                allPlays.sort((a, b) => a.score - b.score);
                selectedPlay = allPlays[0];
            }
        } 
        else if (this.difficulty === 'medium') {
            const mediumWords = allPlays.filter(p => p.wordLength >= 4 && p.wordLength <= 7);
            if (mediumWords.length > 0) {
                mediumWords.sort((a, b) => a.score - b.score);
                const midStart = Math.floor(mediumWords.length * 0.3);
                const midEnd = Math.floor(mediumWords.length * 0.7);
                const midPlays = mediumWords.slice(midStart, midEnd);
                if (midPlays.length > 0) {
                    selectedPlay = midPlays[Math.floor(Math.random() * midPlays.length)];
                } else {
                    selectedPlay = mediumWords[Math.floor(mediumWords.length / 2)];
                }
            } else {
                allPlays.sort((a, b) => a.score - b.score);
                selectedPlay = allPlays[Math.floor(allPlays.length / 2)];
            }
        } 
        else { // hard
            for (const play of allPlays) {
                play.combinedScore = (play.score * 2) + (play.wordLength * 3);
                if (play.tilesUsed === 7) play.combinedScore += 20;
            }

            allPlays.sort((a, b) => b.combinedScore - a.combinedScore);
            const topPlays = allPlays.slice(0, Math.min(5, allPlays.length));
            selectedPlay = topPlays[Math.floor(Math.random() * topPlays.length)];
        }

        console.log(`🤖 Bot selected: ${selectedPlay.word} (${allPlays.length} possible plays)`);
        return selectedPlay;
    }

    placeWord(word, startRow, startCol, direction, playerRack) {
        const letters = word.split('');
        const placements = [];
        let touchesExisting = false;
        let usesCenter = false;

        const isEmpty = this.board.every(row => row.every(cell => cell === null));

        const endRow = direction === 'H' ? startRow : startRow + letters.length - 1;
        const endCol = direction === 'H' ? startCol + letters.length - 1 : startCol;

        if (endRow >= BOARD_SIZE || endCol >= BOARD_SIZE || startRow < 0 || startCol < 0) {
            return { error: '❌ Not enough space! Word goes out of bounds.' };
        }

        // Check if we can form this word with our rack
        const rackCopy = [...playerRack];
        for (let i = 0; i < letters.length; i++) {
            const row = direction === 'H' ? startRow : startRow + i;
            const col = direction === 'H' ? startCol + i : startCol;

            if (this.board[row][col] === null) {
                const letterUpper = letters[i].toUpperCase();
                const idx = rackCopy.indexOf(letterUpper);
                if (idx !== -1) {
                    rackCopy.splice(idx, 1);
                } else if (rackCopy.includes('*')) {
                    rackCopy.splice(rackCopy.indexOf('*'), 1);
                } else {
                    return { error: `❌ You don't have the letter: ${letters[i]}` };
                }
                placements.push({ row, col, letter: letters[i] });
                if (row === 7 && col === 7) usesCenter = true;
            } else if (this.board[row][col].toUpperCase() !== letters[i].toUpperCase()) {
                return { error: `❌ Cannot place "${letters[i]}" at position ${String.fromCharCode(65 + col)}${row + 1} - "${this.board[row][col]}" is already there!` };
            } else {
                touchesExisting = true;
            }
        }

        if (isEmpty && !usesCenter) {
            return { error: '❌ First word must use the center star (★ at H8)!' };
        }

        if (!isEmpty && !touchesExisting && !this.touchesExistingTile(placements)) {
            return { error: '❌ Word must connect to existing tiles on the board!' };
        }

        if (placements.length === 0) {
            return { error: '❌ You must place at least one new tile!' };
        }

        // Check if the main word extends into existing letters
        let fullMainWord = word;
        let mainWordStartRow = startRow;
        let mainWordStartCol = startCol;

        if (direction === 'H') {
            let beforeCol = startCol - 1;
            while (beforeCol >= 0 && this.board[startRow][beforeCol] !== null) {
                fullMainWord = this.board[startRow][beforeCol] + fullMainWord;
                mainWordStartCol = beforeCol;
                beforeCol--;
            }

            let afterCol = endCol + 1;
            while (afterCol < BOARD_SIZE && this.board[startRow][afterCol] !== null) {
                fullMainWord = fullMainWord + this.board[startRow][afterCol];
                afterCol++;
            }
        } else {
            let beforeRow = startRow - 1;
            while (beforeRow >= 0 && this.board[beforeRow][startCol] !== null) {
                fullMainWord = this.board[beforeRow][startCol] + fullMainWord;
                mainWordStartRow = beforeRow;
                beforeRow--;
            }

            let afterRow = endRow + 1;
            while (afterRow < BOARD_SIZE && this.board[afterRow][startCol] !== null) {
                fullMainWord = fullMainWord + this.board[afterRow][startCol];
                afterRow++;
            }
        }

        // Validate the FULL main word
        if (fullMainWord.length > 1 && !this.isValidWord(fullMainWord)) {
            return { error: `❌ "${fullMainWord}" is not a valid word in the dictionary!` };
        }

        // Temporarily place tiles
        const tempPlacements = [];
        for (const p of placements) {
            tempPlacements.push({ row: p.row, col: p.col, previous: this.board[p.row][p.col] });
            this.board[p.row][p.col] = p.letter.toUpperCase();
        }

        // Check perpendicular words (cross-words)
        const perpendicularWords = this.getPerpendicularWords(placements, direction);

        // Log perpendicular words for debugging
        if (perpendicularWords.length > 0) {
           // console.log(`🔍 Perpendicular words found: ${perpendicularWords.map(p => p.word).join(', ')}`);
        }

        // Validate ALL perpendicular words
        for (const perpWord of perpendicularWords) {
            if (perpWord.word.length > 1 && !this.isValidWord(perpWord.word)) {
                // Remove temporary tiles
                for (const temp of tempPlacements) {
                    this.board[temp.row][temp.col] = temp.previous;
                }
                return { error: `❌ Your placement creates invalid cross-word: "${perpWord.word}" at ${String.fromCharCode(65 + perpWord.col)}${perpWord.row + 1}` };
            }
        }

        // Remove temporary tiles
        for (const temp of tempPlacements) {
            this.board[temp.row][temp.col] = temp.previous;
        }

        // Calculate score
        let totalScore = 0;
        let mainWordScore = 0;
        let wordMultiplier = 1;

        // Score the main word
        for (let i = 0; i < letters.length; i++) {
            const row = direction === 'H' ? startRow : startRow + i;
            const col = direction === 'H' ? startCol + i : startCol;

            const letterUpper = letters[i].toUpperCase();
            let letterScore = this.letterBagConfig[letterUpper] ? this.letterBagConfig[letterUpper].points : 0;
            const isNewTile = placements.some(p => p.row === row && p.col === col);

            if (isNewTile) {
                const type = this.getCellType(row, col);
                if (type === 'tl') letterScore *= 3;
                if (type === 'dl') letterScore *= 2;
                if (type === 'tw') wordMultiplier *= 3;
                if (type === 'dw') wordMultiplier *= 2;
            }

            mainWordScore += letterScore;
        }

        totalScore += mainWordScore * wordMultiplier;

        // Add perpendicular word scores
        for (const perpWord of perpendicularWords) {
            if (perpWord.word.length > 1) {
                totalScore += perpWord.score;
            }
        }

        // Bingo bonus
        if (placements.length === 7) totalScore += 50;

        return { 
            placements, 
            score: totalScore, 
            perpendicularWords 
        };
    }

    getPerpendicularWords(placements, mainDirection) {
        const perpendicularWords = [];

        for (const placement of placements) {
            const { row, col, letter } = placement;
            const perpDirection = mainDirection === 'H' ? 'V' : 'H';

            let word = letter.toUpperCase();
            let startRow = row;
            let startCol = col;

            const letterUpper = letter.toUpperCase();
            let perpWordScore = this.letterBagConfig[letterUpper] ? this.letterBagConfig[letterUpper].points : 0;
            let perpMultiplier = 1;

            const type = this.getCellType(row, col);
            if (type === 'tl') perpWordScore *= 3;
            if (type === 'dl') perpWordScore *= 2;
            if (type === 'tw') perpMultiplier *= 3;
            if (type === 'dw') perpMultiplier *= 2;

            if (perpDirection === 'V') {
                let r = row - 1;
                while (r >= 0 && this.board[r][col] !== null) {
                    const boardLetter = this.board[r][col].toUpperCase();
                    word = this.board[r][col].toUpperCase() + word;
                    perpWordScore += this.letterBagConfig[boardLetter] ? this.letterBagConfig[boardLetter].points : 0;
                    startRow = r;
                    r--;
                }

                r = row + 1;
                while (r < BOARD_SIZE && this.board[r][col] !== null) {
                    const boardLetter = this.board[r][col].toUpperCase();
                    word = word + this.board[r][col].toUpperCase();
                    perpWordScore += this.letterBagConfig[boardLetter] ? this.letterBagConfig[boardLetter].points : 0;
                    r++;
                }
            } else {
                let c = col - 1;
                while (c >= 0 && this.board[row][c] !== null) {
                    const boardLetter = this.board[row][c].toUpperCase();
                    word = this.board[row][c].toUpperCase() + word;
                    perpWordScore += this.letterBagConfig[boardLetter] ? this.letterBagConfig[boardLetter].points : 0;
                    startCol = c;
                    c--;
                }

                c = col + 1;
                while (c < BOARD_SIZE && this.board[row][c] !== null) {
                    const boardLetter = this.board[row][c].toUpperCase();
                    word = word + this.board[row][c].toUpperCase();
                    perpWordScore += this.letterBagConfig[boardLetter] ? this.letterBagConfig[boardLetter].points : 0;
                    c++;
                }
            }

            if (word.length > 1) {
                perpendicularWords.push({
                    word,
                    row: startRow,
                    col: startCol,
                    score: perpWordScore * perpMultiplier
                });
            }
        }

        return perpendicularWords;
    }

    touchesExistingTile(placements) {
        for (const p of placements) {
            const adjacent = [
                [p.row - 1, p.col],
                [p.row + 1, p.col],
                [p.row, p.col - 1],
                [p.row, p.col + 1]
            ];

            for (const [r, c] of adjacent) {
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (this.board[r][c] !== null) return true;
                }
            }
        }
        return false;
    }

    executePlay(result, player, word) {
        // Reset pass count on a successful play
        this.passCount = 0;

        for (const placement of result.placements) {
            this.board[placement.row][placement.col] = placement.letter.toUpperCase();
            const idx = player.rack.indexOf(placement.letter.toUpperCase());
            if (idx !== -1) {
                player.rack.splice(idx, 1);
            } else {
                const jokerIdx = player.rack.indexOf('*');
                if (jokerIdx !== -1) {
                    player.rack.splice(jokerIdx, 1);
                }
            }
        }
        player.score += result.score;
        player.totalPlays++;
        this.fillRack(player);

        const pos = `${String.fromCharCode(65 + result.placements[0].col)}${result.placements[0].row + 1}`;
        this.playLog.push({
            turn: this.turnNumber,
            player: player.name,
            word: word,
            position: pos,
            score: result.score,
            totalScore: player.score,
            wordLength: word.length
        });
    }

    exchangeTiles(player, tilesToExchange) {
        if (this.letterBag.length < tilesToExchange.length) return false;

        const newTiles = [];
        for (let i = 0; i < tilesToExchange.length; i++) {
            const tile = tilesToExchange[i];
            const idx = player.rack.indexOf(tile);
            if (idx === -1) return false;

            player.rack.splice(idx, 1);
            this.letterBag.unshift(tile);
            newTiles.push(this.letterBag.pop());
        }

        player.rack.push(...newTiles);
        this.letterBag = this.shuffle(this.letterBag);

        this.playLog.push({
            turn: this.turnNumber,
            player: player.name,
            word: '[EXCHANGE]',
            position: '-',
            score: 0,
            totalScore: player.score,
            wordLength: 0
        });

        // Exchanging tiles counts as a "pass" for game end logic
        this.passCount++;
        return true;
    }

    isGameOver() {
        if (this.letterBag.length === 0) {
            if (this.players.some(p => p.rack.length === 0)) return true;
        }

        // Game ends if every player passes twice in a row
        if (this.passCount >= this.players.length * 2) return true;

        return false;
    }

    getRackPoints(rack) {
        let points = 0;
        for (const letter of rack) {
            points += this.letterBagConfig[letter] ? this.letterBagConfig[letter].points : 0;
        }
        return points;
    }

    endGameTally() {
        const tallyLog = [];

        // Only apply tally if bag is empty and someone emptied their rack
        if (this.letterBag.length > 0) {
            tallyLog.push('The bag was not emptied.');
            return tallyLog;
        }

        const rackEmptier = this.players.find(p => p.rack.length === 0);

        if (!rackEmptier) {
            tallyLog.push('No one emptied their rack.');
            return tallyLog;
        }

        let totalPointsGained = 0;
        for (const player of this.players) {
            if (player.id !== rackEmptier.id) {
                const rackValue = this.getRackPoints(player.rack);
                player.score -= rackValue;
                totalPointsGained += rackValue;
                tallyLog.push(`${player.name} loses ${rackValue} points (remaining letters).`);
            }
        }

        if (totalPointsGained > 0) {
            rackEmptier.score += totalPointsGained;
            tallyLog.push(`${rackEmptier.name} wins ${totalPointsGained} points (no letters left).`);
        }

        return tallyLog;
    }

    getWinner() {
        return this.players.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
    }
}

async function handleCheckCommand(interaction) {
    // 1. Déferrer la réponse immédiatement. Ceci informe Discord que le bot travaille.
    await interaction.deferReply({ ephemeral: false }); 

    // Récupérer la langue et le mot
    const language = interaction.options.getString('language');
    const rawWord = interaction.options.getString('word').toUpperCase();

    // 2. Vérification du dictionnaire
    const dictionary = DICTIONARIES.get(language);

    if (!dictionary || dictionary.size === 0) {
        // Utiliser editReply car l'interaction a déjà été déferrée
        return interaction.editReply({
            content: `❌ Dictionary not loaded for **${language.toUpperCase()}**. Contact the bot owner.`,
        });
    }

    // 3. Normalisation et vérification
    const word = normalizeWord(rawWord).trim(); 
    const exists = dictionary.has(word);

    let responseEmbed;

    if (exists) {
        responseEmbed = new EmbedBuilder()
            .setColor(0x2ECC71) // Vert
            .setTitle(`✅ Word Found : ${rawWord}`)
            .setDescription(`The word **${rawWord}** is valid in the **${language.toUpperCase()}** Scrabble dictionary.`)
            .setFooter({ text: `Checked ${dictionary.size} words.` });
    } else {
        responseEmbed = new EmbedBuilder()
            .setColor(0xE74C3C) // Rouge
            .setTitle(`❌ Word not Found : ${rawWord}`)
            .setDescription(`The word **${rawWord}** is **NOT** in the **${language.toUpperCase()}** Scrabble dictionary.`)
            .setFooter({ text: `Checked ${dictionary.size} words.` });
    }

    // 4. Envoyer la réponse finale avec editReply
    return interaction.editReply({ embeds: [responseEmbed] });
}

async function handlePingCommand(interaction) {
    // 1. Send an initial reply and fetch the message object
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });

    // 2. Calculate the latency between the interaction creation and Discord's reply
    const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;

    // 3. Get the WebSocket latency (Bot connection)
    const wsLatency = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
        .setColor(0x3498DB) // Blue
        .setTitle('🏓 Pong!')
        .setDescription('Discord API and Bot Latency.')
        .addFields(
            { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
            { name: 'WebSocket Latency (Bot)', value: `${wsLatency}ms`, inline: true }
        )
        .setFooter({ text: 'The lower the value, the better the performance!' });

    // 4. Edit the initial reply with the results
    await interaction.editReply({ embeds: [embed], content: null, ephemeral: true });
}


client.on('ready', () => {
    client.user.setPresence({
        activities: [{ name: `Scrabble | /scrabble help`, type: ActivityType.Playing }],
        status: 'online',
    });
    console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        await handleCommand(interaction);
    } else if (interaction.isButton()) {
        await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
        await handleModal(interaction);
    } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
    }
});

async function handleCommand(interaction) {
    if (interaction.commandName === 'scrabble') {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'help') {
            const embed = createHelpEmbed();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'rules') {
            const embed = createRulesEmbed();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'check') {
            return handleCheckCommand(interaction);
        }

        if (subcommand === 'ping') { // <-- ADD THIS BLOCK
            return handlePingCommand(interaction);
        }

        if (subcommand === 'score') { // <-- ADD THIS BLOCK
            return handleScoreCommand(interaction);
        }

        if (subcommand === 'vsbot') {
            if (games.has(interaction.channelId)) {
                return interaction.reply({ content: '❌ A game is already in progress in this channel!', ephemeral: true });
            }

            const difficulty = interaction.options.getString('difficulty');
            const language = interaction.options.getString('language');
            const game = new ScrabbleGame(interaction.channelId, 'bot', interaction.user, language, difficulty);
            games.set(interaction.channelId, game);

            await sendGameMessage(interaction.channel, game);
            await interaction.reply({ content: `✅ Game started against bot (${difficulty} difficulty, lang: ${language})!`, ephemeral: true });
        }

        if (subcommand === 'challenge') {
            if (games.has(interaction.channelId)) {
                return interaction.reply({ content: '❌ A game is already in progress!', ephemeral: true });
            }

            

            const opponent = interaction.options.getUser('player');
            const language = interaction.options.getString('language');

            if (opponent.id === interaction.user.id) {
                return interaction.reply({ content: '❌ You cannot challenge yourself!', ephemeral: true });
            }
            if (opponent.bot) {
                return interaction.reply({ content: '❌ You cannot challenge a bot! Use /scrabble vsbot', ephemeral: true });
            }

            const inviteId = `${interaction.channelId}-${Date.now()}`;
            pendingInvites.set(inviteId, {
                challenger: interaction.user,
                opponent: opponent,
                channelId: interaction.channelId,
                language: language,
                timestamp: Date.now()
            });

            const embed = new EmbedBuilder()
                .setTitle('🎮 Scrabble Challenge')
                .setDescription(`${interaction.user} challenges ${opponent} to a Scrabble game!`)
                .addFields({ name: 'Langue', value: language.toUpperCase(), inline: true })
                .setColor('#00ff00');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`accept_${inviteId}`)
                        .setLabel('Accept')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId(`decline_${inviteId}`)
                        .setLabel('Decline')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            await interaction.reply({ content: `${opponent}`, embeds: [embed], components: [row] });

            setTimeout(() => {
                if (pendingInvites.has(inviteId)) {
                    pendingInvites.delete(inviteId);
                }
            }, 60000);
        }

        if (subcommand === 'end') {
            if (!games.has(interaction.channelId)) {
                return interaction.reply({ content: '❌ No game in progress!', ephemeral: true });
            }

            const game = games.get(interaction.channelId);
            // End game manually
            await showEndGameStats(interaction.channel, game, true); // true = manual end
            games.delete(interaction.channelId);

            await interaction.reply({ content: '✅ Game ended manually.' });
        }
    }
}

async function handleButton(interaction) {
    const game = games.get(interaction.channelId);

    if (interaction.customId.startsWith('accept_') || interaction.customId.startsWith('decline_')) {
        const inviteId = interaction.customId.split('_')[1];
        const invite = pendingInvites.get(inviteId);

        if (!invite) {
            return interaction.update({ content: '❌ Invitation expired!', embeds: [], components: [] });
        }

        if (interaction.user.id !== invite.opponent.id) {
            return interaction.reply({ content: '❌ This invitation is not for you!', ephemeral: true });
        }

        if (interaction.customId.startsWith('accept_')) {
            const newGame = new ScrabbleGame(invite.channelId, 'pvp', invite.challenger, invite.language, null, invite.opponent);
            games.set(invite.channelId, newGame);

            await interaction.update({ content: '✅ Challenge accepted! Game starting...', embeds: [], components: [] });
            await sendGameMessage(interaction.channel, newGame);
        } else {
            await interaction.update({ content: '❌ Challenge declined.', embeds: [], components: [] });
        }

        pendingInvites.delete(inviteId);
        return;
    }

    if (!game) return interaction.reply({ content: '❌ No game in progress!', ephemeral: true });

    if (interaction.customId === 'play_word') {
        const currentPlayer = game.getCurrentPlayer();
        if (currentPlayer.isBot) {
            return interaction.reply({ content: '❌ It\'s the bot\'s turn!', ephemeral: true });
        }
        if (currentPlayer.id !== interaction.user.id) {
            return interaction.reply({ content: `❌ It's not your turn! It's ${currentPlayer.name}'s turn.`, ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('word_modal')
            .setTitle('Place a word');

        const wordInput = new TextInputBuilder()
            .setCustomId('word')
            .setLabel('Word to place')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const positionInput = new TextInputBuilder()
            .setCustomId('position')
            .setLabel('Position (e.g., H8 or 8H)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const directionInput = new TextInputBuilder()
            .setCustomId('direction')
            .setLabel('Direction (H=horizontal, V=vertical)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(1)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(wordInput),
            new ActionRowBuilder().addComponents(positionInput),
            new ActionRowBuilder().addComponents(directionInput)
        );

        await interaction.showModal(modal);
    }

    if (interaction.customId === 'pass_turn') {
        const currentPlayer = game.getCurrentPlayer();
        if (currentPlayer.isBot) {
            return interaction.reply({ content: '❌ It\'s the bot\'s turn!', ephemeral: true });
        }
        if (currentPlayer.id !== interaction.user.id) {
            return interaction.reply({ content: '❌ It\'s not your turn!', ephemeral: true });
        }

        game.passCount++;
        game.playLog.push({
            turn: game.turnNumber,
            player: currentPlayer.name,
            word: '[PASS]',
            position: '-',
            score: 0,
            totalScore: currentPlayer.score,
            wordLength: 0
        });

        game.nextTurn();

        // Check for game over AFTER passing
        if (game.isGameOver()) {
            await updateGameMessage(interaction.channel, game);
            await showEndGameStats(interaction.channel, game);
            games.delete(interaction.channelId);
            await interaction.reply({ content: '⏭️ Turn passed! Game is over.', ephemeral: true });
            return;
        }

        await updateGameMessage(interaction.channel, game);
        await interaction.reply({ content: '⏭️ Turn passed!', ephemeral: true });

        if (game.getCurrentPlayer().isBot) {
            setTimeout(() => playBotTurn(interaction.channel, game), 2000);
        }
    }

    if (interaction.customId === 'show_rack') {
        const player = game.players.find(p => p.id === interaction.user.id);
        if (!player) {
            return interaction.reply({ content: '❌ You are not in this game!', ephemeral: true });
        }

        const rackDisplay = player.rack.join(' ');
        await interaction.reply({ 
            content: `🎴 Your rack: **${rackDisplay}**\nLetters remaining in bag: ${game.letterBag.length}`, 
            ephemeral: true 
        });
    }

    if (interaction.customId === 'show_remaining') {
        const remaining = game.getRemainingLetters();
        let display = '📊 **Remaining Letters:**\n```\n';

        for (const [letter, count] of Object.entries(remaining).sort()) {
            if (count > 0) {
                display += `${letter}: ${'█'.repeat(count)} (${count})\n`;
            }
        }

        display += '```';
        await interaction.reply({ content: display, ephemeral: true });
    }

    if (interaction.customId === 'show_log') {
        if (game.playLog.length === 0) {
            return interaction.reply({ content: '📋 No plays yet!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Game Log')
            .setColor('#0099ff');

        const recentPlays = game.playLog.slice(-10).reverse();
        let logText = '```\n';
        logText += 'Turn | Player      | Word        | Pos  | Score\n';
        logText += '-----+-------------+-------------+------+------\n';

        for (const play of recentPlays) {
            logText += `${play.turn.toString().padStart(4)} | `;
            logText += `${play.player.substring(0, 11).padEnd(11)} | `;
            logText += `${play.word.substring(0, 11).padEnd(11)} | `;
            logText += `${play.position.padEnd(4)} | `;
            logText += `+${play.score}\n`;
        }

        logText += '```';
        embed.setDescription(logText);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === 'exchange_tiles') {
        const currentPlayer = game.getCurrentPlayer();
        if (currentPlayer.isBot) {
            return interaction.reply({ content: '❌ It\'s the bot\'s turn!', ephemeral: true });
        }
        if (currentPlayer.id !== interaction.user.id) {
            return interaction.reply({ content: '❌ It\'s not your turn!', ephemeral: true });
        }

        if (game.letterBag.length < 7) {
            return interaction.reply({ content: '❌ Not enough tiles in the bag to exchange!', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('exchange_modal')
            .setTitle('Exchange Tiles');

        const tilesInput = new TextInputBuilder()
            .setCustomId('tiles')
            .setLabel('Tiles to exchange (e.g., A B C)')
            .setPlaceholder(`Your rack: ${currentPlayer.rack.join(' ')}`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(tilesInput));
        await interaction.showModal(modal);
    }

    if (interaction.customId === 'how_to_play') {
        const embed = createHowToPlayEmbed();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

async function handleModal(interaction) {
    const game = games.get(interaction.channelId);
    if (!game) return;

    if (interaction.customId === 'word_modal') {
        const word = interaction.fields.getTextInputValue('word').toUpperCase();
        const position = interaction.fields.getTextInputValue('position').toUpperCase();
        const direction = interaction.fields.getTextInputValue('direction').toUpperCase();

        const match = position.match(/([A-O]?)(\d+)([A-O]?)/);
        if (!match) {
            return interaction.reply({ content: '❌ Invalid position! Format: H8 or 8H', ephemeral: true });
        }

        let col = match[1] ? match[1].charCodeAt(0) - 65 : (match[3] ? match[3].charCodeAt(0) - 65 : -1);
        let row = parseInt(match[2]) - 1;

        if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
            return interaction.reply({ content: '❌ Position out of bounds!', ephemeral: true });
        }

        if (direction !== 'H' && direction !== 'V') {
            return interaction.reply({ content: '❌ Invalid direction! Use H or V.', ephemeral: true });
        }

        const currentPlayer = game.getCurrentPlayer();
        const result = game.placeWord(word, row, col, direction, currentPlayer.rack);

        if (!result || result.error) {
            return interaction.reply({ 
                content: result?.error || '❌ Invalid placement! Check that:\n• You have the required letters\n• The word is valid\n• It connects to existing tiles\n• First word uses center star\n• All formed words are valid', 
                ephemeral: true 
            });
        }

        game.executePlay(result, currentPlayer, word);
        game.nextTurn();

        // Check for game over
        if (game.isGameOver()) {
            await updateGameMessage(interaction.channel, game);
            await showEndGameStats(interaction.channel, game);
            games.delete(interaction.channelId);
            return;
        }

        await updateGameMessage(interaction.channel, game);

        let responseMsg = `✅ **${word}** placed! +${result.score} points!`;

        const allAdditionalWords = [];

        if (result.perpendicularWords && result.perpendicularWords.length > 0) {
            for (const pw of result.perpendicularWords) {
                if (pw.word.length > 1) {
                    allAdditionalWords.push(`${pw.word} (+${pw.score})`);
                }
            }
        }

        if (allAdditionalWords.length > 0) {
            responseMsg += '\n\n**Additional words formed:**';
            for (const wordInfo of allAdditionalWords) {
                responseMsg += `\n• ${wordInfo}`;
            }
        }

        await interaction.reply({ content: responseMsg, ephemeral: false });


        if (game.getCurrentPlayer().isBot) {
            setTimeout(() => playBotTurn(interaction.channel, game), 2000);
        }
    }

    if (interaction.customId === 'exchange_modal') {
        const tilesStr = interaction.fields.getTextInputValue('tiles').toUpperCase();
        const tiles = tilesStr.split(/\s+/).filter(t => t.length > 0);

        const currentPlayer = game.getCurrentPlayer();

        for (const tile of tiles) {
            if (!currentPlayer.rack.includes(tile)) {
                return interaction.reply({ content: `❌ You don't have the tile: ${tile}`, ephemeral: true });
            }
        }

        if (game.exchangeTiles(currentPlayer, tiles)) {
            game.nextTurn();

            // Check for game over
            if (game.isGameOver()) {
                await updateGameMessage(interaction.channel, game);
                await showEndGameStats(interaction.channel, game);
                games.delete(interaction.channelId);
                await interaction.reply({ content: `✅ Exchanged ${tiles.length} tile(s)! Game is over.`, ephemeral: true });
                return;
            }

            await updateGameMessage(interaction.channel, game);
            await interaction.reply({ content: `✅ Exchanged ${tiles.length} tile(s)!`, ephemeral: true });

            if (game.getCurrentPlayer().isBot) {
                setTimeout(() => playBotTurn(interaction.channel, game), 2000);
            }
        } else {
            await interaction.reply({ content: '❌ Failed to exchange tiles!', ephemeral: true });
        }
    }
}

async function handleSelectMenu(interaction) {
    // For future features
}

async function playBotTurn(channel, game) {
    if (game.isGameOver()) {
        await showEndGameStats(channel, game);
        games.delete(channel.id);
        return;
    }

    const botPlay = game.getBotPlay();

    if (!botPlay) {
        game.passCount++;
        game.playLog.push({
            turn: game.turnNumber,
            player: '🤖 Bot',
            word: '[PASS]',
            position: '-',
            score: 0,
            totalScore: game.getCurrentPlayer().score,
            wordLength: 0
        });

        game.nextTurn();

        // Check for game over
        if (game.isGameOver()) {
            await updateGameMessage(channel, game);
            await channel.send(`🤖 Bot has no valid plays and passes its turn.`);
            await showEndGameStats(channel, game);
            games.delete(channel.id);
            return;
        }

        await updateGameMessage(channel, game);
        await channel.send(`🤖 Bot has no valid plays and passes its turn.`);

        return;
    }

    const botPlayer = game.getCurrentPlayer();
    game.executePlay(botPlay.result, botPlayer, botPlay.word);
    game.nextTurn();

    // Check for game over
    if (game.isGameOver()) {
        await updateGameMessage(channel, game);
        await showEndGameStats(channel, game);
        games.delete(channel.id);
        return;
    }


    await updateGameMessage(channel, game);

    let botMessage = `🤖 Bot plays **${botPlay.word}** at ${String.fromCharCode(65 + botPlay.col)}${botPlay.row + 1} (${botPlay.direction}) for **${botPlay.score}** points!`;

    const allAdditionalWords = [];

    if (botPlay.result.perpendicularWords && botPlay.result.perpendicularWords.length > 0) {
        for (const pw of botPlay.result.perpendicularWords) {
            if (pw.word.length > 1) {
                allAdditionalWords.push(`${pw.word} (+${pw.score})`);
            }
        }
    }

    if (allAdditionalWords.length > 0) {
        botMessage += '\n**Additional words:** ' + allAdditionalWords.join(', ');
    }

    await channel.send(botMessage);
}

async function sendGameMessage(channel, game) {
    const embed = createGameEmbed(game);
    const buttons = createGameButtons(game);

    const message = await channel.send({ embeds: [embed], components: buttons });
    game.messageId = message.id;

    if (game.getCurrentPlayer().isBot) {
        setTimeout(() => playBotTurn(channel, game), 2000);
    }
}

async function updateGameMessage(channel, game) {
    if (!game.messageId) return;

    try {
        const message = await channel.messages.fetch(game.messageId);
        const embed = createGameEmbed(game);
        const buttons = createGameButtons(game);

        await message.edit({ embeds: [embed], components: buttons });
    } catch (error) {
        console.error('Error updating message:', error);
        // If message was deleted, stop trying to update
        if (error.code === 10008) { 
            games.delete(channel.id);
            console.log(`Game in channel ${channel.id} ended because message was deleted.`);
        }
    }
}

async function showEndGameStats(channel, game, manualEnd = false) {
    let tallyResults = [];
    if (!manualEnd) {
        tallyResults = game.endGameTally();
    } else {
        tallyResults.push('Game over after 2 turns passes.');
    }

    const winner = game.getWinner();

    const embed = new EmbedBuilder()
        .setTitle('🏁 Game ended ! 🏁')
        .setDescription(`The winner is **${winner.name}** with **${winner.score}** points !`)
        .setColor('#ff9900');

    // Final Scores
    const scoreText = game.players.map(p => `${p.name}: **${p.score}** pts`).join('\n');
    embed.addFields({ name: '📊 Final Scores', value: scoreText, inline: false });

    // Tally
    embed.addFields({ name: '💰  Tally Results', value: tallyResults.join('\n'), inline: false });

    // Stats
    const validPlays = game.playLog.filter(p => p.score > 0 || p.word === '[BINGO]');
    let bestPlay = { score: 0, word: 'N/A', player: 'N/A' };
    let longestWord = { wordLength: 0, word: 'N/A', player: 'N/A' };

    if (validPlays.length > 0) {
        bestPlay = validPlays.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
        longestWord = validPlays.reduce((prev, curr) => prev.wordLength > curr.wordLength ? prev : curr);
    }

    embed.addFields({
        name: '🏆 Game Records',
        value: `**Best play:** ${bestPlay.player} with **${bestPlay.word}** (${bestPlay.score} pts)\n**Longest word:** ${longestWord.player} with **${longestWord.word}** (${longestWord.wordLength} letters)`,
        inline: false
    });

    // Player stats
    const playerStats = game.players.map(p => {
        return `**${p.name}**\n• Total plays: ${p.totalPlays}`;
    }).join('\n\n');
    embed.addFields({ name: '📈 Player Stats', value: playerStats, inline: false });

    await channel.send({ embeds: [embed] });

    // Try to disable buttons on the original message
    if (game.messageId) {
        try {
            const message = await channel.messages.fetch(game.messageId);
            const embed = createGameEmbed(game);

            // Disable all buttons
            const disabledButtons = createGameButtons(game).map(row => {
                row.components.forEach(button => button.setDisabled(true));
                return row;
            });

            await message.edit({ embeds: [embed], components: disabledButtons });
        } catch (error) {
            console.error('Could not disable buttons on final message:', error);
        }
    }
}


function createGameEmbed(game) {
    const currentPlayer = game.getCurrentPlayer();

    const embed = new EmbedBuilder()
        .setTitle('🎮 Scrabble Game')
        .setColor('#00ff00')
        .setDescription(`**${currentPlayer.name}'s turn** 🎯\n\n${game.generateBoardDisplay()}`);

    embed.addFields(
        {
            name: '📊 Scores',
            value: game.players.map(p => `${p.name}: **${p.score}** pts`).join('\n'),
            inline: true
        },
        {
            name: '🎴 Info',
            value: `Letters in bag: ${game.letterBag.length}\nTurn: ${game.turnNumber}\nLang: ${game.language.toUpperCase()}`,
            inline: true
        }
    );

    if (game.playLog.length > 0) {
        const lastPlay = game.playLog[game.playLog.length - 1];
        embed.addFields({
            name: '🔄 Last Play',
            value: `${lastPlay.player}: **${lastPlay.word}** (${lastPlay.position}) +${lastPlay.score}`,
            inline: false
        });
    }

    embed.setFooter({ text: '★=Center | ≡=Word×3 | =Word×2 | ‡=Letter×3 | † =Letter×2' });

    return embed;
}

function createGameButtons(game) {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('play_word')
                .setLabel('Place Word')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝'),
            new ButtonBuilder()
                .setCustomId('show_rack')
                .setLabel('My Rack')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎴'),
            new ButtonBuilder()
                .setCustomId('exchange_tiles')
                .setLabel('Exchange')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄'),
            new ButtonBuilder()
                .setCustomId('pass_turn')
                .setLabel('Pass')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⏭️')
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('show_remaining')
                .setLabel('Remaining Letters')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📊'),
            new ButtonBuilder()
                .setCustomId('show_log')
                .setLabel('Game Log')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setCustomId('how_to_play')
                .setLabel('How to Play')
                .setStyle(ButtonStyle.Success)
                .setEmoji('❓')
        );

    return [row1, row2];
}

function createHelpEmbed() {
    const embed = new EmbedBuilder()
        .setTitle('📚 Scrabble Bot - Help')
        .setColor('#0099ff')
        .setDescription('Welcome to Scrabble! Here are all available commands:')
        .addFields(
            {
                name: '🎮 Game Commands',
                value: '`/scrabble vsbot` - Start a game against a bot\n`/scrabble challenge @player` - Challenge another player\n`/scrabble end` - End the current game',
                inline: false
            },
            {
                name: '📖 Information Commands',
                value: '`/scrabble help` - Show this help menu\n`/scrabble rules` - View detailed game rules\n`/scrabble check` - Checks if a word exists in the given dictionary.\n`/scrabble score` - Calculate the base Scrabble score for a word.',
                inline: false
            },
            {
                name: '🌐 Language Options',
                value: 'When starting a game, you must now choose a language: `EN` (English), `FR` (Français), or `ES` (Español). This sets the dictionary and letter values.',
                inline: false
            },
            {
                name: '🎯 Bot Difficulties',
                value: '**Easy**: Plays short words (2-4 letters) with lower scores\n**Medium**: Plays medium words (4-7 letters) with balanced strategy\n**Hard**: Plays longest words possible with maximum scores',
                inline: false
            },
            {
                name: '🎲 In-Game Buttons',
                value: '**Place Word**: Open form to place a word on the board\n**My Rack**: View your current letters (private)\n**Exchange**: Trade tiles with the bag\n**Pass**: Skip your turn\n**Remaining Letters**: See what tiles are left\n**Game Log**: View history of all plays\n**How to Play**: Quick gameplay guide',
                inline: false
            },
            {
                name: '📝 Placing Words',
                value: 'Use coordinates like **H8** (column H, row 8)\nDirection: **H** for horizontal, **V** for vertical\nFirst word must use the center star ★',
                inline: false
            }
        )
        .setFooter({ text: 'Have fun playing Scrabble! 🎉' });

    return embed;
}

function createRulesEmbed() {
    const embed = new EmbedBuilder()
        .setTitle('📜 Official Scrabble Rules')
        .setColor('#ff9900')
        .setDescription('Learn how to play Scrabble!')
        .addFields(
            {
                name: '🎯 Objective',
                value: 'Score the most points by forming valid words on the board using letter tiles.',
                inline: false
            },
            {
                name: '🎴 Setup',
                value: '• Each player starts with 7 random letter tiles\n• First word must cross the center star (★)\n• All subsequent words must connect to existing words',
                inline: false
            },
            {
                name: '📊 Scoring',
                value: '• Each letter has a point value (A=1, Z=10, etc.)\n• **Letter×2** (†): Double the letter score\n• **Letter×3** (‡): Triple the letter score\n• **Word×2** (=): Double the entire word score\n• **Word×3** (≡): Triple the entire word score\n• Using all 7 tiles: **+50 bonus points**',
                inline: false
            },
            {
                name: '🎲 Taking Your Turn',
                value: 'You can:\n1. **Place a word** - Form a valid word on the board\n2. **Exchange tiles** - Trade any tiles with the bag (costs your turn)\n3. **Pass** - Skip your turn (no penalty)',
                inline: false
            },
            {
                name: '✅ Valid Plays',
                value: '• Words must be in the dictionary (no proper nouns)\n• Words must read left-to-right or top-to-bottom\n• All words formed must be valid (including cross-words and parallel words)\n• New words must connect to existing tiles',
                inline: false
            },
            {
                name: '🃏 Blank Tiles (*)',
                value: 'Blank tiles (jokers) can represent any letter but score 0 points.',
                inline: false
            },
            {
                name: '🏁 Game End',
                value: 'The game ends when:\n• The tile bag is empty AND a player uses all their tiles\n• All players pass twice in a row\n\n**Final Tally:** If the bag is empty, the player who finished all tiles gets the points from their opponent\'s rack. The opponent loses those points.',
                inline: false
            }
        )
        .setFooter({ text: 'Good luck and have fun! 🎮' });

    return embed;
}

function createHowToPlayEmbed() {
    const embed = new EmbedBuilder()
        .setTitle('❓ How to Play - Quick Guide')
        .setColor('#00ff00')
        .setDescription('Step-by-step guide for your turn:')
        .addFields(
            {
                name: '1️⃣ Check Your Rack',
                value: 'Click **"My Rack"** to see your 7 letter tiles (this is private, only you can see it)',
                inline: false
            },
            {
                name: '2️⃣ Plan Your Word',
                value: 'Look at the board and think of a word you can make with your letters. Remember:\n• First word must use the center star ★\n• Other words must connect to existing tiles\n• Try to use bonus squares (colored symbols)',
                inline: false
            },
            {
                name: '3️⃣ Place Your Word',
                value: 'Click **"Place Word"** and fill in:\n• **Word**: The word you want to play (e.g., HELLO)\n• **Position**: Where to start (e.g., H8 for column H, row 8)\n• **Direction**: H for horizontal, V for vertical',
                inline: false
            },
            {
                name: '📍 Understanding Coordinates',
                value: '• Columns are letters A-O (left to right)\n• Rows are numbers 1-15 (top to bottom)\n• Center is at H8 ★\n• Example: "H8" means column H, row 8\n• You can write "H8" or "8H" - both work!',
                inline: false
            },
            {
                name: '🔄 Other Actions',
                value: '**Exchange Tiles**: Trade unwanted tiles (uses your turn)\n**Pass Turn**: Skip if you can\'t play\n**Remaining Letters**: See what tiles are still in the bag\n**Game Log**: View all previous plays',
                inline: false
            },
            {
                name: '🎯 Bonus Squares',
                value: '★ = Center (start here!)\n≡ = Word×3 (triple word score)\n= = Word×2 (double word score)\n‡ = Letter×3 (triple letter score)\n† = Letter×2 (double letter score)',
                inline: false
            }
        )
        .setFooter({ text: 'You\'ll get the hang of it quickly! 🎮' });

    return embed;
}

const { REST, Routes } = require('discord.js');

const commands = [
    {
        name: 'scrabble',
        description: 'Scrabble game commands',
        options: [
            {
                name: 'vsbot',
                description: 'Start a game against a bot',
                type: 1,
                options: [
                    {
                        name: 'language',
                        description: 'Select the game language and dictionary',
                        type: 3,
                        required: true,
                        choices: [
                            { name: 'Français (French)', value: 'fr' },
                            { name: 'English (English)', value: 'en' },
                            { name: 'Español (Spanish)', value: 'es' }
                        ]
                    },
                    {
                        name: 'difficulty',
                        description: 'Bot difficulty level',
                        type: 3,
                        required: true,
                        choices: [
                            { name: 'Easy - Short words, lower scores', value: 'easy' },
                            { name: 'Medium - Balanced strategy', value: 'medium' },
                            { name: 'Hard - Long words, maximum scores', value: 'hard' }
                        ]
                    }
                ]
            },

            // --- NOUVELLE SOUS-COMMANDE: CHECK ---
            {
                name: 'check',
                description: 'Check if a word exists in the dictionary.',
                type: 1, // Subcommand type
                options: [
                    {
                        name: 'language',
                        description: 'The dictionary to check (fr, en, es).',
                        type: 3,
                        required: true,
                        choices: [
                            { name: 'Français (French)', value: 'fr' },
                            { name: 'English (English)', value: 'en' },
                            { name: 'Español (Spanish)', value: 'es' }
                        ]
                    },
                    {
                        name: 'word',
                        description: 'The word to verify.',
                        type: 3,
                        required: true
                    }
                ]
            },
            // ------------------------------------
            // --- NEW SUBCOMMAND: PING ---
            {
                name: 'ping',
                description: 'Check the bot\'s latency to Discord.',
                type: 1, // Subcommand type
            },
            //

            // --- NEW SUBCOMMAND: SCORE ---
            {
                name: 'score',
                description: 'Calculate the base Scrabble score for a word.',
                type: 1, // Subcommand type
                options: [
                    {
                        name: 'word',
                        description: 'The word you want to score (e.g., QUIZ).',
                        type: 3, // String
                        required: true
                    },
                    {
                        name: 'language',
                        description: 'Select the language for correct point values.',
                        type: 3, // String
                        required: true,
                        choices: [
                            { name: 'Français (French)', value: 'fr' },
                            { name: 'English (English)', value: 'en' },
                            { name: 'Español (Spanish)', value: 'es' }
                        ]
                    }
                ]
            },
            // ------------------------------------
            
            {
                name: 'challenge',
                description: 'Challenge another player',
                type: 1,
                options: [
                    {
                        name: 'player',
                        description: 'Player to challenge',
                        type: 6,
                        required: true
                    },
                    {
                        name: 'language',
                        description: 'Select the game language and dictionary',
                        type: 3,
                        required: true,
                        choices: [
                            { name: 'Français (French)', value: 'fr' },
                            { name: 'English (English)', value: 'en' },
                            { name: 'Español (Spanish)', value: 'es' }
                        ]
                    }
                ]
            },
            {
                name: 'end',
                description: 'End the current game',
                type: 1
            },
            {
                name: 'help',
                description: 'Show help menu',
                type: 1
            },
            {
                name: 'rules',
                description: 'View game rules',
                type: 1
            }
        ]
    }
];

const express = require('express')
const app = express()
const port = process.env.PORT || 4000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1295714784624513035'; // Assurez-vous que c'est le bon ID

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('🔄 Registering commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Commands registered!');
    } catch (error) {
        console.error(error);
    }
})();

client.login(TOKEN);
