const https = require('https');

const TG_TOKEN = process.env.TG_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const CHANNELS = ['@go_rehab', '@Helpforaddicts'];

const STYLE_EXAMPLES = `
14 апреля: Ты пытаешься всё контролировать, потому что внутри давно нет чувства опоры. И кажется: если отпущу — всё развалится. Но правда в том, что ты уже на пределе. Контроль не спасает, он просто оттягивает срыв. Иногда отпускание — это не слабость, а способ выжить. И доверие начинается с маленьких шагов. У тебя все получится, главное верь ✨

15 апреля: Ты ищешь смысл, но устаёшь от самого поиска. Как будто ответ должен прийти сразу и навсегда. Но смысл не даётся целиком. Он собирается по кускам: в действиях, в выборе, в честности. Даже если ты просто не сдаёшься сегодня — это уже часть смысла. Жизнь не объясняется сразу, она раскрывается постепенно. У тебя все получится, главное верь ✨

16 апреля: Ты живёшь как будто в чужом сценарии. Делаешь «как надо», а внутри пусто и тихо. И самое неприятное — ты уже это понимаешь. Если возникает мысль «это не моя жизнь», значит твоя уже стучится изнутри. Страшно её услышать, потому что придётся менять. Но игнорировать — дороже. У тебя все получится, главное верь ✨`;

const TOPICS = [
  'контроль и доверие', 'поиск смысла', 'чужая жизнь', 'тянешь на себе',
  'не можешь остановиться', 'зарабатываешь любовь', 'молчишь о важном',
  'быть сильным', 'страх перемен', 'одиночество в толпе', 'стыд и вина',
  'злость которую прячешь', 'усталость от борьбы', 'надежда', 'прощение себя',
  'отношения которые выматывают', 'границы', 'зависимость от чужого мнения',
  'страх быть собой', 'внутренний критик', 'депрессия и пустота', 'тревога',
  'восстановление после срыва', 'доверие к Богу', 'новое начало'
];

function getTodayTopic() {
  const day = new Date().getDate();
  return TOPICS[day % TOPICS.length];
}

function apiRequest(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    if (hostname === 'api.anthropic.com') {
      opts.headers['x-api-key'] = ANTHROPIC_KEY;
      opts.headers['anthropic-version'] = '2023-06-01';
    }
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function generatePost() {
  const topic = getTodayTopic();
  const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  
  const prompt = `Ты — автор психологического Telegram канала для людей в реабилитации от зависимости. Напиши пост на тему «${topic}» в точно таком же стиле как эти примеры:

${STYLE_EXAMPLES}

Правила стиля:
- Начни сразу с обращения на "ты" без приветствия
- 5-7 коротких предложений
- Каждый абзац — одна мысль
- Психологическая глубина без пафоса
- Разговорный язык, как умный друг
- Заканчивай точно этой фразой: "У тебя все получится, главное верь ✨"
- НЕ используй хэштеги
- НЕ пиши дату в тексте

Напиши только сам пост, ничего лишнего.`;

  const result = await apiRequest('api.anthropic.com', '/v1/messages', {
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return result.content.map(i => i.text || '').join('').trim();
}

async function sendToChannel(channelId, text) {
  return apiRequest('api.telegram.org', `/bot${TG_TOKEN}/sendMessage`, {
    chat_id: channelId,
    text: text,
    parse_mode: 'HTML'
  });
}

async function postToAll() {
  console.log('Генерирую пост...');
  try {
    const post = await generatePost();
    console.log('Пост готов:', post.substring(0, 50) + '...');
    
    for (const channel of CHANNELS) {
      const result = await sendToChannel(channel, post);
      if (result.ok) {
        console.log(`✅ Отправлено в ${channel}`);
      } else {
        console.log(`❌ Ошибка в ${channel}:`, result.description);
      }
    }
  } catch(e) {
    console.error('Ошибка:', e.message);
  }
}

function getMoscowHour() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const moscow = new Date(utc + 3 * 3600000);
  return { hour: moscow.getHours(), minute: moscow.getMinutes() };
}

function scheduleDaily() {
  const { hour, minute } = getMoscowHour();
  console.log(`Текущее время МСК: ${hour}:${minute < 10 ? '0' + minute : minute}`);
  
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const moscow = new Date(utc + 3 * 3600000);
  
  let next = new Date(moscow);
  next.setHours(8, 0, 0, 0);
  if (moscow >= next) next.setDate(next.getDate() + 1);
  
  const msUntilNext = next - moscow;
  console.log(`Следующий пост через ${Math.round(msUntilNext / 60000)} минут`);
  
  setTimeout(() => {
    postToAll();
    setInterval(postToAll, 24 * 60 * 60 * 1000);
  }, msUntilNext);
}

console.log('🤖 Бот автопостинга запущен');
scheduleDaily();

// Тестовый запуск если передан аргумент --test
if (process.argv.includes('--test')) {
  console.log('Тестовый запуск...');
  postToAll();
}
