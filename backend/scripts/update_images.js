const db = require('./config/db');

// Placeholder images (Unsplash/LoremFlickr randoms are risky if they die, but okay for demo)
// Let's use specific images for better stability if possible, or reliable random categories.
const images = {
    '麥當勞': 'https://images.unsplash.com/photo-1571757767119-68b8dbed8c97?w=400',
    '肯德基': 'https://images.unsplash.com/photo-1513639776629-7b611594e29b?w=400',
    '巷口乾麵': 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400',
    '學校自助餐': 'https://images.unsplash.com/photo-1574484284008-86d47dc6b674?w=400',
    '高級牛排館': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400',
    '鼎泰豐': 'https://images.unsplash.com/photo-1541624388892-7c6d4fbd825e?w=400',
    '壽司郎': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400',
    '路邊攤滷味': 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400',
    '米其林一星燒肉': 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=400',
};

const updateImages = async () => {
    try {
        console.log('Updating images...');
        for (const [name, url] of Object.entries(images)) {
            await db.query('UPDATE `dishes` SET image_url = ? WHERE name = ?', [url, name]);
            console.log(`Updated ${name}`);
        }
        console.log('Images updated!');
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

updateImages();
