/**
 * Vehicle Data Seeder - Hybrid Approach
 * Phase 1: Seed curated makes/models (no API calls)
 * Phase 2: Marketcheck API for trims
 */

const { createClient } = require('@supabase/supabase-js');
const { CURATED_MODELS } = require('./curatedModels');

// Supabase config
const SUPABASE_URL = 'https://vlchonnjhjzxjdqvubnh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsY2hvbm5qaGp6eGpkcXZ1Ym5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQ5ODYxNSwiZXhwIjoyMDgwMDc0NjE1fQ.lPrGYmbAVIqF1IC1jnKVMQKmumHlw_1h6EcVYJe74HQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Marketcheck API keys (rotate through these)
const MARKETCHECK_KEYS = [
  'uRB4SyKGng1Ff6Rb6zbRU9X9v5CcvN36',
  'jqTeXg9yh6B8ymjGm3PJMMF4exGPYXtewf5zFRUBUZoU4Lup',
  'OAyEBEpaiXG0PHqX'
];
let currentKeyIndex = 0;
let requestsPerKey = [0, 0, 0];
const MAX_REQUESTS_PER_KEY = 480; // Leave buffer from 500

// Year range
const START_YEAR = 2014;
const END_YEAR = 2025;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Get next available API key
function getApiKey() {
  // Find a key that hasn't hit the limit
  for (let i = 0; i < MARKETCHECK_KEYS.length; i++) {
    const idx = (currentKeyIndex + i) % MARKETCHECK_KEYS.length;
    if (requestsPerKey[idx] < MAX_REQUESTS_PER_KEY) {
      currentKeyIndex = idx;
      return MARKETCHECK_KEYS[idx];
    }
  }
  return null; // All keys exhausted
}

// Fetch trims from Marketcheck
async function fetchTrims(make, model) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('All API keys exhausted');
  }
  
  const url = `https://api.marketcheck.com/v2/specs/car/terms?api_key=${apiKey}&field=trim&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
  
  try {
    const response = await fetch(url);
    requestsPerKey[currentKeyIndex]++;
    
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited, try next key
        requestsPerKey[currentKeyIndex] = MAX_REQUESTS_PER_KEY;
        return fetchTrims(make, model);
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.trim || [];
  } catch (error) {
    console.error(`  Error fetching trims for ${make} ${model}: ${error.message}`);
    return ['Base']; // Fallback
  }
}

// Clear existing data
async function clearExistingData() {
  console.log('🗑️  Clearing existing vehicle data...');
  await supabase.from('vehicle_years').delete().neq('id', 0);
  await supabase.from('vehicle_trims').delete().neq('id', 0);
  await supabase.from('vehicle_models').delete().neq('id', 0);
  await supabase.from('vehicle_makes').delete().neq('id', 0);
  console.log('✅ Cleared existing data\n');
}

// Phase 1: Seed makes and models from curated list
async function seedMakesAndModels() {
  console.log('📦 Phase 1: Seeding curated makes & models...\n');
  
  const makes = Object.keys(CURATED_MODELS);
  
  // Seed makes
  const makesData = makes.map(make => ({ make }));
  await supabase.from('vehicle_makes').upsert(makesData, { onConflict: 'make' });
  console.log(`  ✅ Seeded ${makes.length} makes`);
  
  // Seed models
  const modelRecords = [];
  for (const [make, models] of Object.entries(CURATED_MODELS)) {
    for (const model of models) {
      modelRecords.push({ make, model });
    }
  }
  
  await supabase.from('vehicle_models').upsert(modelRecords, { onConflict: 'make,model' });
  console.log(`  ✅ Seeded ${modelRecords.length} models\n`);
  
  return modelRecords;
}

// Phase 2: Fetch trims from Marketcheck
async function seedTrims(modelRecords) {
  console.log('📦 Phase 2: Fetching trims from Marketcheck...\n');
  console.log(`  Models to process: ${modelRecords.length}`);
  console.log(`  API keys available: ${MARKETCHECK_KEYS.length}\n`);
  
  const trimRecords = [];
  const yearRecords = [];
  const years = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);
  
  let processed = 0;
  
  for (const { make, model } of modelRecords) {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.log('\n⚠️  All API keys exhausted! Stopping...');
      console.log(`  Processed: ${processed}/${modelRecords.length} models`);
      break;
    }
    
    process.stdout.write(`\r  [${processed + 1}/${modelRecords.length}] ${make} ${model}...                    `);
    
    const trims = await fetchTrims(make, model);
    
    for (const trim of trims) {
      trimRecords.push({ make, model, trim });
      
      for (const year of years) {
        yearRecords.push({ make, model, trim, year });
      }
    }
    
    processed++;
    await delay(200); // Be nice to the API
  }
  
  console.log(`\n\n  Inserting ${trimRecords.length} trims...`);
  
  // Batch insert trims
  for (let i = 0; i < trimRecords.length; i += 500) {
    const batch = trimRecords.slice(i, i + 500);
    await supabase.from('vehicle_trims').upsert(batch, { onConflict: 'make,model,trim' });
  }
  
  console.log(`  Inserting ${yearRecords.length} year records...`);
  
  // Batch insert years
  for (let i = 0; i < yearRecords.length; i += 1000) {
    const batch = yearRecords.slice(i, i + 1000);
    await supabase.from('vehicle_years').upsert(batch, { onConflict: 'make,model,trim,year' });
    process.stdout.write(`\r  Progress: ${Math.min(i + 1000, yearRecords.length)}/${yearRecords.length}`);
  }
  
  return { trims: trimRecords.length, years: yearRecords.length, processed };
}

// Main
async function main() {
  console.log('🚗 Vehicle Data Seeder\n');
  console.log(`Year range: ${START_YEAR} - ${END_YEAR}`);
  console.log(`Total models: ${Object.values(CURATED_MODELS).flat().length}\n`);
  
  await clearExistingData();
  const modelRecords = await seedMakesAndModels();
  const stats = await seedTrims(modelRecords);
  
  console.log('\n\n═══════════════════════════════════════════');
  console.log('📊 SEEDING COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log(`Makes:   ${Object.keys(CURATED_MODELS).length}`);
  console.log(`Models:  ${modelRecords.length}`);
  console.log(`Trims:   ${stats.trims}`);
  console.log(`Years:   ${stats.years}`);
  console.log(`API calls used: ${requestsPerKey.reduce((a, b) => a + b, 0)}`);
  console.log(`  Key 1: ${requestsPerKey[0]}`);
  console.log(`  Key 2: ${requestsPerKey[1]}`);
  console.log(`  Key 3: ${requestsPerKey[2]}`);
  console.log('═══════════════════════════════════════════\n');
}

main().catch(console.error);
