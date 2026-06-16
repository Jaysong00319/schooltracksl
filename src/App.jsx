import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyRoll from './pages/DailyRoll';
import StudentProfile from './pages/StudentProfile';
import { LogOut, BookOpen } from 'lucide-react';

const Navigation = () => {
  const { profile, logout } = useAuth();
  
  return (
    <nav className="bg-white border-b border-gray-200 px-10 py-4 flex items-center justify-between w-full">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 text-white p-2 rounded-lg">
          <BookOpen size={20} />
        </div>
        <span className="font-bold text-xl text-gray-800">SchoolTrackSL</span>
      </div>
      
      <div className="flex items-center space-x-6">
        <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium transition">Home</Link>
        {profile?.System_Role !== 'Parent' && (
          <Link to="/attendance" className="text-gray-600 hover:text-blue-600 font-medium transition">Attendance</Link>
        )}
        <Link to="/profile/502" className="text-gray-600 hover:text-blue-600 font-medium transition">Reports</Link>
        
        <div className="h-6 w-px bg-gray-200"></div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800">{profile?.First_Name} {profile?.Last_Name}</p>
            <p className="text-xs text-gray-500">Role: {profile?.System_Role || 'User'}</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 transition"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

// Dynamic Home Router: Automatically serves the correct interface on "/"
const HomeRouter = () => {
  const { profile } = useAuth();

  if (profile?.System_Role === 'Teacher') {
    return <DailyRoll />;
  }
  if (profile?.System_Role === 'Parent') {
    return <StudentProfile />;
  }
  return <Dashboard />;
};

const ProtectedLayout = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile?.System_Role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <Navigation />
      <main className="flex-1 w-full px-10 py-8">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedLayout>
              <HomeRouter />
            </ProtectedLayout>
          } />
          <Route path="/attendance" element={
            <ProtectedLayout allowedRoles={['Principal', 'Teacher']}>
              <DailyRoll />
            </ProtectedLayout>
          } />
          <Route path="/profile/:studentId" element={
            <ProtectedLayout>
              <StudentProfile />
            </ProtectedLayout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;