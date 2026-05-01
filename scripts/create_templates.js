const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const outputDir = path.resolve(process.cwd(), 'public/templates');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Products Template
const productsData = [
  { name: 'Paracetamol 500mg', company: 'GSK', category: 'Analgesics', body_system: 'General', price: 120, stock: 100 },
  { name: 'Atorvastatin 10mg', company: 'Pfizer', category: 'Statins', body_system: 'Heart', price: 250, stock: 50 },
  { name: 'Salbutamol Inhaler', company: 'Cipla', category: 'Bronchodilators', body_system: 'Lungs', price: 180, stock: 30 }
];
const productsWs = XLSX.utils.json_to_sheet(productsData);
const productsWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(productsWb, productsWs, 'Products');
XLSX.writeFile(productsWb, path.join(outputDir, 'Products_Upload_Template.xlsx'));

// 2. Users Template
const usersData = [
  { phone: '9876543210', store_name: 'Metro Pharmacy', is_approved: 'TRUE', credit_balance: 0, credit_limit: 50000, role: 'client' },
  { phone: '9876543211', store_name: 'City Meds', is_approved: 'FALSE', credit_balance: 0, credit_limit: 0, role: 'client' }
];
const usersWs = XLSX.utils.json_to_sheet(usersData);
const usersWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(usersWb, usersWs, 'Users');
XLSX.writeFile(usersWb, path.join(outputDir, 'Users_Upload_Template.xlsx'));

console.log('Excel templates generated successfully in public/templates');
