document.addEventListener('DOMContentLoaded', function() {
  const furnitureItems = JSON.parse(localStorage.getItem('furnitureItems')) || [];
  const tableBody = document.querySelector('#cost-table tbody');
  
  // Group items by type and count quantities
  const itemCounts = {};
  furnitureItems.forEach(item => {
    if (!itemCounts[item.type]) {
      itemCounts[item.type] = {
        count: 0,
        cost: item.cost
      };
    }
    itemCounts[item.type].count++;
  });
  
  // Populate the table
  let grandTotal = 0;
  for (const [type, data] of Object.entries(itemCounts)) {
    const total = data.count * data.cost;
    grandTotal += total;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${type.charAt(0).toUpperCase() + type.slice(1)}</td>
      <td>${data.count}</td>
      <td>$${data.cost}</td>
      <td>$${total}</td>
    `;
    tableBody.appendChild(row);
  }
  
  // Update grand total
  document.getElementById('grand-total').textContent = `$${grandTotal}`;
  
  // Print button functionality
  document.getElementById('print-estimate').addEventListener('click', function() {
    window.print();
  });
});