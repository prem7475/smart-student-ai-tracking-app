const jwt = require("jsonwebtoken");
const User = require("../models/User");

const buildToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
});

const register = async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "Email is already registered" });
  }

  const user = await User.create({ name, email, password });
  const token = buildToken(user._id.toString());

  return res.status(201).json({
    token,
    user: userResponse(user),
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = buildToken(user._id.toString());

  return res.json({
    token,
    user: userResponse(user),
  });
};

const me = async (req, res) => {
  const user = await User.findById(req.userId).select("-password");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ user: userResponse(user) });
};

module.exports = {
  register,
  login,
  me,
};

