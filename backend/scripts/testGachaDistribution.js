const GachaService = require('../services/gachaService');
const Gacha = require('../models/gachaModel');
const db = require('../config/db');

// Mock data setup
const mockDishes = [
    { id: 'legend_1', rating: 4.8, rarity: 'legend' },
    { id: 'epic_1', rating: 4.2, rarity: 'epic' },
    { id: 'rare_1', rating: 3.8, rarity: 'rare' },
    { id: 'common_1', rating: 2.5, rarity: 'common' }
];

// Mock method for verification
async function runSimulation() {
    console.log('Starting Gacha Simulation...');

    // Override Gacha.getDishesForDraw to return our mock dishes
    // We can't easily mock static methods in this simple script without a library like sinon or monkey patching
    // So we will monkey patch Gacha.getDishesForDraw
    const originalGetDishes = Gacha.getDishesForDraw;
    const originalCreateDraw = Gacha.createDraw;
    const originalGetDailyDrawCount = Gacha.getDailyDrawCount;

    Gacha.getDishesForDraw = async () => mockDishes;
    Gacha.createDraw = async () => { }; // No-op
    Gacha.getDailyDrawCount = async () => 0; // Always allow

    // Mock DB connection for transaction support in GachaService
    const mockConnection = {
        beginTransaction: async () => { },
        commit: async () => { },
        rollback: async () => { },
        release: () => { },
        query: async (sql, params) => {
            // Mock lookup for final dish details
            if (sql.includes('SELECT * FROM dishes WHERE id = ?')) {
                const id = params[0];
                const dish = mockDishes.find(d => d.id === id);
                return [[dish]];
            }
            return [[{ count: 0 }]];
        }
    };

    // We also need to mock db.getConnection used in GachaService
    const originalGetConnection = db.getConnection;
    db.getConnection = async () => mockConnection;

    const results = {
        legend: 0,
        epic: 0,
        rare: 0,
        common: 0
    };

    const iterations = 1000;

    try {
        for (let i = 0; i < iterations; i++) {
            const result = await GachaService.drawDish('test_user', 'test_group');
            results[result.rarity_rolled]++;
        }

        console.log('\nSimulation Results (1000 draws):');
        console.log('--------------------------------');
        console.log(`Legend (Weight 40): ${results.legend} (${(results.legend / iterations * 100).toFixed(1)}%)`);
        console.log(`Epic   (Weight 30): ${results.epic}   (${(results.epic / iterations * 100).toFixed(1)}%)`);
        console.log(`Rare   (Weight 20): ${results.rare}   (${(results.rare / iterations * 100).toFixed(1)}%)`);
        console.log(`Common (Weight 10): ${results.common} (${(results.common / iterations * 100).toFixed(1)}%)`);

        console.log('\nExpected Distribution (Approx):');
        console.log('Legend: 40%');
        console.log('Epic:   30%');
        console.log('Rare:   20%');
        console.log('Common: 10%');

    } catch (err) {
        console.error('Simulation Failed:', err);
    } finally {
        // Restore mocks if needed (though script ends here)
    }
}

runSimulation();
