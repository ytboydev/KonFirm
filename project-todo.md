# Project To-Do

## Security (High Priority)
- [x] Refactor `UserModel.validateUser` to disallow plaintext passwords.
- [x] Implement role-based authorization for all administrative actions (e.g., save columns, create/update/delete orders).
- [ ] Remove the `createTestUser` function that uses a plaintext password. (Skipped due to tool issue)
- [ ] Add `autocomplete` attributes to login form. (Skipped due to tool issue)
- [ ] Add labels to login form for accessibility. (Skipped due to tool issue)
- [ ] Add `Secure` and `SameSite` flags to session cookie. (Skipped due to tool issue)

## Best Practices & Refactoring (Medium Priority)
- [ ] Consolidate all API routing logic. Use POST for state-changing operations and GET for read-only operations. (Skipped due to tool issue)
- [ ] Store `SPREADSHEET_ID` in `PropertiesService` instead of hardcoding it.
- [ ] Remove unused legacy functions at the end of `Code.gs`.
- [ ] Replace all magic strings for actions and sheet names with constants.
- [ ] Improve error handling to return more descriptive JSON error objects from the API.

## General Tasks (Low Priority)
- [ ] Test performance and responsiveness of the frontend.
- [ ] Add unit tests for backend functions.
- [ ] Improve technical documentation.

## Completed Reviews
- [x] Review `Code.gs` for bugs, performance, and best practices.
- [x] Review `login.html` for security and accessibility.
- [ ] Review `index.html` for structure and accessibility.
- [ ] Review `assets/js/app.js` for bugs, performance, and best practices.
- [ ] Review `assets/css/main.css` for consistency and improvements.
