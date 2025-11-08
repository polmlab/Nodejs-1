const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// Ensure your environment variables are available here
const TOKEN = process.env.DISCORD_TOKEN; 
const CLIENT_ID = '1432417785916690563'; // Leave your Client ID

// --- Command Definitions ---
// NOTE: THIS ARRAY MUST BE IDENTICAL TO THE ONE IN YOUR INDEX 5.JS
const commands = [
    {
        name: 'scrabble',
        description: 'Scrabble game commands',
        options: [
            // vsbot subcommand
            {
                name: 'vsbot',
                description: 'Start a game against a bot',
                type: 1, 
                options: [
                    {
                        name: 'language',
                        description: 'Select the game language and dictionary.',
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
                            { name: 'Easy - Short words, low scores', value: 'easy' },
                            { name: 'Medium - Balanced strategy', value: 'medium' },
                            { name: 'Hard - Long words, maximum scores', value: 'hard' }
                        ]
                    }
                ]
            },
            
            // check subcommand
            {
                name: 'check',
                description: 'Check if a word exists in the dictionary.',
                type: 1, 
                options: [
                    {
                        name: 'language',
                        description: 'The dictionary to verify (fr, en, es).',
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
            
            // ping subcommand
            {
                name: 'ping',
                description: 'Check the bot\'s latency to Discord.',
                type: 1, 
            },

            // score subcommand
            {
                name: 'score',
                description: 'Calculate the base Scrabble score for a word.',
                type: 1, 
                options: [
                    {
                        name: 'word',
                        description: 'The word you want to calculate the score for (ex: QUIZ).',
                        type: 3, 
                        required: true
                    },
                    {
                        name: 'language',
                        description: 'Select the language for correct point values.',
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

            // lookup subcommand
            {
                name: 'lookup',
                description: 'Displays the dictionary definition of a word.',
                type: 1, 
                options: [
                    {
                        name: 'word',
                        description: 'The word to search for.',
                        type: 3, // String
                        required: true
                    },
                    {
                        name: 'language',
                        description: 'The language/dictionary to use for context.',
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

            // challenge subcommand
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
// --- End of Command Definitions ---


const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('🔄 Attempting to register application (/) commands GLOBALLY...');
        
        // Key Change: Using Routes.applicationCommands (without Guild ID)
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log('✅ Application commands registered successfully GLOBALLY.');
        console.log('NOTE: Commands may take up to 1 hour to appear on all servers.');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
