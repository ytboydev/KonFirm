# Changelog

All changes to this project will be documented in this file.

---
**Timestamp:** 2025-08-10 13:37

**Changes:**
- **Security:** Refactored `UserModel.validateUser` in `Code.gs` to remove plaintext password check.
- **Security:** Added role-based authorization to `handleSaveColumns` in `Code.gs`.
- **Security:** Added role-based authorization to `OrderModel.createOrder`, `OrderModel.updateOrder`, and `OrderModel.deleteOrder` in `Code.gs`.
- **Docs:** Updated `project-todo.md` to reflect completed and skipped tasks.
---
---
**Timestamp:** 2025-08-10 13:38

**Changes:**
- **Review:** Reviewed `login.html` for security and accessibility issues.
- **Docs:** Updated `project-todo.md` with findings from the review and marked tasks as skipped due to tool limitations.
