import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { freeBarbers, defaultBarber, assignLegacyBookingsSql, reserveBarberSql } from '../lib/barber-availability.ts';
import { slots } from '../lib/booking.ts';

const barbers = [{ id: 'x', name: 'Carlos' }, { id: 'y', name: 'Pedro' }];
const busy = { start: 600, end: 630, barber: 'x', status: 'agendado' };

test('only hides a slot when every barber is busy for the requested duration', () => {
  assert.deepEqual(freeBarbers(605, 30, barbers, [busy]), [barbers[1]]);
  assert.deepEqual(freeBarbers(575, 30, barbers, [busy]), [barbers[1]]);
  assert.deepEqual(freeBarbers(630, 30, barbers, [busy]), barbers);
  assert.deepEqual(freeBarbers(600, 30, barbers, [busy, { ...busy, barber: 'y' }]), []);
  assert.deepEqual(freeBarbers(600, 30, barbers, [{ ...busy, status: 'cancelado' }]), barbers);
  assert.deepEqual(freeBarbers(600, 30, [], []), []);
});

test('selects the sole available barber, otherwise any available', () => {
  assert.equal(defaultBarber(freeBarbers(605, 30, barbers, [busy])), 'y');
  assert.equal(defaultBarber(barbers), 'qualquer');
  assert.deepEqual(freeBarbers(600, 30, barbers, [{ ...busy, barber: 'qualquer' }]), [barbers[1]]);
});

test('offers five-minute intervals while respecting duration and shop blocks', () => {
  const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const hours = Array.from({ length: 7 }, () => ({ closed: false, periods: [[600, 660]] }));
  assert.deepEqual(slots(date, 30, hours), [600, 605, 610, 615, 620, 625, 630]);
  assert.deepEqual(slots(date, 30, hours, [{ start: 630, end: 660 }]), [600]);
});

test('closing at 19:30 allows only services that fit completely before closing', () => {
  const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const hours = Array.from({ length: 7 }, () => ({ closed: false, periods: [[810, 1170]] }));
  assert.equal(slots(date, 15, hours).at(-1), 1155); // Corte: 19:15.
  assert.equal(slots(date, 10, hours).at(-1), 1160); // Barba: 19:20.
  assert.equal(slots(date, 20, hours).at(-1), 1150); // Combo: 19:10.
  const reserved = [{ start: 810, end: 1160, barber: 'x', status: 'agendado' }];
  const remaining = duration => slots(date, duration, hours).filter(start =>
    freeBarbers(start, duration, [barbers[0]], reserved).length > 0);
  assert.deepEqual(remaining(15), []);
  assert.deepEqual(remaining(20), []);
  assert.deepEqual(remaining(10), [1160]);
});

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE barbers(id TEXT PRIMARY KEY,name TEXT,active INTEGER,position INTEGER);
    CREATE TABLE bookings(id TEXT PRIMARY KEY,date TEXT,start INTEGER,"end" INTEGER,service TEXT,name TEXT,phone TEXT,barber TEXT,created_at TEXT,status TEXT DEFAULT 'agendado',service_name TEXT,duration_minutes INTEGER,price_cents INTEGER,barber_name TEXT,snapshot_version INTEGER DEFAULT 0);
    INSERT INTO barbers VALUES ('qualquer','Qualquer disponível',1,0),('x','Carlos',1,1),('y','Pedro',1,2);`);
  return db;
}
function reserve(db, id, barber = 'qualquer', start = 600, end = 630) {
  db.exec('BEGIN');
  try {
    db.prepare(assignLegacyBookingsSql).run('2026-10-01');
    const result = db.prepare(reserveBarberSql).run(id, '2026-10-01', start, end, 'corte', 'Cliente', '5546999999999', 'now', 'Corte', end-start, 3500, barber, barber, '2026-10-01', end, start);
    db.exec('COMMIT');
    return result.changes;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

test('reservation SQL assigns distinct professionals and refuses overbooking', () => {
  const db = database();
  try {
    assert.equal(reserve(db, '1'), 1);
    assert.equal(reserve(db, '2'), 1);
    assert.equal(reserve(db, '3'), 0);
    assert.deepEqual(db.prepare('SELECT barber FROM bookings ORDER BY id').all().map(b => b.barber), ['x', 'y']);
    assert.equal(reserve(db, '4', 'x', 605, 635), 0);
    assert.equal(reserve(db, '5', 'x', 630, 660), 1);
    assert.equal(reserve(db, '6', 'missing', 700, 730), 0);
    db.exec("UPDATE barbers SET active=0 WHERE id='y'");
    assert.equal(reserve(db, '7', 'y', 700, 730), 0);
  } finally { db.close(); }
});

test('old any-barber reservations consume one professional and cancellations release capacity', () => {
  const db = database();
  try {
    db.exec(`INSERT INTO bookings(id,date,start,"end",barber) VALUES ('old','2026-10-01',600,630,'qualquer')`);
    assert.equal(reserve(db, 'new'), 1);
    assert.equal(db.prepare("SELECT barber FROM bookings WHERE id='old'").get().barber, 'x');
    assert.equal(db.prepare("SELECT barber FROM bookings WHERE id='new'").get().barber, 'y');
    db.exec("UPDATE bookings SET status='cancelado' WHERE id='old'");
    assert.equal(reserve(db, 'replacement', 'x'), 1);
  } finally { db.close(); }
});
