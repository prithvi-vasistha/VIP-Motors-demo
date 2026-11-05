import assert from 'node:assert/strict';
import { estimateValuation, validateValuation, valuationFromParams, valuationParams, valuationEnquiry } from '../src/lib/valuation.ts';
const anchors = [{ make: 'Toyota', model: 'Fortuner', variant: 'Legender', year: 2023, price: 4600000, fuel: 'Diesel', transmission: 'Automatic' }];
const input = { make: 'Toyota', model: 'Fortuner', variant: 'Legender', year: '2023', mileage: '35000', fuel: 'Diesel', transmission: 'Automatic', owners: '1', condition: 'good', accident: 'none', service: 'full', originalPrice: '' };
const estimate = (patch = {}) => estimateValuation({ ...input, ...patch }, anchors, 2026);
const base = estimate();
assert.ok(base.low > 0 && base.high > base.low);
assert.ok(estimate({ mileage: '150000' }).high < base.high);
assert.ok(estimate({ year: '2021' }).high < base.high);
assert.ok(estimate({ owners: '3' }).high < base.high);
assert.ok(estimate({ condition: 'fair' }).high < base.high);
assert.ok(estimate({ accident: 'major' }).high < base.high);
assert.ok(estimate({ service: 'none' }).high < base.high);
assert.ok(estimate({ fuel: 'Petrol' }).powertrainDiffers);
assert.ok(estimate({ transmission: 'Manual' }).high - estimate({ transmission: 'Manual' }).low > base.high - base.low);
assert.equal(estimate({ model: 'Unlisted' }), null);
assert.ok(estimate({ model: 'Unlisted', originalPrice: '5500000' }).high > 0);
assert.equal(estimate({ mileage: '-10' }), null);
assert.equal(estimate({ year: '2027' }), null);
assert.equal(estimate({ originalPrice: 'NaN' }), null);
assert.equal(estimate({ owners: '8' }), null);
assert.ok(validateValuation({ ...input, fuel: 'Invented' }, anchors, 2026).fuel);
assert.deepEqual(valuationFromParams(Object.fromEntries(new URLSearchParams(valuationParams(input)))), input);
assert.equal(valuationFromParams({ make: ['Toyota', 'BMW'] }).make, '');
const enquiry = valuationEnquiry(input, base, String);
for (const fragment of ['Toyota Fortuner Legender', '2023', '35,000 km', 'Diesel', 'Automatic', 'Owners: 1', 'Condition: Good', 'No accident history', 'Complete service records', String(base.low), String(base.high)]) assert.ok(enquiry.includes(fragment), fragment);
console.log('Valuation model checks passed (range, parameter effects, validation, URL round-trip and enquiry context).');

const { quoteExamples, quoteReferences } = await import('../src/lib/quote-references.ts');
const expectedQuotes = [2880000, 3420000, 1490000];
for (let index = 0; index < quoteExamples.length; index++) {
  const result = estimateValuation(quoteExamples[index].input, quoteReferences, 2026);
  assert.equal(result.estimate, expectedQuotes[index]);
  assert.ok(result.low < result.estimate && result.high > result.estimate);
  assert.ok(result.high < quoteReferences[index].price);
  assert.equal(result.anchor.source.name, 'CarDekho');
}
assert.equal(estimateValuation({ ...quoteExamples[1].input, make: 'Mercedes', model: 'C Class' }, quoteReferences, 2026).estimate, expectedQuotes[1]);
const { readFileSync } = await import('node:fs');
const catalogue = JSON.parse(readFileSync(new URL('../src/lib/reference-catalogue.json', import.meta.url), 'utf8'));
const catalogueAnchors = catalogue.map(car => ({ make: car.make, model: car.model, variant: car.variant, year: car.year, price: car.price.amount, fuel: car.fuel, transmission: car.transmission }));
for (const car of catalogue) {
  const result = estimateValuation({ ...input, make: car.make, model: car.model, variant: car.variant ?? '', year: String(car.year), mileage: String(car.mileageKm ?? 40000), fuel: car.fuel ?? 'Petrol', transmission: car.transmission ?? 'Automatic' }, [...quoteReferences, ...catalogueAnchors], 2026);
  assert.ok(result && Number.isFinite(result.estimate) && result.low > 0 && result.high > result.low, car.slug);
}
console.log('All 36 catalogue cars and 3 sourced demo examples return valid quotes; advertised-price bounds and make/model aliases passed.');
