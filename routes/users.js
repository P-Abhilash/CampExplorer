const express = require("express");
const router = express.Router();
const users = require("../controllers/users");
const User = require("../models/user");
const supabase = require("../utils/supabaseClient");

// --------------------
// Email/Password Routes
// --------------------
router.route("/register").get(users.renderRegister).post(users.register);

router.route("/login").get(users.renderLogin).post(users.login);

router.get("/logout", users.logout);

// --------------------
// Google OAuth
// --------------------
router.get("/auth/google", async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) {
      console.error(error);
      req.flash("error", "Failed to start Google login");
      return res.redirect("/login");
    }

    res.redirect(data.url);
  } catch (err) {
    console.error(err);
    req.flash("error", "Unexpected error starting login");
    res.redirect("/login");
  }
});

// --------------------
// Callback (ALL Flows end here)
// --------------------
router.get("/auth/callback", async (req, res) => {
  const { code, error } = req.query;
  // Case 1: User cancelled or something went wrong at Google
  if (error) {
    req.flash("error", "Google login was cancelled or denied.");
    return res.redirect("/login");
  }
  // Case 2: No code returned
  if (!code) {
    req.flash("error", "No auth code returned.");
    return res.redirect("/login");
  }
  // Case 3: Try exchanging code for session
  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError || !data.session) {
    req.flash("error", "Failed to exchange code for session");
    return res.redirect("/login");
  }

  const supaUser = data.session.user;

  // Save session for Express
  req.session.user = {
    id: supaUser.id,
    email: supaUser.email,
    name: supaUser.user_metadata.full_name,
    avatar: supaUser.user_metadata.avatar_url,
  };

  // ✅ Upsert into Mongo
  await User.findByIdAndUpdate(
    supaUser.id,
    {
      _id: supaUser.id,
      email: supaUser.email,
      name: supaUser.user_metadata.full_name,
      avatarUrl: supaUser.user_metadata.avatar_url,
    },
    { upsert: true, new: true }
  );

  req.flash(
    "success",
    `Welcome ${supaUser.user_metadata.full_name || supaUser.email}!`
  );
  res.redirect("/campgrounds");
});

// --------------------
// Forgot Password
// --------------------
router.get("/forgot-password", (req, res) => {
  res.render("users/forgot"); // 👈 you'll create forgot.ejs
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/auth/reset-password",
    });

    if (error) {
      req.flash("error", error.message);
      return res.redirect("/forgot-password");
    }

    req.flash("success", "Check your email for a reset link.");
    res.redirect("/login");
  } catch (err) {
    console.error("Forgot password error:", err);
    req.flash("error", "Something went wrong. Try again.");
    res.redirect("/forgot-password");
  }
});

// Show reset password page
router.get("/auth/reset-password", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    req.flash("error", "Password reset was cancelled or denied.");
    return res.redirect("/login");
  }

  if (!code) {
    req.flash("error", "Auth session missing!");
    return res.redirect("/login");
  }

  try {
    // Exchange reset code for a session
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.session) {
      req.flash("error", "Could not load reset page");
      return res.redirect("/login");
    }

    // Attach session user to Express session
    req.session.user = data.session.user;

    res.render("users/reset");
  } catch (err) {
    console.error("Reset route error:", err);
    req.flash("error", "Could not load reset page");
    res.redirect("/login");
  }
});

router.post("/auth/reset-password", async (req, res) => {
  const { password } = req.body;

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      req.flash("error", error.message);
      return res.redirect("/auth/reset-password");
    }

    req.flash("success", "Password updated successfully.");
    res.redirect("/login");
  } catch (err) {
    console.error("Reset password error:", err);
    req.flash("error", "Something went wrong. Try again.");
    res.redirect("/auth/reset-password");
  }
});

module.exports = router;
