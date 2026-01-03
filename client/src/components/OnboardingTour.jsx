import React, { useState } from 'react';
import { X, Mic, FileText, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

const OnboardingTour = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    const slides = [
        {
            title: "Transform Audio into Clinical Gold",
            body: "Your AI-powered assistant for clinical documentation. Secure, fast, and fully customizable.",
            icon: <img src="/favicon.png" alt="Logo" className="w-16 h-16 mb-4 shadow-lg rounded-xl" />,
            color: "indigo"
        },
        {
            title: "Capture & Analyze",
            body: "Start a 'New Session' to record patient interactions or upload existing audio files. We handle the transcription and analysis.",
            icon: <Mic className="w-16 h-16 text-indigo-500 mb-4" />,
            color: "blue"
        },
        {
            title: "Define Your Style",
            body: "Upload your own .docx templates in the 'Template Manager'. Teach the AI to follow your exact formatting rules.",
            icon: <FileText className="w-16 h-16 text-emerald-500 mb-4" />,
            color: "emerald"
        },
        {
            title: "Your Lab Awaits",
            body: "Start your first session from the Dashboard now.",
            icon: <CheckCircle className="w-16 h-16 text-cyan-500 mb-4" />,
            color: "cyan"
        }
    ];

    const currentSlide = slides[step];
    const isLast = step === slides.length - 1;

    const handleNext = () => {
        if (isLast) {
            onComplete();
        } else {
            setStep(s => s + 1);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative border border-slate-100">
                {/* Close Button */}
                <button
                    onClick={onComplete}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-50 flex">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={`h-full flex-1 transition-all duration-300 ${i <= step ? `bg-${currentSlide.color}-500` : 'bg-transparent'}`}
                            style={{ backgroundColor: i <= step ? getTailwindColor(currentSlide.color) : '' }}
                        />
                    ))}
                </div>

                <div className="p-8 pb-10 text-center flex flex-col items-center min-h-[400px]">
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="animate-float">
                            {currentSlide.icon}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 mt-2">
                            {currentSlide.title}
                        </h2>
                        <p className="text-slate-500 leading-relaxed max-w-sm">
                            {currentSlide.body}
                        </p>
                    </div>

                    <div className="w-full mt-8 flex items-center justify-between">
                        {/* Dots Indicator */}
                        <div className="flex gap-2">
                            {slides.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-slate-800 w-4' : 'bg-slate-300'}`}
                                />
                            ))}
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-3">
                            {step > 0 && (
                                <button
                                    onClick={() => setStep(s => s - 1)}
                                    className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95`}
                                style={{ backgroundColor: getTailwindColor(currentSlide.color) }}
                            >
                                {isLast ? "Get Started" : "Next"}
                                {!isLast && <ChevronRight size={18} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper for dynamic colors since template literals can be tricky with JIT if not Safelisted
// But standard colors like indigo-500 usually work. We'll explicit return hex or class.
// Actually, inline style is safer for dynamic bg if we don't know safelist. 
// But Tailwind classes are better. I'll use a map.
function getTailwindColor(color) {
    const map = {
        indigo: '#6366f1',
        blue: '#3b82f6',
        emerald: '#10b981',
        cyan: '#06b6d4',
        purple: '#a855f7'
    };
    return map[color] || '#6366f1';
}

export default OnboardingTour;
