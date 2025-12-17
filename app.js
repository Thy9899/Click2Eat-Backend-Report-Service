require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const connectDB = require("./src/util/db");
const reportRoutes = require("./src/routes/report.route");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Connect DB
connectDB().catch((err) => {
  console.error("❌ Failed to connect to MongoDB:", err);
  process.exit(1);
});

// Routes
app.use("/api/reports", reportRoutes);

const PORT = process.env.PORT || 5006;
app.listen(PORT, () =>
  console.log(`✅ Reports service running on port ${PORT}`)
);
