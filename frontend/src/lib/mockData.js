export const mockClients = [
  {
    id: 1,
    name: 'Ramesh Kumar',
    outstanding: 4500,
    lastTransaction: '2024-01-15',
    transactions: [
      { id: 1, date: '2024-01-15', amount: 1500, type: 'credit', description: 'Vegetables (20kg)' },
      { id: 2, date: '2024-01-10', amount: 3000, type: 'credit', description: 'Rice (50kg)' }
    ]
  },
  {
    id: 2,
    name: 'Priya Sharma',
    outstanding: 2300,
    lastTransaction: '2024-01-14',
    transactions: [
      { id: 1, date: '2024-01-14', amount: 800, type: 'credit', description: 'Dal (10kg)' },
      { id: 2, date: '2024-01-12', amount: 1500, type: 'credit', description: 'Atta (30kg)' }
    ]
  },
  {
    id: 3,
    name: 'Suresh Patel',
    outstanding: 6700,
    lastTransaction: '2024-01-13',
    transactions: [
      { id: 1, date: '2024-01-13', amount: 4000, type: 'credit', description: 'Mixed items' },
      { id: 2, date: '2024-01-08', amount: 2700, type: 'credit', description: 'Grocery items' }
    ]
  },
  {
    id: 4,
    name: 'Meena Devi',
    outstanding: 1200,
    lastTransaction: '2024-01-12',
    transactions: [
      { id: 1, date: '2024-01-12', amount: 600, type: 'credit', description: 'Oil (2L)' },
      { id: 2, date: '2024-01-09', amount: 600, type: 'credit', description: 'Sugar (5kg)' }
    ]
  }
];

export const mockInventory = [
  { id: 1, name: 'Rice', quantity: 150, unit: 'kg', lowStock: false },
  { id: 2, name: 'Wheat Flour', quantity: 85, unit: 'kg', lowStock: false },
  { id: 3, name: 'Dal (Toor)', quantity: 15, unit: 'kg', lowStock: true },
  { id: 4, name: 'Oil', quantity: 45, unit: 'L', lowStock: false },
  { id: 5, name: 'Sugar', quantity: 8, unit: 'kg', lowStock: true },
  { id: 6, name: 'Salt', quantity: 35, unit: 'kg', lowStock: false },
  { id: 7, name: 'Potatoes', quantity: 120, unit: 'kg', lowStock: false },
  { id: 8, name: 'Onions', quantity: 90, unit: 'kg', lowStock: false },
  { id: 9, name: 'Tomatoes', quantity: 5, unit: 'kg', lowStock: true },
  { id: 10, name: 'Tea', quantity: 25, unit: 'kg', lowStock: false }
];

export const mockInvoices = [
  {
    id: 'INV-001',
    clientName: 'Ramesh Kumar',
    amount: 1500,
    date: '2024-01-15',
    status: 'pending',
    items: [
      { name: 'Vegetables', quantity: 20, unit: 'kg', price: 75 }
    ]
  },
  {
    id: 'INV-002',
    clientName: 'Priya Sharma',
    amount: 800,
    date: '2024-01-14',
    status: 'pending',
    items: [
      { name: 'Dal', quantity: 10, unit: 'kg', price: 80 }
    ]
  },
  {
    id: 'INV-003',
    clientName: 'Suresh Patel',
    amount: 4000,
    date: '2024-01-13',
    status: 'minted',
    items: [
      { name: 'Mixed items', quantity: 1, unit: 'lot', price: 4000 }
    ]
  }
];

export const mockNFTs = [
  {
    tokenId: 1,
    clientName: 'Suresh Patel',
    amount: 4000,
    dueDate: '2024-02-15',
    status: 'ACTIVE',
    invoiceId: 'INV-003',
    txHash: '0x1234...5678'
  },
  {
    tokenId: 2,
    clientName: 'Anjali Singh',
    amount: 2500,
    dueDate: '2024-02-10',
    status: 'ACTIVE',
    invoiceId: 'INV-015',
    txHash: '0x8765...4321'
  },
  {
    tokenId: 3,
    clientName: 'Rajesh Gupta',
    amount: 3200,
    dueDate: '2024-01-20',
    status: 'SETTLED',
    invoiceId: 'INV-008',
    txHash: '0xabcd...efgh'
  }
];

export const mockStats = {
  totalRevenue: 45600,
  pendingAmount: 14700,
  activeNFTs: 2,
  totalClients: 12
};

export const mockActivity = [
  { id: 1, type: 'payment', message: 'Ramesh Kumar added ₹1,500', time: '2 hours ago' },
  { id: 2, type: 'nft', message: 'NFT minted for Suresh Patel', time: '5 hours ago' },
  { id: 3, type: 'inventory', message: 'Low stock alert: Tomatoes', time: '1 day ago' },
  { id: 4, type: 'payment', message: 'Priya Sharma added ₹800', time: '1 day ago' }
];

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};