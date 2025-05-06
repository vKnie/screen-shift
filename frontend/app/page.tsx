'use client';

import { useState, useEffect, useCallback } from 'react';

interface Group {
  id: string;
  name: string;
  pictures: string[];
}

interface Screen {
  id: string;
  name: string;
  group: string;
}

interface ScreenFormData {
  name: string;
  group: string;
}

const API_URL = '/api';

export default function Home() {

  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [screens, setScreens] = useState<Screen[]>([]);
  const [screenFormData, setScreenFormData] = useState<ScreenFormData>({
    name: '',
    group: '',
  });
  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/groups`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON, but received something else");
      }

      const data = await response.json();
      setGroups(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching groups:", error.message);
        setError("Failed to load groups. Please try again later.");
      } else {
        console.error("An unknown error occurred", error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  }, []);

  const fetchScreens = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/screens`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON, but received something else");
      }

      const data = await response.json();
      setScreens(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching screens:", error.message);
        setError("Failed to load screens. Please try again later.");
      } else {
        console.error("An unknown error occurred", error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchScreens();
  }, [fetchGroups, fetchScreens]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGroupName.trim()) {
      setError("Group name cannot be empty");
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newGroupName }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      setNewGroupName('');
      setIsGroupModalOpen(false);
      fetchGroups();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error creating group:", error.message);
        setError("Failed to create group. Please try again later.");
      } else {
        console.error("An unknown error occurred", error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingGroup || !editingGroup.name.trim()) {
      setError("Group name cannot be empty");
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editingGroup.name }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      setEditingGroup(null);
      fetchGroups();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error updating group:", error.message);
        setError("Failed to update group. Please try again later.");
      } else {
        console.error("An unknown error occurred", error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/groups/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      fetchGroups();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error deleting group:", error.message);
        setError("Failed to delete group. Please try again later.");
      } else {
        console.error("An unknown error occurred", error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  const handleScreenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setScreenFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleScreenSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setScreenFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleScreenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!screenFormData.name || !screenFormData.group) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/screens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(screenFormData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Server Response:', data);
      setIsScreenModalOpen(false);
      setScreenFormData({
        name: '',
        group: '',
      });
      fetchScreens();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error adding screen:', error.message);
        setError("Failed to add screen. Please try again later.");
      } else {
        console.error('An unknown error occurred', error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  const handleDeleteScreen = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/screens/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      fetchScreens();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error deleting screen:', error.message);
        setError("Failed to delete screen. Please try again later.");
      } else {
        console.error('An unknown error occurred', error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  const openScreenModal = () => {
    if (groups.length > 0) {
      setScreenFormData(prev => ({
        ...prev,
        group: groups[0].id
      }));
    }
    setIsScreenModalOpen(true);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-2xl font-semibold text-gray-800 text-left">Dashboard</h2>
        </div>
      </div>
      <hr className="w-full border-t border-gray-300 mt-2 mb-6" />

      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mx-4">
        <div className="bg-white rounded-lg p-6 shadow-custom">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Groupes</h2>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 cursor-pointer"
              onClick={() => setIsGroupModalOpen(true)}
            >
              Add Group
            </button>
          </div>

          {isGroupModalOpen && (
            <div className="fixed inset-0 flex justify-center items-center z-50">
              <div className="absolute inset-0 backdrop-blur-md z-10"></div>
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md z-20">
                <h3 className="text-xl font-semibold mb-4">Create New Group</h3>
                <form onSubmit={handleCreateGroup}>
                  <div className="mb-4">
                    <label className="block text-gray-700">Group Name:</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="mt-1 p-2 border border-gray-300 rounded-md w-full"
                      placeholder="Enter group name"
                    />
                  </div>
                  <div className="flex justify-between space-x-2">
                    <button 
                      type="submit" 
                      className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 cursor-pointer"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsGroupModalOpen(false)}
                      className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {editingGroup && (
            <div className="fixed inset-0 flex justify-center items-center z-50">
              <div className="absolute inset-0 backdrop-blur-md z-10"></div>
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md z-20">
                <h3 className="text-xl font-semibold mb-4">Edit Group</h3>
                <form onSubmit={handleUpdateGroup}>
                  <div className="mb-4">
                    <label className="block text-gray-700">Group Name:</label>
                    <input
                      type="text"
                      value={editingGroup.name}
                      onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                      className="mt-1 p-2 border border-gray-300 rounded-md w-full"
                      placeholder="Enter group name"
                    />
                  </div>
                  <div className="flex justify-between space-x-2">
                    <button 
                      type="submit" 
                      className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 cursor-pointer"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingGroup(null)}
                      className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full shadow-md border-separate border-spacing-0 rounded-lg overflow-hidden shadow-sm border border-gray-200">
              <thead className="bg-gray-100 text-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Number of Pictures</th>
                  <th className="px-6 py-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4">No groups available</td>
                  </tr>
                ) : (
                  groups.map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50 transition-all duration-100">
                      <td className="px-6 py-4">{group.name}</td>
                      <td className="px-6 py-4">{group.pictures ? group.pictures.length : 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            className="bg-orange-400 text-white px-3 py-1 rounded-md hover:bg-orange-500 cursor-pointer text-sm"
                            onClick={() => setEditingGroup(group)}
                          >
                            Edit
                          </button>
                          <button
                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 cursor-pointer text-sm"
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-custom">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Screens</h2>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 cursor-pointer"
              onClick={openScreenModal}
              disabled={groups.length === 0}
              title={groups.length === 0 ? "You need to create a group first" : ""}
            >
              Add Screen
            </button>
          </div>

          {isScreenModalOpen && (
            <div className="fixed inset-0 flex justify-center items-center z-50">
              <div className="absolute inset-0 backdrop-blur-md z-10"></div>
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg z-20">
                <h3 className="text-xl font-semibold mb-4">Add a New Screen</h3>
                <form onSubmit={handleScreenSubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-700">Name:</label>
                    <input
                      type="text"
                      name="name"
                      value={screenFormData.name}
                      onChange={handleScreenInputChange}
                      className="mt-1 p-2 border border-gray-300 rounded-md w-full"
                      placeholder="Enter screen name"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700">Group:</label>
                    <select
                      name="group"
                      value={screenFormData.group}
                      onChange={handleScreenSelectChange}
                      className="mt-1 p-2 border border-gray-300 rounded-md w-full bg-white"
                    >
                      {groups.length === 0 ? (
                        <option value="" disabled>No groups available</option>
                      ) : (
                        groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  
                  <div className="flex justify-between space-x-2">
                    <button 
                      type="submit" 
                      className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 cursor-pointer"
                      disabled={groups.length === 0}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsScreenModalOpen(false)}
                      className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full shadow-md border-separate border-spacing-0 rounded-lg overflow-hidden shadow-sm border border-gray-200">
              <thead className="bg-gray-100 text-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">ID</th>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Group</th>
                  <th className="px-6 py-4 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {screens.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">No screens available</td>
                  </tr>
                ) : (
                  screens.map((screen) => (
                    <tr key={screen.id} className="hover:bg-gray-50 transition-all duration-100">
                      <td className="px-6 py-4 truncate max-w-[100px]">{screen.id}</td>
                      <td className="px-6 py-4">{screen.name}</td>
                      <td className="px-6 py-4">
                        {groups.find(g => g.id === screen.group)?.name || screen.group}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 cursor-pointer text-sm"
                          onClick={() => handleDeleteScreen(screen.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}