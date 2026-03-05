# B's Deli — Menu Website

A single-page menu website for **B's Deli**, a country store & deli in Woodland, Alabama. Hosted on GitHub Pages, with menu data powered by Google Sheets.

## 🏪 Store Info

- **Address:** 24301 AL-48, Woodland, AL 36280
- **Phone:** (256) 449-6221
- **Hours:** Mon–Sat 6:00 AM – 8:00 PM | Sunday 9:00 AM – 7:00 PM

---

## 🔗 How to Connect Google Sheets

### Step 1: Create Your Google Sheet

Create a Google Sheet with these exact column headers in **Row 1**:

| Category | Item | Description | Price | Price_SM | Price_LG |
|----------|------|-------------|-------|----------|----------|
| Biscuits | Sausage Biscuit | | 2.29 | | |
| Sandwiches & Wraps | BBQ Sandwich | | | 4.49 | 6.49 |

**Column definitions:**
- **Category** — Menu section name (e.g., "Biscuits", "Pizza", "Wings")
- **Item** — Item name (e.g., "Sausage Biscuit")
- **Description** — Optional short note (e.g., "Grilled or fried")
- **Price** — Single price if the item has no size options (e.g., `2.29`)
- **Price_SM** — Small/Regular price (leave blank if single price)
- **Price_LG** — Large price (leave blank if single price)

> **Tip:** Items appear on the website in the same order as the spreadsheet. Group items by category and arrange them how you want them displayed.

### Step 2: Publish the Sheet to the Web

1. In Google Sheets, go to **File → Share → Publish to the web**
2. Under "Link", choose:
   - **Entire Document** (or the specific sheet tab name)
   - **Comma-separated values (.csv)**
3. Click **Publish**
4. Copy the URL it gives you

It will look something like:
```
https://docs.google.com/spreadsheets/d/e/2PACX-abc123.../pub?output=csv
```

### Step 3: Paste the URL into `index.html`

Open `index.html` and find this line near the top of the `<script>` section:

```javascript
const SHEET_CSV_URL = '';  // ← PASTE YOUR PUBLISHED CSV URL HERE
```

Paste your URL between the quotes:

```javascript
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-abc123.../pub?output=csv';
```

### Step 4: Deploy to GitHub Pages

1. Commit and push `index.html` to your GitHub repository
2. Go to **Settings → Pages** in your repo
3. Set source to **Deploy from a branch**, select `main` and `/ (root)`
4. Your site will be live at `https://yourusername.github.io/your-repo-name/`

---

## 📝 How to Update Menu Items

Just edit your Google Sheet! Changes appear on the website automatically (may take a few minutes for Google's cache to update).

- **Add items:** Add a new row with Category, Item, Description, and Price(s)
- **Remove items:** Delete the row
- **Change prices:** Edit the Price, Price_SM, or Price_LG column
- **Reorder items:** Move rows up/down in the sheet
- **Add categories:** Use a new Category name — it automatically creates a new tab on the site

---

## ⚙️ Fallback Data

If the Google Sheet is unreachable or not configured, the site displays a built-in fallback menu (hardcoded in `index.html`). Update the `FALLBACK_MENU` array in the script to keep it in sync with your sheet.

---

## 📂 Files

- `index.html` — The entire website (HTML + CSS + JavaScript in one file)
- `README.md` — This file

---

*© 2026 B's Deli. Woodland, Alabama.*