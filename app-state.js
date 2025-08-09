// =========================
// GLOBAL APPLICATION STATE
// =========================

// Global state
let appState = {
    rawData: [],
    extractedTransactions: [],
    categorizedData: [],
    businessMappings: {},
    originalBusinessMappings: {},
    deletedTransactions: new Set(),
    yearlyExpenses: new Set(),
    manualClassifications: {},
    showSettings: false,
    showTransactions: false,
    minAmountFilter: 0,
    uploadedFiles: [],
    loadedKeywords: {},
    loadedBusinessDatabase: {},
    newBusinessesToSave: {},
    currentUser: null,
    chartInstance: null,
    sortOrder: {
        business: {field: 'amount', direction: 'desc'},
        transactions: {field: null, direction: null}
    },
    showAllBusinesses: false,
    showAllTransactions: false,
    selectedCategoryDetails: null
};