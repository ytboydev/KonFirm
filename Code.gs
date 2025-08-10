/**
 * نظام إدارة طلبات التأكيد - JSON API Backend Only
 * Google Apps Script Backend for Order Management System - API Only
 */

// Global Constants
const SPREADSHEET_ID = '1oxvPjXuQzBG5rZ57FPFy-jVr7TmvqupTeg9LeWjhe6c';
const ORDERS_SHEET_NAME = 'Orders';
const USERS_SHEET_NAME = 'Users';
const COLUMNS_CONFIG_SHEET_NAME = 'ColumnsConfig';

/**
 * Main GET request handler - JSON API Only
 * @param {GoogleAppsScript.Events.DoGet} e - Request parameters
 * @return {GoogleAppsScript.Content.TextOutput} - JSON Response
 */
function doGet(e) {
  const action = e.parameter.action || 'api';
  
  // Enable CORS
  const response = ContentService.createTextOutput();
  response.setMimeType(ContentService.MimeType.JSON);
  
  try {
    // All requests go through API handler
    const result = handleApiRequest(e);
    return response.setContent(JSON.stringify(result));
  } catch (error) {
    Logger.log(`Error in doGet: ${error.message}`);
    return response.setContent(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

/**
 * Main POST request handler - JSON API Only
 * @param {GoogleAppsScript.Events.DoPost} e - Request parameters
 * @return {GoogleAppsScript.Content.TextOutput} - JSON Response
 */
function doPost(e) {
  const response = ContentService.createTextOutput();
  response.setMimeType(ContentService.MimeType.JSON);
  
  try {
    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'login':
        result = handleLogin(e);
        break;

      case 'logout':
        result = handleLogout(e);
        break;

      case 'update_order':
        result = handleUpdateOrder(e);
        break;

      case 'save_columns':
        result = handleSaveColumns(e);
        break;

      default:
        result = { error: 'Invalid action' };
    }

    return response.setContent(JSON.stringify(result));
  } catch (error) {
    Logger.log(`Error in doPost: ${error.message}`);
    return response.setContent(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

/**
 * Set CORS headers for cross-origin requests
 * @return {GoogleAppsScript.Content.TextOutput} - Response with CORS headers
 */
function setCorsHeaders(response) {
  return response
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * API request handler - Routes to appropriate controllers
 * @param {GoogleAppsScript.Events.DoGet} e - Request parameters
 * @return {Object} - Response data
 */
function handleApiRequest(e) {
  const endpoint = e.parameter.endpoint;
  const action = e.parameter.action || endpoint;
  const session = checkSession(e);

  // Public endpoints that don't require authentication
  const publicEndpoints = ['login', 'ping', 'health'];
  
  if (!publicEndpoints.includes(endpoint) && !session.authenticated) {
    return { error: 'غير مصرح لك بالوصول' };
  }

  try {
    let result;
    
    switch (endpoint) {
      case 'ping':
      case 'health':
        result = { status: 'ok', timestamp: new Date().toISOString() };
        break;

      case 'orders':
        result = handleOrderOperations(action || 'get', e.parameter, session);
        break;

      case 'stats':
        result = handleOrderOperations('stats', e.parameter, session);
        break;

      case 'columns':
        result = handleConfigOperations(action || 'get', e.parameter, session);
        break;

      case 'reorganize':
        result = handleConfigOperations('reorganize', e.parameter, session);
        break;

      default:
        result = { error: 'Invalid endpoint' };
    }

    return result;
  } catch (error) {
    Logger.log(`API Error: ${error.message}`);
    return { error: error.message };
  }
}

// ============================================================================
// ORDER CONTROLLER
// ============================================================================

function handleOrderOperations(action, params, session) {
  switch (action) {
    case 'get':
      return OrderModel.getOrders(params);
    case 'create':
      return OrderModel.createOrder(params, session.user);
    case 'update':
      return OrderModel.updateOrder(params, session.user);
    case 'delete':
      return OrderModel.deleteOrder(params.id, session.user);
    case 'stats':
      return OrderModel.getStats(session.user);
    default:
      throw new Error('Invalid order action');
  }
}

function handleUpdateOrder(e) {
  try {
    const session = checkSession(e);
    if (!session.authenticated) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'غير مصرح لك بالوصول' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const orderId = e.parameter.orderId;
    const fieldName = e.parameter.fieldName;
    const fieldValue = e.parameter.fieldValue;

    const result = OrderModel.updateOrderField(orderId, fieldName, fieldValue, session.user);
    
    return ContentService.createTextOutput(
      JSON.stringify(result)
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`Update order error: ${error.message}`);
    return ContentService.createTextOutput(
      JSON.stringify({ error: error.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// USER CONTROLLER
// ============================================================================

function handleUserOperations(action, params) {
  switch (action) {
    case 'login':
      return handleLogin(params);
    case 'logout':
      return handleLogout();
    case 'create':
      return UserModel.createUser(params);
    case 'validate':
      return UserModel.validateUser(params.username, params.password);
    default:
      throw new Error('Invalid user action');
  }
}

function handleLogin(e) {
  try {
    const username = e.parameter.username;
    const password = e.parameter.password;

    const user = UserModel.validateUser(username, password);
    
    if (user) {
      const sessionToken = Utilities.getUuid();
      const expirationTime = new Date(Date.now() + (24 * 60 * 60 * 1000));
      
      CacheService.getScriptCache().put(sessionToken, JSON.stringify({
        user: user,
        authenticated: true,
        expiration: expirationTime.getTime()
      }), 86400);

      UserModel.logActivity(username, 'login');
      
      return { 
        success: true, 
        sessionToken: sessionToken,
        expirationTime: expirationTime.toISOString(),
        user: user,
        message: 'تم تسجيل الدخول بنجاح'
      };
    } else {
      return { 
        success: false, 
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة' 
      };
    }
  } catch (error) {
    Logger.log(`Login error: ${error.message}`);
    return { 
      success: false, 
      error: 'خطأ في تسجيل الدخول: ' + error.message 
    };
  }
}

function handleLogout(e) {
  try {
    const session = checkSession(e);
    if (session.sessionToken) {
      CacheService.getScriptCache().remove(session.sessionToken);
    }
    
    return { 
      success: true, 
      message: 'تم تسجيل الخروج بنجاح' 
    };
  } catch (error) {
    Logger.log(`Logout error: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ============================================================================
// CONFIG CONTROLLER
// ============================================================================

function handleConfigOperations(action, params, session) {
  switch (action) {
    case 'get':
      return ConfigModel.getColumnsConfig();
    case 'save':
      return handleSaveColumns(params, session);
    case 'reorganize':
      return ConfigModel.reorganizeOrdersSheet();
    default:
      throw new Error('Invalid config action');
  }
}

function handleSaveColumns(e) {
  try {
    const session = checkSession(e);
    if (!session || !session.authenticated) {
      return { error: 'غير مصرح لك بالوصول' };
    }
    if (session.user.role !== 'admin') {
      return { error: 'غير مصرح لك بالوصول - يتطلب دور المسؤول' };
    }

    const columnsData = JSON.parse(e.parameter.columns || '[]');
    const result = ConfigModel.saveColumnsConfig(columnsData, session.user);
    
    return result;
  } catch (error) {
    Logger.log(`Save columns error: ${error.message}`);
    return { error: error.message };
  }
}

// ============================================================================
// ORDER MODEL
// ============================================================================

const OrderModel = {
  getOrders: function(params = {}) {
    try {
      const cached = CacheService.getScriptCache().get('orders_data');
      if (cached && !params.refresh) {
        return JSON.parse(cached);
      }

      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);
      
      if (!sheet) {
        createOrdersSheet(spreadsheet);
        return { orders: [], columns: [] };
      }

      const data = sheet.getDataRange().getValues();
      if (data.length === 0) return { orders: [], columns: [] };

      const headers = data[0];
      const orders = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const order = {};
        headers.forEach((header, index) => {
          order[header] = row[index] || '';
        });
        orders.push(order);
      }

      const result = { orders, columns: headers };
      CacheService.getScriptCache().put('orders_data', JSON.stringify(result), 300);
      
      return result;
    } catch (error) {
      Logger.log(`Get orders error: ${error.message}`);
      throw error;
    }
  },

  createOrder: function(orderData, user) {
    try {
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required to create orders.');
      }
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);
      
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newRow = headers.map(header => orderData[header] || '');
      
      if (!newRow[0]) {
        newRow[0] = sheet.getLastRow();
      }
      
      sheet.appendRow(newRow);
      CacheService.getScriptCache().remove('orders_data');
      
      return { success: true, message: 'تم إنشاء الطلب بنجاح' };
    } catch (error) {
      Logger.log(`Create order error: ${error.message}`);
      throw error;
    }
  },

  updateOrder: function(orderData, user) {
    try {
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required to update orders.');
      }
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const orderId = orderData.id;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == orderId) {
          const updateRow = headers.map(header => orderData[header] !== undefined ? orderData[header] : data[i][headers.indexOf(header)]);
          sheet.getRange(i + 1, 1, 1, headers.length).setValues([updateRow]);
          break;
        }
      }
      
      CacheService.getScriptCache().remove('orders_data');
      return { success: true, message: 'تم تحديث الطلب بنجاح' };
    } catch (error) {
      Logger.log(`Update order error: ${error.message}`);
      throw error;
    }
  },

  updateOrderField: function(orderId, fieldName, fieldValue, user) {
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const fieldIndex = headers.indexOf(fieldName);
      
      if (fieldIndex === -1) {
        throw new Error('العمود غير موجود');
      }
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == orderId) {
          sheet.getRange(i + 1, fieldIndex + 1).setValue(fieldValue);
          CacheService.getScriptCache().remove('orders_data');
          return { success: true, message: 'تم التحديث بنجاح' };
        }
      }
      
      throw new Error('الطلب غير موجود');
    } catch (error) {
      Logger.log(`Update order field error: ${error.message}`);
      throw error;
    }
  },

  deleteOrder: function(orderId, user) {
    try {
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required to delete orders.');
      }
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);
      
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == orderId) {
          sheet.deleteRow(i + 1);
          CacheService.getScriptCache().remove('orders_data');
          return { success: true, message: 'تم حذف الطلب بنجاح' };
        }
      }
      
      throw new Error('الطلب غير موجود');
    } catch (error) {
      Logger.log(`Delete order error: ${error.message}`);
      throw error;
    }
  },

  getStats: function(user) {
    try {
      const cached = CacheService.getScriptCache().get('stats_data');
      if (cached) {
        return JSON.parse(cached);
      }

      const ordersData = this.getOrders();
      const orders = ordersData.orders;
      
      const stats = {
        totalOrders: orders.length,
        todayOrders: orders.filter(order => {
          const orderDate = new Date(order['التاريخ'] || order['date']);
          const today = new Date();
          return orderDate.toDateString() === today.toDateString();
        }).length,
        pendingOrders: orders.filter(order => !order['اتصال'] || order['اتصال'] === '').length,
        confirmedOrders: orders.filter(order => order['اتصال'] === 'مؤكد').length
      };

      CacheService.getScriptCache().put('stats_data', JSON.stringify(stats), 600);
      return stats;
    } catch (error) {
      Logger.log(`Get stats error: ${error.message}`);
      throw error;
    }
  }
};

// ============================================================================
// USER MODEL
// ============================================================================

const UserModel = {
  validateUser: function(username, password) {
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      let usersSheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
      
      if (!usersSheet) {
        createUsersSheet(spreadsheet);
        return null;
      }

      const data = usersSheet.getDataRange().getValues();
      if (data.length <= 1) return null;

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const storedUsername = row[0];
        const storedPassword = row[1];
        const role = row[2];
        const isActive = row[4];

        if (storedUsername === username && isActive) {

          const hashedInputPassword = Utilities.computeDigest(
            Utilities.DigestAlgorithm.SHA_256, 
            password, 
            Utilities.Charset.UTF_8
          );
          const hexInputPassword = hashedInputPassword.reduce(
            (str, chr) => str + ('0' + (chr & 0xFF).toString(16)).slice(-2), 
            ''
          );

          if (storedPassword === hexInputPassword) {
            return {
              username: storedUsername,
              role: role,
              lastLogin: new Date()
            };
          }
        }
      }

      return null;
    } catch (error) {
      Logger.log(`Validate user error: ${error.message}`);
      throw error;
    }
  },

  createUser: function(userData) {
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      let usersSheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
      
      if (!usersSheet) {
        createUsersSheet(spreadsheet);
      }

      const hashedPassword = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256, 
        userData.password, 
        Utilities.Charset.UTF_8
      );
      const hexPassword = hashedPassword.reduce(
        (str, chr) => str + ('0' + (chr & 0xFF).toString(16)).slice(-2), 
        ''
      );

      usersSheet.appendRow([
        userData.username,
        hexPassword,
        userData.role || 'user',
        new Date(),
        true
      ]);

      return { success: true, message: 'تم إنشاء المستخدم بنجاح' };
    } catch (error) {
      Logger.log(`Create user error: ${error.message}`);
      throw error;
    }
  },

  logActivity: function(username, action) {
    try {
      Logger.log(`User activity: ${username} - ${action} at ${new Date()}`);
    } catch (error) {
      Logger.log(`Log activity error: ${error.message}`);
    }
  }
};

// ============================================================================
// CONFIG MODEL
// ============================================================================

const ConfigModel = {
  getColumnsConfig: function() {
    try {
      const cached = CacheService.getScriptCache().get('columns_config');
      if (cached) {
        return JSON.parse(cached);
      }

      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      let configSheet = spreadsheet.getSheetByName('ColumnsConfig');
      
      if (!configSheet) {
        createColumnsConfigSheet(spreadsheet);
        configSheet = spreadsheet.getSheetByName('ColumnsConfig');
      }
      
      const data = configSheet.getDataRange().getValues();
      const headers = data[0];
      const columns = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const column = {};
        headers.forEach((header, index) => {
          column[header] = row[index];
        });
        
        if (column.options && typeof column.options === 'string') {
          try {
            column.options = column.options.split(',').map(opt => opt.trim()).filter(opt => opt);
          } catch (e) {
            column.options = [];
          }
        }
        
        columns.push(column);
      }
      
      columns.sort((a, b) => (a.order || 999) - (b.order || 999));
      
      CacheService.getScriptCache().put('columns_config', JSON.stringify(columns), 1800);
      return columns;
    } catch (error) {
      Logger.log(`Get columns config error: ${error.message}`);
      throw error;
    }
  },

  saveColumnsConfig: function(columnsData, user) {
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      let configSheet = spreadsheet.getSheetByName('ColumnsConfig');
      
      if (!configSheet) {
        createColumnsConfigSheet(spreadsheet);
        configSheet = spreadsheet.getSheetByName('ColumnsConfig');
      }

      const headers = ['id', 'arabicName', 'englishName', 'type', 'required', 'editable', 
                      'visible', 'width', 'sortable', 'searchable', 'options', 'order'];
      
      const lastRow = configSheet.getLastRow();
      if (lastRow > 1) {
        configSheet.deleteRows(2, lastRow - 1);
      }

      const rows = columnsData.map(column => {
        return headers.map(header => {
          const value = column[header];
          if (header === 'options' && Array.isArray(value)) {
            return value.join(',');
          }
          return value !== undefined ? value : '';
        });
      });

      if (rows.length > 0) {
        configSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }

      this.updateOrdersSheetHeaders(columnsData);
      
      CacheService.getScriptCache().remove('columns_config');
      CacheService.getScriptCache().remove('orders_data');
      
      return { success: true, message: 'تم حفظ التكوين بنجاح' };
    } catch (error) {
      Logger.log(`Save columns config error: ${error.message}`);
      throw error;
    }
  },

  updateOrdersSheetHeaders: function(columnsData) {
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const ordersSheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);
      
      if (!ordersSheet) return;

      const visibleColumns = columnsData
        .filter(col => col.visible)
        .sort((a, b) => (a.order || 999) - (b.order || 999));
      
      const headers = visibleColumns.map(col => col.arabicName || col.englishName || col.id);
      
      if (headers.length > 0) {
        const currentLastColumn = ordersSheet.getLastColumn();
        if (currentLastColumn < headers.length) {
          ordersSheet.insertColumnsAfter(currentLastColumn, headers.length - currentLastColumn);
        }
        
        ordersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        ordersSheet.getRange(1, 1, 1, headers.length)
          .setBackground('#4CAF50')
          .setFontColor('white');
      }
      
    } catch (error) {
      Logger.log(`Update orders sheet headers error: ${error.message}`);
      throw error;
    }
  },

  reorganizeOrdersSheet: function() {
    try {
      const columnsConfig = this.getColumnsConfig();
      this.updateOrdersSheetHeaders(columnsConfig);
      
      CacheService.getScriptCache().remove('orders_data');
      
      return { 
        success: true, 
        message: 'تم إعادة تنظيم ورقة الطلبات بنجاح',
        columns: columnsConfig.length
      };
    } catch (error) {
      Logger.log(`Reorganize orders sheet error: ${error.message}`);
      throw error;
    }
  }
};

// ============================================================================
// COMMON UTILITIES
// ============================================================================

const CommonUtils = {
  getCachedData: function(key, fallbackFunction, ttl = 300) {
    try {
      const cached = CacheService.getScriptCache().get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      
      const data = fallbackFunction();
      CacheService.getScriptCache().put(key, JSON.stringify(data), ttl);
      return data;
    } catch (error) {
      Logger.log(`Cache error for ${key}: ${error.message}`);
      return fallbackFunction();
    }
  },

  clearCache: function(keys = []) {
    try {
      if (keys.length === 0) {
        CacheService.getScriptCache().flushAll();
      } else {
        keys.forEach(key => CacheService.getScriptCache().remove(key));
      }
    } catch (error) {
      Logger.log(`Clear cache error: ${error.message}`);
    }
  },

  validateRequired: function(data, requiredFields) {
    const missing = [];
    requiredFields.forEach(field => {
      if (!data[field] || data[field].toString().trim() === '') {
        missing.push(field);
      }
    });
    return missing;
  },

  sanitizeInput: function(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .trim();
  },

  formatDate: function(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA');
  },

  generateId: function() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  logError: function(context, error) {
    Logger.log(`[${context}] Error: ${error.message} - Stack: ${error.stack}`);
  }
};

/**
 * Session management utilities
 */
function checkSession(e) {
  try {
    let sessionToken = null;
    
    if (e && e.parameter && e.parameter.session) {
      sessionToken = e.parameter.session;
    } else if (e && e.parameters && e.parameters.cookie) {
      const cookies = e.parameters.cookie[0].split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'session') {
          sessionToken = value;
          break;
        }
      }
    }

    if (!sessionToken) {
      return { authenticated: false };
    }

    // Try cache first, then fallback to PropertiesService for compatibility
    let sessionData = CacheService.getScriptCache().get(sessionToken);
    if (!sessionData) {
      sessionData = PropertiesService.getScriptProperties().getProperty(`session_${sessionToken}`);
      if (sessionData) {
        // Migrate to cache for better performance
        CacheService.getScriptCache().put(sessionToken, sessionData, 86400);
        PropertiesService.getScriptProperties().deleteProperty(`session_${sessionToken}`);
      }
    }

    if (!sessionData) {
      return { authenticated: false };
    }

    const session = JSON.parse(sessionData);
    if (new Date().getTime() > session.expiration) {
      CacheService.getScriptCache().remove(sessionToken);
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: session.user,
      sessionToken: sessionToken
    };
  } catch (error) {
    Logger.log(`Check session error: ${error.message}`);
    return { authenticated: false };
  }
}

/**
 * Create sheets if they don't exist
 */
function createUsersSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(USERS_SHEET_NAME);
  
  const headers = ['username', 'password', 'role', 'created_at', 'active'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#FF9800').setFontColor('white');
  sheet.setFrozenRows(1);
  
  Logger.log('Users sheet created successfully');
}

// ============================================================================
// SYSTEM INITIALIZATION AND TESTING
// ============================================================================

/**
 * System initialization and testing functions
 */
function testSystem() {
  Logger.log('Testing system...');

  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('Spreadsheet opened successfully');

    const ordersSheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);
    const usersSheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);

    if (!ordersSheet) {
      Logger.log('Creating Orders sheet...');
      createOrdersSheet(spreadsheet);
    }

    if (!usersSheet) {
      Logger.log('Creating Users sheet...');
      createUsersSheet(spreadsheet);
    }

    // Initialize configuration
    ConfigModel.getColumnsConfig();

    Logger.log('System test completed successfully');
  } catch (error) {
    Logger.log(`System test failed: ${error.message}`);
  }
}

/**
 * Create simple test user
 */
function createSimpleUser() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let usersSheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);

    if (!usersSheet) {
      createUsersSheet(spreadsheet);
      usersSheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
    }

    // Clear existing users
    const lastRow = usersSheet.getLastRow();
    if (lastRow > 1) {
      usersSheet.deleteRows(2, lastRow - 1);
    }

    // Add simple test user
    const password = 'admin';
    const hashedPassword = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
    const hexPassword = hashedPassword.reduce((str, chr) => str + ('0' + (chr & 0xFF).toString(16)).slice(-2), '');

    usersSheet.appendRow([
      'admin',
      hexPassword,
      'admin',
      new Date(),
      true
    ]);

    Logger.log('Simple user created: admin/admin');
    Logger.log('Hashed password: ' + hexPassword);
  } catch (error) {
    Logger.log(`Create simple user error: ${error.message}`);
  }
}

/**
 * Create test user without encryption
 */
function createTestUser() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let usersSheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);

    if (!usersSheet) {
      createUsersSheet(spreadsheet);
      usersSheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
    }

    // Clear existing users
    const lastRow = usersSheet.getLastRow();
    if (lastRow > 1) {
      usersSheet.deleteRows(2, lastRow - 1);
    }

    // Add test user without encryption
    usersSheet.appendRow([
      'admin',
      'admin', // Plain password for testing
      'admin',
      new Date(),
      true
    ]);

    Logger.log('Test user created: admin/admin (no encryption)');
  } catch (error) {
    Logger.log(`Create test user error: ${error.message}`);
  }
}

/**
 * Create Orders sheet
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet - Spreadsheet object
 */
function createOrdersSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(ORDERS_SHEET_NAME);

  // Use column configuration to set headers
  const columnsConfig = ConfigModel.getColumnsConfig();
  const headers = columnsConfig.length > 0 
    ? columnsConfig.filter(col => col.visible).map(col => col.arabicName || col.englishName || col.id)
    : ['id', 'التاريخ', 'إسم العميل', 'رقم الموبايل للتواصل', 'رقم اخر للتواصل',
       'المحافظة', 'المنطقة', 'العنوان ( حي - حارة - شارع - منطقة )', 'سعر القطعه', 'عدد القطع', 'Total',
       'Product name', 'Source', 'Feedback', 'Notes', 'اتصال', '-', 'Whatsapp'];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#4CAF50').setFontColor('white');
  sheet.setFrozenRows(1);

  Logger.log('Orders sheet created successfully');
}

/**
 * Create ColumnsConfig sheet
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet - Spreadsheet object
 */
function createColumnsConfigSheet(spreadsheet) {
  try {
    Logger.log('Creating ColumnsConfig sheet');
    const sheet = spreadsheet.insertSheet('ColumnsConfig');

    // Headers for column configuration
    const headers = [
      'id', 'arabicName', 'englishName', 'type', 'required', 'editable', 
      'visible', 'width', 'sortable', 'searchable', 'options', 'order'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#2196F3').setFontColor('white');
    sheet.setFrozenRows(1);
    
    // Default column configuration
    const defaultColumns = [
      ['id', 'id', 'ID', 'number', true, false, true, 80, true, false, '', 1],
      ['date', 'التاريخ', 'Date', 'date', true, true, true, 120, true, true, '', 2],
      ['customerName', 'إسم العميل', 'Customer Name', 'text', true, true, true, 150, true, true, '', 3],
      ['phone1', 'رقم الموبايل للتواصل', 'Phone 1', 'tel', true, true, true, 150, false, true, '', 4],
      ['phone2', 'رقم اخر للتواصل', 'Phone 2', 'tel', false, true, true, 150, false, true, '', 5],
      ['governorate', 'المحافظة', 'Governorate', 'select', true, true, true, 120, true, true, '', 6],
      ['district', 'المنطقة', 'District', 'text', false, true, true, 120, true, true, '', 7],
      ['address', 'العنوان ( حي - حارة - شارع - منطقة )', 'Address', 'textarea', true, true, true, 200, false, true, '', 8],
      ['pricePerPiece', 'سعر القطعه', 'Price Per Piece', 'number', true, true, true, 120, true, false, '', 9],
      ['quantity', 'عدد القطع', 'Quantity', 'number', true, true, true, 100, true, false, '', 10],
      ['total', 'Total', 'Total', 'number', false, true, true, 120, true, false, '', 11],
      ['productName', 'Product name', 'Product Name', 'text', true, true, true, 150, true, true, '', 12],
      ['source', 'Source', 'Source', 'select', false, true, true, 120, true, true, '', 13],
      ['feedback', 'Feedback', 'Feedback', 'select', false, true, true, 120, true, true, '', 14],
      ['notes', 'Notes', 'Notes', 'textarea', false, true, true, 200, false, true, '', 15],
      ['callStatus', 'اتصال', 'Call Status', 'select', false, true, true, 100, true, false, '', 16],
      ['separator', '-', '-', 'text', false, false, true, 50, false, false, '-', 17],
      ['whatsappStatus', 'Whatsapp', 'WhatsApp Status', 'select', false, true, true, 100, true, false, '', 18]
    ];

    sheet.getRange(2, 1, defaultColumns.length, defaultColumns[0].length).setValues(defaultColumns);
    
    Logger.log('ColumnsConfig sheet created successfully');
    return sheet;
  } catch (error) {
    Logger.log(`Error creating ColumnsConfig sheet: ${error.message}`);
    throw error;
  }
}



// Legacy functions - redirected to new MVC structure
function getColumnsConfig() {
  return ConfigModel.getColumnsConfig();
}

function getOrdersData(params) {
  return OrderModel.getOrders(params);
}

function getStatsData(user) {
  return OrderModel.getStats(user);
}