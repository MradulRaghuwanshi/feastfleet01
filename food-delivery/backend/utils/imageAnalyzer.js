/**
 * FeastFleet Image Update Helper Script
 * 
 * Usage: Run this script in Node.js environment with Firebase admin credentials
 * This helps identify menu items with missing or poor image matches
 */

const fs = require('fs');
const path = require('path');

// Import image resolution utilities
const {
  resolveMenuItemImage,
  resolveGeneratedMenuItemImage,
  IMAGE_BY_KEYWORD,
  IMAGE_BY_CATEGORY
} = require('./food-delivery/backend/utils/menuImages');

// Simulate Firebase data fetching (modify this based on your Firebase setup)
async function analyzeMenuImages(restaurantData) {
  const results = {
    total: 0,
    withDirectImage: 0,
    withKeywordMatch: 0,
    withCategoryMatch: 0,
    withGeneratedImage: 0,
    withoutMatch: 0,
    suggestions: []
  };

  if (!restaurantData.menu || !Array.isArray(restaurantData.menu)) {
    console.error('No menu data found');
    return results;
  }

  for (const item of restaurantData.menu) {
    results.total++;
    const text = `${item.name || ''} ${item.category || ''}`.toLowerCase();

    // Check if has direct image
    if (item.image && item.image.includes('http')) {
      results.withDirectImage++;
      continue;
    }

    // Check keyword match
    const keywordMatch = IMAGE_BY_KEYWORD.find(([keyword]) => text.includes(keyword));
    if (keywordMatch) {
      results.withKeywordMatch++;
      continue;
    }

    // Check category match
    if (IMAGE_BY_CATEGORY[String(item.category || '').toLowerCase()]) {
      results.withCategoryMatch++;
      continue;
    }

    // Check generated
    const generated = resolveGeneratedMenuItemImage(item);
    if (generated) {
      results.withGeneratedImage++;
      continue;
    }

    // No match found
    results.withoutMatch++;
    results.suggestions.push({
      id: item.id,
      name: item.name,
      category: item.category,
      suggestion: `Consider adding keyword or category match for: "${item.name}" (${item.category})`
    });
  }

  return results;
}

// Export utilities
function getImageResolutionSummary(item) {
  return {
    itemName: item.name,
    category: item.category,
    currentImage: item.image,
    resolvedImage: resolveMenuItemImage(item),
    imageSource: item.imageSource || 'unknown'
  };
}

function suggestNewKeywords(items) {
  const suggestedKeywords = {};
  
  for (const item of items) {
    const category = (item.category || '').toLowerCase();
    if (!suggestedKeywords[category]) {
      suggestedKeywords[category] = [];
    }
    suggestedKeywords[category].push(item.name);
  }

  return suggestedKeywords;
}

// Export for use in other scripts
module.exports = {
  analyzeMenuImages,
  getImageResolutionSummary,
  suggestNewKeywords
};
