const { MongoClient } = require('mongodb');
async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27018');
  try {
    await client.connect();
    const admin = client.db('admin');
    const status = await admin.command({ replSetGetStatus: 1 });
    console.log('ReplSet status:', JSON.stringify(status, null, 2));
  } catch (err) {
    console.log('Error getting status:', err.message);
    if (err.message.includes('replSetGetStatus')) {
      console.log('Trying to initiate replica set...');
      try {
        const result = await admin.command({
          replSetInitiate: {
            _id: 'rs0',
            members: [{ _id: 0, host: '127.0.0.1:27018' }]
          }
        });
        console.log('Init result:', JSON.stringify(result));
      } catch (initErr) {
        console.log('Init error:', initErr.message);
      }
    } else {
      // Could be that mongod just started, retry
      console.log('Connection error, mongod may still be starting...');
    }
  } finally {
    await client.close();
  }
}
main().catch(console.error);
