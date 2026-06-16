import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, BookOpen } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.error) throw res.error;

      // Dynamic redirect flow based on system role
      const role = res.data.user?.email === "teacher@school.gov.sl" ? "Teacher" : 
                    res.data.user?.email === "parent@school.gov.sl" ? "Parent" : "Principal";

      if (role === "Teacher") {
        navigate('/attendance');
      } else if (role === "Parent") {
        navigate('/profile/502');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 w-full">
      <div className="md:w-1/2 bg-blue-600 p-12 text-white flex flex-col justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <BookOpen size={24} />
          </div>
          <span className="font-bold text-2xl tracking-wide">SchoolTrackSL</span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">
            Sierra Leone National School Administration & Attendance Ledger
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Transitioning secondary school administrative processes from manual registers to secure, centralized Digital Public Infrastructure.
          </p>
        </div>
        <p className="text-xs text-blue-200">
          Aligned with SDG 4 (Quality Education) and the Sierra Leone Ministry of Basic and Senior Secondary Education (MBSSE) standards.
        </p>
      </div>

      <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
          <p className="text-gray-500 mb-8">Access school management records</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-3">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">School Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g., principal@school.gov.sl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Secure Passcode</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Decrypting & Verifying...' : 'Access Portal'}
            </button>
          </form>

          <div className="mt-12 pt-6 border-t border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
              Legal Compliance & Data Protection Notice
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              This system processes Personally Identifiable Information (PII) of Sierra Leonean secondary school students under national education guidelines. Authorized access is restricted strictly to designated administrators. Any unauthorized access, extraction, or processing of this record ledger is subject to enforcement and legal action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}