/**
 * Clear Capacity Logs Script
 * 
 * This script clears all capacity logs from the database.
 * Run this after fixing the scaling logic to remove old incorrect data.
 * 
 * Usage: node scripts/clear-capacity-logs.mjs
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart-parking';

async function clearCapacityLogs() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const capacityLogsCollection = db.collection('capacitylogs');

    // Count existing logs
    const count = await capacityLogsCollection.countDocuments();
    console.log(`📊 Found ${count} capacity logs`);

    if (count === 0) {
      console.log('✅ No capacity logs to clear');
      return;
    }

    // Ask for confirmation
    console.log('\n⚠️  This will delete all capacity logs!');
    console.log('   New logs will be created when cameras stream again.');
    
    // Delete all capacity logs
    const result = await capacityLogsCollection.deleteMany({});
    console.log(`\n✅ Deleted ${result.deletedCount} capacity logs`);
    console.log('\n💡 Next steps:');
    console.log('   1. Start streaming from the lot camera');
    console.log('   2. New capacity logs will be created with correct counts');
    console.log('   3. Refresh the parking lot details page');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
clearCapacityLogs();
