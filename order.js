/**
 * B's Deli — Online Ordering System
 * Cart management, menu loading, topping customization, and order submission
 */
(function () {
    'use strict';

    // ================================================================
    // CONFIGURATION
    // ================================================================
    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTx9V5D-y-E4V7Xta3lnU9aEFuVddUjNrX1HVYNnd95-izGgnarlg3HhfaX79rAhwNfMEMFl6F7K55r/pub?gid=0&single=true&output=csv';

    // Google Apps Script Web App URL — set this after deploying your Apps Script
    const ORDER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwfhzulzXHyY9rZYQDQ_X6UujCtDznsPy8FmQQT5vA7HQ0V7BTlxHhDCZXSuZQu8qguEg/exec';

    const TAX_RATE = 0.095; // 9.5% — Woodland, AL (4% state + 2.5% Randolph County + 3% city)

    const STORE_HOURS = {
        // 0=Sunday, 1=Monday ... 6=Saturday
        0: { open: 9, close: 19 },   // Sun 9AM-7PM
        1: { open: 6, close: 20 },   // Mon 6AM-8PM
        2: { open: 6, close: 20 },
        3: { open: 6, close: 20 },
        4: { open: 6, close: 20 },
        5: { open: 6, close: 20 },
        6: { open: 6, close: 20 },   // Sat 6AM-8PM
    };

    // Pizza toppings for customization
    const PIZZA_TOPPINGS = [
        'Pepperoni', 'Sausage', 'Beef', 'Bacon',
        'Bell Peppers', 'Onions', 'Banana Peppers',
        'Mushrooms', 'Black Olives', 'Jalapeño'
    ];

    // Categories that allow topping customization
    const PIZZA_CATEGORIES = ['pizza', 'hunt brothers pizza', 'in house pizza', 'hunt brothers specialty pizza'];

    // ================================================================
    // FALLBACK MENU DATA
    // ================================================================
    const FALLBACK_MENU = [
        { category: "Biscuits", item: "Sausage Biscuit", desc: "", price: "2.29" },
        { category: "Biscuits", item: "Bacon Biscuit", desc: "", price: "2.29" },
        { category: "Biscuits", item: "Chicken Biscuit", desc: "", price: "3.29" },
        { category: "Biscuits", item: "Tenderloin Biscuit", desc: "", price: "3.29" },
        { category: "Biscuits", item: "Link Biscuit", desc: "", price: "1.99" },
        { category: "Biscuits", item: "Add Egg", desc: "Add to any biscuit", price: "+0.75" },
        { category: "Biscuits", item: "Add Cheese", desc: "Add to any biscuit", price: "+0.50" },
        { category: "Salads", item: "Veggie Salad", desc: "", price: "5.49" },
        { category: "Salads", item: "Chicken Salad", desc: "Grilled, fried, or taco style", price: "7.49" },
        { category: "Sandwiches & Wraps", item: "BBQ Sandwich", desc: "", priceSM: "4.49", priceLG: "6.49" },
        { category: "Sandwiches & Wraps", item: "Street Sandwich", desc: "Beef & Doritos", priceSM: "5.49", priceLG: "7.49" },
        { category: "Sandwiches & Wraps", item: "Buffalo Chicken", desc: "Grilled or fried", priceSM: "5.49", priceLG: "7.49" },
        { category: "Sandwiches & Wraps", item: "Grilled or Fried Chicken", desc: "", priceSM: "5.49", priceLG: "7.49" },
        { category: "Sandwiches & Wraps", item: "Hamburger", desc: "", priceSM: "4.49", priceLG: "6.49" },
        { category: "Sandwiches & Wraps", item: "Cheeseburger", desc: "", priceSM: "4.99", priceLG: "6.99" },
        { category: "Sandwiches & Wraps", item: "Chicken Wrap", desc: "", priceSM: "5.49", priceLG: "7.49" },
        { category: "Sandwiches & Wraps", item: "BLT Wrap", desc: "", priceSM: "5.49", priceLG: "7.49" },
        { category: "Sandwiches & Wraps", item: "Add Bacon", desc: "Add to any sandwich", price: "+1.50" },
        { category: "Pizza", item: "Plain / Cheese", desc: "Regular or thin crust", price: "11.99" },
        { category: "Pizza", item: "BBQ Pizza", desc: "", price: "11.99" },
        { category: "Pizza", item: "Bacon Ranch Pizza", desc: "", price: "11.99" },
        { category: "Pizza", item: "Chicken Bacon Ranch", desc: "Specialty", price: "11.99" },
        { category: "Pizza", item: "Cheese Bread", desc: "", price: "5.99" },
        { category: "Pizza", item: "Extra Cheese", desc: "Add to any pizza", price: "+1.50" },
        { category: "Pizza", item: "Extra Toppings", desc: "Per topping", price: "+1.00 ea" },
        { category: "Wings", item: "5 Piece Wings", desc: "Plain, breaded, buffalo, bbq, teriyaki, or lemon pepper", price: "5.99" },
        { category: "Wings", item: "10 Piece Wings", desc: "Plain, breaded, buffalo, bbq, teriyaki, or lemon pepper", price: "10.99" },
        { category: "Wings", item: "25 Piece Wings", desc: "Plain, breaded, buffalo, bbq, teriyaki, or lemon pepper", price: "24.99" },
        { category: "Wings", item: "Ranch Packs", desc: "", price: "0.75" },
        { category: "Chicken Bites & Tenders", item: "Chicken Bites", desc: "Plain or buffalo", priceSM: "5.99", priceLG: "8.99" },
        { category: "Chicken Bites & Tenders", item: "Tenders", desc: "Per piece", price: "2.49" },
        { category: "Chicken Bites & Tenders", item: "Tenders Party Pack", desc: "5 cups", price: "24.99" },
        { category: "Chicken Bites & Tenders", item: "Dipping Sauce", desc: "", price: "0.50" },
        { category: "Beverages", item: "Coffee", desc: "", price: "1.49" },
        { category: "Beverages", item: "Large Fountain Drink", desc: "", price: "1.69" },
        { category: "Beverages", item: "Cup of Ice", desc: "", price: "0.99" },
    ];

    // ================================================================
    // CART MANAGER
    // ================================================================
    class CartManager {
        constructor() {
            this.items = [];
            this.nextId = 1;
        }

        add(item) {
            // Each cart item: { id, name, category, price, qty, size, toppings, notes }
            this.items.push({
                id: this.nextId++,
                name: item.name,
                category: item.category || '',
                price: item.price,
                qty: 1,
                size: item.size || '',
                toppings: item.toppings || [],
                notes: item.notes || ''
            });
            this.save();
        }

        remove(id) {
            this.items = this.items.filter(i => i.id !== id);
            this.save();
        }

        updateQty(id, delta) {
            const item = this.items.find(i => i.id === id);
            if (!item) return;
            item.qty = Math.max(1, item.qty + delta);
            this.save();
        }

        clear() {
            this.items = [];
            this.nextId = 1;
            this.save();
        }

        get count() {
            return this.items.reduce((sum, i) => sum + i.qty, 0);
        }

        get subtotal() {
            return this.items.reduce((sum, i) => sum + (i.price * i.qty), 0);
        }

        get tax() {
            return this.subtotal * TAX_RATE;
        }

        get total() {
            return this.subtotal + this.tax;
        }

        save() {
            try {
                sessionStorage.setItem('bsdeli_cart', JSON.stringify(this.items));
                sessionStorage.setItem('bsdeli_cart_nextId', this.nextId.toString());
            } catch (e) { /* ignore */ }
        }

        load() {
            try {
                const data = sessionStorage.getItem('bsdeli_cart');
                const nextId = sessionStorage.getItem('bsdeli_cart_nextId');
                if (data) this.items = JSON.parse(data);
                if (nextId) this.nextId = parseInt(nextId, 10);
            } catch (e) { /* ignore */ }
        }
    }

    const cart = new CartManager();
    cart.load();

    // ================================================================
    // UTILITY FUNCTIONS
    // ================================================================
    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function parsePrice(priceStr) {
        if (!priceStr) return 0;
        const cleaned = priceStr.toString().replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
    }

    function formatMoney(num) {
        return '$' + num.toFixed(2);
    }

    function isAddOn(priceStr) {
        if (!priceStr) return false;
        const p = priceStr.toString().trim();
        return p.startsWith('+') || p.toLowerCase().includes('ea');
    }

    function isPizzaCategory(category) {
        return PIZZA_CATEGORIES.some(pc => category.toLowerCase().includes(pc));
    }

    // ================================================================
    // CSV PARSER (same as index.html)
    // ================================================================
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
        const items = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 2) continue;
            const row = {};
            headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
            const item = {
                category: row['category'] || 'Uncategorized',
                item: row['item'] || row['name'] || '',
                desc: row['description'] || row['desc'] || '',
                price: row['price'] || '',
                priceSM: row['price_sm'] || '',
                priceLG: row['price_lg'] || ''
            };
            if (item.item) items.push(item);
        }
        return items;
    }

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    current += '"'; i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                result.push(current); current = '';
            } else {
                current += c;
            }
        }
        result.push(current);
        return result;
    }

    // ================================================================
    // MENU RENDERING
    // ================================================================
    let allMenuItems = [];

    function renderMenu(items) {
        allMenuItems = items;
        const menuPanel = document.getElementById('menuPanel');
        const tabsContainer = document.getElementById('orderCategoryTabs');

        // Get unique categories
        const categories = [];
        items.forEach(item => {
            if (!categories.includes(item.category)) categories.push(item.category);
        });

        // Build tabs
        tabsContainer.innerHTML = '<button class="order-cat-tab active" data-category="all">All Items</button>';
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'order-cat-tab';
            btn.dataset.category = cat;
            btn.textContent = cat;
            tabsContainer.appendChild(btn);
        });

        function buildMenuHTML(filter) {
            let html = '';
            const filteredCats = filter === 'all' ? categories : categories.filter(c => c === filter);

            filteredCats.forEach(cat => {
                const catItems = items.filter(i => i.category === cat);
                html += '<div class="order-menu-category">';
                html += '<h3 class="order-menu-cat-title">' + escapeHTML(cat) + '</h3>';
                html += '<div class="order-menu-grid">';

                catItems.forEach((item, idx) => {
                    const hasSize = item.priceSM && item.priceLG;
                    const singlePrice = parsePrice(item.price);
                    const isAddon = isAddOn(item.price);
                    const itemId = cat + '_' + idx;

                    html += '<div class="order-menu-item" data-item-id="' + itemId + '">';
                    html += '<div class="order-menu-item-info">';
                    html += '<div class="order-menu-item-name">' + escapeHTML(item.item) + '</div>';
                    if (item.desc) {
                        html += '<div class="order-menu-item-desc">' + escapeHTML(item.desc) + '</div>';
                    }
                    html += '</div>';
                    html += '<div class="order-menu-item-right">';

                    if (hasSize) {
                        html += '<div class="order-menu-item-price"><div class="size-prices">';
                        html += '<div class="size-price"><span class="size-label">SM</span> $' + parsePrice(item.priceSM).toFixed(2) + '</div>';
                        html += '<div class="size-price"><span class="size-label">LG</span> $' + parsePrice(item.priceLG).toFixed(2) + '</div>';
                        html += '</div></div>';
                        html += '<div class="size-select-btns">';
                        html += '<button class="size-btn" data-cat="' + escapeHTML(cat) + '" data-name="' + escapeHTML(item.item) + '" data-price="' + parsePrice(item.priceSM) + '" data-size="SM">+ SM</button>';
                        html += '<button class="size-btn" data-cat="' + escapeHTML(cat) + '" data-name="' + escapeHTML(item.item) + '" data-price="' + parsePrice(item.priceLG) + '" data-size="LG">+ LG</button>';
                        html += '</div>';
                    } else {
                        html += '<div class="order-menu-item-price">' + escapeHTML(item.price ? (item.price.startsWith('+') || item.price.startsWith('$') ? item.price : '$' + item.price) : '') + '</div>';
                        if (!isAddon && singlePrice > 0) {
                            html += '<button class="add-btn" data-cat="' + escapeHTML(cat) + '" data-name="' + escapeHTML(item.item) + '" data-price="' + singlePrice + '">+</button>';
                        } else if (isAddon && singlePrice > 0) {
                            html += '<button class="add-btn" data-cat="' + escapeHTML(cat) + '" data-name="' + escapeHTML(item.item) + '" data-price="' + singlePrice + '" data-addon="true">+</button>';
                        }
                    }

                    html += '</div></div>';
                });

                html += '</div></div>';
            });

            if (filteredCats.length === 0) {
                html = '<div class="menu-loading"><p>No items found in this category.</p></div>';
            }

            return html;
        }

        menuPanel.innerHTML = buildMenuHTML('all');
        attachMenuListeners(menuPanel);

        // Tab click handling
        tabsContainer.addEventListener('click', function (e) {
            if (!e.target.classList.contains('order-cat-tab')) return;
            tabsContainer.querySelectorAll('.order-cat-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const filter = e.target.dataset.category;
            menuPanel.innerHTML = buildMenuHTML(filter);
            attachMenuListeners(menuPanel);
        });
    }

    function attachMenuListeners(panel) {
        // Add-to-cart buttons (single price items)
        panel.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const name = this.dataset.name;
                const price = parseFloat(this.dataset.price);
                const cat = this.dataset.cat;

                // If it's a pizza, show topping modal
                if (isPizzaCategory(cat) && !this.dataset.addon && price > 5) {
                    openToppingModal(name, cat, price);
                } else {
                    cart.add({ name, price, category: cat });
                    animateAddButton(this);
                    renderCartUI();
                }
            });
        });

        // Size select buttons (SM/LG items)
        panel.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const name = this.dataset.name;
                const price = parseFloat(this.dataset.price);
                const size = this.dataset.size;
                const cat = this.dataset.cat;
                cart.add({ name: name + ' (' + size + ')', price, category: cat, size });
                animateAddButton(this);
                renderCartUI();
            });
        });
    }

    function animateAddButton(btn) {
        btn.classList.add('added');
        const orig = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => {
            btn.classList.remove('added');
            btn.textContent = orig;
        }, 600);
    }

    // ================================================================
    // TOPPING MODAL
    // ================================================================
    function openToppingModal(itemName, category, basePrice) {
        const overlay = document.getElementById('toppingOverlay');
        const body = overlay.querySelector('.topping-modal-body');
        const title = overlay.querySelector('.topping-modal-header h3');

        title.textContent = 'Customize: ' + itemName;

        let html = '<p>Select your toppings (included with your pizza):</p>';
        html += '<div class="topping-list">';
        PIZZA_TOPPINGS.forEach((t, i) => {
            html += '<div class="topping-option">';
            html += '<input type="checkbox" id="top_' + i + '" value="' + t + '">';
            html += '<label for="top_' + i + '">' + t + '</label>';
            html += '</div>';
        });
        html += '</div>';
        body.innerHTML = html;

        // Toggle selected class on click
        body.querySelectorAll('.topping-option').forEach(opt => {
            opt.addEventListener('click', function (e) {
                if (e.target.tagName !== 'INPUT') {
                    const cb = this.querySelector('input');
                    cb.checked = !cb.checked;
                }
                this.classList.toggle('selected', this.querySelector('input').checked);
            });
        });

        // Add button
        const addBtn = overlay.querySelector('.topping-add-btn');
        const cancelBtn = overlay.querySelector('.topping-cancel-btn');
        const closeBtn = overlay.querySelector('.topping-modal-close');

        function close() { overlay.classList.remove('active'); }

        const newAddBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);
        newAddBtn.addEventListener('click', function () {
            const selected = [];
            body.querySelectorAll('input:checked').forEach(cb => selected.push(cb.value));
            cart.add({
                name: itemName,
                price: basePrice,
                category: category,
                toppings: selected
            });
            renderCartUI();
            close();
        });

        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.addEventListener('click', close);

        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', close);

        overlay.classList.add('active');
    }

    // ================================================================
    // CART UI RENDERING
    // ================================================================
    function renderCartUI() {
        renderDesktopCart();
        updateCartFAB();
        updateMobileCart();
    }

    function renderDesktopCart() {
        const body = document.getElementById('cartBody');
        const footer = document.getElementById('cartFooter');
        const countEl = document.getElementById('cartCount');

        countEl.textContent = cart.count;

        if (cart.items.length === 0) {
            body.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div>Your cart is empty.<br>Add items from the menu to get started!</div>';
            footer.style.display = 'none';
            return;
        }

        footer.style.display = 'block';
        let html = '';
        cart.items.forEach(item => {
            html += '<div class="cart-item">';
            html += '<div class="cart-item-info">';
            html += '<div class="cart-item-name">' + escapeHTML(item.name) + '</div>';
            if (item.toppings && item.toppings.length > 0) {
                html += '<div class="cart-item-detail">🧀 ' + item.toppings.join(', ') + '</div>';
            }
            if (item.notes) {
                html += '<div class="cart-item-detail">📝 ' + escapeHTML(item.notes) + '</div>';
            }
            html += '<div class="cart-item-controls">';
            html += '<button class="qty-btn" data-id="' + item.id + '" data-action="dec">−</button>';
            html += '<span class="cart-item-qty">' + item.qty + '</span>';
            html += '<button class="qty-btn" data-id="' + item.id + '" data-action="inc">+</button>';
            html += '</div></div>';
            html += '<div><div class="cart-item-price">' + formatMoney(item.price * item.qty) + '</div>';
            html += '<button class="cart-item-remove" data-id="' + item.id + '" title="Remove">✕</button>';
            html += '</div></div>';
        });
        body.innerHTML = html;

        // Attach cart item event listeners
        body.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                const delta = this.dataset.action === 'inc' ? 1 : -1;
                cart.updateQty(id, delta);
                renderCartUI();
            });
        });
        body.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', function () {
                cart.remove(parseInt(this.dataset.id));
                renderCartUI();
            });
        });

        // Totals
        document.getElementById('cartSubtotal').textContent = formatMoney(cart.subtotal);
        document.getElementById('cartTax').textContent = formatMoney(cart.tax);
        document.getElementById('cartTotal').textContent = formatMoney(cart.total);
    }

    function updateCartFAB() {
        const fab = document.getElementById('cartFab');
        const badge = fab.querySelector('.cart-fab-badge');
        if (cart.count > 0) {
            badge.textContent = cart.count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function updateMobileCart() {
        const body = document.getElementById('mobileCartBody');
        const footer = document.getElementById('mobileCartFooter');
        if (!body) return;

        if (cart.items.length === 0) {
            body.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div>Your cart is empty.</div>';
            footer.style.display = 'none';
            return;
        }

        footer.style.display = 'block';
        // Reuse the same cart body HTML
        body.innerHTML = document.getElementById('cartBody').innerHTML;

        // Re-attach listeners for the mobile cart
        body.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                const delta = this.dataset.action === 'inc' ? 1 : -1;
                cart.updateQty(id, delta);
                renderCartUI();
            });
        });
        body.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', function () {
                cart.remove(parseInt(this.dataset.id));
                renderCartUI();
            });
        });

        // Update mobile totals
        const mSubtotal = document.getElementById('mobileCartSubtotal');
        const mTax = document.getElementById('mobileCartTax');
        const mTotal = document.getElementById('mobileCartTotal');
        if (mSubtotal) mSubtotal.textContent = formatMoney(cart.subtotal);
        if (mTax) mTax.textContent = formatMoney(cart.tax);
        if (mTotal) mTotal.textContent = formatMoney(cart.total);
    }

    // ================================================================
    // MOBILE CART DRAWER
    // ================================================================
    function initMobileCart() {
        const fab = document.getElementById('cartFab');
        const overlay = document.getElementById('mobileCartOverlay');
        const drawer = document.getElementById('mobileCartDrawer');

        fab.addEventListener('click', () => {
            overlay.classList.add('active');
            drawer.classList.add('active');
        });

        overlay.addEventListener('click', () => {
            overlay.classList.remove('active');
            drawer.classList.remove('active');
        });

        // Mobile checkout button
        document.getElementById('mobileCheckoutBtn').addEventListener('click', () => {
            overlay.classList.remove('active');
            drawer.classList.remove('active');
            openOrderForm();
        });

        // Mobile clear button
        document.getElementById('mobileClearBtn').addEventListener('click', () => {
            if (confirm('Clear all items from your cart?')) {
                cart.clear();
                renderCartUI();
            }
        });
    }

    // ================================================================
    // ORDER FORM
    // ================================================================
    function openOrderForm() {
        if (cart.items.length === 0) {
            alert('Your cart is empty! Add some items first.');
            return;
        }

        const overlay = document.getElementById('orderOverlay');
        const summaryEl = overlay.querySelector('.order-summary-mini');

        // Build order summary
        let summaryHtml = '<h4>Your Order</h4>';
        cart.items.forEach(item => {
            let label = item.name;
            if (item.toppings && item.toppings.length > 0) label += ' (+' + item.toppings.length + ' toppings)';
            summaryHtml += '<div class="summary-item"><span>' + item.qty + 'x ' + escapeHTML(label) + '</span><span>' + formatMoney(item.price * item.qty) + '</span></div>';
        });
        summaryHtml += '<div class="summary-item"><span>Tax (' + (TAX_RATE * 100).toFixed(0) + '%)</span><span>' + formatMoney(cart.tax) + '</span></div>';
        summaryHtml += '<div class="summary-item summary-total"><span>Total</span><span>' + formatMoney(cart.total) + '</span></div>';
        summaryEl.innerHTML = summaryHtml;

        // Generate pickup time options
        const pickupSelect = document.getElementById('pickupTime');
        pickupSelect.innerHTML = generatePickupTimeOptions();

        overlay.classList.add('active');
    }

    function generatePickupTimeOptions() {
        const now = new Date();
        const day = now.getDay();
        const hours = STORE_HOURS[day];
        let html = '<option value="">Select a time...</option>';

        if (!hours) return html + '<option disabled>Store is closed today</option>';

        // Start from the next 15-min increment, at least 20 min from now
        const earliest = new Date(now.getTime() + 20 * 60000);
        let startMinutes = earliest.getHours() * 60 + earliest.getMinutes();
        startMinutes = Math.ceil(startMinutes / 15) * 15; // round up to next 15-min

        const openMin = hours.open * 60;
        const closeMin = hours.close * 60 - 15; // last order 15 min before close

        if (startMinutes < openMin) startMinutes = openMin;

        for (let m = startMinutes; m <= closeMin; m += 15) {
            const h = Math.floor(m / 60);
            const min = m % 60;
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            const label = h12 + ':' + (min < 10 ? '0' : '') + min + ' ' + ampm;
            html += '<option value="' + label + '">' + label + '</option>';
        }

        if (startMinutes > closeMin) {
            html += '<option disabled>Too late for orders today</option>';
        }

        return html;
    }

    function initOrderForm() {
        const overlay = document.getElementById('orderOverlay');
        const closeBtn = overlay.querySelector('.order-form-close');
        const submitBtn = document.getElementById('submitOrderBtn');

        closeBtn.addEventListener('click', () => overlay.classList.remove('active'));

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });

        submitBtn.addEventListener('click', submitOrder);
    }

    async function submitOrder() {
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const pickupTime = document.getElementById('pickupTime').value;
        const notes = document.getElementById('orderNotes').value.trim();

        // Validation
        let valid = true;
        if (!name) {
            showFieldError('customerName', 'nameError');
            valid = false;
        } else {
            hideFieldError('customerName', 'nameError');
        }
        if (!phone || phone.length < 7) {
            showFieldError('customerPhone', 'phoneError');
            valid = false;
        } else {
            hideFieldError('customerPhone', 'phoneError');
        }
        if (!pickupTime) {
            showFieldError('pickupTime', 'timeError');
            valid = false;
        } else {
            hideFieldError('pickupTime', 'timeError');
        }

        if (!valid) return;

        const submitBtn = document.getElementById('submitOrderBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Placing Order...';

        const orderData = {
            customerName: name,
            phone: phone,
            pickupTime: pickupTime,
            notes: notes,
            items: cart.items.map(i => ({
                name: i.name,
                qty: i.qty,
                price: i.price,
                toppings: i.toppings || [],
                notes: i.notes || ''
            })),
            subtotal: cart.subtotal,
            tax: cart.tax,
            total: cart.total,
            timestamp: new Date().toISOString()
        };

        try {
            if (!ORDER_ENDPOINT) {
                // Demo mode — simulate a successful order
                await new Promise(resolve => setTimeout(resolve, 1500));
                showConfirmation('DEMO-' + Date.now().toString().slice(-4));
                return;
            }

            // Generate order number client-side (server also generates one)
            // We use client-side because Google Apps Script returns an opaque
            // response when using no-cors mode (required to avoid CORS errors)
            var now = new Date();
            var mm = ('0' + (now.getMonth() + 1)).slice(-2);
            var dd = ('0' + now.getDate()).slice(-2);
            var seq = ('0000' + Date.now().toString().slice(-4)).slice(-4);
            var orderNum = 'BD-' + mm + dd + '-' + seq;

            // Send order — must use no-cors because Google Apps Script
            // redirects POST requests, which triggers CORS blocks in browsers
            await fetch(ORDER_ENDPOINT, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(orderData),
                redirect: 'follow'
            });

            // With no-cors the response is opaque (can't read it),
            // but the order was submitted successfully
            showConfirmation(orderNum);

        } catch (error) {
            console.error('Order submission error:', error);
            alert('There was a problem submitting your order. Please try again or call us at (256) 449-6221.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Place Order — Pay at Pickup';
        }
    }

    function showFieldError(inputId, errorId) {
        document.getElementById(inputId).classList.add('error');
        document.getElementById(errorId).classList.add('visible');
    }
    function hideFieldError(inputId, errorId) {
        document.getElementById(inputId).classList.remove('error');
        document.getElementById(errorId).classList.remove('visible');
    }

    // ================================================================
    // ORDER CONFIRMATION
    // ================================================================
    function showConfirmation(orderNumber) {
        const overlay = document.getElementById('orderOverlay');
        const card = overlay.querySelector('.order-form-card');

        card.innerHTML = '<div class="confirmation-card">'
            + '<div class="check-icon">✓</div>'
            + '<h3>Order Placed!</h3>'
            + '<div class="order-number">#' + orderNumber + '</div>'
            + '<p>Your order has been sent to B\'s Deli.<br>'
            + 'It\'s being prepared now!</p>'
            + '<p style="margin-top:0.75rem;font-weight:600;">Pickup Time: ' + escapeHTML(document.getElementById('pickupTime').value || 'ASAP') + '</p>'
            + '<p style="margin-top:0.5rem;color:var(--text-light);font-size:0.8rem;">Pay at the counter with cash or card.</p>'
            + '<button class="new-order-btn" onclick="location.reload()">Start New Order</button>'
            + '</div>';

        cart.clear();
        renderCartUI();
    }

    // ================================================================
    // CLEAR CART
    // ================================================================
    function initClearButton() {
        document.getElementById('cartClearBtn').addEventListener('click', () => {
            if (confirm('Clear all items from your cart?')) {
                cart.clear();
                renderCartUI();
            }
        });
    }

    // ================================================================
    // CHECKOUT BUTTON
    // ================================================================
    function initCheckoutButton() {
        document.getElementById('checkoutBtn').addEventListener('click', openOrderForm);
    }

    // ================================================================
    // LOAD MENU DATA
    // ================================================================
    async function loadMenu() {
        const menuPanel = document.getElementById('menuPanel');
        menuPanel.innerHTML = '<div class="menu-loading"><div class="loading-spinner"></div><p>Loading menu...</p></div>';

        try {
            const response = await fetch(SHEET_CSV_URL);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const csvText = await response.text();
            const items = parseCSV(csvText);
            if (items.length > 0) {
                renderMenu(items);
            } else {
                renderMenu(FALLBACK_MENU);
            }
        } catch (error) {
            console.warn('Could not load from Google Sheets, using fallback:', error);
            renderMenu(FALLBACK_MENU);
        }
    }

    // ================================================================
    // INITIALIZE
    // ================================================================
    document.addEventListener('DOMContentLoaded', function () {
        loadMenu();
        renderCartUI();
        initMobileCart();
        initOrderForm();
        initClearButton();
        initCheckoutButton();
    });

})();
