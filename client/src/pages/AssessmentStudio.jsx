import React, { useState, useEffect } from 'react';
import SOAPEditor from '../components/SOAPEditor';
import { ArrowLeft, Play, FileText, ChevronDown, Save, Sparkles, Download, RefreshCw } from 'lucide-react';

import { toast } from 'sonner';

const AssessmentStudio = ({
    transcriptData, // { text, id, patient, assessments, assessment (legacy) }
    onNavigate
}) => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [soapData, setSoapData] = useState(null);
    const [assessmentHistory, setAssessmentHistory] = useState(transcriptData?.assessments || []);
    const [analysisCount, setAnalysisCount] = useState(0);
    const [selectedHistoryInfo, setSelectedHistoryInfo] = useState(null); // Track selected item for UI highligth
    const [doctorNotes, setDoctorNotes] = useState(transcriptData?.notes || '');
    const [mobileTab, setMobileTab] = useState('output'); // history, transcript, output

    // Sync notes and assessment if transcriptData changes
    // Sync notes and assessment if transcriptData changes
    useEffect(() => {
        if (transcriptData?.notes) setDoctorNotes(transcriptData.notes);
        if (transcriptData?.assessments) setAssessmentHistory(transcriptData.assessments);

        // DO NOT Auto-load latest assessment. User must select one or run new.
        setSoapData(null);
        setSelectedHistoryInfo(null);

        // Set initial mobile tab to transcript (since output is now empty)
        setMobileTab('transcript');
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
            setMobileTab('output'); // Switch to output on mobile
            toast.success("Assessment generated successfully.");
        } catch (error) {
            console.error(error);
            toast.error("Assessment failed. Please check the backend.");
        } finally {
            setIsAssessmentLoading(false);
        }
    };

    const persistAssessment = async (dataToSave) => {
        if (!transcriptData?.id || !dataToSave) return null;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/transcripts/${transcriptData.id}/assessments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessment_text: dataToSave,
                    template_id: parseInt(selectedTemplateId) || null
                })
            });

            if (res.ok) {
                const result = await res.json();
                // Update history locally
                const newEntry = {
                    id: result.id,
                    content: dataToSave,
                    template_name: templates.find(t => t.id === parseInt(selectedTemplateId))?.name || 'Manual',
                    created_at: new Date().toISOString()
                };
                setAssessmentHistory(prev => [newEntry, ...prev]);
                return result.id;
            } else {
                throw new Error("Failed to save assessment");
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message);
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveReport = async () => {
        const id = await persistAssessment(soapData);
        if (id) {
            toast.success("Assessment saved to patient record.");
        }
    };

    const handleDownload = async (finalData) => {
        try {
            // First persist it to the record history
            toast.info("Saving and generating document...");
            await persistAssessment(finalData);

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
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 100);
            toast.success("Document saved and downloaded.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to process document.");
        }
    };

    const handleDownloadOnly = async (finalData) => {
        try {
            toast.info("Generating document...");
            // Skip persistAssessment

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
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 100);
            toast.success("Document downloaded (not saved).");
        } catch (error) {
            console.error(error);
            toast.error("Failed to process document.");
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200 animate-fade-in text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Studio Header */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 shadow-sm z-30 sticky top-0 md:top-0">
                <div className="flex items-center justify-between lg:justify-start lg:space-x-4">
                    <div className="flex items-center space-x-2 md:space-x-4">
                        <button onClick={() => onNavigate('library')} className="text-slate-500 hover:text-slate-800 transition-colors flex items-center transition-all active:scale-95 group">
                            <ArrowLeft size={18} className="md:mr-1 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-xs md:text-sm font-medium hidden sm:inline">Consult Records</span>
                        </button>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                        <div className="min-w-0">
                            <h1 className="text-base md:text-lg font-bold text-slate-800 tracking-tight truncate">
                                {soapData?.patient_name || transcriptData?.patient || 'Unknown Patient'}
                            </h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assessment Studio</p>
                        </div>
                    </div>

                    <div className="lg:hidden flex items-center gap-2">
                        {/* Mobile Actions could go here or in a separate row */}
                        {!soapData && (
                            <button
                                onClick={runAssessment}
                                disabled={isAssessmentLoading || !selectedTemplateId}
                                className="p-2 bg-indigo-600 text-white rounded-xl shadow-md disabled:opacity-50"
                            >
                                {isAssessmentLoading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Sparkles size={18} />}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-2 md:space-x-3 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
                    <div className="relative group flex-1 lg:flex-none">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FileText size={16} className="text-slate-400 group-focus-within:text-indigo-500" />
                        </div>
                        <select
                            value={selectedTemplateId}
                            onChange={e => setSelectedTemplateId(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-2 md:py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs md:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full lg:min-w-[240px]"
                        >
                            <option value="" disabled>Select Clinical Template...</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 md:px-3 text-slate-500">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={runAssessment}
                            disabled={isAssessmentLoading || !selectedTemplateId}
                            className="hidden lg:flex px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 items-center space-x-2"
                        >
                            {isAssessmentLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            ) : (
                                <Sparkles size={16} fill="currentColor" />
                            )}
                            <span>{isAssessmentLoading ? 'Analyzing...' : 'Run Analysis'}</span>
                        </button>

                        {soapData && transcriptData?.id && (
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={handleSaveReport}
                                    disabled={isSaving}
                                    className="px-3 md:px-4 py-2 md:py-2.5 bg-emerald-600 text-white font-medium rounded-xl shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95 flex items-center space-x-2"
                                >
                                    {isSaving ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    <span className="text-xs md:text-sm">{isSaving ? 'Saving...' : (window.innerWidth < 640 ? 'Save' : 'Save Record')}</span>
                                </button>

                                <button
                                    onClick={() => handleDownload(soapData)}
                                    disabled={isSaving}
                                    className="p-2 md:px-3 md:py-2.5 bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-xl transition-all active:scale-95"
                                    title="Download Document"
                                >
                                    <Download size={18} />
                                </button>

                                <button
                                    onClick={() => setSoapData(null)}
                                    className="p-2 md:px-3 md:py-2.5 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-xl transition-all active:scale-95"
                                    title="Reset Analysis"
                                >
                                    <RefreshCw size={18} className={isAssessmentLoading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Studio Canvas - 3-Column Layout with Mobile Tabs */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">

                {/* Mobile Tab Navigation */}
                <div className="lg:hidden flex border-b border-slate-200 bg-white shrink-0">
                    <button
                        onClick={() => setMobileTab('history')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${mobileTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500'}`}
                    >
                        History
                    </button>
                    <button
                        onClick={() => setMobileTab('transcript')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${mobileTab === 'transcript' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500'}`}
                    >
                        Transcript
                    </button>
                    <button
                        onClick={() => setMobileTab('output')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${mobileTab === 'output' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500'}`}
                    >
                        Output
                    </button>
                </div>

                {/* Column 1: Assessment History (20%) */}
                <div className={`${mobileTab === 'history' ? 'flex w-full' : 'hidden'} lg:flex lg:w-[20%] border-r border-slate-200 bg-slate-50/50 flex-col h-full overflow-hidden`}>
                    <div className="px-6 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>
                            Report History
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {assessmentHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center">
                                <FileText size={24} className="text-slate-300 mb-2" />
                                <p className="text-[10px] text-slate-400 italic">No saved reports for this session.</p>
                            </div>
                        ) : (
                            assessmentHistory.map((item, idx) => (
                                <button
                                    key={item.id || idx}
                                    onClick={() => {
                                        console.log("Selected History Item:", item);
                                        setSoapData(item.content);
                                        setSelectedHistoryInfo(item);
                                        setAnalysisCount(prev => prev + 1);
                                        setMobileTab('output');
                                    }}
                                    className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer ${(selectedHistoryInfo && (selectedHistoryInfo.id === item.id || selectedHistoryInfo.created_at === item.created_at))
                                        ? 'bg-white border-indigo-200 ring-2 ring-indigo-500/10 shadow-sm shadow-indigo-100'
                                        : 'bg-white/50 border-slate-200 opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <p className="text-[10px] font-bold text-slate-700 truncate mb-1">
                                        {item.template_name || 'Clinical Report'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                        {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Column 2: Transcript & Notes (35%) */}
                <div className={`${mobileTab === 'transcript' ? 'flex w-full' : 'hidden'} lg:flex lg:w-[35%] border-r border-slate-200 bg-white flex-col relative z-10 h-full overflow-hidden`}>
                    <div className="px-6 py-3 bg-slate-50/80 backdrop-blur-sm border-b border-slate-100 flex items-center shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2"></span>
                            Source Transcript
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 font-mono text-xs leading-relaxed text-slate-600 bg-slate-50/20 selection:bg-indigo-100 selection:text-indigo-900 border-b border-slate-200">
                        {transcriptData?.text}
                    </div>
                    {/* Doctor's Notes Section (Bottom) */}
                    <div className="h-[200px] flex flex-col bg-yellow-50/20">
                        <div className="px-6 py-2 bg-yellow-50/80 border-b border-yellow-100 flex items-center">
                            <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mr-2"></span>
                                Doctor's Notes
                            </span>
                        </div>
                        <textarea
                            className="flex-1 w-full p-4 bg-transparent outline-none resize-none text-xs text-slate-700 placeholder:text-slate-300"
                            placeholder="Add clinical observations here..."
                            value={doctorNotes}
                            onChange={(e) => setDoctorNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Column 3: Clinical Output (45%) */}
                <div className={`${mobileTab === 'output' ? 'flex w-full' : 'hidden'} lg:flex lg:flex-1 flex-col bg-slate-100/30 overflow-hidden h-full`}>
                    <div className="px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center shrink-0">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
                            Clinical Output
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {soapData ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-full">
                                <SOAPEditor
                                    key={analysisCount}
                                    initialData={soapData}
                                    onDownload={handleDownload}
                                    onDownloadOnly={handleDownloadOnly}
                                    onChange={(newData) => setSoapData(newData)}
                                />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                                <div className="p-6 bg-white rounded-full border border-slate-200 shadow-sm relative">
                                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-10"></div>
                                    <FileText size={32} className="text-slate-200 relative z-10" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-slate-600 font-medium text-sm">No Report Loaded</h3>
                                    <p className="text-xs">Run analysis or select an item from history to view clinical notes.</p>
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
