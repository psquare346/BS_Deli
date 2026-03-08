/**
 * B's Grocery — Print Bridge
 * Polls Google Sheets for new orders and prints receipts.
 * 
 * Supports two printer modes (set in config.json):
 *   "standard" — PDF receipts for regular printers (Canon, HP, etc.)
 *   "thermal"  — ESC/POS receipts for thermal printers (SGT-88iV)
 * 
 * Usage:
 *   node print-bridge.js           — start polling and printing
 *   node print-bridge.js --test    — print a test receipt
 *   node print-bridge.js --preview — generate/open a test receipt (no print)
 *   node print-bridge.js --list    — list available printers
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const fetch = require('node-fetch');

// Load configuration
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const POLL_INTERVAL = (config.pollIntervalSeconds || 10) * 1000;
const APPS_SCRIPT_URL = config.appsScriptUrl;
const PRINTER_MODE = (config.printerMode || 'standard').toLowerCase();

// ================================================================
// STANDARD MODE — PDF printing for regular printers
// ================================================================
const { generateReceiptPDF } = require('./receipt-pdf');

async function printReceiptStandard(order) {
    try {
        // Generate the PDF
        const pdfPath = await generateReceiptPDF(order, config.store);
        console.log('   📄 PDF generated: ' + path.basename(pdfPath));

        // Print using pdf-to-printer
        const { print } = require('pdf-to-printer');
        const printOptions = {};

        // Use specific printer if configured
        const printerName = config.printer.name || '';
        if (printerName) {
            printOptions.printer = printerName;
        }

        await print(pdfPath, printOptions);
        console.log('   🖨️  Receipt printed for order #' + order.orderNumber);

        // Clean up temp file after a delay
        setTimeout(() => {
            try { fs.unlinkSync(pdfPath); } catch (e) { /* ignore */ }
        }, 10000);

        return true;

    } catch (error) {
        console.error('   ❌ Print error:', error.message);
        return false;
    }
}

async function previewReceipt(order) {
    try {
        const pdfPath = await generateReceiptPDF(order, config.store);
        console.log('   📄 PDF generated: ' + pdfPath);
        console.log('   📂 Opening in default viewer...');

        // Open PDF in default viewer
        exec('start "" "' + pdfPath + '"');
        return true;
    } catch (error) {
        console.error('   ❌ Preview error:', error.message);
        return false;
    }
}

// ================================================================
// THERMAL MODE — PDF printing to auto-detected thermal printer
// (No native compilation required — uses pdf-to-printer)
// ================================================================
let detectedThermalPrinter = null;

async function printReceiptThermal(order) {
    try {
        // Generate the PDF receipt
        const pdfPath = await generateReceiptPDF(order, config.store);
        console.log('   📄 PDF generated: ' + path.basename(pdfPath));

        // Auto-detect the thermal printer if not yet found
        if (!detectedThermalPrinter) {
            detectedThermalPrinter = findPrinter();
        }

        // Print using pdf-to-printer
        const { print } = require('pdf-to-printer');
        await print(pdfPath, { printer: detectedThermalPrinter });
        console.log('   🖨️  Receipt printed for order #' + order.orderNumber);

        // Clean up temp file after a delay
        setTimeout(() => {
            try { fs.unlinkSync(pdfPath); } catch (e) { /* ignore */ }
        }, 10000);

        return true;

    } catch (error) {
        console.error('   ❌ Print error:', error.message);
        return false;
    }
}

// ================================================================
// UNIFIED PRINT FUNCTION
// ================================================================
async function printReceipt(order) {
    if (PRINTER_MODE === 'thermal') {
        return await printReceiptThermal(order);
    } else {
        return await printReceiptStandard(order);
    }
}

// ================================================================
// PRINTER DETECTION
// ================================================================
function getPrinterList() {
    try {
        const result = execSync(
            'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"',
            { encoding: 'utf8' }
        );
        return result.split('\n').map(l => l.trim()).filter(l => l);
    } catch (e) {
        console.error('   Error listing printers:', e.message);
        return [];
    }
}

function findPrinter() {
    console.log('🔍 Auto-detecting printer...');
    const printers = getPrinterList();

    if (printers.length === 0) {
        console.log('   ❌ No printers found. Please set the printer name in config.json');
        process.exit(1);
    }

    console.log('   Available printers:');
    printers.forEach(p => console.log('   • ' + p));

    // Look for SGT or receipt/thermal printer keywords
    const keywords = ['sgt', '88iv', 'receipt', 'thermal', 'pos', 'epson', 'star'];
    const match = printers.find(p =>
        keywords.some(k => p.toLowerCase().includes(k))
    );

    if (match) {
        console.log('   ✅ Found: ' + match);
        return match;
    }

    // If no match, use the first non-system printer
    const systemPrinters = ['microsoft', 'onenote', 'fax', 'pdf', 'xps'];
    const nonSystem = printers.find(p =>
        !systemPrinters.some(s => p.toLowerCase().includes(s))
    );

    if (nonSystem) {
        console.log('   ⚠️  No receipt printer found by name, using: ' + nonSystem);
        return nonSystem;
    }

    console.log('   ❌ No suitable printer found. Please set the printer name in config.json');
    console.log('   Run: node print-bridge.js --list  to see available printers');
    process.exit(1);
}

function listPrinters() {
    console.log('\n🖨️  Available printers:\n');
    const printers = getPrinterList();
    if (printers.length > 0) {
        printers.forEach(p => console.log('   • ' + p));
    } else {
        console.log('   (no printers found)');
    }
    console.log('\n📋 Current config:');
    console.log('   Mode: ' + PRINTER_MODE);
    console.log('   Printer name: ' + (config.printer.name || '(auto-detect)'));
    console.log('\nTo set your printer, edit config.json:');
    console.log('   "printer": { "name": "Your Printer Name Here" }');
}

// ================================================================
// POLLING LOGIC
// ================================================================
let isPolling = false;

async function checkForNewOrders() {
    if (isPolling) return;
    isPolling = true;

    try {
        const url = APPS_SCRIPT_URL + '?action=getNewOrders';
        const response = await fetch(url, { redirect: 'follow' });
        const data = await response.json();

        if (data.status !== 'success') {
            console.error('⚠️  API error:', data.message);
            isPolling = false;
            return;
        }

        const orders = data.orders || [];

        if (orders.length > 0) {
            console.log('\n🔔 ' + orders.length + ' new order(s) found!');
        }

        for (const order of orders) {
            console.log('   Processing order #' + order.orderNumber + '...');

            const printed = await printReceipt(order);

            if (printed) {
                // Mark as printed in the Google Sheet
                try {
                    const markUrl = APPS_SCRIPT_URL + '?action=markPrinted&row=' + order.row;
                    await fetch(markUrl, { redirect: 'follow' });
                    console.log('   ✅ Order #' + order.orderNumber + ' marked as printed');
                } catch (e) {
                    console.error('   ⚠️  Could not mark order as printed:', e.message);
                }
            }
        }

    } catch (error) {
        console.error('⚠️  Poll error:', error.message);
    }

    isPolling = false;
}

// ================================================================
// TEST & PREVIEW
// ================================================================
const TEST_ORDER = {
    orderNumber: 'TEST-001',
    timestamp: new Date().toLocaleString(),
    name: 'Test Customer',
    phone: '(256) 555-1234',
    pickupTime: '12:30 PM',
    items: '2x Sausage Biscuit @ $4.58\n1x Plain / Cheese Pizza (Pepperoni, Mushrooms) @ $11.99\n1x 10 Piece Wings (Buffalo) @ $10.99',
    subtotal: '$27.56',
    tax: '$2.62',
    total: '$30.18',
    notes: 'Extra napkins please'
};

async function printTestReceipt() {
    console.log('\n🧪 Printing test receipt...');
    console.log('   Mode: ' + PRINTER_MODE);
    console.log('');

    const success = await printReceipt(TEST_ORDER);

    if (success) {
        console.log('\n✅ Test receipt printed successfully!');
    } else {
        console.log('\n❌ Test print failed. Check printer connection and config.json settings.');
        console.log('   Run: node print-bridge.js --list  to see available printers');
    }
}

async function previewTestReceipt() {
    console.log('\n👁️  Generating preview receipt...\n');
    const success = await previewReceipt(TEST_ORDER);

    if (success) {
        console.log('\n✅ Preview PDF opened! Check that the receipt looks correct.');
    } else {
        console.log('\n❌ Preview failed.');
    }
}

// ================================================================
// MAIN
// ================================================================
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--list')) {
        listPrinters();
        return;
    }

    if (args.includes('--preview')) {
        await previewTestReceipt();
        return;
    }

    if (args.includes('--test')) {
        await printTestReceipt();
        return;
    }

    // Normal mode — start polling
    const modeLabel = PRINTER_MODE === 'thermal' ? 'THERMAL (ESC/POS)' : 'STANDARD (PDF)';
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║   B\'s Deli — Print Bridge  🖨️        ║');
    console.log('║   Listening for new orders...        ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    console.log('📡 Polling every ' + (POLL_INTERVAL / 1000) + ' seconds');
    console.log('🖨️  Printer mode: ' + modeLabel);
    console.log('🔗 Endpoint: ' + APPS_SCRIPT_URL.substring(0, 50) + '...');
    if (config.printer.name) {
        console.log('🏷️  Printer: ' + config.printer.name);
    }
    console.log('');
    console.log('Press Ctrl+C to stop.\n');

    // Initial check
    await checkForNewOrders();

    // Start polling loop
    setInterval(checkForNewOrders, POLL_INTERVAL);
}

main().catch(console.error);
