export function load({ params }) {
  console.log('New Cession Page Load - Params:', params);
  return {
    clientId: params.id
  };
} 