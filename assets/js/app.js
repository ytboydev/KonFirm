// ============================================================================
// Main Application Script - /assets/js/app.js
// ============================================================================

/**
 * API Module
 * Handles all communication with the Google Apps Script backend.
 */
const API = {
    baseUrl: '', // This will be set from index.html

    /**
     * Performs a GET request to the backend API.
     * @param {string} endpoint - The API endpoint to call (e.g., 'orders', 'stats').
     * @param {Object} params - An object of query parameters.
     * @returns {Promise<Object>} - The JSON response from the API.
     */
    async get(endpoint, params = {}) {
        const url = new URL(this.baseUrl);
        url.searchParams.append('endpoint', endpoint);
        for (const key in params) {
            url.searchParams.append(key, params[key]);
        }

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API GET error for endpoint ${endpoint}:`, error);
            throw error;
        }
    },

    /**
     * Performs a POST request to the backend API.
     * @param {FormData} formData - The form data to send.
     * @returns {Promise<Object>} - The JSON response from the API.
     */
    async post(formData) {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API POST error:', error);
            throw error;
        }
    }
};

/**
 * Store Module
 * Manages the application's state.
 */
const Store = {
    user: null,
    columns: [],
    orders: [],
    stats: {},

    /**
     * Initializes the store by loading user data from localStorage.
     */
    init() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            this.user = JSON.parse(userData);
        }
    }
};

/**
 * UI Module
 * Handles DOM manipulation and user interface updates.
 */
const UI = {
    /**
     * Shows a specific content section and hides others.
     * @param {string} sectionId - The ID of the section to show.
     */
    showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId)?.classList.add('active');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });
    },

    /**
     * Renders the dashboard statistics.
     */
    renderDashboard() {
        const { stats } = Store;
        document.getElementById('totalOrders').textContent = stats.totalOrders ?? '-';
        document.getElementById('todayOrders').textContent = stats.todayOrders ?? '-';
        document.getElementById('pendingOrders').textContent = stats.pendingOrders ?? '-';
        document.getElementById('confirmedOrders').textContent = stats.confirmedOrders ?? '-';
    },

    /**
     * Renders the orders table using DataTables.
     */
    renderOrdersTable() {
        const { columns, orders } = Store;

        const table = $('#ordersTable').DataTable({
            data: orders,
            columns: columns.map(col => ({
                title: col.arabicName || col.englishName,
                data: col.arabicName || col.englishName
            })),
            responsive: true,
            language: {
                "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Arabic.json"
            }
        });
    },

    /**
     * Shows or hides the main loading overlay.
     * @param {boolean} loading - Whether to show the loader.
     */
    setLoading(loading) {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = loading ? 'flex' : 'none';
        }
    }
};

/**
 * App Module
 * The main application controller.
 */
const App = {
    /**
     * Initializes the application.
     */
    async init() {
        UI.setLoading(true);
        Store.init();

        // Set the API base URL from the global constant defined in index.html
        if (typeof API_BASE_URL !== 'undefined') {
            API.baseUrl = API_BASE_URL;
        } else {
            console.error('API_BASE_URL is not defined.');
            alert('خطأ في التكوين: عنوان API غير محدد.');
            UI.setLoading(false);
            return;
        }

        this.addEventListeners();

        try {
            // Fetch initial data
            const [stats, ordersData, columns] = await Promise.all([
                API.get('stats'),
                API.get('orders'),
                API.get('columns')
            ]);

            Store.stats = stats;
            Store.orders = ordersData.orders;
            Store.columns = columns;

            // Render the UI
            UI.renderDashboard();
            UI.renderOrdersTable();

        } catch (error) {
            console.error('Failed to initialize app:', error);
            alert('فشل تحميل بيانات التطبيق. يرجى المحاولة مرة أخرى.');
        } finally {
            UI.setLoading(false);
            UI.showSection('dashboard');
        }
    },

    /**
     * Adds event listeners for navigation and actions.
     */
    addEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = e.target.closest('a').getAttribute('href').substring(1);
                UI.showSection(sectionId);
            });
        });

        // Logout
        document.querySelector('a[data-action="logout"]').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Refresh data
        document.querySelectorAll('button[data-action="refresh-data"]').forEach(button => {
            button.addEventListener('click', () => this.refreshData());
        });
    },

    /**
     * Handles user logout.
     */
    async logout() {
        try {
            const formData = new FormData();
            formData.append('action', 'logout');
            await API.post(formData);
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            // Clear session data and redirect
            document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            localStorage.removeItem('userData');
            window.location.href = 'login.html';
        }
    },

    /**
     * Refreshes the application data from the backend.
     */
    async refreshData() {
        UI.setLoading(true);
        try {
            const [stats, ordersData] = await Promise.all([
                API.get('stats', { refresh: true }),
                API.get('orders', { refresh: true })
            ]);

            Store.stats = stats;
            Store.orders = ordersData.orders;

            // Re-render UI components
            UI.renderDashboard();

            // Destroy and re-initialize DataTable
            if ($.fn.DataTable.isDataTable('#ordersTable')) {
                $('#ordersTable').DataTable().destroy();
            }
            $('#ordersTable').empty(); // Clear headers and body
            UI.renderOrdersTable();

            alert('تم تحديث البيانات بنجاح');

        } catch (error) {
            console.error('Failed to refresh data:', error);
            alert('فشل في تحديث البيانات.');
        } finally {
            UI.setLoading(false);
        }
    }
};

// The initialization is called from index.html after DOMContentLoaded
// Example:
// document.addEventListener('DOMContentLoaded', function() {
//     if (checkAuthStatus()) {
//         App.init();
//     }
// });
