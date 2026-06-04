const fs = require('fs');

function createDummy(name, title) {
  const tsx = `import React from 'react';

export const ${name}: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center">
      <h1 className="text-3xl text-primary font-bold">${title}</h1>
    </div>
  );
};
`;
  fs.writeFileSync('src/pages/' + name + '.tsx', tsx);
}

createDummy('EventPage', 'Event Details Page (Migrated)');
createDummy('CheckoutPage', 'Checkout Page (Migrated)');
createDummy('PaymentPage', 'Payment Page (Migrated)');

console.log('Dummy pages created.');
