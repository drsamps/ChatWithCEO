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

type SortKey = 'finished_at' | 'score';
type SortDirection = 'asc' | 'desc';

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [sectionStats, setSectionStats] = useState<SectionStat[]>([]);
  const [selectedSection, setSelectedSection] = useState<SectionStat | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('finished_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchSectionStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // This is a more advanced query. We're using a remote procedure call (RPC)
    // to run a custom SQL function on the server. This is often more efficient.
    // Let's build it with standard JS calls for now to keep it simpler.

    // 1. Get all enabled sections
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('section_id, section_title, year_term')
      .eq('enabled', true);

    if (sectionsError) {
      console.error(sectionsError);
      setError('Failed to fetch sections. Check RLS policies.');
      setIsLoading(false);
      return;
    }

    // 2. Get all students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('section_id, finished_at');

    if (studentsError) {
      console.error(studentsError);
      setError('Failed to fetch student data. Check RLS policies.');
      setIsLoading(false);
      return;
    }

    // 3. Process the data in JavaScript
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
    setIsLoading(false);
  }, []);

  const fetchStudentDetails = useCallback(async (sectionId: string) => {
    setIsLoading(true);
    setError(null);
    setStudentDetails([]);

    const { data, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        full_name,
        finished_at,
        evaluations ( score, hints )
      `)
      .eq('section_id', sectionId);

    if (studentError) {
      console.error(studentError);
      setError('Failed to load student details. Check RLS policies.');
      setIsLoading(false);
      return;
    }

    const formattedDetails = data.map(student => ({
      id: student.id,
      full_name: student.full_name,
      finished_at: student.finished_at,
      // The evaluation is an array because of the one-to-many relationship
      score: student.evaluations[0]?.score ?? null,
      hints: student.evaluations[0]?.hints ?? null,
    }));

    setStudentDetails(formattedDetails);
    setIsLoading(false);
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
    setSortKey('finished_at'); // Reset sort
    setSortDirection('desc');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedStudentDetails = useMemo(() => {
    return [...studentDetails].sort((a, b) => {
      if (a[sortKey] === null) return 1;
      if (b[sortKey] === null) return -1;
      if (a[sortKey]! < b[sortKey]!) return sortDirection === 'asc' ? -1 : 1;
      if (a[sortKey]! > b[sortKey]!) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [studentDetails, sortKey, sortDirection]);

  const SortableHeader = ({ label, sortableKey }: { label: string; sortableKey: SortKey }) => (
    <th onClick={() => handleSort(sortableKey)} className="sortable-header">
      {label}
      {sortKey === sortableKey && (
        <span className={`sort-icon ${sortDirection}`}>▼</span>
      )}
    </th>
  );
  
  if (isLoading && sectionStats.length === 0) {
    return <div className="centered-container dashboard-body">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-body">
      <header className="dashboard-header">
        <h1>Instructor Dashboard</h1>
        <button onClick={onLogout}>Sign Out</button>
      </header>
      <main className="dashboard-container">
        {error && <p className="error-message">{error}</p>}
        <div className="card">
          <h2 className="card-title">Section Overview</h2>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Term</th>
                <th>Starts</th>
                <th>Completions</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {sectionStats.map(section => (
                <tr 
                  key={section.section_id} 
                  className={`clickable-row ${selectedSection?.section_id === section.section_id ? 'active-row' : ''}`}
                  onClick={() => handleSectionClick(section)}
                >
                  <td>{section.section_title}</td>
                  <td>{section.year_term}</td>
                  <td>{section.starts}</td>
                  <td>{section.completions}</td>
                  <td>{section.starts > 0 ? `${Math.round((section.completions / section.starts) * 100)}%` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedSection && (
          <div className="card">
            <h2 className="card-title">
              Student Details: {selectedSection.section_title} ({selectedSection.year_term})
            </h2>
            {isLoading && studentDetails.length === 0 ? (
                <div className="centered-container">Loading student data...</div>
            ) : (
                <table className="dashboard-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <SortableHeader label="Score" sortableKey="score" />
                            <th>Hints</th>
                            <SortableHeader label="Completion Time" sortableKey="finished_at" />
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStudentDetails.map(student => (
                            <tr key={student.id}>
                                <td>{student.full_name}</td>
                                <td>{student.score !== null ? `${student.score} / 15` : 'N/A'}</td>
                                <td>{student.hints !== null ? student.hints : 'N/A'}</td>
                                <td>{student.finished_at ? new Date(student.finished_at).toLocaleString() : 'Not Completed'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;