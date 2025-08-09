// =========================
// BUSINESS ANALYSIS & TABLES
// =========================

function updateBusinessAnalysis() {
    const filteredData = getFilteredTransactions();
    if (filteredData.length === 0) {
        document.getElementById('businessAnalysisContainer').classList.add('hidden');
        return;
    }

    document.getElementById('businessAnalysisContainer').classList.remove('hidden');

    // Group by business
    const businessTotals = {};
    filteredData.forEach(transaction => {
        if (!appState.deletedTransactions.has(transaction.id)) {
            const business = transaction.description.trim();
            if (!businessTotals[business]) {
                businessTotals[business] = {
                    total: 0,
                    count: 0,
                    category: transaction.category,
                    classification: getTransactionClassification(transaction),
                    transactions: []
                };
            }
            businessTotals[business].total += getDisplayAmount(transaction);
            businessTotals[business].count += 1;
            businessTotals[business].transactions.push(transaction);
        }
    });

    let businesses = Object.entries(businessTotals);
    
    // Apply sorting
    const sortOrder = appState.sortOrder.business;
    if (sortOrder.field) {
        businesses.sort(([nameA, dataA], [nameB, dataB]) => {
            let valueA, valueB;
            
            switch (sortOrder.field) {
                case 'name':
                    valueA = nameA;
                    valueB = nameB;
                    break;
                case 'category':
                    valueA = dataA.category;
                    valueB = dataB.category;
                    break;
                case 'amount':
                    valueA = dataA.total;
                    valueB = dataB.total;
                    break;
                case 'count':
                    valueA = dataA.count;
                    valueB = dataB.count;
                    break;
                case 'classification':
                    valueA = dataA.classification;
                    valueB = dataB.classification;
                    break;
                default:
                    valueA = nameA;
                    valueB = nameB;
            }
            
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }
            
            if (valueA < valueB) return sortOrder.direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortOrder.direction === 'asc' ? 1 : -1;
            return 0;
        });
    } else {
        // Default sort by amount descending
        businesses.sort(([,a], [,b]) => b.total - a.total);
    }

    // Pagination
    const visibleCount = appState.showAllBusinesses ? businesses.length : Math.min(20, businesses.length);
    const visibleBusinesses = businesses.slice(0, visibleCount);
    const hiddenCount = businesses.length - visibleCount;

    const tbody = document.getElementById('businessTableBody');
    tbody.innerHTML = visibleBusinesses.map(([business, data]) => {
        const isYearly = data.transactions.some(t => appState.yearlyExpenses.has(t.id));
        const amountDisplay = isYearly ? `₪${data.total.toLocaleString()} (שנתי)` : `₪${data.total.toLocaleString()}`;
        
        return `
            <tr class="table-row border-b border-slate-100 editable-row" onclick="editBusinessClassification('${business.replace(/'/g, "\\'")}', event)">
                <td class="p-6 font-semibold text-slate-800 text-lg">${business}</td>
                <td class="p-6">
                    <select onchange="updateBusinessCategory('${business.replace(/'/g, "\\'")}', this.value)" 
                            onclick="event.stopPropagation()"
                            class="border-2 border-slate-200 rounded-xl px-4 py-2 text-lg focus:border-blue-500 transition-all shadow-md">
                        <option value="מזון" ${data.category === 'מזון' ? 'selected' : ''}>מזון</option>
                        <option value="רכב" ${data.category === 'רכב' ? 'selected' : ''}>רכב</option>
                        <option value="בריאות" ${data.category === 'בריאות' ? 'selected' : ''}>בריאות</option>
                        <option value="ביטוח" ${data.category === 'ביטוח' ? 'selected' : ''}>ביטוח</option>
                        <option value="חשבונות" ${data.category === 'חשבונות' ? 'selected' : ''}>חשבונות</option>
                        <option value="חינוך" ${data.category === 'חינוך' ? 'selected' : ''}>חינוך</option>
                        <option value="דיור" ${data.category === 'דיור' ? 'selected' : ''}>דיור</option>
                        <option value="החזר חוב" ${data.category === 'החזר חוב' ? 'selected' : ''}>החזר חוב</option>
                        <option value="קניות לבית" ${data.category === 'קניות לבית' ? 'selected' : ''}>קניות לבית</option>
                        <option value="השקעות" ${data.category === 'השקעות' ? 'selected' : ''}>השקעות</option>
                        <option value="פנאי" ${data.category === 'פנאי' ? 'selected' : ''}>פנאי</option>
                        <option value="אחר" ${data.category === 'אחר' ? 'selected' : ''}>אחר</option>
                    </select>
                </td>
                <td class="p-6">
                    <span class="category-tag category-${data.classification === 'חובה' ? 'mandatory' : data.classification === 'רשות' ? 'optional' : 'luxury'}" 
                          onclick="editBusinessClassificationByClick('${business.replace(/'/g, "\\'")}'); event.stopPropagation();">
                        ${data.classification}
                    </span>
                </td>
                <td class="p-6 font-bold text-lg cursor-pointer hover:bg-blue-50 transition-colors" 
                    onclick="toggleBusinessYearly('${business.replace(/'/g, "\\'")}')" title="לחץ לסימון כהוצאה שנתית">
                    ${amountDisplay}
                </td>
                <td class="p-6 text-slate-600 text-lg">${data.count}</td>
                <td class="p-6 text-center">
                    <button onclick="deleteBusinessTransactions('${business.replace(/'/g, "\\'")}', this)" 
                            class="text-red-600 hover:bg-red-50 p-3 rounded-xl transition-colors text-xl">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Show/hide more button
    const showMoreBtn = document.getElementById('showMoreBusinesses');
    const showLessBtn = document.getElementById('showLessBusinesses');
    const hiddenCountSpan = document.getElementById('hiddenBusinessesCount');
    
    if (hiddenCount > 0 && !appState.showAllBusinesses) {
        showMoreBtn.classList.remove('hidden');
        showLessBtn.classList.add('hidden');
        hiddenCountSpan.textContent = hiddenCount;
    } else if (appState.showAllBusinesses && businesses.length > 20) {
        showMoreBtn.classList.add('hidden');
        showLessBtn.classList.remove('hidden');
    } else {
        showMoreBtn.classList.add('hidden');
        showLessBtn.classList.add('hidden');
    }

    // Update deleted businesses table
    updateDeletedBusinessesTable();
}

// =========================
// BUSINESS FUNCTIONS
// =========================

function editBusinessClassification(business, event) {
    if (event.target.tagName.toLowerCase() === 'select' || 
        event.target.tagName.toLowerCase() === 'button' ||
        event.target.tagName.toLowerCase() === 'span') {
        return; // Don't edit if clicking on controls or category tag
    }
    
    editBusinessClassificationByClick(business);
}

function editBusinessClassificationByClick(business) {
    const classifications = ['חובה', 'רשות', 'מותרות'];
    const currentClassification = getBusinessClassification(business);
    const currentIndex = classifications.indexOf(currentClassification);
    const nextIndex = (currentIndex + 1) % classifications.length;
    const newClassification = classifications[nextIndex];
    
    // Update all transactions of this business
    appState.categorizedData.forEach(transaction => {
        if (transaction.description.trim() === business) {
            appState.manualClassifications[transaction.id] = newClassification;
        }
    });
    
    updateDisplay();
    autoSaveToFirebase();
}

function getBusinessClassification(business) {
    // Get classification from the first transaction of this business
    const transaction = appState.categorizedData.find(t => t.description.trim() === business);
    return transaction ? getTransactionClassification(transaction) : 'רשות';
}

function updateBusinessCategory(business, newCategory) {
    // Update all transactions of this business
    appState.categorizedData.forEach(transaction => {
        if (transaction.description.trim() === business) {
            transaction.category = newCategory;
            transaction.classification = getCategoryClassification(newCategory);
        }
    });
    
    // Update business mapping
    appState.businessMappings[business] = newCategory;
    
    updateDisplay();
    autoSaveToFirebase();
}

function toggleBusinessYearly(business) {
    const businessTransactions = appState.categorizedData.filter(t => 
        t.description.trim() === business
    );
    
    const isCurrentlyYearly = businessTransactions.some(t => 
        appState.yearlyExpenses.has(t.id)
    );
    
    businessTransactions.forEach(transaction => {
        if (isCurrentlyYearly) {
            appState.yearlyExpenses.delete(transaction.id);
        } else {
            appState.yearlyExpenses.add(transaction.id);
        }
    });
    
    updateDisplay();
    autoSaveToFirebase();
}

function deleteBusinessTransactions(business, button) {
    // מחיקה ללא שאלה כפי שביקשת
    appState.categorizedData.forEach(transaction => {
        if (transaction.description.trim() === business) {
            appState.deletedTransactions.add(transaction.id);
        }
    });
    
    button.closest('tr').style.opacity = '0.3';
    setTimeout(() => {
        updateDisplay();
        autoSaveToFirebase();
    }, 300);
}

function updateDeletedBusinessesTable() {
    const filteredData = getFilteredTransactions();
    const deletedBusinesses = {};
    
    // Find deleted businesses
    filteredData.forEach(transaction => {
        if (appState.deletedTransactions.has(transaction.id)) {
            const business = transaction.description.trim();
            if (!deletedBusinesses[business]) {
                deletedBusinesses[business] = {
                    total: 0,
                    count: 0,
                    category: transaction.category,
                    transactions: []
                };
            }
            deletedBusinesses[business].total += getDisplayAmount(transaction);
            deletedBusinesses[business].count += 1;
            deletedBusinesses[business].transactions.push(transaction);
        }
    });

    const container = document.getElementById('deletedBusinessesContainer');
    const tbody = document.getElementById('deletedBusinessesTableBody');
    
    if (Object.keys(deletedBusinesses).length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    
    tbody.innerHTML = Object.entries(deletedBusinesses).map(([business, data]) => {
        const isYearly = data.transactions.some(t => appState.yearlyExpenses.has(t.id));
        const amountDisplay = isYearly ? `₪${data.total.toLocaleString()} (שנתי)` : `₪${data.total.toLocaleString()}`;
        
        return `
            <tr class="border-b border-red-200 hover:bg-red-100 cursor-pointer" onclick="restoreBusinessTransactions('${business.replace(/'/g, "\\'")}')">
                <td class="p-4 font-semibold text-red-800">${business}</td>
                <td class="p-4 text-red-700">${data.category}</td>
                <td class="p-4 font-bold text-red-700">${amountDisplay}</td>
                <td class="p-4 text-red-600">${data.count}</td>
                <td class="p-4 text-center">
                    <button onclick="restoreBusinessTransactions('${business.replace(/'/g, "\\'")}'); event.stopPropagation();" 
                            class="text-green-600 hover:bg-green-50 p-2 rounded-xl transition-colors text-lg" title="שחזר">
                        ↩️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function restoreBusinessTransactions(business) {
    appState.categorizedData.forEach(transaction => {
        if (transaction.description.trim() === business) {
            appState.deletedTransactions.delete(transaction.id);
        }
    });
    
    updateDisplay();
    autoSaveToFirebase();
}

function toggleShowMoreBusinesses() {
    appState.showAllBusinesses = !appState.showAllBusinesses;
    updateBusinessAnalysis();
}

// =========================
// TRANSACTIONS TABLE FUNCTIONS
// =========================

function toggleTransactionsTable() {
    appState.showTransactions = !appState.showTransactions;
    const content = document.getElementById('transactionsContent');
    const arrow = document.getElementById('transactionsArrow');
    const text = document.getElementById('transactionsText');
    
    if (appState.showTransactions) {
        content.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
        text.textContent = 'הסתר פירוט';
        updateTransactionsTable();
    } else {
        content.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
        text.textContent = 'הצג פירוט';
    }
}

function updateTransactionsTable() {
    if (!appState.showTransactions) return;
    
    const filteredData = getFilteredTransactions();
    
    // Show the container
    document.getElementById('transactionsContainer').classList.remove('hidden');
    
    // Transactions table
    let visibleTransactions = filteredData.filter(t => !appState.deletedTransactions.has(t.id));
    
    // Apply sorting
    const sortOrder = appState.sortOrder.transactions;
    if (sortOrder.field) {
        visibleTransactions.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortOrder.field) {
                case 'classification':
                    valueA = getTransactionClassification(a);
                    valueB = getTransactionClassification(b);
                    break;
                default:
                    valueA = a[sortOrder.field];
                    valueB = b[sortOrder.field];
            }
            
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }
            
            if (valueA < valueB) return sortOrder.direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortOrder.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Pagination
    const showCount = appState.showAllTransactions ? visibleTransactions.length : Math.min(20, visibleTransactions.length);
    const displayTransactions = visibleTransactions.slice(0, showCount);
    const hiddenTransactionsCount = visibleTransactions.length - showCount;
    
    const tbody = document.getElementById('transactionsTableBody');
    
    tbody.innerHTML = displayTransactions.map(transaction => {
        const classification = getTransactionClassification(transaction);
        const isYearly = appState.yearlyExpenses.has(transaction.id);
        const amountDisplay = isYearly ? 
            `₪${getDisplayAmount(transaction).toLocaleString()} (שנתי)` : 
            `₪${getDisplayAmount(transaction).toLocaleString()}`;
        
        return `
            <tr class="table-row border-b border-slate-100 editable-row" onclick="editTransactionClassification('${transaction.id}', event)">
                <td class="p-6 text-slate-600 text-lg">${transaction.date}</td>
                <td class="p-6 font-semibold text-slate-800 text-lg">${transaction.description}</td>
                <td class="p-6 font-bold text-lg cursor-pointer hover:bg-blue-50 transition-colors" 
                    onclick="toggleTransactionYearly('${transaction.id}'); event.stopPropagation();" title="לחץ לסימון כהוצאה שנתית">
                    ${amountDisplay}
                </td>
                <td class="p-6">
                    <select onchange="updateTransactionCategory('${transaction.id}', this.value)" 
                            onclick="event.stopPropagation()"
                            class="border-2 border-slate-200 rounded-xl px-4 py-2 text-lg focus:border-blue-500 transition-all shadow-md">
                        <option value="מזון" ${transaction.category === 'מזון' ? 'selected' : ''}>מזון</option>
                        <option value="רכב" ${transaction.category === 'רכב' ? 'selected' : ''}>רכב</option>
                        <option value="בריאות" ${transaction.category === 'בריאות' ? 'selected' : ''}>בריאות</option>
                        <option value="ביטוח" ${transaction.category === 'ביטוח' ? 'selected' : ''}>ביטוח</option>
                        <option value="חשבונות" ${transaction.category === 'חשבונות' ? 'selected' : ''}>חשבונות</option>
                        <option value="חינוך" ${transaction.category === 'חינוך' ? 'selected' : ''}>חינוך</option>
                        <option value="דיור" ${transaction.category === 'דיור' ? 'selected' : ''}>דיור</option>
                        <option value="החזר חוב" ${transaction.category === 'החזר חוב' ? 'selected' : ''}>החזר חוב</option>
                        <option value="קניות לבית" ${transaction.category === 'קניות לבית' ? 'selected' : ''}>קניות לבית</option>
                        <option value="השקעות" ${transaction.category === 'השקעות' ? 'selected' : ''}>השקעות</option>
                        <option value="פנאי" ${transaction.category === 'פנאי' ? 'selected' : ''}>פנאי</option>
                        <option value="אחר" ${transaction.category === 'אחר' ? 'selected' : ''}>אחר</option>
                    </select>
                </td>
                <td class="p-6">
                    <span class="category-tag category-${classification === 'חובה' ? 'mandatory' : classification === 'רשות' ? 'optional' : 'luxury'}" 
                          onclick="event.stopPropagation()">
                        ${classification}
                    </span>
                </td>
                <td class="p-6 text-center">
                    <button onclick="deleteTransaction('${transaction.id}', this); event.stopPropagation();" 
                            class="text-red-600 hover:bg-red-50 p-3 rounded-xl transition-colors text-xl">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Show/hide more button
    const showMoreBtn = document.getElementById('showMoreTransactions');
    const showLessBtn = document.getElementById('showLessTransactions');
    const hiddenCountSpan = document.getElementById('hiddenTransactionsCount');
    
    if (hiddenTransactionsCount > 0 && !appState.showAllTransactions) {
        showMoreBtn.classList.remove('hidden');
        showLessBtn.classList.add('hidden');
        hiddenCountSpan.textContent = hiddenTransactionsCount;
    } else if (appState.showAllTransactions && visibleTransactions.length > 20) {
        showMoreBtn.classList.add('hidden');
        showLessBtn.classList.remove('hidden');
    } else {
        showMoreBtn.classList.add('hidden');
        showLessBtn.classList.add('hidden');
    }

    document.getElementById('tableSummary').textContent = 
        `מציג ${displayTransactions.length} עסקאות מתוך ${visibleTransactions.length} (סה"כ ${filteredData.length} נטענו)`;
    
    // Update deleted transactions table
    updateDeletedTransactionsTable();
}

function editTransactionClassification(transactionId, event) {
    if (event.target.tagName.toLowerCase() === 'select' || 
        event.target.tagName.toLowerCase() === 'button' ||
        event.target.tagName.toLowerCase() === 'td') {
        return; // Don't edit if clicking on controls
    }
    
    const classifications = ['חובה', 'רשות', 'מותרות'];
    const currentClassification = getTransactionClassification({id: transactionId});
    const currentIndex = classifications.indexOf(currentClassification);
    const nextIndex = (currentIndex + 1) % classifications.length;
    const newClassification = classifications[nextIndex];
    
    appState.manualClassifications[transactionId] = newClassification;
    updateDisplay();
    autoSaveToFirebase();
}

function updateTransactionCategory(transactionId, newCategory) {
    const transaction = appState.categorizedData.find(t => t.id === transactionId);
    if (transaction) {
        transaction.category = newCategory;
        transaction.classification = getCategoryClassification(newCategory);
        updateDisplay();
        autoSaveToFirebase();
    }
}

function toggleTransactionYearly(transactionId) {
    if (appState.yearlyExpenses.has(transactionId)) {
        appState.yearlyExpenses.delete(transactionId);
    } else {
        appState.yearlyExpenses.add(transactionId);
    }
    updateDisplay();
    autoSaveToFirebase();
}

function deleteTransaction(transactionId, button) {
    // מחיקה ללא שאלה כפי שביקשת
    appState.deletedTransactions.add(transactionId);
    button.closest('tr').style.opacity = '0.3';
    setTimeout(() => {
        updateDisplay();
        autoSaveToFirebase();
    }, 300);
}

function updateDeletedTransactionsTable() {
    const filteredData = getFilteredTransactions();
    const deletedTransactions = filteredData.filter(t => appState.deletedTransactions.has(t.id));

    const container = document.getElementById('deletedTransactionsContainer');
    const tbody = document.getElementById('deletedTransactionsTableBody');
    
    if (deletedTransactions.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    
    tbody.innerHTML = deletedTransactions.map(transaction => {
        const isYearly = appState.yearlyExpenses.has(transaction.id);
        const amountDisplay = isYearly ? 
            `₪${getDisplayAmount(transaction).toLocaleString()} (שנתי)` : 
            `₪${getDisplayAmount(transaction).toLocaleString()}`;
        
        return `
            <tr class="border-b border-red-200 hover:bg-red-100 cursor-pointer" onclick="restoreTransaction('${transaction.id}')">
                <td class="p-4 text-red-700">${transaction.date}</td>
                <td class="p-4 font-semibold text-red-800">${transaction.description}</td>
                <td class="p-4 font-bold text-red-700">${amountDisplay}</td>
                <td class="p-4 text-red-600">${transaction.category}</td>
                <td class="p-4 text-center">
                    <button onclick="restoreTransaction('${transaction.id}'); event.stopPropagation();" 
                            class="text-green-600 hover:bg-green-50 p-2 rounded-xl transition-colors text-lg" title="שחזר">
                        ↩️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function restoreTransaction(transactionId) {
    appState.deletedTransactions.delete(transactionId);
    updateDisplay();
    autoSaveToFirebase();
}

function toggleShowMoreTransactions() {
    appState.showAllTransactions = !appState.showAllTransactions;
    updateTransactionsTable();
}

// =========================
// SETTINGS FUNCTIONS
// =========================

function toggleSettings() {
    appState.showSettings = !appState.showSettings;
    const content = document.getElementById('settingsContent');
    const icon = document.getElementById('settingsIcon');
    const arrow = document.getElementById('settingsArrow');
    const text = document.getElementById('settingsText');
    
    if (appState.showSettings) {
        content.classList.remove('hidden');
        icon.style.transform = 'rotate(90deg)';
        arrow.style.transform = 'rotate(180deg)';
        text.textContent = 'הגדרות פתוחות';
    } else {
        content.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
        arrow.style.transform = 'rotate(0deg)';
        text.textContent = 'פתח הגדרות';
    }
}

function updateMinAmountFilter() {
    const value = document.getElementById('minAmountFilter').value;
    appState.minAmountFilter = Number(value);
    if (appState.categorizedData.length > 0) {
        updateDisplay();
        autoSaveToFirebase();
    }
}

function resetMinAmountFilter() {
    appState.minAmountFilter = 0;
    document.getElementById('minAmountFilter').value = '0';
    if (appState.categorizedData.length > 0) {
        updateDisplay();
        autoSaveToFirebase();
    }
}

// =========================
// INITIALIZATION
// =========================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOMContentLoaded: מנתח ההוצאות נטען...');
    
    // Check authentication status
    const isAuthenticated = await checkAuthStatus();
    
    if (isAuthenticated) {
        console.log('✅ DOMContentLoaded: משתמש מזוהה - ממשיך לטעינת נתונים');
        
        // Load data from Firebase
        await loadDataFromFirebase();
        
        // Load user's previous analysis if exists
        await loadUserAnalysis();
    }
    
    console.log('🎉 DOMContentLoaded: סיום אתחול מערכת');
});