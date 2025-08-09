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