const DEFAULT_CLIENT_INFO = '株式会社ARK DIGITAL ENTERTAINMENT';

document.addEventListener('DOMContentLoaded', function() {
    // 編集可能な要素の設定
    setupEditableElements();
    
    // 自動計算される項目を編集不可に設定
    setupReadOnlyElements();
    
    // 日付フィールドの初期化
    setupDateFields();
    
    // 税込みモードトグルのイベントリスナー
    const taxToggle = document.getElementById('taxInclusiveMode');
    if (taxToggle) {
        taxToggle.addEventListener('change', function() {
            const label = document.getElementById('taxModeLabel');
            if (this.checked) {
                label.textContent = '税込み額入力';
            } else {
                label.textContent = '税抜き額入力';
            }
            calculateTotals();
            updateURLParameters();
        });
    }

    // 税込みモードの復元（loadDataFromURLより先に実行）
    // taxMode未指定時は税込み額入力を初期値にする
    setupTaxModeFromURL();

    // URLパラメータからデータを読み込む
    loadDataFromURL();

    // URLパラメータに請求先がない場合は初期値を設定
    setupDefaultClientInfo();
    
    // ボタンのイベントリスナーを設定
    document.getElementById('download-pdf').addEventListener('click', downloadPDF);
    document.getElementById('download-image').addEventListener('click', downloadImage);
    document.getElementById('reset-form').addEventListener('click', resetForm);
    document.getElementById('generate-link').addEventListener('click', generateShareLink);
    document.getElementById('copy-link').addEventListener('click', copyShareLink);
});

// 税込みモードをURLパラメータから復元する関数
function setupTaxModeFromURL() {
    const params = new URLSearchParams(window.location.search);
    const toggle = document.getElementById('taxInclusiveMode');
    const label = document.getElementById('taxModeLabel');

    if (!toggle) return;

    const taxMode = params.get('taxMode');
    const isTaxInclusive = taxMode !== 'exclusive';

    toggle.checked = isTaxInclusive;
    if (label) {
        label.textContent = isTaxInclusive ? '税込み額入力' : '税抜き額入力';
    }
}

// 請求先の初期値を設定する関数
function setupDefaultClientInfo() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('clientInfo')) return;

    const clientInfoElement = document.querySelector('.editable[data-param="clientInfo"]');
    if (clientInfoElement && clientInfoElement.textContent.trim() === '') {
        clientInfoElement.textContent = DEFAULT_CLIENT_INFO;
    }
}

// 日付フィールドの初期化
function setupDateFields() {
    // 請求日フィールド（今日の日付をデフォルト値として設定）
    const invoiceDateField = document.getElementById('invoiceDate');
    if (invoiceDateField) {
        // 今日の日付をYYYY-MM-DD形式で取得
        const today = new Date();
        const todayFormatted = formatDateForInput(today);
        
        // 請求日に今日の日付を設定
        invoiceDateField.value = todayFormatted;
        
        // 変更イベントを監視
        invoiceDateField.addEventListener('change', function() {
            // URLパラメータを更新
            updateURLParameters();
        });
    }
    
    // 入金期限フィールド（来月末をデフォルト値として設定）
    const paymentDueDateField = document.getElementById('paymentDueDate');
    if (paymentDueDateField) {
        // 来月末の日付を計算
        const today = new Date();
        const nextMonthLastDay = getLastDayOfNextMonth(today);
        const nextMonthLastDayFormatted = formatDateForInput(nextMonthLastDay);
        
        // 入金期限に来月末の日付を設定
        paymentDueDateField.value = nextMonthLastDayFormatted;
        
        // 変更イベントを監視
        paymentDueDateField.addEventListener('change', function() {
            // URLパラメータを更新
            updateURLParameters();
        });
    }
}

// 日付をYYYY-MM-DD形式に変換する関数
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 来月末の日付を取得する関数
function getLastDayOfNextMonth(date) {
    // 来月の初日を取得
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    // 来月の翌月の初日を取得
    const nextNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1);
    // 来月の翌月の初日から1日引くと来月の末日になる
    const lastDayOfNextMonth = new Date(nextNextMonth);
    lastDayOfNextMonth.setDate(lastDayOfNextMonth.getDate() - 1);
    
    return lastDayOfNextMonth;
}

// 自動計算される項目を編集不可に設定する関数
function setupReadOnlyElements() {
    // 自動計算される項目のdata-param属性
    const readOnlyParams = [
        'subtotal',        // 小計
        'tax',             // 消費税
        'total',           // 請求金額
        'taxableAmount10', // 内訳の10%対象(税抜)
        'taxAmount10'      // 10%消費税
        // withholdingTax は手動入力なので含めない
    ];
    
    // 明細金額も編集不可に設定
    for (let i = 1; i <= 8; i++) {
        readOnlyParams.push(`item${i}Amount`);
    }
    
    // 該当する要素を取得して編集不可に設定
    readOnlyParams.forEach(param => {
        const elements = document.querySelectorAll(`.editable[data-param="${param}"]`);
        elements.forEach(element => {
            // 編集不可クラスを追加
            element.classList.add('readonly');
            
            // 明示的に編集不可に設定
            element.contentEditable = false;
            element.setAttribute('contenteditable', 'false');
            
            // クリックイベントを無効化
            element.removeEventListener('click', function() {});
            
            // 新しいクリックイベントを追加（編集モードにしない）
            element.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                // 編集不可であることを示すツールチップを表示する場合はここに追加
            });
        });
    });
}

// 編集可能な要素の設定
function setupEditableElements() {
    const editables = document.querySelectorAll('.editable');
    
    editables.forEach(element => {
        // 要素をクリックしたときに編集モードにする
        element.addEventListener('click', function() {
            if (!this.isContentEditable) {
                this.contentEditable = true;
                this.focus();
            }
        });
        
        // フォーカスが外れたときに編集モードを終了し、URLパラメータを更新
        element.addEventListener('blur', function() {
            this.contentEditable = false;
            
            // パラメータ名を取得
            const paramName = this.dataset.param;
            
            // 単価または数量が変更された場合、明細金額を自動計算
            if (paramName && (paramName.includes('Price') || paramName.includes('Quantity'))) {
                const itemNumber = paramName.match(/\d+/);
                if (itemNumber) {
                    calculateItemAmount(itemNumber[0]);
                }
            }
            
            // 明細金額が変更された場合、または単価・数量が変更された場合に自動計算を実行
            if (paramName && (
                paramName.includes('Amount') || 
                paramName.includes('Price') || 
                paramName.includes('Quantity') ||
                paramName === 'withholdingTax'
            )) {
                calculateTotals();
            }
            
            // 空の場合はプレースホルダーを表示
            if (this.textContent.trim() === '') {
                this.textContent = '';  // 空白文字を削除
            }
            
            updateURLParameters();
        });
        
        // 要素がフォーカスされたときにプレースホルダーを非表示にする
        element.addEventListener('focus', function() {
            // フォーカス時に空の場合はプレースホルダーを非表示にする
            if (this.textContent.trim() === '') {
                // プレースホルダーは:emptyと:beforeで表示されるので、
                // 実際にはここで何もする必要はありません
            }
        });
        
        // Enterキーが押されたときの処理
        element.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                // Shiftキーを押しながらのEnterは常に改行を許可
                if (e.shiftKey) {
                    return; // 通常の動作を許可（改行）
                }
                
                // 複数行入力フォームの場合は通常のEnterキーでも改行を許可
                if (this.classList.contains('multiline-input') || 
                    this.classList.contains('payment-bank-info') || 
                    this.classList.contains('notes-content')) {
                    return; // 通常の動作を許可（改行）
                } else {
                    // 通常の入力フィールドの場合はEnterキーでフォーカスを外す
                    e.preventDefault();
                    this.blur();
                }
            }
        });
    });
}

// 金額を数値に変換する関数（カンマや円記号を除去）
function parseAmount(amountStr) {
    if (!amountStr) return 0;
    // カンマと円記号を除去して数値に変換
    return parseFloat(amountStr.replace(/,/g, '').replace(/円/g, '').trim()) || 0;
}

// 数値を金額表示形式に変換する関数（3桁区切りのカンマと円記号）
function formatAmount(amount) {
    return amount.toLocaleString() + '円';
}

// 入力された十進数を整数比で保持し、二進浮動小数点の誤差を避ける。
// parseFloat と同様に「8.20時間」などの先頭の数値を読む。
function decimalRatio(text) {
    const match = String(text).trim().match(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (!match || !Number.isFinite(Number(match[0])) || Number(match[0]) === 0) {
        return [0n, 1n];
    }
    const [mantissa, exponent = '0'] = match[0].toLowerCase().split('e');
    const decimals = (mantissa.split('.')[1] || '').length;
    const scale = decimals - Number(exponent);
    const integer = BigInt(mantissa.replace('.', ''));
    return scale >= 0
        ? [integer, 10n ** BigInt(scale)]
        : [integer * 10n ** BigInt(-scale), 1n];
}

function floorDecimalProduct(left, right, divisor = 1) {
    const [leftValue, leftScale] = decimalRatio(left);
    const [rightValue, rightScale] = decimalRatio(right);
    const numerator = leftValue * rightValue;
    const denominator = leftScale * rightScale * BigInt(divisor);
    // BigInt の除算はゼロ方向なので、負の端数も Math.floor と揃える。
    const rounded = numerator / denominator
        - (numerator < 0n && numerator % denominator !== 0n ? 1n : 0n);
    return Number(rounded);
}

// 明細の単価と数量から金額を計算する関数
function calculateItemAmount(itemNumber) {
    const priceElement = document.querySelector(`[data-param="item${itemNumber}Price"]`);
    const quantityElement = document.querySelector(`[data-param="item${itemNumber}Quantity"]`);
    const amountElement = document.querySelector(`[data-param="item${itemNumber}Amount"]`);
    
    if (priceElement && quantityElement && amountElement) {
        const priceText = priceElement.textContent.trim();
        const quantityText = quantityElement.textContent.trim();
        
        // 単価と数量の両方が入力されている場合のみ計算
        if (priceText && quantityText) {
            const price = parseAmount(priceText);
            
            // 数量が数値の場合（例: 1, 2.5など）
            if (!isNaN(parseFloat(quantityText))) {
                const amount = floorDecimalProduct(priceText.replace(/[,円]/g, ''), quantityText);
                amountElement.textContent = amount.toLocaleString();
            } 
            // 数量が「〇人月」などの場合
            else if (quantityText.includes('人月') || quantityText.includes('人日')) {
                const amount = floorDecimalProduct(priceText.replace(/[,円]/g, ''), '1');
                amountElement.textContent = amount.toLocaleString();
            }
            // その他の場合は単価をそのまま金額とする
            else {
                amountElement.textContent = price.toLocaleString();
            }
        }
    }
}

// 小計、消費税、請求金額を計算する関数
function calculateTotals() {
    // 明細金額を取得して合計を計算
    let itemTotal = 0;
    const maxItems = 8; // 明細の最大数
    
    for (let i = 1; i <= maxItems; i++) {
        const amountElement = document.querySelector(`[data-param="item${i}Amount"]`);
        if (amountElement && amountElement.textContent.trim()) {
            itemTotal += parseAmount(amountElement.textContent);
        }
    }
    
    const taxToggle = document.getElementById('taxInclusiveMode');
    const isTaxInclusive = taxToggle && taxToggle.checked;
    
    let subtotal, taxAmount, total;
    
    if (isTaxInclusive) {
        // 税込みモード: 入力額が税込み → 税抜きと消費税を逆算
        total = itemTotal;
        subtotal = floorDecimalProduct(total, 10, 11); // 税抜き額（切り捨て）
        taxAmount = total - subtotal; // 消費税
    } else {
        // 税抜きモード（従来）: 入力額が税抜き → 消費税を加算
        subtotal = itemTotal;
        taxAmount = floorDecimalProduct(subtotal, 1, 10); // 小数点以下切り捨て
        total = subtotal + taxAmount;
    }
    
    // 源泉徴収税額を取得（手動入力）
    const withholdingTaxElement = document.querySelector('[data-param="withholdingTax"]');
    let withholdingTax = 0;
    if (withholdingTaxElement && withholdingTaxElement.textContent.trim()) {
        withholdingTax = parseAmount(withholdingTaxElement.textContent);
    }
    
    // 源泉徴収額を差し引いた請求金額
    total = total - withholdingTax;
    
    // 計算結果を表示
    const subtotalElement = document.querySelector('[data-param="subtotal"]');
    const taxElement = document.querySelector('[data-param="tax"]');
    const totalElement = document.querySelector('[data-param="total"]');
    const taxableAmount10Element = document.querySelector('[data-param="taxableAmount10"]');
    const taxAmount10Element = document.querySelector('[data-param="taxAmount10"]');
    
    if (subtotalElement) subtotalElement.textContent = formatAmount(subtotal);
    if (taxElement) taxElement.textContent = formatAmount(taxAmount);
    if (totalElement) totalElement.textContent = formatAmount(total);
    if (taxableAmount10Element) taxableAmount10Element.textContent = formatAmount(subtotal);
    if (taxAmount10Element) taxAmount10Element.textContent = formatAmount(taxAmount);
    
    // URLパラメータを更新
    updateURLParameters();
}

// 明細行を追加する機能は削除されました

// PDFをダウンロード
function downloadPDF() {
    // PDF生成前に編集モードを全て終了
    document.querySelectorAll('.editable[contenteditable="true"]').forEach(el => {
        el.contentEditable = false;
    });
    
    // コントロールボタンを一時的に非表示
    const controls = document.querySelector('.controls');
    controls.style.display = 'none';
    
    // PDF出力モードを適用（点線の枠線を非表示）
    const invoiceElement = document.querySelector('.invoice-container');
    invoiceElement.classList.add('pdf-mode');
    
    // 空の編集可能要素のプレースホルダーを非表示にする
    document.querySelectorAll('.editable[data-placeholder]').forEach(el => {
        if (el.textContent.trim() === '') {
            // 空の要素に特別なクラスを追加
            el.classList.add('pdf-empty');
            // 空白文字を追加して:emptyセレクタが適用されないようにする
            el.innerHTML = '&nbsp;';
        }
    });
    
    // レスポンシブデザインを調整するためのスタイルを追加
    const tempStyle = document.createElement('style');
    tempStyle.id = 'temp-pdf-style';
    tempStyle.innerHTML = `
        @media (max-width: 768px) {
            .invoice-container {
                padding: 40px !important;
            }
            
            .invoice-header {
                flex-direction: column !important;
                display: flex !important;
            }
            
            /* 請求日/請求書番号を最初に表示 */
            .invoice-info {
                width: 100% !important;
                margin-bottom: 20px !important;
                text-align: left !important;
                order: 1 !important;
            }
            
            /* 請求先を2番目に表示 */
            .client-info {
                width: 100% !important;
                margin-bottom: 20px !important;
                order: 2 !important;
            }
            
            /* 3行目のレイアウト調整 */
            .invoice-row {
                flex-direction: column !important;
                display: flex !important;
            }
            
            /* 請求元を3番目に表示 */
            .sender-info {
                width: 100% !important;
                margin-bottom: 20px !important;
                text-align: left !important;
                order: 3 !important;
            }
            
            /* 件名/請求金額テーブルを4番目に表示 */
            .invoice-left {
                width: 100% !important;
                margin-bottom: 20px !important;
                order: 4 !important;
            }
        }
    `;
    document.head.appendChild(tempStyle);
    
    // jsPDFとhtml2canvasを使用してPDFを生成
    const { jsPDF } = window.jspdf;
    
    html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1000 // デスクトップ幅を強制的に設定
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0;
        
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save('請求書.pdf');
        
        // PDF出力モードを解除
        invoiceElement.classList.remove('pdf-mode');
        
        // コントロールボタンを再表示
        controls.style.display = 'block';
        
        // 一時的なスタイルを削除
        const tempStyle = document.getElementById('temp-pdf-style');
        if (tempStyle) {
            tempStyle.remove();
        }
    });
}

// フォームをリセット
function resetForm() {
    if (confirm('入力内容をリセットしますか？')) {
        // 全ての編集可能な要素を初期化
        document.querySelectorAll('.editable').forEach(element => {
            // すべての要素を空にする
            element.textContent = '';
        });
        
        // 日付フィールドを初期値に戻す
        setupDateFields();

        // 税込みモードと請求先を初期値に戻す
        const taxToggle = document.getElementById('taxInclusiveMode');
        const taxLabel = document.getElementById('taxModeLabel');
        if (taxToggle) {
            taxToggle.checked = true;
        }
        if (taxLabel) {
            taxLabel.textContent = '税込み額入力';
        }
        const clientInfoElement = document.querySelector('.editable[data-param="clientInfo"]');
        if (clientInfoElement) {
            clientInfoElement.textContent = DEFAULT_CLIENT_INFO;
        }
        
        // URLパラメータをクリア
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// URLパラメータを更新
function updateURLParameters() {
    const params = new URLSearchParams();
    
    // 編集可能な要素のパラメータを取得
    document.querySelectorAll('.editable').forEach(element => {
        const paramName = element.dataset.param;
        
        // HTMLの内容を取得し、改行を処理する
        let paramValue = '';
        
        // 複数行入力フォームまたは改行を含む可能性のある要素の場合
        if (element.classList.contains('multiline-input') || 
            element.classList.contains('payment-bank-info') || 
            element.classList.contains('notes-content')) {
            
            // innerHTML内の<br>や<div>を改行コードに変換
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = element.innerHTML;
            
            // <br>タグを改行コードに置換
            const html = tempDiv.innerHTML;
            paramValue = html.replace(/<br\s*\/?>/gi, '\n');
            
            // <div>や<p>の開始タグを改行コードに置換
            paramValue = paramValue.replace(/<div[^>]*>/gi, '\n').replace(/<p[^>]*>/gi, '\n');
            
            // HTMLタグを除去
            const tempDiv2 = document.createElement('div');
            tempDiv2.innerHTML = paramValue;
            paramValue = tempDiv2.textContent;
            
            // 連続する改行を1つにまとめる
            paramValue = paramValue.replace(/\n+/g, '\n');
            
            // 先頭と末尾の空白と改行を削除
            paramValue = paramValue.replace(/^\s+|\s+$/g, '');
        } else {
            // 通常の編集可能要素の場合
            paramValue = element.textContent.replace(/^\s+|\s+$/g, '');
        }
        
        if (paramValue) {
            params.set(paramName, encodeURIComponent(paramValue));
        }
    });
    
    // 税込みモードのパラメータを保存
    const taxToggle = document.getElementById('taxInclusiveMode');
    if (taxToggle) {
        params.set('taxMode', taxToggle.checked ? 'inclusive' : 'exclusive');
    }
    
    // 日付入力フィールドのパラメータを取得
    document.querySelectorAll('.date-input').forEach(element => {
        const paramName = element.dataset.param;
        const paramValue = element.value;
        
        if (paramValue) {
            params.set(paramName, encodeURIComponent(paramValue));
        }
    });
    
    // URLを更新（ページ遷移なし）
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, document.title, newUrl);
}

// URLパラメータからデータを読み込む
function loadDataFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    // 既存のパラメータを処理
    params.forEach((value, key) => {
        // 編集可能な要素を処理
        const editableElements = document.querySelectorAll(`.editable[data-param="${key}"]`);
        if (editableElements.length > 0) {
            editableElements.forEach(element => {
                const decodedValue = decodeURIComponent(value);
                
                // 複数行入力フォームの場合は改行を保持
                if (element.classList.contains('multiline-input') || 
                    element.classList.contains('payment-bank-info') || 
                    element.classList.contains('notes-content')) {
                    // textContentを使用して安全に設定（CSSのwhite-space: pre-wrapで改行を表示）
                    element.textContent = decodedValue;
                } else {
                    // 通常の編集可能要素の場合
                    element.textContent = decodedValue;
                }
            });
        }
        
        // 日付入力フィールドを処理
        const dateInputs = document.querySelectorAll(`.date-input[data-param="${key}"]`);
        if (dateInputs.length > 0) {
            dateInputs.forEach(element => {
                element.value = decodeURIComponent(value);
            });
        }
    });
    
    // URLパラメータが空の場合（初期表示時）は自動計算項目にプレースホルダーを表示
    if (params.toString() === '') {
        // 自動計算される項目のプレースホルダーを表示
        const autoCalcElements = [
            { param: 'subtotal', placeholder: '100,000円' },
            { param: 'tax', placeholder: '10,000円' },
            { param: 'total', placeholder: '110,000円' },
            { param: 'taxableAmount10', placeholder: '100,000円' },
            { param: 'taxAmount10', placeholder: '10,000円' }
        ];
        
        autoCalcElements.forEach(item => {
            const element = document.querySelector(`.editable[data-param="${item.param}"]`);
            if (element && element.textContent.trim() === '') {
                element.textContent = '';  // 空にして :empty 疑似クラスが適用されるようにする
            }
        });
        
        // 明細金額のプレースホルダーを表示
        const maxItems = 8;
        for (let i = 1; i <= maxItems; i++) {
            const amountElement = document.querySelector(`.editable[data-param="item${i}Amount"]`);
            if (amountElement && amountElement.textContent.trim() === '') {
                amountElement.textContent = '';  // 空にして :empty 疑似クラスが適用されるようにする
            }
        }
    } else {
        // 明細金額の自動計算（単価と数量から）
        const maxItems = 8;
        for (let i = 1; i <= maxItems; i++) {
            calculateItemAmount(i);
        }
        
        // データ読み込み後に自動計算を実行
        calculateTotals();
    }
}


// 共有リンクを生成
function generateShareLink() {
    // 現在のURLを取得（パラメータ付き）
    const currentUrl = window.location.href;
    
    // 共有リンク表示エリアを表示
    const shareLinkContainer = document.getElementById('share-link-container');
    const shareLink = document.getElementById('share-link');
    
    if (shareLinkContainer) {
        // 表示状態を切り替え
        if (shareLinkContainer.style.display === 'block') {
            shareLinkContainer.style.display = 'none';
        } else {
            shareLinkContainer.style.display = 'block';
            if (shareLink) {
                shareLink.value = currentUrl;
                setTimeout(() => {
                    shareLink.select();
                }, 100);
            }
        }
    } else {
        console.error('共有リンク表示エリアが見つかりません');
    }
}

// 共有リンクをクリップボードにコピー
function copyShareLink() {
    const shareLink = document.getElementById('share-link');
    shareLink.select();
    document.execCommand('copy');
    
    // コピー成功メッセージ
    const copyButton = document.getElementById('copy-link');
    const originalText = copyButton.textContent;
    
    copyButton.textContent = 'コピーしました！';
    setTimeout(() => {
        copyButton.textContent = originalText;
    }, 2000);
}

// 画像をダウンロード
function downloadImage() {
    // 画像生成前に編集モードを全て終了
    document.querySelectorAll('.editable[contenteditable="true"]').forEach(el => {
        el.contentEditable = false;
    });
    
    // コントロールボタンを一時的に非表示
    const controls = document.querySelector('.controls');
    controls.style.display = 'none';
    
    // PDF出力モードを適用（点線の枠線を非表示）- 画像出力にも同じスタイルを使用
    const invoiceElement = document.querySelector('.invoice-container');
    invoiceElement.classList.add('pdf-mode');
    
    // 空の編集可能要素のプレースホルダーを非表示にする
    document.querySelectorAll('.editable[data-placeholder]').forEach(el => {
        if (el.textContent.trim() === '') {
            // 空の要素に特別なクラスを追加
            el.classList.add('pdf-empty');
            // 空白文字を追加して:emptyセレクタが適用されないようにする
            el.innerHTML = '&nbsp;';
        }
    });
    
    // レスポンシブデザインを調整するためのスタイルを追加
    const tempStyle = document.createElement('style');
    tempStyle.id = 'temp-image-style';
    tempStyle.innerHTML = `
        @media (max-width: 768px) {
            .invoice-container {
                padding: 40px !important;
            }
            
            .invoice-header {
                flex-direction: column !important;
                display: flex !important;
            }
            
            /* 請求日/請求書番号を最初に表示 */
            .invoice-info {
                width: 100% !important;
                margin-bottom: 20px !important;
                text-align: left !important;
                order: 1 !important;
            }
            
            /* 請求先を2番目に表示 */
            .client-info {
                width: 100% !important;
                margin-bottom: 20px !important;
                order: 2 !important;
            }
            
            /* 3行目のレイアウト調整 */
            .invoice-row {
                flex-direction: column !important;
                display: flex !important;
            }
            
            /* 請求元を3番目に表示 */
            .sender-info {
                width: 100% !important;
                margin-bottom: 20px !important;
                text-align: left !important;
                order: 3 !important;
            }
            
            /* 件名/請求金額テーブルを4番目に表示 */
            .invoice-left {
                width: 100% !important;
                margin-bottom: 20px !important;
                order: 4 !important;
            }
        }
    `;
    document.head.appendChild(tempStyle);
    
    // html2canvasを使用して画像を生成
    html2canvas(invoiceElement, {
        scale: 2, // 高解像度で出力
        useCORS: true,
        logging: false,
        windowWidth: 1000 // デスクトップ幅を強制的に設定
    }).then(canvas => {
        // キャンバスからPNG画像データを取得
        const imgData = canvas.toDataURL('image/png');
        
        // ダウンロードリンクを作成
        const downloadLink = document.createElement('a');
        downloadLink.href = imgData;
        downloadLink.download = '請求書.png'; // ダウンロード時のファイル名
        
        // リンクをクリックしてダウンロードを開始
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // PDF出力モードを解除
        invoiceElement.classList.remove('pdf-mode');
        
        // コントロールボタンを再表示
        controls.style.display = 'block';
        
        // 一時的なスタイルを削除
        const tempStyle = document.getElementById('temp-image-style');
        if (tempStyle) {
            tempStyle.remove();
        }
        
        // 空の要素から特別なクラスを削除
        document.querySelectorAll('.pdf-empty').forEach(el => {
            el.classList.remove('pdf-empty');
            el.innerHTML = '';
        });
    });
}
