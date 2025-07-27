// ==========================
// NETLIFY FUNCTION: CLASSIFY BUSINESS
// פונקציית Netlify לסיווג עסקים עם Claude API
// ==========================

exports.handler = async (event, context) => {
    console.log('🚀 CLASSIFY BUSINESS FUNCTION STARTED!');
    console.log('📞 Function called with:', {
        httpMethod: event.httpMethod,
        path: event.path,
        headers: Object.keys(event.headers || {}),
        bodyLength: event.body ? event.body.length : 0,
        origin: event.headers?.origin || 'unknown'
    });

    // CORS headers - תמיכה בכל הדומיינים
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400"
    };

    // Handle OPTIONS request (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        console.log('✅ Handling CORS preflight request');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }

    // רק POST requests מותרים
    if (event.httpMethod !== 'POST') {
        console.log('❌ Wrong HTTP method:', event.httpMethod);
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                error: 'Method not allowed', 
                allowed: ['POST', 'OPTIONS'],
                received: event.httpMethod
            })
        };
    }

    console.log('✅ POST method confirmed');

    try {
        // שלב 1: פרסור הבקשה
        console.log('📦 Parsing request body...');
        console.log('📦 Raw body:', event.body?.substring(0, 200) + '...');
        
        if (!event.body) {
            console.log('❌ Empty request body');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Missing request body',
                    expected: 'JSON with businessList field'
                })
            };
        }

        let requestData;
        try {
            requestData = JSON.parse(event.body);
        } catch (parseError) {
            console.log('❌ JSON parsing failed:', parseError.message);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid JSON in request body',
                    details: parseError.message
                })
            };
        }

        const { businessList } = requestData;
        console.log('📋 Extracted businessList:', businessList);
        
        if (!businessList || typeof businessList !== 'string' || !businessList.trim()) {
            console.log('❌ Invalid or empty businessList');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Missing or invalid businessList field',
                    expected: 'Non-empty string',
                    received: typeof businessList
                })
            };
        }

        // שלב 2: בדיקת API Key
        console.log('🔑 Checking Claude API key...');
        const apiKey = process.env.CLAUDE_API_KEY;
        
        if (!apiKey) {
            console.log('❌ Missing API key in environment');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Server configuration error',
                    message: 'API key not configured'
                })
            };
        }

        console.log('🔑 API key found, length:', apiKey.length);
        console.log('🔑 API key prefix:', apiKey.substring(0, 10) + '...');

        // שלב 3: הכנת הפרומט המאופטמל
        const businesses = businessList.split(',').map(b => b.trim()).filter(b => b.length > 0);
        console.log('🏢 Parsed businesses:', businesses);

        if (businesses.length === 0) {
            console.log('❌ No valid businesses after parsing');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'No valid businesses found in list',
                    original: businessList
                })
            };
        }

        const prompt = `Classify these Israeli businesses into categories. Return only comma-separated categories in the same order.

Categories: Vehicle, Food, Shopping, Debt, Entertainment, Insurance, Education, Bills, Health, Housing

Businesses: ${businesses.join(', ')}

Respond with only the categories, comma-separated, no explanations.`;

        console.log('📝 Prompt created, length:', prompt.length);
        console.log('📝 Prompt preview:', prompt.substring(0, 150) + '...');

        // שלב 4: קריאה ל-Claude API
        console.log('🤖 Calling Claude API...');
        
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 150,
                temperature: 0,
                messages: [
                    { 
                        role: "user", 
                        content: prompt 
                    }
                ]
            })
        });

        console.log('📡 Claude API response status:', claudeResponse.status);
        console.log('📡 Claude API response headers:', Object.fromEntries(claudeResponse.headers.entries()));

        // שלב 5: טיפול בתגובת Claude
        if (!claudeResponse.ok) {
            const errorText = await claudeResponse.text();
            console.log('❌ Claude API error response:', errorText);
            
            let errorMessage = `Claude API returned ${claudeResponse.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorMessage;
            } catch {
                // אם זה לא JSON, השתמש בטקסט
                errorMessage = errorText.substring(0, 100);
            }
            
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({ 
                    error: 'Claude API error',
                    status: claudeResponse.status,
                    message: errorMessage,
                    timestamp: new Date().toISOString()
                })
            };
        }

        console.log('✅ Claude API response OK, parsing JSON...');
        
        let claudeData;
        try {
            claudeData = await claudeResponse.json();
        } catch (parseError) {
            console.log('❌ Failed to parse Claude response as JSON:', parseError.message);
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid response from Claude API',
                    details: parseError.message
                })
            };
        }

        console.log('📄 Claude response data structure:', {
            hasContent: !!claudeData.content,
            contentLength: claudeData.content?.length || 0,
            firstContentType: claudeData.content?.[0]?.type
        });
        
        // שלב 6: חילוץ התוצאה
        if (!claudeData.content || !claudeData.content[0] || !claudeData.content[0].text) {
            console.log('❌ Unexpected Claude response structure:', claudeData);
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({ 
                    error: 'Unexpected response structure from Claude',
                    received: claudeData
                })
            };
        }

        const rawClassification = claudeData.content[0].text.trim();
        console.log('🎯 Raw Claude classification:', rawClassification);

        // ניקוי התוצאה (הסרת markdown אם יש)
        const cleanClassification = rawClassification
            .replace(/```[a-z]*\n?/g, '') // הסרת markdown code blocks
            .replace(/\n/g, '') // הסרת שורות חדשות
            .trim();

        console.log('🎯 Clean classification:', cleanClassification);

        // בדיקת תקינות התוצאה
        const categories = cleanClassification.split(',').map(c => c.trim()).filter(c => c.length > 0);
        console.log('📊 Parsed categories:', categories);
        console.log('📊 Expected businesses count:', businesses.length);
        console.log('📊 Received categories count:', categories.length);

        // אזהרה אם מספר הקטגוריות לא תואם
        if (categories.length !== businesses.length) {
            console.log('⚠️ Category count mismatch - continuing anyway');
        }

        // שלב 7: החזרת תוצאה מוצלחת
        const response = {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                classification: cleanClassification,
                businesses: businesses,
                categories: categories,
                metadata: {
                    businessCount: businesses.length,
                    categoryCount: categories.length,
                    processingTime: Date.now(),
                    model: "claude-sonnet-4-20250514"
                },
                debug: {
                    originalPrompt: prompt,
                    rawResponse: rawClassification,
                    cleanResponse: cleanClassification
                }
            })
        };

        console.log('✅ Returning successful response');
        console.log('📤 Response preview:', JSON.stringify(response.body).substring(0, 200) + '...');
        
        return response;

    } catch (error) {
        // שלב 8: טיפול בשגיאות כלליות
        console.error('💀 CRITICAL ERROR in function:');
        console.error('💀 Error name:', error.name);
        console.error('💀 Error message:', error.message);
        console.error('💀 Error stack:', error.stack);
        
        // מידע נוסף על השגיאה
        const errorInfo = {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3), // רק 3 שורות ראשונות
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform
        };

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: 'An unexpected error occurred while processing your request',
                details: process.env.NODE_ENV === 'development' ? errorInfo : undefined,
                timestamp: new Date().toISOString()
            })
        };
    }
};

// ==========================
// HELPER FUNCTIONS
// פונקציות עזר
// ==========================

// פונקציה לוולידציה של קטגוריות
function validateCategories(categories) {
    const validCategories = [
        'Vehicle', 'Food', 'Shopping', 'Debt', 'Entertainment', 
        'Insurance', 'Education', 'Bills', 'Health', 'Housing'
    ];
    
    return categories.every(category => 
        validCategories.includes(category) || category === 'Other'
    );
}

// פונקציה לניקוי טקסט
function cleanText(text) {
    return text
        .replace(/[^\w\s,.-]/g, '') // הסרת תווים מיוחדים
        .replace(/\s+/g, ' ') // החלפת רווחים מרובים ברווח יחיד
        .trim();
}

// פונקציה ללוגים מפורטים
function logRequest(event) {
    const logData = {
        timestamp: new Date().toISOString(),
        method: event.httpMethod,
        path: event.path,
        userAgent: event.headers?.['user-agent']?.substring(0, 50),
        origin: event.headers?.origin,
        contentLength: event.body?.length || 0,
        hasApiKey: !!process.env.CLAUDE_API_KEY
    };
    
    console.log('📊 Request details:', JSON.stringify(logData, null, 2));
    return logData;
}

console.log('✅ Netlify Function: classify-business.js loaded successfully');
console.log('🔧 Environment check:', {
    nodeVersion: process.version,
    hasClaudeKey: !!process.env.CLAUDE_API_KEY,
    keyLength: process.env.CLAUDE_API_KEY?.length || 0
});