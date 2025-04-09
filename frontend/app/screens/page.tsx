'use client';

import { useState, useEffect, useCallback } from 'react';

interface Screen {
  id: string;
  name: string;
  group: string;
}

interface FormData {
  name: string;
  group: string;
}

const API_URL = 'http://localhost:9999';

export default function Screens() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    group: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    fetchScreens();
  }, [fetchScreens]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.group) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/screens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      console.log('Server Response:', data);
      setIsModalOpen(false);
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

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/screens/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      fetchScreens(); // Recharger les écrans après la suppression
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

  const formFields = [
    { label: 'Name', type: 'text', name: 'name' },
    { label: 'Group', type: 'text', name: 'group' },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Screens</h2>
      </div>
      <hr className="w-full border-t border-gray-300 mt-2" />

      <div className="flex justify-center mt-10">
        <div className="w-full max-w-7xl px-4">
          <div className="mb-4">
            <button
              className="bg-blue-500 text-white px-5 py-2 rounded-md hover:bg-blue-600 cursor-pointer"
              onClick={toggleModal}
            >
              Add Screen
            </button>
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 flex justify-center items-center z-50">
              <div className="absolute inset-0 backdrop-blur-md z-10"></div>
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg z-20">
                <h3 className="text-xl font-semibold mb-4">Add a New Screen</h3>
                <form onSubmit={handleSubmit}>
                  {formFields.map(({ label, type, name }) => (
                    <div key={name} className="mb-4">
                      <label className="block text-gray-700">{label}:</label>
                      <input
                        type={type}
                        name={name}
                        onChange={handleChange}
                        className="mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  ))}
                  <div className="flex justify-between space-x-2">
                    <button type="submit" className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 cursor-pointer">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={toggleModal}
                      className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {error && <p className="text-red-500">{error}</p>}

          <div className="flex justify-center">
            <table className="w-full bg-white rounded-lg shadow-md overflow-hidden border-separate border-spacing-0">
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
                      <td className="px-6 py-4">{screen.id}</td>
                      <td className="px-6 py-4">{screen.name}</td>
                      <td className="px-6 py-4">{screen.group}</td>
                      <td className="px-6 py-4">
                        <button
                          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 cursor-pointer"
                          onClick={() => handleDelete(screen.id)}
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
