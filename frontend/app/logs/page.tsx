'use client';

import { useState, useEffect, useMemo } from 'react';

const API_URL = process.env.NEXT_PUBLIC_EXPRESS_API_URL;

export default function Logs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [linesToShow, setLinesToShow] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`${API_URL}/logs`);
        if (!response.ok) throw new Error('Erreur réseau ou serveur');
        const data = await response.json();
        setLogs(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des logs:', error);
      }
    };

    fetchLogs();
  }, []);

  const parseLogDate = (log: string): { date: Date, time: string } | null => {
    if (!log) return null;
    const [datePart, timePart] = log.split(' ');
    if (!datePart || !timePart) return null;

    return {
      date: new Date(datePart),
      time: timePart,
    };
  };

  const filterLogs = (logs: string[]) => {
    return logs
      .map((log) => {
        const parsedDate = parseLogDate(log);
        if (!parsedDate) return null;
        return { ...parsedDate, log };
      })
      .filter((log) => log !== null)
      .filter(({ date, time, log }) => {
        const dateMatch = !selectedDate || date.toISOString().startsWith(selectedDate);
        const timeMatch = !selectedTime || time.startsWith(selectedTime);
        const queryMatch = log.toLowerCase().includes(searchQuery.toLowerCase());
        return dateMatch && timeMatch && queryMatch;
      });
  };

  const filterAndSortLogs = useMemo(() => {
    return filterLogs(logs)
      .sort((a, b) => {
        if (isNaN(a.date.getTime()) || isNaN(b.date.getTime())) return 0;
        return sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime();
      })
      .map(({ log }) => log);
  }, [logs, sortOrder, searchQuery, selectedDate, selectedTime]);

  const startIndex = (currentPage - 1) * linesToShow;
  const logsToDisplay = filterAndSortLogs.slice(startIndex, startIndex + linesToShow);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const goToNextPage = () => {
    if (startIndex + linesToShow < filterAndSortLogs.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Logs</h2>
      </div>
      <hr className="w-full border-t border-gray-300 mt-2" />
      
      <div className="controls flex space-x-4 items-center mb-4 mt-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="time"
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border p-2 rounded"
        />
        <button onClick={toggleSortOrder} className="text-blue-500 cursor-pointer">
          Trier par {sortOrder === 'asc' ? 'ancien' : 'récent'}
        </button>

        <select
          value={linesToShow}
          onChange={(e) => setLinesToShow(Number(e.target.value))}
          className="border p-2 rounded"
        >
          <option value={50}>50 lignes</option>
          <option value={100}>100 lignes</option>
          <option value={150}>150 lignes</option>
          <option value={200}>200 lignes</option>
        </select>
      </div>

      <div className="logs-list mt-4 p-4 bg-black text-green-400 font-mono rounded shadow">
        {logsToDisplay.map((log, index) => (
          <div key={index} className="border-b border-gray-700 p-2 text-sm">
            {log}
          </div>
        ))}
      </div>

      <div className="pagination flex justify-between items-center mt-4">
        <button
          onClick={goToPreviousPage}
          className="text-blue-500 cursor-pointer"
          disabled={currentPage === 1}
        >
          Précédent
        </button>
        <span className="text-gray-800">
          Page {currentPage} sur {Math.ceil(filterAndSortLogs.length / linesToShow)}
        </span>
        <button
          onClick={goToNextPage}
          className="text-blue-500 cursor-pointer"
          disabled={startIndex + linesToShow >= filterAndSortLogs.length}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
