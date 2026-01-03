import React, { useState, useEffect } from 'react';
import { Users, Plus, UserPlus, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const PatientManager = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);

    // Form State
    const [newName, setNewName] = useState('');
    const [newMRN, setNewMRN] = useState('');
    const [newDOB, setNewDOB] = useState('');

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${month}/${day}/${year}`;
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const res = await fetch('/api/patients');
            const data = await res.json();
            setPatients(data || []);
            setLoading(false);
        } catch (err) {
            toast.error("Failed to load patients");
            setLoading(false);
        }
    };

    const startEdit = (p) => {
        setEditingPatient(p);
        setNewName(p.name);
        setNewMRN(p.mrn || '');
        setNewDOB(p.dob || '');
        setShowForm(true);
    };

    const resetForm = () => {
        setEditingPatient(null);
        setNewName(''); setNewMRN(''); setNewDOB('');
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newName) return;

        try {
            const url = editingPatient ? `/api/patients/${editingPatient.id}` : '/api/patients';
            const method = editingPatient ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, mrn: newMRN, dob: newDOB })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(editingPatient ? "Patient updated." : `Patient ${data.name} added.`);

                if (editingPatient) {
                    setPatients(prev => prev.map(p => p.id === editingPatient.id ? data : p));
                } else {
                    setPatients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                }
                resetForm();
            } else {
                toast.error("Operation failed: " + data.error);
            }
        } catch (err) {
            console.error(err);
        }
    };


    const filtered = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-8 max-w-6xl mx-auto animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Patient Directory</h1>
                    <p className="text-slate-500">Manage patient records and demographics.</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full md:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-indigo-700 flex items-center justify-center transition-all hover:shadow-md"
                    >
                        <UserPlus size={18} className="mr-2" /> Add New Patient
                    </button>
                )}
            </div>

            {/* Add/Edit Patient Form */}
            {showForm && (
                <div className="mb-8 bg-white p-6 rounded-xl border border-indigo-100 shadow-md">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">
                        {editingPatient ? 'Edit Patient Details' : 'New Patient Registration'}
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                            <input
                                className="w-full p-2 border rounded-lg focus:ring-2 ring-indigo-500 outline-none"
                                value={newName} onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. Jane Doe" autoFocus required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">MRN (Optional)</label>
                            <input
                                className="w-full p-2 border rounded-lg focus:ring-2 ring-indigo-500 outline-none"
                                value={newMRN} onChange={e => setNewMRN(e.target.value)}
                                placeholder="Medical Record #"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date of Birth (Optional)</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded-lg focus:ring-2 ring-indigo-500 outline-none"
                                value={newDOB} onChange={e => setNewDOB(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
                                {editingPatient ? 'Save Changes' : 'Create Patient'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                <div className="p-4 border-b border-slate-100 flex items-center bg-slate-50/50">
                    <Search size={18} className="text-slate-400 mr-2" />
                    <input
                        className="bg-transparent outline-none w-full text-sm text-slate-700 placeholder:text-slate-400"
                        placeholder="Search patients by name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-400">Loading directory...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Users size={24} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500">No patients found.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Patient Name</th>
                                <th className="px-6 py-3">MRN</th>
                                <th className="px-6 py-3 hidden md:table-cell">DOB</th>
                                <th className="px-6 py-3 hidden md:table-cell">Added</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(p => (
                                <tr key={p.id} className="group hover:bg-slate-50 transition-colors even:bg-slate-100/40">
                                    <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{p.mrn || '-'}</td>
                                    <td className="px-6 py-4 text-slate-500 hidden md:table-cell">{formatDate(p.dob)}</td>
                                    <td className="px-6 py-4 text-slate-400 text-xs hidden md:table-cell">
                                        {formatDate(p.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => startEdit(p)}
                                            className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                                            title="Edit Patient"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PatientManager;
