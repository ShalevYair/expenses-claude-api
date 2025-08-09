// =========================
// FILE UPLOAD FUNCTIONS
// =========================

async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    appState.uploadedFiles = files.map(f => f.name);
    let allData = [];
    let filesProcessed = 0;
    
    for (const file of files) {
        try {
            let fileData = [];
            
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                await new Promise((resolve, reject) => {
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            fileData = results.data;
                            resolve();
                        },
                        error: (error) => {
                            reject(error);
                        }
                    });
                });
            } else {
                alert('קובץ ' + file.name + ' לא נתמך - רק קבצי CSV');
                continue;
            }
            
            allData = [...allData, ...fileData];
            filesProcessed++;
            
        } catch (error) {
            alert('שגיאה בעיבוד הקובץ ' + file.name + ': ' + error.message);
            console.error('שגיאה בעיבוד קובץ:', error);
        }
    }
    
    if (filesProcessed > 0 && allData.length > 0) {
        appState.rawData = allData;
        appState.extractedTransactions = [];
        appState.categorizedData = [];
        appState.yearlyExpenses = new Set();
        appState.manualClassifications = {};
        appState.newBusinessesToSave = {};
        appState.originalBusinessMappings = {...appState.businessMappings};
        hideFileUpload();
        
        setTimeout(() => {
            analyzeFileData(allData);
        }, 500);
    } else {
        alert('לא נמצאו נתונים תקינים בקבצים');
    }
}

async function analyzeFileData(dataToAnalyze) {
    if (!dataToAnalyze || dataToAnalyze.length === 0) {
        alert('לא נמצאו נתונים לניתוח');
        showFileUpload();
        return;
    }
    
    const availableColumns = Object.keys(dataToAnalyze[0] || {});
    
    if (availableColumns.length === 0) {
        alert('קובץ ריק או לא תקין');
        showFileUpload();
        return;
    }
    
    // Auto-detect columns
    let amountCol = availableColumns.find(col => {
        const colLower = col.toLowerCase();
        return (colLower.includes('סכום') || 
               colLower.includes('amount') ||
               colLower.includes('קנייה') ||
               colLower.includes('חיוב') ||
               colLower.includes('ש"ח') ||
               colLower.includes('שח') ||
               colLower.includes('debit') ||
               colLower.includes('credit')) && 
               col.length < 50;
    }) || '';
    
    let descriptionCol = availableColumns.find(col => {
        const colLower = col.toLowerCase();
        return (colLower.includes('בית') || 
               colLower.includes('עסק') || 
               colLower.includes('תיאור') ||
               colLower.includes('שם') ||
               colLower.includes('business') ||
               colLower.includes('description') ||
               colLower.includes('מקום') ||
               colLower.includes('ספק') ||
               colLower.includes('פירוט')) && 
               col.length < 100;
    }) || '';
    
    let dateCol = availableColumns.find(col => {
        const colLower = col.toLowerCase();
        return (colLower.includes('תאריך') || 
               colLower.includes('date') ||
               colLower.includes('יום')) && 
               col.length < 50;
    }) || '';
    
    // Fallback detection
    if (!amountCol) {
        for (const col of availableColumns) {
            if (col.length > 50) continue;
            
            const sampleValues = dataToAnalyze.slice(0, 10).map(row => row[col]).filter(val => val);
            const hasNumbers = sampleValues.some(val => {
                const str = val?.toString().trim();
                if (!str || str.length > 20) return false;
                
                const cleanStr = str.replace(/[^\d.,\-]/g, '');
                return cleanStr.length > 0 && 
                       /^\d{1,7}([,.]?\d{0,3})?$/.test(cleanStr) && 
                       parseFloat(cleanStr.replace(',', '')) > 0 &&
                       parseFloat(cleanStr.replace(',', '')) < 1000000;
            });
            if (hasNumbers) {
                amountCol = col;
                break;
            }
        }
    }
    
    if (!descriptionCol) {
        for (const col of availableColumns) {
            if (col !== amountCol && col !== dateCol && col.length < 100) {
                const sampleValues = dataToAnalyze.slice(0, 10).map(row => row[col]).filter(val => val);
                const hasText = sampleValues.some(val => {
                    const str = val?.toString().trim();
                    return str && str.length > 3 && str.length < 200 && /[א-ת\w]/.test(str);
                });
                if (hasText) {
                    descriptionCol = col;
                    break;
                }
            }
        }
    }
    
    if (!amountCol && availableColumns.length > 1) {
        amountCol = availableColumns[availableColumns.length - 1];
    }
    
    if (!descriptionCol && availableColumns.length > 0) {
        descriptionCol = availableColumns.find(col => col !== amountCol && col !== dateCol) || availableColumns[0];
    }
    
    if (!dateCol && availableColumns.length > 2) {
        dateCol = availableColumns[0];
    }
    
    if (!amountCol || !descriptionCol) {
        alert('🚨 לא הצלחתי לזהות עמודות חיוניות בקובץ\n\nעמודות שנמצאו בקובץ: ' + availableColumns.join(', ') + '\n\nעמודות שזוהו:\n- עמודת סכום: ' + (amountCol || 'לא נמצא') + '\n- עמודת תיאור: ' + (descriptionCol || 'לא נמצא') + '\n- עמודת תאריך: ' + (dateCol || 'לא נמצא'));
        showFileUpload();
        return;
    }
    
    try {
        // Extract transactions
        const transactions = [];
        
        dataToAnalyze.forEach((row, idx) => {
            const dateValue = dateCol ? row[dateCol] : '';
            const amountValue = amountCol ? row[amountCol] : '';
            const descValue = descriptionCol ? row[descriptionCol] : '';
            
            if (amountValue && descValue) {
                const amountStr = amountValue?.toString().trim();
                const descStr = descValue?.toString().trim().toLowerCase();
                
                if (!amountStr || amountStr.length > 20 || 
                    amountStr.includes('פירוט') || amountStr.includes('עסקאות') ||
                    amountStr.includes('חשבון') || amountStr.includes('דיסקונט')) {
                    return;
                }
                
                if (descStr.includes('סה"כ') || descStr.includes('סה״כ') || 
                    descStr.includes('סך הכל') || descStr.includes('סכום כולל') ||
                    descStr.includes('סיכום') || descStr.includes('total') || 
                    descStr.includes('sum') || descStr.includes('סה׳׳כ') ||
                    descStr.includes('עד היום') || descStr.includes('מצב סופי') ||
                    descStr.includes('יתרה') || descStr.includes('balance')) {
                    return;
                }
                
                const cleanAmount = amountStr.replace(/[^\d.,-]/g, '').replace(/,/g, '');
                
                if (!/^\d+\.?\d*$/.test(cleanAmount)) {
                    return;
                }
                
                const numAmount = parseFloat(cleanAmount) || 0;
                
                if (numAmount > 0 && numAmount < 1000000) {
                    transactions.push({
                        id: 'tx_' + idx,
                        date: dateValue?.toString().trim() || '',
                        description: descValue?.toString().trim() || 'לא צוין',
                        amount: Math.floor(numAmount),
                        originalRow: idx,
                        category: 'לא מסווג',
                        rawData: row
                    });
                }
            }
        });
        
        if (transactions.length === 0) {
            alert('לא נמצאו עסקאות תקינות בקובץ.');
            showFileUpload();
            return;
        }
        
        appState.extractedTransactions = transactions;
        
        // Categorize transactions using the smart system with Claude backup
        await categorizeTransactionsWithSmartSystem(transactions);
        
    } catch (error) {
        console.error('❌ שגיאה בניתוח:', error);
        alert('שגיאה בניתוח: ' + error.message);
        showFileUpload();
    }
}

// =========================
// CATEGORIZATION FUNCTIONS - WITH CLAUDE INTEGRATION
// =========================

function getCategoryClassification(category) {
    const categoryClassification = {
        'מזון': 'חובה',
        'רכב': 'חובה', 
        'בריאות': 'חובה',
        'ביטוח': 'חובה',
        'חשבונות': 'חובה',
        'חינוך': 'חובה',
        'דיור': 'חובה',
        'החזר חוב': 'חובה',
        'קניות לבית': 'רשות',
        'השקעות': 'רשות',
        'פנאי': 'מותרות',
        'אחר': 'רשות'
    };
    return categoryClassification[category] || 'רשות';
}

function getDisplayAmount(transaction) {
    if (appState.yearlyExpenses.has(transaction.id)) {
        const monthsInData = getMonthsCount();
        return Math.floor((transaction.amount / 12) * monthsInData);
    }
    return transaction.amount;
}

function getTransactionClassification(transaction) {
    if (appState.manualClassifications[transaction.id]) {
        return appState.manualClassifications[transaction.id];
    }
    return transaction.classification || getCategoryClassification(transaction.category);
}

function getMonthsCount() {
    if (!appState.categorizedData || appState.categorizedData.length === 0) {
        return 1; // ברירת מחדל
    }
    
    const monthsSet = new Set();
    
    appState.categorizedData.forEach(transaction => {
        if (transaction.date && transaction.date.trim()) {
            try {
                // ניסיון לפרס תאריכים בפורמטים שונים
                let date;
                const dateStr = transaction.date.trim();
                
                // פורמטים נפוצים: DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        date = new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                } else if (dateStr.includes('.')) {
                    const parts = dateStr.split('.');
                    if (parts.length === 3) {
                        date = new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                } else if (dateStr.includes('-')) {
                    date = new Date(dateStr);
                } else {
                    return; // תאריך לא מזוהה
                }
                
                if (date && !isNaN(date.getTime())) {
                    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    monthsSet.add(monthYear);
                }
            } catch (error) {
                // התעלם משגיאות פרסור תאריכים
            }
        }
    });
    
    const monthsCount = monthsSet.size;
    console.log(`📅 נמצאו ${monthsCount} חודשים בדוח:`, Array.from(monthsSet));
    
    return monthsCount > 0 ? monthsCount : 1;
}

// פונקציה מעודכנת לסיווג עסקאות עם גיבוי קלוד
async function categorizeTransactionsWithSmartSystem(transactions) {
    const categorized = [];
    const unknownBusinesses = new Map(); // משתמשים ב-Map כדי לעקוב אחר סכומים
    
    // שלב 1: סיווג רגיל עם האלגוריתם הקיים
    for (const transaction of transactions) {
        const desc = transaction.description.toLowerCase();
        let category = null;
        let source = '';
        
        // בדיקת mapping ידני
        const exactMatch = Object.keys(appState.businessMappings).find(business => 
            desc.includes(business.toLowerCase())
        );
        
        if (exactMatch) {
            category = appState.businessMappings[exactMatch];
            source = 'ידני';
        } else {
            // בדיקת מאגר עסקים
            const dbMatch = Object.keys(appState.loadedBusinessDatabase).find(business => 
                desc.includes(business.toLowerCase())
            );
            
            if (dbMatch) {
                category = appState.loadedBusinessDatabase[dbMatch];
                source = 'מאגר';
            } else {
                // בדיקת מילות מפתח
                let foundKeyword = false;
                for (const [keyword, keywordCategory] of Object.entries(appState.loadedKeywords)) {
                    if (desc.includes(keyword.toLowerCase())) {
                        category = keywordCategory;
                        source = 'מילות מפתח';
                        foundKeyword = true;
                        break;
                    }
                }
                
                // אנגלית = פנאי
                if (!foundKeyword && /[a-zA-Z]/.test(transaction.description)) {
                    category = 'פנאי';
                    source = 'אנגלית';
                }
                
                // לא נמצא - הוספה לעסקים לא ידועים
                if (!category) {
                    const businessName = transaction.description.trim();
                    
                    if (!unknownBusinesses.has(businessName)) {
                        unknownBusinesses.set(businessName, 0);
                    }
                    unknownBusinesses.set(businessName, 
                        unknownBusinesses.get(businessName) + transaction.amount
                    );
                    
                    category = 'אחר';
                    source = 'לא זוהה';
                }
            }
        }
        
        categorized.push({
            ...transaction,
            category: category,
            classification: category ? getCategoryClassification(category) : 'רשות',
            source
        });
    }
    
    // שלב 2: טיפול בעסקים לא ידועים עם קלוד
    if (unknownBusinesses.size > 0) {
        console.log(`🔍 Found ${unknownBusinesses.size} unknown businesses, checking Claude eligibility...`);
        
        // סינון לטופ 10 עם יותר מ-100 שקל
        const eligibleBusinesses = Array.from(unknownBusinesses.entries())
            .filter(([business, amount]) => amount >= 100)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([business]) => business);
        
        if (eligibleBusinesses.length > 0) {
            console.log(`🤖 Sending ${eligibleBusinesses.length} businesses to Claude:`, eligibleBusinesses);
            
            // שליחה לקלוד
            const claudeResult = await classifyWithClaude(eligibleBusinesses);
            
            if (claudeResult) {
                // עיבוד תוצאות
                const businessCategories = processClaudeResults(eligibleBusinesses, claudeResult);
                
                if (Object.keys(businessCategories).length > 0) {
                    // שמירה ב-Firebase
                    await saveClaudeClassifiedBusinesses(businessCategories);
                    
                    // עדכון העסקאות הקיימות עם הסיווג החדש
                    categorized.forEach(transaction => {
                        if (businessCategories[transaction.description.trim()]) {
                            const newCategory = businessCategories[transaction.description.trim()];
                            transaction.category = newCategory;
                            transaction.classification = getCategoryClassification(newCategory);
                            transaction.source = 'Claude AI';
                        }
                    });
                    
                    console.log(`✅ Updated ${Object.keys(businessCategories).length} businesses with Claude classifications`);
                }
            }
        } else {
            console.log('ℹ️ No businesses eligible for Claude classification (need >100₪)');
        }
    }
    
    // שלב 3: סימון הוצאות שנתיות ושמירה
    const newYearlyExpenses = new Set(appState.yearlyExpenses);
    categorized.forEach(transaction => {
        if (transaction.category === 'קניות לבית') {
            newYearlyExpenses.add(transaction.id);
        }
    });
    appState.yearlyExpenses = newYearlyExpenses;

    appState.categorizedData = categorized;
    updateDisplay();
    
    // שמירה אוטומטית
    await autoSaveToFirebase();
}

// =========================
// CLAUDE API INTEGRATION
// =========================

// פונקציה לקריאה ל-Claude API דרך Netlify Function
async function classifyWithClaude(businessList) {
    try {
        console.log('🤖 Sending to Claude API:', businessList);
        
        const response = await fetch('/.netlify/functions/classify-business', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                businessList: businessList.join(', ')
            })
        });
        
        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Claude API response:', data);
        
        return data.classification;
        
    } catch (error) {
        console.error('❌ Claude API failed:', error);
        return null;
    }
}

// פונקציה לעיבוד תוצאות קלוד וממפוי קטגוריות
function processClaudeResults(businessList, categoriesString) {
    if (!categoriesString) return {};
    
    const categoryMap = {
        'Vehicle': 'רכב', 'Food': 'מזון', 'Shopping': 'קניות לבית',
        'Debt': 'החזר חוב', 'Entertainment': 'פנאי', 'Insurance': 'ביטוח',
        'Education': 'חינוך', 'Bills': 'חשבונות', 'Health': 'בריאות', 
        'Housing': 'דיור'
    };
    
    const businesses = businessList;
    const categories = categoriesString.split(',').map(c => c.trim());
    
    const results = {};
    for (let i = 0; i < businesses.length && i < categories.length; i++) {
        const business = businesses[i];
        const englishCategory = categories[i];
        const hebrewCategory = categoryMap[englishCategory] || 'אחר';
        
        results[business] = hebrewCategory;
        console.log(`🎯 Claude classified: ${business} → ${hebrewCategory}`);
    }
    
    return results;
}