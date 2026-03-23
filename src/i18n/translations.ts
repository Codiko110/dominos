export type Language = 'fr' | 'en';

export const translations: Record<Language, Record<string, string>> = {
  fr: {
    appName: 'Dominos',
    home: 'Accueil',
    game: 'Partie',
    result: 'Résultat',
    history: 'Historique',
    settings: 'Paramètres',

    partConfigTitle: 'Configurer la partie',
    numberOfPlayers: 'Nombre de joueurs',
    playerName: 'Nom du joueur',
    emptyAutoFill: '(vide -> auto)',
    targetScore: 'Score objectif',
    startGame: 'Démarrer la partie',

    playersTurn: 'Tour de :',
    nextPlayer: 'Joueur suivant',

    round: 'Manche',
    total: 'Total',
    rounds: 'Manches',
    addRound: 'Ajouter une manche',
    emptyRounds: 'Ajoute une manche pour commencer',

    addScore: 'Ajouter un score',
    add: 'Ajouter',
    correctScore: 'Modifier / corriger',
    update: 'Mettre à jour',

    progress: 'Progression',

    winner: 'Gagnant',
    winners: 'Gagnants',
    ranking: 'Classement',
    replay: 'Rejouer',
    backHome: 'Retour accueil',

    gameHistory: 'Historique des parties',
    delete: 'Supprimer',
    deleteAll: 'Supprimer tout',
    details: 'Détails',
    finalScore: 'Score final',
    cancel: 'Annuler',
    ok: 'OK',

    theme: 'Thème',
    light: 'Clair',
    dark: 'Sombre',
    language: 'Langue',
    english: 'Anglais',
    french: 'Français',

    settingsOfflineHelp: 'Tous les paramètres sont stockés hors ligne sur cet appareil.',

    validationNumber: 'Veuillez entrer un nombre valide.',
    validationNonNegative: 'Le score ne peut pas être négatif.',
    validationPlayers: 'Le nombre de joueurs doit être entre 2 et 4.',
  },
  en: {
    appName: 'Dominos',
    home: 'Home',
    game: 'Game',
    result: 'Result',
    history: 'History',
    settings: 'Settings',

    partConfigTitle: 'Configure the match',
    numberOfPlayers: 'Number of players',
    playerName: 'Player name',
    emptyAutoFill: '(empty -> auto)',
    targetScore: 'Target score',
    startGame: 'Start game',

    playersTurn: 'Turn of:',
    nextPlayer: 'Next player',

    round: 'Round',
    total: 'Total',
    rounds: 'Rounds',
    addRound: 'Add a round',
    emptyRounds: 'Add a round to start',

    addScore: 'Add a score',
    add: 'Add',
    correctScore: 'Modify / correct',
    update: 'Update',

    progress: 'Progress',

    winner: 'Winner',
    winners: 'Winners',
    ranking: 'Ranking',
    replay: 'Replay',
    backHome: 'Back home',

    gameHistory: 'Game history',
    delete: 'Delete',
    deleteAll: 'Delete all',
    details: 'Details',
    finalScore: 'Final score',
    cancel: 'Cancel',
    ok: 'OK',

    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    english: 'English',
    french: 'French',

    settingsOfflineHelp: 'All settings are stored offline on this device.',

    validationNumber: 'Please enter a valid number.',
    validationNonNegative: 'Score cannot be negative.',
    validationPlayers: 'Number of players must be between 2 and 4.',
  },
};

