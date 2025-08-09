// =========================
// FIREBASE FUNCTIONS
// =========================

async function testFirebaseConnection() {
    console.log('🔍 testFirebaseConnection: התחלה');
    
    try {
        if (!window.firebaseDb) {
            console.error('🔍 testFirebaseConnection: Firebase DB לא מאותחל!');
            throw new Error('Firebase DB not initialized');
        }
        
        console.log('🔍 testFirebaseConnection: Firebase DB נראה מאותחל, מנסה קריאת בדיקה...');
        
        // נסה לבצע קריאה בסיסית
        const testQuery = window.collection(window.firebaseDb, 'smartkeywords');
        console.log('🔍 testFirebaseConnection: יצרתי query, מנסה getDocs...');
        
        const snapshot = await window.getDocs(testQuery);
        console.log('🔍 testFirebaseConnection: קיבלתי snapshot! גודל:', snapshot.size);
        
        console.log('✅ testFirebaseConnection: חיבור לבסיס הנתונים פעיל!');
        return true;
        
    } catch (error) {
        console.error('❌ testFirebaseConnection: בעיית חיבור!');
        console.error('❌ testFirebaseConnection - סוג השגיאה:', error.name);
        console.error('❌ testFirebaseConnection - הודעת השגיאה:', error.message); 
        console.error('❌ testFirebaseConnection - קוד השגיאה:', error.code);
        console.error('❌ testFirebaseConnection - מלא stack trace:', error.stack);
        return false;
    }
}

async function loadDataFromFirebase() {
    console.log('🚀 התחלת טעינת נתונים מבסיס הנתונים...');
    
    try {
        showLoadingFirebase();
        console.log('📱 הצגת מסך טעינה');
        
        // בדיקת חיבור ראשונית
        console.log('🔍 בודק חיבור...');
        const isConnected = await testFirebaseConnection();
        console.log('🔍 תוצאת בדיקת חיבור:', isConnected);
        
        if (!isConnected) {
            throw new Error('אין חיבור לבסיס הנתונים');
        }
        
        // Load keywords
        console.log('📝 מתחיל טעינת מילון חכם...');
        updateLoadingStatus('loadingKeywords', 'טוען מילון חכם...');
        
        let keywordsSnapshot;
        try {
            console.log('📊 מבצע קריאה ל-collection: smartkeywords');
            keywordsSnapshot = await window.getDocs(window.collection(window.firebaseDb, 'smartkeywords'));
            console.log('📊 Keywords snapshot קיבלתי! גודל:', keywordsSnapshot.size);
        } catch (keywordError) {
            console.error('❌ שגיאה בטעינת keywords:', keywordError);
            throw new Error(`שגיאה בטעינת מילון חכם: ${keywordError.message}`);
        }
        
        console.log('🔄 מתחיל עיבוד מילון חכם...');
        appState.loadedKeywords = {};
        
        keywordsSnapshot.forEach((doc, index) => {
            try {
                const data = doc.data();
                console.log(`📝 Processing keyword ${index + 1}/${keywordsSnapshot.size}:`, data);
                
                const keyword = data['מילת מפתח'] || data.keyword || data['מילה'];
                const category = data['קטגוריה'] || data.category || data['סיווג'];
                
                if (keyword && category) {
                    const keywordLower = keyword.toLowerCase().trim();
                    const categoryTrimmed = category.trim();
                    appState.loadedKeywords[keywordLower] = categoryTrimmed;
                    console.log(`✅ Added keyword: "${keyword}" -> "${category}"`);
                }
            } catch (docError) {
                console.error(`❌ Error processing keyword document ${index + 1}:`, docError);
            }
        });
        
        const keywordsCount = Object.keys(appState.loadedKeywords).length;
        console.log(`📊 סיום עיבוד מילון חכם: ${keywordsCount} לוגיקות נטענו`);
        
        updateLoadingStatus('loadingKeywords', `✅ ${keywordsCount} לוגיקות נטענו`);
        
        // Load business database
        console.log('🏪 מתחיל טעינת מאגר עסקים...');
        updateLoadingStatus('loadingBusinesses', 'טוען מאגר עסקים...');
        
        let businessSnapshot;
        try {
            console.log('📊 מבצע קריאה ל-collection: businessdatabase');
            businessSnapshot = await window.getDocs(window.collection(window.firebaseDb, 'businessdatabase'));
            console.log('📊 Business snapshot קיבלתי! גודל:', businessSnapshot.size);
        } catch (businessError) {
            console.error('❌ שגיאה בטעינת businesses:', businessError);
            throw new Error(`שגיאה בטעינת מאגר עסקים: ${businessError.message}`);
        }
        
        console.log('🔄 מתחיל עיבוד מאגר עסקים...');
        appState.loadedBusinessDatabase = {};
        
        businessSnapshot.forEach((doc, index) => {
            try {
                const data = doc.data();
                console.log(`🏪 Processing business ${index + 1}/${businessSnapshot.size}:`, data);
                
                const business = data['שם עסק'] || data.business || data['עסק'];
                const category = data['קטגוריה'] || data.category || data['סיווג'];
                
                if (business && category) {
                    const businessLower = business.toLowerCase().trim();
                    const categoryTrimmed = category.trim();
                    appState.loadedBusinessDatabase[businessLower] = categoryTrimmed;
                    console.log(`✅ Added business: "${business}" -> "${category}"`);
                }
            } catch (docError) {
                console.error(`❌ Error processing business document ${index + 1}:`, docError);
            }
        });
        
        const businessesCount = Object.keys(appState.loadedBusinessDatabase).length;
        console.log(`📊 סיום עיבוד מאגר עסקים: ${businessesCount} עסקים נטענו`);
        
        updateLoadingStatus('loadingBusinesses', `✅ ${businessesCount} עסקים נטענו`);
        
        const totalKeywords = Object.keys(appState.loadedKeywords).length;
        const totalBusinesses = Object.keys(appState.loadedBusinessDatabase).length;
        
        console.log(`📊 סיכום: ${totalKeywords} keywords, ${totalBusinesses} businesses`);
        
        if (totalKeywords === 0 && totalBusinesses === 0) {
            console.warn('⚠️ לא נטענו נתונים - מעבר לברירת מחדל');
            throw new Error('לא נמצאו נתונים בבסיס הנתונים');
        }
        
        // Success - הכל עבר בהצלחה
        console.log('✅ הצלחה! מסתיר מסך טעינה ומציג הודעת הצלחה');
        hideLoadingFirebase();
        showSuccessNotification();
        updateStatsDisplay();
        
        console.log('🎉 נטען מאגר נתונים בהצלחה! סיכום סופי:', {
            keywords: totalKeywords,
            businesses: totalBusinesses,
            status: 'success'
        });
        
    } catch (error) {
        console.error('💥 שגיאה בטעינת נתונים - התחלת fallback:', error);
        
        showLoadingError();
        hideLoadingFirebase();
        
        // Fallback to basic data
        console.log('🔄 מעבר לנתונים בסיסיים...');
        initializeFallbackData();
    }
}

function initializeFallbackData() {
    console.log('🔄 initializeFallbackData: התחלת אתחול נתונים בסיסיים...');
    
    appState.loadedKeywords = {
        'ביטוח': 'ביטוח',
        'משכנתא': 'דיור',
        'bit': 'החזר חוב',
        'paypal': 'החזר חוב',
        'מרקחת': 'בריאות',
        'בית מרקחת': 'בריאות',
        'שופרסל': 'מזון',
        'רמי לוי': 'מזון',
        'מחסני השוק': 'מזון',
        'דלק': 'רכב',
        'סונול': 'רכב',
        'פז': 'רכב',
        'קפה': 'פנאי',
        'מסעדה': 'פנאי',
        'בנק': 'חשבונות',
        'בנק הפועלים': 'חשבונות',
        'בנק לאומי': 'חשבונות',
        'בית ספר': 'חינוך',
        'איקאה': 'קניות לבית',
        'השקעות': 'השקעות',
        'חשמל': 'חשבונות',
        'מים': 'חשבונות',
        'גז': 'חשבונות',
        'ארנונה': 'חשבונות',
        'פלאפון': 'חשבונות',
        'בזק': 'חשבונות',
        'hot': 'חשבונות',
        'netflix': 'פנאי',
        'spotify': 'פנאי'
    };
    
    appState.loadedBusinessDatabase = {
        'שופרסל': 'מזון',
        'רמי לוי': 'מזון',
        'מחסני השוק': 'מזון',
        'יינות ביתן': 'מזון',
        'דור אלון': 'רכב',
        'סונול': 'רכב',
        'פז': 'רכב',
        'ביטוח ישיר': 'ביטוח',
        'מנורה מבטחים': 'ביטוח',
        'כללית': 'בריאות',
        'מכבי': 'בריאות',
        'איקאה': 'קניות לבית',
        'זארה': 'קניות לבית',
        'h&m': 'קניות לבית',
        'בנק הפועלים': 'חשבונות',
        'בנק לאומי': 'חשבונות',
        'דיסקונט': 'חשבונות',
        'מזדה': 'רכב',
        'טויוטה': 'רכב',
        'סוזוקי': 'רכב'
    };
    
    const keywordsCount = Object.keys(appState.loadedKeywords).length;
    const businessesCount = Object.keys(appState.loadedBusinessDatabase).length;
    
    console.log('✅ initializeFallbackData: נתונים בסיסיים הוכנו!', {
        keywords: keywordsCount,
        businesses: businessesCount
    });
    
    updateStatsDisplay();
    showSuccessNotification();
}

async function autoSaveToFirebase() {
    try {
        if (!appState.currentUser || appState.categorizedData.length === 0) {
            return;
        }

        console.log('💾 Auto-saving to Firebase...');
        
        const userAnalysisRef = window.doc(window.firebaseDb, 'userAnalysis', appState.currentUser.uid);
        
        const analysisData = {
            userId: appState.currentUser.uid,
            userEmail: appState.currentUser.email,
            lastUpdated: new Date().toISOString(),
            transactions: appState.categorizedData.map(transaction => ({
                id: transaction.id,
                date: transaction.date,
                description: transaction.description,
                amount: transaction.amount,
                category: transaction.category,
                classification: getTransactionClassification(transaction),
                isYearly: appState.yearlyExpenses.has(transaction.id),
                isDeleted: appState.deletedTransactions.has(transaction.id)
            })),
            businessMappings: appState.businessMappings,
            manualClassifications: appState.manualClassifications,
            minAmountFilter: appState.minAmountFilter
        };

        await window.setDoc(userAnalysisRef, analysisData);
        
        // Save new businesses to the shared database
        await saveNewBusinessesToDatabase();
        
        console.log('✅ Auto-save completed successfully');
        
    } catch (error) {
        console.error('❌ Auto-save failed:', error);
    }
}

async function saveNewBusinessesToDatabase() {
    try {
        if (Object.keys(appState.newBusinessesToSave).length === 0) {
            return;
        }

        console.log('💾 Saving new businesses to database:', appState.newBusinessesToSave);
        
        for (const [businessName, category] of Object.entries(appState.newBusinessesToSave)) {
            await window.addDoc(window.collection(window.firebaseDb, 'businessdatabase'), {
                'שם עסק': businessName,
                'קטגוריה': category,
                'נוסף על ידי': appState.currentUser.email,
                'תאריך הוספה': new Date().toISOString()
            });
        }
        
        // Add to local database
        Object.entries(appState.newBusinessesToSave).forEach(([business, category]) => {
            appState.loadedBusinessDatabase[business.toLowerCase()] = category;
        });
        
        // Clear the new businesses queue
        appState.newBusinessesToSave = {};
        updateStatsDisplay();
        
        console.log('✅ New businesses saved successfully');
        
    } catch (error) {
        console.error('❌ Failed to save new businesses:', error);
    }
}

async function loadUserAnalysis() {
    try {
        if (!appState.currentUser) return;

        const userAnalysisDoc = await window.getDoc(window.doc(window.firebaseDb, 'userAnalysis', appState.currentUser.uid));
        
        if (userAnalysisDoc.exists()) {
            const data = userAnalysisDoc.data();
            
            if (data.transactions && data.transactions.length > 0) {
                appState.categorizedData = data.transactions.map(t => ({
                    id: t.id,
                    date: t.date,
                    description: t.description,
                    amount: t.amount,
                    category: t.category,
                    classification: t.classification,
                    originalRow: 0
                }));

                appState.extractedTransactions = [...appState.categorizedData];
                appState.businessMappings = data.businessMappings || {};
                appState.manualClassifications = data.manualClassifications || {};
                appState.minAmountFilter = data.minAmountFilter || 0;
                
                appState.yearlyExpenses = new Set();
                appState.deletedTransactions = new Set();
                
                data.transactions.forEach(t => {
                    if (t.isYearly) appState.yearlyExpenses.add(t.id);
                    if (t.isDeleted) appState.deletedTransactions.add(t.id);
                });

                document.getElementById('minAmountFilter').value = appState.minAmountFilter;
                
                hideFileUpload();
                updateDisplay();
                
                console.log('✅ נתוני משתמש נטענו מבסיס הנתונים');
            }
        }
    } catch (error) {
        console.error('❌ שגיאה בטעינת נתוני משתמש:', error);
    }
}

async function saveClaudeClassifiedBusinesses(businessCategories) {
    try {
        console.log('💾 Saving Claude classifications to Firebase...');
        
        for (const [businessName, category] of Object.entries(businessCategories)) {
            await window.addDoc(window.collection(window.firebaseDb, 'businessdatabase'), {
                'שם עסק': businessName,
                'קטגוריה': category,
                'נוסף על ידי': 'Claude API',
                'מקור': 'AI Classification',
                'תאריך הוספה': new Date().toISOString()
            });
            
            // עדכון גם במאגר המקומי
            appState.loadedBusinessDatabase[businessName.toLowerCase()] = category;
        }
        
        console.log('✅ Claude classifications saved successfully');
        updateStatsDisplay();
        
    } catch (error) {
        console.error('❌ Failed to save Claude classifications:', error);
    }
}

// =========================
// LOADING STATUS FUNCTIONS
// =========================

function updateLoadingStatus(elementId, message) {
    console.log(`🔄 updateLoadingStatus: מעדכן ${elementId} עם הודעה: ${message}`);
    
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>${message}</span>
        `;
    }
}

function showLoadingFirebase() {
    const loadingElement = document.getElementById('loadingFirebase');
    if (loadingElement) {
        loadingElement.classList.remove('hidden');
    }
}

function hideLoadingFirebase() {
    const loadingElement = document.getElementById('loadingFirebase');
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
}

function showLoadingError() {
    const errorElement = document.getElementById('loadingError');
    if (errorElement) {
        errorElement.classList.remove('hidden');
    }
}

function hideLoadingError() {
    const errorElement = document.getElementById('loadingError');
    if (errorElement) {
        errorElement.classList.add('hidden');
    }
}

function showSuccessNotification() {
    const keywordsCount = Object.keys(appState.loadedKeywords).length;
    const businessesCount = Object.keys(appState.loadedBusinessDatabase).length;
    
    const keywordsLoadedElement = document.getElementById('keywordsLoaded');
    const businessesLoadedElement = document.getElementById('businessesLoaded');
    
    if (keywordsLoadedElement) {
        keywordsLoadedElement.textContent = keywordsCount;
    }
    
    if (businessesLoadedElement) {
        businessesLoadedElement.textContent = businessesCount;
    }
    
    const notification = document.getElementById('successNotification');
    if (notification) {
        notification.classList.remove('hidden');
        notification.classList.add('pulse-success');
        
        setTimeout(() => {
            notification.classList.add('hidden');
            notification.classList.remove('pulse-success');
        }, 5000);
    }
}

async function retryLoadingData() {
    console.log('🔄 retryLoadingData: מנסה שוב לטעון נתונים...');
    hideLoadingError();
    hideAllContainers();
    
    try {
        await loadDataFromFirebase();
    } catch (error) {
        console.error('❌ retryLoadingData: ניסיון חוזר נכשל:', error);
        showLoadingError();
    }
}

function hideLoadingErrorAndContinue() {
    console.log('🔄 hideLoadingErrorAndContinue: ממשיך עם נתונים בסיסיים');
    hideLoadingError();
    
    if (Object.keys(appState.loadedKeywords).length === 0 && Object.keys(appState.loadedBusinessDatabase).length === 0) {
        initializeFallbackData();
    }
    
    showSuccessNotification();
}

function updateStatsDisplay() {
    const keywordsCount = Object.keys(appState.loadedKeywords).length;
    const businessesCount = Object.keys(appState.loadedBusinessDatabase).length;
    const businessMappingsCount = Object.keys(appState.businessMappings).length;
    const uploadedFilesCount = appState.uploadedFiles.length;
    const newBusinessesCount = Object.keys(appState.newBusinessesToSave).length;
    
    // עדכון אלמנטים שעדיין קיימים
    const dynamicKeywordsElement = document.getElementById('dynamicKeywordsCount');
    if (dynamicKeywordsElement) {
        dynamicKeywordsElement.textContent = keywordsCount;
    }
    
    const dynamicBusinessesElement = document.getElementById('dynamicBusinessesCount');
    if (dynamicBusinessesElement) {
        dynamicBusinessesElement.textContent = businessesCount;
    }
    
    const loadedKeywordsElement = document.getElementById('loadedKeywords');
    if (loadedKeywordsElement) {
        loadedKeywordsElement.textContent = keywordsCount;
    }
    
    const loadedBusinessesElement = document.getElementById('loadedBusinesses');
    if (loadedBusinessesElement) {
        loadedBusinessesElement.textContent = businessesCount;
    }
    
    const newBusinessesElement = document.getElementById('newBusinesses');
    if (newBusinessesElement) {
        newBusinessesElement.textContent = newBusinessesCount;
    }
    
    const filesProcessedElement = document.getElementById('filesProcessed');
    if (filesProcessedElement) {
        filesProcessedElement.textContent = uploadedFilesCount;
    }
}