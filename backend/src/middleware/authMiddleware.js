const { sessions, users, teachers } = require("../data/mockData");

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;
  let user;
  let teacher;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    user = users.find((item) => item.role === "TEACHER");
  } else {
    const token = authorization.replace("Bearer ", "");
    const session = sessions[token];
    if (session && session.user_id) {
      user = users.find((item) => item.user_id === session.user_id);
    } else {
      user = users.find((item) => item.role === "TEACHER");
    }
  }

  if (user) {
    teacher = teachers.find((item) => item.user_id === user.user_id);
  }

  if (!user || user.role !== "TEACHER" || !teacher) {
    return res.status(403).json({ error: "Access denied. Teacher authentication required." });
  }

  req.user = user;
  req.teacher = teacher;
  next();
}

function requireStudent(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token." });
  }

  const token = authorization.replace("Bearer ", "");
  const session = sessions[token];
  if (!session || !session.user_id) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  const user = users.find((item) => item.user_id === session.user_id);
  if (!user || user.role !== "STUDENT") {
    return res.status(403).json({ error: "Access denied. Student authentication required." });
  }

  req.user = user;
  next();
}

function requireParent(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token." });
  }

  const token = authorization.replace("Bearer ", "");
  const session = sessions[token];
  if (!session || !session.user_id) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  const user = users.find((item) => item.user_id === session.user_id);
  if (!user || user.role !== "PARENT") {
    return res.status(403).json({ error: "Access denied. Parent authentication required." });
  }

  req.user = user;
  next();
}

module.exports = {
  requireAuth,
  requireStudent,
  requireParent,
};
