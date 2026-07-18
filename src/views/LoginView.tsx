import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { supabase } from "../supabaseClient.js";
import { Key, Mail, Eye, EyeOff, Sparkles, Database } from "lucide-react";

export const LoginView: React.FC = () => {
  const { login, isDbConnected } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve signUp redirect state
  const signupState = location.state as { email?: string; justSignedUp?: boolean } | null;

  const [email, setEmail] = useState(signupState?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState(
    signupState?.justSignedUp
      ? "Your account has been created. Please check your email and verify your address before logging in."
      : ""
  );

  const handleDemoLogin = async () => {
    setEmail("demo@pocketpal.com");
    setPassword("password123");
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email: "demo@pocketpal.com",
        password: "password123",
      });

      if (error && (error.message.includes("Invalid login credentials") || error.message.includes("not found") || error.status === 400)) {
        // Try to register demo user automatically if it doesn't exist yet
        const signupRes = await supabase.auth.signUp({
          email: "demo@pocketpal.com",
          password: "password123",
          options: {
            data: { name: "Demo User" }
          }
        });
        
        if (signupRes.error) {
          setErrorMsg(signupRes.error.message);
          setLoading(false);
          return;
        }
        
        const retry = await supabase.auth.signInWithPassword({
          email: "demo@pocketpal.com",
          password: "password123",
        });
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        const suUser = data.session.user;
        const mappedUser = {
          id: suUser.id as any,
          email: suUser.email || "",
          name: suUser.user_metadata?.name || "Demo User",
          monthly_income: suUser.user_metadata?.monthly_income || 5000,
          currency: suUser.user_metadata?.currency || "USD",
          profile_picture: suUser.user_metadata?.profile_picture || null,
        };
        login(mappedUser, data.session.access_token, data.session.refresh_token || "");
        navigate("/");
      } else {
        setErrorMsg("Check your email and confirm your account before logging in.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data.session) {
        const suUser = data.session.user;
        const mappedUser = {
          id: suUser.id as any,
          email: suUser.email || "",
          name: suUser.user_metadata?.name || suUser.email?.split("@")[0] || "User",
          monthly_income: suUser.user_metadata?.monthly_income || 0,
          currency: suUser.user_metadata?.currency || "USD",
          profile_picture: suUser.user_metadata?.profile_picture || null,
        };
        login(mappedUser, data.session.access_token, data.session.refresh_token || "");
        navigate("/");
      } else {
        setErrorMsg("Check your email and confirm your account before logging in.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-slate-50 relative overflow-hidden">
      
      {/* Decorative ambient elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-teal-100/40 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-100/30 rounded-full blur-3xl -z-10" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 space-y-6 animate-fade-in">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-teal-600 text-white rounded-2xl flex items-center justify-center font-extrabold text-xl mx-auto shadow-md shadow-teal-600/20">
            P
          </div>
          <h2 className="font-display font-extrabold text-slate-900 text-2xl tracking-tight">PocketPal Login</h2>
          <p className="text-slate-500 text-xs">Enter your details to manage your personal finances</p>
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

          {/* Password Input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-600">Secure Password</label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Key size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/40 focus:bg-white border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2.5 pl-10 pr-10 text-xs text-slate-800 outline-hidden transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-3 rounded-xl text-xs font-semibold shadow-md shadow-teal-600/10 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
          >
            {loading ? "Authenticating Session..." : "Secure Log In"}
          </button>
        </form>

        {/* Footer Nav Links */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-teal-600 font-bold hover:underline">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
