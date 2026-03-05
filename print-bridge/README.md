# B's Deli — Print Bridge Setup

## What This Does
The print bridge runs on the store PC and automatically prints new online orders as receipts.

**Two printer modes:**
- **`standard`** — Prints PDF receipts to any regular printer (Canon, HP, etc.)
- **`thermal`** — Prints ESC/POS receipts to the SGT-88iV thermal printer

## Setup Steps

### 1. Install
Double-click **`install.bat`** — it installs the required dependencies.

### 2. Configure Your Printer
Open `config.json` and set:

```json
{
  "printerMode": "standard",
  "printer": {
    "name": "Canon LBP622C/623C"
  }
}
```

- **`printerMode`**: `"standard"` for regular printers, `"thermal"` for the SGT-88iV
- **`printer.name`**: Your printer name as it appears in Windows (run `--list` to find it)

### 3. Update the Google Apps Script
1. Open your **B's Deli Orders** Google Sheet
2. Go to **Extensions → Apps Script**
3. **Replace all the code** with the contents of `google-apps-script.js`
4. Click **Save**
5. **Deploy → Manage Deployments → Edit (pencil icon) → Version → New Version → Deploy**

> ⚠️ You must create a new deployment version after updating the code.

### 4. Preview a Receipt
```
node print-bridge.js --preview
```
This generates a test receipt PDF and opens it — no paper wasted.

### 5. Test Print
```
node print-bridge.js --test
```
Prints a test receipt to your configured printer.

### 6. Start the Print Bridge
Double-click **`START-PRINT-BRIDGE.bat`** — or run:
```
node print-bridge.js
```
The bridge polls for new orders every 10 seconds.

## Commands

| Command | Description |
|---------|-------------|
| `node print-bridge.js` | Start polling for orders |
| `node print-bridge.js --test` | Print a test receipt |
| `node print-bridge.js --preview` | Generate & open a test receipt (no print) |
| `node print-bridge.js --list` | List available printers |

## Troubleshooting

### Printer Not Found
1. Run `node print-bridge.js --list` to see available printers
2. Copy your printer's exact name
3. Set it in `config.json`: `"name": "Your Printer Name Here"`

### Switching to Thermal Printer (SGT-88iV)
Change `config.json`:
```json
{
  "printerMode": "thermal",
  "printer": {
    "interface": "printer:auto"
  }
}
```

### Orders Not Printing
- Check that the Google Apps Script URL in `config.json` matches your deployment
- Make sure the printer is on and connected
- Run `--test` to confirm the printer works independently
