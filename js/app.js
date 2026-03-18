// Main Application
class InventoryApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentUser = null;
        this.initialized = false;
        this.editingItemId = null;
        this.editingLocationId = null;
        this.editingCategoryId = null;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 100);
        }
    }

    async init() {
        if (this.initialized) return;
        
        console.log('Initializing app...');
        
        try {
            if (!window.api) {
                console.error('API not available');
                this.showErrorScreen('API not initialized. Please refresh the page.');
                return;
            }

            this.appContainer = document.querySelector('.app-container');
            this.authScreen = document.getElementById('auth-screen');
            this.sidebar = document.getElementById('sidebar');
            this.mainContent = document.getElementById('main-content');
            
            if (!this.appContainer || !this.authScreen) {
                console.error('Required DOM elements not found');
                return;
            }
            
            const user = await window.api.getCurrentUser();
            
            if (user) {
                this.currentUser = user;
                await this.showMainApp();
            } else {
                this.showAuthScreen();
            }

            this.setupEventListeners();
            this.initialized = true;
            console.log('App initialization complete');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showErrorScreen(error.message);
        }
    }

    showErrorScreen(message) {
        if (!this.authScreen) return;
        
        this.authScreen.innerHTML = `
            <div class="auth-card">
                <div class="auth-header">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                    <h2>Connection Error</h2>
                    <p>${message}</p>
                    <p style="margin-top: 20px; font-size: 14px;">Please check your internet connection and try again.</p>
                    <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top: 20px;">
                        <i class="fas fa-sync-alt"></i> Reload Page
                    </button>
                </div>
            </div>
        `;
        this.authScreen.style.display = 'flex';
        if (this.sidebar) this.sidebar.style.display = 'none';
    }

    showAuthScreen() {
        this.appContainer.classList.remove('authenticated');
        this.authScreen.style.display = 'flex';
        if (this.sidebar) this.sidebar.style.display = 'none';
        
        const mainContent = document.getElementById('main-content');
        if (mainContent && !mainContent.contains(this.authScreen)) {
            mainContent.innerHTML = '';
            mainContent.appendChild(this.authScreen);
        }
    }

    async showMainApp() {
        this.appContainer.classList.add('authenticated');
        this.authScreen.style.display = 'none';
        this.sidebar.style.display = 'flex';
        
        const userNameEl = document.getElementById('user-name');
        const userRoleEl = document.getElementById('user-role');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (userNameEl) userNameEl.textContent = this.currentUser?.name || 'User';
        if (userRoleEl) userRoleEl.textContent = this.currentUser?.role || 'Employee';
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        await this.loadPage('dashboard');
    }

    setupEventListeners() {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.getAttribute('href').substring(1);
                this.navigateTo(page);
            });
        });

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                const result = await window.api.logout();
                if (result && result.success) {
                    this.currentUser = null;
                    this.showAuthScreen();
                }
            });
        }

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(e);
            });
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister(e);
            });
        }
    }

    async handleLogin(e) {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        submitBtn.disabled = true;
        
        try {
            const result = await window.api.login(email, password);
            
            if (result && result.success) {
                this.currentUser = result.user;
                await this.showMainApp();
            } else {
                alert('Login failed: ' + (result?.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Login error: ' + error.message);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleRegister(e) {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
        submitBtn.disabled = true;
        
        try {
            const result = await window.api.register(name, email, password);
            
            if (result && result.success) {
                alert('Registration successful! Please login.');
                switchAuthTab('login');
                
                document.getElementById('register-name').value = '';
                document.getElementById('register-email').value = '';
                document.getElementById('register-password').value = '';
            } else {
                alert('Registration failed: ' + (result?.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Registration error: ' + error.message);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async navigateTo(page) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${page}`) {
                item.classList.add('active');
            }
        });

        this.currentPage = page;
        await this.loadPage(page);
    }

    async loadPage(page) {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        mainContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        try {
            let content = '';
            switch(page) {
                case 'dashboard':
                    content = await this.renderDashboard();
                    break;
                case 'items':
                    content = await this.renderItems();
                    break;
                case 'locations':
                    content = await this.renderLocations();
                    break;
                case 'categories':
                    content = await this.renderCategories();
                    break;
                case 'movements':
                    content = await this.renderMovements();
                    break;
                case 'reports':
                    content = await this.renderReports();
                    break;
                default:
                    content = await this.renderDashboard();
            }
            mainContent.innerHTML = content;
        } catch (error) {
            console.error('Error loading page:', error);
            mainContent.innerHTML = '<div class="error">Error loading page. Please try again.</div>';
        }
    }

    async renderDashboard() {
        const stats = await window.api.getDashboardStats();
        
        return `
            <div class="page-header">
                <h1>Dashboard</h1>
                <p>Welcome back, ${this.currentUser?.name || 'User'}! Here's what's happening with your inventory.</p>
            </div>

            <div class="dashboard-grid">
                <div class="stat-card" onclick="app.navigateTo('items')">
                    <div class="stat-info">
                        <h3>Total Items</h3>
                        <span class="stat-number">${stats.totalItems}</span>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-box"></i>
                    </div>
                </div>

                <div class="stat-card" onclick="app.navigateTo('categories')">
                    <div class="stat-info">
                        <h3>Categories</h3>
                        <span class="stat-number">${stats.totalCategories}</span>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-tags"></i>
                    </div>
                </div>

                <div class="stat-card" onclick="app.navigateTo('locations')">
                    <div class="stat-info">
                        <h3>Locations</h3>
                        <span class="stat-number">${stats.totalLocations}</span>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Total Value</h3>
                        <span class="stat-number">$${stats.totalValue.toFixed(2)}</span>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                </div>

                <div class="stat-card" onclick="app.generateReport('lowstock')">
                    <div class="stat-info">
                        <h3>Low Stock Items</h3>
                        <span class="stat-number">${stats.lowStock}</span>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                </div>
            </div>

            <div class="recent-activity">
                <h2>Recent Movements</h2>
                <div class="table-container">
                    ${window.InventoryComponents?.createDataTable(
                        stats.recentMovements,
                        [
                            { label: 'Item', field: 'item' },
                            { label: 'From', field: 'from' },
                            { label: 'To', field: 'to' },
                            { label: 'Quantity', field: 'quantity' },
                            { label: 'Date', field: 'date' }
                        ],
                        false
                    ) || '<p>No recent movements</p>'}
                </div>
            </div>
        `;
    }

    async renderItems() {
        const items = await window.api.getItems();
        const locations = await window.api.getLocations();
        const categories = await window.api.getCategories();
        
        return `
            <div class="page-header">
                <h1>Items</h1>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="app.showAddItemModal()">
                        <i class="fas fa-plus"></i> Add Item
                    </button>
                </div>
            </div>

            <div class="search-bar">
                <input type="text" class="search-input" placeholder="Search items..." id="item-search" onkeyup="app.searchItems(this.value)">
                <button class="btn btn-secondary" onclick="app.filterItems()">
                    <i class="fas fa-filter"></i> Filter
                </button>
            </div>

            <div class="table-container" id="items-table-container">
                ${window.InventoryComponents?.createDataTable(
                    items,
                    [
                        { label: 'Name', field: 'name' },
                        { label: 'Category', field: 'category' },
                        { label: 'Location', field: 'location' },
                        { label: 'Quantity', field: 'quantity' },
                        { label: 'Condition', field: 'condition' },
                        { label: 'Value', field: 'value' }
                    ],
                    true,
                    'item'
                ) || '<p>No items found</p>'}
            </div>

            ${this.createItemModal(locations, categories)}
        `;
    }

    createItemModal(locations, categories) {
        if (!window.InventoryComponents) return '';
        
        const content = `
            <form id="itemForm" onsubmit="event.preventDefault(); app.saveItem()">
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" class="form-control" id="itemName" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="itemDescription" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select class="form-control" id="itemCategory">
                        <option value="">Select Category</option>
                        ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <select class="form-control" id="itemLocation">
                        <option value="">Select Location</option>
                        ${locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" class="form-control" id="itemQuantity" value="1" min="0">
                </div>
                <div class="form-group">
                    <label>Condition</label>
                    <select class="form-control" id="itemCondition">
                        <option>New</option>
                        <option>Like New</option>
                        <option>Good</option>
                        <option>Fair</option>
                        <option>Poor</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Purchase Date</label>
                    <input type="date" class="form-control" id="itemPurchaseDate">
                </div>
                <div class="form-group">
                    <label>Value ($)</label>
                    <input type="number" step="0.01" class="form-control" id="itemValue">
                </div>
                <div class="form-group">
                    <label>Serial Number</label>
                    <input type="text" class="form-control" id="itemSerialNumber">
                </div>
                <div class="form-group">
                    <label>Barcode</label>
                    <input type="text" class="form-control" id="itemBarcode">
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea class="form-control" id="itemNotes" rows="3"></textarea>
                </div>
            </form>
        `;

        return window.InventoryComponents.createModal('itemModal', 'Add New Item', content);
    }

    async renderLocations() {
        const locations = await window.api.getLocations();
        
        return `
            <div class="page-header">
                <h1>Locations</h1>
                <button class="btn btn-primary" onclick="app.showAddLocationModal()">
                    <i class="fas fa-plus"></i> Add Location
                </button>
            </div>

            ${window.InventoryComponents?.createLocationTree(locations) || '<p>No locations found</p>'}
            ${this.createLocationModal(locations)}
        `;
    }

    createLocationModal(parentLocations) {
        if (!window.InventoryComponents) return '';
        
        const content = `
            <form id="locationForm" onsubmit="event.preventDefault(); app.saveLocation()">
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" class="form-control" id="locationName" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="locationDescription" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>Parent Location</label>
                    <select class="form-control" id="locationParent">
                        <option value="">No Parent (Root Location)</option>
                        ${parentLocations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('')}
                    </select>
                </div>
            </form>
        `;

        return window.InventoryComponents.createModal('locationModal', 'Add New Location', content);
    }

    async renderCategories() {
        const categories = await window.api.getCategories();
        
        return `
            <div class="page-header">
                <h1>Categories</h1>
                <button class="btn btn-primary" onclick="app.showAddCategoryModal()">
                    <i class="fas fa-plus"></i> Add Category
                </button>
            </div>

            <div class="table-container">
                ${window.InventoryComponents?.createDataTable(
                    categories,
                    [
                        { label: 'Name', field: 'name' },
                        { label: 'Description', field: 'description' }
                    ],
                    true,
                    'category'
                ) || '<p>No categories found</p>'}
            </div>

            ${this.createCategoryModal()}
        `;
    }

    createCategoryModal() {
        if (!window.InventoryComponents) return '';
        
        const content = `
            <form id="categoryForm" onsubmit="event.preventDefault(); app.saveCategory()">
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" class="form-control" id="categoryName" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="categoryDescription" rows="3"></textarea>
                </div>
            </form>
        `;

        return window.InventoryComponents.createModal('categoryModal', 'Add New Category', content);
    }

    async renderMovements() {
        const movements = await window.api.getMovements();
        const items = await window.api.getItems();
        const locations = await window.api.getLocations();
        
        return `
            <div class="page-header">
                <h1>Inventory Movements</h1>
                <button class="btn btn-primary" onclick="app.showAddMovementModal()">
                    <i class="fas fa-plus"></i> New Movement
                </button>
            </div>

            <div class="table-container">
                ${window.InventoryComponents?.createDataTable(
                    movements,
                    [
                        { label: 'Item', field: 'item' },
                        { label: 'From', field: 'from' },
                        { label: 'To', field: 'to' },
                        { label: 'Quantity', field: 'quantity' },
                        { label: 'Date', field: 'date' },
                        { label: 'Moved By', field: 'moved_by' }
                    ],
                    false
                ) || '<p>No movements found</p>'}
            </div>

            ${this.createMovementModal(items, locations)}
        `;
    }

    createMovementModal(items, locations) {
        if (!window.InventoryComponents) return '';
        
        const content = `
            <form id="movementForm" onsubmit="event.preventDefault(); app.saveMovement()">
                <div class="form-group">
                    <label>Item *</label>
                    <select class="form-control" id="movementItem" required>
                        <option value="">Select Item</option>
                        ${items.map(item => `<option value="${item.id}">${item.name} (Qty: ${item.quantity})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>From Location</label>
                    <select class="form-control" id="movementFrom">
                        <option value="">Select Location</option>
                        ${locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>To Location</label>
                    <select class="form-control" id="movementTo">
                        <option value="">Select Location</option>
                        ${locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Quantity *</label>
                    <input type="number" class="form-control" id="movementQuantity" min="1" required>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea class="form-control" id="movementNotes" rows="3"></textarea>
                </div>
            </form>
        `;

        return window.InventoryComponents.createModal('movementModal', 'New Movement', content);
    }

    async renderReports() {
        return `
            <div class="page-header">
                <h1>Reports</h1>
                <p>Generate and export inventory reports</p>
            </div>
            
            <div class="reports-grid">
                <div class="stat-card" onclick="app.generateReport('inventory')">
                    <div class="stat-info">
                        <h3>Inventory Report</h3>
                        <p>Complete inventory listing with values</p>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                </div>

                <div class="stat-card" onclick="app.generateReport('movements')">
                    <div class="stat-info">
                        <h3>Movement History</h3>
                        <p>All inventory movements with timestamps</p>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-history"></i>
                    </div>
                </div>

                <div class="stat-card" onclick="app.generateReport('lowstock')">
                    <div class="stat-info">
                        <h3>Low Stock Report</h3>
                        <p>Items with quantity below 5</p>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                </div>

                <div class="stat-card" onclick="app.generateReport('categories')">
                    <div class="stat-info">
                        <h3>Categories Report</h3>
                        <p>All categories and item counts</p>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-tags"></i>
                    </div>
                </div>

                <div class="stat-card" onclick="app.generateReport('locations')">
                    <div class="stat-info">
                        <h3>Locations Report</h3>
                        <p>All storage locations</p>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                </div>

                <div class="stat-card" onclick="app.generateReport('valuation')">
                    <div class="stat-info">
                        <h3>Valuation Report</h3>
                        <p>Total inventory value by category</p>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-chart-pie"></i>
                    </div>
                </div>
            </div>
        `;
    }

    // Modal Handlers
    showAddItemModal() {
        console.log('showAddItemModal called');
        this.editingItemId = null;
        // Limpar formulário
        document.getElementById('itemName').value = '';
        document.getElementById('itemDescription').value = '';
        document.getElementById('itemCategory').value = '';
        document.getElementById('itemLocation').value = '';
        document.getElementById('itemQuantity').value = '1';
        document.getElementById('itemCondition').value = 'New';
        document.getElementById('itemPurchaseDate').value = '';
        document.getElementById('itemValue').value = '';
        document.getElementById('itemSerialNumber').value = '';
        document.getElementById('itemBarcode').value = '';
        document.getElementById('itemNotes').value = '';
        if (typeof openModal === 'function') {
            openModal('itemModal');
        } else {
            console.error('openModal is not defined');
        }
    }

    showAddLocationModal() {
        console.log('showAddLocationModal called');
        this.editingLocationId = null;
        document.getElementById('locationName').value = '';
        document.getElementById('locationDescription').value = '';
        document.getElementById('locationParent').value = '';
        if (typeof openModal === 'function') {
            openModal('locationModal');
        } else {
            console.error('openModal is not defined');
        }
    }

    showAddCategoryModal() {
        console.log('showAddCategoryModal called');
        this.editingCategoryId = null;
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryDescription').value = '';
        if (typeof openModal === 'function') {
            openModal('categoryModal');
        } else {
            console.error('openModal is not defined');
        }
    }

    showAddMovementModal() {
        console.log('showAddMovementModal called');
        document.getElementById('movementItem').value = '';
        document.getElementById('movementFrom').value = '';
        document.getElementById('movementTo').value = '';
        document.getElementById('movementQuantity').value = '';
        document.getElementById('movementNotes').value = '';
        if (typeof openModal === 'function') {
            openModal('movementModal');
        } else {
            console.error('openModal is not defined');
        }
    }

    async editItem(id) {
        try {
            const items = await window.api.getItems();
            const item = items.find(i => i.id === id);
            if (!item) return;

            document.getElementById('itemName').value = item.name || '';
            document.getElementById('itemDescription').value = item.description || '';
            document.getElementById('itemCategory').value = item.category_id || '';
            document.getElementById('itemLocation').value = item.location_id || '';
            document.getElementById('itemQuantity').value = item.quantity || 1;
            document.getElementById('itemCondition').value = item.condition || 'New';
            document.getElementById('itemPurchaseDate').value = item.purchase_date || '';
            document.getElementById('itemValue').value = item.value || '';
            document.getElementById('itemSerialNumber').value = item.serial_number || '';
            document.getElementById('itemBarcode').value = item.barcode || '';
            document.getElementById('itemNotes').value = item.notes || '';

            this.editingItemId = id;
            openModal('itemModal');
        } catch (error) {
            console.error('Error editing item:', error);
            alert('Error loading item for editing');
        }
    }

    async editLocation(id) {
        try {
            const locations = await window.api.getLocations();
            const location = locations.find(l => l.id === id);
            if (!location) return;

            document.getElementById('locationName').value = location.name || '';
            document.getElementById('locationDescription').value = location.description || '';
            document.getElementById('locationParent').value = location.parent_location_id || '';

            this.editingLocationId = id;
            openModal('locationModal');
        } catch (error) {
            console.error('Error editing location:', error);
            alert('Error loading location for editing');
        }
    }

    async editCategory(id) {
        try {
            const categories = await window.api.getCategories();
            const category = categories.find(c => c.id === id);
            if (!category) return;

            document.getElementById('categoryName').value = category.name || '';
            document.getElementById('categoryDescription').value = category.description || '';

            this.editingCategoryId = id;
            openModal('categoryModal');
        } catch (error) {
            console.error('Error editing category:', error);
            alert('Error loading category for editing');
        }
    }

    async saveItem() {
        try {
            const itemData = {
                name: document.getElementById('itemName')?.value,
                description: document.getElementById('itemDescription')?.value,
                category_id: document.getElementById('itemCategory')?.value || null,
                location_id: document.getElementById('itemLocation')?.value || null,
                quantity: parseInt(document.getElementById('itemQuantity')?.value) || 1,
                condition: document.getElementById('itemCondition')?.value,
                purchase_date: document.getElementById('itemPurchaseDate')?.value || null,
                value: parseFloat(document.getElementById('itemValue')?.value) || null,
                serial_number: document.getElementById('itemSerialNumber')?.value || null,
                barcode: document.getElementById('itemBarcode')?.value || null,
                notes: document.getElementById('itemNotes')?.value || null
            };

            if (this.editingItemId) {
                await window.api.updateItem(this.editingItemId, itemData);
                this.editingItemId = null;
            } else {
                await window.api.addItem(itemData);
            }
            closeModal('itemModal');
            await this.loadPage('items');
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Error saving item: ' + error.message);
        }
    }

    async saveLocation() {
        try {
            const locationData = {
                name: document.getElementById('locationName')?.value,
                description: document.getElementById('locationDescription')?.value,
                parent_location_id: document.getElementById('locationParent')?.value || null
            };

            if (this.editingLocationId) {
                await window.api.updateLocation(this.editingLocationId, locationData);
                this.editingLocationId = null;
            } else {
                await window.api.addLocation(locationData);
            }
            closeModal('locationModal');
            await this.loadPage('locations');
        } catch (error) {
            console.error('Error saving location:', error);
            alert('Error saving location: ' + error.message);
        }
    }

    async saveCategory() {
        try {
            const categoryData = {
                name: document.getElementById('categoryName')?.value,
                description: document.getElementById('categoryDescription')?.value
            };

            if (this.editingCategoryId) {
                await window.api.updateCategory(this.editingCategoryId, categoryData);
                this.editingCategoryId = null;
            } else {
                await window.api.addCategory(categoryData);
            }
            closeModal('categoryModal');
            await this.loadPage('categories');
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Error saving category: ' + error.message);
        }
    }

    async saveMovement() {
        try {
            const movementData = {
                item_id: document.getElementById('movementItem')?.value,
                from_location: document.getElementById('movementFrom')?.value || null,
                to_location: document.getElementById('movementTo')?.value || null,
                quantity: parseInt(document.getElementById('movementQuantity')?.value),
                moved_by: this.currentUser?.id,
                moved_at: new Date().toISOString(),
                notes: document.getElementById('movementNotes')?.value || null
            };

            await window.api.addMovement(movementData);
            closeModal('movementModal');
            await this.loadPage('movements');
        } catch (error) {
            console.error('Error saving movement:', error);
            alert('Error saving movement: ' + error.message);
        }
    }

    async searchItems(query) {
        if (!query) {
            await this.loadPage('items');
            return;
        }
        
        const items = await window.api.getItems();
        const filtered = items.filter(item => 
            (item.name && item.name.toLowerCase().includes(query.toLowerCase())) ||
            (item.category && item.category.toLowerCase().includes(query.toLowerCase())) ||
            (item.location && item.location.toLowerCase().includes(query.toLowerCase()))
        );
        
        const tableContainer = document.getElementById('items-table-container');
        if (tableContainer && window.InventoryComponents) {
            tableContainer.innerHTML = window.InventoryComponents.createDataTable(
                filtered,
                [
                    { label: 'Name', field: 'name' },
                    { label: 'Category', field: 'category' },
                    { label: 'Location', field: 'location' },
                    { label: 'Quantity', field: 'quantity' },
                    { label: 'Condition', field: 'condition' },
                    { label: 'Value', field: 'value' }
                ],
                true,
                'item'
            );
        }
    }

    filterItems() {
        alert('Filter functionality coming soon!');
    }

    async generateReport(type) {
        try {
            let data = [];
            let filename = '';
            let headers = [];
            
            switch(type) {
                case 'inventory':
                    data = await window.api.getItems();
                    filename = 'inventory-report.csv';
                    headers = ['Name', 'Category', 'Location', 'Quantity', 'Condition', 'Value', 'Serial Number'];
                    break;
                    
                case 'movements':
                    data = await window.api.getMovements();
                    filename = 'movements-report.csv';
                    headers = ['Item', 'From', 'To', 'Quantity', 'Date', 'Moved By', 'Notes'];
                    break;
                    
                case 'lowstock':
                    const items = await window.api.getItems();
                    data = items.filter(item => (item.quantity || 0) < 5);
                    filename = 'low-stock-report.csv';
                    headers = ['Name', 'Category', 'Location', 'Quantity', 'Condition'];
                    break;
                    
                case 'categories':
                    data = await window.api.getCategories();
                    filename = 'categories-report.csv';
                    headers = ['Name', 'Description'];
                    break;
                    
                case 'locations':
                    data = await window.api.getLocations();
                    filename = 'locations-report.csv';
                    headers = ['Name', 'Description', 'Parent Location'];
                    break;
                    
                case 'valuation':
                    const allItems = await window.api.getItems();
                    const categories = await window.api.getCategories();
                    
                    data = categories.map(cat => {
                        const categoryItems = allItems.filter(item => item.category_id === cat.id);
                        const totalValue = categoryItems.reduce((sum, item) => sum + ((item.value || 0) * (item.quantity || 0)), 0);
                        return {
                            category: cat.name,
                            itemCount: categoryItems.length,
                            totalValue: totalValue.toFixed(2)
                        };
                    });
                    
                    filename = 'valuation-report.csv';
                    headers = ['Category', 'Item Count', 'Total Value'];
                    break;
            }

            if (!data || data.length === 0) {
                alert('No data to export');
                return;
            }

            this.downloadCSV(data, headers, filename);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report: ' + error.message);
        }
    }

    downloadCSV(data, headers, filename) {
        try {
            const csvRows = [];
            csvRows.push(headers.join(','));
            
            for (const row of data) {
                const values = headers.map(header => {
                    const key = header.toLowerCase().replace(' ', '_').replace('-', '_');
                    let value = row[key] || row[header.toLowerCase()] || '';
                    if (typeof value === 'object') {
                        value = JSON.stringify(value);
                    }
                    value = String(value).replace(/"/g, '""');
                    return `"${value}"`;
                });
                csvRows.push(values.join(','));
            }
            
            const csv = csvRows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading CSV:', error);
            alert('Error generating report file');
        }
    }
}

// Create global app instance only once
if (typeof window.app === 'undefined') {
    window.app = new InventoryApp();
    console.log('App initialized');
}

// Funções globais de edição e eliminação
async function editItem(id) {
    if (window.app) await window.app.editItem(id);
}

async function editLocation(id) {
    if (window.app) await window.app.editLocation(id);
}

async function editCategory(id) {
    if (window.app) await window.app.editCategory(id);
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            await window.api.deleteItem(id);
            if (window.app) {
                await window.app.loadPage('items');
            }
        } catch (error) {
            alert('Error deleting item: ' + error.message);
        }
    }
}

async function deleteLocation(id) {
    if (confirm('Are you sure you want to delete this location? This may affect items stored here.')) {
        try {
            await window.api.deleteLocation(id);
            if (window.app) {
                await window.app.loadPage('locations');
            }
        } catch (error) {
            alert('Error deleting location: ' + error.message);
        }
    }
}

async function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category?')) {
        try {
            await window.api.deleteCategory(id);
            if (window.app) {
                await window.app.loadPage('categories');
            }
        } catch (error) {
            alert('Error deleting category: ' + error.message);
        }
    }
}