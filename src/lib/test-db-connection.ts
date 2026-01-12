import connectDB from './mongodb';

/**
 * Test script to verify MongoDB connection
 * Run with: npx tsx src/lib/test-db-connection.ts
 */
async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    const mongoose = await connectDB();
    console.log('✓ MongoDB connection successful!');
    console.log(`✓ Connected to: ${mongoose.connection.host}`);
    console.log(`✓ Database: ${mongoose.connection.name}`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('✓ Connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ MongoDB connection failed:');
    console.error(error);
    process.exit(1);
  }
}

testConnection();
