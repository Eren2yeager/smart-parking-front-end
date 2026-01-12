/**
 * Clear Alerts Script
 * 
 * This script clears all alerts from the database.
 * Run this after updating the Alert model schema to remove old data.
 * 
 * Usage: node scripts/clear-alerts.mjs
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart-parking';

async function clearAlerts() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const alertsCollection = db.collection('alerts');

    // Count existing alerts
    const count = await alertsCollection.countDocuments();
    console.log(`📊 Found ${count} alerts`);

    if (count === 0) {
      console.log('✅ No alerts to clear');
      return;
    }

    // Delete all alerts
    const result = await alertsCollection.deleteMany({});
    console.log(`\n✅ Deleted ${result.deletedCount} alerts`);
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the Next.js dev server (Ctrl+C and npm run dev)');
    console.log('   2. Start streaming from cameras');
    console.log('   3. New alerts will be created with correct schema');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
clearAlerts();
