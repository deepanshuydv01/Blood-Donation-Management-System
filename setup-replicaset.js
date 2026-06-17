import { spawn } from 'child_process';
import { once } from 'events';
import { MongoClient } from 'mongodb';

const MONGO_PATH = 'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe';
const DATA_DIR = 'C:\\Users\\deepi\\AppData\\Local\\Temp\\mongodb-rs\\data';
const PORT = 27018;

async function main() {
  console.log('Starting mongod with replica set...');
  const mongod = spawn(MONGO_PATH, [
    `--dbpath=${DATA_DIR}`,
    `--port=${PORT}`,
    '--replSet=rs0',
    '--bind_ip=127.0.0.1'
  ], { stdio: 'pipe' });

  mongod.stdout.on('data', (d) => process.stdout.write(`[mongod] ${d}`));
  mongod.stderr.on('data', (d) => process.stderr.write(`[mongod] ${d}`));

  // Wait for mongod to be ready
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('Connecting to initiate replica set...');
  const client = new MongoClient(`mongodb://127.0.0.1:${PORT}`);
  try {
    await client.connect();
    const admin = client.db('admin');
    
    const result = await admin.command({
      replSetInitiate: {
        _id: 'rs0',
        members: [{ _id: 0, host: `127.0.0.1:${PORT}` }]
      }
    });
    console.log('Replica set initiated:', JSON.stringify(result));
    
    // Wait for primary to be elected
    console.log('Waiting for primary election...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    const status = await admin.command({ replSetGetStatus: 1 });
    console.log('Replica set status:', JSON.stringify(status, null, 2));
    
    console.log('\n=== SUCCESS ===');
    console.log(`MongoDB replica set running on mongodb://127.0.0.1:${PORT}/bdms_db`);
    console.log('Update DATABASE_URL in .env to use this connection string.');
    console.log('Keep this window open while using the app.\n');
  } finally {
    await client.close();
  }

  // Don't exit - keep mongod running
  process.on('SIGINT', () => { mongod.kill(); process.exit(); });
  process.on('SIGTERM', () => { mongod.kill(); process.exit(); });
  
  await once(mongod, 'exit');
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
