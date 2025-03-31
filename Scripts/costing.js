document.addEventListener('DOMContentLoaded', function() {
  const designItems = JSON.parse(localStorage.getItem('designItems')) || [];
  const tableBody = document.querySelector('#cost-table tbody');

  const itemCounts = {};
  designItems.forEach(item => {
    const key = `${item.type}-${item.finish}`;
    if (!itemCounts[key]) {
      itemCounts[key] = { count: 0, cost: item.cost, type: item.type };
    }
    itemCounts[key].count++;
  });

  let grandTotal = 0;
  for (const [key, data] of Object.entries(itemCounts)) {
    const total = data.count * data.cost;
    grandTotal += total;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${data.type}</td>
      <td><input type="number" value="${data.count}" min="1" onchange="updateTotal(this, '${key}', ${data.cost})"></td>
      <td>$${data.cost}</td>
      <td id="total-${key}">$${total}</td>
    `;
    tableBody.appendChild(row);
  }

  document.getElementById('grand-total').textContent = `$${grandTotal}`;

  document.getElementById('print-estimate').addEventListener('click', () => window.print());
});

function updateTotal(input, key, unitCost) {
  const newCount = parseInt(input.value);
  const totalCell = document.getElementById(`total-${key}`);
  const newTotal = newCount * unitCost;
  totalCell.textContent = `$${newTotal}`;
  recalculateGrandTotal();
}

function recalculateGrandTotal() {
  const rows = document.querySelectorAll('#cost-table tbody tr');
  let grandTotal = 0;
  rows.forEach(row => {
    const total = parseFloat(row.cells[3].textContent.replace('$', ''));
    grandTotal += total;
  });
  document.getElementById('grand-total').textContent = `$${grandTotal}`;
}