export interface StoryLevel {
    id: number;
    title: string;
    date: string;
    briefing: string[];
    mapType: string; // 'standard', 'dungeon', 'terrace', 'bridge'
    victoryCondition: {
        type: 'kill_count';
        value: number;
    };
    nextLevelId?: number;
    mapWidth?: number;
    mapHeight?: number;
    dialogueEvents?: {
        trigger: string; // 'start', 'kills:X', 'time:X', 'boss_spawn'
        text: string;
    }[];
}

export const STORY_LEVELS: StoryLevel[] = [
    {
        id: 1,
        title: "La Marcha Forzada",
        date: "3 de Febrero de 1813 - Madrugada",
        briefing: [
            "Tras una marcha forzada desde Buenos Aires, el Regimiento de Granaderos a Caballo llega al Convento de San Carlos Borromeo.",
            "El Coronel San Martín ordena ocultar a la tropa tras los muros del convento, aguardando el desembarco realista.",
            "El silencio es absoluto. La sorpresa es nuestra mayor arma.",
            "Objetivo: Asegura el perímetro del convento eliminando a los exploradores realistas."
        ],
        mapType: 'dungeon', // Represents the Convent interior/courtyard
        mapWidth: 48,
        mapHeight: 48,
        victoryCondition: { type: 'kill_count', value: 5 },
        nextLevelId: 2
    },
    {
        id: 2,
        title: "El Desembarco",
        date: "3 de Febrero de 1813 - Amanecer",
        briefing: [
            "Los buques realistas han echado anclas. Doscientos cincuenta infantes desembarcan y suben por las barrancas en busca de suministros.",
            "No saben que los estamos esperando.",
            "Objetivo: Rechaza la avanzada enemiga en las barrancas."
        ],
        mapType: 'bridge', // Represents the ravines/cliffs
        victoryCondition: { type: 'kill_count', value: 10 },
        nextLevelId: 3,
        dialogueEvents: [
            { trigger: 'start', text: "San Martín: ¡Bermúdez! ¡Tome el flanco izquierdo! ¡Yo iré por la derecha!" },
            { trigger: 'kills:5', text: "Soldado: ¡Vienen más por el río! ¡Fuego a discreción!" }
        ]
    },
    {
        id: 3,
        title: "¡A la Carga!",
        date: "3 de Febrero de 1813 - La Batalla",
        briefing: [
            "¡Suena el clarín! ¡A la carga, granaderos!",
            "Las dos columnas envuelven al enemigo en una maniobra de tenaza perfecta.",
            "El caballo de San Martín cae herido. El granadero Baigorria y el sargento Cabral corren a su rescate.",
            "Objetivo: ¡Derrota al Comandante Zabala y sus tropas de élite!"
        ],
        mapType: 'boss_terrace', // Boss Arena
        victoryCondition: { type: 'kill_count', value: 15 }, // Kill boss + minions
        dialogueEvents: [
            { trigger: 'start', text: "San Martín: ¡Seamos libres, que lo demás no importa nada! ¡AL ATAQUE!" },
            { trigger: 'time:10', text: "Zabala: ¡Formen cuadros! ¡Resistan!" },
            { trigger: 'boss_spawn', text: "Zabala: ¡Ríndanse, rebeldes! ¡La corona prevalecerá!" },
            { trigger: 'boss_low_health', text: "Zabala: ¡Imposible! ¡Retirada!" }
        ]
        // No nextLevelId -> Victory
    }
];
