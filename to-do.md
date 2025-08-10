# مهام قائمة الانتظار

## مكتمل ✅
- [x] تحويل المشروع إلى MVC architecture
- [x] نقل navigation من sidebar إلى header  
- [x] دمج ملفات JS في app.js واحد
- [x] دمج ملفات CSS في main.css واحد
- [x] إنشاء controllers منفصلة (Order, User, Config)
- [x] إنشاء models منفصلة (Order, User, Config)  
- [x] تنظيم views في مجلد منفصل
- [x] تحسين الأداء مع caching
- [x] تقليل الطلبات عبر batch operations
- [x] إزالة الكود المكرر والملفات الزائدة
- [x] **MAJOR ARCHITECTURE FIX**: فصل Frontend عن Backend بشكل كامل
  - [x] دمج جميع ملفات .gs في Code.gs واحد
  - [x] تحويل Code.gs ليقدم JSON API فقط (إزالة HTML)
  - [x] إنشاء login.html منفصل للتسجيل
  - [x] تحديث index.html ليكون تطبيق frontend مستقل
  - [x] تحديث app.js للتواصل مع Apps Script API
  - [x] إضافة UserModel, ConfigModel, CommonUtils لـ Code.gs
  - [x] إصلاح Authentication لإرجاع JSON tokens بدلاً من HTML

## الأولوية العالية
- [x] اختبار النظام الجديد والتأكد من عمل جميع الوظائف  
- [ ] ⚠️ **CRITICAL**: تحديث Google Apps Script deployment والحصول على URL
- [ ] تحديث URLs في ملفات Frontend (login.html, index.html, app.js)
- [ ] اختبار الأداء والاستجابة

## الأولوية المتوسطة  
- [ ] إضافة error handling محسن
- [ ] تحسين security measures
- [ ] إضافة logging system

## الأولوية المنخفضة
- [ ] إضافة unit tests
- [ ] تحسين التوثيق الفني