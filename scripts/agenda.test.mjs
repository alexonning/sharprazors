import test from 'node:test';
import assert from 'node:assert/strict';
import { agendaTitle, agendaHistory } from '../lib/agenda.ts';

test('agenda titles follow the selected date, including year boundaries', () => {
  assert.equal(agendaTitle('2026-09-17', '2026-09-17'), 'Agenda de Hoje');
  assert.equal(agendaTitle('2027-01-01', '2026-12-31'), 'Agenda de amanhã');
  assert.equal(agendaTitle('2026-09-15', '2026-09-17'), 'Agenda de 15/09/2026');
});

const bookings = [600, 660, 750, 800].map(end => ({ date: '2026-09-17', end }));

test('keeps the latest past appointment and all current/future appointments', () => {
  assert.deepEqual(agendaHistory(bookings, '2026-09-17', 700, false), {
    hiddenCount: 1, visible: bookings.slice(1),
  });
  assert.deepEqual(agendaHistory(bookings, '2026-09-17', 700, true).visible, bookings);
});

test('uses the full date when collapsing history', () => {
  assert.deepEqual(agendaHistory(bookings, '2026-09-16', 900, false).visible, bookings);
  assert.deepEqual(agendaHistory(bookings, '2026-09-18', 500, false).visible, [bookings[3]]);
});

test('handles empty lists, exact end times and simultaneous appointments', () => {
  assert.deepEqual(agendaHistory([], '2026-09-17', 700, false), { hiddenCount: 0, visible: [] });
  const simultaneous = [bookings[0], { ...bookings[0] }];
  assert.deepEqual(agendaHistory(simultaneous, '2026-09-17', 600, false), {
    hiddenCount: 1, visible: [simultaneous[1]],
  });
});
