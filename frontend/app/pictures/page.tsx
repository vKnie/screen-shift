'use client';

import { useState } from 'react';

export default function Pictures() {
  const [formData, setFormData] = useState({
    image: null as File | null,
    delay: undefined as number | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
    backgroundColor: '' as string,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, files } = e.target;
    if (type === 'file' && files) {
      setFormData((prevData) => ({
        ...prevData,
        [name]: files[0],
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form Data:', formData);
    setIsModalOpen(false);
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const formFields = [
    { label: 'Choose Image', type: 'file', name: 'image', accept: 'image/*' },
    { label: 'Delay (seconds)', type: 'number', name: 'delay' },
    { label: 'Start Date', type: 'date', name: 'startDate' },
    { label: 'End Date', type: 'date', name: 'endDate' },
    { label: 'Background Color', type: 'color', name: 'backgroundColor' },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Pictures</h2>
      </div>
      <hr className="w-full border-t border-gray-300 mt-2" />

      <div className="flex justify-center mt-10">
        <div className="w-full max-w-7xl px-4">

          <div className="mb-4">
            <button className="bg-blue-500 text-white px-5 py-2 rounded-md hover:bg-blue-600" onClick={toggleModal}>Add Picture</button>
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 flex justify-center items-center z-50">
              <div className="absolute inset-0 backdrop-blur-md z-10"></div>
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg z-20">
                <h3 className="text-xl font-semibold mb-4">Add a New Picture</h3>

                <form onSubmit={handleSubmit}>
                  {formFields.map(({ label, type, name, accept }, index) => (
                    <div key={index} className="mb-4">
                      <label className="block text-gray-700">{label}:</label>
                      <input
                        type={type}
                        name={name}
                        accept={accept}
                        onChange={handleChange}
                        className="mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  ))}

                  <div className="flex justify-between space-x-2">
                    <button type="submit" className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600">Save</button>
                    <button type="button" onClick={toggleModal} className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <table className="w-full bg-white rounded-lg shadow-md overflow-hidden border-separate border-spacing-0">
              <thead className="bg-gray-100 text-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">ID</th>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Image</th>
                  <th className="px-6 py-4 text-left font-semibold">Status</th>
                  <th className="px-6 py-4 text-left font-semibold">Delay</th>
                  <th className="px-6 py-4 text-left font-semibold">Start Date</th>
                  <th className="px-6 py-4 text-left font-semibold">End Date</th>
                  <th className="px-6 py-4 text-left font-semibold">Background Color</th>
                  <th className="px-6 py-4 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">

              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
