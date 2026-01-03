import React, { useState } from 'react';

const SOAPEditor = ({ initialData, onDownload }) => {
    const [formData, setFormData] = useState(initialData);

    React.useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 mt-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Review & Edit Assessment</h2>
            <p className="text-sm text-slate-500 mb-4">Review the AI-generated output. Edit as needed before saving.</p>

            {/* Patient Name - Always specific if present, or treat as generic */}
            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Patient Name</label>
                <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                    value={formData.patient_name || ''}
                    onChange={(e) => handleChange('patient_name', e.target.value)}
                />
            </div>

            {/* Dynamic Fields */}
            {Object.keys(formData).map((key) => {
                if (key === 'patient_name') return null; // Already handled

                const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

                return (
                    <div key={key} className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
                        <textarea
                            className="w-full h-32 p-2 border border-blue-200 rounded focus:border-blue-500"
                            value={formData[key] || ''}
                            onChange={(e) => handleChange(key, e.target.value)}
                        />
                    </div>
                );
            })}

            <button
                onClick={() => onDownload(formData)}
                className="w-full py-3 px-4 rounded-md text-white font-bold bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
            >
                Save & Download Final Report (.docx)
            </button>
        </div>
    );
};

export default SOAPEditor;
