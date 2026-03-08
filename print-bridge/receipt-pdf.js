/**
 * B's Grocery — PDF Receipt Generator
 * Generates a receipt-style PDF for standard (non-thermal) printers.
 * Used by the print bridge in "standard" mode.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Receipt page size: 80mm wide (≈226pt), variable height
const RECEIPT_WIDTH = 226;
const MARGIN = 14;
const CONTENT_WIDTH = RECEIPT_WIDTH - (MARGIN * 2);

/**
 * Render receipt content onto a PDFDocument and return final Y position.
 */
function renderReceipt(doc, order, store) {
    let y = MARGIN;

    // ---- Helper functions ----
    function centerText(text, fontSize, fontStyle) {
        doc.font(fontStyle || 'Helvetica')
            .fontSize(fontSize);
        const textWidth = doc.widthOfString(text);
        const x = MARGIN + (CONTENT_WIDTH - textWidth) / 2;
        doc.text(text, Math.max(MARGIN, x), y, { width: CONTENT_WIDTH, align: 'center' });
        y += doc.heightOfString(text, { width: CONTENT_WIDTH }) + 2;
    }

    function leftText(text, fontSize, fontStyle) {
        doc.font(fontStyle || 'Helvetica')
            .fontSize(fontSize)
            .text(text, MARGIN, y, { width: CONTENT_WIDTH });
        y += doc.heightOfString(text, { width: CONTENT_WIDTH }) + 1;
    }

    function rightText(text, fontSize, fontStyle) {
        doc.font(fontStyle || 'Helvetica')
            .fontSize(fontSize)
            .text(text, MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
        y += doc.heightOfString(text, { width: CONTENT_WIDTH }) + 1;
    }

    function leftRightText(left, right, fontSize, fontStyle) {
        doc.font(fontStyle || 'Helvetica').fontSize(fontSize);
        const rightWidth = doc.widthOfString(right);
        const leftWidth = CONTENT_WIDTH - rightWidth - 4;
        doc.text(left, MARGIN, y, { width: leftWidth });
        doc.text(right, MARGIN + leftWidth + 4, y, { width: rightWidth, align: 'right' });
        const leftH = doc.heightOfString(left, { width: leftWidth });
        const rightH = doc.heightOfString(right, { width: rightWidth });
        y += Math.max(leftH, rightH) + 1;
    }

    function drawLine() {
        doc.moveTo(MARGIN, y)
            .lineTo(RECEIPT_WIDTH - MARGIN, y)
            .lineWidth(0.5)
            .stroke('#333');
        y += 6;
    }

    function dashedLine() {
        doc.moveTo(MARGIN, y)
            .lineTo(RECEIPT_WIDTH - MARGIN, y)
            .lineWidth(0.5)
            .dash(3, { space: 2 })
            .stroke('#666');
        doc.undash();
        y += 6;
    }

    function gap(size) { y += size || 6; }

    // ============================================================
    // RECEIPT LAYOUT
    // ============================================================

    // ---- Store Header ----
    drawLine();
    centerText(store.name || "B's Grocery", 16, 'Helvetica-Bold');
    centerText('ONLINE ORDER', 9, 'Helvetica-Bold');
    drawLine();
    gap(2);

    // Store info
    if (store.address) centerText(store.address, 7, 'Helvetica');
    if (store.phone) centerText(store.phone, 7, 'Helvetica');
    gap(4);

    // ---- Order Number (large) ----
    centerText('#' + (order.orderNumber || 'N/A'), 18, 'Helvetica-Bold');
    gap(4);

    // ---- Customer Info ----
    drawLine();
    leftText('Customer: ' + (order.name || 'N/A'), 9, 'Helvetica-Bold');
    leftText('Phone:    ' + (order.phone || 'N/A'), 9, 'Helvetica-Bold');
    leftText('Pickup:   ' + (order.pickupTime || 'ASAP'), 9, 'Helvetica-Bold');
    drawLine();
    gap(2);

    // ---- Order Items ----
    centerText('ORDER ITEMS', 9, 'Helvetica-Bold');
    dashedLine();

    const itemLines = (order.items || '').split('\n').filter(l => l.trim());
    if (itemLines.length > 0) {
        itemLines.forEach(line => {
            leftText(line.trim(), 8, 'Helvetica');
            gap(1);
        });
    } else {
        leftText('(no items)', 8, 'Helvetica');
    }

    dashedLine();

    // ---- Totals ----
    if (order.subtotal) {
        leftRightText('Subtotal:', order.subtotal.toString(), 8, 'Helvetica');
    }
    if (order.tax) {
        leftRightText('Tax:', order.tax.toString(), 8, 'Helvetica');
    }
    gap(2);
    if (order.total) {
        leftRightText('TOTAL:', order.total.toString(), 11, 'Helvetica-Bold');
    }
    gap(4);

    // ---- Notes ----
    if (order.notes && order.notes.toString().trim()) {
        dashedLine();
        leftText('NOTES:', 8, 'Helvetica-Bold');
        leftText(order.notes.toString(), 8, 'Helvetica');
        gap(4);
    }

    // ---- Footer ----
    drawLine();
    if (order.timestamp) {
        centerText('Order placed: ' + order.timestamp.toString(), 6, 'Helvetica');
    }
    centerText('Printed: ' + new Date().toLocaleString(), 6, 'Helvetica');
    gap(6);
    centerText('** COLLECT PAYMENT AT REGISTER **', 8, 'Helvetica-Bold');
    gap(8);

    return y;
}

/**
 * Generate a receipt PDF for an order.
 * The page height is sized to fit the content exactly (no wasted paper).
 * @param {Object} order - Order data from Google Sheets
 * @param {Object} store - Store info from config
 * @returns {Promise<string>} - Path to the generated PDF file
 */
function generateReceiptPDF(order, store) {
    return new Promise((resolve, reject) => {
        try {
            const tmpDir = path.join(os.tmpdir(), 'bs-deli-receipts');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }

            // --- Pass 1: measure content height ---
            const measureDoc = new PDFDocument({
                size: [RECEIPT_WIDTH, 2000],
                margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
            });
            // Pipe to nowhere — we just need to measure
            measureDoc.pipe(fs.createWriteStream(path.join(tmpDir, '_measure.pdf')));
            const contentHeight = renderReceipt(measureDoc, order, store);
            measureDoc.end();

            // --- Pass 2: generate final PDF at exact height ---
            const pageHeight = contentHeight + MARGIN; // content + bottom margin
            const fileName = 'receipt-' + (order.orderNumber || 'unknown') + '-' + Date.now() + '.pdf';
            const filePath = path.join(tmpDir, fileName);
            const writeStream = fs.createWriteStream(filePath);

            const doc = new PDFDocument({
                size: [RECEIPT_WIDTH, pageHeight],
                margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
            });

            doc.pipe(writeStream);
            renderReceipt(doc, order, store);
            doc.end();

            writeStream.on('finish', () => resolve(filePath));
            writeStream.on('error', (err) => reject(err));

        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generateReceiptPDF };
