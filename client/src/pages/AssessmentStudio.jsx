import React, { useState, useEffect } from 'react';
import SOAPEditor from '../components/SOAPEditor';
import { ArrowLeft, Play, FileText, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const AssessmentStudio = ({
    transcriptData, // { text, id, patient }
    onNavigate
}) => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
    const [soapData, setSoapData] = useState(null);
    const [analysisCount, setAnalysisCount] = useState(0);
    const [doctorNotes, setDoctorNotes] = useState(transcriptData?.notes || '');

    // Sync notes if transcriptData changes
    useEffect(() => {
        if (transcriptData?.notes) setDoctorNotes(transcriptData.notes);
    }, [transcriptData]);

    useEffect(() => {
        fetch('/api/templates')
            .then(res => res.json())
            .then(data => setTemplates(data))
            .catch(err => toast.error("Failed to load templates."));
    }, []);

    const runAssessment = async () => {
        if (!selectedTemplateId) {
            toast.warning("Please select a clinical template.");
            return;
        }
        setIsAssessmentLoading(true);
        try {
            const res = await fetch('/assess-soap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: transcriptData.text,
                    additional_notes: doctorNotes,
                    template_id: selectedTemplateId
                }),
            });
            const data = await res.json();
            setSoapData(data);
            setAnalysisCount(prev => prev + 1);
            toast.success("Assessment generated successfully.");
        } catch (error) {
            console.error(error);
            toast.error("Assessment failed. Please check the backend.");
        } finally {
            setIsAssessmentLoading(false);
        }
    };

    const handleDownload = async (finalData) => {
        try {
            toast.info("Generating document...");
            const res = await fetch('/generate-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_id: parseInt(selectedTemplateId),
                    data: finalData
                }),
            });

            if (!res.ok) throw new Error("Document generation failed");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${finalData.patient_name || 'Assessment'}_${new Date().toISOString().split('T')[0]}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("Document downloaded successfully.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to download document.");
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200 animate-fade-in">
            {/* Studio Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-30 sticky top-0">
                <div className="flex items-center space-x-4">
                    <button onClick={() => onNavigate('library')} className="text-slate-500 hover:text-slate-800 transition-colors flex items-center">
                        <ArrowLeft size={18} className="mr-1" />
                        <span className="text-sm font-medium">Library</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{transcriptData?.patient || 'Unknown Patient'}</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Assessment Studio</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FileText size={16} className="text-slate-400 group-focus-within:text-indigo-500" />
                        </div>
                        <select
                            value={selectedTemplateId}
                            onChange={e => setSelectedTemplateId(e.target.value)}
                            className="appearance-none pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[240px]"
                        >
                            <option value="" disabled>Select Clinical Template...</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    <button
                        onClick={runAssessment}
                        disabled={isAssessmentLoading || !selectedTemplateId}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center space-x-2"
                    >
                        {isAssessmentLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                            <Play size={16} fill="currentColor" />
                        )}
                        <span>{isAssessmentLoading ? 'Analyzing...' : 'Run Analysis'}</span>
                    </button>
                </div>
            </div>

            {/* Studio Canvas - Split Screen */}
            <div className="flex-1 overflow-hidden flex">
                {/* Left Panel: Source Transcript */}
                <div className="w-[45%] border-r border-slate-200 bg-white flex flex-col relative z-10">
                    <div className="px-6 py-3 bg-slate-50/80 backdrop-blur-sm border-b border-slate-100 flex justify-between items-center sticky top-0">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                            <span className="w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
                            Source Transcript
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 font-mono text-sm leading-relaxed text-slate-600 bg-slate-50/30 selection:bg-indigo-100 selection:text-indigo-900 border-b border-slate-200">
                        {transcriptData?.text}
                    </div>
                    {/* Doctor's Notes Section (Bottom Left) */}
                    <div className="h-1/3 flex flex-col bg-yellow-50/30">
                        <div className="px-6 py-2 bg-yellow-50/80 border-b border-yellow-100 flex items-center">
                            <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest flex items-center">
                                <span className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></span>
                                Doctor's Notes
                            </span>
                        </div>
                        <textarea
                            className="flex-1 w-full p-4 bg-transparent outline-none resize-none text-sm text-slate-700"
                            placeholder="Add clinical observations here..."
                            value={doctorNotes}
                            onChange={(e) => setDoctorNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Right Panel: Clinical Output */}
                <div className="flex-1 flex flex-col bg-slate-100/50">
                    <div className="px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex justify-between items-center sticky top-0">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
                            Clinical Output
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {soapData ? (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-full">
                                <SOAPEditor
                                    key={analysisCount}
                                    initialData={soapData}
                                    onDownload={handleDownload}
                                />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20"></div>
                                    <div className="p-6 bg-white rounded-full border border-slate-200 shadow-sm relative z-10">
                                        <FileText size={40} className="text-indigo-200" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-slate-600 font-medium mb-1">Ready to Assess</h3>
                                    <p className="text-sm">Select a template above to generate notes.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssessmentStudio;
