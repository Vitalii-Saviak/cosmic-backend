const express = require('express');
const cors = require('cors');
// const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// 1. ЛІМІТИ ДЛЯ КОРИСТУВАЧІВ (IN-MEMORY)
// ============================================

const freeLimits = new Map(); // { userId_date: count }

async function checkLimits(userId, isPremium) {
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}_${today}`;
  const limit = isPremium ? 100 : 3;
  
  let count = freeLimits.get(key) || 0;
  
  if (count >= limit) {
    return { allowed: false, remaining: 0, limit };
  }
  
  freeLimits.set(key, count + 1);
  return { allowed: true, remaining: limit - count - 1, limit };
}

// ============================================
// 2. ФУНКЦІЯ ВИБОРУ МОДЕЛІ
// ============================================

function selectModel(prompt, isPremium) {
  if (!isPremium) return 'gemini-flash';
  
  const lowerPrompt = prompt.toLowerCase();
  
  // Для Кундалі використовуємо Llama 3 (безкоштовно)
  if (lowerPrompt.includes('кундалі') || lowerPrompt.includes('панчанг') || 
      lowerPrompt.includes('накшатра') || lowerPrompt.includes('лагна')) {
    return 'llama3';  // ← ЗМІНЕНО з 'gemini-flash' на 'llama3'
  }
  
  // Складні аналізи -> GPT-4o-mini
  if (lowerPrompt.includes('аналіз') || lowerPrompt.includes('прогноз') || 
      lowerPrompt.includes('порада') || lowerPrompt.includes('майбутнє')) {
    return 'gpt4-mini';
  }
  
  // Прості чати -> Llama 3 (безкоштовно)
  return 'llama3';
}

// ============================================
// 3. ВИКЛИКИ API
// ============================================

// 3.1 Groq (Llama 3) - БЕЗКОШТОВНО!
async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  
  console.log('🔍 callGroq викликано!');
  console.log('🔑 GROQ_API_KEY:', apiKey ? `${apiKey.substring(0, 15)}...` : '❌ НЕМАЄ');
  
  if (!apiKey) {
    console.log('⚠️ Немає Groq ключа, використовуємо fallback');
    return fallbackResponse(prompt);
  }
  
  try {
    console.log('📡 Надсилаємо запит до Groq API...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',  // ← ОНОВЛЕНО!
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800
      })
    });
    
    console.log('📡 Статус Groq:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq помилка:', response.status, errorText);
      return fallbackResponse(prompt);
    }
    
    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;
    
    if (result) {
      console.log('✅ Groq відповів успішно!');
      return result;
    }
    
    return fallbackResponse(prompt);
    
  } catch (error) {
    console.error('❌ Помилка Groq:', error.message);
    return fallbackResponse(prompt);
  }
}

// 3.2 GPT-4o-mini (дешево, якісно)
async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return callGroq(prompt);
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || fallbackResponse(prompt);
  } catch (error) {
    console.error('OpenAI помилка:', error.message);
    return callGroq(prompt);
  }
}

// 3.3 Gemini Flash (астрологічні розрахунки)
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackResponse(prompt);
  }
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || fallbackResponse(prompt);
  } catch (error) {
    console.error('Gemini помилка:', error.message);
    return fallbackResponse(prompt);
  }
}

// 3.4 Fallback (коли всі API не працюють)
function fallbackResponse(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('кундалі')) {
    return `🕉️ **Ваша Кундалі**

📍 **Лагна (Асцендент):** Діва ♍
☀️ **Сонце:** Лев ♌ – лідерські якості
🌙 **Місяць:** Рак ♋ – емоційна глибина

📊 **Аналіз:** Ви маєте сильний інтелект та аналітичний склад розуму. Сатурн в 10-му домі дає кар'єрний ріст після 30 років.

💡 **Порада:** Медитуйте на мантру "Om Namah Shivaya" для балансу енергій.

✨ *Безкоштовний астрологічний розрахунок*`;
  }
  
  if (lowerPrompt.includes('нумерологія')) {
    return `🔢 **Нумерологічний аналіз**

🔢 **Число життєвого шляху:** 7
🔮 **Характеристика:** Аналітик, дослідник, духовна людина
💖 **Число серця:** 3 – творчість та комунікація
💰 **Число долі:** 8 – матеріальний успіх

📌 **Порада:** Розвивайте інтуїцію та довіряйте внутрішньому голосу.`;
  }
  
  if (lowerPrompt.includes('панчанг')) {
    return `📅 **Панчанг на сьогодні**

🌙 **Тітхі:** Дашамі (10-й місячний день)
⭐ **Накшатра:** Анурадха
🪐 **Йога:** Пріті
⏰ **Карана:** Балава

🕉️ **Сприятливий час:** 09:00-11:00, 15:00-17:00
⚠️ **Рагу Каал:** 12:00-13:30

💫 **Рекомендація:** Сьогодні сприятливий день для нових починань.`;
  }
  
  return `🌟 **Астрологічний прогноз**

✨ Сьогодні сприятливий день для саморозвитку та духовних практик.

💫 Зірки радять прислухатися до своєї інтуїції – вона вас не підведе.

🔮 Для детального аналізу зверніться до професійного астролога.`;
}

// ============================================
// 4. ОСНОВНИЙ API ЕНДПОЇНТ
// ============================================

// const limiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 30,
//   keyGenerator: (req) => req.body.userId || req.ip,
// });
app.post('/api/astrology', async (req, res) => {
  const { userId, prompt, category, language, isPremium = false } = req.body;
  
  if (!userId || !prompt) {
    return res.status(400).json({ error: 'Необхідні поля: userId, prompt' });
  }
  
  try {
    // 1. Перевірка лімітів
    const { allowed, remaining, limit } = await checkLimits(userId, isPremium);
    
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: isPremium 
          ? `Ви перевищили денний ліміт (${limit} запитів). Завтра відновиться.`
          : `Безкоштовний ліміт (${limit} запити на день) вичерпано. Оформіть Premium за $9.99/міс`,
        remaining: 0,
        limit
      });
    }
    
    // 2. Будуємо промпт
    const langInstruction = language === 'UA' ? 'українською мовою' : 
                            language === 'HI' ? 'гінді' : 'англійською';
    
    const fullPrompt = `Ти - професійний ведичний астролог. Відповідай ${langInstruction}, тепло та духовно.

ДАНІ КОРИСТУВАЧА:
- Ім'я: ${req.body.name || 'Користувач'}
- Дата народження: ${req.body.birthDate || 'не вказана'}
- Місце: ${req.body.location || 'не вказано'}

Категорія: ${category}
Питання: ${prompt}

ВИМОГИ:
1. Використовуй дані користувача (дату народження) для розрахунків
2. Для Кундалі обов'язково визнач Лагну (Асцендент) на основі дати народження
3. Для Нумерології розрахуй число життєвого шляху з дати народження
4. Будь конкретним, використовуй цифри та факти
5. Не використовуй загальні фрази

ВІДПОВІДАЙ ЛИШЕ ПО СУТІ, БЕЗ ЗАЙВИХ СЛІВ:`;
    
    // 3. Вибираємо модель
    const model = selectModel(prompt, isPremium);
    console.log(`📡 [${userId}] Модель: ${model}, Залишилось: ${remaining}/${limit}`);
    
    let response;
    switch (model) {
      case 'llama3':
        response = await callGroq(fullPrompt);
        break;
      case 'gpt4-mini':
        response = await callOpenAI(fullPrompt);
        break;
      case 'gemini-flash':
        response = await callGemini(fullPrompt);
        break;
      default:
        response = fallbackResponse(prompt);
    }
    
    res.json({
      success: true,
      response: response,
      isPremium: isPremium,
      remaining: remaining,
      limit: limit,
      model: model
    });
    
  } catch (error) {
    console.error('Помилка:', error);
    res.status(500).json({
      success: false,
      error: 'Внутрішня помилка сервера. Спробуйте пізніше.'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// 5. ЗАПУСК СЕРВЕРА
// ============================================

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущено на порту ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/astrology`);
  console.log(`🔧 Режим: ${process.env.GROQ_API_KEY ? 'Groq ✅' : 'Groq ❌'} | ${process.env.OPENAI_API_KEY ? 'OpenAI ✅' : 'OpenAI ❌'} | ${process.env.GEMINI_API_KEY ? 'Gemini ✅' : 'Gemini ❌'}`);
});
