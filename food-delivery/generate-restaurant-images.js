const fs = require('fs');
const path = require('path');

// Simple PNG generator using base64-encoded minimal PNG data
// These are simple solid-color PNGs with text

const imageDir = path.join(__dirname, 'frontend', 'public', 'images');
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

// Create a simple colored PNG using jimp if available, otherwise fallback to solid colors
async function generateImages() {
  try {
    const Jimp = require('jimp');
    
    // Ankit Fresh - orange/red theme (Juice & Fast Food)
    const ankit = new Jimp(800, 400, 0xE8A84Cff); // Golden orange
    const text1 = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    ankit.print(text1, 50, 150, 'Ankit Fresh Juice');
    ankit.print(text1, 150, 220, '& Fast Food');
    fs.writeFileSync(path.join(imageDir, 'ankit-first.png'), await ankit.getBuffer('image/png'));
    console.log('✓ Created ankit-first.png');
    
    // Lazeez Khana - golden/black theme
    const lazeez = new Jimp(800, 400, 0x1a1a1aff); // Dark background
    lazeez.print(text1, 50, 150, 'Lazeez Khana');
    lazeez.print(text1, 80, 220, 'Taste That Stays Forever');
    fs.writeFileSync(path.join(imageDir, 'lazeez-second.png'), await lazeez.getBuffer('image/png'));
    console.log('✓ Created lazeez-second.png');
    
    // Juice & Fast Food - vibrant red/orange
    const juice = new Jimp(800, 400, 0xFF6B35ff); // Vibrant red-orange
    juice.print(text1, 80, 150, 'Juice & Fast Food');
    juice.print(text1, 120, 220, 'Fresh • Delicious');
    fs.writeFileSync(path.join(imageDir, 'juice-third.png'), await juice.getBuffer('image/png'));
    console.log('✓ Created juice-third.png');
    
  } catch (err) {
    console.log('Jimp not available, using canvas fallback...');
    try {
      const { createCanvas } = require('canvas');
      
      // Ankit Fresh
      const canvas1 = createCanvas(800, 400);
      const ctx1 = canvas1.getContext('2d');
      ctx1.fillStyle = '#E8A84C';
      ctx1.fillRect(0, 0, 800, 400);
      ctx1.fillStyle = '#000000';
      ctx1.font = 'bold 48px Arial';
      ctx1.fillText('Ankit Fresh Juice', 50, 150);
      ctx1.fillText('& Fast Food', 150, 220);
      fs.writeFileSync(path.join(imageDir, 'ankit-first.png'), canvas1.toBuffer('image/png'));
      console.log('✓ Created ankit-first.png');
      
      // Lazeez Khana
      const canvas2 = createCanvas(800, 400);
      const ctx2 = canvas2.getContext('2d');
      ctx2.fillStyle = '#1a1a1a';
      ctx2.fillRect(0, 0, 800, 400);
      ctx2.fillStyle = '#FFD700';
      ctx2.font = 'bold 48px Arial';
      ctx2.fillText('Lazeez Khana', 50, 150);
      ctx2.fillStyle = '#FFFFFF';
      ctx2.font = '32px Arial';
      ctx2.fillText('Taste That Stays Forever', 80, 220);
      fs.writeFileSync(path.join(imageDir, 'lazeez-second.png'), canvas2.toBuffer('image/png'));
      console.log('✓ Created lazeez-second.png');
      
      // Juice & Fast Food
      const canvas3 = createCanvas(800, 400);
      const ctx3 = canvas3.getContext('2d');
      ctx3.fillStyle = '#FF6B35';
      ctx3.fillRect(0, 0, 800, 400);
      ctx3.fillStyle = '#FFFFFF';
      ctx3.font = 'bold 48px Arial';
      ctx3.fillText('Juice & Fast Food', 80, 150);
      ctx3.font = '32px Arial';
      ctx3.fillText('Fresh • Delicious', 200, 220);
      fs.writeFileSync(path.join(imageDir, 'juice-third.png'), canvas3.toBuffer('image/png'));
      console.log('✓ Created juice-third.png');
      
    } catch (canvasErr) {
      console.log('Canvas not available either. Using base64 fallback...');
      generateBase64Images();
    }
  }
}

function generateBase64Images() {
  // Minimal valid PNG files (1x1 pixels, different colors)
  // These are placeholder solid-color PNGs
  const pngBase64 = {
    ankit: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8//8/AwAI+AL+KlOPvQAAAABJRU5ErkJggg==', // placeholder
    lazeez: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd3PnAAAAEElEQVQI12P4//8/A27AAwAI/AL+O+kZoAAAAABJRU5ErkJggg==', // placeholder
    juice: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='  // placeholder
  };
  
  fs.writeFileSync(path.join(imageDir, 'ankit-first.png'), Buffer.from(pngBase64.ankit, 'base64'));
  fs.writeFileSync(path.join(imageDir, 'lazeez-second.png'), Buffer.from(pngBase64.lazeez, 'base64'));
  fs.writeFileSync(path.join(imageDir, 'juice-third.png'), Buffer.from(pngBase64.juice, 'base64'));
  console.log('✓ Created placeholder images (base64)');
}

generateImages().catch(err => {
  console.error('Error:', err.message);
  generateBase64Images();
});
