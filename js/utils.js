// =========================
// UTILITY FUNCTIONS
// =========================

function getFilteredTransactions() {
    return appState.categorizedData.filter(transaction => {
        const amount = getDisplayAmount(transaction);
        return amount >= appState.minAmountFilter;
    });
}

// =========================
// SORTING FUNCTIONS
// =========================

function sortBusinessTable(field) {
    const currentOrder = appState.sortOrder.business;
    let newDirection = 'asc';
    
    if (currentOrder.field === field) {
        newDirection = currentOrder.direction === 'asc' ? 'desc' : 'asc';
    } else if (field === 'amount' || field === 'count') {
        newDirection = 'desc'; // Default to descending for numbers
    }
    
    appState.sortOrder.business = {field, direction: newDirection};
    
    // Update sort indicators
    document.querySelectorAll('#businessTable .sort-indicator').forEach(el => {
        el.textContent = '↕️';
    });
    
    const indicator = document.getElementById(`sort-${field}`);
    if (indicator) {
        indicator.textContent = newDirection === 'asc' ? '🔼' : '🔻';
    }
    
    updateBusinessAnalysis();
}

function sortTransactionsTable(field) {
    const currentOrder = appState.sortOrder.transactions;
    let newDirection = 'asc';
    
    if (currentOrder.field === field) {
        newDirection = currentOrder.direction === 'asc' ? 'desc' : 'asc';
    }
    
    appState.sortOrder.transactions = {field, direction: newDirection};
    
    // Update sort indicators
    document.querySelectorAll('#transactionsTable .sort-indicator').forEach(el => {
        el.textContent = '↕️';
    });
    
    const indicator = document.getElementById(`sort-trans-${field}`);
    if (indicator) {
        indicator.textContent = newDirection === 'asc' ? '🔼' : '🔻';
    }
    
    updateTransactionsTable();
}

// =========================
// EXPORT FUNCTIONS
// =========================

function exportBusinessMappings() {
    if (Object.keys(appState.businessMappings).length === 0) {
        alert('אין קטגוריות לייצוא. נתח קובץ קודם או הוסף קטגוריות ידנית.');
        return;
    }
    
    const businessData = Object.entries(appState.businessMappings).map(([business, category]) => ({
        'שם עסק': business,
        'קטגוריה': category
    }));
    
    const csv = Papa.unparse(businessData, { 
        header: true,
        encoding: 'utf-8'
    });
    
    const BOM = '\uFEFF';
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(BOM + csv));
    element.setAttribute('download', 'business-categories-' + new Date().toISOString().split('T')[0] + '.csv');
    element.style.display = 'none';
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// =========================
// SAVE STATE FUNCTION
// =========================

async function saveCurrentState() {
    try {
        // בדיקה שיש נתונים לשמירה
        if (!appState.categorizedData || appState.categorizedData.length === 0) {
            alert('אין נתונים לשמירה. נתח קובץ קודם.');
            return;
        }

        console.log('💾 מתחיל שמירת מצב נוכחי...');

        // שמירה בבסיס הנתונים
        await autoSaveToFirebase();
        console.log('✅ נשמר בבסיס הנתונים');

        // יצירת נתונים לייצוא
        const exportData = appState.categorizedData.map(transaction => ({
            'תאריך': transaction.date,
            'תיאור': transaction.description,
            'סכום': getDisplayAmount(transaction),
            'קטגוריה': transaction.category,
            'סיווג': getTransactionClassification(transaction),
            'הוצאה שנתית': appState.yearlyExpenses.has(transaction.id) ? 'כן' : 'לא',
            'נמחק': appState.deletedTransactions.has(transaction.id) ? 'כן' : 'לא',
            'מקור סיווג': transaction.source || 'אוטומטי'
        }));

        // יצירת CSV
        const csv = Papa.unparse(exportData, {
            header: true,
            encoding: 'utf-8'
        });

        // הורדת הקובץ
        const BOM = '\uFEFF';
        const element = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `מנתח-הוצאות-${timestamp}.csv`;
        
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(BOM + csv));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        console.log('✅ קובץ הורד בהצלחה:', filename);
        alert(`✅ הנתונים נשמרו!\n📁 קובץ הורד: ${filename}\n💾 נתונים נשמרו גם בבסיס הנתונים`);

    } catch (error) {
        console.error('❌ שגיאה בשמירת מצב:', error);
        alert('❌ שגיאה בשמירה: ' + error.message);
    }
}

// =========================
// RESET FUNCTIONS
// =========================

function resetAll() {
    if (confirm('האם אתה בטוח שברצונך לאפס את כל הנתונים?')) {
        appState.rawData = [];
        appState.extractedTransactions = [];
        appState.categorizedData = [];
        appState.businessMappings = {};
        appState.originalBusinessMappings = {};
        appState.deletedTransactions = new Set();
        appState.yearlyExpenses = new Set();
        appState.manualClassifications = {};
        appState.newBusinessesToSave = {};
        appState.minAmountFilter = 0;
        appState.uploadedFiles = [];
        appState.showAllBusinesses = false;
        appState.showAllTransactions = false;
        appState.showTransactions = false;
        appState.selectedCategoryDetails = null;
        
        if (appState.chartInstance) {
            appState.chartInstance.destroy();
            appState.chartInstance = null;
        }
        
        document.getElementById('minAmountFilter').value = '0';
        hideAllContainers();
        showFileUpload();
    }
}

// =========================
// UI CONTROL FUNCTIONS
// =========================

function hideFileUpload() {
    document.getElementById('fileUploadArea').style.display = 'none';
    // actionButtons now always visible in header
}

function showFileUpload() {
    document.getElementById('fileUploadArea').style.display = 'block';
    // actionButtons now always visible in header
}

function hideAllContainers() {
    const containersToHide = [
        'alertsContainer',
        'chartContainer', 
        'businessAnalysisContainer',
        'resultsContainer',
        'transactionsContainer',
        'exportCategoriesButton'
    ];
    
    containersToHide.forEach(containerId => {
        const element = document.getElementById(containerId);
        if (element) {
            element.classList.add('hidden');
        }
    });
}