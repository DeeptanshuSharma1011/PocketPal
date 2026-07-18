import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { supabase } from "../supabaseClient.js";
import { User, Mail, Key, Eye, EyeOff, ShieldCheck } from "lucide-react";

export const RegisterView: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setErrorMsg("Please fill in all mandatory onboarding fields.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim()
          },
          emailRedirectTo: window.location.origin + "/login"
        }
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // Redirect the user to the Sign In page with email and state, do NOT auto-login
      navigate("/login", {
        state: {
          email: email.trim(),
          justSignedUp: true
        }
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-slate-50 relative overflow-hidden">
      
      {/* Decorative ambient elements */}
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-teal-100/30 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-emerald-100/20 rounded-full blur-3xl -z-10" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 space-y-6 animate-fade-in">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-teal-600 text-white rounded-2xl flex items-center justify-center font-extrabold text-xl mx-auto shadow-md shadow-teal-600/20">
            P
          </div>
          <h2 className="font-display font-extrabold text-slate-900 text-2xl tracking-tight">Create Account</h2>
          <p className="text-slate-500 text-xs">Join PocketPal and take command of your spending</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl font-medium">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/40 focus:bg-white border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Email input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/40 focus:bg-white border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Password Inputs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Key size={14} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-800 outline-hidden transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Confirm</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <ShieldCheck size={14} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-800 outline-hidden transition-all"
                />
              </div>
            </div>
          </div>

          {/* Toggle Password visibility link */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[10px] text-teal-600 hover:underline font-semibold"
            >
              {showPassword ? "Hide Passwords" : "Show Passwords"}
            </button>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-3 rounded-xl text-xs font-semibold shadow-md shadow-teal-600/10 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
          >
            {loading ? "Creating SaaS Workspace..." : "Register New Account"}
          </button>
        </form>

        {/* Footer Nav Links */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already have a PocketPal workspace?{" "}
            <Link to="/login" className="text-teal-600 font-bold hover:underline">
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
