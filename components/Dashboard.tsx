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
    <th onClick={() => handleSort(sortableKey)} className="sortable-header">
      <span>{label}</span>
      {sortKey === sortableKey && (
        <svg className={`sort-icon ${sortDirection}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V3.75A.75.75 0 0110 3z" />
          <path fillRule="evenodd" d="M5.75 9a.75.75 0 01.75-.75h7a.75.75 0 010 1.5h-7a.75.75 0 01-.75-.75zM10 15.5a.75.75 0 01.75.75v.01a.75.75 0 01-1.5 0V16.25a.75.75 0 01.75-.75z" transform="rotate(180 10 10)" />
          <path d="M14.25 9.75a.75.75 0 000-1.5h-8.5a.75.75 0 000 1.5h8.5z" />
          <path d="M10 16.25a.75.75 0 01.75-.75h.01a.75.75 0 010 1.5H10.75a.75.75 0 01-.75-.75z" />
          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.75a.75.75 0 011.5 0v10.5A.75.75 0 0110 17z" />
        </svg>

      )}
    </th>
  );
  
  return (
    <div className="dashboard-body">
      <header className="dashboard-header">
        <h1>Instructor Dashboard</h1>
        <button onClick={onLogout} className="logout-button">
          <span>Sign Out</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </header>
      <div className="dashboard-layout">
        <nav className="sidebar">
          <h2 className="sidebar-title">Course Sections</h2>
          {isLoadingSections ? (
            <p>Loading sections...</p>
          ) : (
            <ul className="section-list">
              {sectionStats.map(section => (
                <li key={section.section_id}>
                  <button
                    className={`section-item ${selectedSection?.section_id === section.section_id ? 'active' : ''}`}
                    onClick={() => handleSectionClick(section)}
                  >
                    <div className="section-item-title">{section.section_title}</div>
                    <div className="section-item-details">
                      <span>{section.completions} / {section.starts} completed</span>
                      <span className="section-item-term">{section.year_term}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <main className="main-content">
          {error && <p className="error-message">{error}</p>}
          {!selectedSection ? (
            <div className="centered-container">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              <p className="font-medium">Select a section from the sidebar</p>
              <p>Choose a course section to view student performance details.</p>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">{selectedSection.section_title}</h2>
                <p className="card-subtitle">{selectedSection.year_term}</p>
              </div>
              <div className="card-body">
                {isLoadingDetails ? (
                  <p>Loading student data...</p>
                ) : !studentDetails.length ? (
                   <div className="centered-container" style={{minHeight: '200px'}}>No students have started the simulation for this section.</div>
                ) : (
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <SortableHeader label="Student Name" sortableKey="full_name" />
                        <SortableHeader label="Score" sortableKey="score" />
                        <th>Hints</th>
                        <SortableHeader label="Completion Time" sortableKey="finished_at" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudentDetails.map(student => (
                        <tr key={student.id}>
                          <td className="font-medium">{student.full_name}</td>
                          <td>{student.score !== null ? `${student.score} / 15` : <span className="text-gray-400">N/A</span>}</td>
                          <td>{student.hints !== null ? student.hints : <span className="text-gray-400">N/A</span>}</td>
                          <td>{student.finished_at ? new Date(student.finished_at).toLocaleString() : <span className="text-gray-500">Not Completed</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
