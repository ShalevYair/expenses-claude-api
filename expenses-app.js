// ==========================
// GLOBAL STATE - מצב גלובלי מעודכן
// ==========================

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
    selectedCategoryDetails: null,
    
    // משתנים חדשים
    loadedFiles: new Set(),
    fileTransactions: new Map(),
    monthlyCashflow: {},
    monthlyIncomes: {},
    showCashflowTable: false,
    netWorth: {
        assets: {
            investments: 0,
            checkingAccount: 0,
            pensionFunds: 0,
            realEstate: 0,
            other: 0
        },
        liabilities: {
            mortgage: 0,
            loans: 0,
            creditCards: 0,
            other: 0
        },
        history: [],
        lastUpdated: null
    },
    showNetWorthPanel: false
};

// ==========================
// AUTHENTICATION FUNCTIONS
// פונקציות זיהוי
// ==========================

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

// ==========================
// FIREBASE FUNCTIONS
// פונקציות Firebase
// ==========================

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

// ==========================
// ADVANCED BANK FILE PROCESSOR
// מעבד קבצי בנק מתקדם
// ==========================

// פונקציה מתקדמת להחלפת handleFileUpload הקיימת
async function handleFileUploadWithDuplicateCheck(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    console.log('🚀 Advanced File Upload - התחלת עיבוד עם בדיקת כפילויות');
    
    let allTransactions = [];
    let filesProcessed = 0;
    let duplicateFiles = [];
    let errorFiles = [];
    
    for (const file of files) {
        try {
            console.log(`📁 מעבד קובץ: ${file.name}`);
            
            // שלב 1: קריאת קובץ מתקדמת
            const fileData = await readFileAdvanced(file);
            
            if (!fileData || fileData.length === 0) {
                console.log(`⚠️ קובץ ריק: ${file.name}`);
                errorFiles.push({name: file.name, error: 'קובץ ריק או לא נתמך'});
                continue;
            }
            
            // שלב 2: ניקוי נתונים
            const cleanedData = cleanBankData(fileData, file.name);
            
            if (!cleanedData || cleanedData.length === 0) {
                console.log(`⚠️ אין נתונים תקינים: ${file.name}`);
                errorFiles.push({name: file.name, error: 'לא נמצאו נתונים תקינים'});
                continue;
            }
            
            // שלב 3: עיבוד עסקאות
            const transactions = await processBankTransactions(cleanedData, file.name);
            
            if (!transactions || transactions.length === 0) {
                console.log(`⚠️ אין עסקאות: ${file.name}`);
                errorFiles.push({name: file.name, error: 'לא נמצאו עסקאות תקינות'});
                continue;
            }
            
            // שלב 4: בדיקת כפילויות משופרת
            const isDuplicate = checkForDuplicateFileAdvanced(transactions, file.name);
            
            if (isDuplicate) {
                duplicateFiles.push(file.name);
                console.log(`🔄 קובץ כפול: ${file.name}`);
                continue;
            }
            
            // שלב 5: רישום ושמירה
            registerLoadedFile(file.name, transactions);
            allTransactions = [...allTransactions, ...transactions];
            filesProcessed++;
            
            console.log(`✅ קובץ עובד: ${file.name} - ${transactions.length} עסקאות`);
            
        } catch (error) {
            console.error(`❌ שגיאה בקובץ ${file.name}:`, error);
            errorFiles.push({name: file.name, error: error.message});
        }
    }
    
    // דיווח מפורט על התוצאות
    showUploadResults(filesProcessed, duplicateFiles, errorFiles, allTransactions.length);
    
    // אם יש עסקאות חדשות
    if (filesProcessed > 0 && allTransactions.length > 0) {
        // מיזוג עם נתונים קיימים
        appState.rawData = [...(appState.rawData || []), ...allTransactions];
        appState.extractedTransactions = [...(appState.extractedTransactions || []), ...allTransactions];
        appState.uploadedFiles = [...appState.uploadedFiles, ...files.map(f => f.name).filter(name => !duplicateFiles.includes(name) && !errorFiles.some(ef => ef.name === name))];
        
        hideFileUpload();
        
        setTimeout(() => {
            analyzeFileDataAdvanced(allTransactions);
        }, 500);
    } else if (allTransactions.length === 0) {
        // אם לא נוספו עסקאות כלל, נשאיר את מסך ההעלאה
        console.log('🔄 לא נוספו עסקאות חדשות');
    }
}

// פונקציה לקריאת קבצים מסוגים שונים
async function readFileAdvanced(file) {
    const fileName = file.name.toLowerCase();
    
    console.log(`📖 קורא קובץ: ${fileName}`);
    
    try {
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // Excel files
            return await readExcelFile(file);
            
        } else if (fileName.endsWith('.csv')) {
            // CSV files
            return await readCSVFile(file);
            
        } else if (fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
            // TSV files
            return await readTSVFile(file);
            
        } else {
            // נסה לזהות אוטומטית לפי תוכן
            return await readFileByContent(file);
        }
        
    } catch (error) {
        console.error(`❌ שגיאה בקריאת קובץ ${fileName}:`, error);
        throw new Error(`לא ניתן לקרוא את הקובץ ${fileName}`);
    }
}

// קריאת קובץ Excel
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // מחפש את השיט הראשון שלא ריק
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // המרה ל-JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,
                    defval: '',
                    blankrows: false
                });
                
                console.log(`📊 Excel נקרא: ${jsonData.length} שורות`);
                resolve(jsonData);
                
            } catch (error) {
                reject(new Error('קובץ Excel פגום או לא נתמך'));
            }
        };
        
        reader.onerror = () => reject(new Error('שגיאה בקריאת קובץ Excel'));
        reader.readAsArrayBuffer(file);
    });
}

// קריאת קובץ CSV
async function readCSVFile(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn('CSV warnings:', results.errors);
                }
                console.log(`📊 CSV נקרא: ${results.data.length} שורות`);
                resolve(results.data);
            },
            error: (error) => {
                reject(new Error('קובץ CSV פגום או לא נתמך'));
            }
        });
    });
}

// קריאת קובץ TSV
async function readTSVFile(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            delimiter: '\t',
            encoding: 'UTF-8',
            complete: (results) => {
                console.log(`📊 TSV נקרא: ${results.data.length} שורות`);
                resolve(results.data);
            },
            error: (error) => {
                reject(new Error('קובץ TSV פגום או לא נתמך'));
            }
        });
    });
}

// זיהוי סוג קובץ לפי תוכן
async function readFileByContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            
            // בדיקת מפרידים
            if (content.includes('\t')) {
                // כנראה TSV
                console.log('🔍 זוהה כ-TSV לפי תוכן');
                Papa.parse(content, {
                    header: false,
                    skipEmptyLines: true,
                    delimiter: '\t',
                    complete: (results) => resolve(results.data),
                    error: (error) => reject(error)
                });
            } else if (content.includes('|')) {
                // כנראה Pipe-separated
                console.log('🔍 זוהה כ-Pipe-separated לפי תוכן');
                Papa.parse(content, {
                    header: false,
                    skipEmptyLines: true,
                    delimiter: '|',
                    complete: (results) => resolve(results.data),
                    error: (error) => reject(error)
                });
            } else {
                // נסה CSV רגיל
                console.log('🔍 מנסה CSV רגיל');
                Papa.parse(content, {
                    header: false,
                    skipEmptyLines: true,
                    complete: (results) => resolve(results.data),
                    error: (error) => reject(error)
                });
            }
        };
        
        reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
        reader.readAsText(file, 'UTF-8');
    });
}

// ניקוי וסינון נתוני בנק
function cleanBankData(rawData, fileName) {
    console.log(`🧹 מנקה נתונים מקובץ: ${fileName}`);
    
    if (!rawData || rawData.length === 0) {
        return [];
    }
    
    // המרה לפורמט אחיד (array של arrays)
    let cleanData = rawData;
    
    // אם זה JSON מExcel, נמיר לarray של arrays
    if (rawData[0] && typeof rawData[0] === 'object' && !Array.isArray(rawData[0])) {
        cleanData = rawData.map(row => Object.values(row));
    }
    
    // סינון שורות ריקות
    cleanData = cleanData.filter(row => {
        if (!Array.isArray(row)) return false;
        const nonEmptyValues = row.filter(cell => 
            cell !== null && 
            cell !== undefined && 
            cell.toString().trim() !== ''
        );
        return nonEmptyValues.length > 0;
    });
    
    // חיפוש תחילת הטבלה האמיתית
    const tableStart = findTableStart(cleanData);
    if (tableStart > 0) {
        console.log(`📍 נמצאה תחילת טבלה בשורה ${tableStart + 1}`);
        cleanData = cleanData.slice(tableStart);
    }
    
    // חיפוש סוף הטבלה
    const tableEnd = findTableEnd(cleanData);
    if (tableEnd > 0 && tableEnd < cleanData.length - 1) {
        console.log(`📍 נמצא סוף טבלה בשורה ${tableEnd + 1}`);
        cleanData = cleanData.slice(0, tableEnd + 1);
    }
    
    console.log(`✅ נתונים נוקו: ${cleanData.length} שורות נותרו`);
    return cleanData;
}

// חיפוש תחילת טבלת נתונים
function findTableStart(data) {
    for (let i = 0; i < Math.min(data.length, 20); i++) {
        const row = data[i];
        if (!Array.isArray(row) || row.length < 3) continue;
        
        // חיפוש כותרות נפוצות
        const rowText = row.join(' ').toLowerCase();
        
        if (rowText.includes('תאריך') || 
            rowText.includes('date') ||
            rowText.includes('סכום') ||
            rowText.includes('amount') ||
            rowText.includes('תיאור') ||
            rowText.includes('description') ||
            rowText.includes('פירוט') ||
            rowText.includes('עסק') ||
            rowText.includes('business')) {
            return i;
        }
        
        // אם יש 3+ עמודות עם ערכים שנראים כמו נתונים
        let dateCount = 0;
        let numberCount = 0;
        let textCount = 0;
        
        for (const cell of row) {
            if (!cell) continue;
            const cellStr = cell.toString().trim();
            
            if (isDateLike(cellStr)) dateCount++;
            else if (isNumberLike(cellStr)) numberCount++;
            else if (cellStr.length > 2) textCount++;
        }
        
        if (dateCount >= 1 && numberCount >= 1 && textCount >= 1) {
            return i;
        }
    }
    
    return 0;
}

// חיפוש סוף טבלת נתונים
function findTableEnd(data) {
    for (let i = data.length - 1; i >= Math.max(0, data.length - 10); i--) {
        const row = data[i];
        if (!Array.isArray(row)) continue;
        
        const rowText = row.join(' ').toLowerCase();
        
        // מילות מפתח לסוף טבלה
        if (rowText.includes('סה"כ') ||
            rowText.includes('סך הכל') ||
            rowText.includes('total') ||
            rowText.includes('סיכום') ||
            rowText.includes('יתרה') ||
            rowText.includes('balance') ||
            rowText.includes('---') ||
            rowText.includes('===')) {
            return i - 1;
        }
    }
    
    return data.length - 1;
}

// בדיקה אם טקסט נראה כמו תאריך
function isDateLike(text) {
    if (!text || typeof text !== 'string') return false;
    
    // פורמטים נפוצים של תאריכים
    const datePatterns = [
        /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,     // 01/12/2024
        /^\d{1,2}-\d{1,2}-\d{2,4}$/,      // 01-12-2024
        /^\d{1,2}\.\d{1,2}\.\d{2,4}$/,    // 01.12.2024
        /^\d{4}-\d{1,2}-\d{1,2}$/,        // 2024-12-01
        /^\d{8}$/                         // 20241201
    ];
    
    return datePatterns.some(pattern => pattern.test(text.trim()));
}

// בדיקה אם טקסט נראה כמו מספר/סכום
function isNumberLike(text) {
    if (!text) return false;
    
    const cleanText = text.toString().replace(/[,\s₪]/g, '');
    
    // מספר עם אפשרות למינוס ונקודה עשרונית
    return /^-?\d+\.?\d*$/.test(cleanText) && cleanText.length > 0;
}

// עיבוד עסקאות בנק מתקדם
async function processBankTransactions(cleanData, fileName) {
    console.log(`💳 מעבד עסקאות בנק מקובץ: ${fileName}`);
    
    if (!cleanData || cleanData.length < 2) {
        console.log('❌ אין מספיק נתונים לעיבוד');
        return [];
    }
    
    // זיהוי עמודות
    const columnMapping = detectBankColumns(cleanData);
    
    if (!columnMapping.amount || !columnMapping.description) {
        console.log('❌ לא נמצאו עמודות חיוניות');
        throw new Error('לא נמצאו עמודות סכום ותיאור בקובץ');
    }
    
    console.log('📊 מיפוי עמודות:', columnMapping);
    
    // זיהוי סוג חשבון (עו"ש או אשראי)
    const accountType = detectAccountType(cleanData, columnMapping, fileName);
    console.log(`🏦 סוג חשבון זוהה: ${accountType}`);
    
    // עיבוד השורות
    const transactions = [];
    const headerRow = Math.max(0, columnMapping.headerRow || 0);
    
    for (let i = headerRow + 1; i < cleanData.length; i++) {
        const row = cleanData[i];
        
        if (!Array.isArray(row) || row.length <= Math.max(columnMapping.amount, columnMapping.description)) {
            continue;
        }
        
        try {
            const transaction = processTransactionRow(row, columnMapping, accountType, i, fileName);
            
            if (transaction && transaction.amount > 0) {
                transactions.push(transaction);
            }
            
        } catch (error) {
            console.warn(`⚠️ שגיאה בעיבוד שורה ${i + 1}:`, error.message);
        }
    }
    
    console.log(`✅ עובדו ${transactions.length} עסקאות מתוך ${cleanData.length - headerRow - 1} שורות`);
    return transactions;
}

// זיהוי עמודות בקובץ בנק
function detectBankColumns(data) {
    const columnMapping = {
        date: null,
        description: null,
        amount: null,
        headerRow: 0
    };
    
    // חיפוש שורת כותרת
    for (let rowIndex = 0; rowIndex < Math.min(data.length, 5); rowIndex++) {
        const row = data[rowIndex];
        if (!Array.isArray(row)) continue;
        
        const foundColumns = analyzeHeaderRow(row);
        
        if (foundColumns.description !== null && foundColumns.amount !== null) {
            columnMapping.date = foundColumns.date;
            columnMapping.description = foundColumns.description;
            columnMapping.amount = foundColumns.amount;
            columnMapping.headerRow = rowIndex;
            break;
        }
    }
    
    // אם לא נמצאו כותרות, נסה זיהוי לפי תוכן
    if (columnMapping.amount === null || columnMapping.description === null) {
        const contentMapping = analyzeDataRows(data);
        if (contentMapping.amount !== null && contentMapping.description !== null) {
            Object.assign(columnMapping, contentMapping);
        }
    }
    
    return columnMapping;
}

// ניתוח שורת כותרת
function analyzeHeaderRow(row) {
    const mapping = { date: null, description: null, amount: null };
    
    for (let i = 0; i < row.length; i++) {
        const header = row[i]?.toString().toLowerCase().trim() || '';
        
        // עמודת תאריך
        if ((header.includes('תאריך') || header.includes('date')) && mapping.date === null) {
            mapping.date = i;
        }
        
        // עמודת תיאור
        else if ((header.includes('תיאור') || header.includes('פירוט') || 
                  header.includes('בית עסק') || header.includes('עסק') ||
                  header.includes('description') || header.includes('business') ||
                  header.includes('merchant') || header.includes('payee')) && mapping.description === null) {
            mapping.description = i;
        }
        
        // עמודת סכום
        else if ((header.includes('סכום') || header.includes('amount') || 
                  header.includes('חיוב') || header.includes('debit') ||
                  header.includes('credit') || header.includes('קנייה') ||
                  header.includes('ש"ח') || header.includes('שח')) && mapping.amount === null) {
            mapping.amount = i;
        }
    }
    
    return mapping;
}

// ניתוח שורות נתונים לזיהוי עמודות
function analyzeDataRows(data) {
    const mapping = { date: null, description: null, amount: null };
    
    // נתחיל מהשורה השנייה (אחרי כותרת אפשרית)
    const sampleRows = data.slice(1, Math.min(data.length, 6));
    
    for (let colIndex = 0; colIndex < Math.max(...sampleRows.map(r => r.length)); colIndex++) {
        let dateCount = 0;
        let numberCount = 0;
        let textCount = 0;
        let textLengthSum = 0;
        
        for (const row of sampleRows) {
            if (!row[colIndex]) continue;
            
            const cellValue = row[colIndex].toString().trim();
            
            if (isDateLike(cellValue)) {
                dateCount++;
            } else if (isNumberLike(cellValue)) {
                numberCount++;
            } else if (cellValue.length > 2) {
                textCount++;
                textLengthSum += cellValue.length;
            }
        }
        
        const sampleSize = sampleRows.length;
        
        // זיהוי עמודת תאריך
        if (dateCount >= sampleSize * 0.7 && mapping.date === null) {
            mapping.date = colIndex;
        }
        
        // זיהוי עמודת סכום
        else if (numberCount >= sampleSize * 0.7 && mapping.amount === null) {
            mapping.amount = colIndex;
        }
        
        // זיהוי עמודת תיאור
        else if (textCount >= sampleSize * 0.7 && textLengthSum / textCount > 5 && mapping.description === null) {
            mapping.description = colIndex;
        }
    }
    
    return mapping;
}

// זיהוי סוג חשבון (עו"ש או אשראי)
function detectAccountType(data, columnMapping, fileName) {
    // בדיקה לפי שם הקובץ
    const lowerFileName = fileName.toLowerCase();
    
    if (lowerFileName.includes('אשראי') || lowerFileName.includes('credit') || lowerFileName.includes('visa') || lowerFileName.includes('mastercard')) {
        return 'אשראי';
    }
    
    if (lowerFileName.includes('עו"ש') || lowerFileName.includes('עוש') || lowerFileName.includes('checking') || lowerFileName.includes('current')) {
        return 'עו"ש';
    }
    
    // בדיקה לפי תוכן הנתונים
    const sampleRows = data.slice(Math.max(0, columnMapping.headerRow + 1), Math.min(data.length, columnMapping.headerRow + 11));
    let negativeCount = 0;
    let positiveCount = 0;
    
    for (const row of sampleRows) {
        if (!row[columnMapping.amount]) continue;
        
        const amount = parseAmount(row[columnMapping.amount]);
        if (amount > 0) positiveCount++;
        else if (amount < 0) negativeCount++;
    }
    
    // אם רוב הסכומים חיוביים - כנראה אשראי
    if (positiveCount > negativeCount * 2) {
        return 'אשראי';
    }
    
    // אחרת כנראה עו"ש
    return 'עו"ש';
}

// עיבוד שורת עסקה בודדת
function processTransactionRow(row, columnMapping, accountType, rowIndex, fileName) {
    const dateValue = row[columnMapping.date] || '';
    const descValue = row[columnMapping.description] || '';
    const amountValue = row[columnMapping.amount] || '';
    
    // בדיקות בסיסיות
    if (!descValue || !amountValue) {
        return null;
    }
    
    const description = descValue.toString().trim();
    const rawAmount = parseAmount(amountValue);
    
    if (description.length < 2 || rawAmount === 0) {
        return null;
    }
    
    // סינון לפי סוג חשבון
    let finalAmount = 0;
    
    if (accountType === 'עו"ש') {
        // בעו"ש: רק הוצאות (סכומים שליליים)
        if (rawAmount >= 0) {
            return null; // דילוג על הכנסות
        }
        
        // בדיקה אם זה העברה פנימית
        if (isInternalTransfer(description)) {
            return null;
        }
        
        finalAmount = Math.abs(rawAmount); // המרה לחיובי
        
    } else {
        // באשראי: כל הסכומים הם הוצאות
        finalAmount = Math.abs(rawAmount);
    }
    
    // יצירת העסקה
    return {
        id: `tx_${fileName}_${rowIndex}_${Date.now()}`,
        date: formatDate(dateValue),
        description: description,
        amount: Math.floor(finalAmount),
        originalRow: rowIndex,
        category: 'לא מסווג',
        accountType: accountType,
        fileName: fileName,
        rawData: row
    };
}

// פרסור סכום מטקסט
function parseAmount(amountText) {
    if (!amountText) return 0;
    
    const cleanAmount = amountText.toString()
        .replace(/[,\s₪]/g, '')
        .replace(/[^\d.-]/g, '')
        .trim();
    
    if (!/^-?\d+\.?\d*$/.test(cleanAmount)) {
        return 0;
    }
    
    return parseFloat(cleanAmount) || 0;
}

// זיהוי העברות פנימיות
function isInternalTransfer(description) {
    const desc = description.toLowerCase();
    
    const internalKeywords = [
        'העברה',
        'זיכוי פנימי',
        'העברה פנימית',
        'transfer',
        'internal',
        'העברת כספים',
        'זיכוי חשבון'
    ];
    
    return internalKeywords.some(keyword => desc.includes(keyword));
}

// פורמט תאריך
function formatDate(dateValue) {
    if (!dateValue) return '';
    
    const dateStr = dateValue.toString().trim();
    
    // אם זה כבר תאריך מפורמט טוב
    if (dateStr.includes('/') || dateStr.includes('-') || dateStr.includes('.')) {
        return dateStr;
    }
    
    // אם זה מספר (Excel date serial)
    if (/^\d+$/.test(dateStr)) {
        try {
            const excelDate = new Date((parseInt(dateStr) - 25569) * 86400 * 1000);
            return excelDate.toLocaleDateString('he-IL');
        } catch {
            return dateStr;
        }
    }
    
    return dateStr;
}

// הצגת תוצאות העלאה מפורטות
function showUploadResults(filesProcessed, duplicateFiles, errorFiles, transactionsCount) {
    let message = '📊 תוצאות העלאת קבצים:\n\n';
    
    if (filesProcessed > 0) {
        message += `✅ עובדו בהצלחה: ${filesProcessed} קבצים (${transactionsCount} עסקאות)\n\n`;
    }
    
    if (duplicateFiles.length > 0) {
        message += `🔄 קבצים כפולים (לא עובדו):\n`;
        duplicateFiles.forEach(fileName => {
            message += `   • ${fileName}\n`;
        });
        message += '\n';
    }
    
    if (errorFiles.length > 0) {
        message += `❌ קבצים עם שגיאות:\n`;
        errorFiles.forEach(({name, error}) => {
            message += `   • ${name}: ${error}\n`;
        });
        message += '\n';
    }
    
    if (filesProcessed === 0 && duplicateFiles.length === 0 && errorFiles.length === 0) {
        message += 'לא נמצאו קבצים לעיבוד.';
    }
    
    console.log('📊 תוצאות העלאה:', message);
    alert(message);
}

// ==========================
// DUPLICATE PREVENTION & DATA MANAGEMENT
// מניעת כפילויות וניהול נתונים
// ==========================

// פונקציה משופרת לבדיקת כפילויות קובץ
function checkForDuplicateFileAdvanced(newTransactions, fileName) {
    console.log(`🔍 בודק כפילויות עבור קובץ: ${fileName}`);
    
    // בדיקה אם הקובץ כבר נטען לפי שם
    if (appState.loadedFiles.has(fileName)) {
        console.log(`📂 קובץ ${fileName} כבר נטען קודם לפי שם`);
        return true;
    }
    
    // בדיקה אם יש 3+ עסקאות זהות
    if (!appState.extractedTransactions || appState.extractedTransactions.length === 0) {
        return false;
    }
    
    let exactMatches = 0;
    const sampleSize = Math.min(newTransactions.length, 10);
    
    for (let i = 0; i < sampleSize; i++) {
        const newTx = newTransactions[i];
        
        const exists = appState.extractedTransactions.some(existingTx => {
            return isSameTransaction(newTx, existingTx);
        });
        
        if (exists) {
            exactMatches++;
            console.log(`🔍 מצאתי עסקה זהה: ${newTx.description} - ${newTx.amount}₪`);
            
            if (exactMatches >= 3) {
                console.log(`❌ נמצאו ${exactMatches} עסקאות זהות - קובץ כפול!`);
                return true;
            }
        }
    }
    
    console.log(`✅ לא נמצאו כפילויות משמעותיות (${exactMatches} מתוך ${sampleSize})`);
    return false;
}

// בדיקה אם שתי עסקאות זהות
function isSameTransaction(tx1, tx2) {
    return tx1.date === tx2.date &&
           tx1.description.trim().toLowerCase() === tx2.description.trim().toLowerCase() &&
           Math.abs(tx1.amount - tx2.amount) < 1; // סובלנות של 1 שקל להבדלי עיגול
}

// רישום קובץ כטעון
function registerLoadedFile(fileName, transactions) {
    console.log(`📝 רושם קובץ כטעון: ${fileName} עם ${transactions.length} עסקאות`);
    
    appState.loadedFiles.add(fileName);
    
    // שמירת מיפוי קובץ לעסקאות
    const transactionIds = transactions.map(tx => tx.id);
    appState.fileTransactions.set(fileName, transactionIds);
    
    // עדכון מטא-דטה של העסקאות
    transactions.forEach(tx => {
        tx.sourceFile = fileName;
        tx.loadedAt = new Date().toISOString();
    });
}

// הצגת מידע על קבצים טעונים
function getLoadedFilesInfo() {
    const filesInfo = Array.from(appState.loadedFiles).map(fileName => {
        const transactionIds = appState.fileTransactions.get(fileName) || [];
        const transactionCount = transactionIds.length;
        
        return {
            fileName,
            transactionCount,
            loadedAt: getFileLoadTime(fileName)
        };
    });
    
    return filesInfo;
}

// קבלת זמן טעינת קובץ
function getFileLoadTime(fileName) {
    const transactions = appState.extractedTransactions.filter(tx => tx.sourceFile === fileName);
    if (transactions.length > 0) {
        return transactions[0].loadedAt || 'לא ידוע';
    }
    return 'לא ידוע';
}

// מחיקת כל העסקאות שנטענו מקבצים (לא מחיקת מיפויים)
function clearLoadedTransactions() {
    console.log('🗑️ מוחק את כל העסקאות שנטענו מקבצים...');
    
    const confirmMessage = `האם אתה בטוח שברצונך למחוק את כל העסקאות שנטענו מקבצים?

⚠️ פעולה זו תמחק:
• ${appState.extractedTransactions?.length || 0} עסקאות
• ${appState.loadedFiles.size} קבצים רשומים

✅ פעולה זו לא תמחק:
• מיפויי עסקים וקטגוריות
• הגדרות המערכת
• נתוני המילון החכם

האם להמשיך?`;

    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        // שמירת מיפויים חשובים לפני מחיקה
        const businessMappingsBackup = {...appState.businessMappings};
        const manualClassificationsBackup = {...appState.manualClassifications};
        const loadedKeywordsBackup = {...appState.loadedKeywords};
        const loadedBusinessDatabaseBackup = {...appState.loadedBusinessDatabase};
        const monthlyIncomesBackup = {...appState.monthlyIncomes};
        const netWorthBackup = {...appState.netWorth};
        
        // מחיקת נתוני עסקאות
        appState.rawData = [];
        appState.extractedTransactions = [];
        appState.categorizedData = [];
        appState.deletedTransactions = new Set();
        appState.yearlyExpenses = new Set();
        appState.loadedFiles = new Set();
        appState.fileTransactions = new Map();
        appState.uploadedFiles = [];
        
        // שחזור מיפויים
        appState.businessMappings = businessMappingsBackup;
        appState.manualClassifications = manualClassificationsBackup;
        appState.loadedKeywords = loadedKeywordsBackup;
        appState.loadedBusinessDatabase = loadedBusinessDatabaseBackup;
        appState.monthlyIncomes = monthlyIncomesBackup;
        appState.netWorth = netWorthBackup;
        appState.newBusinessesToSave = {};
        
        // איפוס מינימום סכום
        appState.minAmountFilter = 0;
        document.getElementById('minAmountFilter').value = '0';
        
        // איפוס תצוגה
        appState.showAllBusinesses = false;
        appState.showAllTransactions = false;
        appState.showTransactions = false;
        appState.selectedCategoryDetails = null;
        appState.showCashflowTable = false;
        appState.showNetWorthPanel = false;
        
        // הרס גרף אם קיים
        if (appState.chartInstance) {
            appState.chartInstance.destroy();
            appState.chartInstance = null;
        }
        
        // הסתרת כל הקונטיינרים
        hideAllContainers();
        showFileUpload();
        
        // הודעת הצלחה
        alert('✅ כל העסקאות נמחקו בהצלחה!\n\nמיפויי עסקים וקטגוריות נשמרו.');
        
        // עדכון סטטיסטיקות
        updateStatsDisplay();
        
        console.log('✅ מחיקת נתונים הושלמה בהצלחה');
        
    } catch (error) {
        console.error('❌ שגיאה במחיקת נתונים:', error);
        alert('❌ שגיאה במחיקת נתונים: ' + error.message);
    }
}

// מחיקת קובץ ספציפי
function clearSpecificFile(fileName) {
    console.log(`🗑️ מוחק קובץ ספציפי: ${fileName}`);
    
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הקובץ "${fileName}" ואת כל העסקאות שלו?`)) {
        return;
    }
    
    try {
        // מציאת העסקאות מהקובץ הספציפי
        const transactionsToRemove = appState.extractedTransactions.filter(tx => tx.sourceFile === fileName);
        const transactionIdsToRemove = new Set(transactionsToRemove.map(tx => tx.id));
        
        console.log(`🔍 נמצאו ${transactionsToRemove.length} עסקאות למחיקה מקובץ ${fileName}`);
        
        // מחיקה מכל המקומות
        appState.extractedTransactions = appState.extractedTransactions.filter(tx => tx.sourceFile !== fileName);
        appState.categorizedData = appState.categorizedData.filter(tx => !transactionIdsToRemove.has(tx.id));
        
        // ניקוי סטטוסים
        transactionIdsToRemove.forEach(id => {
            appState.deletedTransactions.delete(id);
            appState.yearlyExpenses.delete(id);
            delete appState.manualClassifications[id];
        });
        
        // מחיקה מרישומי קבצים
        appState.loadedFiles.delete(fileName);
        appState.fileTransactions.delete(fileName);
        
        // עדכון תצוגה
        updateDisplay();
        updateStatsDisplay();
        
        alert(`✅ הקובץ "${fileName}" ו-${transactionsToRemove.length} העסקאות שלו נמחקו בהצלחה!`);
        
        // אם לא נותרו עסקאות כלל
        if (appState.extractedTransactions.length === 0) {
            hideAllContainers();
            showFileUpload();
        }
        
        console.log(`✅ קובץ ${fileName} נמחק בהצלחה`);
        
    } catch (error) {
        console.error(`❌ שגיאה במחיקת קובץ ${fileName}:`, error);
        alert(`❌ שגיאה במחיקת הקובץ: ${error.message}`);
    }
}

// הצגת מידע מפורט על קבצים טעונים
function showLoadedFilesInfo() {
    const filesInfo = getLoadedFilesInfo();
    
    if (filesInfo.length === 0) {
        alert('לא נטענו קבצים כלל.');
        return;
    }
    
    const filesDetails = filesInfo.map(info => 
        `📁 ${info.fileName}\n   └ ${info.transactionCount} עסקאות\n   └ נטען: ${formatDateTime(info.loadedAt)}`
    ).join('\n\n');
    
    const message = `📊 קבצים טעונים במערכת:\n\n${filesDetails}\n\n📈 סה"כ: ${filesInfo.length} קבצים, ${filesInfo.reduce((sum, info) => sum + info.transactionCount, 0)} עסקאות`;
    
    alert(message);
}

// פורמט תאריך ושעה
function formatDateTime(dateString) {
    if (!dateString || dateString === 'לא ידוע') return 'לא ידוע';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL') + ' ' + date.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'});
    } catch {
        return dateString;
    }
}

// החלפת הפונקציה הקיימת
async function analyzeFileDataAdvanced(transactions) {
    if (!transactions || transactions.length === 0) {
        alert('לא נמצאו עסקאות לניתוח');
        showFileUpload();
        return;
    }
    
    console.log(`🔍 מנתח ${transactions.length} עסקאות חדשות`);
    
    // מיזוג עם עסקאות קיימות
    appState.extractedTransactions = [...(appState.extractedTransactions || []), ...transactions];
    
    // המשך עם הסיווג הקיים
    await categorizeTransactionsWithSmartSystem(appState.extractedTransactions);
}

// ==========================
// ENHANCED UI FUNCTIONS - הממשק החדש
// פונקציות ממשק משופרות
// ==========================

// עדכון תצוגת כפתורי ניהול נתונים
function updateDataManagementButtons() {
    const buttonsContainer = document.getElementById('dataManagementButtons');
    const hasData = appState.extractedTransactions && appState.extractedTransactions.length > 0;
    
    if (buttonsContainer) {
        buttonsContainer.style.display = hasData ? 'flex' : 'none';
    }
}

// הצגת ניהול קבצים מתקדם
function showAdvancedFileManagement() {
    const modal = document.getElementById('advancedFileManagement');
    if (modal) {
        modal.style.display = 'flex';
        refreshFilesList();
    }
}

// סגירת ניהול קבצים מתקדם
function closeAdvancedFileManagement() {
    const modal = document.getElementById('advancedFileManagement');
    if (modal) {
        modal.style.display = 'none';
    }
}

// רענון רשימת קבצים
function refreshFilesList() {
    const filesListContainer = document.getElementById('loadedFilesList');
    
    if (!filesListContainer) return;
    
    const filesInfo = getLoadedFilesInfo();
    
    if (filesInfo.length === 0) {
        filesListContainer.innerHTML = `
            <div class="text-center text-slate-500 py-8">
                <span class="text-4xl">📂</span>
                <div class="mt-2">לא נטענו קבצים כלל</div>
            </div>
        `;
        return;
    }
    
    filesListContainer.innerHTML = filesInfo.map(info => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-name">📁 ${info.fileName}</div>
                <div class="file-stats">
                    ${info.transactionCount} עסקאות • נטען: ${formatDateTime(info.loadedAt)}
                </div>
            </div>
            <div class="file-actions">
                <button onclick="clearSpecificFile('${info.fileName.replace(/'/g, "\\\'")}')" 
                        class="btn-small danger" title="מחק קובץ זה">
                    🗑️ מחק
                </button>
            </div>
        </div>
    `).join('');
}

// ייצוא דוח קבצים
function exportFilesReport() {
    const filesInfo = getLoadedFilesInfo();
    
    if (filesInfo.length === 0) {
        alert('אין קבצים לייצוא');
        return;
    }
    
    const reportData = [
        ['שם קובץ', 'מספר עסקאות', 'תאריך טעינה'],
        ...filesInfo.map(info => [
            info.fileName,
            info.transactionCount,
            formatDateTime(info.loadedAt)
        ])
    ];
    
    const csv = Papa.unparse(reportData, { header: true });
    const BOM = '\uFEFF';
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(BOM + csv));
    element.setAttribute('download', `דוח-קבצים-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    alert('✅ דוח קבצים יוצא בהצלחה!');
}

// עדכון סטטיסטיקות מורחב
function updateStatsDisplayEnhanced() {
    // עדכון בסיסי
    updateStatsDisplay();
    
    // עדכון נוסף למונים חדשים
    const loadedFilesCountElement = document.getElementById('loadedFilesCount');
    const fileTransactionsCountElement = document.getElementById('fileTransactionsCount');
    
    if (loadedFilesCountElement) {
        loadedFilesCountElement.textContent = appState.loadedFiles ? appState.loadedFiles.size : 0;
    }
    
    if (fileTransactionsCountElement) {
        fileTransactionsCountElement.textContent = appState.extractedTransactions ? appState.extractedTransactions.length : 0;
    }
    
    // עדכון כפתורי ניהול
    updateDataManagementButtons();
}

// sגירת מודל בלחיצה על הרקע
document.addEventListener('click', function(event) {
    const modal = document.getElementById('advancedFileManagement');
    if (modal && event.target === modal) {
        closeAdvancedFileManagement();
    }
});

// [המשך בחלק הבא...]

// ==========================
// CATEGORIZATION FUNCTIONS - WITH CLAUDE INTEGRATION
// פונקציות סיווג עם אינטגרציה לקלוד
// ==========================

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

// זיהוי עסקה שנראית כמו הכנסה
function isLikelyIncome(transaction) {
    const desc = transaction.description.toLowerCase();
    const amount = transaction.amount;
    
    // מילות מפתח להכנסה
    const incomeKeywords = [
        'משכורת',
        'שכר',
        'salary',
        'העברה נכנסת',
        'זיכוי',
        'קיצבה',
        'דמי אבטלה',
        'פיצויים',
        'מענק',
        'החזר מס',
        'לאומי',
        'ביטוח לאומי'
    ];
    
    // סכום גבוה (מעל 3000 ש"ח) + מילת מפתח
    if (amount > 3000 && incomeKeywords.some(keyword => desc.includes(keyword))) {
        return true;
    }
    
    // סכום גבוה מאוד (מעל 8000 ש"ח) גם בלי מילת מפתח
    if (amount > 8000) {
        return true;
    }
    
    return false;
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
    
    // שלב 2: סימון הוצאות שנתיות ושמירה
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

// הוספה לתחילת expenses-app.js
// טען השלמה לשימוש עם SheetJS להפיכת Excel
// הוסף זאת ל-head של HTML:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

// פונקציה מתקדמת להחלפת handleFileUpload הקיימת
async function handleFileUploadAdvanced(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    console.log('🚀 Advanced Bank Processor - התחלת עיבוד קבצים:', files.map(f => f.name));
    
    appState.uploadedFiles = files.map(f => f.name);
    let allTransactions = [];
    let filesProcessed = 0;
    let duplicateFiles = [];
    
    for (const file of files) {
        try {
            console.log(`📁 מעבד קובץ: ${file.name}`);
            
            // שלב 1: זיהוי סוג קובץ וקריאה
            const fileData = await readFileAdvanced(file);
            
            if (!fileData || fileData.length === 0) {
                console.log(`⚠️ קובץ ריק או לא נתמך: ${file.name}`);
                continue;
            }
            
            // שלב 2: ניקוי ועיבוד הנתונים
            const cleanedData = cleanBankData(fileData, file.name);
            
            if (!cleanedData || cleanedData.length === 0) {
                console.log(`⚠️ לא נמצאו נתונים תקינים בקובץ: ${file.name}`);
                continue;
            }
            
            // שלב 3: זיהוי עמודות ויצירת עסקאות
            const transactions = await processBankTransactions(cleanedData, file.name);
            
            if (!transactions || transactions.length === 0) {
                console.log(`⚠️ לא נמצאו עסקאות בקובץ: ${file.name}`);
                continue;
            }
            
            // שלב 4: בדיקת כפילויות
            const isDuplicate = checkForDuplicateFile(transactions);
            
            if (isDuplicate) {
                duplicateFiles.push(file.name);
                console.log(`🔄 קובץ כפול זוהה: ${file.name}`);
                continue;
            }
            
            // שלב 5: הוספה לנתונים
            allTransactions = [...allTransactions, ...transactions];
            filesProcessed++;
            
            console.log(`✅ קובץ עובד בהצלחה: ${file.name} - ${transactions.length} עסקאות`);
            
        } catch (error) {
            console.error(`❌ שגיאה בעיבוד הקובץ ${file.name}:`, error);
            alert(`שגיאה בעיבוד הקובץ ${file.name}: ${error.message}`);
        }
    }
    
    // דיווח על תוצאות
    if (duplicateFiles.length > 0) {
        alert(`🔄 הקבצים הבאים כבר נטענו קודם ולא יעובדו שוב:\n${duplicateFiles.join('\n')}`);
    }
    
    if (filesProcessed > 0 && allTransactions.length > 0) {
        console.log(`🎉 סיכום: עובדו ${filesProcessed} קבצים עם ${allTransactions.length} עסקאות`);
        
        // מיזוג עם נתונים קיימים
        appState.rawData = [...(appState.rawData || []), ...allTransactions];
        appState.extractedTransactions = [...(appState.extractedTransactions || []), ...allTransactions];
        
        hideFileUpload();
        
        setTimeout(() => {
            analyzeFileDataAdvanced(allTransactions);
        }, 500);
        
    } else if (duplicateFiles.length > 0 && filesProcessed === 0) {
        alert('כל הקבצים שהועלו כבר קיימים במערכת.');
    } else {
        alert('לא נמצאו נתונים תקינים באף אחד מהקבצים.');
    }
}

// בדיקת כפילויות קובץ
function checkForDuplicateFile(newTransactions) {
    if (!appState.extractedTransactions || appState.extractedTransactions.length === 0) {
        return false;
    }
    
    // בדיקה של 3+ עסקאות זהות
    let matchCount = 0;
    
    for (const newTx of newTransactions.slice(0, 10)) { // בדיקה של עד 10 עסקאות ראשונות
        const exists = appState.extractedTransactions.some(existingTx => {
            return existingTx.date === newTx.date &&
                   existingTx.description === newTx.description &&
                   existingTx.amount === newTx.amount;
        });
        
        if (exists) {
            matchCount++;
            if (matchCount >= 3) {
                return true;
            }
        }
    }
    
    return false;
}

// המשך של הקוד הקיים...
// [שאר הפונקציות נשארות כמו שהן מהקוד המקורי]

// ==========================
// LOADING STATUS FUNCTIONS
// פונקציות סטטוס טעינה
// ==========================

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

// הפונקציות הקיימות נשארות ללא שינוי...
// [פונקציות מהקוד המקורי]

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
            minAmountFilter: appState.minAmountFilter,
            
            // נתונים חדשים
            monthlyIncomes: appState.monthlyIncomes,
            netWorth: appState.netWorth,
            loadedFiles: Array.from(appState.loadedFiles)
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

                // טעינת נתונים חדשים
                appState.monthlyIncomes = data.monthlyIncomes || {};
                appState.netWorth = data.netWorth || appState.netWorth;
                if (data.loadedFiles) {
                    appState.loadedFiles = new Set(data.loadedFiles);
                }

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

// ==========================
// DISPLAY UPDATE FUNCTIONS
// פונקציות עדכון תצוגה
// ==========================

function updateDisplay() {
    updateAlerts();
    updateResults();
    updateChart();
    updateBusinessAnalysis();
    updateStatsDisplay();
    
    // הוספות חדשות
    updateStatsDisplayEnhanced();
    updateDataManagementButtons();
    updateCashflowButtonVisibility();
    updateNetWorthButtonVisibility();
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

// ==========================
// BUSINESS FUNCTIONS
// פונקציות עסקים
// ==========================

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


// ==========================
// TRANSACTIONS TABLE FUNCTIONS
// פונקציות טבלת עסקאות
// ==========================

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

// ==========================
// CATEGORY DETAILS FUNCTIONS
// פונקציות פירוט קטגוריות
// ==========================

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

// ==========================
// MONTHLY CASHFLOW FUNCTIONS
// פונקציות תזרים חודשי
// ==========================

function showMonthlyCashflow() {
    appState.showCashflowTable = !appState.showCashflowTable;
    
    if (appState.showCashflowTable) {
        calculateMonthlyCashflow();
        renderMonthlyCashflowTable();
        document.getElementById('monthlyCashflowModal').style.display = 'flex';
    } else {
        document.getElementById('monthlyCashflowModal').style.display = 'none';
    }
}

function closeMonthlyCashflow() {
    appState.showCashflowTable = false;
    document.getElementById('monthlyCashflowModal').style.display = 'none';
}

function calculateMonthlyCashflow() {
    const transactions = getFilteredTransactions();
    const monthlyData = {};
    
    // חישוב הוצאות לפי חודש
    transactions.forEach(transaction => {
        if (appState.deletedTransactions.has(transaction.id)) return;
        
        const date = transaction.date;
        let monthKey;
        
        // ניסיון לפרס תאריך
        try {
            let parsedDate;
            if (date.includes('/')) {
                const parts = date.split('/');
                parsedDate = new Date(parts[2], parts[1] - 1, parts[0]);
            } else if (date.includes('-')) {
                parsedDate = new Date(date);
            } else {
                parsedDate = new Date();
            }
            
            monthKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
        } catch {
            monthKey = 'לא ידוע';
        }
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                expenses: 0,
                income: 0,
                transactions: []
            };
        }
        
        const amount = getDisplayAmount(transaction);
        monthlyData[monthKey].expenses += amount;
        monthlyData[monthKey].transactions.push(transaction);
    });
    
    // הוספת הכנסות מהגדרות ידניות
    Object.entries(appState.monthlyIncomes).forEach(([month, income]) => {
        if (!monthlyData[month]) {
            monthlyData[month] = {
                expenses: 0,
                income: 0,
                transactions: []
            };
        }
        monthlyData[month].income = income;
    });
    
    // זיהוי הכנסות מעו"ש (סכומים גבוהים שהושגו מקבצי בנק)
    transactions.forEach(transaction => {
        if (transaction.accountType === 'עו"ש' && isLikelyIncome(transaction)) {
            const date = transaction.date;
            let monthKey;
            
            try {
                let parsedDate;
                if (date.includes('/')) {
                    const parts = date.split('/');
                    parsedDate = new Date(parts[2], parts[1] - 1, parts[0]);
                } else if (date.includes('-')) {
                    parsedDate = new Date(date);
                } else {
                    parsedDate = new Date();
                }
                
                monthKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
            } catch {
                monthKey = 'לא ידוע';
            }
            
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].income += transaction.amount;
            }
        }
    });
    
    appState.monthlyCashflow = monthlyData;
}

function renderMonthlyCashflowTable() {
    const tableBody = document.getElementById('cashflowTableBody');
    const months = Object.keys(appState.monthlyCashflow).sort().reverse();
    
    if (months.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-slate-500">
                    לא נמצאו נתונים לתזרים חודשי
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = months.map(month => {
        const data = appState.monthlyCashflow[month];
        const income = data.income || 0;
        const expenses = data.expenses || 0;
        const balance = income - expenses;
        const savingsPercent = income > 0 ? ((balance / income) * 100).toFixed(1) : '0.0';
        
        const balanceColor = balance >= 0 ? 'text-green-600' : 'text-red-600';
        const savingsColor = parseFloat(savingsPercent) >= 10 ? 'text-green-600' : 
                            parseFloat(savingsPercent) >= 0 ? 'text-yellow-600' : 'text-red-600';
        
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="p-4 font-semibold">${formatMonthDisplay(month)}</td>
                <td class="p-4">
                    <span class="editable-income cursor-pointer hover:bg-blue-50 px-2 py-1 rounded" 
                          onclick="editMonthlyIncome('${month}', ${income})">
                        ₪${income.toLocaleString()}
                        <span class="text-xs text-slate-500 mr-2">✏️</span>
                    </span>
                </td>
                <td class="p-4 font-semibold">₪${expenses.toLocaleString()}</td>
                <td class="p-4 font-bold ${balanceColor}">₪${balance.toLocaleString()}</td>
                <td class="p-4 font-semibold ${savingsColor}">${savingsPercent}%</td>
            </tr>
        `;
    }).join('');
    
    // סיכום כולל
    const totalIncome = months.reduce((sum, month) => sum + (appState.monthlyCashflow[month].income || 0), 0);
    const totalExpenses = months.reduce((sum, month) => sum + (appState.monthlyCashflow[month].expenses || 0), 0);
    const totalBalance = totalIncome - totalExpenses;
    const totalSavingsPercent = totalIncome > 0 ? ((totalBalance / totalIncome) * 100).toFixed(1) : '0.0';
    
    const summaryElement = document.getElementById('cashflowSummary');
    if (summaryElement) {
        summaryElement.innerHTML = `
            <div class="bg-slate-100 p-4 rounded-lg border-t-2 border-slate-300">
                <div class="grid grid-cols-5 gap-4 text-center font-bold">
                    <div>סה"כ ${months.length} חודשים</div>
                    <div class="text-blue-600">₪${totalIncome.toLocaleString()}</div>
                    <div class="text-slate-700">₪${totalExpenses.toLocaleString()}</div>
                    <div class="${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}">₪${totalBalance.toLocaleString()}</div>
                    <div class="${parseFloat(totalSavingsPercent) >= 10 ? 'text-green-600' : 'text-yellow-600'}">${totalSavingsPercent}%</div>
                </div>
            </div>
        `;
    }
}

function formatMonthDisplay(monthKey) {
    const [year, month] = monthKey.split('-');
    const monthNames = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function editMonthlyIncome(month, currentIncome) {
    const newIncome = prompt(`עדכן הכנסה חודשית עבור ${formatMonthDisplay(month)}:`, currentIncome);
    
    if (newIncome !== null) {
        const amount = parseFloat(newIncome) || 0;
        appState.monthlyIncomes[month] = amount;
        
        // עדכון התצוגה
        calculateMonthlyCashflow();
        renderMonthlyCashflowTable();
        
        // שמירה
        autoSaveToFirebase();
    }
}

function updateCashflowButtonVisibility() {
    const cashflowButton = document.getElementById('cashflowButton');
    const hasTransactions = appState.categorizedData && appState.categorizedData.length > 0;
    
    if (cashflowButton) {
        cashflowButton.style.display = hasTransactions ? 'inline-flex' : 'none';
    }
}

// ==========================
// NET WORTH FUNCTIONS
// פונקציות שווי נקי
// ==========================

function showNetWorth() {
    appState.showNetWorthPanel = !appState.showNetWorthPanel;
    
    if (appState.showNetWorthPanel) {
        calculateAutoAssets();
        renderNetWorthPanel();
        document.getElementById('netWorthModal').style.display = 'flex';
    } else {
        document.getElementById('netWorthModal').style.display = 'none';
    }
}

function closeNetWorth() {
    appState.showNetWorthPanel = false;
    document.getElementById('netWorthModal').style.display = 'none';
}

function calculateAutoAssets() {
    // חישוב יתרת עו"ש מעסקאות (אוטומטי)
    const checkingAccountBalance = calculateCheckingAccountBalance();
    appState.netWorth.assets.checkingAccount = checkingAccountBalance;
}

function calculateCheckingAccountBalance() {
    const transactions = appState.extractedTransactions || [];
    let balance = 0;
    
    transactions.forEach(transaction => {
        if (transaction.accountType === 'עו"ש') {
            if (isLikelyIncome(transaction)) {
                balance += transaction.amount;
            } else {
                balance -= transaction.amount;
            }
        }
    });
    
    return Math.max(0, balance); // לא להציג יתרה שלילית
}

function renderNetWorthPanel() {
    const assets = appState.netWorth.assets;
    const liabilities = appState.netWorth.liabilities;
    
    // עדכון שדות נכסים
    document.getElementById('investmentsAmount').value = assets.investments || 0;
    document.getElementById('checkingAccountAmount').value = assets.checkingAccount || 0;
    document.getElementById('pensionFundsAmount').value = assets.pensionFunds || 0;
    document.getElementById('realEstateAmount').value = assets.realEstate || 0;
    document.getElementById('otherAssetsAmount').value = assets.other || 0;
    
    // עדכון שדות התחייבויות
    document.getElementById('mortgageAmount').value = liabilities.mortgage || 0;
    document.getElementById('loansAmount').value = liabilities.loans || 0;
    document.getElementById('creditCardsAmount').value = liabilities.creditCards || 0;
    document.getElementById('otherLiabilitiesAmount').value = liabilities.other || 0;
    
    updateNetWorthCalculation();
    renderNetWorthHistory();
}

function updateNetWorthCalculation() {
    const assets = {
        investments: parseFloat(document.getElementById('investmentsAmount').value) || 0,
        checkingAccount: parseFloat(document.getElementById('checkingAccountAmount').value) || 0,
        pensionFunds: parseFloat(document.getElementById('pensionFundsAmount').value) || 0,
        realEstate: parseFloat(document.getElementById('realEstateAmount').value) || 0,
        other: parseFloat(document.getElementById('otherAssetsAmount').value) || 0
    };
    
    const liabilities = {
        mortgage: parseFloat(document.getElementById('mortgageAmount').value) || 0,
        loans: parseFloat(document.getElementById('loansAmount').value) || 0,
        creditCards: parseFloat(document.getElementById('creditCardsAmount').value) || 0,
        other: parseFloat(document.getElementById('otherLiabilitiesAmount').value) || 0
    };
    
    const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
    const netWorth = totalAssets - totalLiabilities;
    
    // עדכון תצוגה
    document.getElementById('totalAssets').textContent = `₪${totalAssets.toLocaleString()}`;
    document.getElementById('totalLiabilities').textContent = `₪${totalLiabilities.toLocaleString()}`;
    document.getElementById('currentNetWorth').textContent = `₪${netWorth.toLocaleString()}`;
    document.getElementById('currentNetWorth').className = netWorth >= 0 ? 'text-green-600' : 'text-red-600';
    
    // עדכון הנתונים במצב
    appState.netWorth.assets = assets;
    appState.netWorth.liabilities = liabilities;
}

function saveNetWorthSnapshot() {
    updateNetWorthCalculation();
    
    const totalAssets = Object.values(appState.netWorth.assets).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(appState.netWorth.liabilities).reduce((sum, val) => sum + val, 0);
    const netWorth = totalAssets - totalLiabilities;
    
    const snapshot = {
        date: new Date().toISOString(),
        assets: {...appState.netWorth.assets},
        liabilities: {...appState.netWorth.liabilities},
        totalAssets,
        totalLiabilities,
        netWorth
    };
    
    appState.netWorth.history.push(snapshot);
    appState.netWorth.lastUpdated = new Date().toISOString();
    
    // שמירה
    autoSaveToFirebase();
    
    // עדכון תצוגה
    renderNetWorthHistory();
    
    alert('✅ שווי נקי נשמר בהצלחה!');
}

function renderNetWorthHistory() {
    const historyContainer = document.getElementById('netWorthHistory');
    const history = appState.netWorth.history || [];
    
    if (history.length === 0) {
        historyContainer.innerHTML = `
            <div class="text-center text-slate-500 py-8">
                <span class="text-4xl">📊</span>
                <div class="mt-2">אין היסטוריה של שווי נקי</div>
                <div class="text-sm">לחץ על "עדכן שווי נקי" כדי לשמור נקודת נתונים ראשונה</div>
            </div>
        `;
        return;
    }
    
    // מיון לפי תאריך (החדש ביותר קודם)
    const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    historyContainer.innerHTML = `
        <div class="space-y-4">
            ${sortedHistory.map((snapshot, index) => {
                const date = new Date(snapshot.date);
                const isLatest = index === 0;
                const previousSnapshot = sortedHistory[index + 1];
                let changeInfo = '';
                
                if (previousSnapshot) {
                    const change = snapshot.netWorth - previousSnapshot.netWorth;
                    const changePercent = previousSnapshot.netWorth !== 0 ? 
                        ((change / Math.abs(previousSnapshot.netWorth)) * 100).toFixed(1) : '0.0';
                    const changeColor = change >= 0 ? 'text-green-600' : 'text-red-600';
                    const changeIcon = change >= 0 ? '📈' : '📉';
                    
                    changeInfo = `
                        <div class="text-sm ${changeColor}">
                            ${changeIcon} ${change >= 0 ? '+' : ''}₪${change.toLocaleString()} (${changePercent}%)
                        </div>
                    `;
                }
                
                return `
                    <div class="bg-white rounded-lg p-4 border ${isLatest ? 'border-blue-200 bg-blue-50' : 'border-slate-200'}">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="font-semibold text-slate-800">
                                    ${date.toLocaleDateString('he-IL')}
                                    ${isLatest ? '<span class="text-blue-600 text-sm">(עדכני)</span>' : ''}
                                </div>
                                <div class="text-lg font-bold ${snapshot.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}">
                                    ₪${snapshot.netWorth.toLocaleString()}
                                </div>
                                ${changeInfo}
                            </div>
                            <div class="text-right text-sm text-slate-600">
                                <div>נכסים: ₪${snapshot.totalAssets.toLocaleString()}</div>
                                <div>התחייבויות: ₪${snapshot.totalLiabilities.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function updateNetWorthButtonVisibility() {
    const netWorthButton = document.getElementById('netWorthButton');
    const hasData = (appState.categorizedData && appState.categorizedData.length > 0) || 
                   (appState.netWorth.history && appState.netWorth.history.length > 0);
    
    if (netWorthButton) {
        netWorthButton.style.display = hasData ? 'inline-flex' : 'none';
    }
}

// ==========================
// UTILITY FUNCTIONS
// פונקציות עזר
// ==========================

function getFilteredTransactions() {
    return appState.categorizedData.filter(transaction => {
        const amount = getDisplayAmount(transaction);
        return amount >= appState.minAmountFilter;
    });
}

// ==========================
// SETTINGS FUNCTIONS
// פונקציות הגדרות
// ==========================

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
        appState.loadedFiles = new Set();
        appState.fileTransactions = new Map();
        appState.monthlyCashflow = {};
        appState.monthlyIncomes = {};
        appState.showCashflowTable = false;
        appState.netWorth.history = [];
        appState.showNetWorthPanel = false;
        
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

// ==========================
// UI CONTROL FUNCTIONS
// פונקציות בקרת ממשק
// ==========================

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

// מודל closers
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// סגירת מודלים בלחיצה על הרקע
document.addEventListener('click', function(event) {
    // רשימת מודלים
    const modals = [
        'advancedFileManagement',
        'monthlyCashflowModal', 
        'netWorthModal'
    ];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && event.target === modal) {
            modal.style.display = 'none';
            // עדכון state בהתאם
            if (modalId === 'monthlyCashflowModal') {
                appState.showCashflowTable = false;
            } else if (modalId === 'netWorthModal') {
                appState.showNetWorthPanel = false;
            }
        }
    });
});

// ==========================
// INITIALIZATION
// אתחול המערכת
// ==========================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOMContentLoaded: מנתח ההוצאות מתקדם נטען...');
    
    // החלפת handleFileUpload הקיימת לגרסה המתקדמת
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.onchange = handleFileUploadWithDuplicateCheck;
    }
    
    // אתחול אירועי לחיצה נוספים
    initializeEventListeners();
    
    // Check authentication status
    const isAuthenticated = await checkAuthStatus();
    
    if (isAuthenticated) {
        console.log('✅ DOMContentLoaded: משתמש מזוהה - ממשיך לטעינת נתונים');
        
        // Load data from Firebase
        await loadDataFromFirebase();
        
        // Load user's previous analysis if exists
        await loadUserAnalysis();
        
        // עדכון תצוגת כפתורים
        updateDataManagementButtons();
        updateCashflowButtonVisibility();
        updateNetWorthButtonVisibility();
    }
    
    console.log('🎉 DOMContentLoaded: סיום אתחול מערכת מתקדמת');
});

function initializeEventListeners() {
    // תמיכה בגרירה לאזור העלאה
    const uploadZone = document.querySelector('.upload-zone');
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                // סימולציה של event לפונקציה
                handleFileUploadWithDuplicateCheck({target: {files}});
            }
        });
    }
    
    // אירועי מקלדת
    document.addEventListener('keydown', (e) => {
        // ESC לסגירת מודלים
        if (e.key === 'Escape') {
            if (appState.showCashflowTable) {
                closeMonthlyCashflow();
            }
            if (appState.showNetWorthPanel) {
                closeNetWorth();
            }
            if (document.getElementById('advancedFileManagement').style.display === 'flex') {
                closeAdvancedFileManagement();
            }
        }
        
        // Ctrl+S לשמירה (מניעת שמירת הדף)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            autoSaveToFirebase();
        }
    });
}

console.log('✅ מנתח ההוצאות המתקדם - הקובץ נטען בהצלחה!');
