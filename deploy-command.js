const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// Assurez-vous que vos variables d'environnement sont disponibles ici
const TOKEN = process.env.DISCORD_TOKEN; 
const CLIENT_ID = '1432417785916690563'; // Laissez votre ID client

// --- Définition des commandes ---
// NOTE: CE TABLEAU DOIT ÊTRE IDENTIQUE À CELUI DE VOTRE INDEX 5.JS
const commands = [
    {
        name: 'scrabble',
        description: 'Commandes du jeu Scrabble',
        options: [
            // vsbot subcommand
            {
                name: 'vsbot',
                description: 'Lance une partie contre un bot',
                type: 1, 
                options: [
                    {
                        name: 'language',
                        description: 'Sélectionnez la langue pour la partie.',
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
                        description: 'Niveau de difficulté du bot',
                        type: 3,
                        required: true,
                        choices: [
                            { name: 'Easy - Mots courts, scores bas', value: 'easy' },
                            { name: 'Medium - Stratégie équilibrée', value: 'medium' },
                            { name: 'Hard - Mots longs, scores maximum', value: 'hard' }
                        ]
                    }
                ]
            },
            
            // check subcommand
            {
                name: 'check',
                description: 'Vérifie si un mot existe dans le dictionnaire.',
                type: 1, 
                options: [
                    {
                        name: 'language',
                        description: 'Le dictionnaire à vérifier (fr, en, es).',
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
                        description: 'Le mot à vérifier.',
                        type: 3,
                        required: true
                    }
                ]
            },
            
            // ping subcommand
            {
                name: 'ping',
                description: 'Vérifie la latence du bot vers Discord.',
                type: 1, 
            },

            // score subcommand
            {
                name: 'score',
                description: 'Calcule le score de base Scrabble pour un mot.',
                type: 1, 
                options: [
                    {
                        name: 'word',
                        description: 'Le mot dont vous voulez calculer le score (ex: QUIZ).',
                        type: 3, 
                        required: true
                    },
                    {
                        name: 'language',
                        description: 'Sélectionnez la langue pour les valeurs de points correctes.',
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
                description: 'Affiche la définition du dictionnaire d\'un mot.',
                type: 1, 
                options: [
                    {
                        name: 'word',
                        description: 'Le mot à rechercher.',
                        type: 3, // String
                        required: true
                    },
                    {
                        name: 'language',
                        description: 'La langue/dictionnaire à utiliser pour le contexte.',
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
                description: 'Défie un autre joueur',
                type: 1,
                options: [
                    {
                        name: 'player',
                        description: 'Joueur à défier',
                        type: 6,
                        required: true
                    }
                ]
            },
            {
                name: 'end',
                description: 'Termine la partie en cours',
                type: 1
            },
            {
                name: 'help',
                description: 'Affiche le menu d\'aide',
                type: 1
            },
            {
                name: 'rules',
                description: 'Affiche les règles du jeu',
                type: 1
            }
        ]
    }
];
// --- Fin de la définition des commandes ---


const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('🔄 Tentative d\'enregistrement des commandes d\'application (/) GLOBALEMENT...');
        
        // CHANGEMENT CLÉ: Utilisation de Routes.applicationCommands (sans ID de guilde)
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log('✅ Commandes d\'application enregistrées avec succès GLOBALEMENT.');
        console.log('NOTE: L\'apparition des commandes sur tous les serveurs peut prendre jusqu\'à 1 heure.');
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement des commandes:', error);
    }
})();
