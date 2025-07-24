exports.handler = async (event, context) => {
  console.log('🚀 FUNCTION STARTED!');
  console.log('📞 Function called with:', {
    httpMethod: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers || {}),
    bodyLength: event.body ? event.body.length : 0
  });

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // רק POST requests
  if (event.httpMethod !== 'POST') {
    console.log('❌ Wrong method:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  console.log('✅ POST method confirmed');

  try {
    console.log('📦 Parsing request body...');
    console.log('📦 Raw body:', event.body);
    
    const { businessList } = JSON.parse(event.body);
    console.log('📋 Parsed businessList:', businessList);
    
    if (!businessList || !businessList.trim()) {
      console.log('❌ Empty businessList');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing businessList' })
      };
    }

    console.log('🔑 Checking API key...');
    const apiKey = process.env.CLAUDE_API_KEY;
    console.log('🔑 API key exists:', !!apiKey);
    console.log('🔑 API key length:', apiKey ? apiKey.length : 0);
    console.log('🔑 API key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'NONE');

    // הפרומט המאופטמל שלך
    const prompt = `Classify Israeli businesses: Vehicle,Food,Shopping,Debt,Entertainment,Insurance,Education,Bills,Health,Housing

List: ${businessList}

Return only comma-separated categories in same order. Example: Vehicle,Food,Shopping`;

    console.log('📝 Prompt created, length:', prompt.length);

    console.log('🚀 Calling Claude API...');
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    console.log('📡 Claude response status:', claudeResponse.status);
    console.log('📡 Claude response headers:', Object.fromEntries(claudeResponse.headers.entries()));

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.log('❌ Claude error response:', errorText);
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    console.log('✅ Claude response OK, parsing JSON...');
    const data = await claudeResponse.json();
    console.log('📄 Claude response data:', JSON.stringify(data, null, 2));
    
    const classification = data.content[0].text.trim();
    console.log('🎯 Final classification:', classification);

    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        classification,
        prompt: prompt, // לדיבוג
        timestamp: new Date().toISOString()
      })
    };

    console.log('✅ Returning success response');
    return response;

  } catch (error) {
    console.error('💀 ERROR in function:', error.name);
    console.error('💀 ERROR message:', error.message);
    console.error('💀 ERROR stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
