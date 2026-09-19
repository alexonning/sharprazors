import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {reserveBarberSql} from '../lib/barber-availability.ts';
import {bookingHistoryColumns,bookingPrice,completedRevenue} from '../lib/booking-history.ts';

const migrations=readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort();
const sql=file=>readFileSync(new URL(`../drizzle/${file}`,import.meta.url),'utf8');
function database(){
  const db=new DatabaseSync(':memory:');
  for(const file of migrations)db.exec(sql(file));
  db.exec("INSERT INTO barbers VALUES ('carlos','Carlos',1,1,'now')");
  return db;
}
const read=db=>db.prepare(`SELECT ${bookingHistoryColumns} FROM bookings WHERE id='new'`).get();
function reserve(db,priceCents){
  db.prepare(reserveBarberSql).run('new','2026-10-01',600,630,'corte','Ana','5546999999999','now','Corte original',30,priceCents,'carlos','carlos','2026-10-01',630,600);
}
test('bookings retain service, price, duration, customer and barber after catalogs change or disappear',()=>{
  const db=database();
  try{
    db.exec("INSERT INTO customers VALUES ('5546999999999','Ana','now')");
    reserve(db,3500);
    const original=read(db);
    assert.equal(original.serviceName,'Corte original');
    assert.equal(original.priceCents,3500);
    assert.equal(original.durationMinutes,30);
    assert.equal(original.barberName,'Carlos');
    assert.equal(original.snapshotVersion,1);
    db.exec(`UPDATE services SET name='Novo corte',duration=90,price_cents=9900,active=0 WHERE id='corte';
      UPDATE barbers SET name='Outro nome',active=0 WHERE id='carlos';
      UPDATE customers SET name='Nome novo',phone='5546888888888' WHERE phone='5546999999999';`);
    assert.deepEqual(read(db),original);
    db.exec("DELETE FROM services; DELETE FROM barbers; DELETE FROM customers;");
    assert.deepEqual(read(db),original);
    db.exec("UPDATE bookings SET status='finalizado' WHERE id='new'");
    assert.deepEqual({...read(db)},{...original,status:'finalizado'});
    assert.equal(completedRevenue([read(db)]),3500);
  }finally{db.close()}
});
test('zero price and price on request remain distinct and do not inherit later catalog prices',()=>{
  for(const cents of [0,null]){
    const db=database();
    try{
      reserve(db,cents);
      db.exec("UPDATE services SET price_cents=5000 WHERE id='corte'");
      assert.equal(read(db).priceCents,cents);
      assert.equal(bookingPrice(read(db)),cents===null?'Valor sob consulta':(0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
    }finally{db.close()}
  }
});
test('legacy migration preserves recorded duration and does not invent a historical price',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    for(const file of migrations.filter(f=>f<'0005'))db.exec(sql(file));
    db.exec(`UPDATE services SET name='Corte disponível',duration=90,price_cents=9900 WHERE id='corte';
      INSERT INTO bookings VALUES ('old','2026-09-01',600,620,'corte','Ana','5546999999999','then');`);
    db.exec(sql('0005_booking_history.sql'));
    const original=db.prepare(`SELECT ${bookingHistoryColumns} FROM bookings`).get();
    assert.equal(original.durationMinutes,20);
    assert.equal(original.serviceName,'Corte disponível');
    assert.equal(original.priceCents,null);
    assert.equal(bookingPrice(original),'Valor não registrado');
    const pg=readFileSync(new URL('../db/postgres.sql',import.meta.url),'utf8');
    const backfill=pg.match(/-- Freeze legacy prices[\s\S]*?UPDATE bookings SET[\s\S]*?;/)[0].replace(/^--[^\n]*\n/,'');
    db.exec("UPDATE services SET name='Nome alterado',price_cents=10000;");
    db.exec(backfill);
    const updated=db.prepare(`SELECT ${bookingHistoryColumns} FROM bookings`).get();
    assert.equal(updated.priceCents,10000);
    assert.equal(updated.snapshotVersion,1);
  }finally{db.close()}
});
test('revenue only includes completed reservations at their saved price',()=>{
  assert.equal(completedRevenue([
    {status:'finalizado',priceCents:3500},{status:'finalizado',priceCents:null},
    {status:'cancelado',priceCents:9000},{status:'agendado',priceCents:4000},
    {status:'nao_compareceu',priceCents:2000},
  ]),3500);
});
