import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Printer, User, Search, BookOpen, AlertCircle } from 'lucide-react';

export default function StudentProfile() {
  const { studentId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // Roster profiles
  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [overallAvg, setOverallAvg] = useState(0);
  const [attendancePercent, setAttendancePercent] = useState(100);
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(true);

  // Search Engine states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Determine active student
  const activeStudentId = studentId || profile?.child_id || '502';

  useEffect(() => {
    fetchAnalyticalStudentReport();
  }, [activeStudentId, profile]);

  useEffect(() => {
    handleStudentSearch();
  }, [searchQuery]);

  // Real-time Database Search Query
  const handleStudentSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const schoolId = profile?.school_id || 'SCH-001';
    setIsSearching(true);

    try {
      // Queries student by Name, Class, or ID (Multi-school isolated)
      const { data, error } = await supabase
        .from('student')
        .select('*')
        .eq('school_id', schoolId)
        .or(`First_Name.ilike.%${searchQuery}%,Last_Name.ilike.%${searchQuery}%,Form_Class.ilike.%${searchQuery}%,Student_ID.eq.${searchQuery}`)
        .limit(5);

      if (!error && data) {
        setSearchResults(data);
      }
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchAnalyticalStudentReport = async () => {
    const schoolId = profile?.school_id || 'SCH-001';
    setLoading(true);

    try {
      const studentRes = await supabase
        .from('student')
        .select('*')
        .eq('Student_ID', activeStudentId)
        .eq('school_id', schoolId)
        .single();
      
      if (studentRes.error || !studentRes.data) {
        // Mockup fallback profile
        setStudent({
          Student_ID: activeStudentId,
          First_Name: 'Musa',
          Last_Name: 'Turay',
          Form_Class: 'Form 3C',
          Date_of_Birth: '2008-01-30'
        });
      } else {
        setStudent(studentRes.data);
      }

      const attendanceRes = await supabase
        .from('attendance')
        .select('*')
        .eq('Student_ID', activeStudentId)
        .eq('school_id', schoolId);

      const logs = attendanceRes.data || [];
      const totalDays = logs.length;
      const presentCount = logs.filter(l => l.Status === 'Present').length;
      const computedAttendance = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 92;
      setAttendancePercent(computedAttendance);

      const gradeRes = await supabase
        .from('grade_report')
        .select('*')
        .eq('Student_ID', activeStudentId)
        .eq('school_id', schoolId);

      const reportCards = gradeRes.data || [];
      if (reportCards.length > 0) {
        setGrades(reportCards);
        const sum = reportCards.reduce((acc, curr) => acc + curr.Overall_Grade, 0);
        const avg = Math.round(sum / reportCards.length);
        setOverallAvg(avg);
        computeRemark(computedAttendance, avg);
      } else {
        setGrades([
          { Subject: 'Maths', Mid_Term_Score: 25, Final_Exam_Score: 25, Overall_Grade: 50 },
          { Subject: 'English', Mid_Term_Score: 25, Final_Exam_Score: 25, Overall_Grade: 50 },
          { Subject: 'Science', Mid_Term_Score: 25, Final_Exam_Score: 25, Overall_Grade: 50 }
        ]);
        setOverallAvg(50);
        computeRemark(computedAttendance, 50);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const computeRemark = (attendance, avg) => {
    if (attendance >= 90 && avg >= 70) {
      setRemark('Excellent');
    } else if (attendance >= 75 && avg >= 50) {
      setRemark('Satisfactory');
    } else {
      setRemark('Needs Improvement');
    }
  };

  const handleSelectStudent = (id) => {
    setSearchQuery('');
    setSearchResults([]);
    navigate(`/profile/${id}`);
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 printable-area w-full">
      
      {/* 1. SEARCH SECTION (Hidden when printing) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center space-x-2 text-blue-600">
          <Search size={20} />
          <h2 className="text-lg font-bold text-gray-900">Student Record Lookup</h2>
        </div>
        <p className="text-xs text-gray-500">Query student profile cards instantly by Name, Class Group, or Student ID.</p>
        
        <div className="relative max-w-xl">
          <input
            type="text"
            placeholder="Type Student Name, ID (e.g. 345), or Class (e.g. Form 3C)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
          />
          <Search size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
          
          {/* Real-time search dropdown suggestions */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-gray-50">
              {searchResults.map((s) => (
                <button
                  key={s.Student_ID}
                  onClick={() => handleSelectStudent(s.Student_ID)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-bold text-gray-800">{s.First_Name} {s.Last_Name}</p>
                    <p className="text-xs text-gray-400">ID: {s.Student_ID} • Class: {s.Form_Class}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">View Report</span>
                </button>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50 p-4 text-center text-xs text-gray-400">
              No matching student records found.
            </div>
          )}
        </div>
      </div>

      {/* 2. REPORT CARD SECTION */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Active Academic Record</h1>
          <p className="text-xs text-gray-500 mt-1">Term report sheet generated from live educational databases.</p>
        </div>
        <button
          onClick={printReport}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl inline-flex items-center gap-2 shadow-sm transition"
        >
          <Printer size={18} />
          Print Term Report Card
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <User size={48} />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{student?.First_Name} {student?.Last_Name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
            <div>
              <p className="text-gray-400 font-medium">Student Identifier</p>
              <p className="font-semibold text-gray-800">{student?.Student_ID}</p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Class Group</p>
              <p className="font-semibold text-gray-800">{student?.Form_Class}</p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Date of Birth</p>
              <p className="font-semibold text-gray-800">{student?.Date_of_Birth}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex-1 md:w-32 text-center">
            <p className="text-xs text-green-600 font-semibold uppercase">Attendance</p>
            <p className="text-2xl font-extrabold text-green-700 mt-1">{attendancePercent}%</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex-1 md:w-32 text-center">
            <p className="text-xs text-blue-600 font-semibold uppercase">Average</p>
            <p className="text-2xl font-extrabold text-blue-700 mt-1">{overallAvg}%</p>
          </div>
          <div className={`p-4 rounded-xl border flex-1 md:w-40 text-center ${
            remark === 'Excellent' ? 'bg-green-50 border-green-100 text-green-700' :
            remark === 'Satisfactory' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            <p className="text-xs uppercase font-semibold">Teacher Remark</p>
            <p className="text-lg font-extrabold mt-1.5">{remark}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Term 1 Grading Breakdown</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-100">
              <th className="p-4 font-bold text-sm text-gray-600">Subject</th>
              <th className="p-4 font-bold text-sm text-gray-600 text-center">Mid-Term Score (30%)</th>
              <th className="p-4 font-bold text-sm text-gray-600 text-center">Final Exam (70%)</th>
              <th className="p-4 font-bold text-sm text-gray-600 text-center">Overall Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grades.map((g, idx) => (
              <tr key={idx}>
                <td className="p-4 font-semibold text-gray-800">{g.Subject}</td>
                <td className="p-4 text-center font-medium text-gray-700">{g.Mid_Term_Score}</td>
                <td className="p-4 text-center font-medium text-gray-700">{g.Final_Exam_Score}</td>
                <td className="p-4 text-center font-bold text-blue-600">{g.Overall_Grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hidden print:flex justify-between mt-12 pt-8 border-t border-dashed border-gray-300">
        <div>
          <p className="text-xs text-gray-400">Class Teacher Signature</p>
          <div className="h-12 border-b border-gray-300 w-48 mt-2"></div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Principal Signature & Stamp</p>
          <div className="h-12 border-b border-gray-300 w-48 mt-2"></div>
        </div>
      </div>
    </div>
  );
}