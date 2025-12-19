const express = require("express");
const reportController = require("../controller/report.controller");
const authenticateTokenAdmin = require("../middleware/authMiddlewareAdmin");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

/// ===============================================
// ADMIN REPORT ROUTES
// All routes require admin authentication
// ===============================================

/**
 * Get Daily Sales Report
 * @route GET /api/reports/daily-sales
 * @access Admin
 */
router.get(
  "/daily-sales",
  authenticateTokenAdmin,
  adminOnly,
  reportController.dailySalesReport
);

/**
 * Explanation (Frontend):
 * Used on Admin Report Page (Daily Sales tab)
 * Frontend sends:
 * - No body (GET request)
 * - Optional query params (date range if implemented)
 * Must include:
 * - Admin JWT token (Authorization header)
 * Response:
 * - List of daily sales
 * - Total orders per day
 * - Total revenue per day
 */

/**
 * Get Monthly Sales Report
 * @route GET /api/reports/monthly-sales
 * @access Admin
 */
router.get(
  "/monthly-sales",
  authenticateTokenAdmin,
  adminOnly,
  reportController.monthlySalesReport
);

/**
 * Explanation (Frontend):
 * Used on Admin Report Page (Monthly Sales tab)
 * Frontend sends:
 * - No body (GET request)
 * Must include:
 * - Admin JWT token
 * Response:
 * - Monthly sales summary
 * - Total orders per month
 * - Total revenue per month
 */

/**
 * Get Order Status Report
 * @route GET /api/reports/order-status
 * @access Admin
 */
router.get(
  "/order-status",
  authenticateTokenAdmin,
  adminOnly,
  reportController.orderStatusReport
);

/**
 * Explanation (Frontend):
 * Used on Admin Dashboard / Order Status Chart
 * Frontend sends:
 * - No body (GET request)
 * Must include:
 * - Admin JWT token
 * Response:
 * - Order counts grouped by status
 *   (pending, confirmed, delivered, cancelled, etc.)
 */

/**
 * Get Customer Order Report
 * @route GET /api/reports/customer
 * @access Admin
 */
router.get(
  "/customer",
  authenticateTokenAdmin,
  adminOnly,
  reportController.userOrderReport
);

/**
 * Explanation (Frontend):
 * Used on Admin Report Page (Customer Orders)
 * Frontend sends:
 * - No body (GET request)
 * Must include:
 * - Admin JWT token
 * Response:
 * - List of customers
 * - Total orders per customer
 * - Total spending per customer
 */

/**
 * Get Product Sales Report
 * @route GET /api/reports/product
 * @access Admin
 */
router.get(
  "/product",
  authenticateTokenAdmin,
  adminOnly,
  reportController.userProductReport
);

/**
 * Explanation (Frontend):
 * Used on Admin Report Page (Product Sales)
 * Frontend sends:
 * - No body (GET request)
 * Must include:
 * - Admin JWT token
 * Response:
 * - List of products
 * - Quantity sold per product
 * - Total revenue per product
 */

module.exports = router;
