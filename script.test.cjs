const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function invoice(price, quantity, inclusive = true, withholding = '0') {
    const fields = Object.fromEntries(Object.entries({
        item1Price: price, item1Quantity: quantity, item1Amount: '',
        subtotal: '', tax: '', total: '', taxableAmount10: '', taxAmount10: '',
        withholdingTax: withholding,
    }).map(([key, textContent]) => [key, { textContent }]));
    const context = vm.createContext({
        document: {
            addEventListener() {},
            querySelector(selector) {
                return fields[selector.match(/data-param="([^"]+)"/)[1]];
            },
            getElementById() { return { checked: inclusive }; },
        },
    });
    vm.runInContext(fs.readFileSync(`${__dirname}/script.js`, 'utf8'), context);
    vm.runInContext('updateURLParameters = () => {}; calculateItemAmount(1); calculateTotals();', context);
    return Object.fromEntries(Object.entries(fields).map(([key, element]) => [key, element.textContent]));
}

test('8.20時間 × 1,425円を1円少なく計算しない', () => {
    const result = invoice('1,425円', '8.20時間');
    assert.equal(result.item1Amount, '11,685');
    assert.equal(result.subtotal, '10,622円');
    assert.equal(result.tax, '1,063円');
    assert.equal(result.total, '11,685円');
});

test('実際の端数は切り捨て、整数に近い小数も勝手に切り上げない', () => {
    assert.equal(invoice('1225', '7.47').item1Amount, '9,150');
    assert.equal(invoice('1225', '30.3').item1Amount, '37,117');
    assert.equal(invoice('1', '0.99999999999999999').item1Amount, '0');
    assert.equal(invoice('-1225', '7.47').item1Amount, '-9,151');
});

test('小数単価・指数表記・人月・数量の既存フォールバック', () => {
    assert.equal(invoice('0.29', '100').item1Amount, '29');
    assert.equal(invoice('1425', '8.2e0').item1Amount, '11,685');
    assert.equal(invoice('1425', '2人月').item1Amount, '2,850');
    assert.equal(invoice('1425', '人月').item1Amount, '1,425');
    assert.equal(invoice('1425', '一式').item1Amount, '1,425');
});

test('税込110円を逆算すると税抜100円、税10円', () => {
    const result = invoice('110', '1');
    assert.equal(result.subtotal, '100円');
    assert.equal(result.tax, '10円');
    assert.equal(result.taxableAmount10, result.subtotal);
    assert.equal(result.taxAmount10, result.tax);
});

test('税抜モードの税の切り捨てと源泉徴収の控除を維持', () => {
    const result = invoice('1225', '7.47', false, '100');
    assert.equal(result.subtotal, '9,150円');
    assert.equal(result.tax, '915円');
    assert.equal(result.total, '9,965円');
    assert.equal(invoice('109', '1', false).tax, '10円');
});
