#!/usr/bin/env node
/**
 * Image Diagnostics Script
 * Run: node scripts/check-menu-images.js
 * 
 * This script analyzes menu images across restaurants and generates a report
 */

const fs = require('fs');
const path = require('path');

// Mock data for demonstration - replace with actual Firebase queries
const mockRestaurants = [
  {
    id: 'restaurant_1',
    name: 'Ankit Fresh',
    menu: [
      { id: 'item_1', name: 'Double Afghani Chaap Roll', category: 'Rolls', image: null },
      { id: 'item_2', name: 'Single Masala Chaap Roll', category: 'Rolls', image: null },
      { id: 'item_3', name: 'Chicken Biryani', category: 'Biryani', image: 'https://images.unsplash.com/...' },
    ]
  }
];

// Keywords and categories from menuImages.js
const KEYWORDS = [
  'afghani chaap roll', 'masala chaap roll', 'chaap roll',
  'chicken biryani', 'mutton biryani', 'veg biryani',
  'tandoori chicken', 'chicken tikka', 'paneer tikka',
  'fried chicken', 'butter chicken', 'gravy',
  'naan', 'roti', 'paratha',
  'fried rice', 'egg curry', 'maggi', 'noodles',
  'burger', 'sandwich', 'fries', 'salad'
];

const CATEGORIES = [
  'rolls', 'chaap rolls', 'chicken rolls', 'paneer rolls',
  'biryani', 'starters', 'veg starters', 'fried items',
  'gravy', 'curries', 'breads', 'rice', 'thali',
  'egg items', 'eggs', 'noodles', 'burgers', 'sandwich',
  'shakes', 'juices', 'veg items', 'paneer'
];

function checkImageMatch(item) {
  const text = `${item.name || ''} ${item.category || ''}`.toLowerCase();
  
  // Check if has direct image
  if (item.image && item.image.includes('http')) {
    return { status: 'has_image', source: 'direct' };
  }
  
  // Check keyword match
  const keywordMatch = KEYWORDS.find(kw => text.includes(kw));
  if (keywordMatch) {
    return { status: 'will_match', source: 'keyword', matched: keywordMatch };
  }
  
  // Check category match
  if (CATEGORIES.includes(String(item.category || '').toLowerCase())) {
    return { status: 'will_match', source: 'category', matched: item.category };
  }
  
  // Will fall back to generated
  return { status: 'will_generate', source: 'ai_generated' };
}

function analyzeRestaurant(restaurant) {
  const analysis = {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    totalItems: restaurant.menu.length,
    byStatus: {
      has_image: 0,
      will_match_keyword: 0,
      will_match_category: 0,
      will_generate: 0
    },
    items: {
      with_images: [],
      matched_keywords: [],
      matched_categories: [],
      will_generate: []
    }
  };
  
  for (const item of restaurant.menu) {
    const check = checkImageMatch(item);
    
    if (check.status === 'has_image') {
      analysis.byStatus.has_image++;
      analysis.items.with_images.push({
        id: item.id,
        name: item.name,
        category: item.category
      });
    } else if (check.status === 'will_match' && check.source === 'keyword') {
      analysis.byStatus.will_match_keyword++;
      analysis.items.matched_keywords.push({
        id: item.id,
        name: item.name,
        category: item.category,
        keyword: check.matched
      });
    } else if (check.status === 'will_match' && check.source === 'category') {
      analysis.byStatus.will_match_category++;
      analysis.items.matched_categories.push({
        id: item.id,
        name: item.name,
        category: item.category
      });
    } else {
      analysis.byStatus.will_generate++;
      analysis.items.will_generate.push({
        id: item.id,
        name: item.name,
        category: item.category,
        note: 'Will use AI-generated image or fallback'
      });
    }
  }
  
  return analysis;
}

function generateReport(analyses) {
  let report = '# Menu Image Analysis Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  let totalRestaurants = 0;
  let totalItems = 0;
  let totalWithImages = 0;
  let totalMatched = 0;
  let totalGenerated = 0;
  
  for (const analysis of analyses) {
    report += `## ${analysis.restaurantName}\n`;
    report += `- Restaurant ID: \`${analysis.restaurantId}\`\n`;
    report += `- Total Items: ${analysis.totalItems}\n`;
    report += `- Has Direct Images: ${analysis.byStatus.has_image}\n`;
    report += `- Keyword Matches: ${analysis.byStatus.will_match_keyword}\n`;
    report += `- Category Matches: ${analysis.byStatus.will_match_category}\n`;
    report += `- Will Generate: ${analysis.byStatus.will_generate}\n\n`;
    
    totalRestaurants++;
    totalItems += analysis.totalItems;
    totalWithImages += analysis.byStatus.has_image;
    totalMatched += analysis.byStatus.will_match_keyword + analysis.byStatus.will_match_category;
    totalGenerated += analysis.byStatus.will_generate;
    
    // List items that need attention
    if (analysis.items.will_generate.length > 0) {
      report += `### Items Needing Manual Fix (${analysis.items.will_generate.length})\n`;
      for (const item of analysis.items.will_generate) {
        report += `- \`${item.id}\`: **${item.name}** (${item.category})\n`;
      }
      report += '\n';
    }
  }
  
  // Summary
  report += '## Overall Summary\n';
  report += `- Restaurants Analyzed: ${totalRestaurants}\n`;
  report += `- Total Menu Items: ${totalItems}\n`;
  report += `- Items with Direct Images: ${totalWithImages} (${((totalWithImages/totalItems)*100).toFixed(1)}%)\n`;
  report += `- Items with Keyword/Category Match: ${totalMatched} (${((totalMatched/totalItems)*100).toFixed(1)}%)\n`;
  report += `- Items That Will Generate: ${totalGenerated} (${((totalGenerated/totalItems)*100).toFixed(1)}%)\n\n`;
  
  report += `**Status**: ${totalMatched + totalWithImages === totalItems ? '✓ All items will have images' : '⚠ Some items may need manual fixes'}\n`;
  
  return report;
}

function main() {
  console.log('🖼️  Analyzing menu images...\n');
  
  // Analyze each restaurant
  const analyses = mockRestaurants.map(restaurant => {
    console.log(`Analyzing: ${restaurant.name}`);
    return analyzeRestaurant(restaurant);
  });
  
  // Generate report
  const report = generateReport(analyses);
  
  // Save report
  const reportPath = path.join(process.cwd(), 'MENU_IMAGE_ANALYSIS.md');
  fs.writeFileSync(reportPath, report);
  
  console.log('\n✓ Report saved to MENU_IMAGE_ANALYSIS.md\n');
  console.log(report);
  
  // Print recommendations
  console.log('\n## Recommendations:\n');
  
  for (const analysis of analyses) {
    if (analysis.items.will_generate.length > 0) {
      console.log(`${analysis.restaurantName}: ${analysis.items.will_generate.length} items need image fixes`);
      console.log('  Options:');
      console.log('  1. Update item names to include keywords');
      console.log('  2. Use API endpoint to set images manually');
      console.log('  3. Batch update using /api/menu-images/batch-update\n');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { analyzeRestaurant, generateReport, checkImageMatch };
