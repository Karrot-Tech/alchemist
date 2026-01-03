import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, Save } from 'lucide-react';

const SOAPEditor = ({ initialData, onDownloadOnly, onChange }) => {
    const [formData, setFormData] = useState(initialData);

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    const handleChange = (field, value) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);
        if (onChange) onChange(newData);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 mt-6 relative">
            {/* Header inside */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Review & Edit Assessment</h2>
                    <p className="text-sm text-slate-500">Review the AI-generated output. Edit as needed before saving.</p>
                </div>
                {onDownloadOnly && (
                    <button
                        onClick={() => onDownloadOnly(formData)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                        title="Download Only (No Save)"
                    >
                        <Download size={18} />
                    </button>
                )}
            </div>

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
                const value = formData[key] || '';

                // Simple auto-resize logic
                const handleInput = (e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                    handleChange(key, e.target.value);
                };

                return (
                    <div key={key} className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
                        <textarea
                            className="w-full p-2 border border-blue-200 rounded focus:border-blue-500 overflow-hidden resize-none min-h-[42px]"
                            value={value}
                            onChange={handleInput}
                            ref={el => {
                                if (el) {
                                    // Adjust height on initial render
                                    el.style.height = 'auto';
                                    el.style.height = el.scrollHeight + 'px';
                                }
                            }}
                            rows={1}
                        />
                    </div>
                );
            })}


        </div>
    );
};

export default SOAPEditor;
