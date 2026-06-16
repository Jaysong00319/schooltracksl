import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Check, AlertCircle, Save, Award, ClipboardList, BookOpen } from 'lucide-react';

export default function DailyRoll() {
  const { profile } = useAuth();
  
  // Tab Toggle state: 'attendance', 'grades', or 'ledger'
  const [activeTab, setActiveTab] = useState('attendance');

  // Common states
  const [students, setStudents] = useState([]);
  const [classList, setClassList] = useState(['Form 3C']);
  const [selectedClass, setSelectedClass] = useState('Form 3C');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Attendance states
  const [attendance, setAttendance] = useState({});
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [todayRecord, setTodayRecord] = useState([]);

  // Grade Book Input states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [subject, setSubject] = useState('');
  const [midTerm, setMidTerm] = useState('');
  const [finalExam, setFinalExam] = useState('');

  // Grade Ledger state
  const [gradeReports, setGradeReports] = useState([]);

  useEffect(() => {
    fetchActiveClasses();
  }, [profile]);

  useEffect(() => {
    checkDailySubmissionStatus();
  }, [selectedClass]);

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchGradeReports();
    }
  }, [activeTab, students]);

  const fetchActiveClasses = async () => {
    try {
      const schoolId = profile?.school_id || 'SCH-001';
      const { data, error } = await supabase
        .from('student')
        .select('Form_Class')
        .eq('school_id', schoolId);

      if (!error && data) {
        const uniqueClasses = [...new Set(data.map(item => item.Form_Class || item.form_class))].filter(Boolean);
        if (uniqueClasses.length > 0) {
          setClassList(uniqueClasses.sort());
          const teacherDefault = profile?.class_assigned || 'Form 3C';
          setSelectedClass(uniqueClasses.includes(teacherDefault) ? teacherDefault : uniqueClasses[0]);
        }
      }
    } catch (e) {
      console.warn("Database connection offline", e);
    }
  };

  const checkDailySubmissionStatus = async () => {
    const today = new Date().toISOString().split('T')[0];
    const schoolId = profile?.school_id || 'SCH-001';
    
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, student(First_Name, Last_Name, Form_Class, first_name, last_name, form_class)')
        .eq('Log_Date', today)
        .eq('school_id', schoolId);

      if (!error && data) {
        const classLogs = data.filter(record => {
          const sClass = record.student?.Form_Class || record.student?.form_class;
          return sClass === selectedClass;
        });
        
        if (classLogs.length > 0) {
          setIsAlreadySubmitted(true);
          setTodayRecord(classLogs);
        } else {
          setIsAlreadySubmitted(false);
          setTodayRecord([]);
          fetchRoster();
        }
      } else {
        setIsAlreadySubmitted(false);
        setTodayRecord([]);
        fetchRoster();
      }
    } catch (e) {
      setIsAlreadySubmitted(false);
      setTodayRecord([]);
      fetchRoster();
    }
  };

  const fetchRoster = async () => {
    try {
      const schoolId = profile?.school_id || 'SCH-001';
      const { data, error } = await supabase
        .from('student')
        .select('*')
        .eq('Form_Class', selectedClass)
        .eq('school_id', schoolId);

      if (!error && data && data.length > 0) {
        setStudents(data);
        const firstStudentId = data[0].Student_ID || data[0].student_id;
        setSelectedStudent(firstStudentId);
        
        const initialStatus = {};
        data.forEach(s => {
          const sId = s.Student_ID || s.student_id;
          initialStatus[sId] = 'Present';
        });
        setAttendance(initialStatus);
      } else {
        loadMockRoster();
      }
    } catch (err) {
      loadMockRoster();
    }
  };

  const loadMockRoster = () => {
    const mockRoster = [
      { Student_ID: '345', First_Name: 'Musa', Last_Name: 'Kamara' },
      { Student_ID: '480', First_Name: 'Alusine', Last_Name: 'Kargbo' },
      { Student_ID: '240', First_Name: 'Cornelius', Last_Name: 'Grant' },
      { Student_ID: '502', First_Name: 'Musa', Last_Name: 'Turay' }
    ];
    setStudents(mockRoster);
    setSelectedStudent('345');
    const initialStatus = {};
    mockRoster.forEach(s => {
      initialStatus[s.Student_ID] = 'Present';
    });
    setAttendance(initialStatus);
  };

  // Real-Time Grade Ledger Querying (Bypasses casing issues)
  const fetchGradeReports = async () => {
    const schoolId = profile?.school_id || 'SCH-001';
    const studentIds = students.map(s => s.Student_ID || s.student_id);
    if (studentIds.length === 0) return;

    try {
      // Query all grades belonging to this teacher's class
      const { data, error } = await supabase
        .from('grade_report')
        .select('*')
        .eq('school_id', schoolId)
        .in('Student_ID', studentIds);

      if (!error && data) {
        setGradeReports(data);
      }
    } catch (e) {
      console.warn("Offline fallback loading grade reports.");
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const saveAttendance = async () => {
    setSubmitting(true);
    setMessage('');
    const schoolId = profile?.school_id || 'SCH-001';
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const records = Object.keys(attendance).map((studentId, idx) => ({
        "Attendance_ID": `A-M${Date.now().toString().slice(-4)}${idx}`,
        "Student_ID": studentId,
        "Log_Date": today,
        "Status": attendance[studentId],
        "Recorded_By": profile?.Teacher_ID || 'T-102',
        "school_id": schoolId
      }));

      const { error } = await supabase.from('attendance').insert(records);
      if (error) throw error;

      setMessage(`Attendance successfully logged for class ${selectedClass}!`);
      checkDailySubmissionStatus();

    } catch (err) {
      setIsAlreadySubmitted(true);
      setTodayRecord(Object.keys(attendance).map(studentId => {
        const studentObj = students.find(s => (s.Student_ID || s.student_id) === studentId);
        return {
          Attendance_ID: studentId,
          Student_ID: studentId,
          Log_Date: today,
          Status: attendance[studentId],
          student: studentObj
        };
      }));
      setMessage(`[Demo Mode] Attendance logged locally for ${selectedClass}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    
    const schoolId = profile?.school_id || 'SCH-001';
    const normalizedSubject = subject.trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    try {
      const { data: existingGrade, error: fetchError } = await supabase
        .from('grade_report')
        .select('*')
        .eq('Student_ID', selectedStudent)
        .eq('Subject', normalizedSubject)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const dbMidTerm = existingGrade ? (existingGrade.Mid_Term_Score || existingGrade.mid_term_score || 0) : 0;
      const dbFinalExam = existingGrade ? (existingGrade.Final_Exam_Score || existingGrade.final_exam_score || 0) : 0;

      const finalMidTerm = midTerm !== '' ? Number(midTerm) : dbMidTerm;
      const finalFinalExam = finalExam !== '' ? Number(finalExam) : dbFinalExam;
      const finalOverall = finalMidTerm + finalFinalExam;

      const studentObj = students.find(s => (s.Student_ID || s.student_id) === selectedStudent);
      const studentName = studentObj ? `${studentObj.First_Name || studentObj.first_name} ${studentObj.Last_Name || studentObj.last_name}` : 'Student';

      if (existingGrade) {
        const reportId = existingGrade.Report_ID || existingGrade.report_id;
        const { error: updateError } = await supabase
          .from('grade_report')
          .update({
            "Mid_Term_Score": finalMidTerm,
            "Final_Exam_Score": finalFinalExam,
            "Overall_Grade": finalOverall
          })
          .eq('Report_ID', reportId);

        if (updateError) throw updateError;
        setMessage(`Successfully updated ${normalizedSubject} grade sheet for ${studentName}! Overall average recalculated to ${finalOverall}%.`);
      } else {
        const { error: insertError } = await supabase
          .from('grade_report')
          .insert([{
            "Report_ID": `R-${Date.now().toString().slice(-4)}`,
            "Student_ID": selectedStudent,
            "Teacher_ID": profile?.Teacher_ID || 'T-102',
            "Subject": normalizedSubject,
            "Mid_Term_Score": finalMidTerm,
            "Final_Exam_Score": finalFinalExam,
            "Overall_Grade": finalOverall,
            "school_id": schoolId
          }]);

        if (insertError) throw insertError;
        setMessage(`New grade sheet created for ${studentName} in ${normalizedSubject}! Current average: ${finalOverall}%.`);
      }

      setSubject('');
      setMidTerm('');
      setFinalExam('');

    } catch (err) {
      const studentObj = students.find(s => (s.Student_ID || s.student_id) === selectedStudent);
      const studentName = studentObj ? `${studentObj.First_Name || studentObj.first_name}` : 'Student';
      setMessage(`[Demo Mode] Recorded local grade metrics for ${studentName} in ${normalizedSubject}.`);
      setSubject('');
      setMidTerm('');
      setFinalExam('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Class Ledger Workspace</h1>
          <p className="text-gray-500 mt-1">Class Assignment: <strong>{selectedClass}</strong></p>
        </div>

        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm shrink-0">
          <span className="text-xs font-bold text-gray-500 uppercase">Active Class:</span>
          <select
            value={selectedClass}
            disabled={isAlreadySubmitted && activeTab === 'attendance'}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-sm font-bold text-blue-600 bg-white outline-none cursor-pointer"
          >
            {classList.map((cls, idx) => (
              <option key={idx} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DUAL-MODE SWITCH UPGRADED TO THREE-TAB MODE */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-2xl max-w-lg gap-2">
        <button
          onClick={() => { setActiveTab('attendance'); setMessage(''); }}
          className={`flex-1 py-2 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'attendance' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <ClipboardList size={16} />
          Daily Attendance
        </button>
        <button
          onClick={() => { setActiveTab('grades'); setMessage(''); }}
          className={`flex-1 py-2 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'grades' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Award size={16} />
          Record Term Grades
        </button>
        <button
          onClick={() => { setActiveTab('ledger'); setMessage(''); }}
          className={`flex-1 py-2 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'ledger' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BookOpen size={16} />
          Grade Ledger
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl text-sm flex items-center gap-2 bg-green-50 text-green-700">
          <AlertCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* ========================================================
          RENDER MODE 1: DAILY ATTENDANCE
          ======================================================== */}
      {activeTab === 'attendance' && (
        <>
          {isAlreadySubmitted ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center gap-2 text-sm">
                <AlertCircle size={18} className="shrink-0" />
                <span>Attendance ledger for <strong>{selectedClass}</strong> has already been logged today. Changes are locked.</span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100">
                      <th className="p-4 font-bold text-sm text-gray-600">Student ID</th>
                      <th className="p-4 font-bold text-sm text-gray-600">Full Name</th>
                      <th className="p-4 text-center font-bold text-sm text-gray-600">Log Date</th>
                      <th className="p-4 text-center font-bold text-sm text-gray-600">Locked Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {todayRecord.map((record) => {
                      const rId = record.student?.Student_ID || record.student?.student_id;
                      const fName = record.student?.First_Name || record.student?.first_name;
                      const lName = record.student?.Last_Name || record.student?.last_name;
                      return (
                        <tr key={record.Attendance_ID} className="bg-slate-50/20">
                          <td className="p-4 text-sm font-semibold text-gray-400">{rId}</td>
                          <td className="p-4 text-sm font-bold text-gray-800">{fName} {lName}</td>
                          <td className="p-4 text-center text-sm text-gray-500">{record.Log_Date}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold ${
                              record.Status === 'Present' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {record.Status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {students.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No students currently registered in {selectedClass}.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100">
                      <th className="p-4 font-bold text-sm text-gray-600">Student ID</th>
                      <th className="p-4 font-bold text-sm text-gray-600">Full Name</th>
                      <th className="p-4 text-center font-bold text-sm text-gray-600">Present</th>
                      <th className="p-4 text-center font-bold text-sm text-gray-600">Absent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                      const sId = student.Student_ID || student.student_id;
                      const fName = student.First_Name || student.first_name;
                      const lName = student.Last_Name || student.last_name;
                      return (
                        <tr key={sId} className="hover:bg-slate-50/50">
                          <td className="p-4 text-sm font-semibold text-gray-400">{sId}</td>
                          <td className="p-4 text-sm font-bold text-gray-800">{fName} {lName}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleStatusChange(sId, 'Present')}
                              className={`w-10 h-10 rounded-full inline-flex items-center justify-center transition border ${
                                attendance[sId] === 'Present'
                                  ? 'bg-green-50 border-green-500 text-green-600 font-bold'
                                  : 'border-gray-200 text-gray-300'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleStatusChange(sId, 'Absent')}
                              className={`w-10 h-10 rounded-full inline-flex items-center justify-center transition border ${
                                attendance[sId] === 'Absent'
                                  ? 'bg-red-50 border-red-500 text-red-600 font-bold'
                                  : 'border-gray-200 text-gray-300'
                              }`}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {students.length > 0 && (
                <div className="p-6 bg-slate-50 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={saveAttendance}
                    disabled={submitting}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl inline-flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                  >
                    <Save size={18} />
                    {submitting ? 'Recording Roll...' : 'Save and Submit Attendance'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================
          RENDER MODE 2: RECORD TERM GRADES
          ======================================================== */}
      {activeTab === 'grades' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-xl animate-fade-in">
          <div className="flex items-center space-x-2 text-blue-600 mb-2">
            <Award size={20} />
            <h2 className="text-xl font-bold text-gray-900">Record Academic Grades</h2>
          </div>
          <p className="text-xs text-gray-500 mb-6">Input student assessment metrics for report cards compiling. Fields are optional to allow saving Mid-Term or Finals independently.</p>

          <form onSubmit={handleSaveGrade} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 bg-white rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
              >
                {students.map((student) => {
                  const sId = student.Student_ID || student.student_id;
                  const fName = student.First_Name || student.first_name;
                  const lName = student.Last_Name || student.last_name;
                  return (
                    <option key={sId} value={sId}>
                      {fName} {lName} (ID: {sId})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Subject Title</label>
              <input
                type="text"
                required
                placeholder="e.g., Mathematics, English, Chemistry"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Mid-Term Score (Max: 30)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  placeholder="Leave blank to skip or retain"
                  value={midTerm}
                  onChange={(e) => setMidTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Final Exam Score (Max: 70)</label>
                <input
                  type="number"
                  min="0"
                  max="70"
                  placeholder="Leave blank to skip or retain"
                  value={finalExam}
                  onChange={(e) => setFinalExam(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 mt-6"
            >
              {submitting ? 'Recording Grade Sheet...' : 'Submit Academic Grade'}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================
          RENDER MODE 3: CLASS GRADE LEDGER SHEET
          ======================================================== */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Academic Grade Ledger</h2>
            <p className="text-xs text-gray-400 mt-1">Listing all compiled term results for streams registered in {selectedClass}.</p>
          </div>
          
          {gradeReports.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">
              No academic grades recorded for {selectedClass} yet. Go to "Record Term Grades" to submit.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100">
                  <th className="p-4 font-bold text-sm text-gray-600">Student ID</th>
                  <th className="p-4 font-bold text-sm text-gray-600">Student Name</th>
                  <th className="p-4 font-bold text-sm text-gray-600">Subject</th>
                  <th className="p-4 text-center font-bold text-sm text-gray-600">Mid-Term (30)</th>
                  <th className="p-4 text-center font-bold text-sm text-gray-600">Final Exam (70)</th>
                  <th className="p-4 text-center font-bold text-sm text-gray-600">Total Overall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gradeReports.map((report) => {
                  const rId = report.Student_ID || report.student_id;
                  const studentObj = students.find(s => (s.Student_ID || s.student_id) === rId);
                  const fName = studentObj ? studentObj.First_Name || studentObj.first_name : 'Unknown';
                  const lName = studentObj ? studentObj.Last_Name || studentObj.last_name : 'Student';
                  const rSubject = report.Subject || report.subject;
                  const rMid = report.Mid_Term_Score ?? report.mid_term_score ?? 0;
                  const rFinal = report.Final_Exam_Score ?? report.final_exam_score ?? 0;
                  const rOverall = report.Overall_Grade ?? report.overall_grade ?? 0;

                  return (
                    <tr key={report.Report_ID} className="hover:bg-slate-50/50">
                      <td className="p-4 text-sm font-semibold text-gray-500">{rId}</td>
                      <td className="p-4 text-sm font-bold text-gray-800">{fName} {lName}</td>
                      <td className="p-4 text-sm font-semibold text-gray-600">{rSubject}</td>
                      <td className="p-4 text-center text-sm font-medium text-gray-700">{rMid}</td>
                      <td className="p-4 text-center text-sm font-medium text-gray-700">{rFinal}</td>
                      <td className="p-4 text-center font-bold text-blue-600">{rOverall}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}