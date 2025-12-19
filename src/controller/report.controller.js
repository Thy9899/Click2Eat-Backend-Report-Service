// controller/report.controller.js
const Order = require("../models/order.model");

/**
 * DAILY SALES REPORT
 * @route GET /api/reports/daily-sales
 * @access Admin
 * @description
 *   • Returns daily completed orders
 *   • Includes customer info and order items
 *   • Aggregates total orders and sales per day
 */
const dailySalesReport = async (req, res) => {
  try {
    // Admin-only access
    if (!req.user?.is_admin)
      return res.status(403).json({ error: "Access denied" });

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const report = await Order.aggregate([
      // Only completed orders
      {
        $match: {
          status: { $in: ["completed", "pending", "confirmed", "cancelled"] },
        },
      },

      // Join order items
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "order_id",
          as: "items",
        },
      },

      // Join customer (users)
      {
        $lookup: {
          from: "users",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },

      // Extract single customer object
      {
        $addFields: {
          customer: { $arrayElemAt: ["$customer", 0] },
        },
      },

      // Group by day
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
          },
          orders: {
            $push: {
              customer: "$customer.name",
              status: "$status",
              items: "$items",
              total: "$total_price",
            },
          },
          totalOrders: { $sum: 1 },
          totalSales: { $sum: "$total_price" },
        },
      },

      // Sort by newest date
      { $sort: { _id: -1 } },
    ]);

    res.json({ success: true, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Report error" });
  }
};

/**
 * MONTHLY SALES REPORT
 * @route GET /api/reports/monthly-sales
 * @access Admin
 * @description
 *   • Returns monthly completed orders
 *   • Aggregates total orders and total sales per month
 *   • Useful for dashboard charts or reports
 */
const monthlySalesReport = async (req, res) => {
  try {
    if (!req.user?.is_admin)
      return res.status(403).json({ error: "Access denied" });

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const report = await Order.aggregate([
      // Completed orders only
      {
        $match: {
          status: { $in: ["completed", "pending", "confirmed", "cancelled"] },
        },
      },
      // Group by year-month
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" },
          },
          totalOrders: { $sum: 1 },
          totalSales: { $sum: "$total_price" },
        },
      },

      // Sort latest month first
      { $sort: { _id: -1 } },
    ]);

    res.json({ success: true, report });
  } catch (err) {
    console.error("MonthlySalesReport Error:", err);
    res.status(500).json({ error: "Failed to generate monthly sales report" });
  }
};

/**
 * ORDER STATUS REPORT
 * @route GET /api/reports/order-status
 * @access Admin
 * @description
 *   • Returns users grouped by order status
 *   • Includes total orders, total items, total spent, last order date
 *   • Aggregates customers under "completed", "confirmed", and "cancelled"
 */
const orderStatusReport = async (req, res) => {
  try {
    if (!req.user?.is_admin) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const report = await Order.aggregate([
      // Only needed statuses
      {
        $match: {
          status: { $in: ["pending", "completed", "confirmed", "cancelled"] },
        },
      },

      // Join order items
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "order_id",
          as: "orderItems",
        },
      },

      // Group by STATUS + CUSTOMER
      {
        $group: {
          _id: {
            status: "$status",
            customerId: "$customer_id",
          },
          totalOrders: { $sum: 1 },
          totalItems: {
            $sum: {
              $sum: "$orderItems.quantity",
            },
          },
          totalSpent: { $sum: "$total_price" },
          lastOrderDate: { $max: "$createdAt" },
        },
      },

      // Join customer
      {
        $lookup: {
          from: "customers", // adjust if users
          localField: "_id.customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },

      // Shape customer data
      {
        $project: {
          _id: 0,
          status: "$_id.status",
          customer_id: "$customer._id",
          fullName: "$customer.fullName",
          email: "$customer.email",
          phone: "$customer.phone",
          totalOrders: 1,
          totalItems: 1,
          totalSpent: 1,
          lastOrderDate: 1,
        },
      },

      // Group by STATUS (final shape)
      {
        $group: {
          _id: "$status",
          users: {
            $push: {
              customer_id: "$customer_id",
              fullName: "$fullName",
              email: "$email",
              phone: "$phone",
              totalOrders: "$totalOrders",
              totalItems: "$totalItems",
              totalSpent: "$totalSpent",
              lastOrderDate: "$lastOrderDate",
            },
          },
        },
      },

      { $sort: { _id: 1 } },
    ]);

    // Convert array → object (clean API)
    const formatted = {};
    report.forEach((r) => {
      formatted[r._id] = r.users;
    });

    res.json({ success: true, report: formatted });
  } catch (err) {
    console.error("UserOrderReport Error:", err);
    res.status(500).json({ error: "Failed to generate user report" });
  }
};

/**
 * USER ORDER REPORT
 * @route GET /api/reports/user-orders
 * @access Admin
 * @description
 *   • Returns summary of orders per customer
 *   • Includes total orders, total items, total spent, last order date
 *   • Sorted by highest spending first
 */
const userOrderReport = async (req, res) => {
  try {
    if (!req.user?.is_admin) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const report = await Order.aggregate([
      // Completed + confirmed orders
      {
        $match: { status: { $in: ["completed", "confirmed"] } },
      },

      // Join order items
      {
        $lookup: {
          from: "orderitems",
          localField: "items",
          foreignField: "_id",
          as: "orderItems",
        },
      },

      // Group by customer
      {
        $group: {
          _id: "$customer_id",
          totalOrders: { $sum: 1 },
          totalItems: { $sum: { $sum: "$orderItems.quantity" } },
          totalSpent: { $sum: "$total_price" },
          lastOrderDate: { $max: "$createdAt" },
        },
      },

      // Join customer info
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },

      // Clean output
      {
        $project: {
          _id: 0,
          customer_id: "$customer._id",
          fullName: "$customer.fullName",
          email: "$customer.email",
          phone: "$customer.phone",
          totalOrders: 1,
          totalItems: 1,
          totalSpent: 1,
          lastOrderDate: 1,
        },
      },

      // Top spenders first
      { $sort: { totalSpent: -1 } },
    ]);

    res.json({ success: true, report });
  } catch (err) {
    console.error("UserOrderReport Error:", err);
    res.status(500).json({ error: "Failed to generate user report" });
  }
};

/**
 * USER PRODUCT REPORT
 * @route GET /api/reports/user-products
 * @access Admin
 * @description
 *   • Returns summary of products sold
 *   • Includes quantity sold, total price, category, unit price
 *   • Sorted by most sold products first
 */
const userProductReport = async (req, res) => {
  try {
    if (!req.user?.is_admin) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const report = await Order.aggregate([
      // Valid order statuses
      {
        $match: { status: { $in: ["completed", "confirmed"] } },
      },

      // Join order items
      {
        $lookup: {
          from: "orderitems",
          localField: "items",
          foreignField: "_id",
          as: "orderItems",
        },
      },

      // Flatten items
      { $unwind: "$orderItems" },

      // Group by product
      {
        $group: {
          _id: "$orderItems.product_id",
          product_id: { $first: "$orderItems.product_id" },
          name: { $first: "$orderItems.name" },
          category: { $first: "$orderItems.category" },
          unit_price: { $first: "$orderItems.unit_price" },
          quantity: { $sum: "$orderItems.quantity" },
          total_price: { $sum: "$orderItems.total_price" },
        },
      },

      // Best-selling first
      { $sort: { quantity: -1 } },
    ]);

    res.json({ success: true, report });
  } catch (err) {
    console.error("UserProductReport Error:", err);
    res.status(500).json({ error: "Failed to generate user product report" });
  }
};

module.exports = {
  dailySalesReport,
  monthlySalesReport,
  orderStatusReport,
  userOrderReport,
  userProductReport,
};
