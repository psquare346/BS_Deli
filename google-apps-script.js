/**
 * B's Deli — Google Apps Script
 * Receives online orders and writes them to the "Orders" sheet.
 * Also serves new orders to the Print Bridge via GET requests.
 * 
 * SETUP INSTRUCTIONS:
 * ===================
 * 1. Open your "B's Deli Orders" Google Sheet
 * 2. Rename the first sheet tab to "Orders"
 * 3. Add these headers in Row 1:
 *    A: Order#  |  B: Timestamp  |  C: Name  |  D: Phone  |  E: Pickup Time
 *    F: Items  |  G: Subtotal  |  H: Tax  |  I: Total  |  J: Notes
 *    K: Status  |  L: Printed At
 * 
 * 4. Go to Extensions → Apps Script
 * 5. Delete any existing code and paste this entire file
 * 6. Click Save (💾)
 * 7. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Click Deploy
 * 8. Copy the Web App URL and paste it into order.js (ORDER_ENDPOINT constant)
 * 9. Also paste the same URL into print-bridge/config.json (appsScriptUrl)
 *
 * IMPORTANT: After updating this code, you must create a NEW deployment version:
 *   Deploy → Manage Deployments → Edit (pencil icon) → Version: New Version → Deploy
 */

// ============================================================
// doPost — receives orders from the website
// ============================================================
function doPost(e) {
    try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
        if (!sheet) {
            sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
            sheet.setName('Orders');
        }

        var data = JSON.parse(e.postData.contents);

        // Generate order number: BD-MMDD-XXXX
        var now = new Date();
        var month = ('0' + (now.getMonth() + 1)).slice(-2);
        var day = ('0' + now.getDate()).slice(-2);
        var seq = sheet.getLastRow();
        var orderNumber = 'BD-' + month + day + '-' + ('000' + seq).slice(-4);

        // Format items as readable string
        var itemsText = '';
        if (data.items && data.items.length > 0) {
            data.items.forEach(function (item) {
                itemsText += item.qty + 'x ' + item.name;
                if (item.toppings && item.toppings.length > 0) {
                    itemsText += ' (' + item.toppings.join(', ') + ')';
                }
                if (item.notes) {
                    itemsText += ' [' + item.notes + ']';
                }
                itemsText += ' @ $' + (item.price * item.qty).toFixed(2) + '\n';
            });
        }

        // Append the order row
        sheet.appendRow([
            orderNumber,
            Utilities.formatDate(now, 'America/Chicago', 'MM/dd/yyyy hh:mm:ss a'),
            data.customerName || '',
            data.phone || '',
            data.pickupTime || '',
            itemsText.trim(),
            data.subtotal ? '$' + data.subtotal.toFixed(2) : '',
            data.tax ? '$' + data.tax.toFixed(2) : '',
            data.total ? '$' + data.total.toFixed(2) : '',
            data.notes || '',
            'New',
            ''
        ]);

        return ContentService
            .createTextOutput(JSON.stringify({
                status: 'success',
                orderNumber: orderNumber,
                message: 'Order received!'
            }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({
                status: 'error',
                message: error.toString()
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================================
// doGet — serves new orders to the Print Bridge
// ============================================================
function doGet(e) {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getNewOrders';

    try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
        if (!sheet) {
            return jsonResponse({ status: 'error', message: 'Orders sheet not found' });
        }

        if (action === 'getNewOrders') {
            return getNewOrders(sheet);
        } else if (action === 'markPrinted') {
            var row = parseInt(e.parameter.row);
            return markAsPrinted(sheet, row);
        } else {
            return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });
        }

    } catch (error) {
        return jsonResponse({ status: 'error', message: error.toString() });
    }
}

function getNewOrders(sheet) {
    var data = sheet.getDataRange().getValues();
    var orders = [];

    // Row 0 = headers, start from row 1
    for (var i = 1; i < data.length; i++) {
        var status = (data[i][10] || '').toString().trim(); // Column K = Status
        if (status === 'New') {
            orders.push({
                row: i + 1, // 1-indexed for the sheet
                orderNumber: data[i][0],
                timestamp: data[i][1],
                name: data[i][2],
                phone: data[i][3],
                pickupTime: data[i][4],
                items: data[i][5],
                subtotal: data[i][6],
                tax: data[i][7],
                total: data[i][8],
                notes: data[i][9]
            });
        }
    }

    return jsonResponse({ status: 'success', orders: orders });
}

function markAsPrinted(sheet, row) {
    if (!row || row < 2) {
        return jsonResponse({ status: 'error', message: 'Invalid row number' });
    }

    var now = new Date();
    sheet.getRange(row, 11).setValue('Printed'); // Column K = Status
    sheet.getRange(row, 12).setValue(
        Utilities.formatDate(now, 'America/Chicago', 'MM/dd/yyyy hh:mm:ss a')
    ); // Column L = Printed At

    return jsonResponse({ status: 'success', message: 'Order marked as printed' });
}

function jsonResponse(obj) {
    return ContentService
        .createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// Test functions — run manually from the Apps Script editor
// ============================================================
function testDoPost() {
    var testData = {
        postData: {
            contents: JSON.stringify({
                customerName: 'Test Customer',
                phone: '256-555-1234',
                pickupTime: '12:30 PM',
                notes: 'Extra napkins please',
                items: [
                    { name: 'Sausage Biscuit', qty: 2, price: 2.29, toppings: [] },
                    { name: 'Plain / Cheese Pizza', qty: 1, price: 11.99, toppings: ['Pepperoni', 'Mushrooms'] }
                ],
                subtotal: 16.57,
                tax: 1.57,
                total: 18.14
            })
        }
    };

    var result = doPost(testData);
    Logger.log(result.getContent());
}

function testDoGet() {
    var result = doGet({ parameter: { action: 'getNewOrders' } });
    Logger.log(result.getContent());
}
