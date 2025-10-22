import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';

interface DashboardProps {
  onLogout: () => void;
}

interface SectionStat {
  section_id: string;
  section_title: string;
  year_term: string;
  starts: number;
  completions: number;
}

interface StudentDetail {
  id: string;
  full_name: string;
  finished_at: string | null;
  score: number | null;
  hints: number | null;
}

type SortKey = 'finished_at' | 'score' | 'full_name';
type SortDirection = 'asc' | 'desc';

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [sectionStats, setSectionStats] = useState<SectionStat[]>([]);
  const [selectedSection, setSelectedSection] = useState<SectionStat | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentDetail[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('finished_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchSectionStats = useCallback(async () => {
    setIsLoadingSections(true);
    setError(null);

    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('section_id, section_title, year_term')
      .eq('enabled', true)
      .order('year_term', { ascending: false })
      .order('section_title', { ascending: true });

    if (sectionsError) {
      console.error(sectionsError);
      setError('Failed to fetch sections. Check RLS policies.');
      setIsLoadingSections(false);
      return;
    }

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('section_id, finished_at');

    if (studentsError) {
      console.error(studentsError);
      setError('Failed to fetch student data. Check RLS policies.');
      setIsLoadingSections(false);
      return;
    }

    const stats = sections.map(section => {
      const sectionStudents = students.filter(s => s.section_id === section.section_id);
      const completions = sectionStudents.filter(s => s.finished_at !== null).length;
      return {
        ...section,
        starts: sectionStudents.length,
        completions: completions,
      };
    });

    setSectionStats(stats);
    setIsLoadingSections(false);
  }, []);

  const fetchStudentDetails = useCallback(async (sectionId: string) => {
    setIsLoadingDetails(true);
    setError(null);
    setStudentDetails([]);

    const { data, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, finished_at, evaluations ( score, hints )')
      .eq('section_id', sectionId);

    if (studentError) {
      console.error(studentError);
      setError('Failed to load student details. Check RLS policies.');
    } else {
      const formattedDetails = data.map(student => ({
        id: student.id,
        full_name: student.full_name,
        finished_at: student.finished_at,
        score: student.evaluations[0]?.score ?? null,
        hints: student.evaluations[0]?.hints ?? null,
      }));
      setStudentDetails(formattedDetails);
    }
    setIsLoadingDetails(false);
  }, []);

  useEffect(() => {
    fetchSectionStats();
  }, [fetchSectionStats]);

  useEffect(() => {
    if (selectedSection) {
      fetchStudentDetails(selectedSection.section_id);
    }
  }, [selectedSection, fetchStudentDetails]);

  const handleSectionClick = (section: SectionStat) => {
    setSelectedSection(section);
    setSortKey('finished_at');
    setSortDirection('desc');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'full_name' ? 'asc' : 'desc');
    }
  };

  const sortedStudentDetails = useMemo(() => {
    return [...studentDetails].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === null) return 1;
      if (valB === null) return -1;
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [studentDetails, sortKey, sortDirection]);

  const SortableHeader = ({ label, sortableKey }: { label: string; sortableKey: SortKey }) => (
    <th
      onClick={() => handleSort(sortableKey)}
      className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {sortKey === sortableKey && (
          <svg className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M5.22 9.22a.75.75 0 011.06 0L10 12.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 10.28a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </th>
  );
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="flex-shrink-0 flex justify-between items-center px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Instructor Dashboard</h1>
        <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-md hover:bg-gray-100">
          <span>Sign Out</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-80 flex-shrink-0 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 px-2 pb-2 mb-2 border-b">Course Sections</h2>
          {isLoadingSections ? (
            <div className="text-center p-4 text-gray-500">Loading sections...</div>
          ) : (
            <ul className="space-y-1">
              {sectionStats.map(section => (
                <li key={section.section_id}>
                  <button
                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedSection?.section_id === section.section_id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSectionClick(section)}
                  >
                    <div className={`font-semibold ${selectedSection?.section_id === section.section_id ? 'text-blue-900' : 'text-gray-800'}`}>{section.section_title}</div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className={`${selectedSection?.section_id === section.section_id ? 'text-blue-700' : 'text-gray-500'}`}>{section.completions} / {section.starts} completed</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedSection?.section_id === section.section_id ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>{section.year_term}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <main className="flex-1 p-6 overflow-y-auto">
          {error && <p className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-lg">{error}</p>}
          {!selectedSection ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-4 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              <p className="text-lg font-medium text-gray-700">Select a section</p>
              <p>Choose a course section from the sidebar to view student details.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-gray-900">{selectedSection.section_title}</h2>
                <p className="text-sm text-gray-500">{selectedSection.year_term}</p>
              </div>
              <div>
                {isLoadingDetails ? (
                  <div className="p-6 text-center text-gray-500">Loading student data...</div>
                ) : !studentDetails.length ? (
                   <div className="p-6 text-center text-gray-500">No students have started the simulation for this section yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <SortableHeader label="Student Name" sortableKey="full_name" />
                          <SortableHeader label="Score" sortableKey="score" />
                          <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hints</th>
                          <SortableHeader label="Completion Time" sortableKey="finished_at" />
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedStudentDetails.map(student => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.full_name}</td>
                            <td className="p-4 whitespace-nowrap text-sm">{student.score !== null ? `${student.score} / 15` : <span className="text-gray-400">N/A</span>}</td>
                            <td className="p-4 whitespace-nowrap text-sm">{student.hints !== null ? student.hints : <span className="text-gray-400">N/A</span>}</td>
                            <td className="p-4 whitespace-nowrap text-sm">{student.finished_at ? new Date(student.finished_at).toLocaleString() : <span className="text-gray-500 font-medium">Not Completed</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;