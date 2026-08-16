import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// מטריקות מותאמות
const errorRate = new Rate('errors');
const homepageTime = new Trend('homepage_duration');

// כתובת הפורום (ניתן לדרוס עם משתנה סביבה TARGET_URL)
const BASE_URL = __ENV.TARGET_URL || 'https://surveys-trademarks-quantities-elderly.trycloudflare.com';

// כל shard (job מקביל ב-GitHub Actions) יקבל חלק מה-VUs הכוללים
// למשל אם יש 4 shards ורוצים 20000 סה"כ -> כל shard רץ עם 5000
const TOTAL_VUS = parseInt(__ENV.TOTAL_VUS || '20000');
const SHARD_COUNT = parseInt(__ENV.SHARD_COUNT || '1');
const VUS_PER_SHARD = Math.ceil(TOTAL_VUS / SHARD_COUNT);

export const options = {
  scenarios: {
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Math.floor(VUS_PER_SHARD * 0.1) },  // חימום - 10%
        { duration: '1m',  target: Math.floor(VUS_PER_SHARD * 0.3) },  // 30%
        { duration: '1m',  target: Math.floor(VUS_PER_SHARD * 0.6) },  // 60%
        { duration: '1m',  target: VUS_PER_SHARD },                     // 100% - השיא
        { duration: '2m',  target: VUS_PER_SHARD },                     // להחזיק בשיא
        { duration: '30s', target: 0 },                                 // ירידה חלקה
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% מהבקשות מתחת ל-3 שניות
    errors: ['rate<0.1'],                // פחות מ-10% שגיאות
  },
};

export default function () {
  // תרחיש ריאליסטי: כניסה לעמוד הבית של הפורום
  const res = http.get(`${BASE_URL}/`, {
    timeout: '10s',
    tags: { name: 'homepage' },
  });

  homepageTime.add(res.timings.duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!success);

  // הפסקה קצרה רנדומלית בין 1-3 שניות (מדמה משתמש אמיתי, לא bot שיורה בלי הפסקה)
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify(data),
  };
}
