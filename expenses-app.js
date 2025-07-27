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

// ========================= 
// CONFIGURATION & CONSTANTS
// =========================

const CONFIG = {
    MINIMUM_COMPLEXITY_THRESHOLD: 3,  // היה 8 ←
    MINIMUM_SCORE_THRESHOLD: 10,      // היה 25 ←  
    MINIMUM_TABLE_ROWS: 1,            // היה 3 ←
    MAXIMUM_AMOUNT: 1000000,
    DATE_CONFIDENCE_THRESHOLD: 0.5,   // היה 0.7 ←
    AMOUNT_CONFIDENCE_THRESHOLD: 0.5, // היה 0.7 ←
    TEXT_CONFIDENCE_THRESHOLD: 0.4    // היה 0.6 ←
};

const KEYWORDS = {
    DATE_KEYWORDS: ['תאריך', 'date', 'יום', 'עסקה', 'transaction', 'ערך'],
    AMOUNT_KEYWORDS: ['סכום', 'amount', 'חיוב', 'זכות', 'עסקה', 'קנייה', 'ש"ח', 'שח'],
    DESCRIPTION_KEYWORDS: ['בית עסק', 'תיאור', 'פירוט', 'עסק', 'business', 'description', 'מנפיק'],
    POSITIVE_TABLE_KEYWORDS: ['פירוט', 'עסקאות', 'תנועות', 'פעילות'],
    NEGATIVE_TABLE_KEYWORDS: ['עתידי', 'סיכום', 'סה"כ', 'לא סופי', 'יתרה', 'balance']
};

// ========================= 
// AUTHENTICATION FUNCTIONS
// =========================

function checkAuthStatus() {
    console.log('🔐 checkAuthStatus: התחלה');
    
    return new Promise((resolve) => {
        // בדיקה ראשונית ב-localStorage
        console.log('🔐 checkAuthStatus: בודק localStorage...');
        const currentUser = localStorage.getItem('currentUser');
        
        if (currentUser) {
            console.log('🔐 checkAuthStatus: נמצא משתמש ב-localStorage');
            
            try {
                const userData = JSON.parse(currentUser);
                console.log('✅ checkAuthStatus: פרסרתי נתוני משתמש מ-localStorage:', userData.email);
                
                // הגדרת המשתמש מיד
                appState.currentUser = {
                    uid: userData.id || 'local-user',
                    email: userData.email,
                    displayName: userData.name,
                    photoURL: userData.photoURL || '/api/placeholder/40/40'
                };
                
                console.log('🔐 checkAuthStatus: הגדרתי currentUser:', appState.currentUser);
                
                console.log('🔐 checkAuthStatus: מעדכן תצוגת משתמש...');
                updateUserDisplay();
                
                console.log('🔐 checkAuthStatus: מסתיר מסך זיהוי...');
                document.getElementById('authScreen').style.display = 'none';
                document.getElementById('app').style.display = 'block';
                
                console.log('✅ checkAuthStatus: הושלם בהצלחה עם localStorage');
                resolve(true);
                return;
            } catch (error) {
                console.error('❌ checkAuthStatus: שגיאה בפרסור נתוני משתמש מ-localStorage:', error);
            }
        } else {
            console.log('🔐 checkAuthStatus: לא נמצא משתמש ב-localStorage');
        }

        // אם אין ב-localStorage, בדיקה ב-Firebase
        console.log('🔐 checkAuthStatus: בודק Firebase Auth...');
        if (window.firebaseAuth) {
            console.log('🔐 checkAuthStatus: Firebase Auth זמין, מאזין לשינויי auth...');
            
            window.onAuthStateChanged(window.firebaseAuth, (user) => {
                console.log('🔐 onAuthStateChanged: מצב auth השתנה:', !!user);
                
                if (user) {
                    console.log('✅ onAuthStateChanged: משתמש מחובר:', user.email);
                    appState.currentUser = user;
                    updateUserDisplay();
                    document.getElementById('authScreen').style.display = 'none';
                    document.getElementById('app').style.display = 'block';
                    resolve(true);
                } else {
                    console.log('❌ onAuthStateChanged: אין משתמש מחובר');
                    document.getElementById('authScreen').style.display = 'flex';
                    document.getElementById('app').style.display = 'none';
                    resolve(false);
                }
            });
        } else {
            console.error('❌ checkAuthStatus: Firebase Auth לא זמין!');
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('app').style.display = 'none';
            resolve(false);
        }
    });
}

function updateUserDisplay() {
    console.log('👤 updateUserDisplay: התחלה');
    
    if (appState.currentUser) {
        console.log('👤 updateUserDisplay: יש משתמש:', {
            email: appState.currentUser.email,
            displayName: appState.currentUser.displayName,
            photoURL: appState.currentUser.photoURL
        });
        
        const userNameElement = document.getElementById('userName');
        const userPhotoElement = document.getElementById('userPhoto');
        
        if (userNameElement) {
            const displayName = appState.currentUser.displayName || 
                              appState.currentUser.email?.split('@')[0] || 
                              'משתמש';
            userNameElement.textContent = displayName;
            console.log('👤 updateUserDisplay: עדכנתי userName ל:', displayName);
        } else {
            console.error('👤 updateUserDisplay: לא מצאתי userName element!');
        }
        
        if (userPhotoElement) {
            userPhotoElement.src = appState.currentUser.photoURL || '/api/placeholder/40/40';
            console.log('👤 updateUserDisplay: עדכנתי userPhoto');
        } else {
            console.error('👤 updateUserDisplay: לא מצאתי userPhoto element!');
        }
    } else {
        console.warn('👤 updateUserDisplay: אין currentUser!');
    }
}

function redirectToAuth() {
    window.location.href = 'index.html';
}

function signOut() {
    if (window.firebaseAuth) {
        window.signOut(window.firebaseAuth).then(() => {
            localStorage.removeItem('currentUser');
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('app').style.display = 'none';
        });
    } else {
        localStorage.removeItem('currentUser');
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
}

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

// פונקציה לשמירת עסקים חדשים שסווגו על ידי קלוד
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

// =========================
// ADVANCED FILE PROCESSING - מעבד קבצי בנק מתקדם
// =========================

// שלב 1: זיהוי וטעינה
function detectFileType(file) {
    console.log('🔍 זיהוי סוג קובץ:', file.name);
    
    // זיהוי לפי סיומת
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        return 'excel';
    }
    if (file.name.endsWith('.csv')) {
        return 'csv';
    }
    if (file.name.endsWith('.txt')) {
        return 'text';
    }
    
    // ברירת מחדל
    return 'csv';
}

function detectDelimiter(textData) {
    console.log('🔍 זיהוי מפריד...');
    
    const delimiters = [',', '\t', '|', ';'];
    const sample = textData.split('\n').slice(0, 10); // 10 שורות ראשונות
    
    let bestDelimiter = ',';
    let bestScore = 0;
    
    for (const delimiter of delimiters) {
        const columnCounts = sample.map(line => line.split(delimiter).length);
        const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;
        
        // חישוב עקביות
        const variance = columnCounts.reduce((sum, count) => sum + Math.pow(count - avgColumns, 2), 0) / columnCounts.length;
        const consistency = 1 / (1 + variance);
        
        const score = avgColumns * consistency;
        if (score > bestScore && avgColumns >= 3) {
            bestScore = score;
            bestDelimiter = delimiter;
        }
    }
    
    console.log(`✅ מפריד נבחר: "${bestDelimiter}" (ציון: ${bestScore.toFixed(2)})`);
    return bestDelimiter;
}

async function loadFileByType(file, fileType) {
    console.log('📁 טוען קובץ:', fileType);
    
    if (fileType === 'excel') {
        return await loadExcelFile(file);
    } else {
        return await loadTextFile(file);
    }
}

async function loadExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                
                const allData = [];
                
                // עבור על כל הגיליונות
                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1, 
                        raw: false,
                        defval: ''
                    });
                    
                    if (jsonData.length > 0) {
                        allData.push(...jsonData);
                        allData.push([]); // שורה ריקה בין גיליונות
                    }
                }
                
                console.log(`✅ Excel נטען: ${allData.length} שורות`);
                resolve(allData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('שגיאה בקריאת קובץ Excel'));
        reader.readAsArrayBuffer(file);
    });
}

async function loadTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const delimiter = detectDelimiter(text);
                
                const lines = text.split('\n').map(line => line.trim()).filter(line => line);
                const data = lines.map(line => line.split(delimiter).map(cell => cell.trim()));
                
                console.log(`✅ טקסט נטען: ${data.length} שורות`);
                resolve(data);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('שגיאה בקריאת קובץ טקסט'));
        reader.readAsText(file, 'UTF-8');
    });
}

// שלב 2: איתור טבלאות
function scanForTables(data) {
    console.log('🔍 סריקת טבלאות...');
    
    const candidates = [];
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        if (!Array.isArray(row) || row.length < 3) continue;
        
        // ספירת עמודות לא ריקות
        const nonEmptyColumns = row.filter(cell => cell && cell.toString().trim()).length;
        
        if (nonEmptyColumns >= 3) {
            // חישוב ציון מורכבות
            const complexityScore = calculateComplexityScore(row);
            
            if (complexityScore > CONFIG.MINIMUM_COMPLEXITY_THRESHOLD) {
                candidates.push({
                    rowIndex: i,
                    columnCount: nonEmptyColumns,
                    complexityScore: complexityScore,
                    data: row
                });
            }
        }
    }
    
    console.log(`📊 נמצאו ${candidates.length} מועמדי שורות`);
    return groupIntoTables(candidates, data);
}

function calculateComplexityScore(row) {
    let score = 0;
    
    for (const cell of row) {
        if (!cell || !cell.toString().trim()) continue;
        
        const str = cell.toString().trim();
        
        // ציון בסיסי לתוכן
        score += 1;
        
        // בונוס למילות מפתח חיוביות
        if (KEYWORDS.DATE_KEYWORDS.some(kw => str.toLowerCase().includes(kw.toLowerCase()))) {
            score += 3;
        }
        if (KEYWORDS.AMOUNT_KEYWORDS.some(kw => str.toLowerCase().includes(kw.toLowerCase()))) {
            score += 3;
        }
        if (KEYWORDS.DESCRIPTION_KEYWORDS.some(kw => str.toLowerCase().includes(kw.toLowerCase()))) {
            score += 2;
        }
        
        // קנס למילות מפתח שליליות
        if (KEYWORDS.NEGATIVE_TABLE_KEYWORDS.some(kw => str.toLowerCase().includes(kw.toLowerCase()))) {
            score -= 5;
        }
    }
    
    return score;
}

function groupIntoTables(candidates, fullData) {
    console.log('📋 קיבוץ לטבלאות...');
    
    const tables = [];
    let currentTable = null;
    
    for (const candidate of candidates) {
        const isNewTable = !currentTable || 
            Math.abs(candidate.columnCount - currentTable.avgColumns) > 2 ||
            candidate.rowIndex - currentTable.endRow > 3;
        
        if (isNewTable) {
            // שמור טבלה קודמת אם היא גדולה מספיק
            if (currentTable && currentTable.rows.length >= CONFIG.MINIMUM_TABLE_ROWS) {
                tables.push(currentTable);
            }
            
            // התחל טבלה חדשה
            currentTable = {
                startRow: candidate.rowIndex,
                endRow: candidate.rowIndex,
                avgColumns: candidate.columnCount,
                rows: [candidate],
                totalScore: candidate.complexityScore,
                tableData: fullData.slice(candidate.rowIndex, candidate.rowIndex + 1)
            };
        } else {
            // הוסף לטבלה הנוכחית
            currentTable.endRow = candidate.rowIndex;
            currentTable.rows.push(candidate);
            currentTable.totalScore += candidate.complexityScore;
            currentTable.avgColumns = currentTable.rows.reduce((sum, row) => sum + row.columnCount, 0) / currentTable.rows.length;
            currentTable.tableData = fullData.slice(currentTable.startRow, currentTable.endRow + 1);
        }
    }
    
    // אל תשכח את הטבלה האחרונה
    if (currentTable && currentTable.rows.length >= CONFIG.MINIMUM_TABLE_ROWS) {
        tables.push(currentTable);
    }
    
    console.log(`✅ נמצאו ${tables.length} טבלאות`);
    return tables;
}

// שלב 3: ניתוח עמודות
function analyzeTableColumns(table) {
    console.log('🔍 ניתוח עמודות טבלה...');
    
    if (!table.tableData || table.tableData.length < 2) {
        return { dateColumn: null, amountColumn: null, descriptionColumn: null };
    }
    
    const headerRow = table.tableData[0];
    const dataRows = table.tableData.slice(1);
    
    const columnAnalyses = [];
    
    for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
        const columnName = headerRow[colIndex]?.toString().trim() || '';
        const columnData = dataRows.map(row => row[colIndex]).filter(val => val);
        
        if (columnData.length < 2) continue;
        
        const analysis = analyzeColumn(columnData, columnName, colIndex);
        if (analysis) {
            columnAnalyses.push(analysis);
        }
    }
    
    console.log(`📊 נותחו ${columnAnalyses.length} עמודות`);
    return resolveColumnConflicts(columnAnalyses);
}

function analyzeColumn(columnData, columnName = '', columnIndex = 0) {
    const validData = columnData.filter(val => val && val.toString().trim());
    if (validData.length < 2) return null;
    
    const analysis = {
        columnName: columnName,
        index: columnIndex,
        isDate: checkDatePattern(validData),
        isAmount: checkAmountPattern(validData),
        isText: checkTextPattern(validData),
        confidence: 0,
        sampleValues: validData.slice(0, 3)
    };
    
    // חישוב ביטחון
    if (analysis.isDate) {
        analysis.confidence = calculateDateConfidence(validData, columnName);
    } else if (analysis.isAmount) {
        analysis.confidence = calculateAmountConfidence(validData, columnName);
    } else if (analysis.isText) {
        analysis.confidence = calculateTextConfidence(validData, columnName);
    }
    
    return analysis;
}

function checkDatePattern(data) {
    const datePatterns = [
        /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/, // DD/MM/YYYY
        /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/, // YYYY/MM/DD
        /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2}$/, // DD/MM/YY
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ // ISO format
    ];
    
    const validDates = data.filter(val => {
        const str = val.toString().trim();
        return datePatterns.some(pattern => pattern.test(str));
    });
    
    return validDates.length >= data.length * 0.7; // 70% מהערכים
}

function checkAmountPattern(data) {
    const validAmounts = data.filter(val => {
        const str = val.toString().trim();
        
        // הסר סמלי מטבע ופסיקים
        const cleanVal = str.replace(/[,\s₪\$€]/g, '');
        
        // בדיקת פטרן מספר
        const numericPattern = /^-?\d{1,7}([.]?\d{0,3})?$/;
        if (!numericPattern.test(cleanVal)) return false;
        
        // בדיקת הגיונות
        const numericValue = parseFloat(cleanVal);
        return !isNaN(numericValue) && Math.abs(numericValue) >= 0.01 && Math.abs(numericValue) <= CONFIG.MAXIMUM_AMOUNT;
    });
    
    return validAmounts.length >= data.length * 0.7;
}

function checkTextPattern(data) {
    const validTexts = data.filter(val => {
        const str = val.toString().trim();
        
        // אורך הגיוני
        if (str.length < 2 || str.length > 200) return false;
        
        // מכיל אותיות (לא רק מספרים)
        if (!/[א-ת\w]/.test(str)) return false;
        
        // לא תאריך ולא סכום
        if (checkDatePattern([str]) || checkAmountPattern([str])) return false;
        
        return true;
    });
    
    return validTexts.length >= data.length * 0.6; // 60% מהערכים
}

function calculateDateConfidence(data, columnName) {
    let confidence = 0.5; // בסיס
    
    // בונוס לפי מילות מפתח
    const nameLower = columnName.toLowerCase();
    if (KEYWORDS.DATE_KEYWORDS.some(kw => nameLower.includes(kw.toLowerCase()))) {
        confidence += 0.3;
    }
    
    // בונוס לפי איכות התאריכים
    const validDateCount = data.filter(val => {
        try {
            const date = new Date(val);
            return !isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() < 2030;
        } catch {
            return false;
        }
    }).length;
    
    confidence += (validDateCount / data.length) * 0.2;
    
    return Math.min(confidence, 1.0);
}

function calculateAmountConfidence(data, columnName) {
    let confidence = 0.5; // בסיס
    
    // בונוס לפי מילות מפתח
    const nameLower = columnName.toLowerCase();
    if (KEYWORDS.AMOUNT_KEYWORDS.some(kw => nameLower.includes(kw.toLowerCase()))) {
        confidence += 0.3;
    }
    
    // קנס אם זה נראה כמו חיוב ולא עסקה
    if (nameLower.includes('חיוב') || nameLower.includes('billing')) {
        confidence -= 0.2;
    }
    
    // בונוס אם הסכומים נראים הגיוניים
    const reasonableAmounts = data.filter(val => {
        const num = parseFloat(val.toString().replace(/[^\d.-]/g, ''));
        return !isNaN(num) && num >= 1 && num <= 50000;
    }).length;
    
    confidence += (reasonableAmounts / data.length) * 0.2;
    
    return Math.min(confidence, 1.0);
}

function calculateTextConfidence(data, columnName) {
    let confidence = 0.5; // בסיס
    
    // בונוס לפי מילות מפתח
    const nameLower = columnName.toLowerCase();
    if (KEYWORDS.DESCRIPTION_KEYWORDS.some(kw => nameLower.includes(kw.toLowerCase()))) {
        confidence += 0.3;
    }
    
    // בונוס אם הטקסטים נראים כמו תיאורי עסקים
    const businessLikeTexts = data.filter(val => {
        const str = val.toString().trim();
        // בדיקה אם יש מילים ולא רק מספרים/תאריכים
        return /[א-ת\w]{3,}/.test(str) && str.length >= 3 && str.length <= 100;
    }).length;
    
    confidence += (businessLikeTexts / data.length) * 0.2;
    
    return Math.min(confidence, 1.0);
}

function resolveColumnConflicts(columnAnalyses) {
    console.log('🔧 פתרון קונפליקטים...');
    
    const dateColumns = columnAnalyses.filter(col => col.isDate);
    const amountColumns = columnAnalyses.filter(col => col.isAmount);
    const textColumns = columnAnalyses.filter(col => col.isText);
    
    const result = {
        dateColumn: selectBestColumn(dateColumns, KEYWORDS.DATE_KEYWORDS),
        amountColumn: selectBestColumn(amountColumns, KEYWORDS.AMOUNT_KEYWORDS),
        descriptionColumn: selectBestColumn(textColumns, KEYWORDS.DESCRIPTION_KEYWORDS)
    };
    
    console.log('✅ עמודות נבחרו:', {
        date: result.dateColumn?.columnName || 'לא נמצא',
        amount: result.amountColumn?.columnName || 'לא נמצא',
        description: result.descriptionColumn?.columnName || 'לא נמצא'
    });
    
    return result;
}

function selectBestColumn(columns, keywords) {
    if (columns.length === 0) return null;
    if (columns.length === 1) return columns[0];
    
    // בדיקת מילות מפתח
    for (const keyword of keywords) {
        const match = columns.find(col => 
            col.columnName.toLowerCase().includes(keyword.toLowerCase())
        );
        if (match) return match;
    }
    
    // החזר את זה עם הביטחון הגבוה ביותר
    return columns.sort((a, b) => b.confidence - a.confidence)[0];
}

// שלב 4: דירוג טבלאות
function scoreTable(table, columnMapping) {
    console.log('🎯 חישוב ציון טבלה...');
    
    let score = 0;
    
    // ניקוד בסיסי לזיהוי עמודות
    if (columnMapping.dateColumn) score += 25;
    if (columnMapping.amountColumn) score += 25;
    if (columnMapping.descriptionColumn) score += 20;
    
    // בונוס לאיכות זיהוי
    if (columnMapping.dateColumn?.confidence > 0.8) score += 10;
    if (columnMapping.amountColumn?.confidence > 0.8) score += 10;
    if (columnMapping.descriptionColumn?.confidence > 0.7) score += 5;
    
    // ניקוד לכמות נתונים
    const dataRowsCount = table.rows.length - 1; // מינוס שורת כותרות
    score += Math.min(dataRowsCount, 30); // מקסימום 30 נקודות
    
    // בונוס למילות מפתח חיוביות בהקשר
    const tableContext = getTableContext(table);
    KEYWORDS.POSITIVE_TABLE_KEYWORDS.forEach(keyword => {
        if (tableContext.includes(keyword)) score += 10;
    });
    
    // קנסים למילות מפתח שליליות
    KEYWORDS.NEGATIVE_TABLE_KEYWORDS.forEach(keyword => {
        if (tableContext.includes(keyword)) score -= 20;
    });
    
    // קנס לטבלאות קטנות מדי
    if (dataRowsCount < 5) score -= 20;
    
    const finalScore = Math.max(score, 0);
    console.log(`📊 ציון טבלה: ${finalScore}`);
    
    return finalScore;
}

function getTableContext(table) {
    // לקח מידע מהשורות הקרובות לטבלה לקבלת הקשר
    const context = table.rows.map(row => row.data.join(' ')).join(' ');
    return context.toLowerCase();
}

// שלב 5: חילוץ נתונים
function extractTransactions(table, columnMapping) {
    console.log('📋 חילוץ עסקאות...');
    
    const transactions = [];
    const { dateColumn, amountColumn, descriptionColumn } = columnMapping;
    
    if (!dateColumn || !amountColumn || !descriptionColumn) {
        console.warn('⚠️ חסרות עמודות חיוניות');
        return transactions;
    }
    
    // דלג על שורת הכותרות
    for (let i = 1; i < table.tableData.length; i++) {
        const row = table.tableData[i];
        
        if (!row || row.length <= Math.max(dateColumn.index, amountColumn.index, descriptionColumn.index)) {
            continue;
        }
        
        const transaction = {
            id: `tx_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            date: cleanDate(row[dateColumn.index]),
            description: cleanDescription(row[descriptionColumn.index]),
            amount: cleanAmount(row[amountColumn.index]),
            originalRow: i,
            rawData: row
        };
        
        // וולידציה בסיסית
        if (isValidTransaction(transaction)) {
            transactions.push(transaction);
        }
    }
    
    console.log(`✅ חולצו ${transactions.length} עסקאות`);
    return transactions;
}

function cleanDate(dateString) {
    if (!dateString) return null;
    
    const str = dateString.toString().trim();
    if (!str) return null;
    
    // טיפול בפורמטים שונים
    const formats = [
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, // DD/MM/YYYY
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/, // DD/MM/YY
        /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/ // YYYY/MM/DD
    ];
    
    for (const format of formats) {
        const match = str.match(format);
        if (match) {
            try {
                if (format === formats[0]) { // DD/MM/YYYY
                    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
                } else if (format === formats[1]) { // DD/MM/YY
                    const year = parseInt(match[3]) < 50 ? `20${match[3]}` : `19${match[3]}`;
                    return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
                } else { // YYYY/MM/DD
                    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
                }
            } catch (e) {
                continue;
            }
        }
    }
    
    // טיפול ב-ISO format
    if (str.includes('T')) {
        try {
            return new Date(str).toISOString().split('T')[0];
        } catch (e) {
            // ignore
        }
    }
    
    return null;
}

function cleanAmount(amountString) {
    if (!amountString) return 0;
    
    let str = amountString.toString().trim();
    if (!str) return 0;
    
    // הסר סמלי מטבע ופסיקים
    str = str.replace(/[₪\$€,\s]/g, '');
    
    // טיפול במספרים שליליים
    const isNegative = str.includes('-') || str.startsWith('(');
    str = str.replace(/[\-\(\)]/g, '');
    
    const numericValue = parseFloat(str) || 0;
    return isNegative ? -numericValue : numericValue;
}

function cleanDescription(descString) {
    if (!descString) return '';
    
    let str = descString.toString().trim();
    if (!str) return '';
    
    // הסר מספרי אסמכתא מהסוף
    str = str.replace(/\s+\d{4,}$/, '');
    
    // הסר תאריכים מהתיאור
    str = str.replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g, '');
    
    // נקה רווחים כפולים
    str = str.replace(/\s+/g, ' ').trim();
    
    return str;
}

function isValidTransaction(transaction) {
    // בדיקות בסיסיות
    if (!transaction.description || transaction.description.length < 2) return false;
    if (!transaction.amount || Math.abs(transaction.amount) < 0.01) return false;
    if (!transaction.date) return false;
    
    // בדיקת הגיונות סכום
    if (Math.abs(transaction.amount) > CONFIG.MAXIMUM_AMOUNT) return false;
    
    // בדיקת תיאורים חשודים
    const suspiciousPatterns = [
        /^סה[״"']כ/i,
        /^total/i,
        /יתרה/i,
        /balance/i,
        /^עד היום/i,
        /^סיכום/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(transaction.description))) {
        return false;
    }
    
    return true;
}

// שלב 6: זיהוי סוג מוסד והתאמות
function detectInstitutionType(transactions, tableContext) {
    console.log('🏦 זיהוי סוג מוסד...');
    
    const indicators = {
        bankAccount: [
            'עובר ושב', 'זכות', 'חובה', 'יתרה', 'אסמכתה', 'העברה',
            'ביטוח לאומי', 'משכורת', 'פיקדון', 'משיכה'
        ],
        creditCard: [
            'כרטיס', 'בית עסק', 'מטבע', 'תשלומים', 'חיוב', 'אשראי',
            'ויזה', 'מסטרקארד', 'american express'
        ]
    };
    
    let bankScore = 0;
    let creditScore = 0;
    
    const allText = (tableContext + ' ' + transactions.map(t => t.description).join(' ')).toLowerCase();
    
    indicators.bankAccount.forEach(term => {
        if (allText.includes(term.toLowerCase())) bankScore++;
    });
    
    indicators.creditCard.forEach(term => {
        if (allText.includes(term.toLowerCase())) creditScore++;
    });
    
    // בדיקת סכומים (בנק יכול להיות שלילי, אשראי תמיד חיובי)
    const hasNegativeAmounts = transactions.some(t => t.amount < 0);
    if (hasNegativeAmounts) bankScore += 3;
    
    const institutionType = bankScore > creditScore ? 'bankAccount' : 'creditCard';
    console.log(`✅ סוג מוסד: ${institutionType} (בנק: ${bankScore}, אשראי: ${creditScore})`);
    
    return institutionType;
}

function adjustForInstitutionType(transactions, institutionType) {
    console.log(`🔧 התאמה לסוג מוסד: ${institutionType}`);
    
    const adjusted = transactions.map(transaction => {
        const adj = { ...transaction };
        
        if (institutionType === 'bankAccount') {
            // בעובר ושב - קח רק הוצאות (סכומים שליליים)
            if (adj.amount > 0) {
                adj.skip = true; // סמן לדילוג (הכנסה)
            } else {
                adj.amount = Math.abs(adj.amount); // הפוך לחיובי
            }
            
            // סנן העברות פנימיות
            const desc = adj.description.toLowerCase();
            if (desc.includes('העברה ל') || 
                desc.includes('העברה בין') ||
                desc.includes('העברה מ') ||
                desc.includes('פיקדון') ||
                desc.includes('ביטוח לאומי') ||
                desc.includes('מס הכנסה')) {
                adj.skip = true;
            }
        }
        
        if (institutionType === 'creditCard') {
            // בכרטיס אשראי - כל הסכומים הם הוצאות
            adj.amount = Math.abs(adj.amount);
            
            // טיפול במטבעות זרים (אם יש מידע)
            if (adj.description.includes('$')) {
                adj.amount *= 3.7; // שער דולר משוער
                adj.currency = 'USD->ILS';
            }
        }
        
        return adj;
    }).filter(t => !t.skip); // הסר עסקאות שסומנו לדילוג
    
    console.log(`✅ ${adjusted.length} עסקאות לאחר התאמה (מתוך ${transactions.length})`);
    return adjusted;
}

// =========================
// DUPLICATE DETECTION & DATA MANAGEMENT
// =========================

function checkForDuplicateFile(newTransactions) {
    if (!appState.categorizedData || appState.categorizedData.length === 0) {
        return false; // אין נתונים קיימים
    }
    
    console.log('🔍 בודק כפילויות קבצים...');
    
    let duplicateCount = 0;
    const threshold = 3; // אם יש 3+ עסקאות זהות
    
    for (const newTransaction of newTransactions) {
        for (const existingTransaction of appState.categorizedData) {
            // בדיקת זהות: תאריך, תיאור, סכום
            if (existingTransaction.date === newTransaction.date &&
                existingTransaction.description.trim() === newTransaction.description.trim() &&
                Math.abs(existingTransaction.amount - newTransaction.amount) < 0.01) {
                duplicateCount++;
                
                if (duplicateCount >= threshold) {
                    console.log(`⚠️ נמצאו ${duplicateCount} עסקאות זהות - קובץ כבר נטען`);
                    return true;
                }
            }
        }
    }
    
    console.log(`✅ נמצאו ${duplicateCount} עסקאות זהות (מתחת לסף ${threshold})`);
    return false;
}

function clearAllTransactionData() {
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל העסקאות שנטענו? פעולה זו תמחק רק את הנתונים מהקבצים, לא את הקטגוריות.')) {
        return;
    }
    
    console.log('🗑️ מוחק את כל נתוני העסקאות...');
    
    // מחיקת נתוני עסקאות בלבד
    appState.rawData = [];
    appState.extractedTransactions = [];
    appState.categorizedData = [];
    appState.deletedTransactions = new Set();
    appState.yearlyExpenses = new Set();
    appState.manualClassifications = {};
    appState.uploadedFiles = [];
    appState.showAllBusinesses = false;
    appState.showAllTransactions = false;
    appState.showTransactions = false;
    appState.selectedCategoryDetails = null;
    
    // מאפס מסננים
    appState.minAmountFilter = 0;
    document.getElementById('minAmountFilter').value = '0';
    
    // מחק גרף
    if (appState.chartInstance) {
        appState.chartInstance.destroy();
        appState.chartInstance = null;
    }
    
    // הסתר כל התצוגות ותחזור למסך העלאה
    hideAllContainers();
    showFileUpload();
    updateStatsDisplay();
    
    console.log('✅ נתוני עסקאות נמחקו בהצלחה');
    alert('נתוני העסקאות נמחקו בהצלחה. הקטגוריות והגדרות נשמרו.');
}

// =========================
// CASH FLOW ANALYSIS
// =========================

function calculateMonthlyCashFlow() {
    if (!appState.categorizedData || appState.categorizedData.length === 0) {
        return {};
    }
    
    console.log('💰 מחשב תזרים חודשי...');
    
    const monthlyCashFlow = {};
    
    appState.categorizedData.forEach(transaction => {
        if (appState.deletedTransactions.has(transaction.id)) {
            return; // דלג על עסקאות מחוקות
        }
        
        const amount = getDisplayAmount(transaction);
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyCashFlow[monthKey]) {
            monthlyCashFlow[monthKey] = {
                month: monthKey,
                income: 0,
                expenses: 0,
                net: 0,
                transactions: []
            };
        }
        
        if (amount > 0) {
            monthlyCashFlow[monthKey].income += amount;
        } else {
            monthlyCashFlow[monthKey].expenses += Math.abs(amount);
        }
        
        monthlyCashFlow[monthKey].transactions.push(transaction);
    });
    
    // חישוב נטו לכל חודש
    Object.values(monthlyCashFlow).forEach(monthData => {
        monthData.net = monthData.income - monthData.expenses;
    });
    
    console.log(`✅ חושב תזרים עבור ${Object.keys(monthlyCashFlow).length} חודשים`);
    return monthlyCashFlow;
}

function updateCashFlowDisplay() {
    const cashFlowContainer = document.getElementById('cashFlowContainer');
    if (!cashFlowContainer) {
        return; // אין מיכל תזרים עדיין
    }
    
    const monthlyCashFlow = calculateMonthlyCashFlow();
    const months = Object.keys(monthlyCashFlow).sort();
    
    if (months.length === 0) {
        cashFlowContainer.classList.add('hidden');
        return;
    }
    
    cashFlowContainer.classList.remove('hidden');
    
    // יצירת גרף תזרים פשוט
    const cashFlowHtml = `
        <div class="cash-flow-summary">
            <h3 class="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span class="text-3xl">💰</span>
                תזרים חודשי
            </h3>
            <div class="cash-flow-table-container">
                <table class="cash-flow-table">
                    <thead>
                        <tr class="table-header">
                            <th class="text-right p-4 font-bold text-slate-700">חודש</th>
                            <th class="text-right p-4 font-bold text-slate-700">הכנסות</th>
                            <th class="text-right p-4 font-bold text-slate-700">הוצאות</th>
                            <th class="text-right p-4 font-bold text-slate-700">יתרה</th>
                            <th class="text-right p-4 font-bold text-slate-700">% חיסכון</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${months.map(month => {
                            const data = monthlyCashFlow[month];
                            const savingsRate = data.income > 0 ? ((data.net / data.income) * 100).toFixed(1) : '0.0';
                            const isPositive = data.net >= 0;
                            
                            return `
                                <tr class="border-b border-slate-100 hover:bg-slate-50">
                                    <td class="p-4 font-semibold text-slate-800">${formatMonthDisplay(month)}</td>
                                    <td class="p-4 text-green-600 font-bold">₪${data.income.toLocaleString()}</td>
                                    <td class="p-4 text-red-600 font-bold">₪${data.expenses.toLocaleString()}</td>
                                    <td class="p-4 font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}">
                                        ${isPositive ? '+' : ''}₪${data.net.toLocaleString()}
                                    </td>
                                    <td class="p-4 font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}">
                                        ${savingsRate}%
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    cashFlowContainer.innerHTML = cashFlowHtml;
}

function formatMonthDisplay(monthKey) {
    const [year, month] = monthKey.split('-');
    const monthNames = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// פונקציית ההנעה הראשית
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
        // בדיקת כפילויות לפני עיבוד
        if (checkForDuplicateFile(allData)) {
            alert("קובץ זה כבר נטען!");
            return;
        }
        
        appState.rawData = allData;
        appState.extractedTransactions = [];
        appState.categorizedData = [];
        appState.yearlyExpenses = new Set();
        appState.manualClassifications = {};
        appState.newBusinessesToSave = {};
        appState.originalBusinessMappings = {...appState.businessMappings};
        hideFileUpload();
        
        setTimeout(() => {
            analyzeFileDataOld(allData); // הפונקציה הישנה
        }, 500);
    } else {
        alert('לא נמצאו נתונים תקינים בקבצים');
    }
}

// נשמור על שאר הפונקציות הקיימות של הסיווג והתצוגה...

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
        return Math.floor(transaction.amount / 12);
    }
    return transaction.amount;
}

function getTransactionClassification(transaction) {
    if (appState.manualClassifications[transaction.id]) {
        return appState.manualClassifications[transaction.id];
    }
    return transaction.classification || getCategoryClassification(transaction.category);
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
    const filteredData = getFilteredTransactions();
    const unknownTransactions = filteredData.filter(t => t.category === 'אחר' || t.category === 'לא מסווג');
    
    const alertsContainer = document.getElementById('alertsContainer');
    
    if (unknownTransactions.length > 0) {
        alertsContainer.classList.remove('hidden');
        alertsContainer.innerHTML = `
            <div class="error-card">
                <div class="flex items-center gap-6">
                    <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center shadow-lg">
                        <span class="text-3xl">⚠️</span>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-yellow-800 mb-2">
                            עסקאות לא מסווגות
                        </h3>
                        <p class="text-yellow-700 text-lg">
                            נמצאו ${unknownTransactions.length} עסקאות שלא זוהו אוטומטית. 
                            תוכל לסווג אותן ידנית בטבלות למטה.
                        </p>
                    </div>
                </div>
            </div>
        `;
    } else {
        alertsContainer.classList.add('hidden');
    }
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
                duration: 1000
            }
        }
    });
}

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
// UI CONTROL FUNCTIONS
// =========================

function hideFileUpload() {
    document.getElementById('fileUploadArea').style.display = 'none';
    document.getElementById('actionButtons').classList.remove('hidden');
}

function showFileUpload() {
    document.getElementById('fileUploadArea').style.display = 'block';
    document.getElementById('actionButtons').classList.add('hidden');
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

// =========================
// LEGACY FUNCTION WRAPPERS (לתאימות לקוד הקיים)
// =========================

// הפונקציה הישנה שהוחלפה - נשמור wrapper לתאימות
async function analyzeFileData(dataToAnalyze) {
    console.warn('⚠️ analyzeFileData is deprecated. Using new advanced processor...');
    // יקרא לפונקציה החדשה
    return;
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
