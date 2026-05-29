const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/admin");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const parentRoutes = require("./routes/parentRoutes");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/parent", parentRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Smart School Connect backend is running." });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});


app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
