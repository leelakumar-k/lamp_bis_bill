import { randomUUID } from 'expo-crypto';

import { addDays, today } from '@/lib/date';

import { type Database, Status } from './types';

const SAMPLE_WORKERS: [string, string, string, string, number][] = [
  ['Ramesh', 'Kumar', '9876543210', 'Mason', 900],
  ['Sunita', 'Devi', '9876501234', 'Helper', 550],
  ['Arjun', 'Patil', '9822012345', 'Carpenter', 850],
  ['Imran', 'Shaikh', '9811122233', 'Electrician', 950],
  ['Lakshmi', 'Naidu', '9900112233', 'Helper', 550],
  ['Mohan', 'Yadav', '9898989898', 'Mason', 900],
  ['Priya', 'Singh', '9765432109', 'Painter', 700],
  ['Ganesh', 'Jadhav', '9850011223', 'Plumber', 800],
  ['Kavita', 'More', '9823344556', 'Helper', 550],
  ['Deepak', 'Verma', '9811223344', 'Carpenter', 850],
  ['Anil', 'Gupta', '9876012345', 'Welder', 900],
  ['Rekha', 'Pawar', '9890123456', 'Painter', 700],
];

// Names written in local script (transliterated, not translated).
const LOCAL_NAMES: Record<string, string[]> = {
  hi: ['रमेश कुमार', 'सुनीता देवी', 'अर्जुन पाटिल', 'इमरान शेख', 'लक्ष्मी नायडू', 'मोहन यादव', 'प्रिया सिंह', 'गणेश जाधव', 'कविता मोरे', 'दीपक वर्मा', 'अनिल गुप्ता', 'रेखा पवार'],
  mr: ['रमेश कुमार', 'सुनीता देवी', 'अर्जुन पाटील', 'इम्रान शेख', 'लक्ष्मी नायडू', 'मोहन यादव', 'प्रिया सिंह', 'गणेश जाधव', 'कविता मोरे', 'दीपक वर्मा', 'अनिल गुप्ता', 'रेखा पवार'],
};

// Deterministic pseudo-random so the sample looks realistic but stable.
function pick(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export async function loadSampleData(db: Database) {
  const now = today();
  await db.transaction(async () => {
    const ids: string[] = [];
    for (const [first, last, mobile, profession, wage] of SAMPLE_WORKERS) {
      const id = randomUUID();
      ids.push(id);
      await db.run(
        `INSERT INTO workers (id, first_name, last_name, mobile, profession, daily_wage)
         VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
        [id, first, last, mobile, profession, wage * 100],
      );
    }

    for (const [lang, names] of Object.entries(LOCAL_NAMES)) {
      for (let i = 0; i < ids.length; i++) {
        await db.run(
          'INSERT INTO translations (lang, key, value) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
          [lang, `worker:${ids[i]}`, names[i]],
        );
      }
    }

    for (let dayOffset = 40; dayOffset >= 0; dayOffset--) {
      const date = addDays(now, -dayOffset);
      const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
      for (let i = 0; i < ids.length; i++) {
        // Leave part of today unmarked so the daily flow is visible.
        if (dayOffset === 0 && i >= 5) continue;
        const r = pick(dayOffset * 31 + i * 7 + 1);
        let status = Status.Present;
        if (isSunday) status = r < 0.8 ? Status.Leave : Status.Present;
        else if (r < 0.08) status = Status.Absent;
        else if (r < 0.14) status = Status.HalfDay;
        else if (r < 0.17) status = Status.Leave;
        await db.run(
          `INSERT INTO attendance (worker_id, date, status, wage_snapshot)
           SELECT id, ?, ?, daily_wage FROM workers WHERE id = ? ON CONFLICT DO NOTHING`,
          [date, status, ids[i]],
        );
      }
    }

    for (let i = 0; i < ids.length; i += 3) {
      await db.run(
        'INSERT INTO payments (id, worker_id, amount, type, paid_on, note) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), ids[i], 2000_00, 'advance', addDays(now, -12), 'Festival advance'],
      );
    }
  });
}
