const { Client } = require('pg');

async function resetSeats() {
  const client = new Client({
    user: 'ticketbox',
    host: 'localhost',
    database: 'ticketbox_db',
    password: 'password',
    port: 5434,
  });

  await client.connect();
  
  await client.query(`UPDATE seat_inventory SET status = 'AVAILABLE', "reservedBy" = NULL, "expiryTime" = NULL WHERE status != 'BOOKED'`);
  console.log('Reset all unbooked seats successfully');
  
  await client.end();
}

resetSeats().catch(console.error);
