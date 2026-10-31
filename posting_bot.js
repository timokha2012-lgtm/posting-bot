// Утренний бот 8:00 МСК для @go_rehab (РЯХАБ): зависимость и созависимость
// Формат меняется по дням недели, тема — по дню года (не повторяется ~2 месяца),
// призыв к действию — не каждый день и в разные места.
const https = require('https');

const TG_TOKEN = process.env.TG_TOKEN;
const AI_API_KEY = process.env.AI_COMPAT_API_KEY || process.env.VSEGPT_API_KEY;
const AI_BASE_URL = (process.env.AI_COMPAT_BASE_URL || 'https://api.vsegpt.ru/v1').replace(/\/+$/, '');
const AI_MODEL = process.env.AI_COMPAT_MODEL || process.env.VSEGPT_MODEL || 'openai/gpt-4.1-mini';
const CHANNELS = (process.env.CHANNELS || '@go_rehab').split(',');
const DIAG_BOT = process.env.DIAG_BOT || '@ya_lichnost_bot';
const CONSULT_URL = process.env.CONSULT_URL || 'https://psiholog-petrov.ru';
const POST_HOUR = Number(process.env.POST_HOUR || 8);
const FEED_CHANNEL = 'ryahab';

// Темы — не абстракции, а узнаваемые утренние ситуации
const TOPICS = [
  'проснулся и первая мысль — «опять»',
  'проверяешь телефон, не написал ли он(а)',
  'обещал себе вчера — и уже ищешь оправдание',
  'улыбаешься на работе, а внутри выжжено',
  'мать звонит — и ты заранее напрягаешься',
  'считаешь дни трезвости как долг, а не как жизнь',
  'злишься на близкого за то, что он опять «не такой»',
  'спасаешь всех, кроме себя',
  'стыдно за вчерашний разговор',
  'ждёшь, что Бог сделает то, что должен сделать ты',
  'делаешь вид, что всё под контролем',
  'боишься, что без старых друзей станет скучно',
  'устал быть сильным для семьи',
  'сравниваешь себя с теми, у кого получилось',
  'живёшь «после»: после зарплаты, после ремонта, после него',
  'прячешь бутылку, деньги, переписку',
  'хочешь позвонить, но гордость не даёт',
  'говоришь «я просто устал» вместо «мне плохо»',
  'срыв был месяц назад, а ты до сих пор себя казнишь',
  'пустота по утрам, пока не займёшь руки',
  'зарабатываешь любовь услугами',
  'в церковь ходишь, а внутри ничего не меняется',
  'боишься отпустить взрослого сына',
  'ненавидишь в себе отца',
  'кажется, что поздно начинать',
  'молчишь, чтобы не было скандала',
  'ждёшь, что он сам захочет лечиться',
  'снова начал «с понедельника»',
  'говоришь «я не такой, как они» на группе',
  'не можешь сказать «нет» и потом злишься',
  'просыпаешься с тревогой без причины',
  'всё время думаешь, что о тебе подумают',
  'тоскуешь по старой жизни, хотя она тебя убивала',
  'не веришь, что тебя можно простить',
];

// Формат по дню недели (0 = воскресенье)
const FORMATS = {
  1: { name: 'СЦЕНА', how: 'Начни с конкретной сцены утра: что человек делает руками, что видит, что говорит. Потом назови механизм, который стоит за сценой (отрицание, контроль, стыд, рационализация, созависимость). Закончи одним действием на сегодня — таким, которое можно сделать до обеда.' },
  2: { name: 'ФРАЗА-САМООБМАН', how: 'Начни с фразы, которой человек себя обманывает, в кавычках, как он её говорит. Разбери, что она на самом деле прикрывает. Без морали — просто сними маску. Закончи вопросом, на который неприятно отвечать честно.' },
  3: { name: 'ДЛЯ БЛИЗКИХ', how: 'Пост для жены, матери, отца зависимого. Сцена из их утра. Покажи, где их любовь превратилась в контроль или спасательство. Одно действие: что перестать делать сегодня.' },
  4: { name: 'БИБЛЕЙСКОЕ ЗЕРКАЛО', how: 'Возьми одного библейского героя, в котором читатель узнает себя именно в этой теме (не пересказывай историю, одна деталь из неё). Сначала человек и его боль, герой — не раньше третьего абзаца. Без номеров глав, без проповеди.' },
  5: { name: 'ВОПРОС', how: 'Весь пост ведёт к одному точному вопросу. Сначала короткая ситуация, потом два-три абзаца, которые отрезают удобные ответы. Вопрос — последней строкой перед призывом.' },
  6: { name: 'ОДИН ШАГ', how: 'Практический пост: один конкретный шаг на выходные по теме. Как именно его сделать, что будет мешать, что сказать себе, когда захочется бросить.' },
  0: { name: 'БЛАГОДАТЬ', how: 'Тихий воскресный пост. Про то, что человеку не нужно заслуживать право начать заново. Без сладости и «Бог тебя любит». Через конкретную сцену и одну мысль.' },
};

// Призыв — не каждый день, в разные места
const CTAS = {
  1: `Последней строкой мягко предложи пройти короткую диагностику в ${DIAG_BOT} — «посмотреть, где ты сейчас на самом деле». Одна фраза.`,
  2: 'Без призыва. Пост заканчивается вопросом.',
  3: `Последней строкой скажи, что для близких зависимых есть консультация: ${CONSULT_URL}. Одна фраза, без рекламного тона.`,
  4: 'Без призыва.',
  5: `Последней строкой предложи ответить на вопрос честно — в ${DIAG_BOT} есть разбор, который поможет. Одна фраза.`,
  6: 'Предложи написать в комментариях, какой шаг человек выбрал. Одна фраза.',
  0: 'Без призыва.',
};

const BANNED = [
  'У тебя все получится', 'главное верь', 'ты не один', 'ты не одна', 'это нормально',
  'маленькими шагами', 'маленькие шаги', 'путь к себе', 'внутри пусто', 'важно помнить',
  'Бог тебя любит', 'всё будет хорошо', 'стучится изнутри', 'правда в том, что',
  'и это нормально', 'дай себе время', 'ты достоин',
];

function getMoscowNow() {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 3 * 3600000);
}

function dayOfYear(d) {
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
}

function todayPlan() {
  const m = getMoscowNow();
  const wd = m.getDay();
  // шаг 7 взаимно прост с 34 — темы идут вразнобой и не совпадают с тем же форматом неделями
  const topic = TOPICS[(dayOfYear(m) * 7) % TOPICS.length];
  return { topic, format: FORMATS[wd], cta: CTAS[wd] };
}

function apiRequest(hostname, path, data, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...extraHeaders },
    };
    const req = https.request(opts, res => {
      res.setEncoding('utf8');
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(new Error('Bad JSON: ' + d.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─────────── ТЕМЫ НЕДЕЛИ ИЗ ПРОГРАММЫ (одобренные в админке) ───────────
// Если FEED_URL и FEED_KEY не заданы — бот работает по своему списку тем, как раньше.
const http = require('http');
const FEED_URL = (process.env.FEED_URL || '').replace(/\/$/, '');   // напр. http://194.67.74.45
const FEED_KEY = process.env.FEED_KEY || '';
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID || '';              // куда слать копию для MAX

function feedRequest(method, path, data) {
  return new Promise(resolve => {
    if (!FEED_URL || !FEED_KEY) return resolve(null);
    const u = new URL(FEED_URL + path);
    const body = data ? JSON.stringify(data) : '';
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, method,
      headers: { 'X-Feed-Key': FEED_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 15000,
    }, res => {
      res.setEncoding('utf8');
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => { try { resolve(res.statusCode === 200 ? JSON.parse(d) : null); } catch (e) { resolve(null); } });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', e => { console.error('Лента тем недоступна:', e.message); resolve(null); });
    if (body) req.write(body);
    req.end();
  });
}

// Берёт следующую одобренную тему для канала или null
async function nextFeedTopic() {
  const r = await feedRequest('GET', `/api/content-feed/next?channel=${FEED_CHANNEL}`);
  return r && r.item ? r.item : null;
}

async function markFeedPublished(item, messageUrl) {
  if (!item) return;
  await feedRequest('POST', '/api/content-feed/published', {
    digestId: item.digestId, index: item.index, channel: FEED_CHANNEL, messageUrl: messageUrl || null,
  });
}

function feedPromptBlock(item) {
  return `Сегодня тема взята из того, что на этой неделе реально всплывало у людей в работе (обобщённо):
«${item.title}» — ${item.summary || ''}
${item.question ? 'Вопрос-крючок: ' + item.question : ''}
Бери только суть. Не цитируй людей, не упоминай программу, центр, резидентов, группу, консультанта; никаких биографических деталей (пол, возраст, сроки, роли вроде «жена», «девушка из программы»). Пиши так, чтобы в этом узнал себя любой читатель канала, а не конкретный человек.`;
}

// Копия поста тебе в личку — для ручной вставки в MAX
async function sendMaxCopy(label, text) {
  if (!OWNER_CHAT_ID) return;
  await apiRequest('api.telegram.org', `/bot${TG_TOKEN}/sendMessage`, {
    chat_id: OWNER_CHAT_ID, text: `📋 Для MAX (${label}) — скопируй и вставь:\n\n${text}`,
  });
}

function postUrl(channel, result) {
  const id = result && result.result && result.result.message_id;
  return id && channel.startsWith('@') ? `https://t.me/${channel.slice(1)}/${id}` : null;
}

async function generatePost(feedItem) {
  const plan = todayPlan();
  const { format, cta } = plan;
  const topic = feedItem ? feedItem.title : plan.topic;

  const system = `Ты пишешь утренние посты для Telegram-канала РЯХАБ Дмитрия Петрова — реабилитолога, который ведёт центр для зависимых. Канал про зависимость и созависимость. Читатели: зависимые (в употреблении, в ремиссии, после срыва) и их близкие — жёны, матери, отцы. Верующие и нет.
Каждый пост — про зависимость или созависимость: даже если тема утра общая (тревога, стыд, отец, церковь), свяжи её с употреблением, трезвостью, срывом или жизнью рядом с зависимым. Читают в 8 утра с телефона, полусонные.

Голос: как умный друг, который сам через это прошёл и не боится сказать правду. Прямо, на «ты», без пафоса, без утешительства, без проповеди.

Жёсткие правила:
- 60–110 слов. Абзацы по 1–2 предложения.
- Первая строка — сразу в ситуацию или в фразу. Никаких «Доброе утро», «Сегодня поговорим».
- Одна мысль на пост.
- Конкретика вместо абстракций: не «ты чувствуешь пустоту», а «ты открываешь холодильник, закрываешь, открываешь снова».
- Назови психологический механизм простыми словами, без терминов в лоб.
- Никаких хэштегов, эмодзи, дат, заголовков, markdown и звёздочек.
- Запрещённые фразы и их перепевы: ${BANNED.join('; ')}.
- Не заканчивай утешением. Заканчивай действием, вопросом или честной мыслью.`;

  const user = `${feedItem ? feedPromptBlock(feedItem) + '\n\n' : ''}Тема утра: «${topic}».
Формат: ${format.name}. ${format.how}
Призыв: ${cta}

Напиши только текст поста.`;

  if (!AI_API_KEY) throw new Error('AI_COMPAT_API_KEY не задан в Railway');
  const endpoint = new URL(AI_BASE_URL + '/chat/completions');
  const result = await apiRequest(endpoint.hostname, endpoint.pathname + endpoint.search, {
    model: AI_MODEL,
    max_tokens: 600,
    temperature: 0.8,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  }, { Authorization: `Bearer ${AI_API_KEY}` });

  if (result.error || !result.choices || !result.choices[0]) throw new Error('VseGPT: ' + JSON.stringify(result).slice(0, 400));
  let text = String(result.choices[0].message && result.choices[0].message.content || '').trim();
  if (!text) throw new Error('VseGPT вернул пустой текст');
  text = text.replace(/\*\*/g, '').replace(/#\S+/g, '').trim();
  return { text, topic, format: format.name };
}

async function sendToChannel(channelId, text) {
  // без parse_mode: символы < > & в тексте не ломают отправку
  return apiRequest('api.telegram.org', `/bot${TG_TOKEN}/sendMessage`, { chat_id: channelId, text });
}

async function postToAll({ dryRun = false } = {}) {
  try {
    const feedItem = await nextFeedTopic();
    const post = await generatePost(feedItem);
    console.log(`[${post.format}]${feedItem ? ' [тема недели]' : ''} ${post.topic}\n---\n${post.text}\n---`);
    if (dryRun) return;
    let url = null;
    for (const channel of CHANNELS) {
      const r = await sendToChannel(channel.trim(), post.text);
      console.log(r.ok ? `✅ ${channel}` : `❌ ${channel}: ${r.description}`);
      if (r.ok && !url) url = postUrl(channel.trim(), r);
    }
    if (url) {
      await markFeedPublished(feedItem, url);
      await sendMaxCopy('РЯХАБ', post.text);
    }
  } catch (e) {
    console.error('Ошибка:', e.message);
  }
}

function scheduleNext() {
  const m = getMoscowNow();
  const next = new Date(m);
  next.setHours(POST_HOUR, 0, 0, 0);
  if (m >= next) next.setDate(next.getDate() + 1);
  const ms = next - m;
  console.log(`Следующий пост через ${Math.round(ms / 60000)} мин`);
  // пересчитываем каждый раз, чтобы время не уплывало
  setTimeout(async () => { await postToAll(); scheduleNext(); }, ms);
}

if (process.argv.includes('--dry')) {
  postToAll({ dryRun: true });           // только показать пост в логах
} else {
  console.log('🤖 Утренний бот запущен');
  scheduleNext();
  if (process.argv.includes('--test')) postToAll();
}
