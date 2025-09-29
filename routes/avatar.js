const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.get("/:userId", async (req, res) => {
  const user = await User.findById(req.params.userId);

  try {
    if (!user || !user.avatarUrl) {
      // ✅ Use local default avatar for registered users without avatar
      return res.sendFile("default-avatar.png", { root: "public/images" });
    }

    const response = await fetch(user.avatarUrl);
    if (!response.ok) throw new Error("Failed to fetch avatar");

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set("Content-Type", response.headers.get("content-type"));
    res.send(buffer);
  } catch (err) {
    console.error("Avatar proxy error:", err);
    // ✅ fallback if external fetch fails
    return res.sendFile("default-avatar.png", { root: "public/images" });
  }
});

module.exports = router;
