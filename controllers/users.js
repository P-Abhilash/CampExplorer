const supabase = require("../utils/supabaseClient");
const User = require("../models/user");

// Render Register Page
module.exports.renderRegister = (req, res) => {
  res.render("users/register", { formData: {} });
};

// Handle Register → just call Supabase signUp, let email link redirect back
module.exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const { data: signupData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: "http://localhost:3000/auth/callback", // 👈 redirect after email verify
      },
    });

    if (error) {
      req.flash("error", error.message);
      req.session.formData = { email, name }; // save form values for next render
      return res.redirect("/register");
    }

    if (signupData.user && signupData.user.identities.length === 0) {
      req.flash("error", "This email is already registered. Please log in.");
      req.session.formData = { email, name };
      return res.redirect("/register");
    }

    req.flash("success", "Check your email to confirm your account.");
    res.redirect("/login");
  } catch (err) {
    console.error("Register fatal:", err);
    const msg = err.message || "Unexpected error";
    req.flash("error", msg);
    return res.status(500).render("users/register", {
      error: msg,
      formData: { email, name },
    });
  }
};

// Render Login Page
module.exports.renderLogin = (req, res) => {
  res.render("users/login", { formData: {} });
};

// Handle Login → start password sign-in, Supabase redirects to /auth/callback
module.exports.login = async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return res.render("users/login", {
      error: error?.message || "Invalid credentials",
      formData: { email },
    });
  }

  const supaUser = data.user;

  // Save session
  req.session.user = {
    id: supaUser.id,
    email: supaUser.email,
    name: supaUser.user_metadata?.full_name || supaUser.email,
    avatar: supaUser.user_metadata?.avatar_url || null,
  };

  // Upsert into Mongo
  await User.findByIdAndUpdate(
    supaUser.id,
    {
      _id: supaUser.id,
      email: supaUser.email,
      name: supaUser.user_metadata?.full_name || supaUser.email,
      avatarUrl: supaUser.user_metadata?.avatar_url || null,
    },
    { upsert: true, new: true }
  );

  req.flash("success", `Welcome back ${req.session.user.name}!`);
  res.redirect("/campgrounds");
};

// Logout
module.exports.logout = async (req, res) => {
  await supabase.auth.signOut();
  req.session.destroy();
  res.redirect("/");
};
