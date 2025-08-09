// =========================
// DISPLAY UPDATE FUNCTIONS
// =========================

function updateDisplay() {
    updateAlerts();
    updateResults();
    updateChart();
    updateBusinessAnalysis();
    updateStatsDisplay();
}

function updateAlerts() {
    // Hide alerts container - user doesn't want to see unclassified transactions warning
    const alertsContainer = document.getElementById('alertsContainer');
    alertsContainer.classList.add('hidden');
}

function updateResults() {
    const filteredData = getFilteredTransactions();
    if (filteredData.length === 0) {
        document.getElementById('resultsContainer').classList.add('hidden');
        return;
    }

    document.getElementById('resultsContainer').classList.remove('hidden');

    // Category summary
    const categoryTotals = {};
    const classificationTotals = {};
    
    filteredData.forEach(transaction => {
        if (!appState.deletedTransactions.has(transaction.id)) {
            const amount = getDisplayAmount(transaction);
            const classification = getTransactionClassification(transaction);
            
            categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + amount;
            classificationTotals[classification] = (classificationTotals[classification] || 0) + amount;
        }
    });

    const totalAmount = Object.values(classificationTotals).reduce((a, b) => a + b, 0);

    // Classification summary - סדר חדש: מותרות, רשות, חובה
    const orderedClassifications = [
        ['מותרות', classificationTotals['מותרות'] || 0, 'red'],
        ['רשות', classificationTotals['רשות'] || 0, 'yellow'], 
        ['חובה', classificationTotals['חובה'] || 0, 'green']
    ];

    document.getElementById('categorySummary').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            ${orderedClassifications.map(([classification, amount, color]) => {
                const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0.0';
                return `
                    <div class="category-summary-card bg-${color}-50 border-2 border-${color}-200 rounded-2xl p-8 text-center shadow-lg">
                        <div class="text-3xl font-bold text-${color}-800 mb-3">
                            ₪${amount.toLocaleString()}
                        </div>
                        <div class="text-${color}-600 font-bold text-xl mb-2">
                            ${classification}
                        </div>
                        <div class="text-lg text-${color}-500 font-semibold">
                            ${percentage}% מסך ההוצאות
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Category details (breakdown by category)
    document.getElementById('categoryDetails').innerHTML = `
        <div class="mb-8">
            <h3 class="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span class="text-3xl">📋</span>
                פירוט לפי קטגוריות
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${Object.entries(categoryTotals)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, amount]) => {
                        const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0.0';
                        const classification = getCategoryClassification(category);
                        const color = classification === 'חובה' ? 'green' : 
                                     classification === 'רשות' ? 'yellow' : 'red';
                        return `
                            <div class="category-summary-card bg-${color}-50 border border-${color}-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all"
                                 onclick="showCategoryDetails('${category}')">
                                <div class="font-bold text-${color}-800 text-lg mb-1">${category}</div>
                                <div class="text-${color}-700 font-semibold">₪${amount.toLocaleString()}</div>
                                <div class="text-sm text-${color}-600">${percentage}%</div>
                            </div>
                        `;
                    }).join('')}
            </div>
        </div>
    `;

    // Show category details if selected
    if (appState.selectedCategoryDetails) {
        showCategoryDetailsTable();
    }
}

function updateChart() {
    const filteredData = getFilteredTransactions();
    if (filteredData.length === 0) {
        document.getElementById('chartContainer').classList.add('hidden');
        return;
    }

    document.getElementById('chartContainer').classList.remove('hidden');
    createPieChart(filteredData);
}

function createPieChart(data) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    
    // Destroy existing chart
    if (appState.chartInstance) {
        appState.chartInstance.destroy();
    }

    // Group by classification
    const classificationTotals = {};
    data.forEach(transaction => {
        if (!appState.deletedTransactions.has(transaction.id)) {
            const classification = getTransactionClassification(transaction);
            const amount = getDisplayAmount(transaction);
            classificationTotals[classification] = (classificationTotals[classification] || 0) + amount;
        }
    });

    // צבעים חדשים: מותרות=אדום, חובה=ירוק
    const colors = {
        'חובה': '#10b981',    // ירוק
        'רשות': '#f59e0b',     // צהוב
        'מותרות': '#ef4444'    // אדום
    };

    const labels = Object.keys(classificationTotals);
    const values = Object.values(classificationTotals);

    appState.chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map(label => colors[label] || '#6b7280'),
                borderWidth: 4,
                borderColor: '#ffffff',
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: 20
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 30,
                        font: {
                            size: 18,
                            weight: 'bold'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    cornerRadius: 10,
                    titleFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 14
                    },
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return `${label}: ₪${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                onComplete: function() {
                    // הוספת מספרים על הגרף
                    const chart = this;
                    const ctx = chart.ctx;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    chart.data.datasets.forEach(function(dataset, i) {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach(function(element, index) {
                            const data = dataset.data[index];
                            const amountInThousands = Math.round(data / 1000);
                            
                            if (amountInThousands > 0) {
                                const position = element.getCenterPoint();
                                
                                ctx.fillStyle = '#ffffff';
                                ctx.font = 'bold 24px Arial';
                                ctx.strokeStyle = '#000000';
                                ctx.lineWidth = 3;
                                
                                // רקע לטקסט
                                ctx.strokeText(amountInThousands.toString(), position.x, position.y);
                                ctx.fillText(amountInThousands.toString(), position.x, position.y);
                            }
                        });
                    });
                }
            }
        }
    });
}

// =========================
// CATEGORY DETAILS FUNCTIONS
// =========================

function showCategoryDetails(category) {
    appState.selectedCategoryDetails = category;
    showCategoryDetailsTable();
}

function showCategoryDetailsTable() {
    const category = appState.selectedCategoryDetails;
    const filteredData = getFilteredTransactions();
    const categoryTransactions = filteredData.filter(t => 
        t.category === category && !appState.deletedTransactions.has(t.id)
    );

    // Group by business
    const businessTotals = {};
    categoryTransactions.forEach(transaction => {
        const business = transaction.description.trim();
        if (!businessTotals[business]) {
            businessTotals[business] = {
                total: 0,
                count: 0,
                transactions: []
            };
        }
        businessTotals[business].total += getDisplayAmount(transaction);
        businessTotals[business].count += 1;
        businessTotals[business].transactions.push(transaction);
    });

    const businesses = Object.entries(businessTotals)
        .sort(([,a], [,b]) => b.total - a.total);

    const totalAmount = businesses.reduce((sum, [,data]) => sum + data.total, 0);

    const detailsHtml = `
        <div class="mb-8 p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
            <div class="flex items-center justify-between mb-4">
                <h4 class="text-xl font-bold text-blue-800">
                    📊 פירוט קטגוריית "${category}"
                </h4>
                <button onclick="closeCategoryDetails()" class="text-blue-600 hover:text-blue-800 font-bold text-lg">
                    ✕ סגור
                </button>
            </div>
            <div class="overflow-x-auto rounded-xl border border-blue-200 shadow-md bg-white">
                <table class="w-full">
                    <thead>
                        <tr class="bg-blue-100 border-b border-blue-200">
                            <th class="text-right p-4 font-bold text-blue-800">עסק</th>
                            <th class="text-right p-4 font-bold text-blue-800">סכום</th>
                            <th class="text-right p-4 font-bold text-blue-800">עסקאות</th>
                            <th class="text-right p-4 font-bold text-blue-800">אחוז</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${businesses.map(([business, data]) => {
                            const percentage = totalAmount > 0 ? ((data.total / totalAmount) * 100).toFixed(1) : '0.0';
                            const isYearly = data.transactions.some(t => appState.yearlyExpenses.has(t.id));
                            const amountDisplay = isYearly ? `₪${data.total.toLocaleString()} (שנתי)` : `₪${data.total.toLocaleString()}`;
                            
                            return `
                                <tr class="border-b border-blue-100 hover:bg-blue-50">
                                    <td class="p-4 font-semibold text-slate-800">${business}</td>
                                    <td class="p-4 font-bold text-slate-700">${amountDisplay}</td>
                                    <td class="p-4 text-slate-600">${data.count}</td>
                                    <td class="p-4 text-slate-600">${percentage}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const categoryDetailsContainer = document.getElementById('categoryDetails');
    const currentContent = categoryDetailsContainer.innerHTML;
    categoryDetailsContainer.innerHTML = currentContent + detailsHtml;
}

function closeCategoryDetails() {
    appState.selectedCategoryDetails = null;
    updateResults(); // Refresh without the details table
}