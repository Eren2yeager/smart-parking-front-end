/**
 * Database Seeding Script for Smart Parking System
 * 
 * This script populates the MongoDB database with sample data:
 * - Contractors
 * - Parking Lots
 * - System Settings
 * - Initial Capacity Logs
 * 
 * Usage: node scripts/seed-database.mjs
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart-parking';

// Sample data
const contractors = [
  {
    name: 'ABC Parking Solutions',
    contactPerson: 'John Smith',
    phone: '+91-9876543210',
    email: 'john@abcparking.com',
    contractDetails: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-12-31'),
      allocatedCapacity: 50,
      penaltyPerViolation: 5000,
    },
    status: 'active',
  },
  {
    name: 'XYZ Parking Management',
    contactPerson: 'Sarah Johnson',
    phone: '+91-9876543211',
    email: 'sarah@xyzparking.com',
    contractDetails: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-12-31'),
      allocatedCapacity: 40,
      penaltyPerViolation: 4500,
    },
    status: 'active',
  },
  {
    name: 'PQR Parking Services',
    contactPerson: 'Michael Brown',
    phone: '+91-9876543212',
    email: 'michael@pqrparking.com',
    contractDetails: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-12-31'),
      allocatedCapacity: 30,
      penaltyPerViolation: 4000,
    },
    status: 'active',
  },
];

const parkingLots = [
  {
    name: 'Central Plaza Parking',
    location: {
      address: 'Connaught Place, New Delhi, Delhi 110001',
      coordinates: { lat: 28.6315, lng: 77.2167 },
    },
    totalSlots: 50,
    gateCamera: {
      id: 'gate-central-plaza',
      status: 'active',
      lastSeen: new Date(),
    },
    lotCamera: {
      id: 'lot-central-plaza',
      status: 'active',
      lastSeen: new Date(),
    },
    slots: [],
    status: 'active',
  },
  {
    name: 'Karol Bagh Market Parking',
    location: {
      address: 'Karol Bagh, New Delhi, Delhi 110005',
      coordinates: { lat: 28.6519, lng: 77.1909 },
    },
    totalSlots: 40,
    gateCamera: {
      id: 'gate-karol-bagh',
      status: 'active',
      lastSeen: new Date(),
    },
    lotCamera: {
      id: 'lot-karol-bagh',
      status: 'active',
      lastSeen: new Date(),
    },
    slots: [],
    status: 'active',
  },
  {
    name: 'Nehru Place Tech Hub Parking',
    location: {
      address: 'Nehru Place, New Delhi, Delhi 110019',
      coordinates: { lat: 28.5494, lng: 77.2501 },
    },
    totalSlots: 30,
    gateCamera: {
      id: 'gate-nehru-place',
      status: 'active',
      lastSeen: new Date(),
    },
    lotCamera: {
      id: 'lot-nehru-place',
      status: 'active',
      lastSeen: new Date(),
    },
    slots: [],
    status: 'active',
  },
];

// Define schemas inline (since we can't import from TypeScript)
const ContractorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  contractDetails: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    allocatedCapacity: { type: Number, required: true },
    penaltyPerViolation: { type: Number, required: true },
  },
  status: { type: String, enum: ['active', 'suspended', 'terminated'], default: 'active' },
}, { timestamps: true });

const ParkingLotSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  totalSlots: { type: Number, required: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', required: true },
  gateCamera: {
    id: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastSeen: { type: Date, default: Date.now },
  },
  lotCamera: {
    id: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastSeen: { type: Date, default: Date.now },
  },
  slots: [{
    slotId: { type: Number, required: true },
    bbox: {
      x1: { type: Number, required: true },
      y1: { type: Number, required: true },
      x2: { type: Number, required: true },
      y2: { type: Number, required: true },
    },
    status: { type: String, enum: ['occupied', 'empty'], default: 'empty' },
    lastUpdated: { type: Date, default: Date.now },
  }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
  alertThresholds: {
    capacityWarning: { type: Number, required: true, default: 90 },
    cameraOfflineTimeout: { type: Number, required: true, default: 5 },
  },
  pythonBackend: {
    httpUrl: { type: String, required: true, default: 'http://localhost:8000' },
    wsUrl: { type: String, required: true, default: 'ws://localhost:8000' },
  },
  cameras: {
    gateFrameSkip: { type: Number, required: true, default: 2 },
    lotFrameSkip: { type: Number, required: true, default: 5 },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const CapacityLogSchema = new mongoose.Schema({
  parkingLotId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  totalSlots: { type: Number, required: true },
  occupied: { type: Number, required: true },
  empty: { type: Number, required: true },
  occupancyRate: { type: Number, required: true },
  source: { type: String, enum: ['camera', 'manual', 'system'], default: 'system' },
}, { timestamps: true });

// Helper function to generate random capacity logs
function generateCapacityLogs(parkingLotId, totalSlots, days = 7) {
  const logs = [];
  const now = new Date();
  
  for (let day = days; day >= 0; day--) {
    // Generate 24 hourly logs for each day
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - day);
      timestamp.setHours(hour, 0, 0, 0);
      
      // Simulate realistic occupancy patterns
      let baseOccupancy = 0.3; // 30% base
      
      // Peak hours (9 AM - 6 PM)
      if (hour >= 9 && hour <= 18) {
        baseOccupancy = 0.7 + Math.random() * 0.2; // 70-90%
      }
      // Evening (6 PM - 10 PM)
      else if (hour >= 18 && hour <= 22) {
        baseOccupancy = 0.5 + Math.random() * 0.2; // 50-70%
      }
      // Night/Early morning
      else {
        baseOccupancy = 0.1 + Math.random() * 0.2; // 10-30%
      }
      
      const occupied = Math.floor(totalSlots * baseOccupancy);
      const empty = totalSlots - occupied;
      const occupancyRate = occupied / totalSlots;
      
      logs.push({
        parkingLotId,
        timestamp,
        totalSlots,
        occupied,
        empty,
        occupancyRate,
        source: 'system',
      });
    }
  }
  
  return logs;
}

// Helper function to initialize parking slots
function initializeSlots(totalSlots) {
  const slots = [];
  const slotsPerRow = 10;
  const slotWidth = 100;
  const slotHeight = 200;
  const spacing = 20;
  
  for (let i = 0; i < totalSlots; i++) {
    const row = Math.floor(i / slotsPerRow);
    const col = i % slotsPerRow;
    
    const x1 = col * (slotWidth + spacing);
    const y1 = row * (slotHeight + spacing);
    const x2 = x1 + slotWidth;
    const y2 = y1 + slotHeight;
    
    // Randomly set some slots as occupied (30% occupancy)
    const status = Math.random() < 0.3 ? 'occupied' : 'empty';
    
    slots.push({
      slotId: i + 1,
      bbox: { x1, y1, x2, y2 },
      status,
      lastUpdated: new Date(),
    });
  }
  
  return slots;
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get or create models
    const Contractor = mongoose.models.Contractor || mongoose.model('Contractor', ContractorSchema);
    const ParkingLot = mongoose.models.ParkingLot || mongoose.model('ParkingLot', ParkingLotSchema);
    const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
    const CapacityLog = mongoose.models.CapacityLog || mongoose.model('CapacityLog', CapacityLogSchema);
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Contractor.deleteMany({});
    await ParkingLot.deleteMany({});
    await Settings.deleteMany({});
    await CapacityLog.deleteMany({});
    console.log('✅ Cleared existing data\n');
    
    // Seed Contractors
    console.log('👥 Creating contractors...');
    const createdContractors = await Contractor.insertMany(contractors);
    console.log(`✅ Created ${createdContractors.length} contractors:`);
    createdContractors.forEach(c => {
      console.log(`   - ${c.name} (Capacity: ${c.contractDetails.allocatedCapacity})`);
    });
    console.log();
    
    // Seed Parking Lots
    console.log('🅿️  Creating parking lots...');
    const parkingLotsWithContractors = parkingLots.map((lot, index) => ({
      ...lot,
      contractorId: createdContractors[index]._id,
      slots: initializeSlots(lot.totalSlots),
    }));
    
    const createdParkingLots = await ParkingLot.insertMany(parkingLotsWithContractors);
    console.log(`✅ Created ${createdParkingLots.length} parking lots:`);
    createdParkingLots.forEach(lot => {
      console.log(`   - ${lot.name} (${lot.totalSlots} slots)`);
    });
    console.log();
    
    // Seed Capacity Logs
    console.log('📊 Generating capacity logs (7 days of hourly data)...');
    const allCapacityLogs = [];
    
    for (const lot of createdParkingLots) {
      const logs = generateCapacityLogs(lot._id, lot.totalSlots, 7);
      allCapacityLogs.push(...logs);
    }
    
    await CapacityLog.insertMany(allCapacityLogs);
    console.log(`✅ Created ${allCapacityLogs.length} capacity log entries`);
    console.log(`   (${allCapacityLogs.length / createdParkingLots.length} entries per parking lot)\n`);
    
    // Seed Settings
    console.log('⚙️  Creating system settings...');
    const settings = await Settings.create({
      alertThresholds: {
        capacityWarning: 90,
        cameraOfflineTimeout: 5,
      },
      pythonBackend: {
        httpUrl: 'http://localhost:8000',
        wsUrl: 'ws://localhost:8000',
      },
      cameras: {
        gateFrameSkip: 2,
        lotFrameSkip: 5,
      },
    });
    console.log('✅ Created system settings\n');
    
    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Database seeding completed successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📋 Summary:');
    console.log(`   • Contractors: ${createdContractors.length}`);
    console.log(`   • Parking Lots: ${createdParkingLots.length}`);
    console.log(`   • Capacity Logs: ${allCapacityLogs.length}`);
    console.log(`   • Settings: 1`);
    console.log('\n🚀 Next Steps:');
    console.log('   1. Start Python backend: cd python-work && python main.py');
    console.log('   2. Start Next.js frontend: cd next.js-work && npm run dev');
    console.log('   3. Open http://localhost:3000');
    console.log('   4. Connect mobile camera: http://YOUR_IP:3000/camera');
    console.log('   5. Login and explore the dashboard!');
    console.log('\n📖 For detailed instructions, see: COMPLETE_SETUP_GUIDE.md\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seeding
seedDatabase();
