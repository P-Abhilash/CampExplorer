const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.get("/:userId", async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user || !user.avatarUrl) {
    return res.redirect("https://www.gravatar.com/avatar/?d=mp&s=64");
  }

  try {
    const response = await fetch(user.avatarUrl);
    if (!response.ok) throw new Error("Failed to fetch avatar");

    const buffer = Buffer.from(await response.arrayBuffer()); // ✅ convert web stream to buffer
    res.set("Content-Type", response.headers.get("content-type"));
    res.send(buffer);
  } catch (err) {
    console.error("Avatar proxy error:", err);
    res.redirect("https://www.gravatar.com/avatar/?d=mp&s=64");
  }
});

module.exports = router;
